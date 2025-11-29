// index.js
// Node 16+ (GitHub Actions runner fournit Node)
const fetch = require('node-fetch');
const FormData = require('form-data');
const { chromium } = require('playwright');

// CONFIG via secrets / env
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;      // ex: 85129:AAA...
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT || '@besfinds';
const REF_ID = process.env.REF_ID || 'BYJD9PLWT';
const ITEM_IDS = (process.env.ITEM_IDS || '722565755939,729435345138,674523991977,731884001920').split(',');
const SHEET_WEBHOOK = process.env.SHEET_WEBHOOK || ''; // optional Apps Script webhook URL

if (!TELEGRAM_TOKEN) {
  console.error('Missing TELEGRAM_TOKEN env var');
  process.exit(1);
}

async function postTelegramPhoto(photoUrl, caption, buttonUrl) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`;
  const form = new FormData();
  form.append('chat_id', TELEGRAM_CHAT);
  form.append('photo', photoUrl);
  form.append('caption', caption);
  form.append('parse_mode', 'Markdown');
  const keyboard = { inline_keyboard: [[{ text: "ACHETER ICI", url: buttonUrl }]] };
  form.append('reply_markup', JSON.stringify(keyboard));
  const res = await fetch(url, { method: 'POST', body: form });
  const text = await res.text();
  console.log('Telegram:', text);
  return text;
}

async function appendToSheet(row) {
  if (!SHEET_WEBHOOK) return;
  try {
    await fetch(SHEET_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row)
    });
  } catch (e) {
    console.warn('Sheet webhook error', e.toString());
  }
}

async function scrapeOopbuyOrTaobao(id, browser) {
  // Try Oopbuy product page first
  const urls = [
    `https://www.oopbuy.com/products/${id}`,
    `https://item.taobao.com/item.htm?id=${id}`,
    `https://world.taobao.com/item/${id}.htm`
  ];
  for (const url of urls) {
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1200);

      // Try JSON-LD structured data
      const ld = await page.$$eval('script[type="application/ld+json"]', els => els.map(e => e.textContent));
      for (const t of ld) {
        try {
          const j = JSON.parse(t);
          const title = j.name || j.title;
          const price = j.offers && (j.offers.price || (Array.isArray(j.offers) && j.offers[0] && j.offers[0].price));
          const image = j.image && (Array.isArray(j.image) ? j.image[0] : j.image);
          if (title) {
            await page.close();
            return { id, title: title.trim(), price: price || null, image: image || null, source: url };
          }
        } catch(e) { /* ignore parse errors */ }
      }

      // Fallback selectors (generic)
      const info = await page.evaluate(() => {
        const textOf = s => (document.querySelector(s) && document.querySelector(s).innerText) || null;
        const attrOf = (s, a) => (document.querySelector(s) && (document.querySelector(s).getAttribute(a) || document.querySelector(s).src)) || null;
        let title = textOf('h1') || textOf('.product-title') || textOf('#J_Title') || textOf('.tb-detail-hd h1');
        let price = textOf('.product-price') || textOf('.tm-price') || textOf('#J_StrPrice') || textOf('.price') || null;
        if (price) {
          const m = price.match(/[\d\.,]+/);
          price = m ? m[0].replace(',', '.') : price;
        }
        let image = attrOf('.main-image img', 'src') || attrOf('.product-gallery img', 'src') || attrOf('.tb-pic img', 'src') || null;
        return { title, price, image };
      });

      await page.close();

      if (info && (info.title || info.price || info.image)) {
        return { id, title: info.title && info.title.trim(), price: info.price || null, image: info.image || null, source: url };
      }
    } catch (err) {
      console.warn('Scrape error', url, err && err.toString());
      continue;
    }
  }
  return null;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    for (const id of ITEM_IDS) {
      console.log('Processing', id);
      const item = await scrapeOopbuyOrTaobao(id, browser);
      if (!item) {
        console.warn('No data for', id);
        continue;
      }
      const priceNum = item.price ? parseFloat(item.price.toString().replace(/[^0-9.]/g, '')) : 0;
      const eur = (priceNum * 0.13).toFixed(2);
      const oopLink = `https://www.oopbuy.com/products/${id}?ref=${REF_ID}`;
      const caption = `*${item.title}*\n\nPrix: ${item.price || 'N/A'} CNY (~${eur} €)\n\nLien: ${oopLink}`;
      await postTelegramPhoto(item.image || oopLink, caption, oopLink);
      await appendToSheet({
        ts: (new Date()).toISOString(),
        id,
        title: item.title,
        priceCNY: item.price,
        priceEUR: eur,
        link: oopLink,
        image: item.image
      });
      // polite delay
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch (e) {
    console.error('Fatal', e.toString());
  } finally {
    await browser.close();
  }
})();

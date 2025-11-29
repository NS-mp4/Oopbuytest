import fetch from "node-fetch";

// --- ENV secrets ---
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT;
const REF = process.env.REF_ID;
const SHEET = process.env.SHEET_WEBHOOK;
const IDS = process.env.ITEM_IDS.split(",");

// --- Scrape Oopbuy HTML ---
async function getOopbuy(id) {
  const url = `https://www.oopbuy.com/products/${id}`;

  const html = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "text/html"
    }
  }).then(r => r.text());

  const title = (html.match(/<h1[^>]*>(.*?)<\/h1>/) || [])[1];
  const price = (html.match(/"value":"(\d+(\.\d+)?)"/) || [])[1];
  const image = (html.match(/<img[^>]+src="(https:\/\/[^"]+)"/) || [])[1];

  return { id, title, price, image, link: url + `?ref=${REF}` };
}

// --- Send to Telegram ---
async function sendTelegram(item) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
    method: "POST",
    body: new URLSearchParams({
      chat_id: CHAT,
      photo: item.image,
      caption: `🔥 *${item.title}*\n\n💰 Prix : *${item.price} CNY*\n\n👉 ${item.link}`,
      parse_mode: "Markdown"
    })
  });
}

// --- Send to Sheet ---
async function sendSheet(item) {
  if (!SHEET) return;
  await fetch(SHEET, {
    method: "POST",
    body: JSON.stringify(item),
    headers: { "Content-Type": "application/json" }
  });
}

// --- Main ---
(async () => {
  for (const id of IDS) {
    try {
      const item = await getOopbuy(id.trim());
      if (!item.title) {
        console.log("❌ Impossible de scraper :", id);
        continue;
      }

      console.log("📤 Posting:", item.title);
      await sendTelegram(item);
      await sendSheet(item);
    } catch (e) {
      console.log("Erreur sur", id, e.toString());
    }
  }
})();

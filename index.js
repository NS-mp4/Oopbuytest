import fetch from "node-fetch";

const ids = process.env.ITEM_IDS.split(",");

async function scrapeTaobao(id) {
  try {
    const url = `https://api.allorigins.win/raw?url=https://item.taobao.com/item.htm?id=${id}`;
    const res = await fetch(url);
    const html = await res.text();

    if (!html || html.length < 5000) {
      console.log(`❌ Produit vide ou protégé : ${id}`);
      return;
    }

    // Extraction simple du titre
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "Titre introuvable";

    console.log(`✅ ${id} → ${title}`);
  } catch (err) {
    console.log(`❌ Erreur pour ${id} : ${err.message}`);
  }
}

async function start() {
  for (const id of ids) {
    await scrapeTaobao(id);
  }
}

start();

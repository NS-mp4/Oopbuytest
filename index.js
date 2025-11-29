const fetch = require("node-fetch");
const cheerio = require("cheerio");

// LISTE DES LIENS UUFIND À SCRAPER
const URLS = [
  "https://www.uufinds.com/goodItemDetail/qc/1969159446778699777"
];

// Extraction UUFinds
async function scrapeUUFinds(url) {
  try {
    console.log("⏳ Lecture :", url);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "fr-FR,fr;q=0.9"
      }
    });

    if (!res.ok) {
      console.log("❌ Erreur HTTP :", res.status);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const scriptData = $("script#__NEXT_DATA__").html();
    if (!scriptData) {
      console.log("❌ JSON introuvable sur la page");
      return null;
    }

    const data = JSON.parse(scriptData);
    const product = data?.props?.pageProps?.goodItemDetail;

    if (!product) {
      console.log("❌ Pas de données produit");
      return null;
    }

    return {
      title: product.title,
      price: product.price,
      sold: product.soldQuantity,
      shop: product.userName,
      images: product.mainPicUrls || []
    };
  } catch (err) {
    console.log("❌ Erreur scraper :", err);
    return null;
  }
}

(async () => {
  for (const url of URLS) {
    const info = await scrapeUUFinds(url);

    if (!info) {
      console.log("❌ Échec :", url);
    } else {
      console.log("\n✅ Produit trouvé :");
      console.log(info);
    }
  }
})();

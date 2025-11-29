const https = require("https");
const cheerio = require("cheerio");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// 1) Récupérer le BUILD ID depuis le HTML principal
async function getBuildID() {
  console.log("⏳ Lecture HTML UUFinds…");

  const html = await get("https://www.uufinds.com");

  const $ = cheerio.load(html);

  let buildId = null;

  $("link[rel='preload']").each((i, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("_buildManifest.js")) {
      // /_next/static/<BUILD_ID>/_buildManifest.js
      const parts = href.split("/");
      if (parts.length >= 4) {
        buildId = parts[3]; // index: /_next/static/[3]/file.js
      }
    }
  });

  if (buildId) {
    console.log("✅ BUILD_ID trouvé :", buildId);
    return buildId;
  } else {
    console.log("❌ BUILD_ID introuvable dans le HTML");
    return null;
  }
}

// 2) Charger l’API JSON de UUFinds
async function getItem(buildId, productId) {
  const apiURL = `https://www.uufinds.com/_next/data/${buildId}/goodItemDetail/qc/${productId}.json`;

  console.log("⏳ Appel API :", apiURL);

  try {
    const jsonText = await get(apiURL);
    const json = JSON.parse(jsonText);

    const item = json?.pageProps?.goodItemDetail;
    if (!item) {
      console.log("❌ Produit introuvable dans l’API");
      return null;
    }

    return {
      title: item.title,
      price: item.price,
      images: item.mainPicUrls,
      sold: item.soldQuantity,
      shop: item.userName
    };

  } catch (e) {
    console.log("❌ Erreur API :", e.message);
    return null;
  }
}

// MAIN
(async () => {
  const productId = "1969159446778699777";

  const buildId = await getBuildID();
  if (!buildId) return;

  const product = await getItem(buildId, productId);

  if (!product) {
    console.log("❌ Aucun produit trouvé.");
  } else {
    console.log("🎉 Produit trouvé !");
    console.log(product);
  }
})();

const https = require("https");
const cheerio = require("cheerio");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// 1) Récupérer le BUILD_ID de UUFinds
async function getBuildID() {
  console.log("⏳ Récupération du BUILD_ID...");

  const js = await get("https://www.uufinds.com/_next/static/buildManifest.js");

  const match = js.match(/"buildId":"([^"]+)"/);
  if (!match) {
    console.log("❌ Impossible de trouver le BUILD_ID");
    return null;
  }

  const buildId = match[1];
  console.log("✅ BUILD_ID :", buildId);
  return buildId;
}

// 2) Charger l’API JSON directe de UUFinds
async function getItem(buildId, productId) {
  const apiURL = `https://www.uufinds.com/_next/data/${buildId}/goodItemDetail/qc/${productId}.json`;

  console.log("⏳ Appel API :", apiURL);

  try {
    const jsonText = await get(apiURL);
    const json = JSON.parse(jsonText);

    const item = json?.pageProps?.goodItemDetail;
    if (!item) {
      console.log("❌ Objet produit introuvable");
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

// --- MAIN ---
(async () => {
  const productId = "1969159446778699777";

  const buildId = await getBuildID();
  if (!buildId) return;

  const product = await getItem(buildId, productId);

  if (!product) {
    console.log("❌ Aucun produit trouvé.");
  } else {
    console.log("✅ Produit trouvé :");
    console.log(product);
  }
})();

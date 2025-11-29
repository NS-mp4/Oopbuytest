const https = require("https");
const cheerio = require("cheerio");

function proxiedGet(url) {
  return new Promise((resolve, reject) => {
    const proxyURL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);

    https.get(proxyURL, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// 1) BuildID via proxy
async function getBuildID() {
  console.log("⏳ Lecture HTML UUFinds via proxy…");

  const html = await proxiedGet("https://www.uufinds.com");

  const $ = cheerio.load(html);
  let buildId = null;

  $("link[rel='preload']").each((i, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("_buildManifest.js")) {
      const parts = href.split("/");
      if (parts.length >= 4) buildId = parts[3];
    }
  });

  if (buildId) {
    console.log("✅ BUILD_ID trouvé :", buildId);
    return buildId;
  } else {
    console.log("❌ BUILD_ID introuvable (même via proxy)");
    return null;
  }
}

// 2) Charger JSON via proxy
async function getItem(buildId, productId) {
  const apiURL = `https://www.uufinds.com/_next/data/${buildId}/goodItemDetail/qc/${productId}.json`;

  console.log("⏳ Appel API via proxy :", apiURL);

  try {
    const jsonText = await proxiedGet(apiURL);
    const json = JSON.parse(jsonText);

    const item = json?.pageProps?.goodItemDetail;
    if (!item) return null;

    return {
      title: item.title,
      price: item.price,
      images: item.mainPicUrls,
      sold: item.soldQuantity,
      shop: item.userName
    };

  } catch (e) {
    console.log("❌ Erreur API :", e);
    return null;
  }
}

// MAIN
(async () => {
  const PRODUCT_ID = "1969159446778699777";

  const buildId = await getBuildID();
  if (!buildId) return;

  const product = await getItem(buildId, PRODUCT_ID);

  if (!product) {
    console.log("❌ Aucun produit trouvé.");
  } else {
    console.log("🎉 Produit trouvé !");
    console.log(product);
  }
})();

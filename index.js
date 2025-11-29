const https = require("https");

function apiGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function getUUFindsItem(id) {
  const apiURL = `https://qc.uufinds.com/web/goodItemDetail/getDetail?goodId=${id}`;

  console.log("⏳ Appel API directe :", apiURL);

  try {
    const raw = await apiGet(apiURL);
    const json = JSON.parse(raw);

    if (!json?.data) {
      console.log("❌ Pas de data UUFinds");
      return null;
    }

    const d = json.data;

    return {
      id: id,
      title: d.title,
      price: d.price,
      images: d.imgList,
      sold: d.sales,
      shopName: d.shopName,
      originalId: d.itemId,
      platform: d.platformName
    };

  } catch (e) {
    console.log("❌ Erreur API :", e);
    return null;
  }
}

(async () => {
  const PRODUCT = "1969159446778699777"; // ton ID

  const item = await getUUFindsItem(PRODUCT);

  if (!item) {
    console.log("❌ Impossible de lire le produit");
  } else {
    console.log("🎉 Produit récupéré avec succès !");
    console.log(item);
  }
})();

const https = require("https");
const cheerio = require("cheerio");

// Simple GET via node HTTPS (ne déclenche JAMAIS undici)
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "fr-FR"
      }
    }, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function scrapeUUFinds(url) {
  console.log("⏳ Lecture :", url);

  try {
    const html = await get(url);

    const $ = cheerio.load(html);

    const nextData = $("script#__NEXT_DATA__").html();
    if (!nextData) {
      console.log("❌ Impossible de trouver __NEXT_DATA__");
      return null;
    }

    const json = JSON.parse(nextData);
    const item = json?.props?.pageProps?.goodItemDetail;

    if (!item) {
      console.log("❌ Structure vide");
      return null;
    }

    return {
      title: item.title,
      price: item.price,
      images: item.mainPicUrls || []
    };

  } catch (e) {
    console.log("❌ Erreur scrape :", e.message);
    return null;
  }
}

(async () => {
  const URL = "https://www.uufinds.com/goodItemDetail/qc/1969159446778699777";
  const result = await scrapeUUFinds(URL);

  if (!result) {
    console.log("❌ Aucun produit trouvé.");
  } else {
    console.log("✅ Produit trouvé :");
    console.log(result);
  }
})();

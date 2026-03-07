const cheerio = require("cheerio");

async function getJobs(slug) {
  const url = "https://herp.careers/v1/" + slug;
  const res = await fetch(url, {
    headers: {"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36","Accept":"text/html","Accept-Language":"ja,en;q=0.9"},
  });
  if (!res.ok) return [];
  const $ = cheerio.load(await res.text());
  const jobs = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href.includes("/v1/" + slug + "/") && text.length > 5 && text.length < 200) {
      const fullUrl = "https://herp.careers" + href;
      if (!jobs.find(j => j.url === fullUrl)) {
        jobs.push({ title: text, url: fullUrl });
      }
    }
  });
  return jobs;
}

async function main() {
  const slugs = ["fastlabel","amoibe","sukedachi","smartcraft","route06","acall"];
  for (const s of slugs) {
    const jobs = await getJobs(s);
    console.log("\n=== " + s + " (" + jobs.length + "件) ===");
    jobs.forEach(j => console.log("  " + j.title));
  }
}
main();

const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { PORTFOLIO } = require("../src/portfolio");

const FETCH_TIMEOUT = 8000;
const SKIP_DOMAINS = ["linkedin.com"];

async function fetchPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  const res = await fetch(url, {
    headers: {"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36","Accept":"text/html","Accept-Language":"ja,en;q=0.9"},
    signal: ctrl.signal, redirect: "follow",
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.text();
}

async function fetchHerpJobs(slug) {
  const html = await fetchPage("https://herp.careers/v1/" + slug);
  const $ = cheerio.load(html);
  const jobs = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href.includes("/v1/" + slug + "/") && text.length > 3 && text.length < 200) {
      const fullUrl = href.startsWith("http") ? href : "https://herp.careers" + href;
      if (!jobs.find(j => j.url === fullUrl)) {
        jobs.push({ title: text, url: fullUrl });
      }
    }
  });
  return jobs;
}

async function fetchWantedlyJobs(url) {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const jobs = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      if (href.includes("/projects/") && text.length > 5 && text.length < 200) {
        const fullUrl = href.startsWith("http") ? href : "https://www.wantedly.com" + href;
        if (!jobs.find(j => j.url === fullUrl)) {
          jobs.push({ title: text, url: fullUrl });
        }
      }
    });
    return jobs;
  } catch { return []; }
}

async function fetchGenericJobs(url) {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const jobs = [];
    const keywords = ["募集","採用","求人","ポジション","engineer","sales","designer","manager","director","lead"];
    $("a[href]").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const href = $(el).attr("href") || "";
      if (text.length > 3 && text.length < 200 && keywords.some(k => text.includes(k) || href.toLowerCase().includes(k))) {
        let fullUrl = href;
        try { fullUrl = new URL(href, url).href; } catch {}
        if (!jobs.find(j => j.url === fullUrl)) {
          jobs.push({ title: $(el).text().trim(), url: fullUrl });
        }
      }
    });
    return jobs;
  } catch { return []; }
}

async function main() {
  const cache = {};
  const today = new Date().toISOString().split("T")[0];
  let herpCount = 0, wantedlyCount = 0, otherCount = 0, noUrlCount = 0;

  for (const c of PORTFOLIO) {
    const url = c.recruitUrl;
    let jobs = [];
    let level = "C";

    if (!url) {
      level = "C";
      noUrlCount++;
      console.log("⬜ " + c.id + " " + c.name + " → URL無し (Level C)");
    } else if (url.includes("herp.careers")) {
      try {
        const slug = url.split("/v1/")[1];
        jobs = await fetchHerpJobs(slug);
        level = jobs.length > 0 ? "A" : "B";
        herpCount++;
        console.log("🟢 " + c.id + " " + c.name + " → HERP " + jobs.length + "件 (Level " + level + ")");
      } catch (e) {
        level = "B";
        console.log("🟡 " + c.id + " " + c.name + " → HERP失敗: " + e.message);
      }
    } else if (url.includes("wantedly.com")) {
      try {
        jobs = await fetchWantedlyJobs(url);
        level = jobs.length > 0 ? "A" : "B";
        wantedlyCount++;
        console.log("🔵 " + c.id + " " + c.name + " → Wantedly " + jobs.length + "件 (Level " + level + ")");
      } catch (e) {
        level = "B";
        console.log("🟡 " + c.id + " " + c.name + " → Wantedly失敗: " + e.message);
      }
    } else if (SKIP_DOMAINS.some(d => url.includes(d))) {
      level = "B";
      console.log("⬜ " + c.id + " " + c.name + " → スキップ (Level B)");
    } else {
      try {
        jobs = await fetchGenericJobs(url);
        level = jobs.length > 0 ? "A" : "B";
        otherCount++;
        console.log("⚪ " + c.id + " " + c.name + " → 自社 " + jobs.length + "件 (Level " + level + ")");
      } catch (e) {
        level = "B";
        console.log("🟡 " + c.id + " " + c.name + " → 自社失敗: " + e.message);
      }
    }

    cache[c.id] = { jobs: jobs.slice(0, 20), level, hiringNeeds: c.hiringNeeds, updated: today };
  }

  const outPath = path.join(__dirname, "..", "src", "job-cache.json");
  fs.writeFileSync(outPath, JSON.stringify(cache, null, 2));

  const levelA = Object.values(cache).filter(v => v.level === "A").length;
  const levelB = Object.values(cache).filter(v => v.level === "B").length;
  const levelC = Object.values(cache).filter(v => v.level === "C").length;
  const totalJobs = Object.values(cache).reduce((s, v) => s + v.jobs.length, 0);

  console.log("\n=== 完了 ===");
  console.log("Level A (求人あり): " + levelA + "社");
  console.log("Level B (hiringNeedsのみ): " + levelB + "社");
  console.log("Level C (情報なし): " + levelC + "社");
  console.log("合計求人数: " + totalJobs + "件");
  console.log("保存先: " + outPath);
}

main();

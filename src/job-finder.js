const cheerio = require("cheerio");
const { PORTFOLIO } = require("./portfolio");

const SKIP_DOMAINS = ["wantedly.com", "linkedin.com"];
const FETCH_TIMEOUT = 5000;

function shouldSkip(url) {
  try { return SKIP_DOMAINS.some(d => new URL(url).hostname.includes(d)); }
  catch { return true; }
}

function buildGoogleSearchUrl(name, position, recruitUrl) {
  const isWantedly = (recruitUrl || "").includes("wantedly.com");
  const q = isWantedly
    ? `site:wantedly.com ${name} 募集`
    : `(site:herp.careers OR site:wantedly.com OR site:green-japan.com) ${name} 求人`;
  return "https://www.google.com/search?q=" + encodeURIComponent(q);
}

function normalizePosition(position) {
  return position.replace(/[・/／\s]/g, " ").split(" ").filter(w => w.length >= 2).map(w => w.toLowerCase());
}

async function findJobUrl(recruitUrl, companyName, position) {
  if (!recruitUrl || shouldSkip(recruitUrl)) {
    return { type: "search", url: buildGoogleSearchUrl(companyName, position, recruitUrl) };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    const res = await fetch(recruitUrl, {
      headers: { "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36", "Accept":"text/html", "Accept-Language":"ja,en;q=0.9" },
      signal: ctrl.signal, redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const $ = cheerio.load(await res.text());
    const kws = normalizePosition(position);
    let best = null, bestScore = 0;
    $("a[href]").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const href = $(el).attr("href") || "";
      if (!text || text.length > 200 || href.startsWith("mailto:") || href.startsWith("tel:") || href === "#") return;
      const score = kws.filter(k => text.includes(k) || href.toLowerCase().includes(k)).length;
      if (score > bestScore) {
        bestScore = score;
        let fullUrl = href;
        try { fullUrl = new URL(href, recruitUrl).href; } catch {}
        best = { text: $(el).text().trim(), url: fullUrl, score };
      }
    });
    if (best && bestScore >= 1) {
      console.log(`✅ [${companyName}] 求人リンク発見: "${best.text}" (score:${bestScore}) → ${best.url}`);
      return { type: "direct", url: best.url };
    }
    console.log(`🔍 [${companyName}] リンク見つからず → Google検索`);
    return { type: "search", url: buildGoogleSearchUrl(companyName, position, recruitUrl) };
  } catch (e) {
    console.log(`⚠️ [${companyName}] fetch失敗 (${e.message}) → Google検索`);
    return { type: "search", url: buildGoogleSearchUrl(companyName, position, recruitUrl) };
  }
}

async function findJobUrls(matches) {
  return Promise.all(matches.map(async m => {
    const c = PORTFOLIO.find(p => p.id === m.company_id || p.name === m.company_name);
    if (!c) return { companyId: m.company_id, type: "search", url: buildGoogleSearchUrl(m.company_name, m.position, "") };
    const r = await findJobUrl(c.recruitUrl, c.name, m.position);
    return { companyId: m.company_id, ...r };
  }));
}

module.exports = { findJobUrls };

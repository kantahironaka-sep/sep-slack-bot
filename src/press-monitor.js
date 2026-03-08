require("dotenv").config();
const {google} = require("googleapis");
function getSheetsClient() {
  const pk = Buffer.from(process.env.GOOGLE_PRIVATE_KEY,'base64').toString('utf8');
  const auth = new google.auth.GoogleAuth({
    credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
    scopes:['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({version:'v4',auth});
}

async function updateFundingInSheets(companyId, title, link) {
  if (!process.env.PORTFOLIO_SHEET_ID) return;
  try {
    const s = getSheetsClient();
    const r = await s.spreadsheets.values.get({
      spreadsheetId: process.env.PORTFOLIO_SHEET_ID,
      range: 'Portfolio_DB!A4:A200'
    });
    const rows = r.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === companyId);
    if (rowIndex === -1) return;
    const rowNum = rowIndex + 4;
    const today = new Date().toISOString().split('T')[0];
    // AC列(latest_round_date=28), AQ列(last_updated=42), AP列(notes=41)
    await s.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.PORTFOLIO_SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: [
        { range: `Portfolio_DB!AC${rowNum}`, values: [[today]] },
        { range: `Portfolio_DB!AQ${rowNum}`, values: [[today]] },
        { range: `Portfolio_DB!AP${rowNum}`, values: [[`[自動検知] ${title} ${link}`]] },
      ]}
    });
    console.log(`✅ Sheets更新: ${companyId} latest_round_date=${today}`);
  } catch(e) {
    console.log('Sheets更新失敗:', e.message);
  }
}
const https = require("https");
const fs = require("fs");
const path = require("path");

const FUNDING_CACHE_PATH = path.join(__dirname, "funding-cache.json");
const KEYWORDS = ["資金調達", "シリーズ", "億円", "調達", "funding", "raised", "series"];

// 資金調達済みキャッシュの読み書き
function loadFundingCache() {
  try { return JSON.parse(fs.readFileSync(FUNDING_CACHE_PATH, "utf8")); } catch { return {}; }
}
function saveFundingCache(cache) {
  fs.writeFileSync(FUNDING_CACHE_PATH, JSON.stringify(cache, null, 2));
}

// PR TIMESのRSSを取得
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// RSS本文から記事タイトル・リンクを抽出
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "";
    const link = (item.match(/<link>(.*?)<\/link>/))?.[1] || "";
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || "";
    items.push({ title, link, pubDate });
  }
  return items;
}

// ポートフォリオ企業名リストを取得
function getCompanyNames() {
  try {
    const { PORTFOLIO } = require("./portfolio.js");
    return PORTFOLIO.map(c => ({ id: c.id, names: [c.name, c.nameEn].filter(Boolean) }));
  } catch { return []; }
}

// メイン検索
async function checkFundingNews(notifyFn) {
  const cache = loadFundingCache();
  const companies = getCompanyNames();
  const found = [];

  const RSS_URLS = [
    "https://prtimes.jp/rss/all.xml",
    "https://jp.techcrunch.com/feed/",
  ];

  for (const rssUrl of RSS_URLS) {
    let xml;
    try {
      xml = await fetchRSS(rssUrl);
    } catch (e) {
      console.log(`RSS取得失敗: ${rssUrl}`, e.message);
      continue;
    }

    const items = parseRSS(xml);

    for (const item of items) {
      const titleLower = item.title.toLowerCase();
      const hasFundingKw = KEYWORDS.some(kw => item.title.includes(kw) || titleLower.includes(kw.toLowerCase()));
      if (!hasFundingKw) continue;

      for (const company of companies) {
        const matched = company.names.some(name => name && item.title.includes(name));
        if (!matched) continue;

        const cacheKey = `${company.id}_${item.link}`;
        if (cache[cacheKey]) continue; // 既に通知済み

        console.log(`📢 資金調達検知: ${company.id} - ${item.title}`);
        cache[cacheKey] = { detectedAt: new Date().toISOString(), title: item.title, link: item.link };

        found.push({ companyId: company.id, title: item.title, link: item.link });

        if (notifyFn) await notifyFn({ companyId: company.id, title: item.title, link: item.link });
        await updateFundingInSheets(company.id, item.title, item.link);
      }
    }
  }

  saveFundingCache(cache);
  return found;
}

// ブースト対象の企業IDリストを返す（30日以内に調達した企業）
function getFundingBoostedIds() {
  const cache = loadFundingCache();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const boosted = new Set();
  for (const [key, val] of Object.entries(cache)) {
    if (new Date(val.detectedAt).getTime() > thirtyDaysAgo) {
      const companyId = key.split("_")[0];
      boosted.add(companyId);
    }
  }
  return boosted;
}

module.exports = { checkFundingNews, getFundingBoostedIds };

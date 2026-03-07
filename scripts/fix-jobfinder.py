with open('src/job-finder.js','r') as f: c=f.read()

# 1. job-cacheのrequireを先頭に追加
old_head = 'function buildSearchUrl(name, recruitUrl) {'
cache_require = """// 求人キャッシュから直接リンクを探す
let JOB_CACHE = {};
try { JOB_CACHE = require("./job-cache.json"); } catch { console.log("job-cache not found"); }

function findFromCache(companyId, position) {
  const cached = JOB_CACHE[companyId];
  if (!cached || !cached.jobs || cached.jobs.length === 0) return null;
  const kws = normalizePosition(position);
  let best = null, bestScore = 0;
  for (const job of cached.jobs) {
    const title = job.title.toLowerCase();
    const score = kws.filter(k => title.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = job; }
  }
  if (best && bestScore >= 1) {
    console.log("\\u2705 [cache] " + companyId + ": \\"" + best.title + "\\" (score:" + bestScore + ")");
    return { type: "direct", url: best.url, text: best.title };
  }
  if (cached.jobs.length > 0) {
    console.log("\\u2139\\ufe0f [cache] " + companyId + ": no position match, returning first job");
    return null;
  }
  return null;
}

function buildSearchUrl(name, recruitUrl) {"""
c = c.replace(old_head, cache_require)

# 2. findJobUrl関数の先頭にキャッシュチェックを追加
old_find = 'async function findJobUrl(recruitUrl, companyName, position) {'
new_find = """async function findJobUrl(recruitUrl, companyName, position, companyId) {
  // まずキャッシュから探す
  if (companyId) {
    const cached = findFromCache(companyId, position);
    if (cached) return cached;
  }"""
c = c.replace(old_find, new_find)

# 3. findJobUrls内でcompanyIdを渡すように修正
old_call = 'const r = await findJobUrl(c.recruitUrl, c.name, m.position);'
new_call = 'const r = await findJobUrl(c.recruitUrl, c.name, m.position, c.id);'
c = c.replace(old_call, new_call)

with open('src/job-finder.js','w') as f: f.write(c)
print("Done! job-finder.js updated")

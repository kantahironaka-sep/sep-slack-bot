const {PORTFOLIO} = require('./src/portfolio');
const targets = PORTFOLIO.filter(c => c.recruitUrl && c.recruitUrl.indexOf('wantedly') === -1 && c.recruitUrl.indexOf('linkedin') === -1);

async function check() {
  for (const c of targets) {
    const slug = c.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '');
    try {
      const url = 'https://herp.careers/v1/'+slug;
      const res = await fetch(url, {method:'HEAD', redirect:'follow'});
      if (res.ok) { console.log('✅ ' + c.id + '\t' + c.name + '\t' + url); }
    } catch {}
  }
  console.log('--- done ---');
}
check();

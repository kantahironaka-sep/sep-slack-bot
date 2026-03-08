require('dotenv').config();
const {google} = require('googleapis');
const fs = require('fs');
const path = require('path');

async function getSheets() {
  const pk = Buffer.from(process.env.GOOGLE_PRIVATE_KEY,'base64').toString('utf8');
  const auth = new google.auth.GoogleAuth({
    credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
    scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  return google.sheets({version:'v4',auth});
}

async function syncPortfolio() {
  const s = await getSheets();
  const r = await s.spreadsheets.values.get({
    spreadsheetId: process.env.PORTFOLIO_SHEET_ID,
    range: 'Portfolio_DB!A4:AW200'
  });
  const rows = r.data.values || [];
  const portfolio = [];
  for (const row of rows) {
    const id = row[0];
    if (!id || !id.startsWith('GV-')) continue;
    const status = row[30];
    if (status && status.includes('Exit')) continue;
    const keywordsJa = (row[20] || '').split(/[,、，]/).map(k=>k.trim()).filter(Boolean);
    portfolio.push({
      id,
      name:             row[1]  || '',
      nameEn:           row[2]  || '',
      sector:           row[14] || '',
      stage:            row[22] || 'Seed',
      teamSize:         row[35] || '不明',
      ceo:              row[33] || '不明',
      summary:          row[9]  || row[7] || '',
      hiringNeeds:      row[36] || '全ポジション',
      growthChallenges: row[37] || '',
      keywords:         keywordsJa,
      target_market:    row[47] || 'B2B',
      target_segment:   row[48] || 'SMB',
      recruitUrl:       row[46] || '',
    });
  }
  return portfolio;
}

(async () => {
  try {
    const portfolio = await syncPortfolio();
    const outPath = path.join(__dirname, 'portfolio.js');
    const content = `const PORTFOLIO = ${JSON.stringify(portfolio, null, 2)};\nmodule.exports = { PORTFOLIO };\n`;
    fs.writeFileSync(outPath, content);
    console.log(`完了: ${portfolio.length}社`);
    portfolio.slice(0,5).forEach(c => console.log(` - ${c.id} ${c.name} (${c.target_market}/${c.target_segment})`));
  } catch(e) {
    console.error('エラー:', e.message);
  }
})();

module.exports = { syncPortfolio };

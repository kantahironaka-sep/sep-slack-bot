require('dotenv').config();
const {google} = require('googleapis');
const pk = Buffer.from(process.env.GOOGLE_PRIVATE_KEY,'base64').toString('utf8');
const auth = new google.auth.GoogleAuth({
  credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
  scopes:['https://www.googleapis.com/auth/spreadsheets']
});

// 正解リスト（IDと正しいtarget_market）
const FIXES = {
  'GV-002': ['B2B2C', 'Consumer'],  // タイミー
  'GV-010': ['B2B2C', 'SMB'],       // JobRainbow
  'GV-017': ['B2C', 'Consumer'],    // HOKUTO
  'GV-023': ['B2C', 'Consumer'],    // Manabie
  'GV-027': ['B2C', 'Consumer'],    // Petokoto
  'GV-029': ['B2C', 'Consumer'],    // GAXI
  'GV-045': ['B2C', 'Consumer'],    // Sports For Life
};

(async()=>{
  const s = await google.sheets({version:'v4',auth});
  const SHEET_ID = process.env.PORTFOLIO_SHEET_ID;
  const r = await s.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Portfolio_DB!A4:A200'
  });
  const rows = r.data.values || [];
  const requests = [];
  rows.forEach((row, i) => {
    if (FIXES[row[0]]) {
      const rowNum = i + 4;
      requests.push({
        range: `Portfolio_DB!AV${rowNum}:AW${rowNum}`,
        values: [FIXES[row[0]]]
      });
      console.log(`修正: ${row[0]} → ${FIXES[row[0]]}`);
    }
  });
  await s.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: requests }
  });
  console.log('✅ 修正完了');
})();

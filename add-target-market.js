require('dotenv').config();
const {google} = require('googleapis');
const {PORTFOLIO} = require('./src/portfolio');
const pk = Buffer.from(process.env.GOOGLE_PRIVATE_KEY,'base64').toString('utf8');
const auth = new google.auth.GoogleAuth({
  credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
  scopes:['https://www.googleapis.com/auth/spreadsheets']
});
(async()=>{
  const s = await google.sheets({version:'v4',auth});
  const SHEET_ID = process.env.PORTFOLIO_SHEET_ID;
  const meta = await s.spreadsheets.get({spreadsheetId: SHEET_ID});
  const sheet = meta.data.sheets.find(sh => sh.properties.title === 'Portfolio_DB');
  const sheetId = sheet.properties.sheetId;
  await s.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{appendDimension:{sheetId,dimension:'COLUMNS',length:2}}]}
  });
  const r = await s.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:'Portfolio_DB!A1:A200'});
  const rows = r.data.values || [];
  const vals = [['target_market','target_segment']];
  rows.forEach((row,i)=>{
    if(i<3)return;
    const c = PORTFOLIO.find(c=>c.id===row[0]);
    vals.push([c?c.target_market:'', c?c.target_segment:'']);
  });
  await s.spreadsheets.values.update({spreadsheetId:SHEET_ID,range:'Portfolio_DB!AV2',valueInputOption:'USER_ENTERED',requestBody:{values:vals}});
  console.log('完了:', vals.length-1, '社');
})();

require('dotenv').config();
const {google} = require('googleapis');
const pk = Buffer.from(process.env.GOOGLE_PRIVATE_KEY,'base64').toString('utf8');
const auth = new google.auth.GoogleAuth({
  credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
  scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']
});
(async()=>{
  const s = await google.sheets({version:'v4',auth});
  const r = await s.spreadsheets.values.get({
    spreadsheetId: process.env.PORTFOLIO_SHEET_ID,
    range: 'Portfolio_DB!A3:AU3'
  });
  const row = r.data.values[0];
  row.forEach((v,i)=>{
    const col = i < 26 ? String.fromCharCode(65+i) : 'A'+String.fromCharCode(65+i-26);
    console.log(col+':', v);
  });
})();

require('dotenv').config();
const {google} = require('googleapis');
const pk = Buffer.from(process.env.GOOGLE_PRIVATE_KEY,'base64').toString('utf8');
const auth = new google.auth.GoogleAuth({
  credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
  scopes:['https://www.googleapis.com/auth/spreadsheets']
});
(async()=>{
  const s = await google.sheets({version:'v4',auth});
  const SHEET_ID = process.env.PORTFOLIO_SHEET_ID;

  // まずシートIDを取得
  const meta = await s.spreadsheets.get({spreadsheetId: SHEET_ID});
  const sheet = meta.data.sheets.find(sh => sh.properties.title === 'Portfolio_DB');
  const sheetId = sheet.properties.sheetId;

  // 全行を取得してGV-061,062,063,066の行番号を特定
  const r = await s.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Portfolio_DB!A1:A200'
  });
  const rows = r.data.values || [];
  const targetIds = ['GV-061','GV-062','GV-063','GV-066'];
  const deleteRows = [];
  rows.forEach((row, i) => {
    if (targetIds.includes(row[0])) {
      deleteRows.push(i); // 0-indexed
      console.log(`見つかった: ${row[0]} → 行${i+1}`);
    }
  });

  if (deleteRows.length === 0) {
    console.log('対象行が見つかりませんでした');
    return;
  }

  // 後ろから削除（行番号がずれないように）
  const requests = deleteRows.reverse().map(rowIndex => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex,
        endIndex: rowIndex + 1
      }
    }
  }));

  await s.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests }
  });

  console.log(`✅ ${deleteRows.length}行削除完了`);
})();

require('dotenv').config();
const {google} = require('googleapis');

async function getSheets() {
  const pk = Buffer.from(process.env.GOOGLE_PRIVATE_KEY,'base64').toString('utf8');
  const auth = new google.auth.GoogleAuth({
    credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
    scopes:['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({version:'v4',auth});
}

const urlMap = {
  // Batch 1
  'ケミカン': 'https://chemikan.co.jp/recruit',
  'NiCOLA': 'https://en-gage.net/nicola/',
  'BizteX': 'https://herp.careers/v1/biztex',
  'Non Brokers': 'https://non-brokers.jbplt.jp/',
  'Mosh': 'https://careers.mosh.jp/',
  'REGALI': 'https://herp.careers/v1/regali',
  'ロジクラ': 'https://corp.logikura.jp/recruit',
  'Linc': 'https://linc-info.com/recruit-top/',
  'バベル': 'https://herp.careers/v1/babel',
  'PSYGIG': 'https://en-jp.wantedly.com/companies/psygig/about',
  '空き家活用': 'https://en-gage.net/aki-katsu_saiyo/',
  'Mobilkamu': 'https://www.jobstreet.co.id/companies/mobilkamu-group-indonesia-168555790138578',
  'amplified.ai': 'https://wellfound.com/company/amplified-ai',
  'CO-NECT': 'https://herp.careers/v1/conect',
  'アットハース': 'https://about.athearth.com/careers',
  'Sozi': 'https://herp.careers/v1/sozi',
  'Aerial Partners': 'https://herp.careers/v1/aerialp',
  'ジャングルX': 'https://jp.jungle.xyz/career',
  'Crezit': 'https://career.crezit-holdings.com/',
  'Skillnote': 'https://career.skillnote.jp/',
  'プランティオ': 'https://sg.wantedly.com/companies/plantio2/projects',
  'Logisly': 'https://logisly.com/careers',
  'Pergi Kuliner': 'https://www.karir.com/companies/40783',
  'WISE EGG': 'https://sg.wantedly.com/companies/hellowiseegg',
  'リース': 'https://www.green-japan.com/company/8559',
  'dreamstock': 'https://sg.wantedly.com/companies/dreamstock',
  'eDoctor': 'https://itviec.com/companies/edoctor',
  // Batch 2
  'Napps Technologies': 'https://www.in-fra.jp/next/companies/4497',
  'コノセル': 'https://herp.careers/v1/conocer',
  'クラウドローン': 'https://careers.crowdloan.jp/',
  'FUNEE': 'https://herp.careers/careers/companies/funee/jobs/dvIyYVNQVxtN',
  'Vietcetera': 'https://vietcetera.com/careers',
  'エナーバンク': 'https://herp.careers/v1/enerbank',
  'FOODCODE': 'https://www.wantedly.com/companies/company_foodcode/projects',
  'Nectico': 'https://www.nectico.com/en/beranda/career/',
  'miive': 'https://herp.careers/careers/companies/miive',
  'Vitalogue Health': 'https://herp.careers/v1/vitalogue',
  'Finantier': 'https://finantier.co/careers/',
  'ナッジ': 'https://nudge.works/talents',
  'エイトス': 'https://herp.careers/v1/eitoss',
  'メンテモ': 'https://open.talentio.com/r/1/c/mentemo/homes/2639',
  'amptalk': 'https://amptalk.co.jp/recruit/top',
  'Fundiin': 'https://itviec.com/companies/fundiin',
  'イークラウド': 'https://en-gage.net/ecrowd_career/',
  'Airboxr': 'https://jobs.airboxr.com/',
  'TiERRAS': 'https://en-jp.wantedly.com/companies/company_2454760/projects',
  'DXER': 'https://herp.careers/v1/dxer',
  'Selly': 'https://itviec.com/companies/selly',
  'シャトル': 'https://herp.careers/v1/shuttle',
  'ElevationSpace': 'https://herp.careers/v1/elspace',
  'Payn': 'https://herp.careers/v1/payn',
  // Batch 3
  'movus technologies': 'https://www.wantedly.com/companies/company_269709/projects',
  'InsightX': 'https://careers.insightx.tech/',
  'AC Biode': 'https://acbiode.com/careers/',
  'Mined': 'https://www.wantedly.com/companies/company_6382744',
  'TAIAN': 'https://www.wantedly.com/companies/taian/projects',
  'Flucle': 'https://hrbase.recruitment.jp/',
  'Conoris': 'https://herp.careers/v1/mitsucaru',
  'アルバトロス・テクノロジー': 'https://www.albatross-technology.com/careers',
  'Runchise': 'https://apply.workable.com/runchise/',
  'Mierba': 'https://www.wantedly.com/companies/company_9302277',
  'コングラント': 'https://www.wantedly.com/companies/company_congrant/projects',
  'Sales Navi': 'https://www.wantedly.com/companies/company_salesnavi/projects',
  'Logpose Technologies': 'https://careers.logpose.co.jp/',
  'トドケール': 'https://www.todoker.com/recruit',
  'CARESPACE': 'https://www.wantedly.com/companies/company_3357489',
  'Artefact Collective': 'https://www.kasagilabo.com/careers',
  'M&A Lead': 'https://www.wantedly.com/companies/company_9590660',
  'StepChange': 'https://www.wantedly.com/companies/stepchange/projects',
  'フレンドマイクローブ': 'https://friendmicrobe.co.jp/recruit/entry-143.html',
  'Haul': 'https://haulinc.jp/career/',
  'リチェルカ': 'https://herp.careers/v1/recerqa',
};

async function updateUrls() {
  const sheets = await getSheets();
  const sheetId = process.env.PORTFOLIO_SHEET_ID;

  // Read all company names and their row numbers
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Portfolio_DB!A4:B200'
  });
  const rows = r.data.values || [];

  const updates = [];
  let found = 0;
  let notFound = 0;

  for (let i = 0; i < rows.length; i++) {
    const id = rows[i][0];
    const name = rows[i][1];
    if (!name) continue;

    const url = urlMap[name];
    if (url) {
      const rowNum = i + 4; // data starts at row 4
      updates.push({
        range: `Portfolio_DB!AU${rowNum}`,
        values: [[url]]
      });
      found++;
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });
  }

  console.log(`✅ ${found} companies updated with recruiting URLs`);
  console.log(`⬜ ${Object.keys(urlMap).length - found} URLs not matched (company name mismatch)`);

  // Count remaining without URL
  const r2 = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Portfolio_DB!A4:AU200'
  });
  const allRows = r2.data.values || [];
  const noUrl = allRows.filter(r => r[0] && r[0].startsWith('GV-') && !r[46]).length;
  console.log(`\n📊 Total companies without recruiting URL: ${noUrl}`);
}

updateUrls().catch(e => console.error('Error:', e.message));

const fs=require("fs"),path=require("path");
let sheetsApi=null;
const SPREADSHEET_ID=process.env.FEEDBACK_SHEET_ID||"";
const SHEET_NAME="feedback";
const JSON_PATH=path.join(__dirname,"feedback-log.json");

async function getSheets(){
  if(sheetsApi)return sheetsApi;
  if(!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||!process.env.GOOGLE_PRIVATE_KEY){
    console.log("Sheets debug EMAIL:",!!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,"KEY:",!!process.env.GOOGLE_PRIVATE_KEY,"SHEET:",!!process.env.FEEDBACK_SHEET_ID);
    return null;
  }
  try{
    const{google}=require("googleapis");
    const pk=Buffer.from(process.env.GOOGLE_PRIVATE_KEY,"base64").toString("utf8");
    const auth=new google.auth.GoogleAuth({
      credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
      scopes:["https://www.googleapis.com/auth/spreadsheets"]
    });
    sheetsApi=google.sheets({version:"v4",auth});
    console.log("Google Sheets接続OK");
    return sheetsApi;
  }catch(e){console.error("Sheets初期化失敗:",e.message);return null;}
}

async function appendToSheet(row){
  const s=await getSheets();
  if(!s||!SPREADSHEET_ID){saveToJson(row);return;}
  try{
    await s.spreadsheets.values.append({spreadsheetId:SPREADSHEET_ID,range:SHEET_NAME+"!A:J",valueInputOption:"USER_ENTERED",requestBody:{values:[[row.timestamp,row.reviewer,row.candidate_type,row.primary_market,row.company_id,row.company_name,row.position,row.match_score,row.rating,row.comment,row.funding_boost?"💰調達ブースト":""]]}});
    console.log("Sheets保存:",row.company_name,row.rating);
  }catch(e){console.error("Sheets失敗:",e.message);saveToJson(row);}
}

function saveToJson(row){
  let data=[];
  try{data=JSON.parse(fs.readFileSync(JSON_PATH,"utf8"));}catch{}
  data.push(row);
  fs.writeFileSync(JSON_PATH,JSON.stringify(data,null,2));
  console.log("JSON保存:",row.company_name,row.rating);
}

async function saveFeedback({reviewer,candidateType,primaryMarket,companyId,companyName,position,matchScore,rating,comment,fundingBoost}){
  const row={timestamp:new Date().toISOString(),reviewer,candidate_type:candidateType||"",primary_market:primaryMarket||"",company_id:companyId,company_name:companyName,position:position||"",match_score:matchScore||0,rating,comment:comment||"",funding_boost:fundingBoost||false};
  await appendToSheet(row);
  return row;
}

module.exports={saveFeedback};

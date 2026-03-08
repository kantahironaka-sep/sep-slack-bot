c=open('src/feedback.js').read()
old='console.log("Google Sheets未設定→ローカルJSON")'
new='console.log("Sheets debug EMAIL:",!!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,"KEY:",!!process.env.GOOGLE_PRIVATE_KEY,"SHEET:",!!process.env.FEEDBACK_SHEET_ID)'
c=c.replace(old,new)
open('src/feedback.js','w').write(c)
print('Done')

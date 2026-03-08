with open('src/formatter.js','r') as f: c=f.read()
old='    if (actions.length) blocks.push({ type:"actions", elements:actions });\n    if (i < matches.length-1) blocks.push({ type:"divider" });'
new='''    if (actions.length) blocks.push({ type:"actions", elements:actions });

    // フィードバックボタン
    const fbPrefix = "fb_" + (m.company_id || "unknown") + "_" + i + "_";
    blocks.push({ type:"actions", elements:[
      { type:"button", text:{ type:"plain_text", text:"◎ 最適", emoji:true }, action_id:fbPrefix+"excellent", value:JSON.stringify({company_id:m.company_id,company_name:m.company_name,position:m.position,score:m.match_score,rating:"◎"}) },
      { type:"button", text:{ type:"plain_text", text:"○ 良い", emoji:true }, action_id:fbPrefix+"good", value:JSON.stringify({company_id:m.company_id,company_name:m.company_name,position:m.position,score:m.match_score,rating:"○"}) },
      { type:"button", text:{ type:"plain_text", text:"△ 微妙", emoji:true }, action_id:fbPrefix+"fair", value:JSON.stringify({company_id:m.company_id,company_name:m.company_name,position:m.position,score:m.match_score,rating:"△"}) },
      { type:"button", text:{ type:"plain_text", text:"× ナシ", emoji:true }, action_id:fbPrefix+"bad", value:JSON.stringify({company_id:m.company_id,company_name:m.company_name,position:m.position,score:m.match_score,rating:"×"}) },
    ]});

    if (i < matches.length-1) blocks.push({ type:"divider" });'''
c=c.replace(old,new)
with open('src/formatter.js','w') as f: f.write(c)
print("Done! formatter.js updated")

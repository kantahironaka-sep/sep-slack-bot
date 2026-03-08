with open('src/app.js','r') as f: c=f.read()
old_req='const { formatMatchResult, formatPortfolioList, formatError, formatLoading } = require("./formatter");'
c=c.replace(old_req, old_req+'\nconst { saveFeedback } = require("./feedback");')
old_act='app.action(/^r_/, async ({ ack }) => { await ack(); });'
new_act='''app.action(/^fb_/, async ({ ack, body, client, action }) => {
  await ack();
  try {
    const data = JSON.parse(action.value);
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal", callback_id: "feedback_modal",
        private_metadata: JSON.stringify({ ...data, channel: body.channel?.id || "", message_ts: body.message?.ts || "", user_id: body.user.id }),
        title: { type: "plain_text", text: data.rating + " " + data.company_name },
        submit: { type: "plain_text", text: "送信" },
        close: { type: "plain_text", text: "キャンセル" },
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: "*企業:* " + data.company_name + "\\n*ポジション:* " + (data.position || "N/A") + "\\n*評価:* " + data.rating + "\\n*AIスコア:* " + data.score + "点" }},
          { type: "divider" },
          { type: "input", block_id: "comment_block", optional: true, label: { type: "plain_text", text: "一言コメント（任意）" }, element: { type: "plain_text_input", action_id: "comment_input", multiline: true, placeholder: { type: "plain_text", text: "なぜこの評価？" } } },
        ],
      },
    });
  } catch (e) { console.error("FB modal error:", e); }
});

app.view("feedback_modal", async ({ ack, body, view, client }) => {
  await ack();
  try {
    const meta = JSON.parse(view.private_metadata);
    const comment = view.state?.values?.comment_block?.comment_input?.value || "";
    const userName = body.user?.name || body.user?.id || "unknown";
    await saveFeedback({ reviewer: userName, candidateType: "", primaryMarket: "", companyId: meta.company_id, companyName: meta.company_name, position: meta.position, matchScore: meta.score, rating: meta.rating, comment });
    if (meta.channel && meta.message_ts) {
      const emoji = meta.rating === "\\u25ce" ? "star2" : meta.rating === "\\u25cb" ? "thumbsup" : meta.rating === "\\u25b3" ? "thinking_face" : "x";
      try { await client.reactions.add({ channel: meta.channel, name: emoji, timestamp: meta.message_ts }); } catch(e) {}
    }
    console.log("FB saved:", meta.company_name, meta.rating, comment ? "(" + comment + ")" : "");
  } catch (e) { console.error("FB save error:", e); }
});

app.action(/^r_/, async ({ ack }) => { await ack(); });'''
c=c.replace(old_act, new_act)
with open('src/app.js','w') as f: f.write(c)
print("Done! app.js updated")

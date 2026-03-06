const { PORTFOLIO } = require("./portfolio");

function scoreEmoji(s) { return s >= 85 ? "🔥" : s >= 70 ? "🎯" : s >= 55 ? "💡" : "📌"; }

function formatMatchResult(result) {
  const { profile, matches } = result;
  const salaryInfo = profile.current_salary
    ? `💴 *現年収:* ${profile.current_salary}万円（明記）`
    : `💴 *推定年収:* ${profile.estimated_salary}万円（フェルミ推定）`;

  const blocks = [
    { type:"header", text:{ type:"plain_text", text:"🎯 マッチング結果：" + (profile.name||"候補者"), emoji:true }},
    { type:"section", text:{ type:"mrkdwn", text:[
      "*現職:* " + (profile.current_role||"N/A"),
      "*経歴:* " + (profile.career_summary||"N/A"),
      "*専門:* " + (profile.domain_expertise||[]).join(", "),
      "*スキル:* " + (profile.skills||[]).join(", "),
      "*マネジメント:* " + (profile.management_exp||"N/A"),
      "*志向性:* " + (profile.career_aspiration||"N/A"),
      salaryInfo,
    ].join("\n") }},
    { type:"divider" },
  ];

  matches.forEach((m, i) => {
    const c = PORTFOLIO.find(p => p.id === m.company_id);
    const emoji = scoreEmoji(m.match_score);
    const jdStatus = m.has_jd ? "📄 JD確認済" : "⚠️ JD未確認（打診推奨）";

    // 年収情報
    const salaryRange = m.salary_range;
    const salaryFitEmoji = m.salary_fit === "◎" ? "◎" : m.salary_fit === "○" ? "○" : m.salary_fit === "△" ? "△" : "×";
    const salaryText = salaryRange
      ? `💰 *年収レンジ:* ${salaryRange.min}〜${salaryRange.max}万円　年収フィット: ${salaryFitEmoji}　${m.salary_gap || ""}${salaryRange.note ? `　_※${salaryRange.note}_` : ""}`
      : "";

    blocks.push({ type:"section", text:{ type:"mrkdwn", text:[
      emoji + " *#" + (i+1) + " " + m.company_name + "* — マッチングスコア: *" + m.match_score + "点*",
      "📌 *推薦ポジション:* " + m.position,
      (c ? c.sector + " | " + c.stage + " | " + c.teamSize : ""),
      jdStatus,
      salaryText,
    ].filter(Boolean).join("\n") }});

    if (m.has_jd && m.jd_summary) {
      blocks.push({ type:"section", text:{ type:"mrkdwn", text:"📋 *募集要件:*\n" + m.jd_summary }});
    }

    blocks.push({ type:"section", text:{ type:"mrkdwn", text:"💬 *推薦理由:*\n" + m.recommendation }});
    blocks.push({ type:"section", text:{ type:"mrkdwn", text:"✅ " + (m.key_reasons||[]).join(" | ") }});

    if (m.risk_factors && m.risk_factors.length > 0 && m.risk_factors[0] !== "") {
      blocks.push({ type:"section", text:{ type:"mrkdwn", text:"⚠️ *懸念点:* " + m.risk_factors.join(" | ") }});
    }

    const actions = [];
    if (c && c.recruitUrl) actions.push({ type:"button", text:{ type:"plain_text", text:"📋 採用ページ", emoji:true }, url:c.recruitUrl, action_id:"r_"+m.company_id });
    if (actions.length) blocks.push({ type:"actions", elements:actions });
    if (i < matches.length-1) blocks.push({ type:"divider" });
  });

  blocks.push({ type:"divider" },{ type:"context", elements:[{ type:"mrkdwn", text:"🤖 _SEP Talent Matcher × Genesia Portfolio_ | Powered by Claude" }]});
  return blocks;
}

function formatPortfolioList(companies) {
  const blocks = [{ type:"header", text:{ type:"plain_text", text:"📊 ポートフォリオ一覧（" + companies.length + "社）", emoji:true }}];
  companies.forEach(c => {
    blocks.push({ type:"section", text:{ type:"mrkdwn", text:"*" + c.name + "* (" + c.nameEn + ")\n" + c.sector + " | " + c.stage + " | " + c.teamSize + " | CEO: " + c.ceo + "\n_" + c.summary + "_\n🔍 採用: " + c.hiringNeeds }});
  });
  return blocks;
}

function formatError(e) { return [{ type:"section", text:{ type:"mrkdwn", text:"⚠️ *エラー:* " + (e.message||e) + "\nもう一度お試しください。" }}]; }
function formatLoading() { return [{ type:"section", text:{ type:"mrkdwn", text:"⏳ *プロフィールを分析中...*\n_20〜30秒お待ちください_" }}]; }

module.exports = { formatMatchResult, formatPortfolioList, formatError, formatLoading };
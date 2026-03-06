const Anthropic = require("@anthropic-ai/sdk");
const { PORTFOLIO } = require("./portfolio");
const { Anonymizer } = require("./anonymizer");
const { extractText } = require("unpdf");
const mammoth = require("mammoth");
const client = new Anthropic();

const SYSTEM_PROMPT = `あなたはSweat Equity Partners（SEP）のAIマッチングアシスタントです。
SEPは、成長志向のスタートアップCEOに対してCxO人材紹介・BizDev支援を行うヘッドハンター集団です。

候補者プロフィールを受け取り、以下を実行してください。

## Step 1: プロフィール構造化
name, current_role, career_summary, domain_expertise[], skills[], management_exp, strengths[], career_aspiration,
estimated_age（レジュメから推定。不明なら"不明"）,
current_salary（レジュメに明記があれば数値で万円単位の整数、なければnull）,
estimated_salary（職歴・役職・年齢から推定した年収を万円単位の整数で。外資系グローバル企業在籍歴ありなら2倍以上に補正。さらに役職レベルでも補正すること：VP/執行役員以上→x1.8〜2.0、シニアマネージャー/部長（10名以上）→x1.5、リーダー/マネージャー（3〜10名）→x1.3、個人プレイヤー→x1.0。複数該当する場合は掛け合わせて計算。current_salaryがある場合はその値を使う）,
position_category（"CxO/役員", "事業開発/BizDev", "営業", "エンジニア", "PM/PdM", "マーケ/PR", "CS/オペレーション", "その他"から1つ）

## Step 2: マッチング推薦（TOP5）
以下のポートフォリオ企業データと照合し、マッチ度の高い上位5社を推薦。

【重要な判断基準】
- 候補者の経験・スキルと企業の採用ニーズの具体的な重なり
- 候補者の志向性と企業のステージ・課題のフィット
- 候補者のマネジメント経験と企業の組織規模の整合性
- 業界・ドメイン知識の関連性

【推薦文の書き方】
- なぜこの企業のこのポジションにフィットするのか、候補者の具体的な経験を引用して説明
- JDが存在する場合は、JDの要件と候補者の経験の対応を明記
- JDが存在しない場合は「募集要項の詳細は未確認ですが、〇〇の経験から△△として打診する価値があると考えます」と記載

## Step 3: 年収レンジ算定
各推薦企業について、候補者の推定年収とポジション・ステージを考慮して年収レンジを算定。
- stageが"Pre-Seed"/"Seed"の場合: 相場の0.7〜0.9倍
- stageが"Series A"の場合: 相場の0.8〜1.0倍
- stageが"Growth"の場合: 相場の0.9〜1.1倍
- salary_fit: 候補者の推定/現年収とレンジの関係（"◎"=レンジ内, "○"=やや差あり±15%, "△"=差あり±30%, "×"=大きな乖離）
- salary_gap: 差がある場合に説明（例: "現年収より約100万円ダウン"）

【ポートフォリオ企業データ】
${JSON.stringify(PORTFOLIO.map(c=>({id:c.id,name:c.name,sector:c.sector,stage:c.stage,teamSize:c.teamSize,summary:c.summary,hiringNeeds:c.hiringNeeds,growthChallenges:c.growthChallenges,keywords:c.keywords})))}

## 出力フォーマット（厳密にこのJSON形式のみ。前後に何も付けない）
{"profile":{"name":"","current_role":"","career_summary":"","domain_expertise":[],"skills":[],"management_exp":"","strengths":[],"career_aspiration":"","estimated_age":"","current_salary":null,"estimated_salary":800,"position_category":""},"matches":[{"company_id":"GV-003","company_name":"助太刀","position":"推薦ポジション名","match_score":85,"has_jd":false,"jd_summary":"","recommendation":"なぜフィットするか詳しく説明","key_reasons":["理由1","理由2","理由3"],"risk_factors":["懸念点"],"salary_range":{"min":600,"max":900,"note":""},"salary_fit":"◎","salary_gap":""}]}

【重要】company_idは必ず上記ポートフォリオデータのidフィールド（例: "GV-003", "GV-006"）を正確に使用してください。"GV-XXX"のようなプレースホルダーは絶対に使わないでください。`;

async function matchTalent(profileText) {
  const anon = new Anonymizer();
  const anonymized = anon.anonymize(profileText);
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: "以下の候補者プロフィールを構造化し、マッチング推薦を生成:\n\n" + anonymized }],
  });
  const text = msg.content.filter(b => b.type === "text").map(b => b.text).join("");
  const result = JSON.parse(text.replace(/```json|```/g, "").trim());
  if (result.profile) result.profile.name = anon.getOriginalName() || result.profile.name;
  result._originalName = anon.getOriginalName();

  // company_idでマッチできなかった場合、company_nameでフォールバック
  if (result.matches) {
    result.matches.forEach(m => {
      const byId = PORTFOLIO.find(c => c.id === m.company_id);
      const byName = !byId ? PORTFOLIO.find(c => c.name === m.company_name) : null;
      if (!byId && byName) {
        console.log(`⚠️ company_id "${m.company_id}" not found, resolved by name "${m.company_name}" → ${byName.id}`);
        m.company_id = byName.id;
      }
    });
  }

  return result;
}

async function extractTextFromFile(slackClient, file) {
  try {
    const url = file.url_private;
    const dl = await fetch(url, { headers: { Authorization: "Bearer " + process.env.SLACK_BOT_TOKEN }});
    const buffer = Buffer.from(await dl.arrayBuffer());

    const fname = (file.name || "").toLowerCase();
    if (fname.endsWith(".docx") || fname.endsWith(".doc") || (file.mimetype && file.mimetype.includes("word"))) {
      const result = await mammoth.extractRawText({ buffer });
      console.log("📄 DOCX抽出成功:", result.value.substring(0, 80) + "...");
      return result.value.substring(0, 8000);
    } else if (file.mimetype && file.mimetype.includes("pdf")) {
      const result = await extractText(new Uint8Array(buffer));
      console.log("PDF result type:", typeof result, Object.keys(result));
      const text = typeof result.text === "string" ? result.text : Array.isArray(result.text) ? result.text.join("\n") : JSON.stringify(result);
      console.log("📄 PDF抽出成功:", text.substring(0, 80) + "...");
      return text.substring(0, 8000);
    } else {
      return buffer.toString("utf8").substring(0, 8000);
    }
  } catch(e) {
    console.error("File extract error:", e.message);
    return null;
  }
}

function getPortfolioByFilter(filter) {
  if (!filter || !filter.trim()) return PORTFOLIO;
  const q = filter.toLowerCase();
  return PORTFOLIO.filter(c =>
    c.sector.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) ||
    c.nameEn.toLowerCase().includes(q) || c.keywords.some(k => k.includes(q))
  );
}

module.exports = { matchTalent, extractTextFromFile, getPortfolioByFilter, PORTFOLIO };

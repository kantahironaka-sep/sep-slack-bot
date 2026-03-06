const Anthropic = require("@anthropic-ai/sdk");
const { extractText } = require("unpdf");
const { Anonymizer } = require("./anonymizer");
const { PORTFOLIO } = require("./portfolio");

const client = new Anthropic();

const SALARY_TABLE = {
  "Pre-Seed": {
    "CxO/役員":          { min: 400,  max: 800,  note: "ストックオプション比率高" },
    "事業開発/BizDev":   { min: 400,  max: 600,  note: "" },
    "営業":              { min: 350,  max: 550,  note: "" },
    "エンジニア":        { min: 450,  max: 700,  note: "" },
    "PM/PdM":            { min: 450,  max: 650,  note: "" },
    "マーケ/PR":         { min: 350,  max: 550,  note: "" },
    "CS/オペレーション": { min: 300,  max: 500,  note: "" },
    "その他":            { min: 300,  max: 500,  note: "" },
  },
  "Seed": {
    "CxO/役員":          { min: 600,  max: 1000, note: "ストックオプション比率高" },
    "事業開発/BizDev":   { min: 500,  max: 700,  note: "" },
    "営業":              { min: 400,  max: 650,  note: "" },
    "エンジニア":        { min: 500,  max: 800,  note: "" },
    "PM/PdM":            { min: 500,  max: 750,  note: "" },
    "マーケ/PR":         { min: 400,  max: 650,  note: "" },
    "CS/オペレーション": { min: 350,  max: 550,  note: "" },
    "その他":            { min: 350,  max: 550,  note: "" },
  },
  "Pre-Series A": {
    "CxO/役員":          { min: 700,  max: 1200, note: "" },
    "事業開発/BizDev":   { min: 550,  max: 800,  note: "" },
    "営業":              { min: 450,  max: 700,  note: "" },
    "エンジニア":        { min: 550,  max: 850,  note: "" },
    "PM/PdM":            { min: 550,  max: 800,  note: "" },
    "マーケ/PR":         { min: 450,  max: 700,  note: "" },
    "CS/オペレーション": { min: 400,  max: 600,  note: "" },
    "その他":            { min: 400,  max: 600,  note: "" },
  },
  "Series A": {
    "CxO/役員":          { min: 800,  max: 1500, note: "" },
    "事業開発/BizDev":   { min: 600,  max: 900,  note: "" },
    "営業":              { min: 500,  max: 800,  note: "" },
    "エンジニア":        { min: 600,  max: 1000, note: "" },
    "PM/PdM":            { min: 600,  max: 900,  note: "" },
    "マーケ/PR":         { min: 500,  max: 800,  note: "" },
    "CS/オペレーション": { min: 450,  max: 700,  note: "" },
    "その他":            { min: 450,  max: 700,  note: "" },
  },
  "Series B": {
    "CxO/役員":          { min: 1000, max: 2000, note: "" },
    "事業開発/BizDev":   { min: 700,  max: 1100, note: "" },
    "営業":              { min: 550,  max: 900,  note: "" },
    "エンジニア":        { min: 700,  max: 1200, note: "" },
    "PM/PdM":            { min: 700,  max: 1100, note: "" },
    "マーケ/PR":         { min: 600,  max: 950,  note: "" },
    "CS/オペレーション": { min: 500,  max: 800,  note: "" },
    "その他":            { min: 500,  max: 800,  note: "" },
  },
  "Growth": {
    "CxO/役員":          { min: 1200, max: 2500, note: "" },
    "事業開発/BizDev":   { min: 700,  max: 1200, note: "" },
    "営業":              { min: 600,  max: 1000, note: "" },
    "エンジニア":        { min: 700,  max: 1300, note: "" },
    "PM/PdM":            { min: 700,  max: 1200, note: "" },
    "マーケ/PR":         { min: 600,  max: 1000, note: "" },
    "CS/オペレーション": { min: 500,  max: 800,  note: "" },
    "その他":            { min: 500,  max: 900,  note: "" },
  },
};

function getSalaryRange(stage, positionCategory) {
  const stageData = SALARY_TABLE[stage] || SALARY_TABLE["Seed"];
  return stageData[positionCategory] || stageData["その他"];
}

const SYSTEM_PROMPT = `あなたはSweat Equity Partners（SEP）のAIマッチングアシスタントです。
SEPは、成長志向のスタートアップCEOに対してCxO人材紹介・BizDev支援を行うヘッドハンター集団です。

候補者プロフィールを受け取り、以下を実行してください。

## Step 1: プロフィール構造化
name, current_role, career_summary, domain_expertise[], skills[], management_exp, strengths[], career_aspiration,
estimated_age（レジュメから推定。不明なら"不明"）,
current_salary（レジュメに明記があれば数値で万円単位の整数、なければnull）,
estimated_salary（職歴・役職・年齢から推定した年収を万円単位の整数で。フェルミ推定で算出。current_salaryがある場合はその値を使う）,
position_category（以下から1つ選ぶ: "CxO/役員", "事業開発/BizDev", "営業", "エンジニア", "PM/PdM", "マーケ/PR", "CS/オペレーション", "その他"）

## Step 2: マッチング推薦（TOP3）
以下のポートフォリオ企業データと照合し、マッチ度の高い上位3社を推薦。

【重要な判断基準】
- 候補者の経験・スキルと企業の採用ニーズの具体的な重なり
- 候補者の志向性と企業のステージ・課題のフィット
- 候補者のマネジメント経験と企業の組織規模の整合性
- 業界・ドメイン知識の関連性
- 年収フィット度（企業の想定年収レンジと候補者の推定年収の乖離）

【推薦文の書き方】
- なぜこの企業のこのポジションにフィットするのか、候補者の具体的な経験を引用して説明
- JDが存在する場合は、JDの要件と候補者の経験の対応を明記
- JDが存在しない場合は「募集要項の詳細は未確認ですが、〇〇の経験から△△として打診する価値があると考えます」と記載

【ポートフォリオ企業データ】
${JSON.stringify(PORTFOLIO.map(c=>({id:c.id,name:c.name,sector:c.sector,stage:c.stage,teamSize:c.teamSize,summary:c.summary,hiringNeeds:c.hiringNeeds,growthChallenges:c.growthChallenges,keywords:c.keywords})))}

## 出力フォーマット（厳密にこのJSON形式のみ。前後に何も付けない）
{"profile":{"name":"","current_role":"","career_summary":"","domain_expertise":[],"skills":[],"management_exp":"","strengths":[],"career_aspiration":"","estimated_age":"","current_salary":null,"estimated_salary":600,"position_category":"事業開発/BizDev"},"matches":[{"company_id":"GV-XXX","company_name":"","stage":"","position":"推薦ポジション名","position_category":"事業開発/BizDev","match_score":85,"has_jd":false,"jd_summary":"","recommendation":"なぜフィットするか詳しく説明","key_reasons":["理由1","理由2","理由3"],"risk_factors":["懸念点"]}]}`;

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

  if (result.matches) {
    result.matches = result.matches.map(match => {
      const company = PORTFOLIO.find(c => c.id === match.company_id);
      const stage = company ? company.stage : "Seed";
      const posCategory = match.position_category || result.profile.position_category || "その他";
      const salaryRange = getSalaryRange(stage, posCategory);
      const candidateSalary = result.profile.current_salary || result.profile.estimated_salary;

      let salaryFit = "◎";
      let salaryGap = "";
      if (candidateSalary) {
        const mid = (salaryRange.min + salaryRange.max) / 2;
        const diff = ((candidateSalary - mid) / mid) * 100;
        if (Math.abs(diff) <= 20) {
          salaryFit = "◎";
          salaryGap = "レンジ内";
        } else if (diff > 20 && diff <= 50) {
          salaryFit = "△";
          salaryGap = `候補者が約${Math.round(diff)}%高め`;
        } else if (diff > 50) {
          salaryFit = "×";
          salaryGap = `候補者が約${Math.round(diff)}%高め（要交渉）`;
        } else if (diff < -20 && diff >= -50) {
          salaryFit = "○";
          salaryGap = `約${Math.round(Math.abs(diff))}%の年収アップ可能性`;
        } else {
          salaryFit = "◎";
          salaryGap = `約${Math.round(Math.abs(diff))}%の年収アップ可能性`;
        }
      }

      return {
        ...match,
        salary_range: salaryRange,
        salary_fit: salaryFit,
        salary_gap: salaryGap,
        candidate_salary: candidateSalary,
      };
    });
  }

  return result;
}

async function extractTextFromFile(slackClient, file) {
  try {
    const url = file.url_private;
    const dl = await fetch(url, { headers: { Authorization: "Bearer " + process.env.SLACK_BOT_TOKEN }});
    const buffer = Buffer.from(await dl.arrayBuffer());

    if (file.mimetype && file.mimetype.includes("pdf")) {
      const result = await extractText(new Uint8Array(buffer));
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

module.exports = { matchTalent, extractTextFromFile, getPortfolioByFilter, PORTFOLIO, getSalaryRange };
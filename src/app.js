require("dotenv").config();
const { App } = require("@slack/bolt");
const { matchTalent, extractTextFromFile, getPortfolioByFilter } = require("./matcher");
const { findJobUrls } = require("./job-finder");
const { formatMatchResult, formatPortfolioList, formatError, formatLoading } = require("./formatter");

const ALLOWED_USERS = (process.env.ALLOWED_USERS || "").split(",").map(s => s.trim()).filter(Boolean);
const RESULT_CHANNEL = process.env.RESULT_CHANNEL || "";
const WATCH_CHANNELS = (process.env.WATCH_CHANNELS || "").split(",").map(s => s.trim()).filter(Boolean);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

function isAllowed(userId) {
  if (ALLOWED_USERS.length === 0) return true;
  return ALLOWED_USERS.includes(userId);
}

function isResumeFile(filename) {
  if (!filename) return false;
  const f = filename.toLowerCase();
  // docx/pdf以外は無視
  if (!f.endsWith(".pdf") && !f.endsWith(".docx") && !f.endsWith(".doc")) return false;
  // pdf/docxなら基本的に全部通す（ファイル名の判定は緩く）
  // 人名っぽいパターン（姓名の組み合わせ、アルファベット2単語以上）
  const namePattern = /^[a-z]+([-_\s][a-z]+){1,3}\.(pdf|docx|doc)$/i;
  const jpNamePattern = /^[一-龥ぁ-んァ-ン]{2,6}[\s_\-]?[一-龥ぁ-んァ-ン]{1,4}/;
  if (namePattern.test(filename) || jpNamePattern.test(filename)) return true;
  // docx/docは基本的にレジュメとして扱う
  if (f.endsWith(".docx") || f.endsWith(".doc")) return true;
  return f.includes("cv") || f.includes("職務経歴書") || f.includes("レジュメ") || f.includes("経歴") || f.includes("履歴書") || f.includes("resume");
}

function formatTimestamp(ts) {
  const date = new Date(parseFloat(ts) * 1000);
  const y = date.getFullYear();
  const mo = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  const h = String(date.getHours()).padStart(2,"0");
  const mi = String(date.getMinutes()).padStart(2,"0");
  return y + "/" + mo + "/" + d + " " + h + ":" + mi;
}

async function getMessageLink(client, channel, ts) {
  try {
    const res = await client.chat.getPermalink({ channel, message_ts: ts });
    return res.permalink;
  } catch(e) { return null; }
}

// === /match コマンド ===
app.command("/match", async ({ command, ack, client }) => {
  await ack();
  if (!isAllowed(command.user_id)) {
    await client.chat.postEphemeral({ channel:command.channel_id, user:command.user_id, text:"⛔ 利用権限がありません。" });
    return;
  }
  const text = command.text?.trim();
  if (!text) {
    await client.chat.postEphemeral({ channel:command.channel_id, user:command.user_id, text:"使い方: /match 田中太郎 38歳 リクルートPM 製造業DX COO志望" });
    return;
  }
  await client.chat.postEphemeral({ channel:command.channel_id, user:command.user_id, text:"⏳ マッチング中...結果はDMでお送りします。" });
  const dm = await client.conversations.open({ users:command.user_id });
  const lm = await client.chat.postMessage({ channel:dm.channel.id, blocks:formatLoading(), text:"マッチング中..." });
  try {
    const result = await matchTalent(text);
    const jobLinks = await findJobUrls(result.matches || []);
    await client.chat.update({ channel:dm.channel.id, ts:lm.ts, blocks:formatMatchResult(result, jobLinks), text:"マッチング結果" });
    if (RESULT_CHANNEL) await postToResultChannel(client, result, jobLinks, command.user_id, "コマンド");
  } catch(e) { console.error(e); await client.chat.update({ channel:dm.channel.id, ts:lm.ts, blocks:formatError(e), text:"エラー" }); }
});

// === /portfolio コマンド ===
app.command("/portfolio", async ({ command, ack, respond }) => {
  await ack();
  if (!isAllowed(command.user_id)) { await respond({ response_type:"ephemeral", text:"⛔ 利用権限がありません。" }); return; }
  const companies = getPortfolioByFilter(command.text?.trim());
  if (!companies.length) { await respond({ response_type:"ephemeral", text:"該当企業なし" }); return; }
  await respond({ response_type:"ephemeral", blocks:formatPortfolioList(companies), text:"ポートフォリオ一覧" });
});

// === メッセージ監視 ===
app.event("message", async ({ event, client }) => {
  if (event.bot_id) return;
  if (!event.user) return;
  if (event.subtype && event.subtype !== "file_share") return;

  // DM対応
  if (event.channel_type === "im") {
    if (!isAllowed(event.user)) return;
    const text = event.text?.trim();
    if (!text || text.length < 10) {
      await client.chat.postMessage({ channel:event.channel, text:"候補者プロフィールを貼り付けてください！🔒" });
      return;
    }
    const lm = await client.chat.postMessage({ channel:event.channel, blocks:formatLoading(), text:"マッチング中..." });
    try {
      const result = await matchTalent(text);
      const jobLinks = await findJobUrls(result.matches || []);
      await client.chat.update({ channel:event.channel, ts:lm.ts, blocks:formatMatchResult(result, jobLinks), text:"マッチング結果" });
      if (RESULT_CHANNEL) await postToResultChannel(client, result, jobLinks, event.user, "DM");
    } catch(e) { console.error(e); await client.chat.update({ channel:event.channel, ts:lm.ts, blocks:formatError(e), text:"エラー" }); }
    return;
  }

  // 監視チャンネル — ファイル名でレジュメ判定
  if (!WATCH_CHANNELS.includes(event.channel)) return;
  

  const resumeFiles = (event.files || []).filter(f => isResumeFile(f.name));
  const textTriggers = ["ご相談","候補者","紹介","レジュメ","経歴","CV","resume"];
  const hasTextTrigger = event.text && textTriggers.some(t => event.text.includes(t));
  if (resumeFiles.length === 0 && !hasTextTrigger) {
    console.log("⏭️ レジュメファイルではなさそう:", event.files.map(f=>f.name).join(", "));
    return;
  }

  console.log("🎯 レジュメファイル検出:", resumeFiles.map(f=>f.name).join(", "));

  try {
    await client.reactions.add({ channel:event.channel, name:"white_check_mark", timestamp:event.ts });

    let profileText = event.text || "";
    for (const file of resumeFiles) {
      console.log("📎 ファイル読み取り中:", file.name);
      const fileText = await extractTextFromFile(client, file);
      if (fileText) {
        profileText += "\n\n" + fileText;
        console.log("📄 テキスト抽出成功:", fileText.substring(0, 80) + "...");
      } else {
        console.log("⚠️ テキスト抽出失敗:", file.name);
      }
    }

    if (profileText.trim().length < 30) {
      console.log("⚠️ テキストが短すぎてマッチング不可");
      return;
    }

    console.log("🔄 マッチング開始...");
    const result = await matchTalent(profileText);
    const permalink = await getMessageLink(client, event.channel, event.ts);
    const timestamp = formatTimestamp(event.ts);

    if (RESULT_CHANNEL) {
      let senderName = event.user;
      try {
        const userInfo = await client.users.info({ user:event.user });
        senderName = userInfo.user?.real_name || userInfo.user?.name || event.user;
      } catch(e) {}

      const jobLinks = await findJobUrls(result.matches || []);
      const headerMsg = await client.chat.postMessage({
        channel: RESULT_CHANNEL,
        blocks: [
          { type:"header", text:{ type:"plain_text", text:"🔔 新規レジュメ検出 - 自動マッチング", emoji:true }},
          { type:"section", text:{ type:"mrkdwn", text:
            "━━━━━━━━━━━━━━━━\n" +
            "📩 *送信者:* " + senderName + "\n" +
            "🕐 *受信日時:* " + timestamp + "\n" +
            "🔗 *元投稿:* " + (permalink ? "<" + permalink + "|スレッドを開く>" : "N/A") +
            "\n📎 *添付:* " + resumeFiles.map(f=>f.name).join(", ") +
            "\n👤 *候補者:* " + (result.profile?.name || "候補者X") +
            "\n📋 *マッチ数:* " + (result.matches?.length || 0) + "社" +
            "\n━━━━━━━━━━━━━━━━\n_⬇️ マッチング結果はスレッドを確認_"
          }},
        ],
        text: "新規レジュメ: " + (result.profile?.name || "候補者X"),
      });
      await client.chat.postMessage({
        channel: RESULT_CHANNEL,
        thread_ts: headerMsg.ts,
        blocks: formatMatchResult(result, jobLinks),
        text: "マッチング結果: " + (result.profile?.name || "候補者X"),
      });
      console.log("✅ 結果チャンネルに投稿完了");
    }
  } catch(e) {
    console.error("❌ マッチングエラー:", e);
  }
});

// === @メンション対応 ===
app.event("app_mention", async ({ event, client }) => {
  if (!isAllowed(event.user)) {
    await client.chat.postMessage({ channel:event.channel, thread_ts:event.ts, text:"⛔ 利用権限がありません。" });
    return;
  }
  const text = event.text.replace(/<@[A-Z0-9]+>/g,"").trim();
  if (!text || text.length < 10) {
    await client.chat.postMessage({ channel:event.channel, thread_ts:event.ts, text:"候補者のプロフィールを教えてください！🔒" });
    return;
  }
  await client.chat.postMessage({ channel:event.channel, thread_ts:event.ts, text:"⏳ マッチング中...結果はDMでお送りします。" });
  const dm = await client.conversations.open({ users:event.user });
  const lm = await client.chat.postMessage({ channel:dm.channel.id, blocks:formatLoading(), text:"マッチング中..." });
  try {
    const result = await matchTalent(text);
    const jobLinks = await findJobUrls(result.matches || []);
    await client.chat.update({ channel:dm.channel.id, ts:lm.ts, blocks:formatMatchResult(result, jobLinks), text:"マッチング結果" });
    if (RESULT_CHANNEL) await postToResultChannel(client, result, jobLinks, event.user, "メンション");
  } catch(e) { console.error(e); await client.chat.update({ channel:dm.channel.id, ts:lm.ts, blocks:formatError(e), text:"エラー" }); }
});

async function postToResultChannel(client, result, jobLinks, userId, source) {
  try {
    const userInfo = await client.users.info({ user:userId });
    const userName = userInfo.user?.real_name || userId;
    await client.chat.postMessage({
      channel: RESULT_CHANNEL,
      blocks: [
        { type:"section", text:{ type:"mrkdwn", text:"📋 *マッチング実行* by " + userName + " (" + source + ")" }},
        { type:"divider" },
        ...formatMatchResult(result, jobLinks),
      ],
      text: "マッチング結果: " + (result.profile?.name || "候補者X"),
    });
  } catch(e) { console.error("Result channel error:", e); }
}

app.action(/^r_/, async ({ ack }) => { await ack(); });

(async () => {
  await app.start();
  console.log("⚡ SEP Talent Matcher Bot is running!");
  console.log("🔒 許可ユーザー:", ALLOWED_USERS.length ? ALLOWED_USERS.join(", ") : "全員");
  console.log("📢 結果チャンネル:", RESULT_CHANNEL || "未設定");
  console.log("👀 監視チャンネル:", WATCH_CHANNELS.length ? WATCH_CHANNELS.join(", ") : "未設定");
  console.log("📄 トリガー: ファイル名にCV/職務経歴書/レジュメ/経歴/履歴書/resumeを含むPDF");
})();

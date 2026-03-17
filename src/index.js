import { json, text, parseTimeRange, parseInvite } from "./utils.js";
import { verifyDiscordRequest, followupToDiscord } from "./discord.js";
import { getGoogleAccessToken, createCalendarMeetEvent } from "./google.js";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return text("POST only", 405);

    // Verify Discord signature
    let verified = false;
    try {
      verified = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);
    } catch (e) {
      return text("Bad signature format", 401);
    }
    if (!verified) return text("Invalid signature", 401);

    const payload = await request.json();

    // 1 = PING (Discord uses this to validate endpoint)
    if (payload.type === 1) {
      return json({ type: 1 });
    }

    const data = payload.data;

    // Only handle /meet
    if (!data || data.name !== "meet") {
      return json({ type: 4, data: { content: "Unknown command." } });
    }

    // Parse options (A: parameterized)
    const opts = Object.fromEntries((data.options || []).map((o) => [o.name, o.value]));
    const date = (opts.date || "").trim();
    const time = (opts.time || "").trim();
    const title = (opts.title || "").trim();
    const invite = (opts.invite || "").trim();
    const locationOpt = (opts.location || "").trim();
    const descriptionOpt = (opts.description || "").trim();

    // Respond immediately to avoid 3s timeout (5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE)
    ctx.waitUntil(
      (async () => {
        try {
          if (!date || !time) throw new Error("date / time 必填");

          const { start, end } = parseTimeRange(date, time);

          const defaultTitle = env.DEFAULT_TITLE || "小組會議";
          const defaultInvite = (env.DEFAULT_INVITE || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const defaultLocation = env.DEFAULT_LOCATION || "204會議室";

          const summary = title || defaultTitle;
          const invites = parseInvite(invite, defaultInvite);

          if (!invites.length) {
            throw new Error("沒有邀請名單：請設定 DEFAULT_INVITE 或指令帶 invite");
          }

          const finalLocation = locationOpt || defaultLocation;
          const finalDescription = descriptionOpt || ""; // no default, keep blank

          const accessToken = await getGoogleAccessToken(env);
          const result = await createCalendarMeetEvent(env, accessToken, {
            summary,
            invites,
            start,
            end,
            location: finalLocation,
            description: finalDescription,
          });

          const msg =
            `✅ 已建立：**${result.summary}**\n` +
            `🕒 ${result.start} ~ ${result.end} (${env.TZ || "Asia/Taipei"})\n` +
            `📍 地點：${finalLocation}\n` +
            `📝 說明：${finalDescription ? finalDescription : "（空白）"}\n` +
            `🔗 Meet：${result.meetLink || "（未取得，請點 Event 查看）"}\n` +
            `📅 Event：${result.eventLink}`;

          await followupToDiscord(env, payload.token, msg);
        } catch (e) {
          await followupToDiscord(env, payload.token, `❌ 建立失敗：${e?.message || String(e)}`);
        }
      })()
    );

    return json({ type: 5 });
  },
};

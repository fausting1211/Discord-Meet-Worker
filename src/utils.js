export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function text(msg, status = 200) {
  return new Response(msg, { status });
}

export function parseTimeRange(dateStr, timeRange) {
  const m = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec((timeRange || "").trim());
  if (!m) throw new Error("time 格式請用 HH:MM-HH:MM，例如 10:00-11:00");

  const start = `${dateStr}T${m[1]}:00`;
  const end = `${dateStr}T${m[2]}:00`;

  if (end <= start) throw new Error("time 結束時間必須大於開始時間");

  return { start, end };
}

export function parseInvite(inviteStr, fallbackArr) {
  const arr = (inviteStr || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : fallbackArr;
}

export async function getGoogleAccessToken(env) {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const t = await resp.text();
  if (!resp.ok) throw new Error(`Google token refresh failed: ${t}`);

  const data = JSON.parse(t);
  if (!data.access_token) throw new Error("Google token response missing access_token");
  return data.access_token;
}

export async function createCalendarMeetEvent(env, accessToken, { summary, invites, start, end, location, description }) {
  const tz = env.TZ || "Asia/Taipei";
  const calendarId = env.CALENDAR_ID || "primary";

  const body = {
    summary,
    location: location || undefined, // empty -> omit
    description: description || "",  // empty -> blank
    start: { dateTime: start, timeZone: tz },
    end: { dateTime: end, timeZone: tz },
    attendees: invites.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?conferenceDataVersion=1&sendUpdates=all`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const txt = await resp.text();
  if (!resp.ok) throw new Error(`Google Calendar create failed: ${txt}`);

  const data = JSON.parse(txt);

  // Prefer hangoutLink, fallback to conference entryPoints
  let meetLink = data.hangoutLink;
  if (!meetLink) {
    const ep = data.conferenceData?.entryPoints?.find((x) => x.entryPointType === "video" && x.uri);
    meetLink = ep?.uri;
  }

  return {
    summary: data.summary,
    start: data.start?.dateTime,
    end: data.end?.dateTime,
    location: data.location || location || "",
    meetLink,
    eventLink: data.htmlLink,
  };
}

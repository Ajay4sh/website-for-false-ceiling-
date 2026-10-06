// Google Calendar via a service account: the client shares their calendar with the
// service account's email, and bookings appear there automatically.

import crypto from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3/calendars";

export function createCalendar({ serviceAccount, fetchImpl = fetch, now = () => Date.now() }) {
  const { client_email: email, private_key: privateKey } = serviceAccount;
  const tokenUri = serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token";
  if (!email || !privateKey) throw new Error("Service account JSON needs client_email and private_key");
  let cached = null;

  async function accessToken() {
    if (cached && cached.expiresAt - 60_000 > now()) return cached.token;
    const iat = Math.floor(now() / 1000);
    const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: email, scope: SCOPE, aud: tokenUri, iat, exp: iat + 3600 })}`;
    const signature = crypto.sign("sha256", Buffer.from(unsigned), privateKey).toString("base64url");
    const res = await fetchImpl(tokenUri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    });
    if (!res.ok) throw new Error(`Google sign-in failed (${res.status})`);
    const body = await res.json();
    cached = { token: body.access_token, expiresAt: now() + body.expires_in * 1000 };
    return cached.token;
  }

  async function call(method, url, body) {
    const res = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  }

  return {
    email,
    async createEvent(calendarId, { summary, description, start, end }) {
      const res = await call("POST", `${API}/${encodeURIComponent(calendarId)}/events`, {
        summary,
        description,
        start: { dateTime: start },
        end: { dateTime: end },
      });
      if (!res.ok) throw new Error(`Calendar event failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
      return (await res.json()).id;
    },
    async deleteEvent(calendarId, eventId) {
      const res = await call("DELETE", `${API}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
      if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Calendar delete failed (${res.status})`);
    },
  };
}

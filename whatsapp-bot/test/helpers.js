// Test harness: a real app on a random port with an in-memory database,
// a scripted Claude, and fake WhatsApp/Google endpoints that record every call.

import crypto from "node:crypto";
import fs from "node:fs";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import { createAuth } from "../src/dashboard/auth.js";
import { openDb } from "../src/db.js";
import { DEFAULT_SETTINGS } from "../src/profile.js";
import { createCipher, hashPassword } from "../src/security.js";
import { createServices } from "../src/services.js";

export const business = JSON.parse(fs.readFileSync(new URL("../businesses/ceilcraft.json", import.meta.url)));
export const APP_SECRET = "test-app-secret";
export const PASSWORD = "correct horse battery";

export const say = (text) => ({ stop_reason: "end_turn", content: [{ type: "text", text }] });
export const toolUse = (id, name, input) => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id, name, input }] });

export function fakeAnthropic(responses = []) {
  const requests = [];
  return {
    requests,
    responses,
    beta: {
      messages: {
        create: async (params) => {
          requests.push(structuredClone(params));
          return responses.shift() ?? say("Namaste! Main aapki kya madad kar sakta hoon?");
        },
      },
    },
  };
}

// Records every outgoing request and answers like the real services would.
export function fakeFetch() {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const body = options.body && typeof options.body === "string" ? JSON.parse(options.body) : options.body;
    calls.push({ url: String(url), method: options.method ?? "GET", body, headers: options.headers });
    const json = (data, status = 200) => ({ ok: status < 300, status, json: async () => data, text: async () => JSON.stringify(data), arrayBuffer: async () => new ArrayBuffer(0) });
    if (String(url).endsWith("/messages")) return json({ messages: [{ id: "wamid.x" }] });
    if (String(url).startsWith("https://lookaside.example/")) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from("fake-jpeg-bytes") };
    if (String(url).includes("graph.facebook.com")) return json({ url: "https://lookaside.example/img", mime_type: "image/jpeg", file_size: 15 });
    return json({}, 404);
  };
  return { calls, fetchImpl, messages: () => calls.filter((c) => c.url.endsWith("/messages")).map((c) => ({ ...c.body, phoneNumberId: c.url.split("/").at(-2) })) };
}

export async function startTestApp({ responses = [], now: initialNow = "2026-10-06T05:30:00Z" } = {}) {
  let clock = new Date(initialNow);
  const now = () => clock;
  const db = openDb();
  const cipher = createCipher(crypto.randomBytes(32).toString("base64"));
  const anthropic = fakeAnthropic(responses);
  const fetcher = fakeFetch();
  const calendarCalls = [];
  const calendar = {
    email: "bookbot@project.iam.gserviceaccount.com",
    createEvent: async (...args) => (calendarCalls.push(["create", ...args]), "evt-1"),
    deleteEvent: async (...args) => calendarCalls.push(["delete", ...args]),
  };
  const services = createServices({
    db,
    cipher,
    anthropic,
    calendar,
    whatsappDefaults: { token: "default-token", apiVersion: "v23.0" },
    fetchImpl: fetcher.fetchImpl,
    now,
  });
  const auth = createAuth({ db, secureCookies: false, now: () => clock.getTime() });
  const config = {
    productName: "BookBot",
    publicUrl: "https://bot.example.com",
    secureCookies: false,
    trustProxy: false,
    whatsapp: { verifyToken: "verify-word", appSecret: APP_SECRET },
  };
  const app = createApp({ db, services, auth, cipher, config, now });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;

  const settings = (extra = {}) => ({ ...DEFAULT_SETTINGS, ownerWhatsapp: "919000000001", missedCall: { token: "hooktoken123", callerField: "CallFrom" }, ...extra });
  const clientA = db.createClient({ slug: "a", name: "Alpha Ceilings", profile: { ...business, name: "Alpha Ceilings" }, settings: settings(), waPhoneNumberId: "100100100100100" });
  const clientB = db.createClient({ slug: "b", name: "Beta Dental", profile: { ...business, name: "Beta Dental" }, settings: settings({ ownerWhatsapp: "919000000002" }), waPhoneNumberId: "200200200200200" });
  const hash = hashPassword(PASSWORD);
  db.createUser({ email: "admin@example.com", name: "Admin", passwordHash: hash, role: "admin" });
  db.createUser({ email: "a@example.com", name: "Owner A", passwordHash: hash, role: "owner", clientId: clientA });
  db.createUser({ email: "b@example.com", name: "Owner B", passwordHash: hash, role: "owner", clientId: clientB });

  return {
    db,
    base,
    services,
    anthropic,
    fetcher,
    calendarCalls,
    clientA,
    clientB,
    setClock: (iso) => (clock = new Date(iso)),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// A signed-in browser: keeps the session cookie and the page's CSRF token.
export async function signIn(base, email, password = PASSWORD) {
  const res = await fetch(`${base}/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
  });
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`Sign-in failed for ${email}: ${res.status}`);
  let csrf = null;

  const browser = {
    cookie,
    async get(path) {
      const r = await fetch(`${base}${path}`, { redirect: "manual", headers: { cookie } });
      const text = await r.text();
      csrf = text.match(/name="_csrf" value="([^"]+)"/)?.[1] ?? csrf;
      return { status: r.status, text, headers: r.headers };
    },
    async post(path, form = {}, { withCsrf = true } = {}) {
      if (withCsrf && !csrf) await browser.get("/account");
      const body = new URLSearchParams(withCsrf ? { _csrf: csrf, ...form } : form);
      const r = await fetch(`${base}${path}`, { method: "POST", redirect: "manual", headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" }, body });
      return { status: r.status, text: await r.text(), location: r.headers.get("location") };
    },
  };
  return browser;
}

export function signedWebhook(base, payload) {
  const body = JSON.stringify(payload);
  const signature = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex");
  return fetch(`${base}/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature }, body });
}

export const textMessage = (phoneNumberId, from, text, id = crypto.randomUUID()) => ({
  entry: [{ changes: [{ value: { metadata: { phone_number_id: phoneNumberId }, messages: [{ id, from, type: "text", text: { body: text } }] } }] }],
});

// Wait until background work (webhook handling happens after the 200 reply) settles.
export async function eventually(check, timeoutMs = 2000) {
  const start = Date.now();
  while (true) {
    try {
      return await check();
    } catch (err) {
      if (Date.now() - start > timeoutMs) throw err;
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

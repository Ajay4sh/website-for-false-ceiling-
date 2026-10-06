import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createCalendar } from "../src/calendar.js";
import { html } from "../src/dashboard/html.js";
import { validateProfile, validateSettings, DEFAULT_SETTINGS } from "../src/profile.js";
import { createCipher, createRateLimiter, hashPassword, verifyPassword } from "../src/security.js";

test("passwords are salted and verified", () => {
  const a = hashPassword("a long password");
  assert.notEqual(a, hashPassword("a long password"));
  assert.equal(verifyPassword("a long password", a), true);
  assert.equal(verifyPassword("wrong", a), false);
  assert.equal(verifyPassword("x", "garbage"), false);
});

test("secrets round-trip and tampering is detected", () => {
  const cipher = createCipher(crypto.randomBytes(32).toString("base64"));
  const stored = cipher.encrypt("EAAG-token");
  assert.equal(cipher.decrypt(stored), "EAAG-token");
  const parts = stored.split(":");
  parts[3] = Buffer.from("tampered").toString("base64");
  assert.throws(() => cipher.decrypt(parts.join(":")));
  assert.throws(() => createCipher("too-short"));
});

test("rate limiter blocks after the limit within the window", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(limiter.tooMany("k", 0), false);
  assert.equal(limiter.tooMany("k", 10), false);
  assert.equal(limiter.tooMany("k", 20), true);
  assert.equal(limiter.tooMany("k", 2000), false); // new window
});

test("html escapes values unless explicitly raw", () => {
  assert.equal(String(html`<p>${'<img src=x onerror="x">'}</p>`), "<p>&lt;img src=x onerror=&quot;x&quot;&gt;</p>");
  assert.equal(String(html`<ul>${["<a>", "b"].map((x) => html`<li>${x}</li>`)}</ul>`), "<ul><li>&lt;a&gt;</li><li>b</li></ul>");
});

test("profile validation explains problems and accepts the example", () => {
  const example = JSON.parse(fs.readFileSync(new URL("../businesses/ceilcraft.json", import.meta.url)));
  assert.equal(validateProfile(example).ok, true);
  const bad = validateProfile({ ...example, booking: { ...example.booking, workingDays: [9], slotMinutes: 5 } });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes("workingDays")));
  assert.ok(bad.errors.some((e) => e.includes("slotMinutes")));
});

test("settings validation rejects bad template names and phone numbers", () => {
  assert.equal(validateSettings(DEFAULT_SETTINGS).ok, true);
  const bad = validateSettings({ ...DEFAULT_SETTINGS, ownerWhatsapp: "+91 abc", templates: { reminder: { name: "Bad Name!", language: "hi" } } });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 2);
});

test("calendar signs in with a service account JWT and creates an event", async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("oauth2")) return { ok: true, json: async () => ({ access_token: "ya29.token", expires_in: 3600 }) };
    return { ok: true, json: async () => ({ id: "event-123" }) };
  };
  const calendar = createCalendar({
    serviceAccount: { client_email: "bot@p.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) },
    fetchImpl,
    now: () => 1_790_000_000_000,
  });

  const id = await calendar.createEvent("owner@gmail.com", { summary: "Visit", description: "d", start: "2026-10-07T11:00:00+05:30", end: "2026-10-07T12:00:00+05:30" });
  await calendar.createEvent("owner@gmail.com", { summary: "Visit 2", description: "d", start: "2026-10-07T12:00:00+05:30", end: "2026-10-07T13:00:00+05:30" });

  assert.equal(id, "event-123");
  assert.equal(calls.filter((c) => c.url.includes("oauth2")).length, 1); // token reused
  const assertion = new URLSearchParams(calls[0].options.body.toString()).get("assertion");
  const [header, claims, signature] = assertion.split(".");
  assert.ok(crypto.verify("sha256", Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, "base64url")));
  assert.equal(JSON.parse(Buffer.from(claims, "base64url")).scope, "https://www.googleapis.com/auth/calendar.events");
  assert.equal(calls[1].url, "https://www.googleapis.com/calendar/v3/calendars/owner%40gmail.com/events");
  assert.equal(calls[1].options.headers.Authorization, "Bearer ya29.token");
});

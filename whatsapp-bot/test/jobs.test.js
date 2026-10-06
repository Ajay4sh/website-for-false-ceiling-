import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { applyRetention, sendDueReminders } from "../src/jobs.js";
import { startTestApp } from "./helpers.js";

let t;
beforeEach(async () => (t = await startTestApp()));
afterEach(() => t.close());

const withReminderTemplate = (clientId) => {
  t.db.updateClient(clientId, { settings: { ...t.db.getClient(clientId).settings, templates: { reminder: { name: "visit_reminder", language: "hi" } } } });
  t.services.invalidate(clientId);
};
const book = (clientId, extra = {}) =>
  t.db.addBooking(clientId, { phone: "919811177777", customer_name: "Sunita", date: "2026-10-08", time: "11:00", address: "x", service_interest: "y", ...extra }, new Date("2026-10-06T05:30:00Z").getTime());

test("a reminder goes out once, 24 hours before, with the five template values", async () => {
  withReminderTemplate(t.clientA);
  const id = book(t.clientA);
  const run = (iso) => sendDueReminders({ db: t.db, services: t.services, now: () => new Date(iso) });

  assert.equal(await run("2026-10-07T05:00:00Z"), 0); // 10:30 IST the day before: too early
  assert.equal(await run("2026-10-07T05:31:00Z"), 1); // 11:01 IST the day before
  assert.equal(await run("2026-10-07T06:00:00Z"), 0); // never twice

  const [msg] = t.fetcher.messages();
  assert.equal(msg.to, "919811177777");
  assert.equal(msg.template.name, "visit_reminder");
  assert.deepEqual(msg.template.components[0].parameters.map((p) => p.text), ["Sunita", "Alpha Ceilings", "free site visit and measurement", "Thu, 8 Oct", "11:00 AM"]);
  assert.ok(t.db.getBooking(t.clientA, id).reminder_sent_at > 0);
});

test("no reminder without a template, for opted-out customers, or for last-minute bookings", async () => {
  const noTemplate = book(t.clientB);
  withReminderTemplate(t.clientA);
  t.db.setOptedOut(t.clientA, "919811188888", true);
  const optedOut = book(t.clientA, { phone: "919811188888" });
  const lastMinute = t.db.addBooking(t.clientA, { phone: "919811199999", customer_name: "Late", date: "2026-10-08", time: "11:00", address: "x", service_interest: "y" }, new Date("2026-10-08T02:00:00Z").getTime());

  const sent = await sendDueReminders({ db: t.db, services: t.services, now: () => new Date("2026-10-08T03:00:00Z") });
  assert.equal(sent, 0);
  assert.equal(t.fetcher.messages().length, 0);
  for (const [clientId, id] of [[t.clientB, noTemplate], [t.clientA, optedOut], [t.clientA, lastMinute]]) {
    assert.equal(t.db.getBooking(clientId, id).reminder_sent_at, 0);
  }
});

test("retention deletes old chats and records but keeps recent and upcoming ones", () => {
  const day = 86_400_000;
  const now = new Date("2027-06-01T00:00:00Z");
  t.db.saveConversation(t.clientA, "911111111111", { messages: [{ role: "user", content: "old" }], updatedAt: now - 200 * day, pausedUntil: 0 });
  t.db.saveConversation(t.clientA, "912222222222", { messages: [{ role: "user", content: "new" }], updatedAt: now - 10 * day, pausedUntil: 0 });
  t.db.upsertLead(t.clientA, "913333333333", { customer_name: "Old lead" }, "whatsapp", now - 800 * day);
  t.db.upsertLead(t.clientA, "914444444444", { customer_name: "New lead" }, "whatsapp", now - 5 * day);

  const removed = applyRetention({ db: t.db, now: () => now });
  assert.equal(removed.conversations, 1);
  assert.equal(removed.leads, 1);
  assert.equal(t.db.getConversation(t.clientA, "911111111111").messages.length, 0);
  assert.equal(t.db.getConversation(t.clientA, "912222222222").messages.length, 1);
  assert.deepEqual(t.db.listLeads(t.clientA).map((l) => l.customer_name), ["New lead"]);
});

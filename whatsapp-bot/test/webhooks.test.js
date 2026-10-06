import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { eventually, say, signedWebhook, startTestApp, textMessage, toolUse } from "./helpers.js";
import { normalizePhone, OPT_OUT_REPLY } from "../src/webhooks.js";

const A_NUMBER = "100100100100100";
const B_NUMBER = "200200200200200";
const CUSTOMER = "919811112222";

let t;
beforeEach(async () => (t = await startTestApp()));
afterEach(() => t.close());

test("Meta's webhook check passes only with the right verify word", async () => {
  const ok = await fetch(`${t.base}/webhook?hub.mode=subscribe&hub.verify_token=verify-word&hub.challenge=4242`);
  assert.equal(await ok.text(), "4242");
  const bad = await fetch(`${t.base}/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=4242`);
  assert.equal(bad.status, 403);
});

test("unsigned or wrongly signed webhooks are rejected", async () => {
  const res = await fetch(`${t.base}/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(textMessage(A_NUMBER, CUSTOMER, "hi")) });
  assert.equal(res.status, 401);
  assert.equal(t.anthropic.requests.length, 0);
});

test("a message is answered by the right client's assistant, from that client's number", async () => {
  t.anthropic.responses.push(say("Namaste! Beta Dental mein aapka swagat hai."));
  const res = await signedWebhook(t.base, textMessage(B_NUMBER, CUSTOMER, "appointment chahiye"));
  assert.equal(res.status, 200);

  const sent = await eventually(() => {
    const m = t.fetcher.messages();
    assert.equal(m.length, 1);
    return m[0];
  });
  assert.equal(sent.phoneNumberId, B_NUMBER);
  assert.equal(sent.to, CUSTOMER);
  assert.match(sent.text.body, /Beta Dental/);
  assert.match(t.anthropic.requests[0].system[0].text, /WhatsApp assistant for Beta Dental/);
  const counts = t.db.countEvents(t.clientB, 0, Date.now() * 2);
  assert.equal(counts.message_in, 1);
  assert.equal(counts.conversation_started, 1);
  assert.equal(t.db.countEvents(t.clientA, 0, Date.now() * 2).message_in, undefined);
});

test("duplicate deliveries from Meta are answered once", async () => {
  const payload = textMessage(A_NUMBER, CUSTOMER, "hello", "wamid.same");
  await signedWebhook(t.base, payload);
  await signedWebhook(t.base, payload);
  await eventually(() => assert.equal(t.fetcher.messages().length, 1));
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(t.anthropic.requests.length, 1);
});

test("messages to an unknown or paused number are ignored", async () => {
  t.db.updateClient(t.clientA, { active: false });
  await signedWebhook(t.base, textMessage(A_NUMBER, CUSTOMER, "hi"));
  await signedWebhook(t.base, textMessage("999999999999999", CUSTOMER, "hi"));
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(t.fetcher.messages().length, 0);
});

test("STOP opts a customer out, START opts them back in", async () => {
  await signedWebhook(t.base, textMessage(A_NUMBER, CUSTOMER, "STOP"));
  await eventually(() => assert.equal(t.fetcher.messages()[0]?.text.body, OPT_OUT_REPLY));
  assert.equal(t.db.isOptedOut(t.clientA, CUSTOMER), true);
  assert.equal(t.anthropic.requests.length, 0);

  await signedWebhook(t.base, textMessage(A_NUMBER, CUSTOMER, "start"));
  await eventually(() => assert.equal(t.fetcher.messages().length, 2));
  assert.equal(t.db.isOptedOut(t.clientA, CUSTOMER), false);
});

test("a photo is downloaded and shown to the assistant", async () => {
  t.anthropic.responses.push(say("Sundar design! Room ka size bataiye."));
  const payload = {
    entry: [{ changes: [{ value: { metadata: { phone_number_id: A_NUMBER }, messages: [{ id: "img1", from: CUSTOMER, type: "image", image: { id: "media-77", caption: "aisa chahiye" } }] } }] }],
  };
  await signedWebhook(t.base, payload);
  await eventually(() => assert.equal(t.fetcher.messages().length, 1));

  const content = t.anthropic.requests[0].messages[0].content;
  assert.equal(content[1].type, "image");
  assert.equal(content[1].source.media_type, "image/jpeg");
  assert.equal(Buffer.from(content[1].source.data, "base64").toString(), "fake-jpeg-bytes");
  assert.equal(content[2].text, "aisa chahiye");
  assert.ok(t.fetcher.calls.some((c) => c.url.endsWith("/media-77")));
});

test("a booking through WhatsApp lands in the database and the owner's calendar", async () => {
  t.db.updateClient(t.clientA, { settings: { ...t.db.getClient(t.clientA).settings, calendarId: "owner@gmail.com" } });
  t.services.invalidate(t.clientA);
  t.anthropic.responses.push(
    toolUse("u1", "book_appointment", { customer_name: "Rohit", date: "2026-10-07", time: "11:00", address: "B-12 Shastri Nagar", service_interest: "gypsum ceiling", notes: "" }),
    say("Booked!"),
  );
  await signedWebhook(t.base, textMessage(A_NUMBER, CUSTOMER, "haan book kar do"));
  await eventually(() => assert.equal(t.fetcher.messages().length, 2)); // owner alert + reply

  const [booking] = t.db.listBookings(t.clientA);
  assert.equal(booking.calendar_event_id, "evt-1");
  const [, calendarId, event] = t.calendarCalls[0];
  assert.equal(calendarId, "owner@gmail.com");
  assert.equal(event.start, "2026-10-07T11:00:00+05:30");
  assert.equal(event.end, "2026-10-07T12:00:00+05:30");
  const alert = t.fetcher.messages().find((m) => m.to === "919000000001");
  assert.match(alert.text.body, /Rohit/);
});

test("owner alerts use the approved template when one is set", async () => {
  t.db.updateClient(t.clientA, { settings: { ...t.db.getClient(t.clientA).settings, templates: { ownerAlert: { name: "owner_alert", language: "en" } } } });
  t.services.invalidate(t.clientA);
  t.anthropic.responses.push(toolUse("u1", "handoff_to_owner", { reason: "wants exact quote", summary: "3BHK\nall rooms" }), say("Owner aapko call karenge."));
  await signedWebhook(t.base, textMessage(A_NUMBER, CUSTOMER, "exact rate batao"));
  await eventually(() => assert.equal(t.fetcher.messages().length, 2));

  const alert = t.fetcher.messages().find((m) => m.to === "919000000001");
  assert.equal(alert.type, "template");
  assert.equal(alert.template.name, "owner_alert");
  const param = alert.template.components[0].parameters[0].text;
  assert.doesNotMatch(param, /\n/); // WhatsApp rejects new lines in template parameters
  assert.match(param, /wants exact quote/);
  assert.equal(t.db.countEvents(t.clientA, 0, Date.now() * 2).handoff, 1);
});

test("missed calls: secret URL required; follow-up, lead and owner alert sent once", async () => {
  t.db.updateClient(t.clientA, { settings: { ...t.db.getClient(t.clientA).settings, templates: { missedCall: { name: "missed_call", language: "hi" } } } });
  t.services.invalidate(t.clientA);
  const hook = (token, body) => fetch(`${t.base}/hooks/missed-call/${t.clientA}/${token}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });

  assert.equal((await hook("wrong-token", { CallFrom: "09876543210" })).status, 404);
  assert.equal((await fetch(`${t.base}/hooks/missed-call/${t.clientB}/hooktoken123?CallFrom=09876543210`)).status, 200); // B has its own token
  assert.equal((await hook("hooktoken123", { Other: "1" })).status, 400);
  assert.equal((await hook("hooktoken123", { CallFrom: "09876543210" })).status, 200);

  await eventually(() => {
    const followUp = t.fetcher.messages().find((m) => m.to === "919876543210" && m.type === "template" && m.phoneNumberId === A_NUMBER);
    assert.equal(followUp.template.name, "missed_call");
    assert.equal(followUp.template.components[0].parameters[0].text, "Alpha Ceilings");
  });
  await eventually(() => assert.ok(t.fetcher.messages().some((m) => m.to === "919000000001" && /Missed call from \+919876543210/.test(m.text?.body))));
  assert.equal(t.db.listLeads(t.clientA)[0].source, "missed_call");

  const before = t.fetcher.messages().length;
  await hook("hooktoken123", { CallFrom: "+91 98765 43210" });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(t.fetcher.messages().length, before); // repeat call within 6 hours: no second follow-up
});

test("Indian phone numbers are normalised", () => {
  assert.equal(normalizePhone("9876543210"), "919876543210");
  assert.equal(normalizePhone("09876543210"), "919876543210");
  assert.equal(normalizePhone("+91 98765-43210"), "919876543210");
  assert.equal(normalizePhone("00919876543210"), "919876543210");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone({ evil: true }), null);
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { signIn, startTestApp, PASSWORD } from "./helpers.js";

let t;
before(async () => (t = await startTestApp()));
after(() => t.close());

test("sign-in rejects a wrong password and accepts the right one", async () => {
  const bad = await fetch(`${t.base}/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: "a@example.com", password: "wrong password!" }),
  });
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get("set-cookie"), null);

  const owner = await signIn(t.base, "a@example.com");
  assert.match(owner.cookie, /^sid=/);
  const home = await owner.get("/");
  assert.equal(home.status, 303);
  assert.equal(home.headers.get("location"), `/c/${t.clientA}`);
});

test("pages require a session", async () => {
  for (const path of [`/c/${t.clientA}`, `/c/${t.clientA}/leads.csv`, "/admin", "/account"]) {
    const res = await fetch(`${t.base}${path}`, { redirect: "manual" });
    assert.equal(res.status, 303, path);
    assert.equal(res.headers.get("location"), "/login");
  }
});

test("an owner cannot see or change another client's data", async () => {
  const lead = t.db.upsertLead(t.clientB, "919811100000", { customer_name: "Secret B customer" }, "whatsapp");
  const bookingId = t.db.addBooking(t.clientB, { phone: "919811100000", customer_name: "B", date: "2026-10-08", time: "10:00", address: "x", service_interest: "y" });
  const ownerA = await signIn(t.base, "a@example.com");

  for (const path of [`/c/${t.clientB}`, `/c/${t.clientB}/leads`, `/c/${t.clientB}/leads.csv`, `/c/${t.clientB}/bookings`, `/c/${t.clientB}/conversations/919811100000`, `/c/${t.clientB}/settings`, `/c/${t.clientB}/report`]) {
    const res = await ownerA.get(path);
    assert.equal(res.status, 404, path);
    assert.doesNotMatch(res.text, /Secret B customer/);
  }
  assert.equal((await ownerA.post(`/c/${t.clientB}/leads/${lead.id}/status`, { status: "lost" })).status, 404);
  assert.equal((await ownerA.post(`/c/${t.clientB}/bookings/${bookingId}/cancel`)).status, 404);
  assert.equal((await ownerA.post(`/c/${t.clientB}/conversations/919811100000/delete`, { confirm: "yes" })).status, 404);
  assert.equal(t.db.getBooking(t.clientB, bookingId).status, "booked");
  assert.equal(t.db.listLeads(t.clientB)[0].status, "new");

  // Owners can't reach admin pages or integrations, even for their own client
  for (const path of ["/admin", "/admin/users", "/admin/audit", `/c/${t.clientA}/integrations`]) {
    assert.equal((await ownerA.get(path)).status, 404, path);
  }
});

test("forms without the CSRF token are refused", async () => {
  const owner = await signIn(t.base, "a@example.com");
  const res = await owner.post("/account/password", { current: PASSWORD, password: "a new password 123", confirm: "a new password 123" }, { withCsrf: false });
  assert.equal(res.status, 403);
});

test("repeated failed sign-ins are locked out", async () => {
  const attempt = () =>
    fetch(`${t.base}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email: "victim@example.com", password: "guess" }),
    }).then((r) => r.text());
  for (let i = 0; i < 5; i++) await attempt();
  assert.match(await attempt(), /Too many attempts/);
});

test("security headers are set on every page", async () => {
  const res = await fetch(`${t.base}/login`);
  assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.match(res.headers.get("x-robots-tag"), /noindex/);
});

test("customer text is escaped in pages and CSV export is formula-safe", async () => {
  t.db.upsertLead(t.clientA, "919811122222", { customer_name: "<script>alert(1)</script>", service_interest: "=HYPERLINK(\"http://evil\")" }, "whatsapp");
  const owner = await signIn(t.base, "a@example.com");

  const page = await owner.get(`/c/${t.clientA}/leads`);
  assert.equal(page.status, 200);
  assert.match(page.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(page.text, /<script>alert/);

  const csv = await owner.get(`/c/${t.clientA}/leads.csv`);
  assert.match(csv.text, /"'=HYPERLINK/);
  assert.ok(t.db.listAudit(t.clientA).some((a) => a.action === "leads_exported"));
});

test("owner saves business settings; invalid input is explained, not saved", async () => {
  const owner = await signIn(t.base, "a@example.com");
  const page = await owner.get(`/c/${t.clientA}/settings`);
  const knowledge = page.text.match(/<textarea name="knowledge"[^>]*>([\s\S]*?)<\/textarea>/)[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
  const form = {
    name: "Alpha Ceilings",
    type: "False ceilings",
    city: "Kanpur",
    phone: "+91 90000 00001",
    areasServed: "Kidwai Nagar, Swaroop Nagar",
    address: "Mall Road",
    hoursText: "Mon–Sat 9–7",
    appointmentName: "free site visit",
    startTime: "10:00",
    endTime: "18:00",
    slotMinutes: "60",
    maxPerSlot: "2",
    bookAheadDays: "14",
    minNoticeHours: "3",
    requiredDetails: "name, address",
    knowledge,
  };
  const body = new URLSearchParams({ _csrf: page.text.match(/name="_csrf" value="([^"]+)"/)[1], ...form });
  ["1", "2", "3", "4", "5", "6"].forEach((d) => body.append("workingDays", d));
  const post = (b) => fetch(`${t.base}/c/${t.clientA}/settings`, { method: "POST", redirect: "manual", headers: { cookie: owner.cookie, "Content-Type": "application/x-www-form-urlencoded" }, body: b });

  const bad = new URLSearchParams(body);
  bad.set("startTime", "19:00");
  const badRes = await post(bad);
  assert.equal(badRes.status, 400);
  assert.match(await badRes.text(), /startTime must be before endTime/);
  assert.notEqual(t.db.getClient(t.clientA).profile.city, "Kanpur");

  const ok = await post(body);
  assert.equal(ok.status, 303);
  const saved = t.db.getClient(t.clientA).profile;
  assert.equal(saved.city, "Kanpur");
  assert.deepEqual(saved.areasServed, ["Kidwai Nagar", "Swaroop Nagar"]);
  assert.equal(saved.booking.maxPerSlot, 2);
  assert.deepEqual(saved.booking.workingDays, [1, 2, 3, 4, 5, 6]);
});

test("cancelling a booking frees it and removes the calendar event", async () => {
  const bookingId = t.db.addBooking(t.clientA, { phone: "919811133333", customer_name: "Ravi", date: "2026-10-09", time: "11:00", address: "x", service_interest: "y" });
  t.db.updateBooking(t.clientA, bookingId, { calendar_event_id: "evt-9" });
  t.db.updateClient(t.clientA, { settings: { ...t.db.getClient(t.clientA).settings, calendarId: "owner@gmail.com" } });
  t.services.invalidate(t.clientA);

  const owner = await signIn(t.base, "a@example.com");
  const res = await owner.post(`/c/${t.clientA}/bookings/${bookingId}/cancel`);
  assert.equal(res.status, 303);
  assert.equal(t.db.getBooking(t.clientA, bookingId).status, "cancelled");
  assert.deepEqual(t.calendarCalls.at(-1), ["delete", "owner@gmail.com", "evt-9"]);
});

test("deleting a customer's data removes their chat, leads and bookings", async () => {
  const phone = "919811144444";
  t.db.saveConversation(t.clientA, phone, { messages: [{ role: "user", content: "hi" }], updatedAt: Date.now(), pausedUntil: 0 });
  t.db.upsertLead(t.clientA, phone, { customer_name: "Asha" }, "whatsapp");
  t.db.addBooking(t.clientA, { phone, customer_name: "Asha", date: "2026-10-09", time: "12:00", address: "x", service_interest: "y" });

  const owner = await signIn(t.base, "a@example.com");
  assert.equal((await owner.post(`/c/${t.clientA}/conversations/${phone}/delete`, {})).status, 400);
  const res = await owner.post(`/c/${t.clientA}/conversations/${phone}/delete`, { confirm: "yes" });
  assert.equal(res.status, 303);
  assert.equal(t.db.listLeads(t.clientA).filter((l) => l.phone === phone).length, 0);
  assert.equal(t.db.listBookings(t.clientA).filter((b) => b.phone === phone).length, 0);
  assert.equal(t.db.getConversation(t.clientA, phone).messages.length, 0);
  assert.ok(t.db.listAudit(t.clientA).some((a) => a.action === "customer_data_deleted"));
});

test("admin creates an owner login that works only for its client", async () => {
  const admin = await signIn(t.base, "admin@example.com");
  await admin.get("/admin/users");
  const res = await admin.post("/admin/users", { name: "New Owner", email: "new@example.com", client_id: String(t.clientB) });
  assert.equal(res.status, 200);
  const password = res.text.match(/<code class="secret">([^<]+)<\/code>/)[1];

  const owner = await signIn(t.base, "new@example.com", password);
  assert.equal((await owner.get(`/c/${t.clientB}`)).status, 200);
  assert.equal((await owner.get(`/c/${t.clientA}`)).status, 404);
});

test("integrations: WhatsApp token is stored encrypted and phone IDs stay unique", async () => {
  const admin = await signIn(t.base, "admin@example.com");
  await admin.get(`/c/${t.clientA}/integrations`);
  const form = {
    active: "1",
    waPhoneNumberId: "100100100100100",
    waToken: "EAAG-super-secret-token",
    ownerWhatsapp: "919000000001",
    tpl_ownerAlert_name: "owner_alert",
    tpl_ownerAlert_lang: "en",
    tpl_reminder_name: "visit_reminder",
    tpl_reminder_lang: "hi",
    tpl_missedCall_name: "",
    tpl_missedCall_lang: "hi",
    reminderHoursBefore: "24",
    calendarId: "",
    callerField: "CallFrom",
    conversationDays: "180",
    recordDays: "730",
  };
  assert.equal((await admin.post(`/c/${t.clientA}/integrations`, form)).status, 303);
  const client = t.db.getClient(t.clientA);
  assert.ok(client.wa_token_enc && !client.wa_token_enc.includes("super-secret"));
  assert.deepEqual(client.settings.templates, { ownerAlert: { name: "owner_alert", language: "en" }, reminder: { name: "visit_reminder", language: "hi" } });

  const clash = await admin.post(`/c/${t.clientB}/integrations`, { ...form, waPhoneNumberId: "100100100100100", waToken: "" });
  assert.equal(clash.status, 400);
  assert.match(clash.text, /already used by another client/);
});

test("monthly report and overview render for the owner", async () => {
  t.db.logEvent(t.clientA, "booking_new", "919811155555", new Date("2026-10-03T06:00:00Z").getTime());
  const owner = await signIn(t.base, "a@example.com");
  const report = await owner.get(`/c/${t.clientA}/report?month=2026-10`);
  assert.equal(report.status, 200);
  assert.match(report.text, /October 2026 report/);
  assert.match((await owner.get(`/c/${t.clientA}/report?month=2027-01`)).text, /October 2026 report/); // future months fall back to now
  const overview = await owner.get(`/c/${t.clientA}`);
  assert.equal(overview.status, 200);
  assert.match(overview.text, /October 2026 so far/);
});

test("changing password signs out other sessions", async () => {
  const first = await signIn(t.base, "b@example.com");
  const second = await signIn(t.base, "b@example.com");
  await second.get("/account");
  const res = await second.post("/account/password", { current: PASSWORD, password: "another password 456", confirm: "another password 456" });
  assert.equal(res.status, 303);
  assert.equal((await first.get(`/c/${t.clientB}`)).status, 303); // old session gone
  await signIn(t.base, "b@example.com", "another password 456");
});

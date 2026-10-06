// Dashboard pages for admins (all clients) and owners (their own client only).

import express from "express";
import fs from "node:fs";
import { csrfField, escape, formatDateTime, html, layout, raw } from "./html.js";
import { DEFAULT_SETTINGS, validateProfile, validateSettings } from "../profile.js";
import { describeNow, humanDate, humanTime, toInstant } from "../slots.js";
import { hashPassword, MIN_PASSWORD_LENGTH, randomToken, verifyPassword } from "../security.js";

const FLASH = {
  saved: { type: "ok", message: "Saved." },
  cancelled: { type: "ok", message: "Booking cancelled." },
  updated: { type: "ok", message: "Updated." },
  deleted: { type: "ok", message: "Customer data deleted." },
  paused: { type: "ok", message: "Bot paused for this chat for 12 hours. Reply to the customer from your own phone." },
  resumed: { type: "ok", message: "Bot resumed for this chat." },
  password: { type: "ok", message: "Password changed. Other devices were signed out." },
};
const LEAD_STATUSES = ["new", "contacted", "won", "lost"];
const BOOKING_STATUS_LABEL = { booked: "Booked", completed: "Done", cancelled: "Cancelled", no_show: "No-show" };
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const KNOWLEDGE_KEYS = ["services", "priceList", "faqs", "policies", "leadQuestions"];
const TEMPLATE_KEYS = [
  { key: "ownerAlert", label: "Owner alert", params: "1 parameter: the alert text" },
  { key: "reminder", label: "Appointment reminder", params: "5 parameters: name, business, appointment, date, time" },
  { key: "missedCall", label: "Missed-call follow-up", params: "1 parameter: business name" },
];
const HANDOFF_PAUSE_MS = 12 * 3600_000;

// +91 98765 43210 for Indian numbers, +<digits> otherwise.
const phoneLabel = (phone) => (/^91\d{10}$/.test(phone) ? `+91 ${phone.slice(2, 7)} ${phone.slice(7)}` : `+${phone}`);
// WhatsApp *bold* shown as bold, applied after escaping so customer text can't inject HTML.
const whatsappText = (text) => raw(escape(text).replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>"));
const statusBadge = (status) => html`<span class="badge s-${status}">${BOOKING_STATUS_LABEL[status] ?? status}</span>`;
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return `"${s.replaceAll('"', '""')}"`;
};

function monthRange(profile, month) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: toInstant(profile, `${month}-01`, "00:00"), to: toInstant(profile, `${next}-01`, "00:00"), next };
}
const prevMonth = (month) => {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
const monthLabel = (month) => {
  const [y, m] = month.split("-").map(Number);
  return `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1]} ${y}`;
};

export function createDashboard({ db, services, auth, cipher, product, publicUrl, exampleProfileFile, now = () => new Date() }) {
  const router = express.Router();
  router.use(express.urlencoded({ extended: false, limit: "200kb" }));
  router.use(auth.sessionMiddleware);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  const signedIn = [auth.requireUser, auth.requireCsrf];
  const admin = [...signedIn, auth.requireAdmin];
  const clientPage = [...signedIn, auth.requireClientAccess];
  const clientAdmin = [...signedIn, auth.requireAdmin, auth.requireClientAccess];

  const ip = (req) => req.ip;
  const audit = (req, action, detail = "", clientId = req.client?.id ?? null) => db.audit({ userId: req.user?.id, clientId, action, detail, ip: ip(req), at: now().getTime() });

  function send(req, res, { status = 200, ...options }) {
    const clients = req.user?.role === "admin" ? db.listClients() : [];
    const flash = options.flash ?? (Object.hasOwn(FLASH, req.query?.msg ?? "") ? FLASH[req.query.msg] : null);
    res.status(status).type("html").send(String(layout({ user: req.user, csrf: req.csrf, product, clients, client: req.client, ...options, flash })));
  }

  function stats(client, from, to) {
    const counts = db.countEvents(client.id, from, to);
    return {
      customers: db.countCustomers(client.id, from, to),
      conversations: counts.conversation_started ?? 0,
      leads: counts.lead_new ?? 0,
      bookings: counts.booking_new ?? 0,
      missedCalls: counts.missed_call ?? 0,
      handoffs: counts.handoff ?? 0,
      reminders: counts.reminder_sent ?? 0,
      cancelled: counts.booking_cancelled ?? 0,
    };
  }

  const statTiles = (s) => html`<div class="tiles">
    <div class="tile"><span class="num">${s.customers}</span><span class="lbl">Customers who messaged</span></div>
    <div class="tile"><span class="num">${s.leads}</span><span class="lbl">New leads</span></div>
    <div class="tile accent"><span class="num">${s.bookings}</span><span class="lbl">Appointments booked</span></div>
    <div class="tile"><span class="num">${s.missedCalls}</span><span class="lbl">Missed calls followed up</span></div>
    <div class="tile"><span class="num">${s.handoffs}</span><span class="lbl">Chats handed to owner</span></div>
    <div class="tile"><span class="num">${s.reminders}</span><span class="lbl">Reminders sent</span></div>
  </div>`;

  // ---------- Sign in / out ----------

  const loginPage = (error, email = "") => html`<div class="narrow">
    <h1>Sign in</h1>
    ${error ? html`<div class="flash error" role="alert">${error}</div>` : ""}
    <form method="post" action="/login" class="stack card">
      <label>Email <input type="email" name="email" value="${email}" autocomplete="username" required></label>
      <label>Password <input type="password" name="password" autocomplete="current-password" required></label>
      <button class="btn primary">Sign in</button>
    </form>
  </div>`;

  router.get("/login", (req, res) => (req.user ? res.redirect(303, "/") : send(req, res, { title: "Sign in", body: loginPage() })));

  router.post("/login", (req, res) => {
    const { user, error } = auth.attemptLogin(req.body.email, req.body.password, ip(req));
    if (error) {
      db.audit({ action: "login_failed", detail: String(req.body.email ?? "").slice(0, 200), ip: ip(req), at: now().getTime() });
      return send(req, res, { status: 401, title: "Sign in", body: loginPage(error, req.body.email) });
    }
    auth.startSession(res, user.id);
    db.audit({ userId: user.id, clientId: user.client_id, action: "login", ip: ip(req), at: now().getTime() });
    res.redirect(303, "/");
  });

  router.post("/logout", ...signedIn, (req, res) => {
    auth.endSession(req, res);
    res.redirect(303, "/login");
  });

  router.get("/", auth.requireUser, (req, res) => res.redirect(303, req.user.role === "admin" ? "/admin" : `/c/${req.user.clientId}`));
  router.get("/go", auth.requireUser, (req, res) => res.redirect(303, /^\d+$/.test(req.query.c ?? "") ? `/c/${req.query.c}` : "/"));

  // ---------- Account ----------

  const accountPage = (req, error) => html`<div class="narrow">
    <h1>Your account</h1>
    <p class="muted">${req.user.name} · ${req.user.email} · ${req.user.role === "admin" ? "Admin" : "Business owner"}</p>
    <h2>Change password</h2>
    ${error ? html`<div class="flash error" role="alert">${error}</div>` : ""}
    <form method="post" action="/account/password" class="stack card">
      ${csrfField(req.csrf)}
      <label>Current password <input type="password" name="current" autocomplete="current-password" required></label>
      <label>New password <input type="password" name="password" autocomplete="new-password" minlength="${MIN_PASSWORD_LENGTH}" required>
        <span class="hint">At least ${MIN_PASSWORD_LENGTH} characters.</span></label>
      <label>Repeat new password <input type="password" name="confirm" autocomplete="new-password" required></label>
      <button class="btn primary">Change password</button>
    </form>
  </div>`;

  router.get("/account", auth.requireUser, (req, res) => send(req, res, { title: "Account", body: accountPage(req) }));

  router.post("/account/password", ...signedIn, (req, res) => {
    const user = db.getUser(req.user.id);
    const { current = "", password = "", confirm = "" } = req.body;
    let error = null;
    if (!verifyPassword(current, user.password_hash)) error = "Current password is incorrect.";
    else if (password.length < MIN_PASSWORD_LENGTH) error = `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    else if (password !== confirm) error = "The new passwords don't match.";
    if (error) return send(req, res, { status: 400, title: "Account", body: accountPage(req, error) });

    db.setUserPassword(user.id, hashPassword(password));
    db.deleteUserSessions(user.id);
    auth.startSession(res, user.id);
    audit(req, "password_changed", "", user.client_id);
    res.redirect(303, "/account?msg=password");
  });

  // ---------- Admin: clients, users, audit ----------

  router.get("/admin", ...admin, (req, res) => {
    const clients = db.listClients();
    const rows = clients.map((c) => {
      const month = describeNow(c.profile, now()).date.slice(0, 7);
      const { from, to } = monthRange(c.profile, month);
      return { c, s: stats(c, from, to) };
    });
    send(req, res, {
      title: "Clients",
      body: html`<div class="head-row"><h1>Clients</h1><a class="btn primary" href="/admin/clients/new">Add client</a></div>
        <p class="muted">This month so far. <a href="/admin/users">Manage logins</a> · <a href="/admin/audit">Activity log</a></p>
        ${rows.length
          ? html`<table class="table">
              <thead><tr><th>Client</th><th>WhatsApp linked</th><th>Leads</th><th>Bookings</th><th>Status</th></tr></thead>
              <tbody>${rows.map(({ c, s }) => html`<tr>
                <td data-label="Client"><a href="/c/${c.id}">${c.name}</a></td>
                <td data-label="WhatsApp linked">${c.wa_phone_number_id ? "Yes" : html`<span class="badge warn">Not yet</span>`}</td>
                <td data-label="Leads">${s.leads}</td>
                <td data-label="Bookings">${s.bookings}</td>
                <td data-label="Status">${c.active ? "Active" : html`<span class="badge warn">Paused</span>`}</td>
              </tr>`)}</tbody>
            </table>`
          : html`<div class="empty card"><p>No clients yet.</p><a class="btn primary" href="/admin/clients/new">Add your first client</a></div>`}`,
    });
  });

  const exampleProfile = () => {
    try {
      const p = JSON.parse(fs.readFileSync(exampleProfileFile, "utf8"));
      delete p.id;
      delete p.ownerWhatsapp;
      return JSON.stringify(p, null, 2);
    } catch {
      return "{}";
    }
  };

  const newClientPage = (req, { name = "", profileText = exampleProfile(), errors = [] } = {}) => html`
    <h1>Add client</h1>
    <p class="muted">Paste or edit the business profile below. The example is a false-ceiling business; replace every detail with the new client's. You can change it later in Business settings.</p>
    ${errors.length ? html`<div class="flash error" role="alert"><strong>Please fix:</strong><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul></div>` : ""}
    <form method="post" action="/admin/clients" class="stack card">
      ${csrfField(req.csrf)}
      <label>Business name <input name="name" value="${name}" required maxlength="120"></label>
      <label>Business profile (JSON)
        <textarea name="profile" rows="24" class="code" spellcheck="false" required>${profileText}</textarea></label>
      <button class="btn primary">Create client</button>
    </form>`;

  router.get("/admin/clients/new", ...admin, (req, res) => send(req, res, { title: "Add client", body: newClientPage(req) }));

  router.post("/admin/clients", ...admin, (req, res) => {
    const name = String(req.body.name ?? "").trim();
    let parsed;
    let errors = [];
    try {
      parsed = JSON.parse(req.body.profile ?? "");
    } catch {
      errors = ["The profile is not valid JSON. Check for missing commas or quotes."];
    }
    if (!name) errors.push("Business name is required.");
    let result;
    if (!errors.length) {
      result = validateProfile({ ...parsed, name });
      if (!result.ok) errors = result.errors;
    }
    if (errors.length) return send(req, res, { status: 400, title: "Add client", body: newClientPage(req, { name, profileText: req.body.profile, errors }) });

    let slug = slugify(name) || "client";
    if (db.listClients().some((c) => c.slug === slug)) slug = `${slug}-${randomToken(3).toLowerCase()}`;
    const settings = { ...DEFAULT_SETTINGS, missedCall: { ...DEFAULT_SETTINGS.missedCall, token: randomToken(18) } };
    const clientId = db.createClient({ slug, name, profile: result.profile, settings, now: now().getTime() });
    audit(req, "client_created", name, clientId);
    res.redirect(303, `/c/${clientId}/integrations?msg=saved`);
  });

  const usersPage = (req, { shown = null, error = null } = {}) => {
    const users = db.listUsers();
    const clients = db.listClients();
    return html`<h1>Logins</h1>
      ${shown ? html`<div class="flash ok" role="status">Temporary password for <strong>${shown.email}</strong>: <code class="secret">${shown.password}</code><br>Copy it now and share it privately; it won't be shown again. They should change it after signing in.</div>` : ""}
      ${error ? html`<div class="flash error" role="alert">${error}</div>` : ""}
      <table class="table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Client</th><th>Last sign-in</th><th>Actions</th></tr></thead>
        <tbody>${users.map((u) => html`<tr>
          <td data-label="Name">${u.name}${u.active ? "" : html` <span class="badge warn">Disabled</span>`}</td>
          <td data-label="Email">${u.email}</td>
          <td data-label="Role">${u.role === "admin" ? "Admin" : "Owner"}</td>
          <td data-label="Client">${u.client_name ?? "All"}</td>
          <td data-label="Last sign-in">${formatDateTime(u.last_login_at)}</td>
          <td data-label="Actions" class="actions">
            <form method="post" action="/admin/users/${u.id}/reset">${csrfField(req.csrf)}<button class="btn small">Reset password</button></form>
            ${u.id === req.user.id ? "" : html`<form method="post" action="/admin/users/${u.id}/active">${csrfField(req.csrf)}<input type="hidden" name="active" value="${u.active ? "0" : "1"}"><button class="btn small">${u.active ? "Disable" : "Enable"}</button></form>`}
          </td>
        </tr>`)}</tbody>
      </table>
      <h2>Add login</h2>
      <form method="post" action="/admin/users" class="stack card narrow-form">
        ${csrfField(req.csrf)}
        <label>Name <input name="name" required maxlength="120"></label>
        <label>Email <input type="email" name="email" required maxlength="200"></label>
        <label>Access
          <select name="client_id" required>
            ${clients.map((c) => html`<option value="${c.id}">Owner of ${c.name}</option>`)}
            <option value="admin">Admin (all clients)</option>
          </select></label>
        <button class="btn primary">Create login</button>
      </form>`;
  };

  router.get("/admin/users", ...admin, (req, res) => send(req, res, { title: "Logins", body: usersPage(req) }));

  router.post("/admin/users", ...admin, (req, res) => {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const name = String(req.body.name ?? "").trim();
    const isAdmin = req.body.client_id === "admin";
    const clientId = isAdmin ? null : Number(req.body.client_id);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) return send(req, res, { status: 400, title: "Logins", body: usersPage(req, { error: "Enter a name and a valid email." }) });
    if (!isAdmin && !db.getClient(clientId)) return send(req, res, { status: 400, title: "Logins", body: usersPage(req, { error: "Choose a client." }) });
    if (db.getUserByEmail(email)) return send(req, res, { status: 400, title: "Logins", body: usersPage(req, { error: "That email already has a login." }) });

    const password = randomToken(12);
    db.createUser({ email, name, passwordHash: hashPassword(password), role: isAdmin ? "admin" : "owner", clientId, now: now().getTime() });
    audit(req, "user_created", `${email} (${isAdmin ? "admin" : `owner of client ${clientId}`})`, clientId);
    send(req, res, { title: "Logins", body: usersPage(req, { shown: { email, password } }) });
  });

  router.post("/admin/users/:userId/reset", ...admin, (req, res) => {
    const user = db.getUser(Number(req.params.userId));
    if (!user) return res.status(404).send("Not found");
    const password = randomToken(12);
    db.setUserPassword(user.id, hashPassword(password));
    db.deleteUserSessions(user.id);
    audit(req, "password_reset", user.email, user.client_id);
    send(req, res, { title: "Logins", body: usersPage(req, { shown: { email: user.email, password } }) });
  });

  router.post("/admin/users/:userId/active", ...admin, (req, res) => {
    const user = db.getUser(Number(req.params.userId));
    if (!user || user.id === req.user.id) return res.status(404).send("Not found");
    const active = req.body.active === "1";
    db.setUserActive(user.id, active);
    if (!active) db.deleteUserSessions(user.id);
    audit(req, active ? "user_enabled" : "user_disabled", user.email, user.client_id);
    res.redirect(303, "/admin/users?msg=updated");
  });

  router.get("/admin/audit", ...admin, (req, res) => {
    const rows = db.listAudit(null, 300);
    send(req, res, {
      title: "Activity log",
      body: html`<h1>Activity log</h1><p class="muted">Last 300 dashboard actions.</p>
        <table class="table"><thead><tr><th>When</th><th>Who</th><th>Client</th><th>Action</th><th>Detail</th><th>IP</th></tr></thead>
        <tbody>${rows.map((a) => html`<tr><td data-label="When">${formatDateTime(a.at)}</td><td data-label="Who">${a.email ?? "—"}</td><td data-label="Client">${a.client_id ?? "—"}</td><td data-label="Action">${a.action}</td><td data-label="Detail">${a.detail}</td><td data-label="IP">${a.ip ?? ""}</td></tr>`)}</tbody></table>`,
    });
  });

  // ---------- Client: overview ----------

  router.get("/c/:clientId", ...clientPage, (req, res) => {
    const c = req.client;
    const today = describeNow(c.profile, now());
    const { from, to } = monthRange(c.profile, today.date.slice(0, 7));
    const s = stats(c, from, to);
    const weekAhead = new Date(Date.parse(today.date) + 8 * 86_400_000).toISOString().slice(0, 10);
    const upcoming = db.listBookings(c.id, { fromDate: today.date, toDate: weekAhead, status: "booked" });
    const leads = db.listLeads(c.id).slice(0, 6);
    const text = JSON.stringify(c.profile);

    const checklist = [
      { done: !!c.wa_phone_number_id, label: "WhatsApp number connected", adminOnly: true },
      { done: !!c.settings.ownerWhatsapp, label: "Owner WhatsApp number set for alerts", adminOnly: true },
      { done: !!c.settings.templates?.ownerAlert, label: "Owner alert template approved and added", adminOnly: true },
      { done: !!c.settings.templates?.reminder, label: "Reminder template approved and added", adminOnly: true },
      { done: !!c.settings.calendarId, label: "Google Calendar connected (optional)", adminOnly: true },
      { done: !/Your City|Nearby Area|98765 43210|000000/.test(text), label: "Business details filled in (no placeholder text left)" },
    ].filter((item) => !item.done && (req.user.role === "admin" || !item.adminOnly));
    const pendingByManager = req.user.role === "admin" ? 0 : [!c.wa_phone_number_id, !c.settings.ownerWhatsapp, !c.settings.templates?.ownerAlert].filter(Boolean).length;

    send(req, res, {
      title: c.name,
      active: "overview",
      body: html`
        ${checklist.length || pendingByManager
          ? html`<section class="card checklist"><h2>Finish setting up</h2>
              ${checklist.length ? html`<ul>${checklist.map((i) => html`<li>${i.label}</li>`)}</ul>` : ""}
              ${pendingByManager ? html`<p class="muted">Your account manager is connecting WhatsApp and alerts for you.</p>` : ""}
              ${req.user.role === "admin" ? html`<a href="/c/${c.id}/integrations">Open integrations</a>` : checklist.length ? html`<a href="/c/${c.id}/settings">Open business settings</a>` : ""}</section>`
          : ""}
        <h2>${monthLabel(today.date.slice(0, 7))} so far</h2>
        ${statTiles(s)}
        <div class="two-col">
          <section>
            <div class="head-row"><h2>Next 7 days</h2><a href="/c/${c.id}/bookings">All bookings</a></div>
            ${upcoming.length
              ? html`<ul class="list card">${upcoming.map((b) => html`<li><strong>${humanDate(b.date)}, ${humanTime(b.time)}</strong> · ${b.customer_name}<br><span class="muted">${b.address}</span></li>`)}</ul>`
              : html`<p class="empty card">No appointments in the next 7 days.</p>`}
          </section>
          <section>
            <div class="head-row"><h2>Latest leads</h2><a href="/c/${c.id}/leads">All leads</a></div>
            ${leads.length
              ? html`<ul class="list card">${leads.map((l) => html`<li><strong>${l.customer_name || phoneLabel(l.phone)}</strong> · ${l.service_interest || (l.source === "missed_call" ? "Missed call" : "Enquiry")}<br><span class="muted">${[l.area, formatDateTime(l.created_at, c.profile.utcOffsetMinutes)].filter(Boolean).join(" · ")}</span></li>`)}</ul>`
              : html`<p class="empty card">No leads yet. They appear here as customers message.</p>`}
          </section>
        </div>`,
    });
  });

  // ---------- Client: leads ----------

  router.get("/c/:clientId/leads", ...clientPage, (req, res) => {
    const c = req.client;
    const status = LEAD_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const leads = db.listLeads(c.id, { status });
    send(req, res, {
      title: "Leads",
      active: "leads",
      body: html`<div class="head-row"><h1>Leads</h1><a class="btn" href="/c/${c.id}/leads.csv">Download CSV</a></div>
        <nav class="filters" aria-label="Filter leads">
          <a href="/c/${c.id}/leads" class="${!status ? "active" : ""}">All</a>
          ${LEAD_STATUSES.map((s) => html`<a href="/c/${c.id}/leads?status=${s}" class="${status === s ? "active" : ""}">${s[0].toUpperCase() + s.slice(1)}</a>`)}
        </nav>
        ${leads.length
          ? html`<table class="table">
              <thead><tr><th>Customer</th><th>Need</th><th>Details</th><th>Received</th><th>Status</th></tr></thead>
              <tbody>${leads.map((l) => html`<tr>
                <td data-label="Customer"><strong>${l.customer_name || "—"}</strong><br><a href="/c/${c.id}/conversations/${l.phone}">${phoneLabel(l.phone)}</a>${l.source === "missed_call" ? html` <span class="badge">Missed call</span>` : ""}</td>
                <td data-label="Need">${l.service_interest || "—"}<br><span class="muted">${l.area}</span></td>
                <td data-label="Details">${[l.property_type, l.requirement_details, l.budget && `Budget: ${l.budget}`, l.timeline && `When: ${l.timeline}`].filter(Boolean).join(" · ") || "—"}</td>
                <td data-label="Received">${formatDateTime(l.created_at, c.profile.utcOffsetMinutes)}</td>
                <td data-label="Status">
                  <form method="post" action="/c/${c.id}/leads/${l.id}/status" class="inline">
                    ${csrfField(req.csrf)}
                    <label class="sr-only" for="st-${l.id}">Status</label>
                    <select id="st-${l.id}" name="status" data-autosubmit>${LEAD_STATUSES.map((s) => html`<option value="${s}" ${l.status === s ? raw("selected") : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`)}</select>
                    <noscript><button class="btn small">Save</button></noscript>
                  </form></td>
              </tr>`)}</tbody></table>`
          : html`<p class="empty card">No leads${status ? ` marked ${status}` : ""} yet.</p>`}`,
    });
  });

  router.post("/c/:clientId/leads/:leadId/status", ...clientPage, (req, res) => {
    if (!LEAD_STATUSES.includes(req.body.status)) return res.status(400).send("Invalid status");
    if (!db.setLeadStatus(req.client.id, req.params.leadId, req.body.status, now().getTime())) return res.status(404).send("Not found");
    res.redirect(303, `/c/${req.client.id}/leads?msg=updated`);
  });

  router.get("/c/:clientId/leads.csv", ...clientPage, (req, res) => {
    const c = req.client;
    const header = ["Received", "Name", "Phone", "Source", "Area", "Property", "Need", "Details", "Budget", "Timeline", "Status"];
    const rows = db.listLeads(c.id).map((l) => [formatDateTime(l.created_at, c.profile.utcOffsetMinutes), l.customer_name, phoneLabel(l.phone), l.source, l.area, l.property_type, l.service_interest, l.requirement_details, l.budget, l.timeline, l.status]);
    audit(req, "leads_exported", `${rows.length} leads`);
    res.setHeader("Content-Disposition", `attachment; filename="${c.slug}-leads.csv"`);
    res.type("text/csv").send("﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n"));
  });

  // ---------- Client: bookings ----------

  router.get("/c/:clientId/bookings", ...clientPage, (req, res) => {
    const c = req.client;
    const view = ["upcoming", "past", "cancelled"].includes(req.query.view) ? req.query.view : "upcoming";
    const today = describeNow(c.profile, now()).date;
    const bookings =
      view === "upcoming"
        ? db.listBookings(c.id, { fromDate: today, status: "booked" })
        : view === "cancelled"
          ? db.listBookings(c.id, { status: "cancelled" }).reverse()
          : db.listBookings(c.id, { toDate: today }).filter((b) => b.status !== "cancelled").reverse();
    send(req, res, {
      title: "Bookings",
      active: "bookings",
      body: html`<h1>Bookings</h1>
        <nav class="filters" aria-label="Bookings view">
          ${["upcoming", "past", "cancelled"].map((v) => html`<a href="/c/${c.id}/bookings?view=${v}" class="${view === v ? "active" : ""}">${v[0].toUpperCase() + v.slice(1)}</a>`)}
        </nav>
        ${bookings.length
          ? html`<table class="table">
              <thead><tr><th>When</th><th>Customer</th><th>Address</th><th>Need</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>${bookings.map((b) => html`<tr>
                <td data-label="When"><strong>${humanDate(b.date)}</strong><br>${humanTime(b.time)}</td>
                <td data-label="Customer">${b.customer_name}<br><a href="/c/${c.id}/conversations/${b.phone}">${phoneLabel(b.phone)}</a></td>
                <td data-label="Address">${b.address}</td>
                <td data-label="Need">${b.service_interest}${b.notes ? html`<br><span class="muted">${b.notes}</span>` : ""}</td>
                <td data-label="Status">${statusBadge(b.status)}${b.calendar_event_id ? html`<br><span class="muted">In calendar</span>` : ""}</td>
                <td data-label="Actions" class="actions">${b.status === "booked"
                  ? html`<form method="post" action="/c/${c.id}/bookings/${b.id}/status">${csrfField(req.csrf)}<input type="hidden" name="status" value="completed"><button class="btn small">Mark done</button></form>
                    <form method="post" action="/c/${c.id}/bookings/${b.id}/status">${csrfField(req.csrf)}<input type="hidden" name="status" value="no_show"><button class="btn small">No-show</button></form>
                    <form method="post" action="/c/${c.id}/bookings/${b.id}/cancel" data-confirm="Cancel this booking? The customer will be told if they messaged in the last 24 hours.">${csrfField(req.csrf)}<button class="btn small danger">Cancel</button></form>`
                  : ""}</td>
              </tr>`)}</tbody></table>`
          : html`<p class="empty card">No ${view} bookings.</p>`}`,
    });
  });

  router.post("/c/:clientId/bookings/:bookingId/status", ...clientPage, (req, res) => {
    if (!["completed", "no_show"].includes(req.body.status)) return res.status(400).send("Invalid status");
    const booking = db.getBooking(req.client.id, req.params.bookingId);
    if (!booking) return res.status(404).send("Not found");
    db.updateBooking(req.client.id, booking.id, { status: req.body.status }, now().getTime());
    res.redirect(303, `/c/${req.client.id}/bookings?msg=updated`);
  });

  router.post("/c/:clientId/bookings/:bookingId/cancel", ...clientPage, async (req, res) => {
    const done = await services.cancelBooking(req.client, req.params.bookingId);
    if (!done) return res.status(404).send("Not found");
    audit(req, "booking_cancelled", req.params.bookingId);
    res.redirect(303, `/c/${req.client.id}/bookings?msg=cancelled`);
  });

  // ---------- Client: conversations ----------

  router.get("/c/:clientId/conversations", ...clientPage, (req, res) => {
    const c = req.client;
    const rows = db.listConversations(c.id);
    const t = now().getTime();
    send(req, res, {
      title: "Chats",
      active: "conversations",
      body: html`<h1>Chats</h1>
        ${rows.length
          ? html`<table class="table"><thead><tr><th>Customer</th><th>Last message</th><th>Bot</th></tr></thead>
              <tbody>${rows.map((r) => html`<tr>
                <td data-label="Customer"><a href="/c/${c.id}/conversations/${r.phone}">${r.customer_name || phoneLabel(r.phone)}</a>${r.customer_name ? html`<br><span class="muted">${phoneLabel(r.phone)}</span>` : ""}</td>
                <td data-label="Last message">${formatDateTime(r.updated_at, c.profile.utcOffsetMinutes)}</td>
                <td data-label="Bot">${r.paused_until > t ? html`<span class="badge warn">Paused, owner handling</span>` : r.opted_out ? html`<span class="badge">Opted out of reminders</span>` : "Active"}</td>
              </tr>`)}</tbody></table>`
          : html`<p class="empty card">No chats yet.</p>`}`,
    });
  });

  const describeTool = (block) => {
    const i = block.input ?? {};
    switch (block.name) {
      case "check_available_slots":
        return `Checked free times for ${i.date}`;
      case "book_appointment":
        return `Booked ${i.date} ${i.time} for ${i.customer_name}`;
      case "save_lead":
        return "Saved the enquiry";
      case "handoff_to_owner":
        return `Asked the owner to take over: ${i.reason}`;
      default:
        return block.name;
    }
  };

  function transcript(messages) {
    const items = [];
    for (const m of messages) {
      const blocks = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content ?? [];
      for (const b of blocks) {
        if (m.role === "user" && b.type === "text") {
          const match = b.text.match(/^\[([^\]]+)\]\n?([\s\S]*)$/);
          if (match) items.push({ kind: "time", text: match[1] });
          const body = match ? match[2] : b.text;
          if (body.trim()) items.push({ kind: "customer", text: body });
        } else if (m.role === "user" && b.type === "image") {
          items.push({ kind: "customer", text: "[Photo]" });
        } else if (m.role === "assistant" && b.type === "text" && b.text.trim()) {
          items.push({ kind: "bot", text: b.text });
        } else if (m.role === "assistant" && b.type === "tool_use") {
          items.push({ kind: "note", text: describeTool(b) });
        }
      }
    }
    return items;
  }

  router.get("/c/:clientId/conversations/:phone", ...clientPage, (req, res) => {
    const c = req.client;
    const phone = String(req.params.phone).replace(/\D/g, "");
    const conv = db.getConversation(c.id, phone);
    const paused = conv.pausedUntil > now().getTime();
    const items = transcript(conv.messages);
    send(req, res, {
      title: phoneLabel(phone),
      active: "conversations",
      body: html`<div class="head-row"><h1>${phoneLabel(phone)}</h1><a href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" class="btn">Open in WhatsApp</a></div>
        <p class="muted">Shows the current conversation (chats reset after 24 hours of silence). ${paused ? html`<strong>Bot is paused until ${formatDateTime(conv.pausedUntil, c.profile.utcOffsetMinutes)}.</strong>` : ""}</p>
        <div class="actions-row">
          ${paused
            ? html`<form method="post" action="/c/${c.id}/conversations/${phone}/resume">${csrfField(req.csrf)}<button class="btn">Resume bot</button></form>`
            : html`<form method="post" action="/c/${c.id}/conversations/${phone}/pause">${csrfField(req.csrf)}<button class="btn">Pause bot, I'll reply myself</button></form>`}
        </div>
        ${items.length
          ? html`<ol class="chat">${items.map((it) => html`<li class="msg ${it.kind}">${it.kind === "bot" ? whatsappText(it.text) : it.text}</li>`)}</ol>`
          : html`<p class="empty card">No messages in the current conversation.</p>`}
        <details class="card danger-zone">
          <summary>Delete this customer's data</summary>
          <p>Deletes the chat, leads and bookings for ${phoneLabel(phone)} (and their calendar events). Use this when a customer asks for their data to be erased. This cannot be undone.</p>
          <form method="post" action="/c/${c.id}/conversations/${phone}/delete" class="stack">
            ${csrfField(req.csrf)}
            <label class="check"><input type="checkbox" name="confirm" value="yes" required> I understand this permanently deletes this customer's data.</label>
            <button class="btn danger">Delete customer data</button>
          </form>
        </details>`,
    });
  });

  router.post("/c/:clientId/conversations/:phone/pause", ...clientPage, (req, res) => {
    const phone = String(req.params.phone).replace(/\D/g, "");
    db.setPausedUntil(req.client.id, phone, now().getTime() + HANDOFF_PAUSE_MS);
    audit(req, "bot_paused", phoneLabel(phone));
    res.redirect(303, `/c/${req.client.id}/conversations/${phone}?msg=paused`);
  });

  router.post("/c/:clientId/conversations/:phone/resume", ...clientPage, (req, res) => {
    const phone = String(req.params.phone).replace(/\D/g, "");
    db.setPausedUntil(req.client.id, phone, 0);
    audit(req, "bot_resumed", phoneLabel(phone));
    res.redirect(303, `/c/${req.client.id}/conversations/${phone}?msg=resumed`);
  });

  router.post("/c/:clientId/conversations/:phone/delete", ...clientPage, async (req, res) => {
    const phone = String(req.params.phone).replace(/\D/g, "");
    if (req.body.confirm !== "yes") return res.status(400).send("Please tick the confirmation box.");
    await services.deleteCustomer(req.client, phone);
    audit(req, "customer_data_deleted", phoneLabel(phone));
    res.redirect(303, `/c/${req.client.id}/conversations?msg=deleted`);
  });

  // ---------- Client: monthly report ----------

  router.get("/c/:clientId/report", ...clientPage, (req, res) => {
    const c = req.client;
    const current = describeNow(c.profile, now()).date.slice(0, 7);
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month ?? "") && req.query.month <= current ? req.query.month : current;
    const { from, to, next } = monthRange(c.profile, month);
    const s = stats(c, from, to);
    const leads = db.listLeads(c.id, { from, to });
    const byStatus = Object.fromEntries(LEAD_STATUSES.map((st) => [st, leads.filter((l) => l.status === st).length]));
    const bookings = db.listBookings(c.id, { fromDate: `${month}-01`, toDate: `${next}-01` });
    const done = bookings.filter((b) => b.status === "completed").length;
    send(req, res, {
      title: `Report ${monthLabel(month)}`,
      active: "report",
      body: html`<div class="head-row"><h1>${monthLabel(month)} report</h1>
          <div class="actions-row no-print">
            <a class="btn small" href="/c/${c.id}/report?month=${prevMonth(month)}">← ${monthLabel(prevMonth(month))}</a>
            ${month < current ? html`<a class="btn small" href="/c/${c.id}/report?month=${next}">${monthLabel(next)} →</a>` : ""}
            <button class="btn small" data-print>Print / save PDF</button>
          </div></div>
        <p class="muted">What the assistant did for ${c.name}${month === current ? " this month so far" : ""}.</p>
        ${statTiles(s)}
        <div class="two-col">
          <section class="card"><h2>Leads by status</h2>
            <table class="table compact"><tbody>${LEAD_STATUSES.map((st) => html`<tr><td>${st[0].toUpperCase() + st.slice(1)}</td><td class="num-cell">${byStatus[st]}</td></tr>`)}</tbody></table>
            <p class="muted">Mark leads as Won or Lost on the Leads page to see your conversion here.</p></section>
          <section class="card"><h2>Appointments in ${monthLabel(month)}</h2>
            <table class="table compact"><tbody>
              <tr><td>Scheduled</td><td class="num-cell">${bookings.length}</td></tr>
              <tr><td>Done</td><td class="num-cell">${done}</td></tr>
              <tr><td>No-show</td><td class="num-cell">${bookings.filter((b) => b.status === "no_show").length}</td></tr>
              <tr><td>Cancelled</td><td class="num-cell">${bookings.filter((b) => b.status === "cancelled").length}</td></tr>
            </tbody></table></section>
        </div>`,
    });
  });

  // ---------- Client: business settings (owner + admin) ----------

  const settingsPage = (req, { values, knowledgeText, errors = [] }) => {
    const c = req.client;
    const b = values.booking;
    const field = (name, label, value, attrs = "") => html`<label>${label} <input name="${name}" value="${value ?? ""}" ${raw(attrs)}></label>`;
    return html`<h1>Business settings</h1>
      <p class="muted">The assistant only knows what is written here. Changes apply to the next customer message.</p>
      ${errors.length ? html`<div class="flash error" role="alert"><strong>Please fix:</strong><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul></div>` : ""}
      <form method="post" action="/c/${c.id}/settings" class="stack">
        ${csrfField(req.csrf)}
        <section class="card stack"><h2>Business details</h2>
          ${field("name", "Business name", values.name, 'required maxlength="120"')}
          ${field("type", "What the business does", values.type, 'required maxlength="500"')}
          <div class="grid2">
            ${field("city", "City", values.city, 'required maxlength="120"')}
            ${field("phone", "Phone shown to customers", values.phone, 'required maxlength="40"')}
          </div>
          ${field("areasServed", "Areas served (comma separated)", (values.areasServed ?? []).join(", "), 'required maxlength="2000"')}
          ${field("address", "Address", values.address, 'maxlength="500"')}
          ${field("hoursText", "Opening hours (as customers should read them)", values.hoursText, 'required maxlength="200"')}
        </section>
        <section class="card stack"><h2>Appointments</h2>
          ${field("appointmentName", "What customers book", b.appointmentName, 'required maxlength="120"')}
          <fieldset><legend>Working days</legend><div class="days">
            ${DAY_NAMES.map((d, i) => html`<label class="check"><input type="checkbox" name="workingDays" value="${i}" ${b.workingDays.includes(i) ? raw("checked") : ""}> ${d}</label>`)}
          </div></fieldset>
          <div class="grid3">
            ${field("startTime", "First slot starts", b.startTime, 'type="time" required')}
            ${field("endTime", "Last slot ends by", b.endTime, 'type="time" required')}
            ${field("slotMinutes", "Slot length (minutes)", b.slotMinutes, 'type="number" min="15" max="480" required')}
            ${field("maxPerSlot", "Bookings per slot", b.maxPerSlot, 'type="number" min="1" max="50" required')}
            ${field("bookAheadDays", "Book up to (days ahead)", b.bookAheadDays, 'type="number" min="1" max="90" required')}
            ${field("minNoticeHours", "Minimum notice (hours)", b.minNoticeHours, 'type="number" min="0" max="72" required')}
          </div>
          ${field("requiredDetails", "Details to collect before booking (comma separated)", (b.requiredDetails ?? []).join(", "), 'required maxlength="1000"')}
        </section>
        <section class="card stack"><h2>Services, prices and FAQs</h2>
          <p class="muted">Edit carefully: this is the assistant's knowledge. Prices are quoted to customers only as these ranges.</p>
          <label><span class="sr-only">Services, prices and FAQs (JSON)</span>
            <textarea name="knowledge" rows="22" class="code" spellcheck="false" required>${knowledgeText}</textarea></label>
        </section>
        <div><button class="btn primary">Save settings</button></div>
      </form>`;
  };

  const knowledgeOf = (profile) => JSON.stringify(Object.fromEntries(KNOWLEDGE_KEYS.map((k) => [k, profile[k]])), null, 2);

  router.get("/c/:clientId/settings", ...clientPage, (req, res) => {
    send(req, res, { title: "Business settings", active: "settings", body: settingsPage(req, { values: req.client.profile, knowledgeText: knowledgeOf(req.client.profile) }) });
  });

  router.post("/c/:clientId/settings", ...clientPage, (req, res) => {
    const c = req.client;
    const f = req.body;
    const list = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const int = (s) => (/^\d+$/.test(String(s ?? "").trim()) ? Number(s) : NaN);
    const days = [].concat(f.workingDays ?? []).map(Number).filter((d) => Number.isInteger(d));
    let knowledge = {};
    const errors = [];
    try {
      knowledge = JSON.parse(f.knowledge ?? "");
      if (!knowledge || typeof knowledge !== "object" || Array.isArray(knowledge)) throw new Error();
    } catch {
      errors.push("Services, prices and FAQs must be valid JSON.");
    }
    const candidate = {
      ...c.profile,
      ...Object.fromEntries(KNOWLEDGE_KEYS.filter((k) => k in knowledge).map((k) => [k, knowledge[k]])),
      name: String(f.name ?? "").trim(),
      type: String(f.type ?? "").trim(),
      city: String(f.city ?? "").trim(),
      phone: String(f.phone ?? "").trim(),
      areasServed: list(f.areasServed),
      address: String(f.address ?? "").trim(),
      hoursText: String(f.hoursText ?? "").trim(),
      booking: {
        ...c.profile.booking,
        appointmentName: String(f.appointmentName ?? "").trim(),
        workingDays: [...new Set(days)].sort(),
        startTime: String(f.startTime ?? ""),
        endTime: String(f.endTime ?? ""),
        slotMinutes: int(f.slotMinutes),
        maxPerSlot: int(f.maxPerSlot),
        bookAheadDays: int(f.bookAheadDays),
        minNoticeHours: int(f.minNoticeHours),
        requiredDetails: list(f.requiredDetails),
      },
    };
    const result = errors.length ? { ok: false, errors } : validateProfile(candidate);
    if (!result.ok) {
      return send(req, res, { status: 400, title: "Business settings", active: "settings", body: settingsPage(req, { values: candidate, knowledgeText: f.knowledge ?? "", errors: result.errors }) });
    }
    db.updateClient(c.id, { name: result.profile.name, profile: result.profile });
    services.invalidate(c.id);
    audit(req, "profile_updated");
    res.redirect(303, `/c/${c.id}/settings?msg=saved`);
  });

  // ---------- Client: integrations (admin only) ----------

  const integrationsPage = (req, { errors = [] } = {}) => {
    const c = req.client;
    const s = c.settings;
    const hookUrl = s.missedCall?.token ? `${publicUrl}/hooks/missed-call/${c.id}/${s.missedCall.token}` : "";
    return html`<h1>Integrations</h1>
      <p class="muted">Only admins see this page. Templates must be approved in Meta's WhatsApp Manager first; see docs/whatsapp-templates.md.</p>
      ${errors.length ? html`<div class="flash error" role="alert"><strong>Please fix:</strong><ul>${errors.map((e) => html`<li>${e}</li>`)}</ul></div>` : ""}
      <form method="post" action="/c/${c.id}/integrations" class="stack">
        ${csrfField(req.csrf)}
        <section class="card stack"><h2>Status</h2>
          <label class="check"><input type="checkbox" name="active" value="1" ${c.active ? raw("checked") : ""}> Assistant is active for this client</label>
        </section>
        <section class="card stack"><h2>WhatsApp</h2>
          <label>Phone number ID <input name="waPhoneNumberId" value="${c.wa_phone_number_id ?? ""}" inputmode="numeric" maxlength="40">
            <span class="hint">From Meta: WhatsApp > API setup. Messages to this number are answered for this client.</span></label>
          <label>Access token <input name="waToken" type="password" autocomplete="off" placeholder="${c.wa_token_enc ? "Saved (leave blank to keep)" : "Leave blank to use the server's default token"}">
            <span class="hint">Stored encrypted. Only needed if this client's number is in a different WhatsApp Business account.</span></label>
          ${c.wa_token_enc ? html`<label class="check"><input type="checkbox" name="clearToken" value="1"> Remove saved token</label>` : ""}
          <label>Owner's WhatsApp for alerts <input name="ownerWhatsapp" value="${s.ownerWhatsapp}" inputmode="numeric" placeholder="919876543210" maxlength="15"></label>
        </section>
        <section class="card stack"><h2>Message templates</h2>
          <p class="muted">Leave a name blank to turn that message off.</p>
          ${TEMPLATE_KEYS.map(({ key, label, params }) => html`<div class="grid2">
            <label>${label} template name <input name="tpl_${key}_name" value="${s.templates?.[key]?.name ?? ""}" pattern="[a-z0-9_]+" maxlength="512"><span class="hint">${params}</span></label>
            <label>Language code <input name="tpl_${key}_lang" value="${s.templates?.[key]?.language ?? (key === "ownerAlert" ? "en" : "hi")}" maxlength="6"></label>
          </div>`)}
          <label>Send reminders this many hours before <input name="reminderHoursBefore" type="number" min="1" max="72" value="${s.reminderHoursBefore}"></label>
        </section>
        <section class="card stack"><h2>Google Calendar</h2>
          ${services.calendarEmail
            ? html`<p>Ask the owner to share their Google Calendar with <code>${services.calendarEmail}</code> ("Make changes to events"), then paste the calendar ID below (Calendar settings > Integrate calendar).</p>`
            : html`<p class="muted">Calendar sync is off on this server: set GOOGLE_SERVICE_ACCOUNT_FILE (see docs/setup.md).</p>`}
          <label>Calendar ID <input name="calendarId" value="${s.calendarId}" maxlength="300" placeholder="name@gmail.com"></label>
        </section>
        <section class="card stack"><h2>Missed calls</h2>
          <p>Set your phone provider to call this URL when a call is missed (GET or POST):</p>
          ${hookUrl ? html`<p><code class="secret">${hookUrl}</code></p>` : ""}
          <label>Field that holds the caller's number <input name="callerField" value="${s.missedCall?.callerField ?? "CallFrom"}" maxlength="64">
            <span class="hint">Exotel sends CallFrom. Check your provider's documentation for theirs.</span></label>
          <label class="check"><input type="checkbox" name="newHookToken" value="1"> Generate a new secret URL (the old one stops working)</label>
        </section>
        <section class="card stack"><h2>Data retention</h2>
          <div class="grid2">
            <label>Delete chats after (days) <input name="conversationDays" type="number" min="30" max="3650" value="${s.retention?.conversationDays}"></label>
            <label>Delete leads and past bookings after (days) <input name="recordDays" type="number" min="30" max="3650" value="${s.retention?.recordDays}"></label>
          </div>
        </section>
        <div><button class="btn primary">Save integrations</button></div>
      </form>`;
  };

  router.get("/c/:clientId/integrations", ...clientAdmin, (req, res) =>
    send(req, res, { title: "Integrations", active: "integrations", body: integrationsPage(req) }),
  );

  router.post("/c/:clientId/integrations", ...clientAdmin, (req, res) => {
    const c = req.client;
    const f = req.body;
    const templates = {};
    for (const { key } of TEMPLATE_KEYS) {
      const name = String(f[`tpl_${key}_name`] ?? "").trim();
      if (name) templates[key] = { name, language: String(f[`tpl_${key}_lang`] ?? "").trim() };
    }
    const candidate = {
      ...c.settings,
      ownerWhatsapp: String(f.ownerWhatsapp ?? "").replace(/\D/g, ""),
      reminderHoursBefore: Number(f.reminderHoursBefore),
      calendarId: String(f.calendarId ?? "").trim(),
      templates,
      missedCall: { callerField: String(f.callerField ?? "").trim(), token: f.newHookToken === "1" || !c.settings.missedCall?.token ? randomToken(18) : c.settings.missedCall.token },
      retention: { conversationDays: Number(f.conversationDays), recordDays: Number(f.recordDays) },
    };
    const result = validateSettings(candidate);
    const errors = result.ok ? [] : [...result.errors];
    const phoneNumberId = String(f.waPhoneNumberId ?? "").trim();
    if (phoneNumberId && !/^\d{5,40}$/.test(phoneNumberId)) errors.push("Phone number ID must be digits.");
    if (phoneNumberId && db.listClients().some((x) => x.wa_phone_number_id === phoneNumberId && x.id !== c.id)) errors.push("That phone number ID is already used by another client.");
    if (errors.length) return send(req, res, { status: 400, title: "Integrations", active: "integrations", body: integrationsPage(req, { errors }) });

    const token = String(f.waToken ?? "").trim();
    db.updateClient(c.id, {
      active: f.active === "1",
      settings: result.settings,
      waPhoneNumberId: phoneNumberId,
      waTokenEnc: token ? cipher.encrypt(token) : f.clearToken === "1" ? null : undefined,
    });
    services.invalidate(c.id);
    audit(req, "integrations_updated", token ? "WhatsApp token changed" : "");
    res.redirect(303, `/c/${c.id}/integrations?msg=saved`);
  });

  return router;
}

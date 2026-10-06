// SQLite database (built into Node) and every query the app runs.
// All customer data is keyed by client_id; callers always pass the client.

import { DatabaseSync } from "node:sqlite";

const MIGRATIONS = [
  `
  CREATE TABLE clients (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    wa_phone_number_id TEXT UNIQUE,
    wa_token_enc TEXT,
    profile TEXT NOT NULL,
    settings TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'owner')),
    client_id INTEGER REFERENCES clients(id),
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER,
    CHECK ((role = 'admin' AND client_id IS NULL) OR (role = 'owner' AND client_id IS NOT NULL))
  );
  CREATE TABLE sessions (
    id_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    phone TEXT NOT NULL,
    messages TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL DEFAULT 0,
    paused_until INTEGER NOT NULL DEFAULT 0,
    opted_out INTEGER NOT NULL DEFAULT 0,
    UNIQUE (client_id, phone)
  );
  CREATE TABLE leads (
    id TEXT PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    phone TEXT NOT NULL,
    source TEXT NOT NULL,
    customer_name TEXT NOT NULL DEFAULT '',
    area TEXT NOT NULL DEFAULT '',
    property_type TEXT NOT NULL DEFAULT '',
    service_interest TEXT NOT NULL DEFAULT '',
    requirement_details TEXT NOT NULL DEFAULT '',
    budget TEXT NOT NULL DEFAULT '',
    timeline TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'lost')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX leads_client ON leads (client_id, created_at);
  CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    address TEXT NOT NULL,
    service_interest TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled', 'no_show')),
    calendar_event_id TEXT,
    reminder_sent_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX bookings_client_date ON bookings (client_id, date, time);
  CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    type TEXT NOT NULL,
    phone TEXT,
    at INTEGER NOT NULL
  );
  CREATE INDEX events_client_at ON events (client_id, at);
  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    client_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    ip TEXT,
    at INTEGER NOT NULL
  );
  `,
];

const json = (value) => JSON.stringify(value ?? {});
const parseClient = (row) => row && { ...row, active: !!row.active, profile: JSON.parse(row.profile), settings: JSON.parse(row.settings) };
const LEAD_FIELDS = ["customer_name", "area", "property_type", "service_interest", "requirement_details", "budget", "timeline"];
const BOOKING_UPDATABLE = ["status", "calendar_event_id", "reminder_sent_at"];
const OPEN_LEAD_WINDOW_MS = 30 * 86_400_000;

export function openDb(file = ":memory:") {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const version = db.prepare("PRAGMA user_version").get().user_version;
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    db.exec(MIGRATIONS[v]);
    db.exec(`PRAGMA user_version = ${v + 1}`);
    db.exec("COMMIT");
  }
  return createRepo(db);
}

function createRepo(db) {
  const q = (sql) => db.prepare(sql);
  const id = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

  function transaction(fn) {
    db.exec("BEGIN");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  return {
    close: () => db.close(),
    backupTo: (file) => db.exec(`VACUUM INTO '${String(file).replaceAll("'", "''")}'`),

    // Clients
    createClient({ slug, name, profile, settings = {}, waPhoneNumberId = null, waTokenEnc = null, now = Date.now() }) {
      const r = q(
        "INSERT INTO clients (slug, name, profile, settings, wa_phone_number_id, wa_token_enc, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(slug, name, json(profile), json(settings), waPhoneNumberId || null, waTokenEnc, now);
      return Number(r.lastInsertRowid);
    },
    getClient: (clientId) => parseClient(q("SELECT * FROM clients WHERE id = ?").get(clientId)),
    getClientByPhoneNumberId: (phoneNumberId) =>
      parseClient(q("SELECT * FROM clients WHERE wa_phone_number_id = ? AND active = 1").get(phoneNumberId)),
    listClients: () => q("SELECT * FROM clients ORDER BY name").all().map(parseClient),
    updateClient(clientId, { name, active, profile, settings, waPhoneNumberId, waTokenEnc }) {
      const current = q("SELECT * FROM clients WHERE id = ?").get(clientId);
      if (!current) throw new Error("Client not found");
      q(
        "UPDATE clients SET name = ?, active = ?, profile = ?, settings = ?, wa_phone_number_id = ?, wa_token_enc = ? WHERE id = ?",
      ).run(
        name ?? current.name,
        active === undefined ? current.active : active ? 1 : 0,
        profile === undefined ? current.profile : json(profile),
        settings === undefined ? current.settings : json(settings),
        waPhoneNumberId === undefined ? current.wa_phone_number_id : waPhoneNumberId || null,
        waTokenEnc === undefined ? current.wa_token_enc : waTokenEnc,
        clientId,
      );
    },

    // Users and sessions
    createUser({ email, name, passwordHash, role, clientId = null, now = Date.now() }) {
      const r = q("INSERT INTO users (email, name, password_hash, role, client_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
        email.trim().toLowerCase(),
        name,
        passwordHash,
        role,
        clientId,
        now,
      );
      return Number(r.lastInsertRowid);
    },
    getUser: (userId) => q("SELECT * FROM users WHERE id = ?").get(userId),
    getUserByEmail: (email) => q("SELECT * FROM users WHERE email = ?").get(String(email).trim().toLowerCase()),
    listUsers: () =>
      q("SELECT u.*, c.name AS client_name FROM users u LEFT JOIN clients c ON c.id = u.client_id ORDER BY u.role, u.email").all(),
    setUserPassword: (userId, passwordHash) => q("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId),
    setUserActive: (userId, active) => q("UPDATE users SET active = ? WHERE id = ?").run(active ? 1 : 0, userId),
    touchLogin: (userId, now = Date.now()) => q("UPDATE users SET last_login_at = ? WHERE id = ?").run(now, userId),

    createSession: ({ idHash, userId, csrf, now, expiresAt }) =>
      q("INSERT INTO sessions (id_hash, user_id, csrf, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(idHash, userId, csrf, now, expiresAt),
    getSession: (idHash, now = Date.now()) =>
      q(
        `SELECT s.csrf, s.expires_at, u.id, u.email, u.name, u.role, u.client_id
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id_hash = ? AND s.expires_at > ? AND u.active = 1`,
      ).get(idHash, now),
    deleteSession: (idHash) => q("DELETE FROM sessions WHERE id_hash = ?").run(idHash),
    deleteUserSessions: (userId) => q("DELETE FROM sessions WHERE user_id = ?").run(userId),
    purgeExpiredSessions: (now = Date.now()) => q("DELETE FROM sessions WHERE expires_at <= ?").run(now),

    // Conversations
    getConversation(clientId, phone) {
      const row = q("SELECT * FROM conversations WHERE client_id = ? AND phone = ?").get(clientId, phone);
      return row
        ? { messages: JSON.parse(row.messages), updatedAt: row.updated_at, pausedUntil: row.paused_until, optedOut: !!row.opted_out }
        : { messages: [], updatedAt: 0, pausedUntil: 0, optedOut: false };
    },
    saveConversation(clientId, phone, { messages, updatedAt, pausedUntil }) {
      q(
        `INSERT INTO conversations (client_id, phone, messages, updated_at, paused_until) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (client_id, phone) DO UPDATE SET messages = excluded.messages, updated_at = excluded.updated_at, paused_until = excluded.paused_until`,
      ).run(clientId, phone, JSON.stringify(messages), updatedAt, pausedUntil);
    },
    setPausedUntil(clientId, phone, pausedUntil) {
      q(
        `INSERT INTO conversations (client_id, phone, paused_until) VALUES (?, ?, ?)
         ON CONFLICT (client_id, phone) DO UPDATE SET paused_until = excluded.paused_until`,
      ).run(clientId, phone, pausedUntil);
    },
    setOptedOut(clientId, phone, optedOut) {
      q(
        `INSERT INTO conversations (client_id, phone, opted_out) VALUES (?, ?, ?)
         ON CONFLICT (client_id, phone) DO UPDATE SET opted_out = excluded.opted_out`,
      ).run(clientId, phone, optedOut ? 1 : 0);
    },
    isOptedOut: (clientId, phone) => !!q("SELECT opted_out FROM conversations WHERE client_id = ? AND phone = ?").get(clientId, phone)?.opted_out,
    listConversations: (clientId, limit = 200) =>
      q(
        `SELECT c.phone, c.updated_at, c.paused_until, c.opted_out,
                (SELECT customer_name FROM leads l WHERE l.client_id = c.client_id AND l.phone = c.phone ORDER BY created_at DESC LIMIT 1) AS customer_name
         FROM conversations c WHERE c.client_id = ? AND c.updated_at > 0 ORDER BY c.updated_at DESC LIMIT ?`,
      ).all(clientId, limit),

    // Leads: a returning customer within 30 days updates their open lead instead of creating a new one
    upsertLead(clientId, phone, fields, source, now = Date.now()) {
      const values = LEAD_FIELDS.map((f) => String(fields[f] ?? "").slice(0, 500));
      const open = q(
        "SELECT id FROM leads WHERE client_id = ? AND phone = ? AND status IN ('new', 'contacted') AND created_at > ? ORDER BY created_at DESC LIMIT 1",
      ).get(clientId, phone, now - OPEN_LEAD_WINDOW_MS);
      if (open) {
        // Keep earlier details when the new call leaves a field blank.
        const sets = LEAD_FIELDS.map((f) => `${f} = CASE WHEN ? = '' THEN ${f} ELSE ? END`).join(", ");
        q(`UPDATE leads SET ${sets}, updated_at = ? WHERE id = ?`).run(...values.flatMap((v) => [v, v]), now, open.id);
        return { id: open.id, created: false };
      }
      const leadId = id("L");
      q(
        `INSERT INTO leads (id, client_id, phone, source, ${LEAD_FIELDS.join(", ")}, created_at, updated_at)
         VALUES (?, ?, ?, ?, ${LEAD_FIELDS.map(() => "?").join(", ")}, ?, ?)`,
      ).run(leadId, clientId, phone, source, ...values, now, now);
      return { id: leadId, created: true };
    },
    listLeads(clientId, { status, from, to } = {}) {
      let sql = "SELECT * FROM leads WHERE client_id = ?";
      const args = [clientId];
      if (status) (sql += " AND status = ?"), args.push(status);
      if (from) (sql += " AND created_at >= ?"), args.push(from);
      if (to) (sql += " AND created_at < ?"), args.push(to);
      return q(`${sql} ORDER BY created_at DESC`).all(...args);
    },
    setLeadStatus: (clientId, leadId, status, now = Date.now()) =>
      q("UPDATE leads SET status = ?, updated_at = ? WHERE client_id = ? AND id = ?").run(status, now, clientId, leadId).changes,

    // Bookings
    addBooking(clientId, booking, now = Date.now()) {
      const bookingId = id("B");
      q(
        `INSERT INTO bookings (id, client_id, phone, customer_name, date, time, address, service_interest, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        bookingId,
        clientId,
        booking.phone,
        booking.customer_name,
        booking.date,
        booking.time,
        booking.address,
        booking.service_interest,
        booking.notes ?? "",
        now,
        now,
      );
      return bookingId;
    },
    activeBookings: (clientId, fromDate) =>
      q("SELECT * FROM bookings WHERE client_id = ? AND status = 'booked' AND date >= ?").all(clientId, fromDate),
    getBooking: (clientId, bookingId) => q("SELECT * FROM bookings WHERE client_id = ? AND id = ?").get(clientId, bookingId),
    listBookings(clientId, { fromDate, toDate, status } = {}) {
      let sql = "SELECT * FROM bookings WHERE client_id = ?";
      const args = [clientId];
      if (fromDate) (sql += " AND date >= ?"), args.push(fromDate);
      if (toDate) (sql += " AND date < ?"), args.push(toDate);
      if (status) (sql += " AND status = ?"), args.push(status);
      return q(`${sql} ORDER BY date, time`).all(...args);
    },
    updateBooking(clientId, bookingId, fields, now = Date.now()) {
      const keys = Object.keys(fields).filter((k) => BOOKING_UPDATABLE.includes(k));
      if (!keys.length) return 0;
      return q(`UPDATE bookings SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE client_id = ? AND id = ?`).run(
        ...keys.map((k) => fields[k]),
        now,
        clientId,
        bookingId,
      ).changes;
    },
    bookingsAwaitingReminder: (fromDate, toDate) =>
      q("SELECT * FROM bookings WHERE status = 'booked' AND reminder_sent_at IS NULL AND date >= ? AND date <= ?").all(fromDate, toDate),

    // Activity counts for reports
    logEvent: (clientId, type, phone = null, at = Date.now()) =>
      q("INSERT INTO events (client_id, type, phone, at) VALUES (?, ?, ?, ?)").run(clientId, type, phone, at),
    countEvents(clientId, from, to) {
      const rows = q("SELECT type, COUNT(*) AS n FROM events WHERE client_id = ? AND at >= ? AND at < ? GROUP BY type").all(clientId, from, to);
      return Object.fromEntries(rows.map((r) => [r.type, r.n]));
    },
    hasRecentEvent: (clientId, type, phone, since) =>
      !!q("SELECT 1 FROM events WHERE client_id = ? AND type = ? AND phone = ? AND at >= ? LIMIT 1").get(clientId, type, phone, since),
    countCustomers: (clientId, from, to) =>
      q("SELECT COUNT(DISTINCT phone) AS n FROM events WHERE client_id = ? AND type = 'message_in' AND at >= ? AND at < ?").get(clientId, from, to).n,

    // Audit trail of dashboard actions
    audit: ({ userId = null, clientId = null, action, detail = "", ip = null, at = Date.now() }) =>
      q("INSERT INTO audit_log (user_id, client_id, action, detail, ip, at) VALUES (?, ?, ?, ?, ?, ?)").run(userId, clientId, action, detail, ip, at),
    listAudit: (clientId, limit = 100) =>
      clientId
        ? q("SELECT a.*, u.email FROM audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE a.client_id = ? ORDER BY a.at DESC LIMIT ?").all(clientId, limit)
        : q("SELECT a.*, u.email FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.at DESC LIMIT ?").all(limit),

    // Privacy: delete everything held about one customer of one client
    deleteCustomerData(clientId, phone) {
      return transaction(() => {
        const bookings = q("SELECT id, calendar_event_id FROM bookings WHERE client_id = ? AND phone = ?").all(clientId, phone);
        q("DELETE FROM conversations WHERE client_id = ? AND phone = ?").run(clientId, phone);
        q("DELETE FROM leads WHERE client_id = ? AND phone = ?").run(clientId, phone);
        q("DELETE FROM bookings WHERE client_id = ? AND phone = ?").run(clientId, phone);
        q("UPDATE events SET phone = NULL WHERE client_id = ? AND phone = ?").run(clientId, phone);
        return bookings;
      });
    },

    // Retention: chats are cleared after the client's retention period; leads and bookings after theirs
    purgeOldData(clientId, { conversationsBefore, recordsBefore }) {
      return transaction(() => ({
        conversations: q("DELETE FROM conversations WHERE client_id = ? AND updated_at > 0 AND updated_at < ? AND opted_out = 0").run(clientId, conversationsBefore).changes +
          q("UPDATE conversations SET messages = '[]' WHERE client_id = ? AND updated_at < ? AND opted_out = 1").run(clientId, conversationsBefore).changes,
        leads: q("DELETE FROM leads WHERE client_id = ? AND updated_at < ?").run(clientId, recordsBefore).changes,
        bookings: q("DELETE FROM bookings WHERE client_id = ? AND updated_at < ? AND status != 'booked'").run(clientId, recordsBefore).changes,
        events: q("UPDATE events SET phone = NULL WHERE client_id = ? AND at < ?").run(clientId, recordsBefore).changes,
      }));
    },
  };
}

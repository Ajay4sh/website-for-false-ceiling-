// Dashboard sign-in: password check, session cookies, CSRF tokens and access rules.
// Admins see every client; an owner sees only their own client.

import { createRateLimiter, randomToken, safeEqual, sha256, verifyPassword } from "../security.js";

const SESSION_DAYS = 7;
const COOKIE = "sid";

export function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function createAuth({ db, secureCookies = true, now = () => Date.now() }) {
  // Only failed attempts count: 5 per email and 20 per IP address in 15 minutes.
  const emailLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });
  const ipLimiter = createRateLimiter({ limit: 20, windowMs: 15 * 60_000 });

  const cookie = (value, maxAgeSeconds) =>
    [`${COOKIE}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`, secureCookies ? "Secure" : ""].filter(Boolean).join("; ");

  function startSession(res, userId) {
    const token = randomToken();
    const t = now();
    db.createSession({ idHash: sha256(token), userId, csrf: randomToken(24), now: t, expiresAt: t + SESSION_DAYS * 86_400_000 });
    db.touchLogin(userId, t);
    res.setHeader("Set-Cookie", cookie(token, SESSION_DAYS * 86_400));
  }

  // Returns the user on success, or an error message. Failures are rate limited per IP and per email.
  function attemptLogin(email, password, ip) {
    const emailKey = String(email ?? "").trim().toLowerCase();
    if (emailLimiter.blocked(emailKey, now()) || ipLimiter.blocked(ip, now())) return { error: "Too many attempts. Please wait 15 minutes and try again." };
    const user = db.getUserByEmail(email ?? "");
    // Hash even when the user doesn't exist, so response time doesn't reveal which emails are registered.
    const ok = verifyPassword(String(password ?? ""), user?.password_hash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA") && user?.active;
    if (!ok) {
      emailLimiter.hit(emailKey, now());
      ipLimiter.hit(ip, now());
      return { error: "Email or password is incorrect." };
    }
    emailLimiter.reset(emailKey);
    return { user };
  }

  // Attaches req.user and req.csrf when a valid session cookie is present.
  function sessionMiddleware(req, _res, next) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) {
      const session = db.getSession(sha256(token), now());
      if (session) {
        req.user = { id: session.id, email: session.email, name: session.name, role: session.role, clientId: session.client_id };
        req.csrf = session.csrf;
        req.sessionHash = sha256(token);
      }
    }
    next();
  }

  function endSession(req, res) {
    if (req.sessionHash) db.deleteSession(req.sessionHash);
    res.setHeader("Set-Cookie", cookie("", 0));
  }

  const requireUser = (req, res, next) => (req.user ? next() : res.redirect(303, "/login"));
  const requireAdmin = (req, res, next) => (req.user?.role === "admin" ? next() : res.status(404).send("Not found"));

  // Every state-changing request must carry the session's CSRF token.
  function requireCsrf(req, res, next) {
    if (req.method === "POST" && !safeEqual(req.body?._csrf, req.csrf)) {
      res.status(403).send("This form has expired. Go back, reload the page and try again.");
      return;
    }
    next();
  }

  // Loads req.client from :clientId and enforces tenant isolation.
  function requireClientAccess(req, res, next) {
    const clientId = Number(req.params.clientId);
    const allowed = req.user.role === "admin" || req.user.clientId === clientId;
    const client = allowed && Number.isInteger(clientId) ? db.getClient(clientId) : null;
    if (!client) {
      res.status(404).send("Not found");
      return;
    }
    req.client = client;
    next();
  }

  return { attemptLogin, startSession, endSession, sessionMiddleware, requireUser, requireAdmin, requireCsrf, requireClientAccess };
}

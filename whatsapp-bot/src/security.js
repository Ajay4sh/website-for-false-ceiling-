// Password hashing, secret encryption and random tokens, all from node:crypto.

import crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };
export const MIN_PASSWORD_LENGTH = 10;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password, stored) {
  const [scheme, saltB64, hashB64] = String(stored ?? "").split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, SCRYPT_OPTIONS);
  return crypto.timingSafeEqual(actual, expected);
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ""));
  const right = Buffer.from(String(b ?? ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// AES-256-GCM for secrets kept in the database (client WhatsApp tokens).
// The key comes from APP_ENCRYPTION_KEY: 32 random bytes, base64-encoded.
export function createCipher(base64Key) {
  const key = Buffer.from(base64Key ?? "", "base64");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes, base64-encoded (run: npm run manage -- gen-key)");

  return {
    encrypt(plaintext) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
    },
    decrypt(stored) {
      const [version, iv, tag, data] = stored.split(":");
      if (version !== "v1") throw new Error("Unknown secret format");
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
      decipher.setAuthTag(Buffer.from(tag, "base64"));
      return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
    },
  };
}

// Fixed-window limiter kept in memory; enough for one server process.
export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map();
  const current = (key, now) => {
    const entry = hits.get(key);
    return entry && now - entry.start <= windowMs ? entry : null;
  };
  const hit = (key, now = Date.now()) => {
    const entry = current(key, now);
    if (entry) return ++entry.count;
    hits.set(key, { start: now, count: 1 });
    if (hits.size > 10_000) hits.delete(hits.keys().next().value);
    return 1;
  };
  return {
    hit,
    blocked: (key, now = Date.now()) => (current(key, now)?.count ?? 0) >= limit,
    // Counts this request and reports whether the limit is now exceeded.
    tooMany: (key, now = Date.now()) => hit(key, now) > limit,
    reset: (key) => hits.delete(key),
  };
}

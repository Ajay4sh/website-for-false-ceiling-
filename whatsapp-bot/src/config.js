import fs from "node:fs";

// Reads settings from environment variables (see .env.example).
// `required` lists the variables this entry point cannot run without.
export function loadConfig(env = process.env, required = []) {
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    console.error(`Missing settings in .env: ${missing.join(", ")}. See .env.example.`);
    process.exit(1);
  }
  const publicUrl = (env.PUBLIC_URL ?? `http://localhost:${env.PORT ?? 3000}`).replace(/\/+$/, "");
  return {
    productName: env.PRODUCT_NAME || "BookBot",
    publicUrl,
    port: Number(env.PORT ?? 3000),
    dbFile: env.DB_FILE || "data/bookbot.db",
    trustProxy: env.TRUST_PROXY === "true",
    secureCookies: env.COOKIE_SECURE ? env.COOKIE_SECURE !== "false" : publicUrl.startsWith("https://"),
    model: env.CLAUDE_MODEL || undefined,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    googleServiceAccountFile: env.GOOGLE_SERVICE_ACCOUNT_FILE || null,
    whatsapp: {
      token: env.WHATSAPP_TOKEN,
      apiVersion: env.WHATSAPP_API_VERSION || undefined,
      verifyToken: env.WHATSAPP_VERIFY_TOKEN,
      appSecret: env.WHATSAPP_APP_SECRET,
    },
  };
}

export const loadJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

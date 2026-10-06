// Starts the production server: database, WhatsApp webhooks, dashboard and background jobs.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createApp } from "./app.js";
import { createAuth } from "./dashboard/auth.js";
import { createCalendar } from "./calendar.js";
import { loadConfig, loadJson } from "./config.js";
import { openDb } from "./db.js";
import { startJobs } from "./jobs.js";
import { createCipher } from "./security.js";
import { createServices } from "./services.js";

const config = loadConfig(process.env, [
  "ANTHROPIC_API_KEY",
  "APP_ENCRYPTION_KEY",
  "PUBLIC_URL",
  "WHATSAPP_TOKEN",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
]);

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
const db = openDb(config.dbFile);
const cipher = createCipher(config.encryptionKey);
const calendar = config.googleServiceAccountFile ? createCalendar({ serviceAccount: loadJson(config.googleServiceAccountFile) }) : null;
const services = createServices({
  db,
  cipher,
  anthropic: new Anthropic(),
  model: config.model,
  calendar,
  whatsappDefaults: { token: config.whatsapp.token, apiVersion: config.whatsapp.apiVersion },
});
const auth = createAuth({ db, secureCookies: config.secureCookies });
const app = createApp({ db, services, auth, cipher, config });

const server = app.listen(config.port, () => {
  console.log(`${config.productName} running on port ${config.port} (${config.publicUrl})`);
  if (!db.listUsers().length) console.log("No logins yet. Create one with: npm run manage -- create-admin you@example.com \"Your Name\"");
});
const stopJobs = startJobs({ db, services });

function shutdown() {
  stopJobs();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Assembles the web app: security headers, static files, webhooks and the dashboard.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWebhookRouter } from "./webhooks.js";
import { createDashboard } from "./dashboard/routes.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "..", "public");
const EXAMPLE_PROFILE = path.join(here, "..", "businesses", "ceilcraft.json");

function securityHeaders(secure) {
  return (_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (secure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  };
}

export function createApp({ db, services, auth, cipher, config, now = () => new Date() }) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);
  app.use(securityHeaders(config.secureCookies));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/robots.txt", (_req, res) => res.type("text/plain").send("User-agent: *\nDisallow: /\n"));
  app.use("/static", express.static(PUBLIC_DIR, { maxAge: "1h", index: false }));

  app.use(
    createWebhookRouter({
      db,
      services,
      verifyToken: config.whatsapp.verifyToken,
      appSecret: config.whatsapp.appSecret,
      now,
    }),
  );
  app.use(
    createDashboard({
      db,
      services,
      auth,
      cipher,
      product: config.productName,
      publicUrl: config.publicUrl,
      exampleProfileFile: EXAMPLE_PROFILE,
      now,
    }),
  );

  app.use((_req, res) => res.status(404).type("text/plain").send("Not found"));
  app.use((err, _req, res, _next) => {
    console.error("Request failed:", err);
    res.status(err.status && err.status < 500 ? err.status : 500).type("text/plain").send(err.status === 413 ? "Too large" : "Something went wrong");
  });
  return app;
}

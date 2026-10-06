// Web server that receives WhatsApp messages from Meta and replies with the AI assistant.

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createAgent, FALLBACK_REPLY } from "./agent.js";
import { createStore } from "./store.js";
import { createWhatsApp, extractMessages, isValidSignature } from "./whatsapp.js";
import { dataFile, loadBusiness, requireEnv } from "./config.js";

const env = requireEnv(
  "ANTHROPIC_API_KEY",
  "WHATSAPP_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
);

const NON_TEXT_REPLY =
  "Dhanyavaad! Main abhi sirf text messages padh sakta hoon. Kripya apni requirement likh kar bhejiye.";

const business = loadBusiness();
const store = createStore(dataFile(business));
const whatsapp = createWhatsApp({
  token: env.WHATSAPP_TOKEN,
  phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
  apiVersion: process.env.WHATSAPP_API_VERSION || undefined,
});
const agent = createAgent({
  client: new Anthropic(),
  model: process.env.CLAUDE_MODEL || undefined,
  business,
  store,
  notifyOwner: (message) => whatsapp.sendText(business.ownerWhatsapp, message),
});

// Meta retries webhooks, so remember recent message ids and skip repeats.
const seen = new Set();
function isDuplicate(id) {
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 5000) seen.delete(seen.values().next().value);
  return false;
}

// Handle one customer's messages in order, so their chat history never interleaves.
const queues = new Map();
function enqueue(message) {
  const previous = queues.get(message.from) ?? Promise.resolve();
  const next = previous.then(() => handle(message));
  queues.set(message.from, next);
  next.finally(() => {
    if (queues.get(message.from) === next) queues.delete(message.from);
  });
}

async function handle({ from, type, text }) {
  try {
    if (type !== "text") {
      await whatsapp.sendText(from, NON_TEXT_REPLY);
      return;
    }
    const { reply } = await agent.reply(from, text);
    if (reply) await whatsapp.sendText(from, reply);
  } catch (err) {
    console.error(`Failed to handle message from ${from}:`, err);
    await whatsapp.sendText(from, FALLBACK_REPLY).catch(() => {});
  }
}

const app = express();

// Meta calls this once when you save the webhook URL in the dashboard.
app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!isValidSignature(req.body, req.get("x-hub-signature-256"), env.WHATSAPP_APP_SECRET)) {
    res.sendStatus(401);
    return;
  }
  res.sendStatus(200); // answer Meta at once; replies are sent separately

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return;
  }
  for (const message of extractMessages(payload)) {
    if (!isDuplicate(message.id)) enqueue(message);
  }
});

app.get("/health", (_req, res) => res.json({ ok: true, business: business.name }));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`${business.name} WhatsApp bot listening on port ${port}`));

// Incoming traffic from outside: WhatsApp messages (from Meta) and missed calls
// (from any phone provider that can call a URL).

import express from "express";
import { FALLBACK_REPLY } from "./agent.js";
import { extractMessages, isValidSignature } from "./whatsapp.js";
import { createRateLimiter, safeEqual } from "./security.js";

const DAY = 86_400_000;
const MISSED_CALL_REPEAT_WINDOW = 6 * 3600_000;

export const NON_TEXT_REPLY =
  "Dhanyavaad! Main abhi sirf text messages aur photos samajh sakta hoon. Kripya apni requirement likh kar bhejiye.";
export const OPT_OUT_REPLY =
  "Theek hai, ab aapko is number se reminders ya follow-up messages nahi aayenge. Dobara shuru karne ke liye START likhiye.";
export const OPT_IN_REPLY = "Swagat hai! Messages phir se shuru ho gaye hain. Bataiye, hum aapki kya madad kar sakte hain?";

const STOP_WORDS = /^(stop|unsubscribe|band karo|बंद करो|बंद)$/i;
const START_WORDS = /^(start|shuru|शुरू)$/i;

// Indian numbers arrive as 9876543210, 09876543210, +91 98765 43210 or 919876543210.
export function normalizePhone(raw) {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return /^\d{11,15}$/.test(digits) ? digits : null;
}

export function createMessageHandler({ db, services, now = () => new Date() }) {
  return async function handleMessage(message) {
    const client = db.getClientByPhoneNumberId(message.phoneNumberId);
    if (!client) {
      console.warn(`Message for unknown WhatsApp number ${message.phoneNumberId}`);
      return;
    }
    const { agent, whatsapp } = services.forClient(client);
    const t = now().getTime();
    const from = message.from;

    try {
      const conversation = db.getConversation(client.id, from);
      db.logEvent(client.id, "message_in", from, t);
      if (t - conversation.updatedAt > DAY) db.logEvent(client.id, "conversation_started", from, t);

      const text = (message.text ?? "").trim();
      if (STOP_WORDS.test(text)) {
        db.setOptedOut(client.id, from, true);
        await whatsapp.sendText(from, OPT_OUT_REPLY);
        return;
      }
      if (START_WORDS.test(text) && conversation.optedOut) {
        db.setOptedOut(client.id, from, false);
        await whatsapp.sendText(from, OPT_IN_REPLY);
        return;
      }

      let content;
      if (message.type === "text") {
        content = text;
      } else if (message.type === "image" && message.mediaId) {
        const image = await whatsapp.downloadMedia(message.mediaId);
        if (!image) {
          await whatsapp.sendText(from, NON_TEXT_REPLY);
          return;
        }
        content = [
          { type: "image", source: { type: "base64", media_type: image.mimeType, data: image.data } },
          { type: "text", text: text || "(The customer sent this photo without a caption.)" },
        ];
      } else {
        await whatsapp.sendText(from, NON_TEXT_REPLY);
        return;
      }

      const { reply, handoff } = await agent.reply(from, content);
      if (handoff) db.logEvent(client.id, "handoff", from, t);
      if (reply) await whatsapp.sendText(from, reply);
    } catch (err) {
      console.error(`Client ${client.id}: failed to handle a message:`, err.message);
      await whatsapp.sendText(from, FALLBACK_REPLY).catch(() => {});
    }
  };
}

export function createMissedCallHandler({ db, services, now = () => new Date() }) {
  return async function handleMissedCall(client, phone) {
    const t = now().getTime();
    if (db.isOptedOut(client.id, phone)) return { followUp: "opted_out" };
    if (db.hasRecentEvent(client.id, "missed_call", phone, t - MISSED_CALL_REPEAT_WINDOW)) return { followUp: "repeat" };

    db.logEvent(client.id, "missed_call", phone, t);
    const lead = db.upsertLead(client.id, phone, {}, "missed_call", t);
    if (lead.created) db.logEvent(client.id, "lead_new", phone, t);

    const runtime = services.forClient(client);
    const template = client.settings.templates?.missedCall;
    const conversation = db.getConversation(client.id, phone);
    let followUp = "none";
    try {
      if (t - conversation.updatedAt < DAY) {
        await runtime.whatsapp.sendText(phone, `Namaste! Aapne ${client.profile.name} ko call kiya tha, hum us samay call nahi utha paye. Bataiye, hum aapki kya madad kar sakte hain?`);
        followUp = "text";
      } else if (template) {
        await runtime.whatsapp.sendTemplate(phone, template, [client.profile.name]);
        followUp = "template";
      }
    } catch (err) {
      console.error(`Client ${client.id}: missed-call follow-up failed:`, err.message);
      followUp = "failed";
    }

    const note = { text: "WhatsApp follow-up sent.", template: "WhatsApp follow-up sent.", none: "No follow-up sent (missed-call template not set).", failed: "WhatsApp follow-up FAILED." };
    await runtime.alertOwner(`Missed call from +${phone}. ${note[followUp]}`).catch((err) => console.error("Owner alert failed:", err.message));
    return { followUp };
  };
}

export function createWebhookRouter({ db, services, verifyToken, appSecret, now = () => new Date() }) {
  const router = express.Router();
  const handleMessage = createMessageHandler({ db, services, now });
  const handleMissedCall = createMissedCallHandler({ db, services, now });

  // Meta retries webhooks, so remember recent message ids and skip repeats.
  const seen = new Set();
  const isDuplicate = (id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    if (seen.size > 10_000) seen.delete(seen.values().next().value);
    return false;
  };

  // One customer's messages are handled in order, so their chat history never interleaves.
  const queues = new Map();
  const enqueue = (message) => {
    const key = `${message.phoneNumberId}:${message.from}`;
    const next = (queues.get(key) ?? Promise.resolve()).then(() => handleMessage(message));
    queues.set(key, next);
    next.finally(() => queues.get(key) === next && queues.delete(key));
  };

  router.get("/webhook", (req, res) => {
    if (req.query["hub.mode"] === "subscribe" && safeEqual(req.query["hub.verify_token"], verifyToken)) {
      res.status(200).type("text/plain").send(String(req.query["hub.challenge"] ?? ""));
    } else {
      res.sendStatus(403);
    }
  });

  router.post("/webhook", express.raw({ type: "application/json", limit: "1mb" }), (req, res) => {
    if (!Buffer.isBuffer(req.body) || !isValidSignature(req.body, req.get("x-hub-signature-256"), appSecret)) {
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
      if (message.id && message.from && !isDuplicate(message.id)) enqueue(message);
    }
  });

  // Missed calls: the provider calls /hooks/missed-call/<client id>/<secret token>
  // with the caller's number in the field named in that client's settings.
  const missedCallLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
  router.all(
    "/hooks/missed-call/:clientId/:token",
    express.urlencoded({ extended: false, limit: "20kb" }),
    express.json({ limit: "20kb" }),
    async (req, res) => {
      if (missedCallLimiter.tooMany(req.ip)) return res.sendStatus(429);
      const client = db.getClient(Number(req.params.clientId));
      const expected = client?.settings?.missedCall?.token;
      if (!client?.active || !expected || !safeEqual(req.params.token, expected)) return res.sendStatus(404);

      const field = client.settings.missedCall.callerField;
      const source = req.body && Object.hasOwn(req.body, field) ? req.body : req.query;
      const phone = normalizePhone(Object.hasOwn(source, field) ? source[field] : null);
      if (!phone) return res.status(400).type("text/plain").send(`Caller number not found in field "${field}".`);

      res.status(200).type("text/plain").send("OK");
      handleMissedCall(client, phone).catch((err) => console.error("Missed call handling failed:", err));
    },
  );

  return router;
}

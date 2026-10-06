// WhatsApp Cloud API: send text messages, verify webhook signatures,
// and pull customer messages out of Meta's webhook payloads.

import crypto from "node:crypto";

const MAX_TEXT_LENGTH = 4096; // WhatsApp's limit for one text message

export function createWhatsApp({ token, phoneNumberId, apiVersion = "v23.0", fetchImpl = fetch }) {
  async function sendText(to, body) {
    const res = await fetchImpl(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: body.slice(0, MAX_TEXT_LENGTH), preview_url: false },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed (${res.status}): ${await res.text()}`);
  }

  return { sendText };
}

// Meta signs every webhook with the app secret; reject anything that doesn't match.
export function isValidSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  return received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// Returns [{ id, from, type, text }] for each customer message; delivery receipts are skipped.
export function extractMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        messages.push({
          id: message.id,
          from: message.from,
          type: message.type,
          text: message.type === "text" ? message.text?.body ?? "" : null,
        });
      }
    }
  }
  return messages;
}

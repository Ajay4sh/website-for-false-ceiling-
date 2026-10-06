// WhatsApp Cloud API: send texts and approved templates, download photos,
// verify webhook signatures, and pull customer messages out of webhook payloads.

import crypto from "node:crypto";

const MAX_TEXT_LENGTH = 4096; // WhatsApp's limit for one text message
const MAX_PARAM_LENGTH = 900;
export const MAX_IMAGE_BYTES = 3_500_000;
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Template parameters may not contain new lines, tabs or runs of spaces.
export const templateParam = (value) =>
  String(value ?? "")
    .replace(/[\r\n\t]+/g, " | ")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, MAX_PARAM_LENGTH) || "-";

export function createWhatsApp({ token, phoneNumberId, apiVersion = "v23.0", fetchImpl = fetch }) {
  const base = `https://graph.facebook.com/${apiVersion}`;
  const auth = { Authorization: `Bearer ${token}` };

  async function post(body) {
    const res = await fetchImpl(`${base}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...body }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
  }

  return {
    sendText: (to, body) => post({ to, type: "text", text: { body: body.slice(0, MAX_TEXT_LENGTH), preview_url: false } }),

    // Approved templates are the only messages WhatsApp delivers outside the 24-hour reply window.
    sendTemplate: (to, { name, language }, params = []) =>
      post({
        to,
        type: "template",
        template: {
          name,
          language: { code: language },
          components: params.length ? [{ type: "body", parameters: params.map((p) => ({ type: "text", text: templateParam(p) })) }] : [],
        },
      }),

    // Returns { mimeType, data (base64) } or null when the file is unsupported or too large.
    async downloadMedia(mediaId) {
      const metaRes = await fetchImpl(`${base}/${encodeURIComponent(mediaId)}`, { headers: auth });
      if (!metaRes.ok) throw new Error(`Media lookup failed (${metaRes.status})`);
      const meta = await metaRes.json();
      if (!SUPPORTED_IMAGE_TYPES.includes(meta.mime_type) || Number(meta.file_size) > MAX_IMAGE_BYTES) return null;
      if (!String(meta.url).startsWith("https://")) throw new Error("Unexpected media URL");
      const fileRes = await fetchImpl(meta.url, { headers: auth });
      if (!fileRes.ok) throw new Error(`Media download failed (${fileRes.status})`);
      const bytes = Buffer.from(await fileRes.arrayBuffer());
      if (bytes.length > MAX_IMAGE_BYTES) return null;
      return { mimeType: meta.mime_type, data: bytes.toString("base64") };
    },
  };
}

// Meta signs every webhook with the app secret; reject anything that doesn't match.
export function isValidSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  return received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// Returns [{ id, from, phoneNumberId, type, text, mediaId }] per customer message; delivery receipts are skipped.
export function extractMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id ?? null;
      for (const message of change.value?.messages ?? []) {
        messages.push({
          id: message.id,
          from: message.from,
          phoneNumberId,
          type: message.type,
          text: message.type === "text" ? message.text?.body ?? "" : message.type === "image" ? message.image?.caption ?? "" : null,
          mediaId: message.type === "image" ? message.image?.id ?? null : null,
        });
      }
    }
  }
  return messages;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createWhatsApp, extractMessages, isValidSignature } from "../src/whatsapp.js";

test("accepts only correctly signed webhooks", () => {
  const body = Buffer.from('{"entry":[]}');
  const good = "sha256=" + crypto.createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(isValidSignature(body, good, "secret"), true);
  assert.equal(isValidSignature(body, good, "other-secret"), false);
  assert.equal(isValidSignature(body, undefined, "secret"), false);
  assert.equal(isValidSignature(body, "sha256=abc", "secret"), false);
});

test("extracts customer messages and skips delivery receipts", () => {
  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "555" },
              messages: [
                { id: "m1", from: "919811112222", type: "text", text: { body: "ceiling ka rate?" } },
                { id: "m2", from: "919811112222", type: "image", image: { id: "img", caption: "aisa chahiye" } },
              ],
            },
          },
          { value: { statuses: [{ id: "m0", status: "delivered" }] } },
        ],
      },
    ],
  };
  assert.deepEqual(extractMessages(payload), [
    { id: "m1", from: "919811112222", phoneNumberId: "555", type: "text", text: "ceiling ka rate?", mediaId: null },
    { id: "m2", from: "919811112222", phoneNumberId: "555", type: "image", text: "aisa chahiye", mediaId: "img" },
  ]);
  assert.deepEqual(extractMessages({}), []);
});

test("sends a text message to the Cloud API", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true };
  };
  const whatsapp = createWhatsApp({ token: "tok", phoneNumberId: "123", fetchImpl });

  await whatsapp.sendText("919811112222", "Namaste");

  assert.equal(calls[0].url, "https://graph.facebook.com/v23.0/123/messages");
  assert.equal(calls[0].options.headers.Authorization, "Bearer tok");
  assert.deepEqual(JSON.parse(calls[0].options.body).text, { body: "Namaste", preview_url: false });
});

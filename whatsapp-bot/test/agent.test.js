import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createAgent, DEFAULT_MODEL } from "../src/agent.js";
import { createStore } from "../src/store.js";

const business = JSON.parse(fs.readFileSync(new URL("../businesses/ceilcraft.json", import.meta.url)));
const PHONE = "919811112222";

// A stand-in for the Claude client that returns scripted responses and records requests.
function fakeClient(responses) {
  const requests = [];
  return {
    requests,
    beta: {
      messages: {
        create: async (params) => {
          requests.push(structuredClone(params));
          const next = responses.shift();
          if (!next) throw new Error("No scripted response left");
          return next;
        },
      },
    },
  };
}

const toolUse = (id, name, input) => ({
  stop_reason: "tool_use",
  content: [{ type: "tool_use", id, name, input }],
});
const say = (text) => ({ stop_reason: "end_turn", content: [{ type: "text", text }] });

function setup(responses, startAt = "2026-10-06T05:30:00Z") {
  let clock = new Date(startAt);
  const alerts = [];
  const client = fakeClient(responses);
  const store = createStore(null);
  const agent = createAgent({
    client,
    business,
    store,
    notifyOwner: async (message) => alerts.push(message),
    now: () => clock,
  });
  return { agent, client, store, alerts, setClock: (iso) => (clock = new Date(iso)) };
}

const visit = {
  customer_name: "Rohit",
  date: "2026-10-07",
  time: "11:00",
  address: "B-12 Shastri Nagar, near Hanuman Mandir",
  service_interest: "gypsum ceiling, living room 14x12",
  notes: "",
};

test("checks slots, books the visit, alerts the owner and replies", async () => {
  const { agent, client, store, alerts } = setup([
    toolUse("t1", "check_available_slots", { date: "2026-10-07" }),
    toolUse("t2", "book_appointment", visit),
    say("Aapki site visit *kal 11 baje* book ho gayi hai."),
  ]);

  const result = await agent.reply(PHONE, "haan kal 11 baje theek hai");

  assert.equal(result.reply, "Aapki site visit *kal 11 baje* book ho gayi hai.");
  assert.equal(store.bookings.length, 1);
  assert.equal(store.bookings[0].phone, PHONE);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /Wednesday 2026-10-07, 11:00/);
  assert.match(alerts[0], /\+919811112222/);

  const first = client.requests[0];
  assert.equal(first.model, DEFAULT_MODEL);
  assert.equal(first.fallbacks, "default");
  assert.deepEqual(first.betas, ["server-side-fallback-2026-07-01"]);
  assert.match(first.messages[0].content, /^\[Tuesday 2026-10-06, 11:00\]\nhaan kal/);

  const slotResult = JSON.parse(client.requests[1].messages.at(-1).content[0].content);
  assert.equal(slotResult.slots.length, 8);

  const history = store.getConversation(PHONE).messages;
  assert.deepEqual(history.map((m) => m.role), ["user", "assistant", "user", "assistant", "user", "assistant"]);
});

test("refuses to book a slot that is already taken", async () => {
  const { agent, client, store } = setup([
    toolUse("t1", "book_appointment", visit),
    toolUse("t2", "book_appointment", visit),
    say("Ye slot available nahi hai."),
  ]);

  await agent.reply(PHONE, "book karo");

  assert.equal(store.bookings.length, 1);
  const secondResult = client.requests[2].messages.at(-1).content[0];
  assert.equal(JSON.parse(secondResult.content).ok, false);
});

test("saves a lead and alerts the owner", async () => {
  const { agent, store, alerts } = setup([
    toolUse("t1", "save_lead", {
      customer_name: "",
      area: "Kidwai Nagar",
      property_type: "Home",
      service_interest: "PVC ceiling for kitchen",
      requirement_details: "",
      budget: "",
      timeline: "next month",
    }),
    say("Thik hai, aapka naam bata dijiye?"),
  ]);

  await agent.reply(PHONE, "kitchen me PVC lagwana hai, Kidwai Nagar");

  assert.equal(store.leads.length, 1);
  assert.match(alerts[0], /Kidwai Nagar/);
  assert.match(alerts[0], /name not given/);
});

test("handoff alerts the owner and pauses the bot for that customer", async () => {
  const { agent, client, alerts } = setup([
    toolUse("t1", "handoff_to_owner", { reason: "wants exact quote", summary: "3BHK, all rooms" }),
    say("Owner aapko jaldi call karenge."),
  ]);

  await agent.reply(PHONE, "exact rate batao poore 3BHK ka");
  const second = await agent.reply(PHONE, "hello?");

  assert.match(alerts[0], /wants exact quote/);
  assert.deepEqual(second, { reply: null, paused: true });
  assert.equal(client.requests.length, 2);
});

test("a conversation idle for over a day starts fresh", async () => {
  const { agent, client, setClock } = setup([say("Namaste!"), say("Namaste, kaise madad karun?")]);

  await agent.reply(PHONE, "hi");
  setClock("2026-10-08T06:00:00Z");
  await agent.reply(PHONE, "hello");

  assert.equal(client.requests[1].messages.length, 1);
});

test("a refusal sends the fallback reply and hands off", async () => {
  const { agent, alerts } = setup([{ stop_reason: "refusal", content: [] }]);

  const result = await agent.reply(PHONE, "...");

  assert.match(result.reply, /team aapko jaldi contact karegi/);
  assert.equal(alerts.length, 1);
});

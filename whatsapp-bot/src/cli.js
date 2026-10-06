// Chat with the assistant in the terminal, without WhatsApp. Needs only ANTHROPIC_API_KEY.
// Bookings and leads go to a separate test file so real data stays clean.

import readline from "node:readline/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createAgent } from "./agent.js";
import { createStore } from "./store.js";
import { dataFile, loadBusiness, requireEnv } from "./config.js";

requireEnv("ANTHROPIC_API_KEY");

const TEST_PHONE = "910000000000";
const business = loadBusiness();
const store = createStore(dataFile(business, "-test"));
const agent = createAgent({
  client: new Anthropic(),
  model: process.env.CLAUDE_MODEL || undefined,
  business,
  store,
  notifyOwner: async (message) => console.log(`\n--- Owner alert ---\n${message}\n-------------------\n`),
});

console.log(`Chatting as a customer of ${business.name}.`);
console.log("Commands: /reset (new conversation), /bookings, /leads, /quit\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
while (true) {
  const input = (await rl.question("You: ")).trim();
  if (!input) continue;
  if (input === "/quit") break;
  if (input === "/reset") {
    store.setConversation(TEST_PHONE, { messages: [], updatedAt: 0, pausedUntil: 0 });
    console.log("(Started a new conversation.)\n");
    continue;
  }
  if (input === "/bookings") {
    console.table(store.bookings.map(({ id, date, time, customer_name, address }) => ({ id, date, time, customer_name, address })));
    continue;
  }
  if (input === "/leads") {
    console.table(store.leads.map(({ id, customer_name, area, service_interest }) => ({ id, customer_name, area, service_interest })));
    continue;
  }

  try {
    const { reply, paused } = await agent.reply(TEST_PHONE, input);
    console.log(paused ? "(Bot is paused because the owner took over. Type /reset to start again.)\n" : `Bot: ${reply}\n`);
  } catch (err) {
    console.error(`Error: ${err.message}\n`);
  }
}
rl.close();

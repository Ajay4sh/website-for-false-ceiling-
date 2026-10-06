// Chat with the assistant in the terminal, without WhatsApp. Needs only ANTHROPIC_API_KEY.
// Uses a temporary in-memory database, so nothing is saved after you quit.
//   npm run chat                      (uses businesses/ceilcraft.json)
//   npm run chat -- businesses/other.json

import readline from "node:readline/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createAgent } from "./agent.js";
import { createClientStore } from "./clientStore.js";
import { loadConfig, loadJson } from "./config.js";
import { openDb } from "./db.js";
import { validateProfile } from "./profile.js";

const config = loadConfig(process.env, ["ANTHROPIC_API_KEY"]);
const file = process.argv[2] ?? "businesses/ceilcraft.json";
const result = validateProfile(loadJson(file));
if (!result.ok) {
  console.error(`${file} has problems:\n- ${result.errors.join("\n- ")}`);
  process.exit(1);
}

const TEST_PHONE = "910000000000";
const db = openDb(":memory:");
const clientId = db.createClient({ slug: "test", name: result.profile.name, profile: result.profile });
const client = db.getClient(clientId);
const agent = createAgent({
  client: new Anthropic(),
  model: config.model,
  business: client.profile,
  store: createClientStore(db, client),
  notifyOwner: async (message) => console.log(`\n--- Owner alert ---\n${message}\n-------------------\n`),
});

console.log(`Chatting as a customer of ${client.name}.`);
console.log("Commands: /reset (new conversation), /bookings, /leads, /quit\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
while (true) {
  const input = (await rl.question("You: ")).trim();
  if (!input) continue;
  if (input === "/quit") break;
  if (input === "/reset") {
    db.saveConversation(clientId, TEST_PHONE, { messages: [], updatedAt: 0, pausedUntil: 0 });
    console.log("(Started a new conversation.)\n");
    continue;
  }
  if (input === "/bookings") {
    console.table(db.listBookings(clientId).map(({ id, date, time, customer_name, address }) => ({ id, date, time, customer_name, address })));
    continue;
  }
  if (input === "/leads") {
    console.table(db.listLeads(clientId).map(({ id, customer_name, area, service_interest }) => ({ id, customer_name, area, service_interest })));
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

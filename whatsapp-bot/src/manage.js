// Admin commands for the server:  npm run manage -- <command> [arguments]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadConfig, loadJson } from "./config.js";
import { openDb } from "./db.js";
import { DEFAULT_SETTINGS, validateProfile } from "./profile.js";
import { hashPassword, randomToken } from "./security.js";

const HELP = `Commands:
  gen-key                              Print a new APP_ENCRYPTION_KEY
  create-admin <email> "<name>"        Create an admin login (prints a temporary password)
  import-client <profile.json> [owner-whatsapp]
                                       Add a client from a business profile file
  list-clients                         Show clients and their IDs
  backup [file]                        Copy the database safely while the server runs
  seed-demo                            Add a demo client with sample data, for showing prospects
                                       (use a separate DB_FILE, e.g. DB_FILE=data/demo.db)`;

const [command, ...args] = process.argv.slice(2);

if (command === "gen-key") {
  console.log(crypto.randomBytes(32).toString("base64"));
  process.exit(0);
}

const config = loadConfig();
fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
const db = openDb(config.dbFile);

switch (command) {
  case "create-admin": {
    const [email, name] = args;
    if (!email || !name) fail('Usage: create-admin you@example.com "Your Name"');
    if (db.getUserByEmail(email)) fail("That email already has a login.");
    const password = randomToken(12);
    db.createUser({ email, name, passwordHash: hashPassword(password), role: "admin" });
    db.audit({ action: "admin_created_cli", detail: email });
    console.log(`Admin created. Email: ${email}\nTemporary password: ${password}\nSign in and change it under your name (top right).`);
    break;
  }
  case "import-client": {
    const [file, ownerWhatsapp = ""] = args;
    if (!file) fail("Usage: import-client businesses/ceilcraft.json 919876543210");
    const raw = loadJson(file);
    const owner = String(ownerWhatsapp || raw.ownerWhatsapp || "").replace(/\D/g, "");
    delete raw.id;
    delete raw.ownerWhatsapp;
    const result = validateProfile(raw);
    if (!result.ok) fail(`Profile has problems:\n- ${result.errors.join("\n- ")}`);
    const slug = (raw.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client").slice(0, 40);
    const settings = { ...DEFAULT_SETTINGS, ownerWhatsapp: owner, missedCall: { ...DEFAULT_SETTINGS.missedCall, token: randomToken(18) } };
    const id = db.createClient({ slug: db.listClients().some((c) => c.slug === slug) ? `${slug}-${randomToken(3).toLowerCase()}` : slug, name: raw.name, profile: result.profile, settings });
    console.log(`Client "${raw.name}" created with ID ${id}. Connect its WhatsApp number in the dashboard: Integrations.`);
    break;
  }
  case "list-clients":
    for (const c of db.listClients()) console.log(`${c.id}\t${c.active ? "active" : "paused"}\t${c.wa_phone_number_id ?? "(no WhatsApp number)"}\t${c.name}`);
    break;
  case "backup": {
    const target = args[0] ?? path.join(path.dirname(config.dbFile), "backups", `bookbot-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target)) fail("Backup file already exists.");
    db.backupTo(target);
    console.log(`Backup written to ${target}`);
    break;
  }
  case "seed-demo":
    seedDemo();
    break;
  default:
    console.log(HELP);
}
db.close();

// Fictional sample data so a prospect can see a working dashboard.
function seedDemo() {
  const profile = {
    ...loadJson(new URL("../businesses/ceilcraft.json", import.meta.url)),
    name: "Sharma Ceilings (Demo)",
    city: "Kanpur",
    areasServed: ["Kidwai Nagar", "Swaroop Nagar", "Kakadeo", "Civil Lines"],
    phone: "+91 90000 00000",
    address: "Demo address, Mall Road, Kanpur",
  };
  delete profile.id;
  delete profile.ownerWhatsapp;
  const clientId = db.createClient({ slug: `demo-${randomToken(3).toLowerCase()}`, name: profile.name, profile: validateProfile(profile).profile, settings: { ...DEFAULT_SETTINGS, missedCall: { ...DEFAULT_SETTINGS.missedCall, token: randomToken(18) } } });

  const DAY = 86_400_000;
  const t = Date.now();
  const date = (offset) => new Date(t + 330 * 60_000 + offset * DAY).toISOString().slice(0, 10);
  const people = [
    ["919000000101", "Rohit Verma", "Kidwai Nagar", "Home", "Gypsum ceiling with cove lighting", "Living room 14x12, bedroom 12x10", "₹60–70k", "This month", "won"],
    ["919000000102", "Meena Gupta", "Swaroop Nagar", "Home", "POP ceiling", "Drawing room with mouldings", "", "Before Diwali", "contacted"],
    ["919000000103", "Arjun Singh", "Kakadeo", "Shop", "Grid ceiling", "Showroom 600 sq ft", "₹50k", "Next month", "new"],
    ["919000000104", "Pooja Yadav", "Civil Lines", "Home", "PVC ceiling for kitchen", "Kitchen 10x8", "", "", "new"],
    ["919000000105", "", "", "", "", "", "", "", "new"],
  ];
  people.forEach(([phone, name, area, type, need, details, budget, timeline, status], i) => {
    const at = t - (i + 1) * 2 * DAY;
    const lead = db.upsertLead(clientId, phone, { customer_name: name, area, property_type: type, service_interest: need, requirement_details: details, budget, timeline }, name ? "whatsapp" : "missed_call", at);
    if (status !== "new") db.setLeadStatus(clientId, lead.id, status, at);
    db.logEvent(clientId, "message_in", phone, at);
    db.logEvent(clientId, "conversation_started", phone, at);
    db.logEvent(clientId, "lead_new", phone, at);
    if (!name) db.logEvent(clientId, "missed_call", phone, at);
  });
  [
    ["919000000101", "Rohit Verma", date(-3), "11:00", "45, Block H, Kidwai Nagar, near Gurudwara", "Gypsum ceiling with cove lighting", "completed"],
    ["919000000102", "Meena Gupta", date(1), "12:00", "112/7 Swaroop Nagar, opposite park", "POP ceiling, drawing room", "booked"],
    ["919000000103", "Arjun Singh", date(2), "16:00", "Shop 4, Kakadeo main road", "Grid ceiling for showroom", "booked"],
  ].forEach(([phone, customer_name, d, time, address, service_interest, status]) => {
    const id = db.addBooking(clientId, { phone, customer_name, date: d, time, address, service_interest, notes: "" }, t - 4 * DAY);
    if (status !== "booked") db.updateBooking(clientId, id, { status });
    db.logEvent(clientId, "booking_new", phone, t - 4 * DAY);
  });
  db.logEvent(clientId, "handoff", "919000000103", t - 3 * DAY);
  db.saveConversation(clientId, "919000000102", {
    updatedAt: t - 2 * 3600_000,
    pausedUntil: 0,
    messages: [
      { role: "user", content: `[Monday ${date(-1)}, 18:42]\nNamaste, POP ceiling ka rate kya hai?` },
      { role: "assistant", content: [{ type: "text", text: "Namaste! Main Sharma Ceilings ka automated assistant hoon. POP ceiling ka rate lagbhag *₹90–130 per sq ft* hai (design ke hisaab se). Exact quote free site visit ke baad milega. Aapki site kis area mein hai?" }] },
      { role: "user", content: `[Monday ${date(-1)}, 18:44]\nSwaroop Nagar. Drawing room mein mouldings wala design chahiye` },
      { role: "assistant", content: [{ type: "tool_use", id: "d1", name: "check_available_slots", input: { date: date(1) } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "d1", content: "{}" }] },
      { role: "assistant", content: [{ type: "text", text: "Badhiya! Free site visit ke liye kal *11 baje*, *12 baje* ya *4 baje* available hai. Kaunsa time theek rahega?" }] },
      { role: "user", content: `[Monday ${date(-1)}, 18:47]\n12 baje. Meena Gupta, 112/7 Swaroop Nagar, opposite park` },
      { role: "assistant", content: [{ type: "tool_use", id: "d2", name: "book_appointment", input: { customer_name: "Meena Gupta", date: date(1), time: "12:00" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "d2", content: "{}" }] },
      { role: "assistant", content: [{ type: "text", text: "Ho gaya, Meena ji! Aapki free site visit *kal 12 baje* book hai: 112/7 Swaroop Nagar. Hamari team time par pahunch jayegi." }] },
    ],
  });
  const password = randomToken(12);
  const email = `demo-${clientId}@example.com`;
  db.createUser({ email, name: "Demo Owner", passwordHash: hashPassword(password), role: "owner", clientId });
  console.log(`Demo client created (ID ${clientId}).\nOwner login: ${email}\nPassword: ${password}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Small JSON-file database: bookings, leads and chat history for one business.
// Fine for the first few clients; move to a real database once volume grows.

import fs from "node:fs";
import path from "node:path";

const empty = () => ({ bookings: [], leads: [], conversations: {} });

// Pass a file path to persist to disk, or null to keep everything in memory (tests).
export function createStore(file) {
  let data = empty();
  if (file && fs.existsSync(file)) data = { ...empty(), ...JSON.parse(fs.readFileSync(file, "utf8")) };

  function save() {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file); // atomic replace, so a crash never leaves half a file
  }

  return {
    get bookings() {
      return data.bookings;
    },
    get leads() {
      return data.leads;
    },
    addBooking(booking) {
      data.bookings.push(booking);
      save();
    },
    addLead(lead) {
      data.leads.push(lead);
      save();
    },
    getConversation(phone) {
      return data.conversations[phone] ?? { messages: [], updatedAt: 0, pausedUntil: 0 };
    },
    setConversation(phone, conversation) {
      data.conversations[phone] = conversation;
      save();
    },
  };
}

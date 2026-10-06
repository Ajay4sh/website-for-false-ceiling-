// The assistant's view of one client's data in the database.
// Every call is pinned to this client, so one business never sees another's customers.

import { describeNow } from "./slots.js";

export function createClientStore(db, client, now = () => new Date()) {
  const clientId = client.id;
  return {
    get bookings() {
      return db.activeBookings(clientId, describeNow(client.profile, now()).date);
    },
    addBooking(booking) {
      const bookingId = db.addBooking(clientId, booking, now().getTime());
      db.logEvent(clientId, "booking_new", booking.phone, now().getTime());
      return bookingId;
    },
    addLead(lead) {
      const result = db.upsertLead(clientId, lead.phone, lead, lead.source ?? "whatsapp", now().getTime());
      if (result.created) db.logEvent(clientId, "lead_new", lead.phone, now().getTime());
      return result;
    },
    getConversation: (phone) => db.getConversation(clientId, phone),
    setConversation: (phone, conversation) => db.saveConversation(clientId, phone, conversation),
  };
}

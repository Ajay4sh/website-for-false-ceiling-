// Builds and caches everything one client needs at runtime: their WhatsApp sender,
// the AI assistant with their profile, owner alerts and calendar sync.

import { createAgent } from "./agent.js";
import { createClientStore } from "./clientStore.js";
import { createWhatsApp } from "./whatsapp.js";
import { humanDate, humanTime, isoWithOffset, toInstant } from "./slots.js";

export function createServices({ db, cipher, anthropic, model, calendar = null, whatsappDefaults, fetchImpl = fetch, now = () => new Date() }) {
  const cache = new Map();

  function whatsappFor(client) {
    const token = client.wa_token_enc ? cipher.decrypt(client.wa_token_enc) : whatsappDefaults.token;
    return createWhatsApp({ token, phoneNumberId: client.wa_phone_number_id, apiVersion: whatsappDefaults.apiVersion, fetchImpl });
  }

  // Owner alerts use the approved template when one is set; plain text only reaches
  // the owner if they messaged the business number in the last 24 hours.
  async function alertOwner(client, whatsapp, message) {
    const owner = client.settings.ownerWhatsapp;
    if (!owner) return;
    const template = client.settings.templates?.ownerAlert;
    if (template) await whatsapp.sendTemplate(owner, template, [message]);
    else await whatsapp.sendText(owner, message);
  }

  async function syncBookingToCalendar(client, booking) {
    const calendarId = client.settings.calendarId;
    if (!calendar || !calendarId) return;
    const profile = client.profile;
    const start = toInstant(profile, booking.date, booking.time);
    const eventId = await calendar.createEvent(calendarId, {
      summary: `${profile.booking.appointmentName}: ${booking.customer_name}`,
      description: `Phone: +${booking.phone}\nAddress: ${booking.address}\nNeed: ${booking.service_interest}${booking.notes ? `\nNotes: ${booking.notes}` : ""}`,
      start: isoWithOffset(profile, start),
      end: isoWithOffset(profile, start + profile.booking.slotMinutes * 60_000),
    });
    db.updateBooking(client.id, booking.id, { calendar_event_id: eventId });
  }

  function forClient(client) {
    const cached = cache.get(client.id);
    if (cached) return cached;
    const whatsapp = whatsappFor(client);
    const runtime = {
      client,
      whatsapp,
      alertOwner: (message) => alertOwner(client, whatsapp, message),
      agent: createAgent({
        client: anthropic,
        model,
        business: client.profile,
        store: createClientStore(db, client, now),
        notifyOwner: (message) => alertOwner(client, whatsapp, message),
        onBooking: (booking) => syncBookingToCalendar(client, booking),
        now,
      }),
    };
    cache.set(client.id, runtime);
    return runtime;
  }

  // Cancel from the dashboard: frees the slot, removes the calendar event, tells the customer if possible.
  async function cancelBooking(client, bookingId, { notifyCustomer = true } = {}) {
    const booking = db.getBooking(client.id, bookingId);
    if (!booking || booking.status !== "booked") return false;
    db.updateBooking(client.id, bookingId, { status: "cancelled" }, now().getTime());
    db.logEvent(client.id, "booking_cancelled", booking.phone, now().getTime());
    if (booking.calendar_event_id && calendar && client.settings.calendarId) {
      await calendar.deleteEvent(client.settings.calendarId, booking.calendar_event_id).catch((err) => console.error("Calendar delete failed:", err.message));
    }
    const conversation = db.getConversation(client.id, booking.phone);
    if (notifyCustomer && now().getTime() - conversation.updatedAt < 24 * 3600_000) {
      const text = `Namaste ${booking.customer_name}, ${humanDate(booking.date)} ${humanTime(booking.time)} wali ${client.profile.booking.appointmentName} cancel kar di gayi hai. Nayi date ke liye isi number par message karein.`;
      await forClient(client).whatsapp.sendText(booking.phone, text).catch((err) => console.error("Cancel notice failed:", err.message));
    }
    return true;
  }

  async function deleteCustomer(client, phone) {
    const bookings = db.deleteCustomerData(client.id, phone);
    if (calendar && client.settings.calendarId) {
      for (const b of bookings.filter((b) => b.calendar_event_id)) {
        await calendar.deleteEvent(client.settings.calendarId, b.calendar_event_id).catch(() => {});
      }
    }
  }

  return {
    forClient,
    cancelBooking,
    deleteCustomer,
    calendarEmail: calendar?.email ?? null,
    invalidate: (clientId) => cache.delete(clientId),
  };
}

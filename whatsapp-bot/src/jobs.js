// Background jobs, run every minute by the server: appointment reminders and data retention.

import { humanDate, humanTime, toInstant } from "./slots.js";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const MIN_LEAD_TIME_FOR_REMINDER = 6 * HOUR; // a visit booked this close to its time needs no reminder
const SKIPPED = 0; // reminder_sent_at = 0 means "decided not to send"

const utcDate = (ms) => new Date(ms).toISOString().slice(0, 10);

export async function sendDueReminders({ db, services, now = () => new Date() }) {
  const nowMs = now().getTime();
  const due = db.bookingsAwaitingReminder(utcDate(nowMs - DAY), utcDate(nowMs + 4 * DAY));
  let sent = 0;

  for (const booking of due) {
    const client = db.getClient(booking.client_id);
    if (!client?.active) continue;
    const start = toInstant(client.profile, booking.date, booking.time);
    const sendFrom = start - client.settings.reminderHoursBefore * HOUR;
    if (nowMs < sendFrom) continue;

    const template = client.settings.templates?.reminder;
    const skip = !template || nowMs >= start || start - booking.created_at < MIN_LEAD_TIME_FOR_REMINDER || db.isOptedOut(client.id, booking.phone);
    if (skip) {
      db.updateBooking(client.id, booking.id, { reminder_sent_at: SKIPPED }, nowMs);
      continue;
    }

    try {
      await services.forClient(client).whatsapp.sendTemplate(booking.phone, template, [
        booking.customer_name,
        client.profile.name,
        client.profile.booking.appointmentName,
        humanDate(booking.date),
        humanTime(booking.time),
      ]);
      db.updateBooking(client.id, booking.id, { reminder_sent_at: nowMs }, nowMs);
      db.logEvent(client.id, "reminder_sent", booking.phone, nowMs);
      sent++;
    } catch (err) {
      // One attempt only, so a broken template never spams the customer.
      console.error(`Reminder for booking ${booking.id} failed:`, err.message);
      db.updateBooking(client.id, booking.id, { reminder_sent_at: SKIPPED }, nowMs);
    }
  }
  return sent;
}

export function applyRetention({ db, now = () => new Date() }) {
  const nowMs = now().getTime();
  const totals = { conversations: 0, leads: 0, bookings: 0, events: 0 };
  for (const client of db.listClients()) {
    const { conversationDays, recordDays } = client.settings.retention ?? {};
    if (!conversationDays || !recordDays) continue;
    const removed = db.purgeOldData(client.id, {
      conversationsBefore: nowMs - conversationDays * DAY,
      recordsBefore: nowMs - recordDays * DAY,
    });
    for (const key of Object.keys(totals)) totals[key] += removed[key];
  }
  db.purgeExpiredSessions(nowMs);
  return totals;
}

export function startJobs({ db, services, now = () => new Date() }) {
  let lastRetention = 0;
  const tick = async () => {
    try {
      await sendDueReminders({ db, services, now });
      if (now().getTime() - lastRetention > DAY) {
        applyRetention({ db, now });
        lastRetention = now().getTime();
      }
    } catch (err) {
      console.error("Background job failed:", err);
    }
  };
  const timer = setInterval(tick, 60_000);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}

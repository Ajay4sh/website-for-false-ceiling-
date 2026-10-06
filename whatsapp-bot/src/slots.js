// Appointment slot maths in the business's local time.
// India has no daylight saving, so a fixed UTC offset is enough.

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n) => String(n).padStart(2, "0");
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// A Date shifted into local time; read it only with getUTC* methods.
function localClock(business, now) {
  return new Date(now.getTime() + business.utcOffsetMinutes * 60_000);
}

export function describeNow(business, now = new Date()) {
  const local = localClock(business, now);
  const date = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  return { date, time, weekday: WEEKDAYS[local.getUTCDay()] };
}

function parseDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return ms;
}

export function availableSlots(business, date, bookings, now = new Date()) {
  const rules = business.booking;
  const dayMs = parseDate(date);
  if (dayMs === null) return { date, available: false, slots: [], reason: "Invalid date; use YYYY-MM-DD." };

  const local = localClock(business, now);
  const todayMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const dayOffset = Math.round((dayMs - todayMs) / DAY_MS);
  const weekday = WEEKDAYS[new Date(dayMs).getUTCDay()];

  if (dayOffset < 0) return { date, weekday, available: false, slots: [], reason: "That date is in the past." };
  if (dayOffset > rules.bookAheadDays) {
    return { date, weekday, available: false, slots: [], reason: `Bookings open only ${rules.bookAheadDays} days ahead.` };
  }
  if (!rules.workingDays.includes(new Date(dayMs).getUTCDay())) {
    return { date, weekday, available: false, slots: [], reason: `Closed on ${weekday}.` };
  }

  // Minutes counted from today's local midnight, so "now + notice" can spill into later days.
  const earliest = local.getUTCHours() * 60 + local.getUTCMinutes() + rules.minNoticeHours * 60;
  const end = toMinutes(rules.endTime);
  const slots = [];
  for (let t = toMinutes(rules.startTime); t + rules.slotMinutes <= end; t += rules.slotMinutes) {
    if (dayOffset * 1440 + t < earliest) continue;
    const time = toHHMM(t);
    const taken = bookings.filter((b) => b.status === "booked" && b.date === date && b.time === time).length;
    if (taken < rules.maxPerSlot) slots.push(time);
  }

  return slots.length
    ? { date, weekday, available: true, slots }
    : { date, weekday, available: false, slots, reason: "No free slots left on that day." };
}

// The moment (UTC milliseconds) a local date + time happens.
export function toInstant(business, date, time) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + toMinutes(time) * 60_000 - business.utcOffsetMinutes * 60_000;
}

// ISO 8601 with the business's own offset, e.g. 2026-10-07T11:00:00+05:30 (for calendars).
export function isoWithOffset(business, instantMs) {
  const local = localClock(business, new Date(instantMs));
  const offset = business.utcOffsetMinutes;
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${local.toISOString().slice(0, 19)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Wed, 7 Oct" and "11:00 AM" for messages to people.
export function humanDate(date) {
  const [y, m, d] = date.split("-").map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()].slice(0, 3)}, ${d} ${MONTHS[m - 1]}`;
}

export function humanTime(time) {
  const [h, m] = time.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

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

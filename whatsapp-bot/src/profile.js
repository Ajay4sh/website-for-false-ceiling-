// Validation for a client's business profile (what the bot tells customers)
// and settings (integrations, templates, retention). Returns readable errors.

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_PROFILE_BYTES = 40_000;

const isStr = (v, max = 2000) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const isStrOrEmpty = (v, max = 2000) => typeof v === "string" && v.length <= max;
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const strList = (v, max = 50) => Array.isArray(v) && v.length <= max && v.every((s) => isStr(s, 500));
const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export function validateProfile(profile) {
  const errors = [];
  const need = (ok, message) => ok || errors.push(message);

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return { ok: false, errors: ["Profile must be a JSON object."] };
  need(JSON.stringify(profile).length <= MAX_PROFILE_BYTES, "Profile is too large (max 40 KB).");
  need(isStr(profile.name, 120), "name is required.");
  need(isStr(profile.type, 500), "type is required (what the business does).");
  need(isStr(profile.city, 120), "city is required.");
  need(strList(profile.areasServed), "areasServed must be a list of area names.");
  need(isStr(profile.phone, 40), "phone is required.");
  need(isStrOrEmpty(profile.address ?? "", 500), "address must be text.");
  need(isStr(profile.hoursText, 200), "hoursText is required, e.g. \"Mon–Sat, 9 am – 7 pm\".");
  need(profile.utcOffsetMinutes === undefined || isInt(profile.utcOffsetMinutes, -720, 840), "utcOffsetMinutes must be a whole number (330 for India).");

  const b = profile.booking;
  if (!b || typeof b !== "object") {
    errors.push("booking rules are required.");
  } else {
    need(isStr(b.appointmentName, 120), "booking.appointmentName is required, e.g. \"free site visit\".");
    need(Array.isArray(b.workingDays) && b.workingDays.length > 0 && b.workingDays.every((d) => isInt(d, 0, 6)), "booking.workingDays must list days 0 (Sunday) to 6 (Saturday).");
    need(typeof b.startTime === "string" && HHMM.test(b.startTime), "booking.startTime must be HH:MM.");
    need(typeof b.endTime === "string" && HHMM.test(b.endTime), "booking.endTime must be HH:MM.");
    if (HHMM.test(b.startTime ?? "") && HHMM.test(b.endTime ?? "")) need(minutes(b.startTime) < minutes(b.endTime), "booking.startTime must be before endTime.");
    need(isInt(b.slotMinutes, 15, 480), "booking.slotMinutes must be 15–480.");
    need(isInt(b.maxPerSlot, 1, 50), "booking.maxPerSlot must be 1–50.");
    need(isInt(b.bookAheadDays, 1, 90), "booking.bookAheadDays must be 1–90.");
    need(isInt(b.minNoticeHours, 0, 72), "booking.minNoticeHours must be 0–72.");
    need(strList(b.requiredDetails, 20), "booking.requiredDetails must be a list.");
  }

  need(strList(profile.leadQuestions, 20), "leadQuestions must be a list of questions.");
  need(Array.isArray(profile.services) && profile.services.every((s) => isStr(s?.name, 200) && isStrOrEmpty(s?.note ?? "", 500)), "services must be a list of { name, note }.");
  const p = profile.priceList;
  need(
    p && isStr(p.unit, 200) && Array.isArray(p.items) && p.items.every((i) => isStr(i?.item, 200) && typeof i.min === "number" && typeof i.max === "number" && i.min <= i.max),
    "priceList needs a unit and items of { item, min, max } with min ≤ max.",
  );
  need(Array.isArray(profile.faqs) && profile.faqs.every((f) => isStr(f?.q, 500) && isStr(f?.a, 2000)), "faqs must be a list of { q, a }.");
  need(profile.policies === undefined || strList(profile.policies), "policies must be a list.");

  return errors.length ? { ok: false, errors } : { ok: true, profile: { utcOffsetMinutes: 330, policies: [], ...profile } };
}

export const DEFAULT_SETTINGS = {
  ownerWhatsapp: "",
  reminderHoursBefore: 24,
  calendarId: "",
  templates: {},
  missedCall: { token: "", callerField: "CallFrom" },
  retention: { conversationDays: 180, recordDays: 730 },
};

const TEMPLATE_KEYS = ["ownerAlert", "reminder", "missedCall"];

export function validateSettings(settings) {
  const errors = [];
  const need = (ok, message) => ok || errors.push(message);
  const s = { ...DEFAULT_SETTINGS, ...settings };

  need(s.ownerWhatsapp === "" || /^\d{10,15}$/.test(s.ownerWhatsapp), "Owner WhatsApp must be digits with country code, e.g. 919876543210.");
  need(isInt(s.reminderHoursBefore, 1, 72), "Reminder hours must be 1–72.");
  need(isStrOrEmpty(s.calendarId, 300), "Calendar ID is too long.");
  need(s.templates && typeof s.templates === "object", "templates must be an object.");
  for (const key of Object.keys(s.templates ?? {})) {
    const t = s.templates[key];
    need(TEMPLATE_KEYS.includes(key), `Unknown template "${key}".`);
    need(t && /^[a-z0-9_]{1,512}$/.test(t.name ?? "") && /^[a-z]{2,3}(_[A-Z]{2})?$/.test(t.language ?? ""), `Template "${key}" needs a name (lowercase, digits, _) and a language code like en or hi.`);
  }
  need(s.missedCall && /^[A-Za-z0-9_.-]{1,64}$/.test(s.missedCall.callerField ?? ""), "Missed-call caller field must be a simple field name, e.g. CallFrom.");
  need(isStrOrEmpty(s.missedCall?.token ?? "", 200), "Missed-call token is invalid.");
  need(isInt(s.retention?.conversationDays, 30, 3650) && isInt(s.retention?.recordDays, 30, 3650), "Retention days must be 30–3650.");

  return errors.length ? { ok: false, errors } : { ok: true, settings: s };
}

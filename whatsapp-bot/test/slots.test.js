import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { availableSlots, describeNow } from "../src/slots.js";

const business = JSON.parse(fs.readFileSync(new URL("../businesses/ceilcraft.json", import.meta.url)));
// Tuesday 6 Oct 2026, 11:00 in India
const now = new Date("2026-10-06T05:30:00Z");

test("describeNow reports local Indian time", () => {
  assert.deepEqual(describeNow(business, now), { date: "2026-10-06", time: "11:00", weekday: "Tuesday" });
});

test("today only offers slots after the minimum notice", () => {
  assert.deepEqual(availableSlots(business, "2026-10-06", [], now).slots, ["14:00", "15:00", "16:00", "17:00"]);
});

test("tomorrow offers the full working day", () => {
  const result = availableSlots(business, "2026-10-07", [], now);
  assert.equal(result.weekday, "Wednesday");
  assert.equal(result.slots.length, 8);
  assert.equal(result.slots[0], "10:00");
  assert.equal(result.slots.at(-1), "17:00");
});

test("booked slots are removed", () => {
  const bookings = [{ status: "booked", date: "2026-10-07", time: "10:00" }];
  assert.ok(!availableSlots(business, "2026-10-07", bookings, now).slots.includes("10:00"));
});

test("closed days, past dates, far dates and bad input are refused", () => {
  assert.match(availableSlots(business, "2026-10-11", [], now).reason, /Closed on Sunday/);
  assert.match(availableSlots(business, "2026-10-05", [], now).reason, /past/);
  assert.match(availableSlots(business, "2026-10-21", [], now).reason, /14 days/);
  assert.match(availableSlots(business, "2026-02-30", [], now).reason, /Invalid/);
  assert.match(availableSlots(business, "7 Oct", [], now).reason, /Invalid/);
});

test("late evening pushes notice into the next morning", () => {
  const lateNight = new Date("2026-10-06T17:00:00Z"); // 22:30 IST
  assert.equal(availableSlots(business, "2026-10-06", [], lateNight).available, false);
  assert.equal(availableSlots(business, "2026-10-07", [], lateNight).slots[0], "10:00");
});

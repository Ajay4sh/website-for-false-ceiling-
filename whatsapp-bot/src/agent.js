// The AI assistant: one reply per customer message, using tools to check
// slots, book visits, save leads and hand the chat to the owner.

import { availableSlots, describeNow } from "./slots.js";

export const DEFAULT_MODEL = "claude-opus-5-5";
const CONVERSATION_RESET_MS = 24 * 3600_000; // start fresh after a day of silence
const HANDOFF_PAUSE_MS = 12 * 3600_000; // bot stays quiet while the owner takes over
const MAX_TOOL_ROUNDS = 6;
export const FALLBACK_REPLY =
  "Maaf kijiye, abhi thodi technical dikkat aa rahi hai. Hamari team aapko jaldi contact karegi.";

export function buildSystemPrompt(business) {
  const { booking } = business;
  const info = {
    name: business.name,
    type: business.type,
    city: business.city,
    areasServed: business.areasServed,
    phone: business.phone,
    address: business.address,
    hours: business.hoursText,
    services: business.services,
    priceList: business.priceList,
    faqs: business.faqs,
    policies: business.policies,
  };

  return `You are the WhatsApp assistant for ${business.name} (${business.type}) in ${business.city}. You chat with customers who message the business on WhatsApp.

Language and style
- Reply in the customer's language. Most customers write Hindi or Hinglish (Hindi in Roman script): reply to them in natural, polite Hinglish, always "aap", never "tum". Reply in English to English and in Devanagari to Devanagari.
- This is WhatsApp: keep replies short (2–4 lines, under 60 words) and ask one question at a time. No headings, tables or long lists. Use *bold* only for dates, times and prices.
- In your first reply of a conversation, greet them, say you are ${business.name}'s automated assistant, and add one short line that their details are used only to handle their enquiry.

What you do
1. Answer questions using only the business information below. If something is not covered, do not guess: say the team will confirm it, and use handoff_to_owner if they need the answer to go ahead.
2. Prices: quote only the ranges in the price list, always as indicative. The exact quote is given after the site visit. Never offer discounts or deals.
3. Understand the enquiry through natural conversation, not a questionnaire. Useful details: ${business.leadQuestions.join(" ")} Once you know what they need and their area, call save_lead. Call it again only if important details change.
4. Book the ${booking.appointmentName}; this is the goal of most chats. Always call check_available_slots before offering times, and never offer a time you have not checked. Offer 2–3 options. Before booking, collect: ${booking.requiredDetails.join(", ")}. Read back the date, time and address, and call book_appointment only after the customer confirms. Then confirm the booking to them.
5. Call handoff_to_owner when the customer asks for a person or a call back, complains or is unhappy, wants a custom quote or to negotiate, or asks something you cannot answer from the information below. Then tell them the owner will contact them soon.

Dates: every customer message starts with the current local day, date and time in [brackets]. The system adds this; the customer did not write it. Work out "aaj", "kal", "parson" or a weekday from it. In tool calls always use YYYY-MM-DD dates and 24-hour HH:MM times; to customers say times like "11 baje" or "11:00 am".

Never invent services, prices, offers, timelines or availability. Never ask for payment or bank details. If the customer goes off-topic, politely bring the chat back to their enquiry.

Business information:
${JSON.stringify(info, null, 2)}`;
}

const text = (description) => ({ type: "string", description });

export const TOOLS = [
  {
    name: "check_available_slots",
    description:
      "Get the free appointment times for one date. Call this before offering or booking any time. Returns the free HH:MM start times, or a reason the day is unavailable.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { date: text("Date in YYYY-MM-DD, business local time.") },
      required: ["date"],
      additionalProperties: false,
    },
  },
  {
    name: "book_appointment",
    description:
      "Book a confirmed appointment slot for this customer. Only call after checking availability and after the customer has confirmed the date, time and address.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        customer_name: text("Customer's name."),
        date: text("YYYY-MM-DD."),
        time: text("24-hour HH:MM start time, exactly as returned by check_available_slots."),
        address: text("Full site address with landmark."),
        service_interest: text("What they want, e.g. 'gypsum ceiling with cove lighting, living room 14x12'."),
        notes: text("Anything else the visiting team should know, or empty string."),
      },
      required: ["customer_name", "date", "time", "address", "service_interest", "notes"],
      additionalProperties: false,
    },
  },
  {
    name: "save_lead",
    description:
      "Save or update this customer's enquiry for the owner. Call once you know what they need and their area. Use an empty string for anything not yet known.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        customer_name: text("Name, or empty string."),
        area: text("Locality or area of the site."),
        property_type: text("Home, office, shop, etc., or empty string."),
        service_interest: text("What they want."),
        requirement_details: text("Rooms, sizes, design ideas, or empty string."),
        budget: text("Budget if mentioned, or empty string."),
        timeline: text("When they want the work done, or empty string."),
      },
      required: [
        "customer_name",
        "area",
        "property_type",
        "service_interest",
        "requirement_details",
        "budget",
        "timeline",
      ],
      additionalProperties: false,
    },
  },
  {
    name: "handoff_to_owner",
    description:
      "Alert the owner to take over this chat personally. Use when the customer asks for a person or call back, complains, wants a custom quote or negotiation, or asks something not covered by the business information.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        reason: text("Short reason, e.g. 'wants exact quote for 3BHK'."),
        summary: text("2–3 line summary of the chat so far for the owner."),
      },
      required: ["reason", "summary"],
      additionalProperties: false,
    },
  },
];

const textOf = (response) =>
  response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

const shortId = (prefix) => `${prefix}${Date.now().toString(36).toUpperCase()}`;

export function createAgent({ client, business, store, notifyOwner, model = DEFAULT_MODEL, now = () => new Date() }) {
  const system = [{ type: "text", text: buildSystemPrompt(business), cache_control: { type: "ephemeral" } }];

  async function alertOwner(message) {
    try {
      await notifyOwner(message);
    } catch (err) {
      console.error("Owner alert failed:", err.message);
    }
  }

  async function runTool(name, input, ctx) {
    const customer = `+${ctx.phone}`;
    switch (name) {
      case "check_available_slots":
        return availableSlots(business, input.date, store.bookings, now());

      case "book_appointment": {
        const check = availableSlots(business, input.date, store.bookings, now());
        if (!check.slots.includes(input.time)) {
          return { ok: false, error: "That time is not available. Offer one of the free slots instead.", ...check };
        }
        const booking = {
          id: shortId("B"),
          status: "booked",
          phone: ctx.phone,
          ...input,
          createdAt: now().toISOString(),
        };
        store.addBooking(booking);
        await alertOwner(
          `New ${business.booking.appointmentName} booked\n` +
            `${check.weekday} ${input.date}, ${input.time}\n` +
            `Name: ${input.customer_name}\nPhone: ${customer}\nAddress: ${input.address}\n` +
            `Need: ${input.service_interest}${input.notes ? `\nNotes: ${input.notes}` : ""}`,
        );
        return { ok: true, booking_id: booking.id, date: input.date, weekday: check.weekday, time: input.time };
      }

      case "save_lead": {
        store.addLead({ id: shortId("L"), phone: ctx.phone, ...input, createdAt: now().toISOString() });
        const details = [input.property_type, input.requirement_details, input.budget, input.timeline]
          .filter(Boolean)
          .join(" · ");
        await alertOwner(
          `New enquiry: ${input.customer_name || "(name not given)"} ${customer}\n` +
            `Area: ${input.area}\nNeed: ${input.service_interest}${details ? `\n${details}` : ""}`,
        );
        return { ok: true };
      }

      case "handoff_to_owner":
        ctx.handoff = true;
        await alertOwner(`Please contact ${customer} yourself\nReason: ${input.reason}\n${input.summary}`);
        return {
          ok: true,
          note: "Owner alerted. Tell the customer the owner will contact them soon. The assistant stops replying in this chat after this message.",
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Returns { reply } to send, or { reply: null, paused: true } while the owner has taken over.
  async function reply(phone, customerText) {
    const current = now();
    const conversation = store.getConversation(phone);
    if (conversation.pausedUntil > current.getTime()) return { reply: null, paused: true };

    // History is append-only within a conversation; a stale one is replaced, never edited.
    const isStale = current.getTime() - conversation.updatedAt > CONVERSATION_RESET_MS;
    const messages = isStale ? [] : [...conversation.messages];
    const clock = describeNow(business, current);
    messages.push({ role: "user", content: `[${clock.weekday} ${clock.date}, ${clock.time}]\n${customerText}` });

    const ctx = { phone, handoff: false };
    let replyText = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS && replyText === null; round++) {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system,
        tools: TOOLS,
        messages,
      });
      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "tool_use") {
        const results = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          try {
            const result = await runTool(block.name, block.input, ctx);
            results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
          } catch (err) {
            results.push({ type: "tool_result", tool_use_id: block.id, content: err.message, is_error: true });
          }
        }
        messages.push({ role: "user", content: results });
      } else if (response.stop_reason === "refusal") {
        ctx.handoff = true;
        await alertOwner(`Please contact +${phone} yourself; the assistant could not handle their last message.`);
        replyText = FALLBACK_REPLY;
      } else {
        replyText = textOf(response) || FALLBACK_REPLY;
      }
    }

    store.setConversation(phone, {
      messages,
      updatedAt: current.getTime(),
      pausedUntil: ctx.handoff ? current.getTime() + HANDOFF_PAUSE_MS : 0,
    });
    return { reply: replyText ?? FALLBACK_REPLY };
  }

  return { reply };
}

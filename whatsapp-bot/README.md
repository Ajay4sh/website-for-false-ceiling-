# WhatsApp booking bot

An AI assistant that answers a business's WhatsApp enquiries in Hindi, Hinglish or English. It works 24/7 and:

- answers questions using only the business's own information (services, price ranges, FAQs)
- collects the enquiry details and sends the owner a lead alert on WhatsApp
- checks free time slots and books appointments (site visits, demos, consultations)
- hands the chat to the owner when the customer asks for a person, complains, or needs a custom quote

Each client business is one file in `businesses/`. `businesses/ceilcraft.json` is the first example, a false-ceiling business.

## 1. Try it in your terminal (no WhatsApp needed)

You need Node.js 22.9 or newer and a Claude API key from https://platform.claude.com.

```bash
cd whatsapp-bot
npm install
cp .env.example .env        # then put your key after ANTHROPIC_API_KEY=
npm run chat
```

Type messages as a customer would, for example `ceiling ka rate kya hai?` or `kal site visit ho sakti hai?`. Owner alerts print in the terminal. Test bookings are saved in `data/<business>-test.json`.

Commands: `/reset` starts a new conversation, `/bookings` and `/leads` show what was saved, `/quit` exits.

## 2. Set up a business

Copy `businesses/ceilcraft.json` and edit it. Fill in every field; the bot only knows what is written here.

| Field | What to put |
| --- | --- |
| `name`, `type`, `city`, `areasServed`, `phone`, `address`, `hoursText` | Basic details customers ask about |
| `ownerWhatsapp` | Owner's WhatsApp number with country code, no `+` (e.g. `919876543210`) |
| `booking` | Working days (0 = Sunday … 6 = Saturday), hours, slot length, how many bookings per slot, how far ahead, minimum notice |
| `leadQuestions` | What the bot should find out about each enquiry |
| `services`, `priceList`, `faqs`, `policies` | What the bot may tell customers. Prices are quoted only as these ranges. |

Then set `BUSINESS_FILE` in `.env` to the new file.

**Before going live, replace the placeholder city, areas, phone and address in `ceilcraft.json` with your real details.**

## 3. Connect WhatsApp

1. Create a Meta developer app with WhatsApp at https://developers.facebook.com and add a phone number. Use a number that is **not** already on the normal WhatsApp app, or check Meta's current "coexistence" option first.
2. From **WhatsApp > API setup**, copy the access token and phone number ID into `.env` (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`). Use a permanent system-user token for production; the dashboard's temporary token expires in 24 hours.
3. Copy the app secret (**App settings > Basic**) into `WHATSAPP_APP_SECRET`, and choose any secret word for `WHATSAPP_VERIFY_TOKEN`.
4. Deploy the bot (step 4) so it has a public `https://` address.
5. In **WhatsApp > Configuration**, set the webhook URL to `https://<your-address>/webhook` with your verify word, and subscribe to the `messages` field.
6. Message the business number from your phone to test.

## 4. Deploy

Run `npm start` on any server with Node.js 22.9+. The bot saves data in `data/`, so use hosting with a **persistent disk**, such as a small cloud VM or a platform with a volume. Hosting that wipes files on every restart will lose bookings.

Check it is running at `https://<your-address>/health`.

## How it works

| File | Job |
| --- | --- |
| `src/server.js` | Receives WhatsApp messages from Meta, checks they are genuine, replies |
| `src/agent.js` | The AI assistant: instructions, tools, conversation memory |
| `src/slots.js` | Works out free appointment times in Indian time |
| `src/store.js` | Saves bookings, leads and chats to a JSON file |
| `src/whatsapp.js` | Sends WhatsApp messages |
| `src/cli.js` | Terminal chat for testing |

- **Conversations** are remembered for 24 hours of silence, then start fresh.
- **Handoff:** after a handoff, the bot stays silent in that chat for 12 hours so the owner can take over from their own phone.
- **Model:** uses `claude-opus-5-5` at low effort by default. Set `CLAUDE_MODEL` in `.env` to change it. If Claude declines a message for safety reasons, the request is retried on a fallback model automatically (`fallbacks: "default"`); if that also declines, the owner is alerted.
- **Cost:** replies to customers who message first are free on WhatsApp's side within 24 hours. Claude charges per token: check https://platform.claude.com for current prices and measure your real cost per conversation during testing.

## Known limits (next steps)

- **Owner alerts** are normal WhatsApp messages, which Meta only delivers if the owner has messaged the business number in the last 24 hours. For reliable alerts, create an approved utility template and send alerts with it.
- Voice notes and photos get a polite "please type your message" reply.
- Bookings are not yet synced to Google Calendar, and there are no automatic reminders.
- One business per running server. Serving several clients means running one copy each, until multi-client support is added.
- No missed-call follow-up yet.

## Tests

```bash
npm test
```

The tests use a simulated Claude, so they need no API key.

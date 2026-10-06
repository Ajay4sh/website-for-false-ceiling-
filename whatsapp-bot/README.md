# BookBot: AI WhatsApp booking assistant for local businesses

BookBot answers a business's WhatsApp enquiries 24/7 in Hindi, Hinglish or English, books appointments, and follows up missed calls. Each business owner gets a dashboard showing their leads, bookings and chats. You run one server for all your clients. ("BookBot" is a placeholder name; set `PRODUCT_NAME` to rename it.)

## What it does

**For customers (on WhatsApp)**
- Answers questions from the business's own information: services, price ranges, FAQs, hours.
- Understands photos, for example a site photo or a design the customer likes.
- Collects enquiry details and books appointments into free slots.
- Sends a reminder before the appointment. A customer can reply STOP to opt out of reminders.
- After a missed call, sends a WhatsApp message asking how it can help.

**For business owners (dashboard and WhatsApp alerts)**
- Instant WhatsApp alert for every new lead, booking, missed call and handoff.
- Leads, with Won/Lost tracking and CSV download.
- Bookings: mark done, mark no-show or cancel. Bookings also appear in Google Calendar.
- Chat transcripts, with "pause bot, I'll reply myself".
- Monthly report, printable as a PDF, showing what the assistant achieved.
- Self-service editing of business details, hours, services, prices and FAQs.
- Deletion of a customer's data on request.

**For you (admin)**
- Add clients, connect their WhatsApp numbers, templates, calendar and missed-call link.
- Create owner logins. Each owner sees only their own business.
- Activity log, automatic data retention, daily backups.
- A demo client with sample data for sales meetings.

## Quick start on your computer

Needs Node.js 22.13 or newer.

```bash
cd whatsapp-bot
npm install
cp .env.example .env            # add at least ANTHROPIC_API_KEY
npm test                        # 52 automated tests, no API key needed
npm run chat                    # chat with the assistant in the terminal
```

To see the dashboard locally, using made-up WhatsApp values:

```bash
npm run manage -- gen-key       # paste into APP_ENCRYPTION_KEY in .env
# in .env set PUBLIC_URL=http://localhost:3000 and any text for the three WHATSAPP_ values
npm run manage -- create-admin you@example.com "Your Name"
npm run manage -- seed-demo     # optional: demo client with sample data
npm start                       # open http://localhost:3000
```

## Going live

Follow **[docs/setup.md](docs/setup.md)**. It covers renting the server, HTTPS, Meta/WhatsApp, message templates, Google Calendar, missed calls, and onboarding each new client.

| Document | What's in it |
| --- | --- |
| [docs/setup.md](docs/setup.md) | Step-by-step deployment and client onboarding |
| [docs/whatsapp-templates.md](docs/whatsapp-templates.md) | Exact template texts to submit to Meta |
| [docs/security-privacy.md](docs/security-privacy.md) | Security controls, data handled, India DPDP mapping |
| [docs/status.md](docs/status.md) | What's built, how it was tested, known limits |

## Code map

| Path | Job |
| --- | --- |
| `src/server.js` | Starts everything |
| `src/app.js` | Web app assembly and security headers |
| `src/agent.js` | The AI assistant: instructions, tools, memory |
| `src/webhooks.js` | Incoming WhatsApp messages and missed calls |
| `src/services.js` | Per-client wiring: WhatsApp sender, alerts, calendar |
| `src/jobs.js` | Reminders and data retention (every minute) |
| `src/db.js` | SQLite database and all queries |
| `src/dashboard/` | Dashboard pages, logins and sessions |
| `src/manage.js` | Admin commands (`npm run manage`) |
| `businesses/` | Example business profile |
| `deploy/` | Docker Compose and HTTPS proxy config |

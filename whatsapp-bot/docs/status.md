# Project status: version 1.0

**Summary:** everything planned for v1 is built. It passes 52 automated tests with a simulated Claude and simulated WhatsApp, Google and phone-provider endpoints. The dashboard was checked in a real browser at desktop and phone sizes. **Not yet verified against the live services:** the real Claude API, Meta's WhatsApp API, Google Calendar and a phone provider. A Docker image build was also not possible in the build environment. Do a live test before your first paying client (docs/setup.md, step 7).

## Requirements

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| FR-01 | Answer WhatsApp messages in Hindi/Hinglish/English from the client's business information | Implemented; tested with a simulated Claude | `agent.test.js`, `webhooks.test.js` |
| FR-02 | Many clients on one server, routed by WhatsApp number | Tested | `webhooks.test.js` |
| FR-03 | Check free slots and book appointments; no double booking | Tested | `slots.test.js`, `agent.test.js` |
| FR-04 | Capture leads; update a returning customer's lead instead of duplicating it | Tested | `agent.test.js` |
| FR-05 | Owner alerts, via approved template when set | Tested (simulated) | `webhooks.test.js` |
| FR-06 | Hand the chat to the owner and pause the bot | Tested | `agent.test.js`, `dashboard.test.js` |
| FR-07 | Understand customer photos | Tested (simulated) | `webhooks.test.js` |
| FR-08 | Appointment reminders via template; one attempt; skipped when not appropriate | Tested | `jobs.test.js` |
| FR-09 | Missed-call follow-up from any provider via a secret link | Tested (simulated) | `webhooks.test.js` |
| FR-10 | Google Calendar: add event on booking, remove on cancel or deletion | Tested (simulated Google) | `security.test.js`, `dashboard.test.js`, `webhooks.test.js` |
| FR-11 | Dashboard: overview, leads (status, CSV), bookings, chats, monthly report, business settings | Tested and viewed in a browser | `dashboard.test.js`, screenshots |
| FR-12 | Admin: clients, integrations, logins, activity log | Tested | `dashboard.test.js` |
| FR-13 | STOP/START opt-out | Tested | `webhooks.test.js` |
| FR-14 | Delete a customer's data; automatic retention | Tested | `dashboard.test.js`, `jobs.test.js` |
| FR-15 | Demo client for sales meetings | Implemented, run manually | `npm run manage -- seed-demo` |
| SEC-01–12 | Security controls | See docs/security-privacy.md | Tests listed there |
| NFR-01 | Works on phone screens | Verified at 390 px width: no sideways scrolling, tables become cards | Playwright check |
| NFR-02 | Light and dark mode | Implemented | Screenshot |
| NFR-03 | Deployable on a small server with HTTPS | Dockerfile and Compose written. Production-only install and start-up tested; image build not tested. | — |

## How it was tested

`npm test` runs 52 tests in about 3 seconds, all passing. They run the real app on a random port with a real (in-memory) SQLite database. They use a scripted stand-in for Claude, and fake WhatsApp, Google and phone-provider endpoints that record every request. Login, client isolation, CSRF, XSS escaping, webhook signatures, reminders, retention and calendar request signing are all covered.

## Known limits

- **AI reply quality is untested with the real model.** Before going live, chat with it in Hindi and Hinglish using `npm run chat`, and adjust the business profile if answers are off.
- **Voice notes, video and documents** get a "please type" reply; there is no transcription.
- **No two-factor login.** Passwords and rate limits only.
- **Single server process.** The rate limits and duplicate-message memory are kept in memory, which is fine for one server but not for several behind a load balancer.
- **Chat history shows the current conversation only** (it resets after 24 hours of silence). Older conversations are replaced, not archived.
- **Booking slots** have one length per client. There are no per-staff or per-service calendars.
- **No AI voice calls.** Missed calls get a WhatsApp follow-up instead. Voice can be added later through a provider such as Bolna if clients ask.
- **Backups** stay on the same server unless you copy them off.
- **Node's built-in SQLite** is marked experimental in Node 22. It works and is tested, and the warning is hidden. Upgrade Node in the Dockerfile when a newer LTS marks it stable.

## Next steps

1. Live test with your own number and business (docs/setup.md, step 7).
2. Submit the three WhatsApp templates (docs/whatsapp-templates.md).
3. Get a lawyer to review the privacy notice wording and the client data processing agreement (docs/security-privacy.md).
4. After the first pilots: two-factor login, offsite backups, and uptime monitoring.

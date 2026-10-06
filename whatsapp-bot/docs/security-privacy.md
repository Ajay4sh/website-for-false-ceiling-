# Security and privacy

This page records what data BookBot holds, how it is protected, and how it maps to India's data protection law. It is engineering documentation, not legal advice. **A lawyer should confirm how the law applies to your business and your clients before you sign client contracts.**

## Data held

| Data | Why | Where | Who can see it | Kept for |
| --- | --- | --- | --- | --- |
| Customer phone number | Reply, remind, follow up | SQLite on your server | Admin; that client's owner | Until retention or deletion |
| Chat history (text; photos as image data) | Context for the assistant; owner review | Same | Same; sent to Anthropic's API for each reply | Default 180 days after last message (per-client setting) |
| Name, area, address, requirement, budget | Lead and booking details | Same, and the owner's Google Calendar if connected | Same | Default 730 days (per-client setting) |
| Owner and admin logins | Dashboard access | Same; passwords hashed with scrypt | Admin | Until disabled |
| Client WhatsApp tokens | Sending messages | Same; encrypted with AES-256-GCM | Never shown after saving | Until replaced |
| Dashboard activity log | Accountability | Same | Admin | Not purged automatically |

**Processors involved:** Meta (WhatsApp delivery), Anthropic (AI replies), Google (calendar, if used), your phone provider (missed calls), and your server host.

## Controls built in

| Risk | Control | Tested by |
| --- | --- | --- |
| One client's owner sees another client's data | Every query is pinned to the signed-in owner's client. Other clients' pages return 404. Admin pages are admin-only. | `dashboard.test.js`: owner cannot see or change another client's data |
| Stolen or guessed passwords | scrypt hashing. Sign-in locks after 5 failures per email or 20 per IP in 15 minutes. Changing a password signs out other devices. | `security.test.js`, `dashboard.test.js` |
| Session theft | Random 256-bit session tokens, stored only as hashes. HttpOnly, SameSite=Lax cookies, marked Secure on HTTPS. 7-day expiry. | `dashboard.test.js` |
| Cross-site request forgery | Per-session CSRF token required on every form | `dashboard.test.js`: forms without the CSRF token are refused |
| Script injection (XSS) through customer messages | All output escaped by default. Strict Content-Security-Policy with no inline scripts. | `dashboard.test.js`, `security.test.js` |
| Spreadsheet formula injection in CSV export | Cells starting with = + - @ are prefixed | `dashboard.test.js` |
| Fake WhatsApp webhooks | HMAC-SHA256 signature check with the Meta app secret | `webhooks.test.js` |
| Fake missed-call requests | Secret per-client link (compared in constant time), rate limited | `webhooks.test.js` |
| Leaked database exposing WhatsApp tokens | Tokens encrypted at rest; key kept only in `.env` | `security.test.js` |
| Clickjacking, sniffing, indexing | X-Frame-Options DENY, nosniff, noindex, HSTS on HTTPS | `dashboard.test.js` |
| Message contents in logs | The server logs errors and phone numbers only, never message text | Code review |
| Customer wants no more messages | STOP opts them out of reminders and follow-ups; START opts back in | `webhooks.test.js` |
| Data kept too long | Daily automatic deletion by per-client retention settings | `jobs.test.js` |
| Customer asks for erasure | "Delete this customer's data" removes their chat, leads, bookings and calendar events, and logs who did it | `dashboard.test.js` |
| Data loss | Daily backups kept 14 days (`scripts/backup.sh`) | Restore not yet tested on a real server, so test it once after go-live |

**Not done (consider before scaling):** two-factor login, offsite encrypted backups, uptime monitoring and alerting, an external penetration test.

## India: Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025

**Status:** The Rules commence in stages. The Data Protection Board provisions started 13 Nov 2025, consent-manager registration starts 13 Nov 2026, and the main duties (notice, consent, security, breach reporting, rights) start **13 May 2027** ([KPMG summary](https://assets.kpmg.com/content/dam/kpmgsites/in/pdf/2025/12/dpdp-act-2023-and-dpdp-rules-2025-simplified.pdf)). Verify the current status against the official Gazette notification before relying on these dates.

**Roles (legal interpretation; needs a lawyer's review):** each client business decides why customer data is collected, so it is likely the *Data Fiduciary*. Your agency processes data on its behalf, so it is likely a *Data Processor*. You need a written agreement with each client covering this.

| Requirement (Act/Rules) | Applies from | What BookBot does | Still needed from you | Status |
| --- | --- | --- | --- | --- |
| Notice to the person (purpose of processing) | 13 May 2027 | The assistant's first reply says details are used only to handle the enquiry | A full privacy notice the bot can link to; lawyer to confirm the wording is sufficient | Partial · legal review required |
| Lawful processing (consent or legitimate use) | 13 May 2027 | Customer starts the chat; reminders only for booked customers; STOP opt-out | Lawyer to confirm the basis for reminders and missed-call follow-ups | Legal review required |
| Reasonable security safeguards | 13 May 2027 | Controls table above | Server hardening, offsite backups, access policy | Implemented (core) |
| Breach notification to the Board and affected persons | 13 May 2027 | Activity log and server logs help investigation | A written breach-response plan, with Rule timelines confirmed by a lawyer | Not implemented (process) |
| Erasure when purpose ends / on request | 13 May 2027 | Retention auto-delete; per-customer delete | Agree retention periods with each client | Implemented |
| Rights: access, correction | 13 May 2027 | Owner can view and export a customer's data | Process for handling requests within the required time | Partial |
| Processor contract | 13 May 2027 | — | Data processing agreement with each client | Not implemented (contract) |
| Log retention (one year) | Verify | Activity log is kept; server logs depend on Docker settings | Configure log retention on the server; lawyer to confirm what applies to you | Legal review required |

## Other rules to check

- **WhatsApp Business policies:** use only the official API (done). Meta restricts general-purpose AI chatbots on the WhatsApp Business API. BookBot is business-specific, but **check the current WhatsApp Business Solution Terms before launch**. Marketing templates need opt-in.
- **Telecom (TRAI):** BookBot does not place outbound calls or SMS. Missed-call follow-ups go over WhatsApp. Keep it that way unless you register for commercial communications.
- **Health data:** for clinics, keep the bot to scheduling. It is instructed to stick to the business information; don't add medical advice to a clinic's profile.
- **Anthropic usage policies and data handling:** check the current terms for your API account.

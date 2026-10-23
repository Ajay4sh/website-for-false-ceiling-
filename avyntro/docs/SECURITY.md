# Security checklist

Status of each control as implemented, with what remains for production.

## Implemented

| Control | Where | Notes |
|---|---|---|
| Server-side validation | `src/lib/demo/schema.ts`, `handler.ts` | Same Zod schema as the browser; the server is authoritative. Lengths capped per field. |
| Request size limit | `src/app/api/demo/route.ts` | Body streamed with an 8 KB hard cap (does not trust `Content-Length`); 413 above it. |
| Content-type check | `handler.ts` | Only `application/json`; 415 otherwise. |
| Rate limiting | `src/lib/demo/rate-limit.ts` | Per-IP fixed window, default 5 per 10 minutes; 429 with `Retry-After`. |
| Spam protection | `handler.ts`, `DemoForm.tsx` | Hidden honeypot field plus minimum fill time (3 s). No third-party CAPTCHA, so no tracking. |
| Honest outcomes | `handler.ts`, `deliver.ts`, `DemoForm.tsx` | 200 only after downstream delivery succeeds; 503 when not configured; 502 on downstream failure. The UI shows success only on `ok: true` with a reference id. |
| Duplicate submission | `DemoForm.tsx` | In-flight guard plus disabled button (e2e-tested: one request per click burst). |
| Safe logging | `route.ts` | Logs only request id, outcome, reason and intent. **No names, emails or message content.** |
| Data minimisation | `schema.ts` | Only sales-qualification fields; phone, role and requirements are optional. Anti-spam fields are stripped before delivery. |
| Safe output | everywhere | React escaping; no user input is rendered as HTML. Email delivery is plain text. JSON-LD escapes `<`. |
| Webhook integrity | `deliver.ts` | Optional HMAC-SHA256 signature header; 8 s timeout. |
| Secret management | `.env.example` | Secrets are read only in server code (`deliver.ts`, `route.ts`); none use the `NEXT_PUBLIC_` prefix. `.env*` is git-ignored. |
| Security headers | `next.config.ts` | CSP, HSTS (2 years, preload), X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP. `X-Powered-By` removed. Verified by e2e test. |
| No eval | `schema.ts` | Zod runs in `jitless` mode, so the CSP's ban on `eval` causes no violations. |
| No auth surface | n/a | The marketing site has no login, sessions or cookies. |
| Analytics and consent | n/a | No analytics or third-party scripts are installed. Add a consent mechanism before adding any. |

## Dependency review

- `npm audit --omit=dev`: **0 vulnerabilities** in production dependencies (checked 2026-10-23).
- Dev-only: 5 high-severity advisories in `braces` via `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` (stack-exhaustion DoS when matching attacker-controlled glob patterns). This is lint tooling only, never shipped or run on user input. The suggested "fix" downgrades eslint-config-next to v14, which is incompatible, so it is accepted until upstream updates.

## Known limitations and production recommendations

1. **CSP `script-src 'unsafe-inline'`.** Next.js injects inline bootstrap scripts into statically rendered pages. Nonce-based CSP would force every page to render dynamically. This is mitigated by having no user-generated HTML and by `object-src 'none'`, `base-uri 'self'` and `frame-ancestors 'none'`. Revisit if dynamic rendering becomes acceptable.
2. **In-memory rate limiter.** State is per server instance. On serverless or multi-instance hosting, add a platform rule (for example Vercel Firewall: rate limit `POST /api/demo`) or a shared store such as Redis or Upstash for strict limits.
3. **`X-Forwarded-For` trust.** The client key assumes a proxy that overwrites this header (true on Vercel). Elsewhere, configure the proxy accordingly.
4. **Spam.** Honeypot and timing stop simple bots. If targeted spam appears, add Cloudflare Turnstile or similar, and update the CSP and privacy policy.
5. **Webhook receiver.** It must verify the signature and treat the payload as untrusted input.

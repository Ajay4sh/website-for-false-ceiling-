# Deployment

The site is a standard Next.js app: static pages plus one Node.js API route (`/api/demo`). It runs on any host that supports Next.js 16.

## Vercel (recommended)

1. Import the repository in Vercel and set **Root Directory** to `avyntro`.
2. Framework preset: Next.js. Build command `npm run build`, output is handled automatically.
3. Add the environment variables from `.env.example` (Production and Preview):
   - `NEXT_PUBLIC_SITE_URL`: production only. Leave it **unset for Preview** so previews stay `noindex`.
   - `DEMO_DELIVERY` plus the matching webhook or Resend variables.
   - `NEXT_PUBLIC_CONTENT_REVIEW=true` until the content review is signed off.
4. Deploy, then add your domain under **Settings → Domains**.
5. Recommended: enable Vercel Firewall rate limiting on `/api/demo` (see SECURITY.md).

## Any Node.js host

```bash
npm ci
npm run build
NODE_ENV=production npm start -- -p 3000
```

Put it behind a reverse proxy that terminates TLS and sets `X-Forwarded-For`. The rate limiter keys on the first `X-Forwarded-For` entry, so make sure the proxy overwrites client-supplied values.

## Form delivery: choose one

**Webhook** (CRM, Zapier, Make, n8n, or your own service)

```
DEMO_DELIVERY=webhook
DEMO_WEBHOOK_URL=https://...
DEMO_WEBHOOK_SECRET=<random 32+ chars>
```

Payload: `{ id, receivedAt, request: { intent, fullName, email, company, role?, companySize, product, requirements?, phone?, consent } }`. Verify `X-Avyntro-Signature` = hex HMAC-SHA256(secret, raw body). Respond with any 2xx to accept. Any other status, or a timeout after 8 s, makes the visitor see an error.

**Email via Resend**

```
DEMO_DELIVERY=resend
RESEND_API_KEY=re_...
DEMO_NOTIFY_TO=sales@your-domain.com
DEMO_NOTIFY_FROM=Avyntro Website <website@your-domain.com>   # domain must be verified in Resend
```

**Not configured:** the API returns 503 and the visitor sees "We could not send your request". Success is never simulated.

## Post-deploy checklist

- [ ] Submit a real test request and confirm it arrives in the CRM or inbox.
- [ ] Submit with the webhook endpoint returning an error and confirm the site shows the error message.
- [ ] `https://<domain>/robots.txt` lists the sitemap and `https://<domain>/sitemap.xml` lists production URLs.
- [ ] Check the response headers (CSP, HSTS, X-Frame-Options) with securityheaders.com or `curl -I`.
- [ ] Run Lighthouse on `/`, a product page and `/book-demo`.
- [ ] Add the domain to Google Search Console and submit the sitemap.

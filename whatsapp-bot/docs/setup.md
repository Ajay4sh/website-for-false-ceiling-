# Going live

This guide gets BookBot running on your own server with HTTPS, then connects WhatsApp, templates, Google Calendar and missed calls, and onboards a client.

Meta's and Google's screens change often. Where a step below doesn't match what you see, follow their current documentation for that step.

## 1. Server and domain (about ₹400–1,000/month)

1. Rent a small Linux server: Ubuntu 24.04, 1–2 GB RAM, in an Indian region (Mumbai or Bangalore), from a provider such as Hostinger, DigitalOcean or AWS Lightsail.
2. In your domain's DNS settings, add an **A record**, for example `bot.yourdomain.in`, pointing to the server's IP address.
3. Install Docker on the server: https://docs.docker.com/engine/install/ubuntu/

## 2. Install BookBot

```bash
sudo mkdir -p /opt/bookbot && sudo chown $USER /opt/bookbot && cd /opt/bookbot
git clone https://github.com/Ajay4sh/website-for-false-ceiling-.git .
cd whatsapp-bot
cp .env.example .env
mkdir -p data secrets && sudo chown 1000:1000 data
```

Generate the encryption key, then edit `.env`:

```bash
docker run --rm node:22-slim node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
nano .env
```

Fill in `ANTHROPIC_API_KEY`, `APP_ENCRYPTION_KEY`, `PUBLIC_URL=https://bot.yourdomain.in` and `DOMAIN=bot.yourdomain.in`. The WhatsApp values come in step 3; until then, put any temporary text in them so the server starts. **Save a copy of `APP_ENCRYPTION_KEY` in your password manager.**

Start it:

```bash
cd deploy
docker compose up -d --build
curl https://bot.yourdomain.in/health      # should print {"ok":true}
```

Create your admin login (it prints a temporary password), then sign in at `https://bot.yourdomain.in` and change the password under your name:

```bash
docker compose exec bookbot node --disable-warning=ExperimentalWarning src/manage.js create-admin you@yourdomain.in "Your Name"
```

Turn on daily backups (they're kept for 14 days in `data/backups`; also copy them off the server regularly):

```bash
crontab -e
# add this line:
15 2 * * * /opt/bookbot/whatsapp-bot/scripts/backup.sh >> /var/log/bookbot-backup.log 2>&1
```

**Updating later:** `cd /opt/bookbot && git pull && cd whatsapp-bot/deploy && docker compose up -d --build`

## 3. WhatsApp (Meta)

You set this up once for your agency; each client's number is then added to it.

1. Create a **Meta Business portfolio** at https://business.facebook.com and complete business verification. Meta limits unverified accounts.
2. At https://developers.facebook.com create an app of type **Business** and add the **WhatsApp** product.
3. Copy **App settings > Basic > App secret** into `WHATSAPP_APP_SECRET`.
4. Create a permanent token: in Business settings > **System users**, add a system user (Admin), assign it your app and WhatsApp account, and generate a token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions. Put it in `WHATSAPP_TOKEN`.
5. Choose a secret word for `WHATSAPP_VERIFY_TOKEN`, then restart: `docker compose up -d`.
6. In the app's **WhatsApp > Configuration**, set the callback URL to `https://bot.yourdomain.in/webhook` with the same verify word, and subscribe to the **messages** field.

**Adding a client's number:** in WhatsApp Manager, add the phone number, verify it by SMS or call, and set its display name. Copy its **Phone number ID** into the client's Integrations page.

A number that is already on the normal WhatsApp app usually has to be removed from it first. Check whether Meta's "coexistence" option is available for the client before moving their main number. If a client has their own WhatsApp Business account, paste a token for it in their Integrations page; it is stored encrypted.

## 4. Message templates

WhatsApp only delivers messages you start (owner alerts, reminders, missed-call follow-ups) if they use a template Meta has approved. Submit the three templates in [whatsapp-templates.md](whatsapp-templates.md) in WhatsApp Manager. Once approved, enter their names in each client's Integrations page.

Until the owner-alert template is approved, alerts reach the owner only if they messaged the business number in the last 24 hours.

## 5. Google Calendar (optional)

1. At https://console.cloud.google.com create a project, then enable the **Google Calendar API**.
2. Go to IAM & Admin > **Service accounts** > Create. Open it > Keys > **Add key > JSON**. Save the file on the server as `whatsapp-bot/secrets/google-service-account.json`.
3. In `.env` set `GOOGLE_SERVICE_ACCOUNT_FILE=/app/secrets/google-service-account.json` and restart.
4. For each client: the owner opens Google Calendar > Settings > their calendar > **Share with specific people**. They add the service account email (shown on the Integrations page) with **Make changes to events**. Then copy the **Calendar ID** from "Integrate calendar" into Integrations.

## 6. Missed calls (optional)

The client's phone provider calls a secret link whenever a call is missed. The link is shown on the client's Integrations page.

1. In the provider's dashboard, set up a webhook for missed or unanswered calls to that link (GET or POST).
   - **Exotel:** add a Passthru applet to the call flow.
   - **Knowlarity, MyOperator, others:** look for "webhook", "call event URL" or "missed call notification".
2. Set **Field that holds the caller's number** to the field name your provider sends. Exotel uses `CallFrom`.
3. Test it from the server, replacing the link and number:

```bash
curl -X POST "https://bot.yourdomain.in/hooks/missed-call/1/<token>" -d "CallFrom=09876543210"
```

The follow-up WhatsApp message needs the approved missed-call template, unless the caller messaged in the last 24 hours. The owner is always alerted.

## 7. Onboarding a new client (about 30 minutes)

1. **Admin > Add client:** paste and edit the business profile (services, price ranges, FAQs, booking rules).
2. **Business settings:** check every detail with the owner, especially areas, hours and prices.
3. **Integrations:** add the phone number ID, the owner's WhatsApp number, template names, calendar ID, and the missed-call link in their phone provider.
4. **Admin > Logins:** create the owner's login and share the temporary password privately.
5. **Test before handing over:** message the number from your phone, ask a price question, book a test visit, then cancel it from the dashboard. Check that the owner got the alerts and the calendar event appeared and disappeared.
6. Tell the owner: customers can type STOP to stop reminders, and "Pause bot" on a chat lets them reply personally.

## 8. Showing prospects a demo

Keep demo data out of real client data by using a separate database:

```bash
docker compose exec -e DB_FILE=/app/data/demo.db bookbot node --disable-warning=ExperimentalWarning src/manage.js seed-demo
```

For a live demo, run a second copy on your laptop (`npm start` with `DB_FILE=data/demo.db`) and sign in with the printed demo login.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Bot doesn't reply | `docker compose logs bookbot`. The client must be Active with the right Phone number ID, and the webhook must be subscribed to `messages`. |
| "Message for unknown WhatsApp number" in logs | The Phone number ID in Integrations doesn't match the one Meta sends. |
| Owner gets no alerts | Owner WhatsApp number set? Owner-alert template approved and entered? |
| No reminders | Reminder template approved and entered? Bookings made less than 6 hours ahead get no reminder. |
| Calendar events missing | Is the calendar shared with the service account email with "Make changes to events"? Is the Calendar ID correct? |
| Missed-call link returns 400 | The caller-number field name doesn't match what the provider sends. |

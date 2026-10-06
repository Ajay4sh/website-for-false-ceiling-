# WhatsApp message templates

Submit these in WhatsApp Manager > **Message templates** > Create template. Once Meta approves them, enter the template names and language codes on each client's **Integrations** page.

The variables (`{{1}}`, `{{2}}` …) must stay in this order, because BookBot fills them in this order. Meta doesn't allow a variable at the very start or end of a message, so each text has words around them.

You can create one set of templates for all clients if they share a WhatsApp Business account. The business name is passed in as a variable.

## 1. Owner alert

- **Name:** `owner_alert` · **Category:** Utility · **Language:** English (`en`)
- **Body:**

  > New update from your booking assistant: {{1}}. Open your dashboard for full details.

- **Sample for {{1}}:** `New free site visit booked | Wed, 7 Oct, 11:00 | Name: Rohit | Phone: +919876543210`

BookBot replaces line breaks with " | ", because templates can't contain line breaks in variables.

## 2. Appointment reminder

- **Name:** `appointment_reminder` · **Category:** Utility · **Language:** Hindi (`hi`)
- **Body:**

  > Namaste {{1}}, {{2}} ke saath aapki {{3}} {{4}} ko {{5}} baje hai. Kuch badalna ho to isi chat mein reply karein. Reminders band karne ke liye STOP likhein.

- **Samples:** {{1}} `Rohit` · {{2}} `Sharma Ceilings` · {{3}} `free site visit` · {{4}} `Wed, 7 Oct` · {{5}} `11:00 AM`

## 3. Missed-call follow-up

- **Name:** `missed_call_followup` · **Category:** Utility · **Language:** Hindi (`hi`)
- **Body:**

  > Namaste! Aapne {{1}} ko call kiya tha, lekin hum us samay call nahi utha paye. Bataiye, hum aapki kya madad kar sakte hain? Isi chat mein reply karein.

- **Sample for {{1}}:** `Sharma Ceilings`

## Cost and approval notes

- Meta decides the final category. If it re-categorises the missed-call follow-up as **Marketing**, each message costs more: about ₹0.86 plus GST, against about ₹0.12 for Utility (India rates reported in 2026; check Meta's current pricing).
- Replies to a customer within 24 hours of their message don't need templates and are free on Meta's side.
- If a template is rejected, change the wording slightly and resubmit. Don't add offers or promotional words to Utility templates.

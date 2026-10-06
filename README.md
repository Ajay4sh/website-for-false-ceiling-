# Ceiling & Wall Interiors Website

A fast, SEO-friendly website for an interiors business (false ceilings, wall panelling, louvers, partitions and finishes), with an **admin panel** for editing content without touching code.

- **Pages:** Home, Services (14 pages grouped as Ceilings, Walls, Partitions and Finishes), Designs gallery, Cost Calculator (ceiling + wall), About, Contact, Blog
- **Built with:** [Astro](https://astro.build) (static site, very fast)
- **Admin panel:** [Pages CMS](https://pagescms.org) (free; edit through simple forms in your browser)
- **Hosting:** Vercel (free); Netlify also supported

---

## Part 1: Put the website online (one-time setup)

### Step 1. Host it on Vercel (free)
1. Go to <https://vercel.com/signup> and sign up with your **GitHub** account (choose the free **Hobby** plan).
2. Click **Add New… → Project**, find this repository and click **Import**. If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to it.
3. Vercel detects Astro automatically (settings come from `vercel.json`). Click **Deploy**.
4. In a minute or two your site is live at an address like `your-site.vercel.app`.

Vercel then rebuilds the site automatically every time content changes, including edits from the admin panel.

> Prefer Netlify? It works too: at <https://app.netlify.com> choose **Add new site → Import an existing project**. The settings come from `netlify.toml`. Use only one host.

### Step 2. Connect your own domain (e.g. `yourbusiness.in`)
1. Buy a domain from any registrar (GoDaddy, Hostinger, Namecheap, BigRock and others).
2. In Vercel open your project → **Settings → Domains**, add your domain and follow the DNS instructions it shows at your registrar. HTTPS is free and automatic.
3. In the admin panel, open **Business details & prices** and set **Website address** to your domain, e.g. `https://www.yourbusiness.in`.

### Step 3. Set up the admin panel
1. Go to <https://app.pagescms.org> and **Sign in with GitHub**.
2. Allow access to this repository, then open it.
3. The menu on the left shows: Business details & prices, Designs & projects, Services, Customer reviews, FAQs and Blog articles.

### Step 4. Get found on Google
1. **Google Business Profile** (<https://business.google.com>): create or claim your listing. This is the most important step for local customers. Use exactly the same business name, address and phone as on the website.
2. **Google Search Console** (<https://search.google.com/search-console>): add your domain, then submit `https://www.yourbusiness.in/sitemap-index.xml` under **Sitemaps**.
3. Ask happy customers for Google reviews, and add the best ones to the site's **Customer reviews**.

---

## Part 2: Everyday editing (in the admin panel)

Every change you **Save** goes live automatically in about 1–2 minutes.

| I want to… | Where in the admin panel |
|---|---|
| Change phone, WhatsApp, email, address or hours | **Business details & prices** |
| Change the business name, city or areas served | **Business details & prices** |
| Change per-sq-ft rates (cost calculator) | **Business details & prices → Per-sq-ft rates** |
| Change labour-only rates | Same place: the **Labour only** min/max fields on each rate (and the cove labour rate) |
| Add a photo of a finished project | **Designs & projects → Add entry** |
| Show a project on the homepage | Open the project → tick **Show on homepage** |
| Edit a service page | **Services** → open the service |
| **Remove (hide) a service** | **Services** → open it → untick **Show on website** → Save |
| Add a new service | **Services → Add entry**, then pick its **Category** (decides the menu) |
| Move a service to another menu | Change its **Category** |
| Add a customer review | **Customer reviews** → add item |
| Add or change FAQs | **FAQs** |
| Write a blog article | **Blog articles → Add entry** |
| Replace the homepage illustration with a photo | **Business details & prices → Homepage photo** |
| Add your logo | **Business details & prices → Logo** |

### Removing a section you don't offer
Everything is designed to be removed without breaking anything:

- **A service** (e.g. Glass Partitions): untick **Show on website**. It disappears from the menu, homepage, services page, footer, related services and Google sitemap. Tick it again to bring it back. You can also delete it permanently.
- **A whole group** (e.g. all Partitions): hide every service in that category. The heading and menu section disappear on their own. If every wall, partition and finish service is hidden, the **Walls & Partitions** menu disappears too.
- **A calculator rate:** in **Business details & prices → Per-sq-ft rates**, delete the row. If no rows marked **Wall** are left, the calculator shows only the ceiling option.
- **Labour-only option:** empty the labour fields on a rate and it shows "On request". Empty them on every rate and the **With material / Labour only** switch disappears from the calculator and the rates table. Remove a service's **Labour-only price** to hide it on that page.
- **Gallery items, FAQs, blog articles:** delete them in their sections. Blog articles can also be ticked **Draft** to hide them.
- After hiding a whole group, also check the **FAQs** and the homepage text in **Business details & prices** for any mention of it.

### Tips
- **Photos:** use landscape photos (wider than tall), ideally about 1600 px wide. Compress them first at <https://squoosh.app> or <https://tinypng.com> so the site stays fast.
- Until a photo is added, each card shows a built-in ceiling illustration.
- **WhatsApp number:** digits only with the country code, e.g. `919876543210`.
- **Reviews:** only add genuine customer reviews. The reviews section stays hidden until you add the first one.
- **Blog:** articles that answer customers' questions ("False ceiling cost in Kanpur", "Best ceiling for a bedroom") bring visitors from Google over time.
- **Google Maps on the contact page:** in Google Maps, open your business → **Share → Embed a map**, then copy only the link inside `src="..."` into **Google Maps embed link**.

---

## Part 3: For developers

```bash
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # production build into dist/
npm run check    # type check
```

Requires Node.js 22.12 or newer.

### Where things live

```
.pages.yml                  Admin panel (Pages CMS) form definitions
src/data/settings.json      Business details, homepage text and rates
src/data/faqs.json          FAQs
src/data/reviews.json       Customer reviews
src/content/services/       One Markdown file per service page (category + show/hide flag)
src/lib/constants.ts        Service categories, header dropdown menus, illustration names
src/lib/catalog.ts          Helpers that return visible services, grouped by category
src/content/designs/        Gallery / project entries
src/content/blog/           Blog articles
src/content.config.ts       Content schemas (fields each item must have)
src/pages/                  Page templates and routes
src/components/             Reusable sections (calculator, gallery, contact form…)
src/layouts/Base.astro      HTML head, SEO tags, structured data, header and footer
src/styles/global.css       All styling; colours and fonts are at the top
public/images/uploads/      Images uploaded from the admin panel
```

### SEO features built in
- A unique title and meta description on every page, with the city name added automatically
- Structured data: `HomeAndConstructionBusiness` (local business), `Service`, `FAQPage`, `BreadcrumbList` and `BlogPosting`
- `sitemap-index.xml` and `robots.txt` generated automatically
- Canonical URLs, Open Graph tags, and semantic headings
- Static HTML with minimal JavaScript, for fast loading

### Contact form
The form opens WhatsApp with the customer's details pre-filled, so no server or database is needed (`src/components/ContactForm.astro`).

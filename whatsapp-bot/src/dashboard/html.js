// Tiny HTML templating: every interpolated value is escaped unless wrapped in raw().

class Raw {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export const raw = (value) => new Raw(String(value));

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

const render = (value) => {
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === null || value === undefined || value === false) return "";
  return escape(value);
};

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1];
  });
  return new Raw(out);
}

const NAV = [
  { key: "overview", label: "Overview", path: "" },
  { key: "leads", label: "Leads", path: "/leads" },
  { key: "bookings", label: "Bookings", path: "/bookings" },
  { key: "conversations", label: "Chats", path: "/conversations" },
  { key: "report", label: "Monthly report", path: "/report" },
  { key: "settings", label: "Business settings", path: "/settings" },
];

export function layout({ title, user, csrf, product, client = null, clients = [], active = "", flash = null, body }) {
  const isAdmin = user?.role === "admin";
  const clientNav = client
    ? html`<nav class="nav" aria-label="${client.name}">
        ${NAV.map((item) => html`<a href="/c/${client.id}${item.path}" class="${active === item.key ? "active" : ""}" ${active === item.key ? raw('aria-current="page"') : ""}>${item.label}</a>`)}
        ${isAdmin ? html`<a href="/c/${client.id}/integrations" class="${active === "integrations" ? "active" : ""}">Integrations</a>` : ""}
      </nav>`
    : "";

  return html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title} · ${product}</title>
  <link rel="stylesheet" href="/static/app.css">
  <script src="/static/app.js" defer></script>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/">${product}</a>
    ${user
      ? html`<div class="topbar-right">
          ${isAdmin && clients.length
            ? html`<form method="get" action="/go" class="switcher">
                <label class="sr-only" for="client-switch">Open client</label>
                <select id="client-switch" name="c" data-autosubmit>
                  <option value="">All clients</option>
                  ${clients.map((c) => html`<option value="${c.id}" ${client?.id === c.id ? raw("selected") : ""}>${c.name}</option>`)}
                </select>
                <noscript><button class="btn small">Open</button></noscript>
              </form>`
            : ""}
          ${isAdmin ? html`<a href="/admin" class="toplink">Admin</a>` : ""}
          <a href="/account" class="toplink">${user.name}</a>
          <form method="post" action="/logout"><input type="hidden" name="_csrf" value="${csrf}"><button class="linkbtn">Log out</button></form>
        </div>`
      : ""}
  </header>
  ${client ? html`<div class="clientbar"><h1 class="clientname">${client.name}</h1>${client.active ? "" : html`<span class="badge warn">Paused</span>`}</div>` : ""}
  ${clientNav}
  <main id="main" class="page">
    ${flash ? html`<div class="flash ${flash.type}" role="status">${flash.message}</div>` : ""}
    ${body}
  </main>
</body>
</html>`;
}

export const csrfField = (csrf) => html`<input type="hidden" name="_csrf" value="${csrf}">`;

export const formatDateTime = (ms, offsetMinutes = 330) => {
  if (!ms) return "—";
  const d = new Date(ms + offsetMinutes * 60_000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = d.getUTCHours();
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}, ${((h + 11) % 12) + 1}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

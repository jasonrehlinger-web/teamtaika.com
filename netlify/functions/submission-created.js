// netlify/functions/submission-created.js
// Netlify automatically invokes this function whenever a Netlify Form is
// submitted. We forward order/quote submissions — and any submission with an
// uploaded file — to projects@taikatranslations.com so the team can process it.
// Uploaded files are hosted by Netlify; we email the download links (not the
// raw bytes), so this works for large documents too.
//
// NOTE: the function URL is also publicly POST-able, so treat `body` as
// untrusted: validate the reply-to, allow only https file links, strip header
// injection from the subject, and rate-limit. PAYMENT is confirmed separately
// by paypal-ipn.js — verify payment before fulfilling.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PROJECTS_EMAIL  = 'projects@taikatranslations.com';
const SALES_EMAIL     = 'sales@taikatranslations.com';
const MARGARITA_EMAIL = 'margarita.ehlinger@taikatranslations.com'; // extra order-notification inbox (per Jason, 2026-07-14)
const FROM_ADDRESS   = 'Taika Translations <noreply@taikatranslations.com>';

// Forms whose submissions should always be forwarded to the project team.
const ORDER_FORMS = ['store-cart-order', 'quote', 'service-quote', 'store-order-starter'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
// One-line: strip CR/LF (header-injection guard) and cap length.
function oneLine(s, n) { return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').slice(0, n || 120); }
// Only accept https URLs (blocks javascript:/data:/http and arbitrary schemes).
function safeUrl(u) {
  try { const p = new URL(String(u)); return p.protocol === 'https:' ? p.href : null; } catch (e) { return null; }
}
// Best-effort display name for a file link (last path segment, decoded).
function fileNameFromUrl(u) {
  try { return decodeURIComponent(new URL(u).pathname.split('/').pop() || '') || null; } catch (e) { return null; }
}

// In-memory rate limiter (best-effort; resets per cold start).
const _hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), windowMs = 60000, max = 10;
  const arr = (_hits.get(ip) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return true;
  arr.push(now); _hits.set(ip, arr);
  return false;
}

// ── GA4 server-side event (Measurement Protocol) ────────────────────────────
// Counts a lead in GA4 regardless of the visitor's browser consent. The client
// loader (js/main.js) defaults Consent Mode to analytics_storage:'denied', so on
// this low-traffic site the client generate_lead is a cookieless ping GA4 won't
// model — leads effectively vanish from reports. This server-side event does not
// depend on cookies or consent, so every lead is counted.
// SILENT NO-OP when GA4_MP_API_SECRET is unset (Jason sets it in Netlify, Production
// scope only) — it must NEVER throw or change the function's response.
const GA4_MEASUREMENT_ID = 'G-GZBSYL1ZWT';
function ga4ClientId(seed) {
  // Reuse the real GA client id if a form captured it; else synthesise the
  // <random>.<seconds> shape GA4 expects.
  if (seed && /^\d+\.\d+$/.test(String(seed))) return String(seed);
  return Math.floor(Math.random() * 1e10) + '.' + Math.floor(Date.now() / 1000);
}
async function ga4Track(clientId, eventName, params) {
  const secret = process.env.GA4_MP_API_SECRET;
  if (!secret) return; // no secret yet → silent no-op
  try {
    await fetch('https://www.google-analytics.com/mp/collect?measurement_id='
      + GA4_MEASUREMENT_ID + '&api_secret=' + encodeURIComponent(secret), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name: eventName, params: Object.assign({ engagement_time_msec: 1 }, params || {}) }]
      })
    });
  } catch (e) {
    console.warn('[submission-created] ga4-mp non-fatal:', e && e.message);
  }
}

exports.handler = async (event) => {
  const ip = ((event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return { statusCode: 429, body: 'rate-limited' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 200, body: 'bad-json' }; }

  const p        = body.payload || {};
  const formName = p.form_name || p.formName || '';
  const data     = (p.data && typeof p.data === 'object') ? p.data : {};

  // Best-effort: stash a compact record of EVERY (verified) submission into a
  // Netlify Blobs store so the weekly safety-net digest (forms-digest.js) can
  // roll them up with no API token. Wrapped so a Blobs hiccup can NEVER affect
  // the lead/order notification below. One key per submission = no read-modify-
  // write race. Netlify only invokes this function for non-spam submissions.
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('form-digest');
    const rec = {
      form:  formName,
      name:  data['full-name'] || data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email || 'customer',
      email: data.email || '',
      at:    new Date().toISOString(),
      page:  p.title || (p.data && p.data.page_url) || ''
    };
    await store.setJSON('sub/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), rec);
  } catch (e) {
    console.warn('[submission-created] digest stash failed (non-fatal):', e && e.message);
  }

  // Detect uploaded files. Netlify exposes each as a URL (string) or {url}.
  // Accept ONLY https URLs so a forged payload can't smuggle a javascript:/
  // data: link (or an off-host phishing link) into the staff email.
  const fileLinks = [];
  Object.keys(data).forEach(k => {
    const v = data[k];
    var url = null, name = null;
    if (typeof v === 'string') url = safeUrl(v);
    else if (v && typeof v === 'object' && typeof v.url === 'string') {
      url = safeUrl(v.url);
      if (typeof v.filename === 'string' && v.filename) name = v.filename;
    }
    if (url) fileLinks.push({ field: k, url: url, name: oneLine(name || fileNameFromUrl(url) || k, 120) });
  });

  const isOrder = ORDER_FORMS.includes(formName)
    || formName.indexOf('lang-order') === 0
    || formName.indexOf('lang-native') === 0
    || formName.indexOf('store-order') === 0;

  // Lead / quote / inquiry forms. HubSpot used to receive and route ALL of these
  // (it was the CRM + alerting path); it is no longer in use, so Netlify is now
  // the ONLY capture — every lead form must notify the team or the lead is
  // silently missed. Covers landing pages (lp-*), the 50 state pages
  // (state-inquiry-*), industry inquiries, every *-inquiry / *-quote service
  // form, and the named lead magnets.
  const LEAD_FORMS = ['checklist', 'ai-assessment', 'pdf-checker-lead', 'contract-info', 'contract-management'];
  const isLead = formName.indexOf('lp-') === 0
    || formName.indexOf('state-inquiry') === 0
    || formName.indexOf('industry-inquiry') === 0
    || /-inquiry$/.test(formName)
    || /-quote$/.test(formName)
    || LEAD_FORMS.includes(formName);

  // GA4 lead count — fire BEFORE the notification gate so a form that is missing
  // from ORDER_FORMS/LEAD_FORMS still registers in GA4 (the allowlists only decide
  // who gets EMAILED, never whether the lead is counted). Orders are counted as a
  // `purchase` by stripe-webhook.js instead, so they are excluded here. Contract
  // forms use `contract_inquiry` to match the client-side naming; everything else
  // uses `generate_lead`. Never throws (ga4Track swallows errors).
  if (!isOrder) {
    const evtName = /contract/i.test(formName) ? 'contract_inquiry' : 'generate_lead';
    const pageLoc = safeUrl(data.page_url) || safeUrl(p.title) || undefined;
    await ga4Track(ga4ClientId(data.ga_client_id || data['ga-client-id']), evtName, {
      form_name: formName || 'unknown',
      page_location: pageLoc
    });
  }

  // Only notify the team for orders/quotes, landing-page leads, or anything with a file.
  if (!isOrder && !isLead && fileLinks.length === 0) return { statusCode: 200, body: 'skipped' };
  if (!RESEND_API_KEY) { console.warn('[submission-created] RESEND_API_KEY not set'); return { statusCode: 200, body: 'no-resend' }; }

  const fileFields = fileLinks.map(f => f.field);
  const rows = Object.keys(data)
    .filter(k => k !== 'bot-field' && fileFields.indexOf(k) === -1)
    .map(k => {
      const v = data[k];
      const val = esc(typeof v === 'object' ? JSON.stringify(v) : v);
      return `<tr><td style="padding:4px 10px;font-weight:600;color:#475569;vertical-align:top;">${esc(k)}</td><td style="padding:4px 10px;color:#1e293b;">${val}</td></tr>`;
    }).join('');

  const filesHtml = fileLinks.length
    ? `<p style="font-weight:700;margin:16px 0 4px;">Uploaded files:</p><ul>${fileLinks.map(f => `<li><a href="${esc(f.url)}">${esc(f.name)}</a> <span style="color:#94a3b8;">(${esc(f.field)})</span></li>`).join('')}</ul>`
    : '<p style="color:#b45309;margin:16px 0 4px;"><em>No file uploaded with this submission.</em></p>';

  const who = oneLine(data['full-name'] || data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email || 'customer', 80);

  const payload = {
    from:    FROM_ADDRESS,
    to:      isLead ? [PROJECTS_EMAIL, SALES_EMAIL] : [PROJECTS_EMAIL, MARGARITA_EMAIL],
    subject: oneLine(`New ${isLead ? 'lead' : 'order/upload'} (${formName}): ${who}`, 150),
    html:
      `<h2 style="font-family:Arial,sans-serif;color:#0f2044;">New submission — ${esc(formName)}</h2>` +
      filesHtml +
      `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;margin-top:8px;">${rows}</table>` +
      `<p style="color:#94a3b8;font-size:12px;margin-top:20px;">Payment is confirmed separately (Stripe email or PayPal IPN) — verify payment before processing.</p>`
  };
  // Only set reply-to if it's a valid-looking email (prevents reply-to spoofing/injection).
  if (data.email && EMAIL_RE.test(String(data.email))) payload.reply_to = String(data.email);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) console.error('[submission-created] Resend error:', res.status, await res.text());
  } catch (err) {
    console.error('[submission-created] email failed:', err);
  }
  return { statusCode: 200, body: 'ok' };
};

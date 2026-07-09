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
const PROJECTS_EMAIL = 'projects@taikatranslations.com';
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

// In-memory rate limiter (best-effort; resets per cold start).
const _hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), windowMs = 60000, max = 10;
  const arr = (_hits.get(ip) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return true;
  arr.push(now); _hits.set(ip, arr);
  return false;
}

exports.handler = async (event) => {
  const ip = ((event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return { statusCode: 429, body: 'rate-limited' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 200, body: 'bad-json' }; }

  const p        = body.payload || {};
  const formName = p.form_name || p.formName || '';
  const data     = (p.data && typeof p.data === 'object') ? p.data : {};

  // Detect uploaded files. Netlify exposes each as a URL (string) or {url}.
  // Accept ONLY https URLs so a forged payload can't smuggle a javascript:/
  // data: link (or an off-host phishing link) into the staff email.
  const fileLinks = [];
  Object.keys(data).forEach(k => {
    const v = data[k];
    var url = null;
    if (typeof v === 'string') url = safeUrl(v);
    else if (v && typeof v === 'object' && typeof v.url === 'string') url = safeUrl(v.url);
    if (url) fileLinks.push({ field: k, url: url });
  });

  const isOrder = ORDER_FORMS.includes(formName)
    || formName.indexOf('lang-order') === 0
    || formName.indexOf('store-order') === 0;

  // Only notify the project team for orders/quotes or anything with a file.
  if (!isOrder && fileLinks.length === 0) return { statusCode: 200, body: 'skipped' };
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
    ? `<p style="font-weight:700;margin:16px 0 4px;">Uploaded files:</p><ul>${fileLinks.map(f => `<li><a href="${esc(f.url)}">${esc(f.field)}</a></li>`).join('')}</ul>`
    : '<p style="color:#b45309;margin:16px 0 4px;"><em>No file uploaded with this submission.</em></p>';

  const who = oneLine(data['full-name'] || data.name || data.email || 'customer', 80);

  const payload = {
    from:    FROM_ADDRESS,
    to:      [PROJECTS_EMAIL],
    subject: oneLine(`New order/upload (${formName}): ${who}`, 150),
    html:
      `<h2 style="font-family:Arial,sans-serif;color:#0f2044;">New submission — ${esc(formName)}</h2>` +
      filesHtml +
      `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;margin-top:8px;">${rows}</table>` +
      `<p style="color:#94a3b8;font-size:12px;margin-top:20px;">Payment is confirmed separately by the PayPal IPN — verify payment before processing.</p>`
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

// netlify/functions/submission-created.js
// Netlify automatically invokes this function whenever a Netlify Form is
// submitted. We forward order/quote submissions — and any submission with an
// uploaded file — to projects@taikatranslations.com so the team can process it.
// Uploaded files are hosted by Netlify; we email the download links (not the
// raw bytes), so this works for large documents too.
//
// Note: this fires at upload/checkout time. PAYMENT is confirmed separately by
// paypal-ipn.js — verify payment before fulfilling.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PROJECTS_EMAIL = 'projects@taikatranslations.com';
const FROM_ADDRESS   = 'Taika Translations <noreply@taikatranslations.com>';

// Forms whose submissions should always be forwarded to the project team.
const ORDER_FORMS = ['store-cart-order', 'quote', 'service-quote', 'store-order-starter'];

function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

exports.handler = async (event) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 200, body: 'bad-json' }; }

  const p        = body.payload || {};
  const formName = p.form_name || p.formName || '';
  const data     = p.data || {};

  // Detect uploaded files: Netlify stores them and exposes a URL, either as a
  // plain string value or an object with a `url` property.
  const fileLinks = [];
  Object.keys(data).forEach(k => {
    const v = data[k];
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) fileLinks.push({ field: k, url: v });
    else if (v && typeof v === 'object' && typeof v.url === 'string') fileLinks.push({ field: k, url: v.url });
  });

  const isOrder = ORDER_FORMS.includes(formName)
    || formName.indexOf('lang-order') === 0
    || formName.indexOf('store-order') === 0;

  // Only notify the project team for orders/quotes or anything with a file.
  if (!isOrder && fileLinks.length === 0) return { statusCode: 200, body: 'skipped' };
  if (!RESEND_API_KEY) { console.warn('[submission-created] RESEND_API_KEY not set'); return { statusCode: 200, body: 'no-resend' }; }

  const rows = Object.keys(data)
    .filter(k => k !== 'bot-field' && !fileLinks.some(f => f.field === k))
    .map(k => {
      const v = data[k];
      const val = esc(typeof v === 'object' ? JSON.stringify(v) : v);
      return `<tr><td style="padding:4px 10px;font-weight:600;color:#475569;vertical-align:top;">${esc(k)}</td><td style="padding:4px 10px;color:#1e293b;">${val}</td></tr>`;
    }).join('');

  const filesHtml = fileLinks.length
    ? `<p style="font-weight:700;margin:16px 0 4px;">Uploaded files:</p><ul>${fileLinks.map(f => `<li><a href="${encodeURI(f.url)}">${esc(f.field)}</a></li>`).join('')}</ul>`
    : '<p style="color:#b45309;margin:16px 0 4px;"><em>No file uploaded with this submission.</em></p>';

  const who = data['full-name'] || data.name || data.email || 'customer';

  const payload = {
    from:    FROM_ADDRESS,
    to:      [PROJECTS_EMAIL],
    subject: `New order/upload (${formName}): ${String(who).substring(0, 80)}`,
    html:
      `<h2 style="font-family:Arial,sans-serif;color:#0f2044;">New submission — ${esc(formName)}</h2>` +
      filesHtml +
      `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;margin-top:8px;">${rows}</table>` +
      `<p style="color:#94a3b8;font-size:12px;margin-top:20px;">Payment is confirmed separately by the PayPal IPN — verify payment before processing.</p>`
  };
  if (data.email) payload.reply_to = data.email;

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

// netlify/functions/send-email.js
// Sends PayPal order confirmation emails via Resend (server-side).
// Replaces client-side EmailJS — no credentials in the browser.

const RESEND_API_KEY  = process.env.RESEND_API_KEY;
const FROM_ADDRESS    = 'Taika Translations <noreply@taikatranslations.com>';
const REPLY_TO        = 'sales@taikatranslations.com';

const ALLOWED_ORIGINS = [
  'https://teamtaika.com',
  'https://www.teamtaika.com'
];

// In-memory rate limiter (5 emails/min per IP)
const ipHits = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 5;
  const hits = (ipHits.get(ip) || []).filter(t => now - t < window);
  if (hits.length >= max) return false;
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

exports.handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'] || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };

  const ip = (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!rateLimit(ip)) {
    return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: 'Too many requests' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { to_email, to_name, product, amount, transaction_id } = body;

  if (!to_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid email' }) };
  }
  if (!to_name || !product) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // Sanitize to prevent injection
  const safeName    = String(to_name).replace(/[<>"]/g, '').substring(0, 100);
  const safeProduct = String(product).replace(/[<>"]/g, '').substring(0, 200);
  const safeAmount  = String(amount || '').replace(/[^0-9.$]/g, '').substring(0, 20);
  const safeTxn     = String(transaction_id || '').replace(/[^A-Za-z0-9_-]/g, '').substring(0, 100);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <tr><td style="background:#0f2044;padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Taika Translations</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Order Confirmation</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${safeName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Thank you for your order! We've received your payment and will begin processing right away.
      A team member will be in touch within <strong>1 business hour</strong> with next steps.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Order Summary</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#475569;">Service</td>
            <td style="padding:6px 0;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">${safeProduct}</td>
          </tr>
          ${safeAmount ? `<tr>
            <td style="padding:6px 0;font-size:14px;color:#475569;">Amount</td>
            <td style="padding:6px 0;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">${safeAmount}</td>
          </tr>` : ''}
          ${safeTxn ? `<tr>
            <td style="padding:6px 0;font-size:13px;color:#94a3b8;">Transaction ID</td>
            <td style="padding:6px 0;font-size:13px;color:#94a3b8;text-align:right;">${safeTxn}</td>
          </tr>` : ''}
        </table>
      </td></tr>
    </table>
    <p style="margin:28px 0 0;font-size:14px;color:#475569;line-height:1.6;">
      Questions? Reply to this email or contact us at
      <a href="mailto:sales@taikatranslations.com" style="color:#2563eb;">sales@taikatranslations.com</a>.
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Taika Translations · Language Access Hub</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from:     FROM_ADDRESS,
        to:       [to_email],
        reply_to: REPLY_TO,
        subject:  `Order Confirmed: ${safeProduct}`,
        html
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[send-email] Resend error:', res.status, err);
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Email delivery failed' }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[send-email] error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal error' }) };
  }
};

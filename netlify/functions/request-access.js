// netlify/functions/request-access.js
// Handles portal access requests with rate limiting and spam protection.
//
// SECURITY NOTES:
// - Public, unauthenticated endpoint. Treat all input as untrusted.
// - Writes go through the service-role key; the access_requests table has RLS
//   with only an admin SELECT policy and no INSERT policy, so clients cannot
//   read or write it directly — only this function (service role) can insert.
// - Email notification is best-effort: it must never fail the request after the
//   row is saved, or the user would see an error yet be blocked by the 24h
//   per-email rate limit on retry.

const SUPABASE_URL   = 'https://ijwgdzrunkxrpzsrcqir.supabase.co';
const RESEND_API_URL = 'https://api.resend.com/emails';
const NOTIFY_EMAIL   = 'ceo@taikatranslations.com';
// Must be a Resend-verified sender. teamtaika.com is NOT verified; use the
// same noreply@taikatranslations.com address the live send-email.js and
// paypal-ipn.js functions already send from.
const FROM_EMAIL     = 'Taika Portal <noreply@taikatranslations.com>';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://teamtaika.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Coerce to string then trim+cap — guards against non-string JSON (e.g. objects
// or arrays), which would otherwise throw on .trim() and 500 the request.
function clean(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }
// Strip CR/LF for use in an email subject (header-injection defense-in-depth).
function oneLine(v, n) { return clean(v, n).replace(/[\r\n]+/g, ' '); }

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY  = process.env.RESEND_API_KEY;

  if (!SERVICE_KEY || !RESEND_KEY) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  // ── Honeypot check ────────────────────────────────────────────────────────
  if (body.website || body.phone_number) {
    // Silent accept — don't tell bots they were caught.
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
  }

  // ── Field validation ──────────────────────────────────────────────────────
  const name         = clean(body.name, 100);
  const email        = clean(body.email, 200).toLowerCase();
  const organization = clean(body.organization, 200);
  const reason       = clean(body.reason, 1000);

  if (!name || !email || !reason) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Name, email, and reason are required.' }) };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Please enter a valid email address.' }) };
  }

  // ── Get real IP ───────────────────────────────────────────────────────────
  const ip = ((event.headers && event.headers['x-forwarded-for']) || '').split(',')[0].trim() || 'unknown';

  const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  };

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo  = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // ── Rate limit: max 3 requests per IP per hour ────────────────────────────
  if (ip !== 'unknown') {
    const ipCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/access_requests?select=id&ip_address=eq.${encodeURIComponent(ip)}&created_at=gte.${oneHourAgo}`,
      { headers: sbHeaders }
    );
    if (ipCheck.ok) {
      const ipRows = await ipCheck.json();
      if (ipRows.length >= 3) {
        return { statusCode: 429, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Too many requests. Please try again later.' }) };
      }
    }
  }

  // ── Rate limit: max 1 request per email per 24 hours ──────────────────────
  const emailCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/access_requests?select=id&email=eq.${encodeURIComponent(email)}&created_at=gte.${oneDayAgo}`,
    { headers: sbHeaders }
  );
  if (emailCheck.ok) {
    const emailRows = await emailCheck.json();
    if (emailRows.length >= 1) {
      return { statusCode: 429, headers: CORS_HEADERS, body: JSON.stringify({ error: "A request from this email was already submitted today. We'll be in touch soon." }) };
    }
  }

  // ── Insert record ─────────────────────────────────────────────────────────
  const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/access_requests`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ name, email, organization: organization || null, reason, ip_address: ip }),
  });

  if (!insertResp.ok) {
    console.error('[request-access] insert failed:', insertResp.status, await insertResp.text());
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Failed to save request. Please try again.' }) };
  }

  // ── Notify via Resend (best-effort — never fail the saved request) ────────
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        subject: oneLine(`Portal Access Request: ${name}`, 150),
        html: `
        <h2 style="font-family:sans-serif;color:#0B1E35;">New Portal Access Request</h2>
        <table style="font-family:sans-serif;font-size:15px;border-collapse:collapse;width:100%;max-width:480px;">
          <tr><td style="padding:8px 0;color:#6B7280;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${escHtml(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;">Email</td><td style="padding:8px 0;">${escHtml(email)}</td></tr>
          ${organization ? `<tr><td style="padding:8px 0;color:#6B7280;">Organization</td><td style="padding:8px 0;">${escHtml(organization)}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;">Reason</td><td style="padding:8px 0;">${escHtml(reason)}</td></tr>
        </table>
        <p style="margin-top:24px;">
          <a href="https://teamtaika.com/admin/clients" style="background:#B8913A;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-weight:600;">
            Review in Admin Panel &rarr;
          </a>
        </p>
      `,
      }),
    });
    if (!res.ok) console.error('[request-access] Resend error:', res.status, await res.text());
  } catch (err) {
    console.error('[request-access] notify failed:', err);
  }

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
};

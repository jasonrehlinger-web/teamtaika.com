/* ============================================================================
   notify.js — Internal notification emails via Resend API
   Sends alerts to the admin (ceo@taikatranslations.com) when:
     • A new client accepts their invite and sets a password
     • A client submits a new project

   Env vars required:
     RESEND_API_KEY  — your Resend API key
     SUPABASE_URL    — Supabase project URL
     SUPABASE_SERVICE_KEY — Supabase service role key (for token verification)

   Security:
     - Requires valid Supabase Bearer token (authenticated portal users only)
     - Rate limited: 10 requests per minute per IP
     - All user-supplied content HTML-escaped before rendering in email
   ============================================================================ */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ijwgdzrunkxrpzsrcqir.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAIL  = 'ceo@taikatranslations.com';
const FROM_ADDRESS = 'notifications@taikatranslations.com';
const RESEND_API   = 'https://api.resend.com/emails';

const headers = {
  'Access-Control-Allow-Origin':  'https://teamtaika.com',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

/* ── Rate limiter: 10 requests per minute per IP ── */
const _rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const window = 60_000;
  const limit = 10;
  const entry = _rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    _rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count++;
  _rateLimitMap.set(ip, entry);
  return entry.count > limit;
}

/* ── HTML escape to prevent injection in email templates ── */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ── Verify the caller has a valid Supabase session (any authenticated user) ── */
async function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  if (!SERVICE_KEY) throw new Error('Server configuration error');
  const token = authHeader.slice(7);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SERVICE_KEY }
  });
  if (!res.ok) throw new Error('Unauthorized');
  const userData = await res.json();
  if (!userData?.id) throw new Error('Unauthorized');
  return userData;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // Rate limit
  const clientIp = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown').split(',')[0].trim();
  if (isRateLimited(clientIp)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests' }) };
  }

  // Auth check — must be a logged-in portal user
  try {
    await verifyAuth(event.headers['authorization'] || event.headers['Authorization']);
  } catch (err) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: err.message || 'Unauthorized' }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('[notify] RESEND_API_KEY not set — notification skipped');
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

  const { type, data = {} } = body;
  if (!type) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing type' }) };

  const ALLOWED_TYPES = ['new_signup', 'new_project'];
  if (!ALLOWED_TYPES.includes(type)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid notification type' }) };
  }

  let subject, html;

  if (type === 'new_signup') {
    const name  = esc(data.full_name || 'Unknown');
    const email = esc(data.email     || 'unknown');
    const org   = data.organization  ? ` (${esc(data.organization)})` : '';
    subject = `New client signed up: ${name}`;
    html = `
      <h2 style="font-family:sans-serif;color:#0a1628;">New portal signup</h2>
      <p style="font-family:sans-serif;font-size:15px;color:#374151;">
        A client just accepted their invite and set up their account.
      </p>
      <table style="font-family:sans-serif;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Name:</td><td>${name}${org}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Email:</td><td>${email}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Time:</td><td>${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</td></tr>
      </table>
      <p style="margin-top:20px;">
        <a href="https://teamtaika.com/admin/clients" style="background:#0a1628;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:600;">View in Admin Panel &rarr;</a>
      </p>`;

  } else if (type === 'new_project') {
    const client  = esc(data.client_name  || 'Unknown client');
    const service = esc(data.service_type || 'Unknown service');
    const langs   = Array.isArray(data.target_languages)
      ? data.target_languages.map(esc).join(', ')
      : esc(data.target_languages || '—');
    const notes   = esc(data.client_notes ? String(data.client_notes).substring(0, 200) : '—');
    const projId  = /^[0-9a-f-]{36}$/i.test(data.project_id || '') ? data.project_id : '';
    subject = `New project submitted: ${service} — ${client}`;
    html = `
      <h2 style="font-family:sans-serif;color:#0a1628;">New project submitted</h2>
      <p style="font-family:sans-serif;font-size:15px;color:#374151;">
        A client just submitted a project through the portal.
      </p>
      <table style="font-family:sans-serif;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Client:</td><td>${client}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Service:</td><td>${service.replace(/_/g, ' ')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Languages:</td><td>${langs}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Notes:</td><td>${notes}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Submitted:</td><td>${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</td></tr>
      </table>
      <p style="margin-top:20px;">
        <a href="https://teamtaika.com/admin/projects${projId ? '?id=' + projId : ''}" style="background:#c9a84c;color:#0a1628;padding:10px 18px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:700;">View Project &rarr;</a>
      </p>`;
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Taika Portal <${FROM_ADDRESS}>`, to: [ADMIN_EMAIL], subject, html })
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[notify] Resend error:', result);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: result.message }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: result.id }) };

  } catch (err) {
    console.error('[notify] Fetch error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

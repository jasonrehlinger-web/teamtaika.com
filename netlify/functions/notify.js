/* ============================================================================
   notify.js — Internal notification emails via Resend API
   Sends alerts to the admin (ceo@taikatranslations.com) when:
     • A new client accepts their invite and sets a password
     • A client submits a new project

   Env vars required:
     RESEND_API_KEY  — your Resend API key (same one used for Supabase SMTP)
   ============================================================================ */

const ADMIN_EMAIL  = 'ceo@taikatranslations.com';
const FROM_ADDRESS = 'notifications@taikatranslations.com'; // must be verified in Resend
const RESEND_API   = 'https://api.resend.com/emails';

const headers = {
  'Access-Control-Allow-Origin':  'https://teamtaika.com',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    // Gracefully degrade — log but don't fail the caller
    console.warn('[notify] RESEND_API_KEY not set — notification skipped');
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

  const { type, data = {} } = body;
  if (!type) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing type' }) };

  let subject, html;

  if (type === 'new_signup') {
    const name  = data.full_name || 'Unknown';
    const email = data.email     || 'unknown';
    const org   = data.organization ? ` (${data.organization})` : '';
    subject = `🆕 New client signed up: ${name}`;
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
        <a href="https://teamtaika.com/admin/clients" style="background:#0a1628;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:600;">View in Admin Panel →</a>
      </p>`;

  } else if (type === 'new_project') {
    const client  = data.client_name  || 'Unknown client';
    const service = data.service_type || 'Unknown service';
    const langs   = Array.isArray(data.target_languages) ? data.target_languages.join(', ') : (data.target_languages || '—');
    const projId  = data.project_id   || '';
    subject = `📋 New project submitted: ${service} — ${client}`;
    html = `
      <h2 style="font-family:sans-serif;color:#0a1628;">New project submitted</h2>
      <p style="font-family:sans-serif;font-size:15px;color:#374151;">
        A client just submitted a project through the portal.
      </p>
      <table style="font-family:sans-serif;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Client:</td><td>${client}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Service:</td><td>${service.replace(/_/g, ' ')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Languages:</td><td>${langs}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Notes:</td><td>${data.client_notes ? data.client_notes.substring(0, 200) : '—'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Submitted:</td><td>${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</td></tr>
      </table>
      <p style="margin-top:20px;">
        <a href="https://teamtaika.com/admin/projects${projId ? '?id=' + projId : ''}" style="background:#c9a84c;color:#0a1628;padding:10px 18px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:700;">View Project →</a>
      </p>`;

  } else {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown notification type' }) };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        from:    `Taika Portal <${FROM_ADDRESS}>`,
        to:      [ADMIN_EMAIL],
        subject,
        html
      })
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

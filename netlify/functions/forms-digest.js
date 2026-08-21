// netlify/functions/forms-digest.js
// SAFETY-NET weekly digest of Netlify form submissions.
//
// Native Netlify notifications + submission-created.js already email the team
// on every submission. This scheduled function is a backstop: once a week it
// pulls ALL verified form submissions from the last 7 days via the Netlify API
// and emails a single rollup so nothing can silently slip through unnoticed —
// even if a per-submission notification fails or a new form is added without
// wiring. It is fully isolated: it reads only, and a failure here cannot affect
// orders, payments, or the per-submission notifications.
//
// Schedule is set in netlify.toml ([functions."forms-digest"] schedule).
//
// Required env:
//   NETLIFY_ACCESS_TOKEN — a Netlify personal access token (forms read scope)
//   RESEND_API_KEY       — already set (used by submission-created.js)
// Optional env:
//   SITE_ID              — defaults to this site's id below
//   DIGEST_TO            — comma-separated recipients (defaults below)

const SITE_ID_DEFAULT = '7601c3cf-b7f6-44fd-b3e5-5bab387cf978'; // teamtaika (not secret)
const FROM_ADDRESS    = 'Taika Translations <noreply@taikatranslations.com>';
const DIGEST_TO_DEFAULT = ['projects@taikatranslations.com', 'sales@taikatranslations.com', 'ceo@taikatranslations.com'];
const WINDOW_DAYS = 7;

function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

async function sendResend(resendKey, payload) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) console.error('[forms-digest] Resend error:', res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error('[forms-digest] email failed:', err);
    return false;
  }
}

async function fetchSubmissions(siteId, token, sinceMs) {
  // Paginate newest-first until we pass the cutoff (or run out / hit a safety cap).
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://api.netlify.com/api/v1/sites/${siteId}/submissions?per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { const e = new Error(`Netlify API ${res.status}: ${await res.text()}`); e.status = res.status; throw e; }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    let passedCutoff = false;
    for (const s of batch) {
      const t = Date.parse(s.created_at || s.createdAt || '');
      if (Number.isFinite(t) && t < sinceMs) { passedCutoff = true; continue; }
      out.push(s);
    }
    if (passedCutoff || batch.length < 100) break;
  }
  return out;
}

exports.handler = async () => {
  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const resendKey = process.env.RESEND_API_KEY;
  const siteId = process.env.SITE_ID || SITE_ID_DEFAULT;
  const to = (process.env.DIGEST_TO ? process.env.DIGEST_TO.split(',').map(s => s.trim()).filter(Boolean) : DIGEST_TO_DEFAULT);

  if (!token) { console.warn('[forms-digest] NETLIFY_ACCESS_TOKEN not set — skipping'); return { statusCode: 200, body: 'no-token' }; }
  if (!resendKey) { console.warn('[forms-digest] RESEND_API_KEY not set — skipping'); return { statusCode: 200, body: 'no-resend' }; }

  const sinceMs = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  let subs;
  try {
    subs = await fetchSubmissions(siteId, token, sinceMs);
  } catch (err) {
    console.error('[forms-digest] fetch failed:', err);
    // A rejected token (expired / revoked / invalid) would otherwise fail
    // SILENTLY — the weekly email would simply stop arriving, with no signal.
    // Turn that into a LOUD alert so the token gets rotated promptly.
    if (err && (err.status === 401 || err.status === 403)) {
      await sendResend(resendKey, {
        from: FROM_ADDRESS,
        to,
        subject: '⚠️ ACTION NEEDED: Netlify form-digest token expired',
        html: `<h2 style="font-family:Arial,sans-serif;color:#b91c1c;">Form-digest token needs rotating</h2>`
          + `<p style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;">The weekly Netlify form-submission digest could not run: its API token (env <code>NETLIFY_ACCESS_TOKEN</code>) was rejected (HTTP ${err.status}) — most likely expired or revoked.</p>`
          + `<p style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;"><strong>Fix:</strong> create a new Netlify personal access token and update the <code>NETLIFY_ACCESS_TOKEN</code> environment variable on the teamtaika project (Project configuration → Environment variables).</p>`
          + `<p style="font-family:Arial,sans-serif;font-size:13px;color:#64748b;">Per-submission lead notifications are unaffected — only this weekly rollup is paused until the token is replaced.</p>`
      });
    }
    return { statusCode: 200, body: 'fetch-failed' };
  }

  // Group by form name.
  const byForm = {};
  for (const s of subs) {
    const name = s.form_name || s.formName || '(unknown form)';
    (byForm[name] = byForm[name] || []).push(s);
  }
  const formNames = Object.keys(byForm).sort((a, b) => byForm[b].length - byForm[a].length);
  const total = subs.length;

  let bodyHtml;
  if (total === 0) {
    bodyHtml = `<p style="font-size:14px;color:#1e293b;">No verified form submissions in the last ${WINDOW_DAYS} days.</p>`
      + `<p style="font-size:12px;color:#94a3b8;">(This weekly check ran successfully — it's a heartbeat confirming lead capture is being watched.)</p>`;
  } else {
    bodyHtml = formNames.map(name => {
      const rows = byForm[name].map(s => {
        const who = esc(s.name || (s.data && (s.data['full-name'] || s.data.name)) || s.email || (s.data && s.data.email) || 'customer');
        const email = esc(s.email || (s.data && s.data.email) || '');
        const when = esc((s.created_at || '').replace('T', ' ').replace(/\..*$/, '') + ' UTC');
        return `<tr><td style="padding:3px 10px;color:#1e293b;">${who}</td>`
          + `<td style="padding:3px 10px;color:#475569;">${email}</td>`
          + `<td style="padding:3px 10px;color:#94a3b8;white-space:nowrap;">${when}</td></tr>`;
      }).join('');
      return `<h3 style="font-family:Arial,sans-serif;color:#0f2044;margin:18px 0 4px;">${esc(name)} `
        + `<span style="color:#64748b;font-weight:400;">(${byForm[name].length})</span></h3>`
        + `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">${rows}</table>`;
    }).join('');
  }

  const payload = {
    from: FROM_ADDRESS,
    to,
    subject: `Weekly form digest — ${total} submission${total === 1 ? '' : 's'} (last ${WINDOW_DAYS} days)`,
    html:
      `<h2 style="font-family:Arial,sans-serif;color:#0f2044;">Weekly Netlify form digest</h2>`
      + `<p style="font-family:Arial,sans-serif;font-size:14px;color:#475569;">`
      + `${total} verified submission${total === 1 ? '' : 's'} across ${formNames.length} form${formNames.length === 1 ? '' : 's'} in the last ${WINDOW_DAYS} days.</p>`
      + bodyHtml
      + `<p style="font-family:Arial,sans-serif;color:#94a3b8;font-size:12px;margin-top:20px;">`
      + `Full details + CSV export: Netlify → teamtaika → Forms. This is a safety-net summary; you also get a real-time email on each submission.</p>`
  };

  await sendResend(resendKey, payload);
  return { statusCode: 200, body: `ok (${total})` };
};

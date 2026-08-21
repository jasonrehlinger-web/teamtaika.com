// netlify/functions/forms-digest.js
// SAFETY-NET weekly digest of Netlify form submissions — TOKENLESS.
//
// The per-submission function (submission-created.js) stashes a compact record
// of every verified submission into a Netlify Blobs store ("form-digest").
// Once a week this scheduled function drains that store and emails a single
// rollup, so nothing can silently slip past the real-time notifications. It
// needs NO Netlify API token and NO account credentials — only Blobs (built in)
// and RESEND_API_KEY (already set for the other email functions).
//
// Schedule is set in netlify.toml ([functions."forms-digest"] schedule).
// It is fully isolated and read-then-clear: a failure here cannot affect
// orders, payments, or the per-submission notifications.

const FROM_ADDRESS      = 'Taika Translations <noreply@taikatranslations.com>';
const DIGEST_TO_DEFAULT  = ['projects@taikatranslations.com', 'sales@taikatranslations.com', 'ceo@taikatranslations.com'];

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

exports.handler = async () => {
  const resendKey = process.env.RESEND_API_KEY;
  const to = (process.env.DIGEST_TO ? process.env.DIGEST_TO.split(',').map(s => s.trim()).filter(Boolean) : DIGEST_TO_DEFAULT);
  if (!resendKey) { console.warn('[forms-digest] RESEND_API_KEY not set — skipping'); return { statusCode: 200, body: 'no-resend' }; }

  // Read every stashed submission record from the Blobs store.
  let keys = [];
  let recs = [];
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('form-digest');
    const listing = await store.list({ prefix: 'sub/' });
    keys = (listing && listing.blobs ? listing.blobs : []).map(b => b.key);
    for (const key of keys) {
      try {
        const r = await store.get(key, { type: 'json' });
        if (r) recs.push(r);
      } catch (e) { /* skip an unreadable record */ }
    }

    // Sort newest first and group by form.
    recs.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const byForm = {};
    for (const r of recs) { const n = r.form || '(unknown form)'; (byForm[n] = byForm[n] || []).push(r); }
    const formNames = Object.keys(byForm).sort((a, b) => byForm[b].length - byForm[a].length);
    const total = recs.length;

    let bodyHtml;
    if (total === 0) {
      bodyHtml = `<p style="font-size:14px;color:#1e293b;">No form submissions since the last digest.</p>`
        + `<p style="font-size:12px;color:#94a3b8;">(This weekly check ran successfully — a heartbeat confirming lead capture is being watched.)</p>`;
    } else {
      bodyHtml = formNames.map(name => {
        const rows = byForm[name].map(r => {
          const when = esc(String(r.at || '').replace('T', ' ').replace(/\..*$/, '') + (r.at ? ' UTC' : ''));
          return `<tr><td style="padding:3px 10px;color:#1e293b;">${esc(r.name || 'customer')}</td>`
            + `<td style="padding:3px 10px;color:#475569;">${esc(r.email || '')}</td>`
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
      subject: `Weekly form digest — ${total} submission${total === 1 ? '' : 's'}`,
      html:
        `<h2 style="font-family:Arial,sans-serif;color:#0f2044;">Weekly Netlify form digest</h2>`
        + `<p style="font-family:Arial,sans-serif;font-size:14px;color:#475569;">`
        + `${total} submission${total === 1 ? '' : 's'} across ${formNames.length} form${formNames.length === 1 ? '' : 's'} since the last digest.</p>`
        + bodyHtml
        + `<p style="font-family:Arial,sans-serif;color:#94a3b8;font-size:12px;margin-top:20px;">`
        + `Full details + CSV export: Netlify → teamtaika → Forms. You also get a real-time email on each submission; this is the weekly safety-net summary.</p>`
    };

    const sent = await sendResend(resendKey, payload);

    // Only clear the store once the email is safely sent — otherwise leave the
    // records so the next run retries them (nothing is lost on a send failure).
    if (sent) {
      for (const key of keys) { try { await store.delete(key); } catch (e) { /* best-effort */ } }
    }
    return { statusCode: 200, body: `ok (${total}${sent ? ', cleared' : ', kept'})` };
  } catch (err) {
    console.error('[forms-digest] blobs/digest failed:', err);
    return { statusCode: 200, body: 'digest-failed' };
  }
};

// netlify/functions/stripe-webhook.js
// Authoritative fulfillment signal for Stripe Checkout — NOT the success
// redirect. Verifies the Stripe signature, then on checkout.session.completed
// sends the customer a confirmation email via Resend (mirrors paypal-ipn.js).
//
// The Stripe account is SHARED with taikatranslations.com, so this endpoint
// also receives that site's events — we ignore anything not tagged
// metadata.site === 'teamtaika'.
//
// No price re-validation is needed here (unlike PayPal): every line was
// charged from a server-resolved Stripe Price ID, so the amount is already
// authoritative.

// Guard init so a missing key returns a clean 500 in-handler instead of
// throwing at module load (which would crash cold-start).
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const WEBHOOK_SECRET   = process.env.STRIPE_WEBHOOK_SECRET;
const FROM_ADDRESS     = 'Taika Translations <noreply@taikatranslations.com>';
const REPLY_TO         = 'sales@taikatranslations.com';
const ADMIN_EMAIL      = 'ceo@taikatranslations.com';

// In-memory dedup — Stripe retries webhook delivery on non-2xx / timeout.
const _seen = new Set();

function humanizeCart(cart) {
  // "1× birth-certificate; 2× school-diploma" → "1× Birth Certificate; 2× School Diploma"
  return String(cart || '')
    .split(';')
    .map(s => s.replace(/[a-z0-9-]+/gi, w =>
      w.includes('-') ? w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : w))
    .join(';')
    .replace(/[<>"]/g, '')
    .substring(0, 300) || 'Certified Translation Order';
}

async function sendConfirmationEmail({ toEmail, name, service, amount, ref }) {
  if (!RESEND_API_KEY || !toEmail) return;
  const safeName    = String(name || 'Customer').replace(/[<>"]/g, '').substring(0, 100);
  const safeProduct = humanizeCart(service);
  const safeAmount  = '$' + Number(amount).toFixed(2);
  const safeRef     = String(ref || '').replace(/[^A-Za-z0-9_-]/g, '').substring(0, 100);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <tr><td style="background:#0f2044;padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Taika Translations</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Payment Confirmed</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${safeName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Thank you — your payment has been confirmed and your order is in our queue.
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
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#475569;">Amount Paid</td>
            <td style="padding:6px 0;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">${safeAmount}</td>
          </tr>
          ${safeRef ? `<tr>
            <td style="padding:6px 0;font-size:13px;color:#94a3b8;">Order Reference</td>
            <td style="padding:6px 0;font-size:13px;color:#94a3b8;text-align:right;">${safeRef}</td>
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
    // Customer confirmation
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [toEmail], reply_to: REPLY_TO, subject: `Payment Confirmed: ${safeProduct}`, html })
    });
    // Admin alert (new order to fulfill) → projects@ handles docs; ceo@ gets the ping
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_ADDRESS, to: [ADMIN_EMAIL], reply_to: REPLY_TO,
        subject: `New Stripe order — ${safeAmount} — ${safeProduct}`,
        html: `<p><strong>New paid Stripe order (teamtaika.com store).</strong></p>`
          + `<p>Customer: ${safeName} &lt;${String(toEmail).replace(/[<>"]/g, '')}&gt;<br>`
          + `Service: ${safeProduct}<br>Amount: ${safeAmount}<br>Reference: ${safeRef}</p>`
      })
    });
  } catch (err) {
    console.error('[stripe-webhook] Resend error:', err);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY not set');
    return { statusCode: 500, body: 'Not configured' };
  }

  // Stripe signature verification needs the EXACT raw payload bytes.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.warn('[stripe-webhook] signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook signature verification failed` };
  }

  // Idempotency by Stripe event id.
  if (_seen.has(stripeEvent.id)) {
    return { statusCode: 200, body: 'Duplicate — already processed' };
  }
  _seen.add(stripeEvent.id);
  if (_seen.size > 500) _seen.delete(_seen.values().next().value);

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    // Shared account: ignore events that aren't ours.
    if ((session.metadata && session.metadata.site) !== 'teamtaika') {
      return { statusCode: 200, body: 'Ignored — not teamtaika' };
    }
    // Only fulfill actually-paid sessions.
    if (session.payment_status !== 'paid') {
      console.log('[stripe-webhook] session not paid yet:', session.payment_status);
      return { statusCode: 200, body: 'OK' };
    }

    const email  = (session.customer_details && session.customer_details.email) || session.customer_email || '';
    const name   = (session.metadata && session.metadata.customer_name)
                   || (session.customer_details && session.customer_details.name) || 'Customer';
    const amount = (session.amount_total || 0) / 100;
    const cart   = (session.metadata && session.metadata.cart) || '';

    console.log('[stripe-webhook] PAID teamtaika order:', session.id, '$' + amount.toFixed(2), email);
    await sendConfirmationEmail({ toEmail: email, name, service: cart, amount, ref: session.id });
  }

  // Acknowledge everything else so Stripe stops retrying.
  return { statusCode: 200, body: 'OK' };
};

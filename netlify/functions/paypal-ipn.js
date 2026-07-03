// netlify/functions/paypal-ipn.js
// Receives PayPal IPN, verifies with PayPal servers, sends confirmation email via Resend.
// This is the authoritative payment verification — NOT the client-side ?payment=success param.
// PayPal docs: https://developer.paypal.com/api/nvp-soap/ipn/

const PAYPAL_VERIFY_URL = 'https://ipnpb.paypal.com/cgi-bin/webscr';
const PAYPAL_BUSINESS   = 'payments@taikatranslations.com';
const RESEND_API_KEY    = process.env.RESEND_API_KEY;
const FROM_ADDRESS      = 'Taika Translations <noreply@taikatranslations.com>';
const REPLY_TO          = 'sales@taikatranslations.com';

// In-memory txn dedup — prevents duplicate confirmation emails on PayPal IPN retries
const _seenTxns = new Set();

exports.handler = async (event) => {
  // Must be POST from PayPal
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const rawBody = event.body || '';

  // ── Step 1: POST back to PayPal for IPN verification ──────────────────
  let verified = false;
  try {
    const res = await fetch(PAYPAL_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':   'teamtaika-ipn/1.0'
      },
      body: 'cmd=_notify-validate&' + rawBody
    });
    const text = await res.text();
    verified = (text.trim() === 'VERIFIED');
  } catch (err) {
    console.error('[paypal-ipn] PayPal verification request failed:', err);
    // Return 200 so PayPal retries — do not process
    return { statusCode: 200, body: 'PENDING_RETRY' };
  }

  if (!verified) {
    console.warn('[paypal-ipn] PayPal returned INVALID — possible spoofed IPN, ignoring');
    return { statusCode: 200, body: 'INVALID' }; // 200 stops PayPal retrying
  }

  // ── Step 2: Parse and validate the verified IPN params ────────────────
  const params        = Object.fromEntries(new URLSearchParams(rawBody));
  const paymentStatus = params.payment_status  || '';
  const receiverEmail = (params.receiver_email || '').toLowerCase().trim();
  const mcGross       = parseFloat(params.mc_gross    || '0');
  const currency      = (params.mc_currency   || '').toUpperCase();
  const payerEmail    = params.payer_email     || '';
  const firstName     = params.first_name      || 'Customer';
  const lastName      = params.last_name       || '';
  const itemName      = params.item_name       || 'Translation Service';
  const txnId         = params.txn_id          || '';

  // Only process completed USD payments to the right account
  if (paymentStatus !== 'Completed') {
    console.log('[paypal-ipn] non-completed status:', paymentStatus, '— skipping email');
    return { statusCode: 200, body: 'OK' };
  }
  if (receiverEmail !== PAYPAL_BUSINESS.toLowerCase()) {
    console.warn('[paypal-ipn] wrong receiver:', receiverEmail, '— ignoring');
    return { statusCode: 200, body: 'OK' };
  }
  if (mcGross <= 0 || currency !== 'USD') {
    console.warn('[paypal-ipn] invalid amount/currency:', mcGross, currency, '— ignoring');
    return { statusCode: 200, body: 'OK' };
  }

  // Dedup: PayPal retries IPN delivery — skip if already processed this transaction
  if (_seenTxns.has(txnId)) {
    console.log('[paypal-ipn] Duplicate IPN — txn already processed:', txnId);
    return { statusCode: 200, body: 'OK' };
  }
  _seenTxns.add(txnId);
  if (_seenTxns.size > 500) {
    // Prevent unbounded memory growth on long-running instances
    const oldest = _seenTxns.values().next().value;
    _seenTxns.delete(oldest);
  }

  console.log('[paypal-ipn] VERIFIED payment — txn:', txnId, 'amount: $' + mcGross, 'to:', payerEmail);

  // ── Step 3: Send confirmation email via Resend ────────────────────────
  if (payerEmail && RESEND_API_KEY) {
    const safeName    = (firstName + ' ' + lastName).trim().replace(/[<>"]/g, '').substring(0, 100);
    const safeProduct = itemName.replace(/[<>"]/g, '').substring(0, 200);
    const safeAmount  = '$' + mcGross.toFixed(2);
    const safeTxn     = txnId.replace(/[^A-Za-z0-9_-]/g, '').substring(0, 100);

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
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from:     FROM_ADDRESS,
          to:       [payerEmail],
          reply_to: REPLY_TO,
          subject:  `Payment Confirmed: ${safeProduct}`,
          html
        })
      });
      if (emailRes.ok) {
        console.log('[paypal-ipn] confirmation email sent to', payerEmail, 'txn:', txnId);
      } else {
        const errText = await emailRes.text();
        console.error('[paypal-ipn] Resend error:', emailRes.status, errText);
      }
    } catch (err) {
      console.error('[paypal-ipn] email fetch failed:', err);
      // Don't fail the 200 — we don't want PayPal to retry just because email failed
    }
  }

  return { statusCode: 200, body: 'OK' };
};

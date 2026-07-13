#!/usr/bin/env node
// scripts/test-stripe-session.js
// Drives the REAL create-checkout-session function against Stripe TEST mode and
// prints the resulting session (line items, total, metadata, checkout URL).
//
// Prereqs:
//   1) npm install                       (installs the stripe SDK)
//   2) export STRIPE_SECRET_KEY=sk_test_...   (a TEST key — never a live key here)
//   3) npm run test:stripe
//
// Only uses products that exist in the test catalog. To also test divorce /
// passport / per-page / pdf-audit / starter-kit, Jason must first create those
// 5 prices in TEST mode (see STRIPE-PRICES.md).

const path = require('path');
const { handler } = require(path.join(__dirname, '..', 'netlify', 'functions', 'create-checkout-session.js'));

async function run(label, items) {
  const event = {
    httpMethod: 'POST',
    isBase64Encoded: false,
    headers: {},
    body: JSON.stringify({ items, name: 'Test Buyer', email: 'test@example.com', notes: label })
  };
  const res = await handler(event);
  const data = JSON.parse(res.body || '{}');
  console.log(`\n=== ${label} → HTTP ${res.statusCode} ===`);
  if (!res.statusCode || res.statusCode >= 400) { console.log(data); return; }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const s = await stripe.checkout.sessions.retrieve(data.id, { expand: ['line_items'] });
  console.log('mode:', s.mode, '| status:', s.status, '| livemode:', s.livemode);
  console.log('amount_total:', '$' + (s.amount_total / 100).toFixed(2), s.currency.toUpperCase());
  console.log('client_reference_id:', s.client_reference_id);
  console.log('metadata:', JSON.stringify(s.metadata));
  console.log('line_items:');
  s.line_items.data.forEach(li =>
    console.log(`  ${li.quantity}× ${li.description} = $${(li.amount_total / 100).toFixed(2)}`));
  console.log('checkout url:', s.url);
}

(async () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('ERROR: set STRIPE_SECRET_KEY (a TEST key, sk_test_...) before running.');
    process.exit(1);
  }
  if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live')) {
    console.error('REFUSING: STRIPE_SECRET_KEY is a LIVE key. Use a test key for this script.');
    process.exit(1);
  }

  // Sample: 1 birth certificate + 2 diplomas (all in the base catalog).
  await run('birth ×1 + diploma ×2', [{ id: 'birth', qty: 1 }, { id: 'diploma', qty: 2 }]);
  // Sample: the training product.
  await run('multicultural training ×1', [{ id: 'mcc-training', qty: 1 }]);
  // Sample: an item that (until Jason creates it) has no price → expect HTTP 409.
  await run('per-page ×1 (expect 409 until price created)', [{ id: 'perpage', qty: 1 }]);
})().catch(e => { console.error(e); process.exit(1); });

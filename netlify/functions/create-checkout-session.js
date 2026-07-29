// netlify/functions/create-checkout-session.js
// Creates a Stripe Checkout Session for the teamtaika.com store cart.
//
// SECURITY: the client sends ONLY { id, qty } per line — never prices. The
// server resolves every line to a Stripe Price ID by the product's
// metadata.productKey, so amounts are authoritative and cannot be tampered
// with from the browser (unlike the legacy PayPal cart, which trusts client
// amounts). If any line can't be resolved, the WHOLE checkout is rejected —
// we never charge a partial or mispriced cart.
//
// Shares ONE Stripe account with taikatranslations.com. Every session is
// tagged metadata.site = 'teamtaika' + client_reference_id = 'teamtaika' so
// teamtaika revenue is cleanly separable in reporting/reconciliation.

// The Stripe client is created lazily via getStripe(), which is called from
// INSIDE the handler — so STRIPE_SECRET_KEY is read from the runtime
// environment on invocation, never inlined at build/bundle time. Only the
// library is required at module load (no key needed for that). A missing key
// returns a clean 500 in-handler instead of crashing cold-start.
const Stripe = require('stripe');
let _stripe = null;
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;   // resolved at runtime, per invocation
  if (!key) return null;
  if (!_stripe) _stripe = Stripe(key);
  return _stripe;
}

// ── Store cart id → Stripe product metadata.productKey ────────────────────
// The 7 keys already exist in the Stripe catalog (test + live). The 5 marked
// (NEW) must be created by Jason with these exact productKey metadata values
// and the amounts in scripts/test-stripe-session.js / STRIPE-PRICES.md.
const STORE_TO_KEY = {
  birth:          'birth-certificate',
  marriage:       'marriage-certificate',
  death:          'death-certificate',
  diploma:        'school-diploma',
  address:        'proof-of-address',
  immunization:   'immunization-record',
  'mcc-training': 'multicultural-training',
  divorce:        'divorce-decree',              // NEW  $32.50
  passport:       'passport-id',                 // NEW  $26.00
  perpage:        'other-document-per-page',     // NEW  $24.99
  'pdf-audit':    'pdf-accessibility-audit',     // NEW  $299.00
  'starter-kit':  'compliance-starter-kit'       // NEW  $149.00
};

const MAX_QTY = 99;
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://teamtaika.com';

// ── /order dynamic pricing (per-page certified translation) ────────────────
// The /order page and the language pages price by service tier × page count
// (+ optional notarization) — there is no fixed catalog product, so the server
// re-derives the amount here from these authoritative rates. Amounts are cents
// and MUST match the estimate shown by calcPriceOrder() in the browser; the
// browser's number is never trusted. Interpretation/quote services have no
// card path (they route to a custom quote instead).
const ORDER_PRICES  = { standard: 2499, rush: 3124, sameday: 3749 }; // cents / page
const NOTARIZE_CENTS = 4000;
const MAX_PAGES      = 500;
const SVC_LABEL      = { standard: 'Standard', rush: 'Rush (48h)', sameday: 'Same-Day' };

// ── Price map cache (per warm container) ──────────────────────────────────
// Rebuilt from the Stripe API so test vs live is automatic and nothing is
// hardcoded. Cached for a few minutes so we don't list prices on every call.
let _priceCache = null;
let _priceCacheAt = 0;
const PRICE_TTL_MS = 5 * 60 * 1000;

async function buildPriceMap(stripe) {
  const now = Date.now();
  if (_priceCache && (now - _priceCacheAt) < PRICE_TTL_MS) return _priceCache;

  const base = {};
  let starting_after;
  // Paginate defensively in case the catalog grows past one page.
  do {
    const page = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
      ...(starting_after ? { starting_after } : {})
    });
    for (const p of page.data) {
      const prod = p.product;
      // Skip archived/deleted products and non-one-time prices.
      if (!prod || prod.deleted || prod.active === false) continue;
      if (p.recurring) continue;
      const key = (prod.metadata && prod.metadata.productKey) || '';
      if (key) base[key] = p.id;
    }
    starting_after = page.has_more ? page.data[page.data.length - 1].id : null;
  } while (starting_after);

  _priceCache = { base };
  _priceCacheAt = now;
  return _priceCache;
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}

// Validate a caller-supplied return path so success/cancel redirects stay on
// our own origin — blocks open-redirects (//evil.com, scheme, traversal).
function safePath(p) {
  const s = String(p || '');
  if (!s || s[0] !== '/') return null;
  if (s.startsWith('//')) return null;
  if (s.includes('..') || s.includes(':') || s.includes('\\')) return null;
  if (!/^[A-Za-z0-9/_.-]+$/.test(s)) return null;
  return s.slice(0, 128);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }
  // Read the key from the runtime env, inside the handler, on every request.
  const stripe = getStripe();
  if (!stripe) {
    console.error('[create-checkout-session] STRIPE_SECRET_KEY not set at runtime');
    return json(500, { error: 'Payment is not configured yet. Please use PayPal or contact us.' });
  }

  // ── Parse + validate input ───────────────────────────────────────────
  let payload;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '');
    payload = JSON.parse(raw || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid request.' });
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const name  = String(payload.name  || '').trim().slice(0, 200);
  const email = String(payload.email || '').trim().slice(0, 200);
  const notes = String(payload.notes || '').trim().slice(0, 2000);

  if (!/\S+@\S+\.\S+/.test(email)) return json(400, { error: 'A valid email is required.' });

  const returnPath = safePath(payload.returnPath);
  const orderId    = String(payload.orderId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
  const taxOn      = process.env.STRIPE_AUTOMATIC_TAX === 'true';

  // ── /order dynamic path (per-page certified translation) ──────────────
  // Present only when the browser sends { order: {...} } (the /order page and
  // language pages). Amount is recomputed here from ORDER_PRICES — the client
  // never sends a price. Falls through to the store-cart path otherwise.
  if (payload.order && typeof payload.order === 'object') {
    const o   = payload.order;
    const svc = String(o.serviceType || '').trim();
    const perPage = ORDER_PRICES[svc];
    if (!perPage) {
      // interpretation / both / anything unknown → quote only, no card.
      return json(409, { error: 'This service needs a custom quote — card checkout isn\'t available. Please request a quote.' });
    }
    let pages = parseInt(o.pages, 10);
    if (isNaN(pages) || pages < 1) pages = 1;
    if (pages > MAX_PAGES) pages = MAX_PAGES;
    const notarize = o.notarization === true || o.notarization === 'yes' || o.notarization === 'true';
    const language = String(o.language || '').replace(/[^A-Za-z ()\-]/g, '').trim().slice(0, 40);

    const svcLabel = SVC_LABEL[svc];
    const line_items = [{
      price_data: {
        currency: 'usd',
        unit_amount: perPage,
        product_data: {
          name: 'Certified Translation' + (language ? ' – ' + language : '') + ' (' + svcLabel + ')',
          ...(taxOn ? { tax_code: 'txcd_10000000' } : {})
        },
        ...(taxOn ? { tax_behavior: 'exclusive' } : {})
      },
      quantity: pages
    }];
    if (notarize) {
      line_items.push({
        price_data: {
          currency: 'usd',
          unit_amount: NOTARIZE_CENTS,
          product_data: { name: 'Notarization', ...(taxOn ? { tax_code: 'txcd_10000000' } : {}) },
          ...(taxOn ? { tax_behavior: 'exclusive' } : {})
        },
        quantity: 1
      });
    }

    const summary = 'Certified Translation'
      + (language ? ' – ' + language : '')
      + ' | ' + svcLabel
      + ' | ' + pages + ' page' + (pages !== 1 ? 's' : '')
      + (notarize ? ' | + Notarization' : '');

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items,
        customer_email: email,
        client_reference_id: 'teamtaika',
        metadata: {
          site: 'teamtaika',
          customer_name: name,
          cart: summary.slice(0, 490),
          notes: notes.slice(0, 490),
          order_id: orderId
        },
        payment_intent_data: {
          statement_descriptor_suffix: 'TEAMTAIKA',
          metadata: { site: 'teamtaika', order_id: orderId }
        },
        ...(taxOn ? { automatic_tax: { enabled: true } } : {}),
        success_url: SITE_ORIGIN + (returnPath || '/order') + '?payment=success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:  SITE_ORIGIN + (returnPath || '/order')
      });
      return json(200, { url: session.url, id: session.id });
    } catch (e) {
      console.error('[create-checkout-session] Stripe error (order):', e.message);
      return json(502, { error: 'Could not start checkout. Please try again or use PayPal.' });
    }
  }

  // ── Store-cart path ───────────────────────────────────────────────────
  if (!items.length) return json(400, { error: 'Your cart is empty.' });

  // ── Resolve every line to an authoritative Price ID ───────────────────
  let priceMap;
  try {
    priceMap = await buildPriceMap(stripe);
  } catch (e) {
    console.error('[create-checkout-session] Failed to load Stripe prices:', e.message);
    return json(502, { error: 'Could not reach payment provider. Please try again.' });
  }

  const line_items = [];
  const summaryParts = [];
  const unavailable = [];

  for (const it of items) {
    const id = it && typeof it.id === 'string' ? it.id : '';
    let qty = parseInt(it && it.qty, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > MAX_QTY) qty = MAX_QTY;

    const productKey = STORE_TO_KEY[id];
    if (!productKey) { unavailable.push(id || '(unknown)'); continue; }

    const priceId = priceMap.base[productKey];
    if (!priceId) { unavailable.push(id); continue; }

    line_items.push({ price: priceId, quantity: qty });
    summaryParts.push(qty + '× ' + productKey);
  }

  // Fail closed: if anything couldn't be priced, reject the whole cart so we
  // never charge for a subset. (Until Jason creates the 5 NEW prices, carts
  // containing those items land here — the store falls back to PayPal.)
  if (unavailable.length) {
    return json(409, {
      error: 'Card checkout isn\'t available for some items in your cart yet. Please use PayPal for this order.',
      unavailable
    });
  }
  if (!line_items.length) return json(400, { error: 'Your cart is empty.' });

  // ── Create the session ────────────────────────────────────────────────
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      customer_email: email,
      client_reference_id: 'teamtaika',
      metadata: {
        site: 'teamtaika',
        customer_name: name,
        cart: summaryParts.join('; ').slice(0, 490),
        notes: notes.slice(0, 490),
        order_id: orderId
      },
      payment_intent_data: {
        // Suffix appears after the account's base descriptor on card
        // statements so buyers recognize the teamtaika charge.
        statement_descriptor_suffix: 'TEAMTAIKA',
        metadata: { site: 'teamtaika', order_id: orderId }
      },
      // Stripe Tax: only enable if the account has it turned on, else the
      // session create call errors. Gated behind an env flag (default off).
      ...(taxOn ? { automatic_tax: { enabled: true } } : {}),
      // Fixed-price store forms embedded on other pages pass their own
      // returnPath so buyers land back where they started; the /store cart
      // sends none and defaults to /store.
      success_url: SITE_ORIGIN + (returnPath || '/store') + (returnPath ? '?payment=success' : '?checkout=success') + '&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  SITE_ORIGIN + (returnPath || '/store') + (returnPath ? '' : '?checkout=cancel')
    });

    return json(200, { url: session.url, id: session.id });
  } catch (e) {
    console.error('[create-checkout-session] Stripe error:', e.message);
    return json(502, { error: 'Could not start checkout. Please try again or use PayPal.' });
  }
};

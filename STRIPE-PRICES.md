# Stripe setup for teamtaika.com store — Jason's checklist

teamtaika.com and taikatranslations.com share **one** Stripe account
(`acct_1TqaW6RmJjhHm7QV`, TaikaTranslations LLC). Do **not** create a new
account. This file covers only what teamtaika's store needs.

## 1. Create the 5 missing prices (TEST mode first, then LIVE)

The store sells 5 products that don't yet exist in the Stripe catalog. The
checkout code resolves prices by the product's **`productKey` metadata**, so
each new product must carry the exact metadata key below. Amounts match the
current store prices — do not change them. All: USD, **one-time**, tax category
`txcd_10000000`.

| Store item | Product name | Amount | `productKey` metadata (exact) |
|---|---|---|---|
| Divorce Decree | Divorce Decree Certified Translation | $32.50 | `divorce-decree` |
| Passport / ID | Passport / ID Certified Translation | $26.00 | `passport-id` |
| Other Document (per page) | Other Document Certified Translation (per page) | $24.99 | `other-document-per-page` |
| PDF Accessibility Audit | PDF Accessibility Audit | $299.00 | `pdf-accessibility-audit` |
| Compliance Starter Kit | Compliance Starter Kit | $149.00 | `compliance-starter-kit` |

Create each **twice** — once in **Test mode**, once in **Live mode** (toggle
top-right in the Stripe dashboard). The metadata key must be identical in both.

> The other 7 products (birth, marriage, death, school-diploma, proof-of-address,
> immunization-record, multicultural-training) already exist and already carry
> their `productKey` — nothing to do there.

## 2. Netlify environment variables (Netlify UI → Site settings → Environment)

Set these — **never** paste keys into chat, code, or git:

| Variable | Value | Scope |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` for Deploy Preview / branch; `sk_live_…` for Production only | context-scoped |
| `STRIPE_WEBHOOK_SECRET` | the `whsec_…` from the webhook endpoint (step 3) | context-scoped |
| `RESEND_API_KEY` | (already set — reused for confirmation emails) | — |
| `SITE_ORIGIN` | `https://teamtaika.com` (optional; defaults to this) | Production |
| `STRIPE_AUTOMATIC_TAX` | `true` **only if** Stripe Tax is enabled on the account; otherwise leave unset | optional |

Use Netlify's context scoping so **test** keys go to Deploy-Preview/branch and
the **live** key goes to Production only.

## 3. Register the webhook endpoint (Stripe → Developers → Webhooks)

- Endpoint URL: `https://teamtaika.com/.netlify/functions/stripe-webhook`
- Events to send: **`checkout.session.completed`**
- Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` (step 2).
- Create it in **both** test and live modes (each has its own signing secret).

Note: because the account is shared, this endpoint also receives
taikatranslations.com events — the function ignores anything not tagged
`metadata.site === 'teamtaika'`, so that's expected and harmless.

## 4. Verify

1. `npm install` then `export STRIPE_SECRET_KEY=sk_test_… && npm run test:stripe`
   — prints sample test sessions (line items, total, `metadata.site=teamtaika`).
2. On a Deploy Preview, run one full test-card checkout (`4242 4242 4242 4242`)
   and confirm the confirmation email arrives + the webhook logs `PAID teamtaika order`.
3. Switch Production env to the live key and deploy.

# teamtaika.com — Work Continuation Handoff

**Last updated:** 2026-07-08 · **Repo:** `C:\Users\User\Documents\GitHub\teamtaika.com` (git; pushes to `main` auto-deploy via Netlify ~60–90s). Read `CLAUDE.md` first for the project reference.

---

## 🔴 DO THIS FIRST — critical, only Jason can do it

1. ~~**Run `supabase-security-fixes.sql` in Supabase → SQL Editor.**~~ ✅ **DONE 2026-07-10** — applied to production project `ijwgdzrunkxrpzsrcqir` via the Dashboard SQL Editor ("Success. No rows returned"). C1 (profiles role-escalation triggers), M1 (project field triggers), and M2 (storage RLS rewrite) are all live. Verification round-trip still pending (see below).
2. ~~**Rotate the exposed GitHub PAT.**~~ ✅ **DONE 2026-07-10** — old `ghp_…` token deleted on GitHub; plaintext scrubbed from both `CLAUDE.md` copies. Verified `git push` still works afterward (commit `6424765`), so the active git credential was a different one — no refresh needed.
3. **Verify portal login works** — it was broken until an earlier session (a scoping bug threw on every sign-in; fixed in commit `8f5b266`).

---

## Build / deploy facts (don't relearn these)

- **There IS a build step** (despite CLAUDE.md's old "no build step" line, now corrected): `build.py` injects `components/nav.html` + `components/footer.html` into `<!-- @nav -->` / `<!-- @footer -->` placeholders at deploy. Edit **source** (`index.html`, `pages/**`, `components/**`), never `dist/` (gitignored, regenerated each deploy).
- **Clean URLs** come from `netlify.toml` `[[redirects]]` (status 200 rewrites). Add a redirect for any new clean URL.
- **CSS/JS caching:** `main.css?v=2` and `main.js?v=27` are versioned; `/css/*` and `/js/*` now use `max-age=0, must-revalidate`, so edits propagate without a version bump. If you DO change cache behavior, remember the immutable trap that hid earlier fixes.
- **Nav lives in two places:** `components/nav.html` (injected into ~95 placeholder pages) AND ~64 inline copies that have drifted. Editing nav means touching both, or the placeholder pages only. (Consolidation is a deferred task.)
- **Gitignored (never commit):** `dist/`, `.claude/`, `CLAUDE.md` (holds secrets).
- **Video rule:** only embed YouTube videos verified (via oEmbed `author_name`) to be on the official `TaikaTranslations` channel. Never trust topic searches.

---

## Done this session (all live on `main`)

- **Order flow:** `/order` (pay + upload) and `/store` (multi-item cart + PayPal `_cart` checkout, file upload → `projects@` via `submission-created` function). Hero/store/translation "Order Now" route to `/order`.
- **Mobile fixes:** nav overflow (icon-only logo on mobile), inline-grid collapse, cookie-banner iOS dismissal.
- **Individuals/Private Clients:** `/individuals` page + "Who We Serve" nav entry + homepage card.
- **SEO landing pages:** `/hipaa-compliant-translation` (BAA offer, Section 1557) and `/gsa-translation-services` (SIN 541930, contract **47QRAA18D00GT**).
- **ICH E6(R3)** section added to `/clinical-trial-translation`.
- **JSON-LD schema:** FAQPage on 9 service pages; BreadcrumbList + Service across all `services/`, `certified/`, `documents/` pages.
- **Weekly blog post:** `/blog/marriage-certificate-translation-uscis` (filterable under USCIS & Immigration; counts updated to 17).
- **Broken links:** 18+ redirects added (native-language nav links, content clean URLs, `/portal/login`, `/contact`); site-directory updated.
- **GA4 fixed** — was CSP-blocked site-wide (gtag.js couldn't load); CSP now allows googletagmanager/google-analytics. Verified collecting live. Admin analytics dashboard linked from every admin page.
- **Security/correctness review + fixes** (4 reviewers) — commits `8f5b266`, `e7ee259`, `8aad03c`, `49843ba`, `ad29e6e`. See "Security review outcomes" below.

---

## Security review outcomes (2026-07-08)

**Fixed + deployed (code):** broken login; checkout race (payment before order/upload arrived) + NaN-amount guard + order-id correlation; unchecked-checkbox serialization; requireAuth fails closed; confirmDialog live-dialog; admin/team stored-XSS; admin/analytics reflected-XSS; invited-admin lockout; `submission-created` public-endpoint hardening (https-only links, validated reply-to, rate limit); paypal-ipn base64 body + unrecognized-item → manual review; send-email CORS; translate empty-body; get-profile try/catch; notify identity-from-token; **store cart hardened vs tampered localStorage (verified live: XSS blocked, prices re-priced, qty clamped).**

**Pending (needs Jason / verification):**
- ~~**CRITICAL:** run `supabase-security-fixes.sql` (profiles RLS column bypass).~~ ✅ **DONE 2026-07-10** — C1 + M1 + M2 applied to production.
- **MEDIUM (M2 storage) — FIXED IN CODE + MIGRATION, applied to production 2026-07-10; live round-trip verify still pending.** Root cause was worse than noted: `portal.js uploadFile()` prefixed the object key with the bucket name (`project-files/<projectId>/...`), so `foldername[1]` was the literal string `"project-files"` — client uploads always denied; and the old uid-keyed SELECT policy meant clients could never download admin-uploaded *delivery* files either (those live at `<projectId>/delivery/...`). Fix: (a) `uploadFile()` now builds `<projectId>/<type>/...` (no bucket prefix); (b) storage RLS rewritten to grant access by **project ownership** (`is_admin() OR project.client_id = auth.uid()`), matching the messages/status-history policies. Migration DROP+CREATE is in `supabase-security-fixes.sql` (same file Jason must run for C1). Existing admin-uploaded delivery files stay accessible (no data migration). **Verify after running: client submits w/ source file → admin uploads delivery → client downloads it.**
- **LOW (skipped):** deprecated `X-XSS-Protection` header; some nav links use `.html` paths that 301 (extra hop); UTF-8 mojibake in a few admin files (`—`→`â`); `individuals.html` YouTube embed channel not re-verified.

---

## Remaining backlog (not started)

- **Transcription feature** (AssemblyAI, ~4–6 hrs) — full spec in `CLAUDE.md`: `transcribe.js` + `transcribe-webhook.js` functions, `transcripts` Supabase table, portal submit option, transcript viewers, `ASSEMBLYAI_API_KEY` env var.
- **Weekly blog posts** — cadence (last: marriage-certificate-uscis). Next candidate clusters: legal (court-certified, deposition), medical, language-specific.
- **Nav consolidation** — unify the 64 inline navs + `components/nav.html` (drift-prone; diff first).
- **CSP `unsafe-inline`** — removing needs nonces/hashes across many inline scripts (large).
- **Standing tasks:** Task #66 end-to-end portal test; submit new URLs to Google Search Console (`/store`, `/individuals`, `/hipaa-compliant-translation`, `/gsa-translation-services`, `/blog/marriage-certificate-translation-uscis`); one live test order through `/store` to confirm checkout + file→projects@ + IPN end-to-end.

---

## How to verify a change (local preview is flaky)

The PowerShell static server + preview iframe intermittently serves blank docs. When it works, iframe geometry/JS tests are reliable; when `contentDocument` is empty, it's the environment, not the code. **The live Netlify server is reliable** — verify with PowerShell `Invoke-WebRequest` (curl returns spurious `000`s here) or drive the live page with the Chrome MCP `javascript_tool`. Netlify minifies HTML (single quotes, stripped `.html`) so match loosely.

---

## Key files

`index.html` · `css/main.css` · `js/main.js` (GA, cookie, checkout) · `js/portal.js` (Supabase singleton, auth guards) · `netlify.toml` (redirects, CSP, cache headers) · `netlify/functions/` (get-profile, portal-admin, paypal-ipn, send-email, notify, translate, submission-created) · `components/nav.html` + `footer.html` · `supabase-schema.sql` + `supabase-security-fixes.sql` · `build.py`

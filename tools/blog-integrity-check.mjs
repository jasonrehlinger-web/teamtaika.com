#!/usr/bin/env node
// Blog integrity checker for teamtaika.com.
//
//   node tools/blog-integrity-check.mjs
//
// Audits every post in pages/resources/blog/ against the 6 publishing surfaces
// plus the metadata rules, and prints one line per problem. Exit 0 = clean,
// exit 1 = problems found. The teamtaika-autoblog task runs this before and
// after publishing so wiring gaps get caught the week they appear instead of
// accumulating silently (in Aug 2026 an audit found 9 posts that had never been
// added to sitemap.xml and 9 whose JSON-LD dates were a year off).
//
// Checks per post: index card, netlify 200 rewrite, forced canonical 301,
// sitemap entry, site-directory link, canonical === og:url, JSON-LD parses,
// JSON-LD dates match the displayed byline, all three CTAs present, no
// duplicate HTML ids, no unresolved {{TOKEN}}s, no hardcoded compliance dates.
// Repo-wide: blog.html counters match real card counts, sitemap well-formed.

import fs from 'fs';
import path from 'path';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..');
const R = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');

const BLOG_DIR = 'pages/resources/blog';
const MONTHS = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };

// Two severities. `fail` = broken and must be fixed (exits 1). `advise` =
// pre-2026-08 posts built before the current template, which wrap their CTAs in
// inline styles rather than .answer-box/.inline-cta/.post-cta. They still have a
// working CTA link, so this is a modernization backlog, not a defect.
const problems = [];
const advisories = [];
const fail = (slug, msg) => problems.push((slug ? slug + ': ' : '') + msg);
const advise = (slug, msg) => advisories.push((slug ? slug + ': ' : '') + msg);

const netlify = R('netlify.toml');
const sitemap = R('sitemap.xml');
const blogIndex = R(`${BLOG_DIR}.html`);
const siteDir = R('pages/site-directory.html');

// Compliance dates are token-driven; a literal date in a post means someone
// hardcoded what should come from data/compliance-deadlines.json.
const deadlines = JSON.parse(R('data/compliance-deadlines.json'));
const literalDates = Object.entries(deadlines)
  .filter(([k]) => !k.startsWith('_'))
  .map(([, v]) => v);

const slugs = fs.readdirSync(path.join(REPO, BLOG_DIR))
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .map((f) => f.replace(/\.html$/, ''));

for (const slug of slugs) {
  const s = R(`${BLOG_DIR}/${slug}.html`);

  // --- wiring surfaces ---
  if (!blogIndex.includes(`/blog/${slug}"`) && !blogIndex.includes(`/blog/${slug}'`)) fail(slug, 'no card in blog.html');
  if (!netlify.includes(`from = "/blog/${slug}"`)) fail(slug, 'no netlify 200 rewrite');
  if (!netlify.includes(`from = "/pages/resources/blog/${slug}.html"`)) fail(slug, 'no forced canonical 301');
  if (!sitemap.includes(`/blog/${slug}<`)) fail(slug, 'missing from sitemap.xml');
  if (!siteDir.includes(`/blog/${slug}"`) && !siteDir.includes(`/blog/${slug}'`)) fail(slug, 'not in site-directory.html');

  // --- canonical / og:url agreement ---
  const canon = (s.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const ogUrl = (s.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];
  const want = `https://teamtaika.com/blog/${slug}`;
  if (canon !== want) fail(slug, `canonical is ${canon || 'MISSING'}, expected ${want}`);
  if (ogUrl !== canon) fail(slug, `og:url (${ogUrl || 'MISSING'}) != canonical (${canon})`);

  // --- JSON-LD ---
  const open = s.indexOf('<script type="application/ld+json">');
  if (open === -1) {
    fail(slug, 'no Article JSON-LD');
  } else {
    const raw = s.slice(open + '<script type="application/ld+json">'.length, s.indexOf('</script>', open));
    let ld;
    try {
      ld = JSON.parse(raw.trim());
    } catch (e) {
      fail(slug, 'JSON-LD does not parse — ' + e.message);
    }
    if (ld) {
      if (ld.url !== want) fail(slug, `JSON-LD url is ${ld.url}, expected ${want}`);
      // Structured-data date must match the date the page actually shows;
      // Google reads the JSON-LD, so a mismatch misrepresents freshness.
      const shown = [...s.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})/g)]
        .map((m) => `${m[3]}-${String(MONTHS[m[1]]).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`);
      if (shown.length && ld.datePublished && !shown.includes(ld.datePublished)) {
        fail(slug, `JSON-LD datePublished ${ld.datePublished} is not a date shown on the page (${[...new Set(shown)].join(', ')})`);
      }
    }
  }

  // --- conversion elements ---
  // A post with no CTA link at all is a hard failure: it earns traffic and
  // converts none of it. Missing template *classes* on legacy posts is advisory.
  if (!/class="btn-primary"/.test(s)) fail(slug, 'no CTA button anywhere — traffic with no conversion path');
  const missingCls = ['answer-box', 'inline-cta', 'post-cta'].filter((c) => !s.includes(`class="${c}"`));
  if (missingCls.length) advise(slug, `legacy template, no ${missingCls.map((c) => '.' + c).join(' / ')}`);

  // --- hygiene ---
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  if (dupes.length) fail(slug, 'duplicate HTML id: ' + dupes.join(', '));

  const leftover = [...new Set(s.match(/{{[A-Z0-9_]+}}/g) || [])]
    .filter((t) => !(t.slice(2, -2) in deadlines));
  if (leftover.length) fail(slug, 'unknown token(s) build.py cannot resolve: ' + leftover.join(', '));

  for (const d of literalDates) {
    if (s.includes(d)) fail(slug, `hardcoded compliance date "${d}" — use the {{TOKEN}} instead`);
  }
}

// --- blog.html counters vs reality ---
const cats = [...blogIndex.matchAll(/data-category="([^"]+)"/g)].map((m) => m[1]);
const counts = cats.reduce((a, c) => ((a[c] = (a[c] || 0) + 1), a), {});
for (const m of blogIndex.matchAll(/data-filter="([^"]+)"[^>]*>[^<]*<span class="filter-badge">(\d+)</g)) {
  const [, key, badge] = m;
  const actual = key === 'all' ? cats.length : (counts[key] || 0);
  if (+badge !== actual) fail('', `blog.html filter badge "${key}" says ${badge} but there are ${actual} cards`);
}
for (const [label, re] of [['Filter N articles', /Filter (\d+) articles/], ['Showing all N posts', /Showing all (\d+) posts/]]) {
  const got = (blogIndex.match(re) || [])[1];
  if (+got !== cats.length) fail('', `blog.html "${label}" says ${got} but there are ${cats.length} cards`);
}
if (cats.length !== slugs.length) fail('', `blog.html has ${cats.length} cards but ${slugs.length} post files exist`);

// --- sitemap well-formedness ---
const u = (sitemap.match(/<url>/g) || []).length;
const uc = (sitemap.match(/<\/url>/g) || []).length;
const lc = (sitemap.match(/<loc>/g) || []).length;
if (!(u === uc && u === lc)) fail('', `sitemap.xml malformed: ${u} <url>, ${uc} </url>, ${lc} <loc>`);

console.log(`checked ${slugs.length} posts across 6 surfaces`);

if (advisories.length) {
  console.log(`\n${advisories.length} advisory (non-blocking):`);
  advisories.forEach((a) => console.log('  - ' + a));
}

if (!problems.length) {
  console.log('\nCLEAN — no blocking problems');
  process.exit(0);
}
console.log(`\n${problems.length} PROBLEM(S):`);
problems.forEach((p) => console.log('  ! ' + p));
process.exit(1);

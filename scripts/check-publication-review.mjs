#!/usr/bin/env node
/**
 * Publication review gate — teamtaika.com.
 *
 * WHY IT EXISTS
 * -------------
 * Jason, 2026-11-11: "If the agents can make mistakes, then you need to enforce
 * a reviewer agent that is mandatory for any publications."
 *
 * Agents publish to this site unattended and a push to `main` auto-deploys in
 * about a minute. Everything protecting the CLAIMS on those pages is prose in a
 * SKILL.md file, and an agent that is confused, truncated or simply in a hurry
 * skips prose. This makes the review something the build checks instead.
 *
 * Ported from taikatranslations.com (scripts/check-publication-review.mjs,
 * commit 4e6732a). Same design, adapted for HTML pages instead of markdown.
 *
 * HOW IT IS ACTUALLY ENFORCED HERE. build.py runs it before it builds anything
 * (see the call at the top of that file). Netlify runs build.py on every deploy,
 * so a violation fails the deploy — nothing reaches the live site. A pre-push
 * hook in .git/hooks runs it too, so the failure usually lands locally first,
 * before a credit is spent on a doomed deploy.
 *
 * WHAT THE ORIGINAL LEARNED THE HARD WAY
 * --------------------------------------
 * The first version tried to BE the reviewer: a list of forbidden phrases,
 * fatal on sight. Run against the live site it produced 39 findings and every
 * one checked was a false positive, because the pages were doing exactly the
 * right thing:
 *
 *   "There is no such thing as being 'ADA certified' — no such certification
 *    exists, and a vendor offering one is selling something that is not real."
 *
 * A regular expression cannot tell a claim from a denial of that claim. Wired
 * in as written it would have failed the build on correct sentences and stopped
 * all publishing — and taught everyone to reach for the escape hatch, which is
 * how a guard dies.
 *
 * So the two parts are deliberately asymmetric:
 *
 *   PART 1  a claim SCAN that is ADVISORY. It never fails the build on its own.
 *           It finds passages touching a rule and hands them to the reviewer,
 *           which is the thing that can read meaning. Negation-aware.
 *   PART 2  the GATE, and the only fatal part: every NEW or CHANGED published
 *           page must carry a passing review record whose hash matches the file
 *           as it stands.
 *
 * Part 2 is what makes the reviewer mandatory rather than advisory. An agent
 * that skips the review cannot build; an agent that cannot build cannot deploy.
 * Editing a page after review changes its hash and voids the review — the point
 * being that the review attests to the exact text that ships.
 *
 * GRANDFATHERING. Pages that predate this are recorded once in
 * content-reviews/_baseline.json and are exempt from PART 2 until someone edits
 * them, at which point they need a review like anything else.
 *
 * Modes:
 *   (default)            fail on an unreviewed publication
 *   REVIEW_GUARD=report  print everything, exit 0
 *   SKIP_REVIEW_GUARD=1  escape hatch, for when the guard itself is wrong
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(process.argv[2] || path.join(import.meta.dirname, ".."));
const REVIEW_DIR = path.join(ROOT, "content-reviews");
const BASELINE = path.join(REVIEW_DIR, "_baseline.json");
const MODE = process.env.REVIEW_GUARD === "report" ? "report" : "enforce";

if (process.env.SKIP_REVIEW_GUARD === "1") {
  console.log("[review-guard] SKIPPED (SKIP_REVIEW_GUARD=1)");
  process.exit(0);
}

// ---- what counts as a published page on this site -------------------------
// Source HTML only. build.py reads these and writes dist/, which is what
// Netlify serves, so the source file is the thing a review should attest to.
const PAGE_ROOTS = ["pages"]; // recursive
const ROOT_PAGES = true;      // plus *.html at the repo root
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "components", "netlify"]);

const files = [];
const walk = (dir, rel) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(abs, r);
    else if (/\.html?$/i.test(e.name)) files.push({ rel: r, raw: fs.readFileSync(abs, "utf8") });
  }
};
for (const d of PAGE_ROOTS) {
  const abs = path.join(ROOT, d);
  if (fs.existsSync(abs)) walk(abs, d);
}
if (ROOT_PAGES) {
  for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (e.isFile() && /\.html?$/i.test(e.name)) {
      files.push({ rel: e.name, raw: fs.readFileSync(path.join(ROOT, e.name), "utf8") });
    }
  }
}
files.sort((a, b) => a.rel.localeCompare(b.rel));

// Line endings are normalised before hashing, and that is load-bearing.
// This machine is Windows with core.autocrlf=true, so a file can sit in the
// working copy as CRLF while git stores it as LF — measured 2026-11-11: 98 of
// 253 pages on taikatranslations.com, 49 of 235 here. Netlify checks out the
// LF blob on Linux. Hashing raw bytes therefore produced a review record that
// could never match on the server: every one of those pages looked "changed
// and unreviewed" and the deploy failed, which is exactly the outage this
// guard exists to prevent. Normalising makes the hash mean the same thing on
// both sides.
const sha = (s) => crypto.createHash("sha256").update(s.replace(/\r\n/g, "\n"), "utf8").digest("hex");

// ---- the baseline, loaded first: both parts need to know what is new ------
fs.mkdirSync(REVIEW_DIR, { recursive: true });
let baseline = {};
if (fs.existsSync(BASELINE)) {
  baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8")).hashes || {};
} else {
  for (const f of files) baseline[f.rel] = sha(f.raw);
  fs.writeFileSync(BASELINE, JSON.stringify({
    note: "Pages that predate the review gate (2026-11-11). Exempt until edited — an edit changes the hash and a review is then required.",
    created: new Date().toISOString(),
    hashes: baseline,
  }, null, 1) + "\n");
  console.log(`[review-guard] baseline written: ${Object.keys(baseline).length} existing pages grandfathered.`);
}

// ----------------------------- PART 1 — advisory claim scan ---------------
//
// These are topics the reviewer must rule on, not verdicts. Every rule says
// what the reviewer is deciding, because a flag with no question attached gets
// waved through.

const RULES = [
  { id: "iso", re: /\bISO[\s‑-]*\d{0,5}\s*(?:certified|certification|accredited|member)\b/gi,
    ask: 'Is this claiming the company HOLDS ISO certification? Only "meets and exceeds ISO 17100, 9001, 27001 and 18587 standards" as plain text is approved, and 18587 only where machine translation is genuinely in play.' },
  // ATA splits in two, because one half is approved and the other is banned,
  // and treating them alike is what makes a guard unreadable. Measured on
  // teamtaika.com 2026-11-11: 474 "ATA certified" vs 203 "ATA member".
  //
  // APPROVED: "we use ATA Certified translators" — a true statement about the
  // linguists on a project. Stripping it is a known past error (taika commit
  // 8e92109, reverted in 6dd952c), so it must not be flagged by default.
  { id: "ata-company", re: /\bATA[\s‑-]*(?:certified|accredited)\b(?!\s*(?:translator|linguist|interpreter|professional|reviewer|staff))/gi,
    ask: "Is this attached to the COMPANY rather than to the linguists? ATA certifies individual translators, not agencies, so a company-level claim is false as well as off-limits. 'ATA Certified translators' is approved and must not be touched." },
  // BANNED: any company-level membership claim, and any emblem.
  { id: "ata-member", re: /\bATA[\s‑-]*(?:member|membership|logo|emblem|badge|seal)\b/gi,
    ask: "Company-level ATA membership claims and ATA emblems are both forbidden by CLAUDE.md B2. If the company genuinely holds ATA corporate membership this needs Jason's written confirmation and a CLAUDE.md correction FIRST — do not simply delete it, and do not simply keep it." },
  { id: "ada-cert", re: /\bADA[\s‑-]*(?:certified|certification|accredited)\b/gi,
    ask: "Is the page CLAIMING ADA certification, or correctly saying no such thing exists? The second is right and common here." },
  { id: "outcome", re: /\b(?:guarantee|guaranteed|guarantees|ensure|ensures|promise|promises)\b[^.?!]{0,60}\b(?:approval|visa|petition|application|green card|citizenship|admission|outcome|case|award|contract)\b/gi,
    ask: "Is an application, case or award outcome being promised? Only a guarantee scoped to work we control is approved; the '100% USCIS Acceptance Guarantee' label itself is approved." },
  { id: "eo13166", re: /\bExecutive Order 13166\b/gi,
    ask: "Is EO 13166 cited as CURRENT authority? It was revoked 2025-03-01; Title VI is correct. Describing the revocation is fine." },
  { id: "deadline", re: /\b(?:April|June|August)\s+\d{1,2},?\s+20(?:2[6-9])\b/gi,
    ask: "Is this a compliance deadline typed into the page? Deadlines have one source — data/compliance-deadlines.json, referenced as a {{TOKEN}}. Never retype one." },
  { id: "stat", re: /\b\d{1,3}(?:,\d{3})+\+?\s+(?:projects|linguists|words|clients|customers)\b/gi,
    ask: "Is this one of the verified counts (300+ languages, 1B+ words, 5,000+ linguists, 102,000+ projects)? Anything else is unverified." },
];

// A denial is not a claim. This is why the first version failed.
const NEGATORS = /\b(?:no such thing|does not exist|doesn't exist|no such certification|there is no|cannot|can't|never|not a certification|no translator can|be wary|is not real|revoked|rescinded|myth|misconception|no promise|makes no|make no|nobody can|not about the outcome|does not promise|do not provide|does not provide|don't provide|do not offer|does not offer|don't offer|do not answer|we do not|we don't|not something we|not a service we|rather than let you assume|their own|third[- ]party vendor)\b/i;

// Markup is not prose. Blank out <style> and ordinary <script> so CSS and JS
// cannot trip a rule, but keep byte offsets so line numbers stay true.
//
// JSON-LD is DELIBERATELY NOT BLANKED. Structured data is published claim
// content — it is what Google reads for rich results — so a false credential
// there does more damage than one in the body copy, not less. Blanking every
// <script> hid 150+ credential strings on teamtaika.com from this scan until
// 2026-11-11.
const blank = (m) => " ".repeat(m.length);
const textOf = (html) => html
  .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs) =>
    /ld\+json/i.test(attrs) ? m : blank(m))
  .replace(/<style\b[\s\S]*?<\/style>/gi, blank);

// Scan only what is actually being published now. Scanning every page on every
// build buries the signal — and a guard that prints hundreds of lines on a clean
// build is one nobody reads. The reviewer rules on new and changed pages; the
// rest were reviewed when they shipped.
const scanSet = files.filter((f) => baseline[f.rel] !== sha(f.raw));

const flags = [];
for (const f of scanSet) {
  const body = textOf(f.raw);
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(body)) !== null) {
      const ctx = body.slice(Math.max(0, m.index - 220), m.index + 260);
      if (NEGATORS.test(ctx)) continue; // the page is debunking it, not claiming it
      flags.push({
        file: f.rel,
        line: body.slice(0, m.index).split("\n").length,
        rule: rule.id,
        text: m[0].replace(/\s+/g, " ").trim(),
        ask: rule.ask,
      });
    }
  }
}

// ------------------------------- PART 2 — the gate (fatal) ----------------

const recPath = (rel) =>
  path.join(REVIEW_DIR, rel.replace(/\//g, "__").replace(/\.html?$/i, "") + ".json");

const unreviewed = [];
for (const f of files) {
  const h = sha(f.raw);
  if (baseline[f.rel] === h) continue;
  const rec = recPath(f.rel);
  if (!fs.existsSync(rec)) { unreviewed.push({ file: f.rel, why: "no review record", h }); continue; }
  let r;
  try { r = JSON.parse(fs.readFileSync(rec, "utf8")); }
  catch { unreviewed.push({ file: f.rel, why: "review record is not valid JSON", h }); continue; }
  if (r.verdict !== "pass") unreviewed.push({ file: f.rel, why: `review verdict is "${r.verdict}"`, h });
  else if (r.sha256 !== h) unreviewed.push({ file: f.rel, why: "page changed after review — the review attests to different text", h });
}

// ------------------------------------------------------------- report -----

if (flags.length) {
  console.log(`\n[review-guard] ${flags.length} passage(s) for the reviewer to rule on (advisory, not a failure):\n`);
  for (const f of flags.slice(0, 40)) {
    console.log(`  ${f.file}:${f.line}  [${f.rule}]  "${f.text}"`);
    console.log(`     decide: ${f.ask}`);
  }
  if (flags.length > 40) console.log(`  ... and ${flags.length - 40} more`);
  console.log("");
}

if (!unreviewed.length) {
  console.log(`[review-guard] OK — ${files.length} published pages, every new or changed one carries a matching review.`);
  process.exit(0);
}

console.error(`\n[review-guard] ${unreviewed.length} page(s) would publish WITHOUT a valid review:\n`);
for (const u of unreviewed) console.error(`  ${u.file}\n     ${u.why}\n     sha256 ${u.h}`);
console.error(`
  Run the content reviewer on each page, then write its verdict to
  content-reviews/<path with / replaced by __>.json :

    {"file":"pages/resources/blog/example.html",
     "sha256":"<the sha256 printed above>",
     "verdict":"pass",
     "reviewer":"content-reviewer",
     "at":"<UTC ISO>",
     "findings":[]}

  The hash is what makes the review mean something: change the page afterwards
  and the review stops matching, which is intended.`);

if (MODE === "report") {
  console.error(`\n[review-guard] REPORT MODE — not failing.\n`);
  process.exit(0);
}
console.error(`\n[review-guard] FAILED. Nothing publishes until each page is reviewed.`);
console.error(`  Escape hatch, only when the guard itself is wrong: SKIP_REVIEW_GUARD=1\n`);
process.exit(1);

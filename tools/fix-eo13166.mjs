// tools/fix-eo13166.mjs — one-off remediation.
// EO 13166 was REVOKED 2025-03-01 by EO 14224. Reframe every teamtaika.com page
// that cited it as CURRENT law, matching the approved taikatranslations reframe:
// Title VI of the Civil Rights Act (statute, unchanged) is the binding authority;
// EO 13166 is not present-tense; obligation tag "Title VI · EO 13166" → "Title VI
// · State & grant rules"; footer link → "Title VI & Language Access". The
// dedicated EO 13166 FAQ in compliance-faq.html is reframed separately (past
// tense + revoked note). Already-corrected sentences (they say "revoked by
// Executive Order 14224") contain none of these search strings, so they're safe.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Order: most-specific first. Each pair must yield grammatically clean text.
const PAIRS = [
  // --- shared footer link (inlined into ~106 pages) + heading variants ---
  ["Title VI &amp; EO 13166", "Title VI &amp; Language Access"],
  ["Title VI &amp; Executive Order 13166", "Title VI &amp; Language Access"],
  // --- compliance-checklist blurbs (drop EO 13166 from the list) ---
  ["Title VI, IDEA, Section 1557, and EO 13166", "Title VI, IDEA, and Section 1557"],
  ["Title VI, EO 13166, Section 508, ADA Title II, and more", "Title VI, Section 508, ADA Title II, and more"],
  // --- obligation tags ---
  ["Title VI · EO 13166 · ", "Title VI · State &amp; grant rules · "],
  ["Title VI / EO 13166", "Title VI"],
  // --- specific body sentences ---
  ["Title VI of the Civil Rights Act, Executive Order 13166 (LEP access), Section 1557 (ACA language access), and ADA", "Title VI of the Civil Rights Act (LEP access), Section 1557 (ACA language access), and ADA"],
  ["Title VI of the Civil Rights Act, Executive Order 13166 (LEP access), and Section 508", "Title VI of the Civil Rights Act (LEP access) and Section 508"],
  ["Under Title VI of the Civil Rights Act and Executive Order 13166, virtually every government agency", "Under Title VI of the Civil Rights Act, virtually every government agency"],
  ["you have a legal obligation under Title VI and Executive Order 13166 to provide meaningful language access", "you have a legal obligation under Title VI of the Civil Rights Act to provide meaningful language access"],
  ["Under Title VI and EO 13166, agencies must translate", "Under Title VI, agencies must translate"],
  ["Under Title VI and EO 13166, federally assisted programs may not charge", "Under Title VI, federally assisted programs may not charge"],
  ["Title VI and EO 13166 language access requirements", "Title VI language access requirements"],
  ["Title VI and EO 13166 require meaningful language access for", "Title VI requires meaningful language access for"],
  ["Title VI and EO 13166 require federal agencies to provide language access.", "Title VI requires federal agencies to provide language access."],
  ["Title VI and EO 13166 require meaningful language access to government services and information.", "Title VI requires meaningful language access to government services and information."],
  ["Title VI and Executive Order 13166 require meaningful language access to government services and information.", "Title VI requires meaningful language access to government services and information."],
  ["Title VI and EO 13166 compliant.", "Title VI compliant."],
  ["A professionally drafted LAP template built to Title VI and EO 13166 requirements.", "A professionally drafted LAP template built to Title VI requirements."],
  ["Federal contractors under EO 13166 must provide accessible training", "Federal contractors under Title VI must provide accessible training"],
  ["has language access obligations under Executive Order 13166 and Title VI.", "has language access obligations under Title VI of the Civil Rights Act."],
  ["under Executive Order 13166 and Title VI.", "under Title VI of the Civil Rights Act."],
  ["The Legal Foundation: Title VI and EO 13166", "The Legal Foundation: Title VI of the Civil Rights Act"],
  ["The Legal Basis: Title VI and Executive Order 13166", "The Legal Basis: Title VI of the Civil Rights Act"],
  ["mean under Title VI and EO 13166?", "mean under Title VI?"],
  // --- generic catch-alls (specific ones above already handled their cases) ---
  ["Title VI of the Civil Rights Act and Executive Order 13166 require", "Title VI of the Civil Rights Act requires"],
  ["Title VI and Executive Order 13166 require", "Title VI requires"],
  ["Title VI and EO 13166 require", "Title VI requires"],
];

// Skip the two already-corrected posts entirely (belt-and-suspenders; their
// reframed text matches none of the search strings anyway).
const SKIP = new Set([
  "pages/resources/blog/title-vi-language-access-plan.html",
  "pages/resources/blog/translation-for-government.html",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = [...walk("pages"), "components/footer.html", "index.html"];
let totalFiles = 0, totalReplacements = 0;
for (const f of files) {
  const rel = f.replace(/\\/g, "/");
  if (SKIP.has(rel)) continue;
  let src = readFileSync(f, "utf8");
  let orig = src, n = 0;
  for (const [s, r] of PAIRS) {
    if (src.includes(s)) { const before = src; src = src.split(s).join(r); n += (before.length !== src.length) ? (before.split(s).length - 1) : 0; }
  }
  if (src !== orig) { writeFileSync(f, src, "utf8"); totalFiles++; totalReplacements += n; console.log(`  ${rel}: ${n}`); }
}
console.log(`\nChanged ${totalFiles} files, ${totalReplacements} replacements.`);

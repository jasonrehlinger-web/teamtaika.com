// tools/fix-eo13166-residuals.mjs — second pass, the residual "13166" mentions
// the bulk pass didn't cover: comp-badge/tag chips, index.html topic lists, and
// the dedicated EO 13166 FAQ in compliance-faq.html (reframed to past tense +
// the 2025 revocation, with Title VI carried forward as the binding authority).
import { readFileSync, writeFileSync } from "node:fs";

// Global chip swap — the "EO 13166" badge/tag implies a current-law obligation
// we help you meet; the EO is revoked, so relabel to the durable topic.
const GLOBAL = [
  ['<span class="comp-badge">EO 13166</span>', '<span class="comp-badge">Language Access</span>'],
  ['<span class="tag tag-gold">EO 13166</span>', '<span class="tag tag-gold">Language Access</span>'],
];

// Per-file precise reframes (single-line substrings; CRLF-safe).
const PER_FILE = {
  "index.html": [
    ["Title VI, EO 13166, Section 508. GSA and NASPO contracts.",
     "Title VI, Section 508. GSA and NASPO contracts."],
    ["covering Title VI, EO 13166, Section 508, ADA Title II, WCAG 2.1/2.2, HIPAA, FERPA, and IDEA",
     "covering Title VI, Section 508, ADA Title II, WCAG 2.1/2.2, HIPAA, FERPA, and IDEA"],
  ],
  "pages/resources/compliance-faq.html": [
    // section comment
    ["<!-- TITLE VI & EO 13166 -->", "<!-- TITLE VI & LANGUAGE ACCESS -->"],
    // JSON-LD question name
    ['"name":"What is Executive Order 13166 and who does it apply to?"',
     '"name":"What was Executive Order 13166, and does it still apply?"'],
    // JSON-LD answer — past tense + revocation + Title VI carries forward
    ['"text":"Executive Order 13166, signed in 2000, requires all federal agencies to examine the services they provide, identify any need for services to LEP persons, and develop and implement a system to provide those services. It also requires federal agencies to work with federally assisted programs and contractors to ensure meaningful language access for LEP individuals."',
     '"text":"Executive Order 13166, signed in 2000, directed federal agencies to examine their services, identify the needs of LEP persons, and implement a system to provide meaningful language access — and to ensure federally assisted programs and contractors did the same. EO 13166 was revoked on March 1, 2025 by Executive Order 14224. The underlying statutory obligation did not change: Title VI of the Civil Rights Act (42 U.S.C. 2000d) still prohibits national-origin discrimination and requires recipients of federal funding to provide meaningful language access to LEP individuals."'],
    // visible question button
    ['What is Executive Order 13166 and who does it apply to?<span class="faq-icon">+</span>',
     'What was Executive Order 13166, and does it still apply?<span class="faq-icon">+</span>'],
    // visible answer — past tense + revocation + Title VI / Section 1557 carry forward
    ['Executive Order 13166, "Improving Access to Services for Persons with Limited English Proficiency," was signed by President Clinton in August 2000. It requires all federal agencies to develop and implement a system to provide meaningful language access to LEP individuals. It also requires federal agencies to extend those same obligations to entities that receive federal financial assistance — including state agencies, school districts, healthcare providers, courts, and nonprofits that operate with federal grant funding.',
     'Executive Order 13166, "Improving Access to Services for Persons with Limited English Proficiency," was signed by President Clinton in August 2000. It directed all federal agencies to develop and implement a system to provide meaningful language access to LEP individuals, and to extend those obligations to entities that receive federal financial assistance — state agencies, school districts, healthcare providers, courts, and nonprofits that operate with federal grant funding. <strong>EO 13166 was revoked on March 1, 2025 by Executive Order 14224.</strong> The statutory foundation is unchanged: Title VI of the Civil Rights Act still prohibits national-origin discrimination and requires federally funded programs to provide meaningful language access, and Section 1557 of the ACA continues to impose language-access duties on health programs.'],
    // Language Access Plan answer
    ["Federal agencies are required to have one under EO 13166.",
     "Federal agencies were directed to maintain one under EO 13166 (revoked in 2025), and Title VI's language-access duties still make a LAP the clearest evidence of good-faith compliance."],
  ],
};

const files = ["index.html", "pages/resources/compliance-faq.html",
  "pages/industries/government.html", "pages/industries/nonprofits.html",
  "pages/services/elearning-localization.html"];

let totalFiles = 0, totalRepl = 0;
for (const f of files) {
  let src = readFileSync(f, "utf8");
  const orig = src;
  let n = 0;
  const pairs = [...GLOBAL, ...(PER_FILE[f] || [])];
  for (const [s, r] of pairs) {
    if (src.includes(s)) { const b = src; src = src.split(s).join(r); n += b.split(s).length - 1; }
  }
  if (src !== orig) { writeFileSync(f, src, "utf8"); totalFiles++; totalRepl += n; console.log(`  ${f}: ${n}`); }
}
console.log(`\nChanged ${totalFiles} files, ${totalRepl} replacements.`);

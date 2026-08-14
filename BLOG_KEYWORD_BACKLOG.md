# teamtaika.com — Blog Keyword Backlog

Queue for the `teamtaika-autoblog` scheduled task (Tue + Fri). The task takes the **first unchecked topic**, publishes it, then moves it to Published. When fewer than 4 unchecked topics remain, the task appends 4 freshly researched ones before proceeding.

## Targeting priorities (set by Jason, 2026-08-04)

**Services, in order:** 1) Certified translation · 2) Interpretation (OPI/VRI) · 3) ADA / Section 508
**Audiences, in order:** 1) School districts · 2) Healthcare · 3) Nonprofits

Government agencies remain the best-covered audience already (3 posts) — deliberately *not* a priority for new content. Keep the queue interleaved so it never ships three posts for the same audience in a row.

## Hard rules for anything added here

- **No prices.** Never quote a dollar figure or rate. Say "request a quote" and link the quote form. (Existing older posts do quote rates; new posts do not.)
- **Distinct primary keyword.** Every topic must target a primary keyword that is not already the primary keyword of a live post. Check `pages/resources/blog/` before adding.
- **Verified facts only.** Accurate statutory citations, no invented statistics, no fabricated case names.
- **Compliance dates** live in `data/compliance-deadlines.json` ONLY — that file is the single source of truth and `build.py` substitutes the `{{TOKEN}}`s at deploy. **Never hardcode a date in HTML; always emit the token.** Current values: ADA Title II WCAG 2.1 AA `{{ADA_DEADLINE_LARGE}}` April 26, 2027 (≥50,000 pop.) / `{{ADA_DEADLINE_SMALL}}` April 26, 2028 (smaller + special districts); Healthcare Section 504: `{{SEC504_DEADLINE}}` May 11, 2027 / `{{SEC504_DEADLINE_SMALL}}` May 10, 2028. All still UPCOMING — frame as “get ahead of the deadline”. If research conflicts with the JSON, do not assert a date: emit the token and flag it in the run report.
- **Credential claims** may only include what already appears on teamtaika.com pages (GSA, NASPO, VOSB, SAM, ATA-certified linguists). Do not claim GSA coverage for AI automation.

---

## Queue

- [x] **1. `iep-meeting-interpreter-requirements`** — *Do Schools Have to Provide an Interpreter at IEP Meetings?*
  Keyword: `IEP meeting interpreter requirements`. Schools × Interpretation — top service + top audience.
  Evidence: IDEA requires the district to take whatever action is necessary for the parent to understand IEP proceedings, including arranging an interpreter. ED/OCR guidance: districts may not rely on students, siblings, friends, or untrained staff, and it is not sufficient for staff merely to be bilingual. Obligation extends beyond the IEP meeting to parent-teacher conferences, suspension meetings, meetings with the nurse, mediation, and due process hearings. Interpreter should be impartial and not a member of the IEP team.
  Category: `compliance` · CTA: `/pages/services/interpretation.html` · Links: `/pages/industries/schools.html`, `/blog/school-document-translation-lep-parents`

- [x] **2. `section-1557-qualified-interpreter`** — *Section 1557: What Actually Counts as a Qualified Interpreter*
  Keyword: `Section 1557 qualified interpreter`. Healthcare × Interpretation.
  Evidence: The 2024 Section 1557 final rule (effective July 2024, HHS guidance clarified December 2024) defines qualified interpreter competencies — proficiency, ability to interpret effectively/accurately/impartially including specialized vocabulary, while retaining tone and sentiment, plus confidentiality. Covered entities must post an annual Notice of Nondiscrimination and a Notice of Availability of language assistance, in English plus at least the 15 most common LEP languages in the states where they operate. Taglines were established in 2016, eliminated in 2020, and reinstated in 2024.
  Category: `healthcare` · CTA: `/pages/services/interpretation.html` · Links: `/pages/industries/healthcare.html`, `/blog/joint-commission-2026-language-access`

- [x] **3. `school-website-accessibility-ada-title-ii`** — *K-12 Website Accessibility: What the ADA Title II Deadline Means for Your District*
  Keyword: `school website accessibility ADA Title II`. Schools × ADA/508. Deadline-driven urgency.
  Evidence: DOJ 2024 final rule sets WCAG 2.1 Level AA; deadlines April 26, 2027 (≥50,000 pop.) and April 26, 2028 (smaller districts / special districts). Scope is not just the main site — it reaches the full range of public digital content, **including third-party vendor tools** (student platforms, payment systems, parent apps) the district contracts for. Exceptions include archived content not in active use, password-protected documents, and pre-deadline social posts.
  Category: `accessibility` · CTA: `/pages/services/508-compliance.html` · Links: `/pages/industries/schools.html`, `/blog/wcag-ada-compliance-tips`

- [ ] **4. `bilingual-staff-are-not-interpreters`** — *Why Your Bilingual Staff Are Not Interpreters (and What That Exposes You To)*
  Keyword: `bilingual staff vs professional interpreter`. All three audiences × Interpretation. Strong villain framing; the single most common cost-cutting mistake.
  Evidence: Federal and state education guidance states plainly that it is not sufficient for staff merely to be bilingual, and that districts may not use students or untrained staff. Section 1557 sets an explicit qualified-interpreter standard for health programs. Cover the competence gap (specialized terminology, impartiality, confidentiality, role confusion) and the liability that follows.
  Category: `interpretation` · CTA: `/pages/services/interpretation.html` · Links: `/blog/opi-vri-guide`, `/blog/translation-vs-interpretation`

- [ ] **5. `nonprofit-website-accessibility-requirements`** — *Is Your Nonprofit's Website Legally Required to Be Accessible?*
  Keyword: `nonprofit website accessibility requirements`. Nonprofits × ADA/508. Zero existing nonprofit coverage.
  Evidence: ADA Title III reaches most 501(c)(3) organizations as places of public accommodation, and that mandate applies regardless of staff size. Section 504 separately attaches to any organization receiving federal financial assistance, so a nonprofit can be covered by Title III alone or by both. DOJ enforces using WCAG 2.1 Level AA as the baseline. An inaccessible site that blocks program access can put federal grants at risk.
  Category: `accessibility` · CTA: `/pages/services/508-compliance.html` · Links: `/pages/industries/nonprofits.html`, `/blog/pdf-remediation-guide`

- [ ] **6. `section-504-healthcare-digital-accessibility`** — *Section 504 Digital Accessibility for Healthcare: Websites, Patient Portals, and Vendor Tools*
  Keyword: `Section 504 healthcare digital accessibility`. Healthcare × ADA/508.
  Evidence: HHS Section 504 final rule (effective July 8, 2024) requires covered digital properties to meet WCAG 2.1 Level A and AA — institutional websites, patient portals, intranet resources, mobile apps, kiosks, and third-party tools. Non-discrimination obligations applied from the effective date forward, so OCR enforcement authority predates the technical deadline and documented good-faith progress matters.
  **✓ RESOLVED 2026-08-14:** the conflict is settled — HHS extended the Section 504 date by one year via a May 2026 interim final rule, and `data/compliance-deadlines.json` now carries `SEC504_DEADLINE` = May 11, 2027 and `SEC504_DEADLINE_SMALL` = May 10, 2028. Emit the tokens, never the literal dates. Do not re-litigate this.
  Category: `healthcare` · CTA: `/pages/services/508-compliance.html` · Links: `/pages/industries/healthcare.html`, `/blog/pdf-remediation-guide`

- [ ] **7. `nonprofit-language-access-federal-funding`** — *Language Access for Nonprofits: What Accepting Federal Funding Actually Obligates You To Do*
  Keyword: `nonprofit language access requirements`. Nonprofits × Certified translation.
  Evidence: Title VI obligations attach to *recipients* of federal financial assistance, not only to government agencies — so subgrantees and pass-through recipients are covered, frequently without knowing it. Section 504 attaches the same way. HHS maintains the canonical Title VI guidance for federal financial assistance recipients.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/pages/industries/nonprofits.html`, `/blog/title-vi-language-access-plan`

- [ ] **8. `school-enrollment-document-translation`** — *Translating Enrollment, Immunization, and Residency Documents for School Registration*
  Keyword: `school enrollment document translation`. Schools × Certified translation. Seasonal fit (registration cycles).
  Evidence: Districts must provide vital documents in languages parents understand under Title VI; families frequently need certified translations of foreign birth records, immunization records, and prior transcripts to register. Distinguish what the *district* must translate from what the *family* needs certified.
  Category: `translation` · CTA: `/pages/services/translation.html` · Links: `/pages/industries/schools.html`, `/blog/what-is-certified-translation`

- [ ] **9. `accessible-school-documents-section-508`** — *Making District Documents Accessible: Handbooks, Report Cards, and Enrollment Forms*
  Keyword: `accessible school documents Section 508`. Schools × ADA/508.
  Evidence: ADA Title II covers documents published to the public, not just web pages. Tagging, reading order, and alt text cannot be automated. Where documents are also translated, accessibility work must be redone per language.
  Category: `accessibility` · CTA: `/pages/services/508-compliance.html` · Links: `/blog/pdf-remediation-guide`, `/pages/services/pdf-accessibility-checker.html`

- [ ] **10. `medical-records-translation-requirements`** — *Medical Records Translation: What Providers and Patients Each Need*
  Keyword: `medical records translation requirements`. Healthcare × Certified translation.
  Evidence: Build on the existing HIPAA/BAA post rather than repeating it — focus on document types, certification for continuity-of-care and legal use, and terminology risk. Must not duplicate `hipaa-compliant-medical-translation`'s primary keyword.
  Category: `healthcare` · CTA: `/pages/services/translation.html` · Links: `/blog/hipaa-compliant-medical-translation`, `/pages/industries/healthcare.html`

- [ ] **11. `choosing-interpretation-modality`** — *On-Site, Phone, or Video: Choosing the Right Interpretation for Each Situation*
  Keyword: `on-site vs remote interpretation`. Interpretation, cross-audience.
  Note: must stay clearly distinct from `opi-vri-guide` (which compares OPI vs VRI only) by adding on-site/in-person and building a situation-to-modality decision table.
  Category: `interpretation` · CTA: `/pages/services/interpretation.html` · Links: `/blog/opi-vri-guide`, `/pages/services/conference-interpretation.html`

- [ ] **12. `hospital-after-hours-interpretation`** — *After-Hours and Emergency Interpretation: Covering the 3 a.m. Language Gap*
  Keyword: `24/7 hospital interpretation services`. Healthcare × Interpretation.
  Evidence: Section 1557 and Joint Commission obligations do not pause overnight; emergency departments and on-call services are where language access most often fails. Focus on coverage models and documentation.
  Category: `healthcare` · CTA: `/pages/services/interpretation.html` · Links: `/blog/joint-commission-2026-language-access`, `/blog/opi-vri-guide`

- [ ] **13. `nonprofit-translated-program-materials`** — *Translating Program Materials Nonprofits Actually Get Audited On*
  Keyword: `nonprofit document translation services`. Nonprofits × Certified translation.
  Evidence: Intake forms, eligibility notices, consent forms, and outreach materials are the documents that show up in grant monitoring. Tie to the four-factor analysis already covered in the Title VI post without repeating it.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/pages/industries/nonprofits.html`, `/blog/translation-for-government`

- [ ] **14. `school-district-language-access-plan`** — *Building a Language Access Plan for a School District*
  Keyword: `school district language access plan`. Schools × Compliance.
  Note: `title-vi-language-access-plan` already owns the generic term. This must be district-specific — enrollment cycles, IEP/special-ed workflows, student-information-system notices, staff training — or it will cannibalize. If a distinct angle can't be sustained, drop it and take the next topic.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/blog/title-vi-language-access-plan`, `/pages/industries/schools.html`

- [ ] **15. `court-interpreter-requirements-lep`** — *Court Interpreter Requirements: What Courts Owe Limited-English-Proficient Parties*
  Keyword: `court interpreter requirements`. Legal × Interpretation. Off-priority audience but strong sources and fills the thinnest category (Legal, 1 post).
  Evidence: 28 U.S.C. §1827; DOJ Title VI guidance to state courts; Brennan Center *Language Access in State Courts* (46% of states don't require interpreters in all civil cases; 80% don't guarantee the court pays; 37% don't require credentialed interpreters even when available); 40+ states participate in the state-court interpreter certification consortium.
  Category: `legal` · CTA: `/pages/services/interpretation.html` · Links: `/pages/industries/legal.html`, `/blog/translation-for-legal-documents-law-firms`

- [ ] **16. `section-203-bilingual-election-materials`** — *Section 203 Bilingual Election Requirements: What Covered Jurisdictions Must Translate*
  Keyword: `Section 203 Voting Rights Act language assistance`. Government × Certified translation. Off-priority audience, but time-sensitive.
  Evidence: 52 U.S.C. §10503 requires covered jurisdictions to provide election materials — ballots, sample ballots, voter information — plus oral assistance, in the covered language. Census Bureau determinations publish every five years; the next revised list is due December 2026, so current determinations govern the 2026 midterms. Coverage triggers above 10,000 or 5% of voting-age citizens in a single language minority group with depressed literacy rates.
  **Timing:** only worth publishing before November 2026. After that, deprioritize until the December 2026 determinations land.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/pages/industries/government.html`, `/blog/title-vi-language-access-plan`

---

## Published

_(The task appends here: `- [x] <slug> — published YYYY-MM-DD → /blog/<slug>`)_

- [x] iep-meeting-interpreter-requirements — published 2026-08-07 → /blog/iep-meeting-interpreter-requirements
- [x] section-1557-qualified-interpreter — published 2026-08-11 → /blog/section-1557-qualified-interpreter
- [x] school-website-accessibility-ada-title-ii — published 2026-08-14 → /blog/school-website-accessibility-ada-title-ii

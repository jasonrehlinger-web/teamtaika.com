# teamtaika.com — Blog Keyword Backlog

Queue for the `teamtaika-autoblog` scheduled task (Tue + Fri). The task takes the **first unchecked topic**, publishes it, then moves it to Published. When fewer than 6 unchecked topics remain, the task researches and appends 6 fresh ones before proceeding.

## Strategy (revised 2026-08-14 on Jason's direction: "drive clients and sales consistently")

The queue runs **two interleaved lanes**. Alternate between them — never ship two from the same lane back to back, and never three posts for the same audience in a row.

**Lane A — Compliance/urgency (demand capture).** Buyers searching a statute or a deadline are already worried and already shopping. These follow the audience priorities Jason set 2026-08-04, still in force: 1) school districts · 2) healthcare · 3) nonprofits. Government is deliberately deprioritized — it is already the best-covered audience.

**Lane B — Product/commercial intent (revenue capture).** Added 2026-08-14. These target the *services Taika actually sells* that had zero blog coverage, and they skew bottom-of-funnel: procurement mechanics, vendor-selection criteria, regulated-industry requirements. Highest contract value sits in life sciences (clinical trials, medical devices), enterprise localization, and GSA/NASPO procurement — one won contract there outweighs many one-off certified-translation orders.

**Service priority within Lane B:** 1) regulated life sciences · 2) enterprise & website/eLearning localization · 3) government procurement vehicles · 4) interpretation at scale · 5) everything else in `pages/services/`.

## Hard rules for anything added here

- **No prices.** Never quote a dollar figure or rate. Say "request a quote" and link the quote form. (Some pre-2026-07 posts do quote rates; new posts never do.)
- **Distinct primary keyword.** Every topic must target a primary keyword that is not already the primary keyword of a live post. Check `pages/resources/blog/` before adding.
- **Every topic names a real service page as its CTA.** No topic ships pointing at a generic contact form when a matching product page exists in `pages/services/` or `pages/industries/`. Traffic that cannot buy is wasted.
- **Verified facts only.** Accurate statutory citations, no invented statistics, no fabricated case names. Prefer `.gov`, standards bodies, and primary regulation text over vendor blogs — vendor blogs in this vertical frequently miscite (see topic 4).
- **Compliance dates** live in `data/compliance-deadlines.json` ONLY — that file is the single source of truth and `build.py` substitutes the `{{TOKEN}}`s at deploy. **Never hardcode a date in HTML; always emit the token.** Current values: ADA Title II WCAG 2.1 AA `{{ADA_DEADLINE_LARGE}}` April 26, 2027 (≥50,000 pop.) / `{{ADA_DEADLINE_SMALL}}` April 26, 2028 (smaller + special districts); Healthcare Section 504: `{{SEC504_DEADLINE}}` May 11, 2027 / `{{SEC504_DEADLINE_SMALL}}` May 10, 2028. All still UPCOMING — frame as "get ahead of the deadline". If research conflicts with the JSON, do not assert a date: emit the token and flag it in the run report.
- **Credential claims** may only include what already appears on teamtaika.com pages (GSA, NASPO, VOSB, SAM, ATA-certified linguists). Do not claim GSA coverage for AI automation.
- **Never promise an outcome** — no guaranteed approvals, clearances, admissions, or accreditation results. Quality guarantees attach to the translation or accessibility work itself.

---

## Queue

- [x] **1. `iep-meeting-interpreter-requirements`** — *Do Schools Have to Provide an Interpreter at IEP Meetings?*
  Keyword: `IEP meeting interpreter requirements`. Lane A · Schools × Interpretation.
  Category: `compliance` · CTA: `/pages/services/interpretation.html`

- [x] **2. `section-1557-qualified-interpreter`** — *Section 1557: What Actually Counts as a Qualified Interpreter*
  Keyword: `Section 1557 qualified interpreter`. Lane A · Healthcare × Interpretation.
  Category: `healthcare` · CTA: `/pages/services/interpretation.html`

- [x] **3. `school-website-accessibility-ada-title-ii`** — *K-12 Website Accessibility: What the ADA Title II Deadline Means for Your District*
  Keyword: `school website accessibility ADA Title II`. Lane A · Schools × ADA/508.
  Category: `accessibility` · CTA: `/pages/services/508-compliance.html`

- [x] **4. `medical-device-ifu-translation-eu-mdr`** — *EU MDR Translation Requirements for IFUs, Labels, and Implant Cards*
  Keyword: `EU MDR translation requirements`. **Lane B · Life sciences — highest contract value in the queue.**
  Evidence: Regulation (EU) 2017/745. **Article 10(11) is the correct citation** for accompanying information in the language(s) accepted by the member state where the device is placed on market; Annex I §23 governs label and IFU content. **Many competitor articles miscite "Article 41" — Article 41 sits in Chapter IV and concerns Notified Body designation documents, nothing to do with IFU language.** Getting this right is a credibility differentiator; say so plainly. Language requirements vary by state (Belgium: French/Dutch/German; Finland: Finnish/Swedish). **CORRECTION 2026-08-18:** this note previously listed Luxembourg as French/German/**Luxembourgish** — wrong for MDR purposes. Article 10(11) requires an *official Union language* determined by the member state, and Luxembourgish is not one of the 24 official EU languages (Regulation No 1/1958 as amended), so it cannot be demanded under 10(11). Many vendor tables make this same error by reaching for national languages instead of the Union set. Do not reuse the old figure in a future life-sciences topic. ISO 15223-1:2021 symbols can replace text on many label elements but there is no symbol shortcut for IFU narrative. Verify all of this against the regulation text before publishing.
  Category: `translation` · CTA: `/pages/industries/medical-device-translation.html` · Links: `/pages/industries/life-sciences-translation.html`, `/pages/services/desktop-publishing.html`

- [x] **5. `bilingual-staff-are-not-interpreters`** — *Why Your Bilingual Staff Are Not Interpreters (and What That Exposes You To)*
  Keyword: `bilingual staff vs professional interpreter`. Lane A · all three audiences × Interpretation. Strong villain framing; the most common cost-cutting mistake.
  Evidence: Federal and state education guidance states plainly that it is not sufficient for staff merely to be bilingual, and that districts may not use students or untrained staff. Section 1557 sets an explicit qualified-interpreter standard for health programs. Cover the competence gap (specialized terminology, impartiality, confidentiality, role confusion) and the liability that follows.
  Category: `interpretation` · CTA: `/pages/services/interpretation.html` · Links: `/blog/opi-vri-guide`, `/blog/translation-vs-interpretation`

- [ ] **6. `informed-consent-form-translation-requirements`** — *Informed Consent Form Translation: What IRBs and the FDA Actually Require*
  Keyword: `informed consent form translation requirements`. **Lane B · Clinical trials — high value, recurring revenue.**
  Evidence: 21 CFR 50.20 requires information in a language understandable to the subject; 50.25 and 50.27 govern required elements and documentation. ICH E6(R3) addresses appropriateness of translation method for the population. Short-form consent plus interpreter is a recognized path for unanticipated LEP enrollment. Back-translation and reconciliation are how sponsors evidence understandability; weak translation is a documented cause of IRB deferral and re-consent. Do NOT promise IRB approval — position on defensible process and documentation.
  Category: `healthcare` · CTA: `/pages/industries/clinical-trial-translation.html` · Links: `/pages/industries/life-sciences-translation.html`, `/pages/services/translation.html`

- [ ] **7. `nonprofit-website-accessibility-requirements`** — *Is Your Nonprofit's Website Legally Required to Be Accessible?*
  Keyword: `nonprofit website accessibility requirements`. Lane A · Nonprofits × ADA/508. Zero existing nonprofit coverage.
  Evidence: ADA Title III reaches most 501(c)(3) organizations as places of public accommodation, regardless of staff size. Section 504 separately attaches to any organization receiving federal financial assistance. DOJ enforces using WCAG 2.1 Level AA as the baseline. An inaccessible site that blocks program access can put federal grants at risk.
  Category: `accessibility` · CTA: `/pages/services/508-compliance.html` · Links: `/pages/industries/nonprofits.html`, `/blog/pdf-remediation-guide`

- [ ] **8. `gsa-schedule-translation-services-buying`** — *How to Buy Translation Services Off a GSA Schedule (Without Running a Full RFP)*
  Keyword: `GSA schedule translation services`. **Lane B · Procurement — how public buyers actually transact.**
  Evidence: GSA Multiple Award Schedule mechanics — ordering procedures, competition requirements for schedule buys, why a schedule contract shortens the acquisition timeline versus an open-market solicitation, micro-purchase and simplified-acquisition thresholds, and how NASPO ValuePoint serves state/local buyers. Verify current threshold figures against acquisition.gov / GSA before asserting numbers. Taika holds GSA + NASPO + SAM + VOSB — name them, since VOSB can support small-business goaling.
  Category: `compliance` · CTA: `/pages/services/gsa-translation-services.html` · Links: `/pages/industries/government.html`, `/blog/translation-for-government`

- [ ] **9. `school-enrollment-document-translation`** — *Translating Enrollment, Immunization, and Residency Documents for School Registration*
  Keyword: `school enrollment document translation`. Lane A · Schools × Certified translation. Seasonal fit (registration cycles).
  Evidence: Districts must provide vital documents in languages parents understand under Title VI; families frequently need certified translations of foreign birth records, immunization records, and prior transcripts to register. Distinguish what the *district* must translate from what the *family* needs certified.
  Category: `translation` · CTA: `/pages/services/translation.html` · Links: `/pages/industries/schools.html`, `/blog/what-is-certified-translation`

- [ ] **10. `website-localization-vs-translation`** — *Website Localization vs. Website Translation: What Actually Has to Change*
  Keyword: `website localization process`. **Lane B · Enterprise.**
  Evidence: Separate translation of strings from locale adaptation — date/number/currency formats, address and name fields, form validation, text expansion breaking layouts, RTL mirroring, locale-specific imagery and legal copy, `hreflang` and canonical handling for multilingual SEO, and CMS/TMS integration versus manual page duplication. Tie the accessibility angle in: a translated page still has to meet WCAG per language, and remediation does not carry over.
  Category: `translation` · CTA: `/pages/services/website-localization.html` · Links: `/pages/services/website-translation.html`, `/pages/services/508-compliance.html`

- [ ] **11. `section-504-healthcare-digital-accessibility`** — *Section 504 Digital Accessibility for Healthcare: Websites, Patient Portals, and Vendor Tools*
  Keyword: `Section 504 healthcare digital accessibility`. Lane A · Healthcare × ADA/508.
  Evidence: HHS Section 504 final rule (effective July 8, 2024) requires covered digital properties to meet WCAG 2.1 Level A and AA — institutional websites, patient portals, intranet resources, mobile apps, kiosks, and third-party tools. Non-discrimination obligations applied from the effective date forward, so OCR enforcement authority predates the technical deadline and documented good-faith progress matters.
  **✓ Date conflict RESOLVED 2026-08-14:** verified against hhs.gov — the May 2026 HHS interim final rule sets `SEC504_DEADLINE` May 11, 2027 (15+ employees) and `SEC504_DEADLINE_SMALL` May 10, 2028 (under 15), matching `data/compliance-deadlines.json`. Emit the tokens, never literal dates. Do not re-litigate.
  Category: `healthcare` · CTA: `/pages/services/508-compliance.html` · Links: `/pages/industries/healthcare.html`, `/blog/pdf-remediation-guide`

- [ ] **12. `machine-translation-post-editing-when-to-use`** — *When Machine Translation Post-Editing Is Appropriate — and When It Is Malpractice*
  Keyword: `machine translation post-editing vs human translation`. **Lane B · Buyers are already asking this; owning the honest answer wins trust.**
  Evidence: ISO 18587 defines post-editing of machine translation output and distinguishes light from full post-editing. Map content types to appropriate process: high-volume internal or low-risk content suits MTPE; certified, legal, clinical, safety, and IFU content does not. Be candid that raw MT fails certification requirements and that a certification statement affixed to MT output is a misrepresentation. Ties to the existing Google Translate post without repeating it.
  Category: `translation` · CTA: `/pages/services/machine-translation-post-editing.html` · Links: `/blog/google-translate-official-documents`, `/pages/services/managed-translation-services.html`

- [ ] **13. `accessible-school-documents-section-508`** — *Making District Documents Accessible: Handbooks, Report Cards, and Enrollment Forms*
  Keyword: `accessible school documents Section 508`. Lane A · Schools × ADA/508.
  Evidence: ADA Title II covers documents published to the public, not just web pages. Tagging, reading order, and alt text cannot be automated. Where documents are also translated, accessibility work must be redone per language.
  Category: `accessibility` · CTA: `/pages/services/508-compliance.html` · Links: `/blog/pdf-remediation-guide`, `/pages/services/pdf-accessibility-checker.html`

- [ ] **14. `elearning-localization-requirements`** — *Localizing eLearning: Audio, On-Screen Text, Assessments, and SCORM Packages*
  Keyword: `eLearning localization services`. **Lane B · Enterprise + schools overlap.**
  Evidence: Scope beyond slide text — voiceover versus subtitling decisions, on-screen text baked into graphics, quiz and assessment localization, variable-length audio against fixed animation timing, SCORM/xAPI package re-publishing, and LMS locale handling. Accessibility overlap: captions and transcripts per language, and WCAG conformance inside the course player.
  Category: `translation` · CTA: `/pages/services/elearning-localization.html` · Links: `/pages/services/captioning.html`, `/pages/services/transcription.html`

- [ ] **15. `hospital-after-hours-interpretation`** — *After-Hours and Emergency Interpretation: Covering the 3 a.m. Language Gap*
  Keyword: `24/7 hospital interpretation services`. Lane A · Healthcare × Interpretation.
  Evidence: Section 1557 and Joint Commission obligations do not pause overnight; emergency departments and on-call services are where language access most often fails. Focus on coverage models, escalation paths, and documentation.
  Category: `healthcare` · CTA: `/pages/services/interpretation.html` · Links: `/blog/joint-commission-2026-language-access`, `/blog/opi-vri-guide`

- [ ] **16. `translation-vendor-selection-criteria`** — *How to Evaluate a Translation Vendor: The Criteria That Actually Predict Quality*
  Keyword: `how to choose a translation services vendor`. **Lane B · Pure bottom-of-funnel; captures comparison shoppers.**
  Evidence: ISO 17100 requirements for translator competence and the revision step; ISO 18587 for MTPE; what ATA certification does and does not cover; why "certified agency" is not a defined term while "certified translation" is; security and confidentiality posture (BAA availability, data residency, subcontractor disclosure); SLA and turnaround structure; and the specific questions that expose a broker reselling to the lowest bidder. Include a buyer's checklist table.
  Category: `translation` · CTA: `/index.html#quote` · Links: `/pages/services/managed-translation-services.html`, `/blog/what-is-certified-translation`

- [ ] **17. `nonprofit-language-access-federal-funding`** — *Language Access for Nonprofits: What Accepting Federal Funding Actually Obligates You To Do*
  Keyword: `nonprofit language access requirements`. Lane A · Nonprofits × Certified translation.
  Evidence: Title VI obligations attach to *recipients* of federal financial assistance, not only to government agencies — so subgrantees and pass-through recipients are covered, frequently without knowing it. Section 504 attaches the same way. HHS maintains the canonical Title VI guidance for federal financial assistance recipients.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/pages/industries/nonprofits.html`, `/blog/title-vi-language-access-plan`

- [ ] **18. `hipaa-translation-vendor-baa-requirements`** — *Does Your Translation Vendor Need a BAA? HIPAA Requirements for Language Services*
  Keyword: `HIPAA compliant translation services vendor`. **Lane B · Healthcare procurement.**
  Note: must NOT duplicate `hipaa-compliant-medical-translation`'s primary keyword. That post covers the compliance concept; this one is a **vendor-procurement** piece — when a translation or interpretation provider is a business associate, what the BAA must cover, subcontractor flow-down, minimum-necessary applied to source documents, secure transmission and retention, and interpreter confidentiality. Frame as questions to put to a vendor.
  Category: `healthcare` · CTA: `/pages/services/hipaa-compliant-translation.html` · Links: `/blog/hipaa-compliant-medical-translation`, `/pages/industries/healthcare.html`

- [ ] **19. `choosing-interpretation-modality`** — *On-Site, Phone, or Video: Choosing the Right Interpretation for Each Situation*
  Keyword: `on-site vs remote interpretation`. Lane A · Interpretation, cross-audience.
  Note: must stay clearly distinct from `opi-vri-guide` (which compares OPI vs VRI only) by adding on-site/in-person and building a situation-to-modality decision table.
  Category: `interpretation` · CTA: `/pages/services/interpretation.html` · Links: `/blog/opi-vri-guide`, `/pages/services/conference-interpretation.html`

- [ ] **20. `enterprise-localization-program-build`** — *Standing Up an Enterprise Localization Program: Governance, Terminology, and Throughput*
  Keyword: `enterprise localization services`. **Lane B · Largest deal size; targets a program owner, not a one-off buyer.**
  Evidence: Move the reader from ad-hoc purchasing to a managed program — centralized intake, translation memory and terminology ownership (and why the client should own the TM, not the vendor), style guides, in-country review workflows, quality metrics, and vendor consolidation across translation, interpretation, captioning, and accessibility. Emphasize single-vendor coverage across all of Taika's lines plus contract vehicles procurement already recognizes.
  Category: `translation` · CTA: `/pages/services/enterprise-localization-services.html` · Links: `/pages/services/managed-translation-services.html`, `/pages/services/508-compliance.html`

- [ ] **21. `school-district-language-access-plan`** — *Building a Language Access Plan for a School District*
  Keyword: `school district language access plan`. Lane A · Schools × Compliance.
  Note: `title-vi-language-access-plan` already owns the generic term. This must be district-specific — enrollment cycles, IEP/special-ed workflows, student-information-system notices, staff training — or it will cannibalize. If a distinct angle cannot be sustained, drop it and take the next topic.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/blog/title-vi-language-access-plan`, `/pages/industries/schools.html`

- [ ] **22. `conference-interpretation-planning`** — *Planning Interpretation for a Conference or Public Hearing: Booths, Channels, and Headcount*
  Keyword: `conference interpretation services`. **Lane B · High per-event value.**
  Evidence: Simultaneous versus consecutive, why simultaneous requires interpreters working in pairs with rotation, ISO 2603/4043 booth standards, RSI platforms versus on-site equipment, channel planning per language, and what organizers must supply in advance (agenda, speaker materials, terminology) to get usable output. Include a planning-timeline table.
  Category: `interpretation` · CTA: `/pages/services/conference-interpretation.html` · Links: `/pages/services/interpretation.html`, `/blog/opi-vri-guide`

- [ ] **23. `medical-records-translation-requirements`** — *Medical Records Translation: What Providers and Patients Each Need*
  Keyword: `medical records translation requirements`. Lane A · Healthcare × Certified translation.
  Evidence: Build on the existing HIPAA post rather than repeating it — focus on document types, certification for continuity-of-care and legal use, and terminology risk. Must not duplicate `hipaa-compliant-medical-translation`'s primary keyword.
  Category: `healthcare` · CTA: `/pages/services/translation.html` · Links: `/blog/hipaa-compliant-medical-translation`, `/pages/industries/healthcare.html`

- [ ] **24. `multilingual-desktop-publishing-requirements`** — *Why Translated Documents Break: Multilingual Desktop Publishing Explained*
  Keyword: `multilingual desktop publishing services`. **Lane B · Attaches to nearly every translation project as add-on revenue.**
  Evidence: Text expansion and contraction by language pair, RTL layout mirroring, CJK line-breaking and font embedding, InDesign/IDML round-tripping, print-ready output versus accessible tagged PDF (and why exporting one does not give you the other), and re-tagging accessibility per language. Position DTP as the step that decides whether a correct translation is actually usable.
  Category: `translation` · CTA: `/pages/services/desktop-publishing.html` · Links: `/blog/pdf-remediation-guide`, `/pages/services/508-compliance.html`

- [ ] **25. `nonprofit-translated-program-materials`** — *Translating Program Materials Nonprofits Actually Get Audited On*
  Keyword: `nonprofit document translation services`. Lane A · Nonprofits × Certified translation.
  Evidence: Intake forms, eligibility notices, consent forms, and outreach materials are the documents that show up in grant monitoring. Tie to the four-factor analysis already covered in the Title VI post without repeating it.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/pages/industries/nonprofits.html`, `/blog/translation-for-government`

- [ ] **26. `court-interpreter-requirements-lep`** — *Court Interpreter Requirements: What Courts Owe Limited-English-Proficient Parties*
  Keyword: `court interpreter requirements`. Lane A · Legal × Interpretation. Fills the thinnest category (Legal, 1 post).
  Evidence: 28 U.S.C. §1827; DOJ Title VI guidance to state courts; Brennan Center *Language Access in State Courts*; the state-court interpreter certification consortium. Verify any statistic against the source before citing.
  Category: `legal` · CTA: `/pages/services/interpretation.html` · Links: `/pages/industries/legal.html`, `/blog/translation-for-legal-documents-law-firms`

- [ ] **27. `translation-services-rfp-scope-of-work`** — *Writing a Translation Services RFP That Gets Comparable Bids*
  Keyword: `translation services RFP scope of work`. **Lane B · Reaches the buyer at the moment the specification is written — the highest-leverage moment there is.**
  Evidence: What a scope of work must specify to make bids comparable — language pairs and volumes, certification requirements, turnaround tiers, quality standard invoked (ISO 17100 versus unspecified), revision and remedy terms, security and BAA needs, accessibility deliverables, and evaluation criteria weighting. Explain why lowest-price-technically-acceptable produces bad language outcomes and what to use instead. Offer a scope-of-work checklist.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/pages/services/gsa-translation-services.html`, `/pages/industries/government.html`

- [ ] **28. `government-bilingual-pay-differential`** — *Bilingual Pay Differentials: What They Cost and What They Do Not Solve*
  Keyword: `bilingual pay differential government`. **Lane B · Reframes an in-house alternative into a services need.**
  Evidence: How federal and state bilingual differentials are structured and tested, and the crucial limit: paying a differential certifies a proficiency level for *service delivery in the employee's own role*, not competence to interpret or translate for others. Ties directly to the bilingual-staff post — a differential does not create an interpreter. Verify any pay figures or authorities before asserting; if unverifiable, describe structure without numbers.
  Category: `compliance` · CTA: `/pages/services/government-bilingual-pay.html` · Links: `/blog/bilingual-staff-are-not-interpreters`, `/pages/services/interpretation.html`

- [ ] **29. `section-203-bilingual-election-materials`** — *Section 203 Bilingual Election Requirements: What Covered Jurisdictions Must Translate*
  Keyword: `Section 203 Voting Rights Act language assistance`. Lane A · Government × Certified translation.
  Evidence: 52 U.S.C. §10503 requires covered jurisdictions to provide election materials — ballots, sample ballots, voter information — plus oral assistance, in the covered language. Census Bureau determinations publish every five years.
  **Timing:** only worth publishing before November 2026. After that, deprioritize until the December 2026 determinations land.
  Category: `compliance` · CTA: `/index.html#quote` · Links: `/pages/industries/government.html`, `/blog/title-vi-language-access-plan`

- [ ] **30. `ai-translation-quality-risk-assessment`** — *Assessing AI Translation Quality: What to Measure Before You Trust It*
  Keyword: `AI translation quality assessment`. **Lane B · Captures AI-curious buyers and routes them to a paid assessment.**
  Evidence: Practical evaluation framing — adequacy versus fluency, error typology (MQM-style categories), why BLEU-type automatic scores mislead non-specialists, sampling and human review design, domain terminology accuracy, and hallucination/omission risk in high-stakes content. **Do not claim GSA coverage for AI automation.** Route to the paid AI assessment offering rather than promising AI outcomes.
  Category: `ai` · CTA: `/pages/services/ai-assessment.html` · Links: `/pages/services/machine-translation-post-editing.html`, `/blog/ai-automation-language-access-workflows`

---

## Published

_(The task appends here: `- [x] <slug> — published YYYY-MM-DD → /blog/<slug>`)_

- [x] iep-meeting-interpreter-requirements — published 2026-08-07 → /blog/iep-meeting-interpreter-requirements
- [x] section-1557-qualified-interpreter — published 2026-08-11 → /blog/section-1557-qualified-interpreter
- [x] school-website-accessibility-ada-title-ii — published 2026-08-14 → /blog/school-website-accessibility-ada-title-ii
- [x] medical-device-ifu-translation-eu-mdr — published 2026-08-18 → /blog/medical-device-ifu-translation-eu-mdr
- [x] bilingual-staff-are-not-interpreters — published 2026-08-21 → /blog/bilingual-staff-are-not-interpreters

---

## Legacy-post modernization lane

Every run also upgrades ONE older post, taken from the top of this list. These posts already rank and draw traffic but under-convert — 17 of them have no mid-post CTA at all. Run `node tools/blog-integrity-check.mjs` for the live advisory list.

The upgrade is narrow: add a mid-post `.inline-cta` where missing, and an `.answer-box` "Quick answer" near the top where missing. Where a post has no `.post-cta` it already has an inline-styled CTA block instead — leave that alone rather than duplicating it. **Do not rewrite body copy, do not add or remove prices, and do not change the byline or dates.**

- [x] what-is-certified-translation — upgraded 2026-08-18 (.answer-box + .inline-cta added; existing inline CTA block left in place)
- [x] opi-vri-guide — upgraded 2026-08-21 (.answer-box + .inline-cta added)
- [ ] wcag-ada-compliance-tips
- [ ] pdf-remediation-guide
- [ ] translation-for-government
- [ ] title-vi-language-access-plan
- [ ] most-spoken-languages
- [ ] translation-for-legal-documents-law-firms
- [ ] joint-commission-2026-language-access
- [ ] birth-certificate-translation-uscis
- [ ] hipaa-compliant-medical-translation
- [ ] marriage-certificate-translation-uscis
- [ ] certified-translation-cost
- [ ] certified-vs-notarized-translation
- [ ] google-translate-official-documents
- [ ] divorce-decree-translation-uscis
- [ ] translation-vs-interpretation

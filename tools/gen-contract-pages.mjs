// tools/gen-contract-pages.mjs
// Generates the "Contracts We Hold" government landing pages for teamtaika.com
// from a single data array — re-skinned to teamtaika's navy/gold design system,
// wrapped in teamtaika's <!-- @nav --> / <!-- @footer --> markers (build.py
// injects those + resolves {{ADA_*}} date tokens). Canonical points to the
// taikatranslations.com originals (owner decision 2026-08-28) so the duplicate
// content does not split organic rankings.
//
// Run:  node tools/gen-contract-pages.mjs   (writes pages/government/<slug>.html)
// Facts (contract numbers, agencies, programs, sources) are ported VERBATIM
// from taikatranslations-website/src/data/contractStates.ts — do not alter.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "pages", "government");

const STATS = { languages: "300+", projects: "102,000+", linguists: "2,000+", rating: "5.0" };
const OFFICES = {
  Massachusetts: "82 Wendell Ave. STE 100, Pittsfield, MA 01201",
  California: "1401 21st St STE R, Sacramento, CA 95811",
  "Rhode Island": "700 Narragansett Park Dr STE 100, Pawtucket, RI 02861",
};

// Shared vehicle + initiative fragments (mirrors contractStates.ts constants).
const GSA = { title: "GSA Federal Supply Schedule", sub: "GSA 47QRAA18D00GT · NAICS 541930", body: "For federal offices and federally funded programs — a nationwide ordering path Taika holds as a GSA Schedule contractor." };
const NASPO_COOP = { title: "NASPO ValuePoint — Cooperative", sub: "Master Agreement 40-00000-24-00076AJ", body: "For public entities that order through NASPO ValuePoint. Because participation is confirmed per organization, we verify your exact ordering path directly rather than assume one is in place." };
const CA_LOVED = [
  { h: "Dymally-Alatorre Bilingual Services Act", p: "California requires state agencies serving substantial non-English-speaking populations to provide bilingual staff and translated materials — a landmark commitment to language access we're proud to support.", src: "California Dept. of Justice — Limited English", href: "https://oag.ca.gov/consumers/limited-english" },
  { h: "CalHHS agency-wide Language Access Policy", p: "The California Health & Human Services Agency directs each department to build a Language Access Plan so people with limited English proficiency can reach health and social services.", src: "CalHHS — Language Access Policy", href: "https://www.chhs.ca.gov/" },
];
const CA_LEP = "Nearly 44% of California households speak a language other than English, and about 19% of residents speak English less than “very well” (California Dept. of Justice) — so meaningful language access is central to serving the public.";
const RI_LOVED = [
  { h: "Rhode Island Judiciary court language-access reforms", p: "Rhode Island's courts provide free, competent interpreters in all proceedings and translate forms and website content into Spanish, Portuguese, Khmer, and Cape Verdean — reforms the U.S. DOJ recognized by closing its case.", src: "U.S. Dept. of Justice", href: "https://www.justice.gov/archives/opa/pr/justice-department-closes-case-after-rhode-island-judiciary-reforms-provide-equal-access" },
  { h: "RI Statewide Planning Limited English Proficiency Plan", p: "Rhode Island's Division of Statewide Planning provides translation and interpretation for public participation under its Limited English Proficiency plan.", src: "RI Division of Statewide Planning", href: "https://planning.ri.gov/public-participation/language-access-translation-services" },
];
const RI_LEP = "About 22% of Rhode Islanders speak a language other than English at home — most commonly Spanish and Portuguese (U.S. Census).";

const L_CA = { intro: "Spanish is by far the most-requested language, but California's courts interpret in dozens more. The languages California courts most often need include:", list: ["Spanish","Mandarin","Vietnamese","American Sign Language (ASL)","Punjabi","Cantonese","Arabic","Korean","Russian","Eastern Armenian","Farsi (Persian)","Tagalog / Filipino","Portuguese"], sourceLabel: "California Judicial Council — Language Access Metrics Report", sourceHref: "https://languageaccess.courts.ca.gov/sites/default/files/partners/default/2024-04/lap-metrics-report-2024-spring.pdf" };
const L_ID = { intro: "Idaho's Supreme Court certifies and trains court interpreters across a growing list of languages. The languages Idaho courts staff interpreters in include:", list: ["Spanish","Arabic","Bosnian / Serbian / Croatian","Cantonese","French","Haitian Creole","Hmong","Ilocano","Khmer (Cambodian)","Korean","Laotian","Mandarin","Marshallese","Polish","Portuguese","Russian","Tagalog","Turkish"], sourceLabel: "Idaho Supreme Court — Language Access Program", sourceHref: "https://isc.idaho.gov/about-the-courts/language-access" };
const L_MN = { intro: "Spanish, Somali, and Hmong are Minnesota's signature language-access needs. The languages Minnesota courts most often interpret include:", list: ["Spanish","Hmong","Somali","Russian","Vietnamese","Mandarin","French","Portuguese","Lao"], sourceLabel: "Minnesota Judicial Branch — Court Interpreter Program", sourceHref: "https://mncourts.gov/help-topics/court-interpreter-program" };
const L_MO = { intro: "Missouri's judiciary certifies and registers court interpreters across many languages, with Spanish by far the most requested. They include:", list: ["Spanish","Bosnian / Croatian / Serbian","Arabic","Mandarin Chinese","Farsi (Persian)","French","Russian","Turkish"], sourceLabel: "Missouri Courts — Foreign Language Interpreter Program", sourceHref: "https://www.courts.mo.gov/page.jsp?id=180" };
const L_NM = { intro: "New Mexico's courts served 87 languages last year. Their five most-requested — with Navajo distinctive to the state — are:", list: ["Spanish","American Sign Language (ASL)","Navajo (Diné)","Arabic","Vietnamese"], sourceLabel: "New Mexico Administrative Office of the Courts", sourceHref: "https://nmcourts.gov/wp-content/uploads/2026/02/State-courts-face-increasing-requests-for-interpreting-services-with-photos.pdf" };
const L_NV = { intro: "Nevada's courts interpreted more than 3,100 cases last year. Their most-requested languages are:", list: ["Spanish","Tagalog","Cantonese","Vietnamese"], sourceLabel: "Supreme Court of Nevada — Administrative Office of the Courts", sourceHref: "https://nvcourts.gov/aoc/aoc_news/supreme_court_of_nevada_seeks_bilingual_residents_to_meet_growing_demand_for_court_interpreters" };
const L_OK = { intro: "Oklahoma certifies court interpreters across a wide range of languages, with Marshallese distinctive to the state. They include:", list: ["Spanish","Vietnamese","Marshallese","Arabic","Mandarin Chinese","Indonesian","Romanian","Persian (Farsi)","Portuguese","American Sign Language (ASL)"], sourceLabel: "Oklahoma Bar Association — Certified Courtroom Interpreters", sourceHref: "https://www.okbar.org/barjournal/aug2019/obj9006charles/" };
const L_RI = { intro: "Rhode Island's judiciary translates court forms and provides interpreters in the state's most-needed languages:", list: ["Spanish","Portuguese","Khmer (Cambodian)","Cape Verdean Creole","Russian"], sourceLabel: "Rhode Island Judiciary — Office of Court Interpreters", sourceHref: "https://www.courts.ri.gov/programs-services/Documents/Interpreters/Interpreters_Handbook.pdf" };
const L_SD = { intro: "The languages most spoken across South Dakota — with the Dakota/Lakota (Sioux) language an official state language since 2019 — are:", list: ["Spanish","Dakota / Lakota / Nakota (Sioux)","German"], sourceLabel: "U.S. Census Bureau / American Community Survey (South Dakota)", sourceHref: "https://www.migrationpolicy.org/data/state-profiles/state/language/SD" };
const L_HISD = { intro: "Houston ISD serves roughly 70,000 English learners. Spanish is by far the largest home language; its fastest-growing home languages include:", list: ["Spanish","Arabic","Vietnamese","Mandarin","Nepali","Swahili","Urdu"], sourceLabel: "Greater Houston student home-language data (2025–26)", sourceHref: "https://communityimpact.com/new-caney-porter/education/data-see-the-most-common-languages-spoken-by-bilingual-students-in-the-greater-houston-area/" };
const L_LAUSD = { intro: "These languages are named directly in Taika's LAUSD agreement (Exhibit A, Statement of Work) — and we cover 300+ more:", list: ["Spanish","Armenian","Vietnamese","Farsi (Persian)","Korean","Arabic","Chinese","Khmer (Cambodian)","Thai","Cantonese","Punjabi","Hebrew","Japanese","Bengali","Filipino (Tagalog)","Indonesian","Urdu","Visayan (Cebuano)","Mandarin","Russian","Polish","French","Braille"], sourceLabel: "Taika's LAUSD Agreement C 10673, Exhibit A (Statement of Work)" };

export const STATES = [
  { slug: "california-language-services", name: "California", ref: "California", audience: "Any California state agency, county, city, or school district", vehicleShort: "California CMAS", contractNumber: "4-25-09-1034", agency: "California Dept. of General Services (DGS), CMAS Unit", metaDescription: "California agencies, counties, cities, and districts can order certified translation, interpretation, and Section 508/ADA services from Taika on CMAS 4-25-09-1034 and NASPO ValuePoint — no new RFP. Veteran-owned.", chips: ["California CMAS 4-25-09-1034","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: CA_LEP, languages: L_CA, officeState: "California",
    vehicles: [ { title: "California CMAS — Translation, Proofreading & Editing", sub: "CA DGS, CMAS Unit · 4-25-09-1034", body: "California Multiple Award Schedule for translation and related services, usable by California state and local agencies that order off CMAS." }, { title: "California NASPO ValuePoint Participating Addendum", sub: "CA DGS · SCO ID 77601-726995606", body: "The California participating addendum for NASPO ValuePoint remote interpreting and translating services. (See our California NASPO ValuePoint page.)" }, GSA ], loved: CA_LOVED },
  { slug: "california-naspo-valuepoint", name: "California", ref: "California", audience: "Any California public entity ordering through NASPO ValuePoint", vehicleShort: "California NASPO ValuePoint PA", contractNumber: "SCO ID 77601-726995606", agency: "State of California, Dept. of General Services (DGS)", metaDescription: "California public entities can order certified translation and interpretation from Taika on the California NASPO ValuePoint Participating Addendum (SCO 77601-726995606) — no new RFP. Veteran-owned.", chips: ["California NASPO PA","SCO 77601-726995606","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)"], lepSentence: CA_LEP, languages: L_CA, officeState: "California",
    vehicles: [ { title: "California NASPO ValuePoint Participating Addendum", sub: "CA DGS · SCO ID 77601-726995606", body: "California's participating addendum for NASPO ValuePoint remote interpreting and translating services — the cooperative path for California public entities." }, { title: "California CMAS", sub: "CA DGS, CMAS Unit · 4-25-09-1034", body: "Prefer a state schedule? Taika also holds California CMAS 4-25-09-1034. (See our California CMAS page.)" }, GSA ], loved: CA_LOVED },
  { slug: "idaho-language-services", name: "Idaho", ref: "Idaho", audience: "Idaho state agencies, school districts, and health & welfare programs", vehicleShort: "Idaho NASPO ValuePoint", contractNumber: "PADD20268972", agency: "Idaho Division of Purchasing (and Depts. of Education and Health & Welfare)", metaDescription: "Idaho agencies, school districts, and health & welfare programs can order certified translation, interpretation, and Section 508/ADA services from Taika on NASPO ValuePoint — no new RFP. Veteran-owned.", chips: ["Idaho PA PADD20268972","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: "About 1 in 10 Idahoans speaks a language other than English at home — most commonly Spanish, alongside a growing number of refugee and immigrant languages served across the state.", languages: L_ID,
    vehicles: [ { title: "Idaho Participating Addendum (NASPO ValuePoint)", sub: "Idaho Division of Purchasing · PADD20268972", body: "The statewide participating addendum for remote interpreting and translating services, usable by Idaho public entities." }, { title: "Idaho Department of Education", sub: "NASPO ValuePoint Participating Addendum", body: "A dedicated ordering path for Idaho's public schools and districts and the State Department of Education." }, { title: "Idaho Department of Health & Welfare", sub: "NASPO ValuePoint Participating Addendum", body: "A dedicated ordering path for Idaho health & welfare programs serving limited-English-proficient residents." } ],
    loved: [ { h: "Idaho Supreme Court Language Access Office", p: "Idaho's courts provide interpreters for LEP and deaf/hard-of-hearing individuals and run interpreter certification in 16 languages — a strong model for equal access to justice.", src: "Idaho Courts — Language Access", href: "https://isc.idaho.gov/about-the-courts/language-access" }, { h: "Idaho court interpreter certification & training", p: "Through its Statewide Language Access Office, Idaho certifies and trains court interpreters — with certification available in 16 languages — so limited-English and deaf/hard-of-hearing Idahoans get qualified interpreters.", src: "Idaho Courts — Language Access", href: "https://isc.idaho.gov/about-the-courts/language-access" } ] },
  { slug: "minnesota-language-services", name: "Minnesota", ref: "Minnesota", audience: "Any Minnesota state agency, county, city, or school district", vehicleShort: "Minnesota Contract 271682", contractNumber: "271682", agency: "Minnesota Office of State Procurement (OSP)", metaDescription: "Minnesota agencies, counties, cities, and districts can order certified translation, interpretation, and Section 508/ADA services from Taika on Written Language Translation Services contract 271682 — no new RFP. Veteran-owned.", chips: ["MN Contract 271682","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: "Roughly 1 in 20 Minnesotans is limited English proficient, with Spanish, Somali, and Hmong among the most common languages (Migration Policy Institute).", languages: L_MN,
    vehicles: [ { title: "Written Language Translation Services", sub: "MN Office of State Procurement · Contract 271682", body: "Minnesota's statewide written-translation contract, usable by state agencies and cooperative purchasing members." }, NASPO_COOP, GSA ],
    loved: [ { h: "Minnesota Judicial Branch Statewide Language Access Plan", p: "Minnesota replaced county-by-county plans with a single statewide plan providing free interpretation and translation to LEP and deaf/hard-of-hearing court users.", src: "Minnesota Judicial Branch", href: "https://mncourts.gov/help-topics/language-access-plans" }, { h: "Minnesota State Accessibility Standard (WCAG 2.1 AA)", p: "Minnesota IT Services requires executive-branch websites, documents, and IT to meet WCAG 2.1 AA and Section 508 — one of the clearest digital-accessibility mandates in the country.", src: "Minnesota IT Services — Accessibility", href: "https://mn.gov/mnit/government/policies/accessibility/" } ] },
  { slug: "missouri-language-services", name: "Missouri", ref: "Missouri", audience: "Any Missouri state agency, county, city, or school district", vehicleShort: "Missouri NASPO ValuePoint", contractNumber: "CS260027012", agency: "Missouri Division of Purchasing, Office of Administration", metaDescription: "Missouri agencies, counties, cities, and districts can order certified translation, interpretation, and Section 508/ADA services from Taika on NASPO ValuePoint PA CS260027012 — no new RFP. Veteran-owned.", chips: ["Missouri PA CS260027012","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: "Spanish is Missouri's most common non-English language, and seven languages are each spoken by 10,000+ residents statewide (Missouri Economic Research and Information Center).", languages: L_MO,
    vehicles: [ { title: "Missouri NASPO ValuePoint Participating Addendum", sub: "MO Division of Purchasing · CS260027012", body: "Missouri's participating addendum for remote interpreting and translating services, usable by Missouri public entities." }, GSA ],
    loved: [ { h: "Missouri Foreign Language Court Interpreter Program", p: "Missouri's judiciary certifies court interpreters and provides interpretation in 170+ languages so LEP individuals have meaningful access to state courts.", src: "Missouri Courts", href: "https://www.courts.mo.gov/page.jsp?id=182" }, { h: "MoDOT Title VI / Limited English Proficiency Program", p: "The Missouri Dept. of Transportation provides language-assistance services so LEP travelers can access transportation programs under its Title VI / Limited English Proficiency program.", src: "MoDOT — Title VI / LEP", href: "https://www.modot.org/title-vi-limited-english-proficiency" } ] },
  { slug: "new-mexico-language-services", name: "New Mexico", ref: "New Mexico", audience: "Any New Mexico state agency, county, city, or school district", vehicleShort: "New Mexico NASPO ValuePoint", contractNumber: "60-00000-25-00026AJ", agency: "New Mexico General Services Department (GSD)", metaDescription: "New Mexico agencies, counties, cities, and districts can order certified translation, interpretation, and Section 508/ADA services from Taika on NASPO ValuePoint PA 60-00000-25-00026AJ — no new RFP. Veteran-owned.", chips: ["NM PA 60-00000-25-00026AJ","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: "About a third of New Mexicans speak a language other than English at home — most commonly Spanish and Diné (Navajo), alongside emerging languages served by the state's courts.", languages: L_NM,
    vehicles: [ { title: "New Mexico Participating Addendum (NASPO ValuePoint)", sub: "NM General Services Department · 60-00000-25-00026AJ", body: "New Mexico's participating addendum for remote interpreting and translating services, usable by NM public entities." }, GSA ],
    loved: [ { h: "HB 22 — Limited English Access to State Programs (2022)", p: "New Mexico requires cabinet-level agencies to collect language-use data and implement plans giving LEP residents meaningful access to state services.", src: "New Mexico Legislature — HB 22 (2022)", href: "https://www.nmlegis.gov/" }, { h: "New Mexico Courts Language Access Services", p: "The Administrative Office of the Courts recruits, trains, certifies, and funds court interpreters so LEP and Deaf/hard-of-hearing New Mexicans have equal court access.", src: "New Mexico Courts — Language Access", href: "https://languageaccess.nmcourts.gov/" } ] },
  { slug: "nevada-language-services", name: "Nevada", ref: "Nevada", audience: "Any Nevada state agency, county, city, or school district", vehicleShort: "Nevada Statewide Contract 99SWC-NV26-28018", contractNumber: "99SWC-NV26-28018", agency: "Nevada Division of Purchasing", metaDescription: "Nevada agencies, counties, cities, and districts can order certified translation, interpretation, and Section 508/ADA services from Taika on Statewide Contract 99SWC-NV26-28018 — no new RFP. Veteran-owned.", chips: ["NV Statewide 99SWC-NV26-28018","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: "Roughly 13% of Nevadans are limited English proficient — above the national average — reflecting one of the fastest-growing multilingual populations in the country (Migration Policy Institute).", languages: L_NV,
    vehicles: [ { title: "Statewide Contract for Language Services", sub: "Nevada Division of Purchasing · 99SWC-NV26-28018", body: "Nevada's statewide language-services contract, usable by Nevada state agencies and eligible local entities." }, NASPO_COOP, GSA ],
    loved: [ { h: "Nevada Initiative for Language Access (SB 318, 2021)", p: "Every Nevada executive agency must create and biennially update a Language Access Plan, coordinated by the Governor's Office for New Americans.", src: "Nevada Office for New Americans — Language Access", href: "https://ona.nv.gov/Programs/Language_Access" }, { h: "Nevada Secretary of State Language Access Plan (2025–2027)", p: "The Secretary of State created its first dedicated language-access position and a plan emphasizing plain language and multilingual materials for LEP residents.", src: "Nevada Secretary of State", href: "https://www.nvsos.gov/" } ] },
  { slug: "oklahoma-language-services", name: "Oklahoma", ref: "Oklahoma", audience: "Any Oklahoma state agency, county, city, or school district", vehicleShort: "Oklahoma Statewide Contract SW0780", contractNumber: "SW0780", agency: "Oklahoma Office of Management & Enterprise Services (OMES), Central Purchasing", metaDescription: "Oklahoma agencies, counties, cities, and districts can order certified translation, interpretation, and Section 508/ADA services from Taika on Statewide Contract SW0780 — no new RFP. Veteran-owned.", chips: ["OK Statewide SW0780","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: "About 11% of Oklahomans speak a language other than English at home — most commonly Spanish, followed by Vietnamese (U.S. Census).", languages: L_OK,
    vehicles: [ { title: "Statewide Contract for Translation and Interpreter Services", sub: "OK OMES Central Purchasing · SW0780", body: "Oklahoma's statewide translation and interpreter contract, usable by Oklahoma state agencies and eligible entities." }, GSA ],
    loved: [ { h: "Oklahoma Electronic & Information Technology Accessibility (EITA) Act", p: "Oklahoma requires state agencies, public colleges, and CareerTech to make websites and IT accessible to WCAG 2.1 AA / Section 508 under the OMES ICT standard.", src: "Oklahoma OMES — Accessibility Standard", href: "https://oklahoma.gov/omes.html" }, { h: "ODOT Limited English Proficiency Program", p: "The Oklahoma Dept. of Transportation provides language assistance so LEP individuals have meaningful access to its programs and services.", src: "ODOT — Limited English Proficiency", href: "https://oklahoma.gov/odot/business-center/contract-compliance/title-vi/limited-english-proficiency.html" } ] },
  { slug: "rhode-island-language-services", name: "Rhode Island", ref: "Rhode Island", audience: "Any Rhode Island state agency, city, town, or school district", vehicleShort: "Rhode Island MPA 54", contractNumber: "OEV26006447", agency: "Rhode Island Division of Purchases, Dept. of Administration", metaDescription: "Rhode Island agencies, cities, towns, and districts can order certified translation, interpretation, and Section 508/ADA services from Taika on MPA 54 (OEV26006447) and NASPO ValuePoint — no new RFP. Veteran-owned.", chips: ["RI MPA 54 · OEV26006447","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: RI_LEP, languages: L_RI, officeState: "Rhode Island",
    vehicles: [ { title: "MPA 54 — Interpreting and Translation Services", sub: "RI Division of Purchases · OEV26006447", body: "Rhode Island's master price agreement for interpreting and translation, usable by RI state agencies and eligible entities." }, { title: "Rhode Island NASPO ValuePoint Participating Addendum", sub: "RI Division of Purchases", body: "Rhode Island's participating addendum for remote interpreting and translating services. (See our Rhode Island NASPO ValuePoint page.)" }, GSA ], loved: RI_LOVED },
  { slug: "rhode-island-naspo-valuepoint", name: "Rhode Island", ref: "Rhode Island", audience: "Any Rhode Island public entity ordering through NASPO ValuePoint", vehicleShort: "Rhode Island NASPO ValuePoint PA", contractNumber: "NASPO ValuePoint Master 40-00000-24-00076AJ", agency: "State of Rhode Island, Division of Purchases", metaDescription: "Rhode Island public entities can order certified translation and interpretation from Taika on the Rhode Island NASPO ValuePoint Participating Addendum — no new RFP. Veteran-owned.", chips: ["Rhode Island NASPO PA","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: RI_LEP, languages: L_RI, officeState: "Rhode Island",
    vehicles: [ { title: "Rhode Island NASPO ValuePoint Participating Addendum", sub: "RI Division of Purchases · Master 40-00000-24-00076AJ", body: "Rhode Island's participating addendum for NASPO ValuePoint remote interpreting and translating services — the cooperative path for RI public entities." }, { title: "MPA 54 — Interpreting and Translation Services", sub: "RI Division of Purchases · OEV26006447", body: "Rhode Island also holds MPA 54 for interpreting and translation. (See our Rhode Island MPA 54 page.)" }, GSA ], loved: RI_LOVED },
  { slug: "south-dakota-language-services", name: "South Dakota", ref: "South Dakota", audience: "Any South Dakota state agency, county, city, or school district", vehicleShort: "South Dakota NASPO ValuePoint", contractNumber: "17972", agency: "South Dakota Bureau of Administration", metaDescription: "South Dakota agencies, counties, cities, and districts can order certified translation, interpretation, and Section 508/ADA services from Taika on NASPO ValuePoint (Contract 17972) — no new RFP. Veteran-owned.", chips: ["SD PA Contract 17972","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: "About 7% of South Dakotans speak a language other than English at home; top languages include Spanish, Native American languages, and German (U.S. Census).", languages: L_SD,
    vehicles: [ { title: "South Dakota Participating Addendum (NASPO ValuePoint)", sub: "SD Bureau of Administration · Contract 17972", body: "South Dakota's participating addendum for remote interpreting and translating services, usable by SD public entities." }, GSA ],
    loved: [ { h: "South Dakota Unified Judicial System Language Access Plan", p: "South Dakota's courts provide free interpreter and translated-document services to LEP individuals in compliance with Title VI of the Civil Rights Act.", src: "South Dakota Unified Judicial System", href: "https://ujs.sd.gov/" }, { h: "South Dakota Title III English Language Acquisition", p: "The SD Dept. of Education funds English-language instruction and required meaningful communication with LEP parents for English learners and immigrant students.", src: "South Dakota Dept. of Education — EL", href: "https://doe.sd.gov/title/el.aspx" } ] },
  { slug: "houston-isd-language-services", name: "Houston ISD", ref: "the Houston Independent School District", audience: "Houston ISD campuses, departments, and Texas school districts", vehicleShort: "HISD Master Service Agreement", contractNumber: "24-04-09", agency: "Houston Independent School District", metaDescription: "Houston ISD campuses and departments can order certified translation, interpretation, and Section 508/ADA services from Taika on the HISD Master Service Agreement (24-04-09) — plus cooperative and GSA paths. Veteran-owned.", chips: ["HISD MSA 24-04-09","GSA Schedule Holder","NASPO ValuePoint","FERPA-Compliant","Section 508 / ADA"], lepSentence: "Houston ISD serves roughly 70,000 English Learners across the district — one of the largest multilingual student populations in the nation (Houston ISD Multilingual Programs).", languages: L_HISD,
    vehicles: [ { title: "HISD Master Service Agreement", sub: "Houston Independent School District · 24-04-09", body: "Taika's master service agreement with Houston ISD for translation and interpretation across campuses and departments." }, { title: "Cooperative & GSA paths for Texas districts", sub: "NASPO ValuePoint · GSA 47QRAA18D00GT", body: "Neighboring Texas districts and public entities can reach the same services through cooperative purchasing and GSA — we confirm your path." } ],
    loved: [ { h: "HISD Multilingual Programs", p: "Houston ISD delivers bilingual, ESL, and dual-language education plus translation and interpretation support for emergent bilingual students and their families — work we're honored to support.", src: "Houston ISD — Multilingual Programs", href: "https://www.houstonisd.org/schools-academics/academics/multilingual" }, { h: "HISD Dual Language program", p: "HISD offers one-way and two-way dual-language models plus immersion in Mandarin, Arabic, French, and Vietnamese — a nationally recognized commitment to multilingual learning.", src: "Houston ISD — Multilingual Program Models", href: "https://www.houstonisd.org/schools-academics/academics/multilingual/multilingual-program-models" } ] },
  { slug: "los-angeles-usd-language-services", name: "Los Angeles Unified", ref: "the Los Angeles Unified School District", audience: "LAUSD schools and offices, and Los Angeles-area districts", vehicleShort: "LAUSD Agreement C 10673", contractNumber: "C 10673", agency: "Los Angeles Unified School District", metaDescription: "Los Angeles Unified schools and offices can order translation, interpretation, and sign-language interpretation from Taika on LAUSD Agreement C 10673 — plus GSA & cooperative paths. Veteran-owned.", chips: ["LAUSD Agreement C 10673","ASL & Sign Language","GSA Schedule Holder","FERPA-Compliant","Section 508 / ADA"], lepSentence: "Los Angeles Unified serves more than 200,000 multilingual learners on pathways to bilingualism and biliteracy — with families speaking Spanish, Armenian, Korean, Mandarin, and dozens of other languages (LAUSD Multilingual & Multicultural Education).", languages: L_LAUSD, officeState: "California",
    vehicles: [ { title: "LAUSD Agreement for Professional Services", sub: "Los Angeles Unified School District · C 10673", body: "Taika's agreement with LAUSD for translation, interpretation, and sign-language interpretation services across schools and offices (2026–2029)." }, { title: "Cooperative & GSA paths for California districts", sub: "NASPO ValuePoint · California CMAS · GSA 47QRAA18D00GT", body: "Other California districts and public entities can reach the same services through cooperative purchasing, CMAS, and GSA — we confirm your path." } ],
    loved: [ { h: "LAUSD 2025 Multilingual & Multicultural Master Plan", p: "Los Angeles Unified's district-wide plan builds an inclusive, culturally and linguistically responsive education for more than 200,000 multilingual learners — the kind of commitment we're proud to help deliver.", src: "LAUSD — Multilingual & Multicultural Education", href: "https://www.lausd.org/mmed" }, { h: "LAUSD Dual Language & Bilingual Programs", p: "LAUSD's Dual Language and Bilingual Programs put students on pathways to bilingualism and biliteracy, with translated family communications and interpretation across the district.", src: "LAUSD — Dual Language / Bilingual Programs", href: "https://www.lausd.org/apolo" } ] },
  { slug: "massachusetts-language-services", name: "Massachusetts", ref: "Massachusetts", audience: "Any Massachusetts agency, city, town, or school district", vehicleShort: "Statewide Contract PRF88", contractNumber: "BD-26-1080-OSD03-OSD03-122721", agency: "Massachusetts Operational Services Division (OSD)", metaDescription: "Massachusetts agencies, cities, and school districts can order certified translation, interpretation, and Section 508/ADA services from Taika on Statewide Contract PRF88 — no new RFP. Veteran-owned; GSA & NASPO holder.", chips: ["Statewide Contract PRF88","NASPO ValuePoint","GSA Schedule Holder","Veteran-Owned (VOSB)","Section 508 / ADA"], lepSentence: "Nearly one in ten Massachusetts adults has limited English proficiency; the most commonly spoken languages include Spanish, Portuguese, Chinese, Vietnamese, and Haitian Creole.", officeState: "Massachusetts",
    languages: { intro: "Massachusetts Trial Court interpreters work in 113+ languages, handling 90,000+ interpretation events a year. The most-requested include:", list: ["Spanish","Portuguese","Haitian Creole","Cape Verdean Creole","Mandarin","Arabic","Vietnamese","Russian","American Sign Language (ASL)","Khmer (Cambodian)"], sourceLabel: "Massachusetts Trial Court — Office of Language Access" },
    vehicles: [ { title: "Statewide Contract PRF88", sub: "Massachusetts OSD · BD-26-1080-OSD03-OSD03-122721", body: "Foreign Language Interpretation & Translation Services. Available to Massachusetts executive agencies and to eligible cities, towns, school districts, and other public entities that use OSD statewide contracts." }, NASPO_COOP, GSA ],
    loved: [ { h: "Executive Order 615 — language access across state government", p: "In September 2023, Massachusetts required every executive department agency to name a Language Access Coordinator and publish a Language Access Plan, so residents with limited English proficiency can reach the services they're entitled to.", src: "Mass.gov — Governor Healey signs EO to improve language access", href: "https://www.mass.gov/news/governor-healey-signs-executive-order-to-improve-language-access-across-state-government" }, { h: "Statewide Language Access Policy & Implementation Guidelines", p: "The Commonwealth publishes clear, agency-wide guidelines for translating vital documents and providing interpreters — a model that makes it easier for public entities to serve multilingual communities consistently.", src: "Mass.gov — Language Access Policy and Implementation Guidelines", href: "https://www.mass.gov/info-details/language-access-policy-and-implementation-guidelines" } ] },
];

// ── Bespoke pages (Massachusetts flagship + NASPO master) get merged in from
// gen-contract-extra.mjs if present, so this file stays purely the state set.
let EXTRA = [];
try { ({ EXTRA } = await import("./gen-contract-extra.mjs")); } catch { EXTRA = []; }

const ALL = [...STATES, ...EXTRA];

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");

function render(s) {
  const canonical = `https://www.taikatranslations.com/government/${s.slug}`;
  const title = `${s.name} Translation & Interpretation on Government Contract | Taika`;
  const office = s.officeState ? OFFICES[s.officeState] : null;
  const stats = [
    { num: STATS.languages, label: "Languages supported" },
    { num: STATS.projects, label: "Projects delivered" },
    { num: "GSA + NASPO", label: "Contract vehicles held" },
    { num: STATS.rating + "★", label: "Google rating" },
  ];
  const steps = [
    { h: "Tell us what you need", p: "Send documents, a video to caption, or the languages and dates you need interpreters — using the form below. Two minutes." },
    { h: "Get a quote on contract pricing", p: "We return a written quote at your pre-negotiated contract rates, with the documentation your procurement file needs." },
    { h: "Approve and we start", p: "Issue the task order against your contract and our team begins — certified deliverables, on schedule, in 300+ languages." },
  ];
  const why = [
    { title: "Certified translation", body: "Certified and standard document translation for legal, medical, government, and academic use — signed certificate of accuracy for USCIS, court, and institutional submission." },
    { title: "Professional interpretation", body: "On-site, on-demand phone (OPI), video-remote (VRI), and ASL / CART interpretation for service encounters, hearings, IEP meetings, and community events — scheduled or around the clock." },
    { title: "Section 508 & ADA compliance", body: "Document and media remediation to Section 508 and WCAG 2.1 AA, plus captioning and subtitling — so your digital communications meet accessibility obligations." },
  ];
  const them = ["Separate vendors for translation, interpreting, and 508","Portal-only; no named human contact","Slow, unclear quoting","Compliance is your problem to assemble"];
  const us = ["Translation + interpretation + Section 508/ADA in one contract","A named team that answers the phone","Written quotes at locked contract pricing","Title VI, Section 1557, and accessibility handled together"];
  const stack = [
    "Certified translation in 300+ languages (court/agency-accepted)",
    "On-demand phone & video interpreting, plus scheduled on-site",
    "Section 508 / ADA document & website remediation + video captioning",
    "Written quote with the documentation your procurement file needs",
    "Dedicated account manager + language access plan support",
  ];

  const chipsHtml = s.chips.map((c) => `<li>${esc(c)}</li>`).join("");
  const vehiclesHtml = s.vehicles.map((v) => `<article class="ct-card"><h3>${esc(v.title)}</h3><p class="ct-card-sub">${esc(v.sub)}</p><p>${esc(v.body)}</p></article>`).join("");
  const stepsHtml = steps.map((st) => `<li><strong>${esc(st.h)}.</strong> ${esc(st.p)}</li>`).join("");
  const whyHtml = why.map((w) => `<article class="ct-card"><h3>${esc(w.title)}</h3><p>${esc(w.body)}</p></article>`).join("");
  const themHtml = them.map((x) => `<li>${esc(x)}</li>`).join("");
  const usHtml = us.map((x) => `<li>${esc(x)}</li>`).join("");
  const stackHtml = stack.map((x) => `<li><span class="ct-check" aria-hidden="true">✓</span>${esc(x)}</li>`).join("");
  const lovedHtml = s.loved.map((l) => `<article class="ct-card"><h3>${esc(l.h)}</h3><p>${esc(l.p)}</p><p class="ct-src">Source: <a href="${attr(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.src)}</a></p></article>`).join("");
  const vehicleOptions = s.vehicles.map((v) => `<option value="${attr(v.sub ? v.title + " — " + v.sub : v.title)}">${esc(v.title)}</option>`).join("");

  const langsBlock = s.languages ? `
  <section class="page-section ct-alt" id="languages">
    <div class="page-inner">
      <span class="section-label">Languages for ${esc(s.name)}</span>
      <h2 class="section-h2">The languages ${esc(s.name)} needs most — <em>and 300+ more.</em></h2>
      <p class="section-sub">${esc(s.languages.intro)}</p>
      <ul class="ct-langs" aria-label="Languages served for ${attr(s.name)}">${s.languages.list.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      <p class="ct-langs-more"><strong>…and ${STATS.languages} more.</strong> Taika translates and interprets in ${STATS.languages} languages through ${STATS.linguists} vetted linguists — from the languages above to rare, Indigenous, and emerging languages most vendors can't staff. <a href="/translation#languages">See every language we translate</a>, or <a href="#order">request your language</a> — if your community speaks it, we can serve it.</p>
      <p class="ct-langs-src">Source: ${s.languages.sourceHref ? `<a href="${attr(s.languages.sourceHref)}" target="_blank" rel="noopener noreferrer">${esc(s.languages.sourceLabel)}</a>` : esc(s.languages.sourceLabel)}. Coverage is not limited to this list.</p>
    </div>
  </section>` : "";

  const officeLine = office ? ` <span>Local ${esc(s.officeState)} office: ${esc(office)}.</span>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${attr(s.metaDescription)}">
<link rel="canonical" href="${attr(canonical)}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(s.metaDescription)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${attr(canonical)}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"GovernmentService","name":"${attr(s.name + " Language Services on Government Contract")}","serviceType":"Certified translation, interpretation, and Section 508/ADA compliance","provider":{"@type":"Organization","name":"Taika Translations LLC","url":"https://teamtaika.com","telephone":"+1-830-355-2205"},"areaServed":"${attr(s.name)}","description":"${attr(s.metaDescription)}"}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../../css/main.css?v=2">
<style>
.ct-crumb{background:var(--mist,#f8f9fb);border-bottom:1px solid var(--border,#e8ecf0);font-size:13px;}
.ct-crumb-inner{max-width:1100px;margin:0 auto;padding:12px 24px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;color:var(--slate);}
.ct-crumb-inner a{color:var(--slate);text-decoration:none;}
.ct-crumb-inner a:hover{color:var(--gold-text,#7A5C0F);}
.ct-crumb-inner span[aria-current]{color:var(--navy);font-weight:600;}
.page-hero{background:var(--navy-deep);padding:64px 0 52px;}
.page-inner{max-width:1100px;margin:0 auto;padding:0 24px;}
.page-section{padding:64px 0;}
.ct-alt{background:var(--mist,#f8f9fb);}
.ct-eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold);display:inline-flex;align-items:center;gap:8px;margin-bottom:14px;}
.ct-dot{width:7px;height:7px;border-radius:50%;background:var(--gold);display:inline-block;}
.hero-h1{font-family:var(--font-display);font-size:clamp(2rem,4.4vw,3.1rem);color:#fff;line-height:1.13;margin-bottom:18px;max-width:18ch;}
.hero-h1 em{font-style:normal;color:var(--gold);}
.hero-sub{font-size:17px;color:rgba(255,255,255,.74);line-height:1.7;max-width:60ch;margin-bottom:22px;}
.ct-chips{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0 0 26px;}
.ct-chips li{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:600;color:#f0e6cf;}
.hero-btns{display:flex;flex-wrap:wrap;gap:14px;}
.btn-gold{display:inline-block;background:var(--gold);color:var(--navy-deep);font-weight:700;font-size:14px;padding:13px 28px;border-radius:8px;text-decoration:none;}
.btn-outline-white{display:inline-block;background:transparent;border:2px solid rgba(255,255,255,.35);color:#fff;font-weight:600;font-size:14px;padding:11px 26px;border-radius:8px;text-decoration:none;}
.hero-proof{margin-top:22px;font-size:13px;color:rgba(255,255,255,.6);}
.hero-proof strong{color:var(--gold);}
.ct-statbar{max-width:1100px;margin:-28px auto 0;padding:0 24px;position:relative;z-index:3;}
.ct-statbar-grid{background:var(--navy);border-radius:14px;box-shadow:0 18px 44px rgba(11,30,53,.22);display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;}
.ct-stat{padding:22px 14px;text-align:center;border-left:1px solid rgba(255,255,255,.12);}
.ct-stat:first-child{border-left:none;}
.ct-stat-num{display:block;font-family:var(--font-display);font-weight:700;font-size:clamp(1.4rem,1.1rem+1vw,2rem);color:#fff;line-height:1;}
.ct-stat-label{display:block;margin-top:8px;font-size:12px;color:var(--gold-light,#D4A94E);}
.ct-creds{max-width:1100px;margin:0 auto;padding:34px 24px 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 18px;}
.ct-creds .lbl{font-family:var(--font-mono);font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--slate);}
.ct-creds .cred{font-size:12.5px;font-weight:600;color:var(--navy);background:#fff;border:1px solid var(--border,#e8ecf0);border-radius:999px;padding:6px 14px;}
.ct-creds-note{max-width:1100px;margin:10px auto 0;padding:0 24px;text-align:center;font-size:11.5px;color:var(--slate-light,#5E7085);}
.section-label{font-family:var(--font-mono);font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold-text,#7A5C0F);display:block;margin-bottom:12px;}
.section-h2{font-family:var(--font-display);font-size:clamp(1.5rem,3vw,2.15rem);color:var(--navy);line-height:1.2;margin-bottom:14px;}
.section-h2 em{font-style:normal;color:var(--gold-text,#7A5C0F);}
.section-sub{font-size:15.5px;color:var(--slate);line-height:1.75;max-width:66ch;margin-bottom:32px;}
.ct-grid{display:grid;gap:20px;grid-template-columns:repeat(3,1fr);}
.ct-grid-2{grid-template-columns:repeat(2,1fr);}
.ct-card{background:#fff;border:1px solid var(--border,#e8ecf0);border-radius:12px;padding:24px 22px;}
.ct-card h3{font-family:var(--font-display);font-size:1.15rem;color:var(--navy);margin:0 0 8px;}
.ct-card p{font-size:14.5px;color:var(--slate);line-height:1.6;margin:0;}
.ct-card-sub{font-family:var(--font-mono);font-size:11px;letter-spacing:.5px;color:var(--gold-text,#7A5C0F)!important;text-transform:uppercase;margin-bottom:8px!important;}
.ct-src{margin-top:12px!important;font-size:12.5px!important;}
.ct-src a{color:var(--gold-text,#7A5C0F);}
.ct-how{display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:start;margin-top:28px;}
.ct-steps{margin:0;padding-left:20px;color:var(--slate);font-size:15px;line-height:1.65;}
.ct-steps li{margin-bottom:10px;}
.ct-steps strong{color:var(--navy);}
.ct-note{background:#fff;border:1px solid var(--border,#e8ecf0);border-left:4px solid var(--gold);border-radius:10px;padding:16px 18px;margin-top:18px;font-size:14px;color:var(--slate);line-height:1.6;}
.ct-note strong{color:var(--navy);}
.ct-quote{background:#fff;border:2px solid var(--gold);border-radius:14px;padding:24px;box-shadow:0 10px 30px rgba(11,30,53,.08);}
.ct-quote h3{font-family:var(--font-display);font-size:1.25rem;color:var(--navy);margin:0 0 4px;}
.ct-quote .sub{font-size:13.5px;color:var(--slate);margin:0 0 16px;}
.ct-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;}
.ct-field label{font-size:13px;font-weight:600;color:var(--navy);}
.ct-field input,.ct-field select,.ct-field textarea{padding:10px 12px;border:1px solid var(--border-strong,#c8d4e0);border-radius:8px;font:inherit;font-size:14px;background:#fff;color:var(--navy);width:100%;}
.ct-field input:focus,.ct-field select:focus,.ct-field textarea:focus{outline:none;border-color:var(--gold);}
.ct-row{display:flex;gap:12px;flex-wrap:wrap;}
.ct-row .ct-field{flex:1 1 200px;}
.ct-form-btn{width:100%;background:var(--gold);color:var(--navy-deep);font-weight:700;font-size:15px;padding:13px;border:none;border-radius:8px;cursor:pointer;margin-top:4px;}
.ct-deadline{background:#fff;border:1px solid var(--border,#e8ecf0);border-radius:12px;padding:22px 24px;margin-top:28px;}
.ct-deadline h3{font-family:var(--font-display);color:var(--navy);font-size:1.15rem;margin:0 0 8px;}
.ct-deadline p{color:var(--slate);font-size:14.5px;line-height:1.65;margin:0;}
.ct-langs{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0 0 18px;}
.ct-langs li{background:#fff;border:1px solid var(--border,#e8ecf0);border-radius:999px;padding:6px 14px;font-size:13.5px;font-weight:600;color:var(--navy);}
.ct-langs-more{font-size:14.5px;color:var(--slate);line-height:1.7;max-width:70ch;}
.ct-langs-more a{color:var(--gold-text,#7A5C0F);font-weight:600;}
.ct-langs-src{margin-top:10px;font-size:12.5px;color:var(--slate-light,#5E7085);}
.ct-langs-src a{color:var(--gold-text,#7A5C0F);}
.ct-compare{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--border,#e8ecf0);border-radius:12px;overflow:hidden;margin-top:24px;}
.ct-compare-col{padding:24px;}
.ct-compare-them{background:#fff;}
.ct-compare-us{background:var(--navy);color:#fff;}
.ct-compare-col h3{font-family:var(--font-display);font-size:1.05rem;margin:0 0 14px;}
.ct-compare-them h3{color:var(--slate);}
.ct-compare-us h3{color:var(--gold);}
.ct-compare-col ul{list-style:none;padding:0;margin:0;}
.ct-compare-col li{padding:10px 0 10px 26px;position:relative;font-size:14.5px;border-top:1px solid var(--border,#e8ecf0);}
.ct-compare-them li{color:var(--slate);}
.ct-compare-them li::before{content:"✕";position:absolute;left:0;color:#b04a4a;font-weight:700;}
.ct-compare-us li{color:rgba(255,255,255,.9);border-top-color:rgba(255,255,255,.14);}
.ct-compare-us li::before{content:"✓";position:absolute;left:0;color:var(--gold);font-weight:700;}
.ct-stack{list-style:none;padding:0;margin:24px 0 0;max-width:820px;}
.ct-stack li{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-top:1px solid var(--border,#e8ecf0);font-size:15.5px;color:var(--navy);}
.ct-stack li:first-child{border-top:none;}
.ct-check{color:var(--emerald,#1A6B4A);font-weight:800;}
.ct-order{background:#fff;border:1px solid var(--border,#e8ecf0);border-radius:14px;padding:26px;box-shadow:0 8px 26px rgba(11,30,53,.07);margin-top:20px;}
.ct-btnrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px;}
.ct-btnrow button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:13px 10px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;border:2px solid transparent;line-height:1.2;text-align:center;}
.ct-btnrow small{font-weight:500;font-size:11px;opacity:.8;}
.ct-btn-primary{background:var(--gold);color:var(--navy-deep);}
.ct-btn-secondary{background:#fff;color:var(--navy);border-color:var(--border-strong,#c8d4e0)!important;}
.ct-btn-neutral{background:var(--mist,#f8f9fb);color:var(--navy);border-color:var(--border-strong,#c8d4e0)!important;}
.ct-alt-contact{font-size:13px;color:var(--slate);margin:14px 0 0;}
.ct-alt-contact a{color:var(--gold-text,#7A5C0F);font-weight:600;}
.ct-status{margin-top:16px;padding:14px 16px;border-radius:8px;font-size:14.5px;line-height:1.55;}
.ct-status a{color:inherit;font-weight:700;}
.ct-status-ok{background:var(--emerald-bg,#EBF5F0);border:1px solid var(--emerald,#1A6B4A);color:#155a3e;}
.ct-status-err{background:var(--red-bg,#FEF2F2);border:1px solid #E0A3A3;color:var(--red-text,#991B1B);}
.ct-disclaimer{font-size:12px;color:var(--slate-light,#5E7085);margin-top:16px;}
.ct-band{background:var(--navy-deep);padding:56px 0;}
.ct-band h2{font-family:var(--font-display);color:#fff;font-size:clamp(1.5rem,3vw,2.1rem);margin:0 0 12px;max-width:26ch;}
.ct-band p{color:rgba(255,255,255,.72);font-size:16px;line-height:1.6;max-width:60ch;margin:0 0 24px;}
.ct-hidden-forms{position:absolute;left:-9999px;height:0;overflow:hidden;}
@media(max-width:900px){.ct-grid{grid-template-columns:repeat(2,1fr);}.ct-how{grid-template-columns:1fr;}.ct-statbar-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.ct-grid,.ct-grid-2,.ct-compare{grid-template-columns:1fr;}.ct-btnrow{grid-template-columns:1fr;}}
</style>
</head>
<body>
<!-- @nav -->

<nav class="ct-crumb" aria-label="Breadcrumb">
  <div class="ct-crumb-inner">
    <a href="/">Home</a><span aria-hidden="true">›</span>
    <a href="/government">Government</a><span aria-hidden="true">›</span>
    <span aria-current="page">${esc(s.name)}</span>
  </div>
</nav>

<section class="page-hero">
  <div class="page-inner">
    <span class="ct-eyebrow"><span class="ct-dot" aria-hidden="true"></span>${esc(s.name)} · ${esc(s.vehicleShort)}</span>
    <h1 class="hero-h1">Language access for every ${esc(s.name)} resident — <em>already on contract.</em></h1>
    <p class="hero-sub">${esc(s.audience)} can order certified translation, interpretation, and Section&nbsp;508 / ADA services from Taika <strong>on a contract you already hold</strong> — no new RFP, no procurement cycle. Veteran-owned; GSA Schedule and NASPO ValuePoint contract holder.</p>
    <ul class="ct-chips" aria-label="Contract vehicles and credentials">${chipsHtml}</ul>
    <div class="hero-btns">
      <a class="btn-gold" href="#order">Start an order or quote →</a>
      <a class="btn-outline-white" href="#how">How ordering works</a>
    </div>
    <p class="hero-proof"><strong>${STATS.rating}★</strong> on Google · Trusted by State &amp; Federal Agencies</p>
  </div>
</section>

<div class="ct-statbar">
  <div class="ct-statbar-grid" role="list">
    ${stats.map((st) => `<div class="ct-stat" role="listitem"><span class="ct-stat-num">${esc(st.num)}</span><span class="ct-stat-label">${esc(st.label)}</span></div>`).join("")}
  </div>
</div>

<div class="ct-creds" aria-label="Authorized contract vehicles and credentials">
  <span class="lbl">Authorized on</span>
  <span class="cred">GSA Schedule 47QRAA18D00GT</span>
  <span class="cred">NASPO ValuePoint</span>
  <span class="cred">SBA Veteran-Owned (VOSB)</span>
  <span class="cred">SAM Registered</span>
  <span class="cred">Section 508 / ADA</span>
</div>
<p class="ct-creds-note">Contract-vehicle marks referenced with permission. Not an endorsement of Taika Translations by any agency.</p>

<section class="page-section" id="how">
  <div class="page-inner">
    <span class="section-label">How ordering works</span>
    <h2 class="section-h2">Order on a contract you already have. No new procurement.</h2>
    <p class="section-sub">${esc(s.audience)} can access Taika through pre-competed vehicles. Pick the one your procurement office already uses — we handle the paperwork.</p>
    <div class="ct-grid">${vehiclesHtml}</div>
    <div class="ct-how">
      <div>
        <ol class="ct-steps">${stepsHtml}</ol>
        <p class="ct-note"><strong>Pricing is already locked in.</strong> Rates are pre-negotiated on your contract vehicle — no markups, no surprises. Request a quote and we confirm your exact contract pricing in writing.</p>
      </div>
      <aside class="ct-quote">
        <form id="ct-quick" method="POST" data-netlify="true" netlify-honeypot="bot-field" name="contract-quote" action="/government/${esc(s.slug)}?sent=1">
          <input type="hidden" name="form-name" value="contract-quote">
          <input type="hidden" name="state" value="${attr(s.name)}">
          <input type="hidden" name="source" value="${attr(s.name + " how-section quick quote")}">
          <p style="position:absolute;left:-9999px;" aria-hidden="true"><label>Leave this blank <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
          <h3>Get a quote now</h3>
          <p class="sub">Pick your contract — we reply the same business day.</p>
          <div class="ct-field"><label for="q-vehicle">Contract to order on</label><select id="q-vehicle" name="vehicle">${vehicleOptions}<option value="Not sure — help me choose">Not sure — help me choose</option></select></div>
          <div class="ct-row"><div class="ct-field"><label for="q-name">Name</label><input type="text" id="q-name" name="name" autocomplete="name"></div><div class="ct-field"><label for="q-email">Work email *</label><input type="email" id="q-email" name="email" autocomplete="email" required></div></div>
          <div class="ct-field"><label for="q-service">Service needed</label><select id="q-service" name="service"><option>Document translation</option><option>Interpretation (phone / video)</option><option>On-site interpretation</option><option>Section 508 / ADA &amp; captioning</option><option>Multiple services</option><option>Not sure yet</option></select></div>
          <button type="submit" class="ct-form-btn" data-quick>Get a Quote Now →</button>
          <div id="q-status" class="ct-status" role="status" aria-live="polite" hidden></div>
        </form>
      </aside>
    </div>
  </div>
</section>

<section class="page-section ct-alt">
  <div class="page-inner">
    <span class="section-label">Why ${esc(s.name)} agencies choose Taika</span>
    <h2 class="section-h2">Serve every resident in their language — and stay ahead of every mandate.</h2>
    <p class="section-sub">${esc(s.lepSentence)} Taika helps your agency meet Title VI, Section 1557, and ADA obligations without adding staff.</p>
    <div class="ct-grid">${whyHtml}</div>
    <div class="ct-deadline">
      <h3>Digital accessibility deadlines are coming</h3>
      <p>Under the ADA Title II web rule, public entities serving 50,000 or more must meet WCAG 2.1 AA by <strong>{{ADA_DEADLINE_LARGE}}</strong>; smaller entities and special district governments by <strong>{{ADA_DEADLINE_SMALL}}</strong>. We remediate documents, websites, and video captioning to close the gap — well ahead of the deadline.</p>
    </div>
  </div>
</section>
${langsBlock}
<section class="page-section">
  <div class="page-inner">
    <span class="section-label">How we're different &amp; better</span>
    <h2 class="section-h2">One accountable partner — not a fragmented vendor list.</h2>
    <div class="ct-compare">
      <div class="ct-compare-col ct-compare-them"><h3>Typical language vendor</h3><ul>${themHtml}</ul></div>
      <div class="ct-compare-col ct-compare-us"><h3>Taika</h3><ul>${usHtml}</ul></div>
    </div>
  </div>
</section>

<section class="page-section ct-alt">
  <div class="page-inner">
    <span class="section-label">The Taika ${esc(s.name)} ready-to-order program</span>
    <h2 class="section-h2">Everything an eligible entity gets when it orders on ${esc(s.vehicleShort)}.</h2>
    <ul class="ct-stack">${stackHtml}</ul>
    <p class="ct-note"><strong>No new solicitation. No setup fee.</strong> Order today on a contract you already hold.</p>
  </div>
</section>

<section class="page-section" id="order">
  <div class="page-inner" style="max-width:840px;">
    <span class="section-label">Get started</span>
    <h2 class="section-h2">Tell us what you need.</h2>
    <p class="section-sub">One short form, three ways to reach us. Choose the button that fits — we route it to the right Taika team.</p>
    <form id="ct-inquiry" class="ct-order" method="POST" data-netlify="true" netlify-honeypot="bot-field" name="contract-quote" action="/government/${esc(s.slug)}?sent=1">
      <input type="hidden" name="form-name" value="contract-quote">
      <input type="hidden" name="state" value="${attr(s.name)}">
      <input type="hidden" name="vehicle" value="${attr(s.vehicleShort)}">
      <input type="hidden" name="contract_number" value="${attr(s.contractNumber)}">
      <input type="hidden" name="agency" value="${attr(s.agency)}">
      <p style="position:absolute;left:-9999px;" aria-hidden="true"><label>Leave this blank <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
      <div class="ct-row"><div class="ct-field"><label for="name">Your name</label><input type="text" id="name" name="name" autocomplete="name"></div><div class="ct-field"><label for="email">Work email *</label><input type="email" id="email" name="email" autocomplete="email" required></div></div>
      <div class="ct-row"><div class="ct-field"><label for="organization">Organization</label><input type="text" id="organization" name="organization" placeholder="Agency, city, town, or district"></div><div class="ct-field"><label for="service">Service needed</label><select id="service" name="service"><option>Document translation</option><option>Interpretation (phone / video)</option><option>On-site interpretation</option><option>Section 508 / ADA &amp; captioning</option><option>Multiple services</option><option>Not sure yet</option></select></div></div>
      <div class="ct-row"><div class="ct-field"><label for="languages">Language(s)</label><input type="text" id="languages" name="languages" placeholder="e.g. Spanish"></div><div class="ct-field"><label for="deadline">Needed by</label><input type="text" id="deadline" name="deadline" placeholder="e.g. within 2 weeks"></div></div>
      <div class="ct-field"><label for="message">Anything else?</label><textarea id="message" name="message" rows="3" placeholder="Volume, document types, event details…"></textarea></div>
      <div class="ct-btnrow">
        <button type="submit" class="ct-btn-primary" data-form="contract-quote">Get a Quote<small>Pricing &amp; timeline</small></button>
        <button type="submit" class="ct-btn-secondary" data-form="contract-info">Get More Info<small>Questions about the contract</small></button>
        <button type="submit" class="ct-btn-neutral" data-form="contract-management">Contract Management<small>Existing order or account</small></button>
      </div>
      <div id="ct-status" class="ct-status" role="status" aria-live="polite" hidden></div>
      <p class="ct-alt-contact">Prefer to talk? Call <a href="tel:+18303552205">830-355-2205</a> or <a href="tel:+18652587903">865-258-7903</a>, or email <a href="mailto:sales@taikatranslations.com">sales@taikatranslations.com</a>.${officeLine}</p>
    </form>
  </div>
</section>

<section class="page-section ct-alt">
  <div class="page-inner">
    <span class="section-label">What we love that ${esc(s.name)} is doing</span>
    <h2 class="section-h2">${esc(s.name)} is investing in language access.</h2>
    <p class="section-sub">A few initiatives — in the areas we work in every day — that we admire:</p>
    <div class="ct-grid ct-grid-2">${lovedHtml}</div>
    <p class="ct-disclaimer">Highlights are drawn from public, official sources and reviewed before posting. They reflect our admiration and do not imply any endorsement of Taika Translations.</p>
  </div>
</section>

<section class="ct-band">
  <div class="page-inner">
    <h2>Ready to serve every ${esc(s.name)} resident in the language they understand?</h2>
    <p>Certified translation, interpretation, and Section 508 / ADA compliance — on a contract you already hold.</p>
    <div class="hero-btns">
      <a class="btn-gold" href="#order">Start an order or quote →</a>
      <a class="btn-outline-white" href="/government">Government services</a>
    </div>
  </div>
</section>

<!-- Hidden forms so Netlify detects all three contract form names at deploy. -->
<div class="ct-hidden-forms" aria-hidden="true">
  <form name="contract-info" data-netlify="true" netlify-honeypot="bot-field" hidden><input type="hidden" name="form-name" value="contract-info"><input name="bot-field"><input name="name"><input type="email" name="email"><input name="organization"><input name="service"><input name="languages"><input name="deadline"><input name="state"><input name="vehicle"><input name="contract_number"><input name="agency"><textarea name="message"></textarea></form>
  <form name="contract-management" data-netlify="true" netlify-honeypot="bot-field" hidden><input type="hidden" name="form-name" value="contract-management"><input name="bot-field"><input name="name"><input type="email" name="email"><input name="organization"><input name="service"><input name="languages"><input name="deadline"><input name="state"><input name="vehicle"><input name="contract_number"><input name="agency"><textarea name="message"></textarea></form>
</div>

<script>
(function(){
  function handle(formId, statusId, buttonSel){
    var form=document.getElementById(formId), status=document.getElementById(statusId);
    if(!form||!status) return;
    var hidden=form.querySelector('input[name="form-name"]');
    var emailEl=form.querySelector('input[name="email"]');
    var sending=false;
    function show(kind,html){ status.className='ct-status ct-status-'+kind; status.innerHTML=html; status.hidden=false; status.scrollIntoView({behavior:'smooth',block:'center'}); }
    form.querySelectorAll(buttonSel).forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault();
        if(sending) return;
        var email=emailEl?emailEl.value.trim():'';
        if(!email||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)){ show('err','Please enter a valid work email so we can reply.'); if(emailEl)emailEl.focus(); return; }
        var target=btn.getAttribute('data-form')||'contract-quote';
        form.setAttribute('name',target); if(hidden)hidden.value=target;
        sending=true; var original=btn.innerHTML; btn.innerHTML='Sending…';
        var body=new URLSearchParams(new FormData(form)).toString();
        fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body}).then(function(res){
          if(res.ok){
            try{ if(window.taikaTrack){ window.taikaTrack('generate_lead',{form_name:target}); window.taikaTrack('contract_inquiry',{intent:target}); } }catch(e){}
            form.querySelectorAll('input,textarea,select,button').forEach(function(el){el.disabled=true;});
            show('ok','✓ <strong>Thank you — your request is on its way to our team.</strong> We reply the same business day. For anything urgent, call <a href="tel:+18303552205">830-355-2205</a> or <a href="tel:+18652587903">865-258-7903</a>.');
          } else { show('err','We couldn\\'t send that just now. Please email <a href="mailto:sales@taikatranslations.com">sales@taikatranslations.com</a> or call <a href="tel:+18303552205">830-355-2205</a>.'); }
        }).catch(function(){ show('err','We couldn\\'t send that just now. Please email sales@taikatranslations.com or call 830-355-2205.'); }).finally(function(){ sending=false; btn.innerHTML=original; });
      });
    });
  }
  document.addEventListener('DOMContentLoaded',function(){
    handle('ct-inquiry','ct-status','button[data-form]');
    handle('ct-quick','q-status','button[data-quick]');
  });
})();
</script>

<!-- @footer -->
</body>
</html>
`;
}

mkdirSync(OUT_DIR, { recursive: true });
let n = 0;
for (const s of ALL) {
  writeFileSync(join(OUT_DIR, `${s.slug}.html`), render(s), "utf8");
  n++;
}
console.log(`Generated ${n} contract pages -> pages/government/`);
console.log(ALL.map((s) => "  /government/" + s.slug).join("\n"));

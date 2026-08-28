// tools/gen-blog-posts.mjs
// Generates 7 Section 508 / WCAG blog posts for teamtaika.com into
// pages/resources/blog/<slug>.html, using the standard post template
// (nav/footer via build.py markers; {{ADA_*}} date tokens resolved at build).
// After running, wire each post into the 6 surfaces the integrity checker
// enforces (blog.html card + counters, netlify 200 + 301, sitemap, site-directory)
// then: node tools/blog-integrity-check.mjs
//
// Run:  node tools/gen-blog-posts.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "pages", "resources", "blog");
const AUTHOR = "Jason R. Ehlinger";
const CAT = "Digital Accessibility";

const STYLE = `<style>
.post-hero{background:var(--navy-deep);padding:64px 0 48px;}
.post-inner{max-width:760px;margin:0 auto;padding:48px 24px 80px;}
.post-cat{font-family:var(--font-mono);font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold);margin-bottom:14px;display:block;}
.post-title{font-family:var(--font-display);font-size:clamp(1.9rem,4vw,2.8rem);color:#fff;line-height:1.15;margin-bottom:16px;}
.post-meta{display:flex;align-items:center;gap:16px;font-size:13px;color:rgba(255,255,255,.6);margin-top:20px;flex-wrap:wrap;}
.post-meta strong{color:rgba(255,255,255,.9);}
.post-body{font-size:16px;line-height:1.75;color:var(--body-text,#2d3748);}
.post-body h2{font-family:var(--font-display);font-size:1.5rem;color:var(--navy);margin:2.2em 0 .8em;line-height:1.2;}
.post-body h3{font-size:1.1rem;font-weight:700;color:var(--navy);margin:1.8em 0 .6em;}
.post-body p{margin:0 0 1.2em;}
.post-body ul,.post-body ol{margin:0 0 1.4em 1.4em;padding:0;}
.post-body li{margin-bottom:.45em;}
.post-body blockquote{border-left:3px solid var(--gold);padding:12px 20px;background:var(--mist,#f8f9fa);margin:1.8em 0;border-radius:0 6px 6px 0;font-style:italic;color:var(--slate);}
.post-body a{color:var(--navy);text-decoration:underline;}
.post-cta{background:var(--navy);border-radius:var(--radius-md);padding:32px;text-align:center;margin:48px 0 0;}
.post-cta h3{color:#fff;font-family:var(--font-display);font-size:1.3rem;margin-bottom:8px;}
.post-cta p{color:rgba(255,255,255,.7);font-size:14px;margin-bottom:20px;}
.post-cta .btn-primary{display:inline-block;background:var(--gold);color:var(--navy-deep);font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;}
.post-related{border-top:1.5px solid var(--border);margin-top:64px;padding-top:40px;}
.post-related h3{font-family:var(--font-display);font-size:1.2rem;color:var(--navy);margin-bottom:24px;}
</style>`;

const ANSWER = (html) =>
  `<div class="answer-box" style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:18px 22px;margin:0 0 32px;"><strong style="color:#166534;">Quick answer:</strong> <span style="font-size:16px;color:var(--slate);line-height:1.75;">${html}</span></div>`;

const INLINE_CTA = (html, linkText = "Get a Section 508 remediation quote &rarr;") =>
  `<div class="inline-cta" style="background:var(--mist,#f8f9fa);border:1.5px solid var(--border);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:20px 24px;margin:32px 0;"><p style="margin:0 0 12px;font-size:15px;color:var(--navy);">${html}</p><p style="margin:0;font-size:15px;"><a href="/508-compliance#quote" style="font-weight:700;color:var(--gold-text,#7A5C0F);">${linkText}</a></p></div>`;

const relatedCard = (r) =>
  `<a href="${r.href}" style="display:block;padding:20px;border:1.5px solid var(--border);border-radius:var(--radius-md);text-decoration:none;transition:.2s;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'"><div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;">${r.cat}</div><div style="font-family:var(--font-display);font-size:15px;color:var(--navy);font-weight:700;line-height:1.3;">${r.title}</div><div style="font-size:12px;color:var(--slate);margin-top:8px;">${AUTHOR} &middot; ${r.date}</div></a>`;

function render(p) {
  const url = `https://teamtaika.com/blog/${p.slug}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.title} | Language Access Hub</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../../../css/main.css?v=2">
${STYLE}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": ${JSON.stringify(p.title)},
  "description": ${JSON.stringify(p.description)},
  "url": "${url}",
  "datePublished": "${p.date}",
  "dateModified": "${p.date}",
  "author": { "@type": "Organization", "name": "Language Access Hub \\u2014 Powered by Taika Translations", "url": "https://teamtaika.com" },
  "publisher": { "@type": "Organization", "name": "Language Access Hub \\u2014 Powered by Taika Translations", "url": "https://teamtaika.com" },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "${url}" }
}
</script>
</head>
<body>
<!-- @nav -->

<div style="background:var(--navy-deep);"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/index.html">Home</a><span class="breadcrumb-sep">&rsaquo;</span><a href="/blog">Blog</a><span class="breadcrumb-sep">&rsaquo;</span><span class="breadcrumb-current">${CAT}</span></nav></div>
<section class="post-hero">
  <div style="max-width:760px;margin:0 auto;padding:0 24px;">
    <span class="post-cat">${CAT}</span>
    <h1 class="post-title">${p.title}</h1>
    <div class="post-meta"><strong>${AUTHOR}</strong><span>&middot;</span>${p.dateDisplay}<span>&middot;</span>${p.readTime} min read</div>
  </div>
</section>
<div class="post-inner">
  <div class="post-body">
    <p>${p.intro}</p>
    ${ANSWER(p.answer)}
    ${p.body}
    ${INLINE_CTA(p.inlineCta)}
    ${p.body2 || ""}
  </div>
  <div class="post-cta">
    <h3>Need help with Section 508 or WCAG compliance?</h3>
    <p>Our team remediates documents, websites, and video for government agencies, school districts, and healthcare organizations across all 50 states. GSA &amp; NASPO contracts available.</p>
    <a href="/index.html#quote" class="btn-primary">Get a Free Quote &rarr;</a>
  </div>
  <div class="post-related">
    <h3>More from the blog</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">${p.related.map(relatedCard).join("")}</div>
  </div>
</div>

<!-- @footer -->
</body>
</html>
`;
}

const POSTS = [
  {
    slug: "section-508-vs-wcag-difference",
    date: "2026-08-26", dateDisplay: "August 26, 2026", readTime: 7,
    title: "Section 508 vs. WCAG vs. ADA: Which Accessibility Standard Applies to You?",
    description: "Section 508, WCAG, and the ADA are constantly confused. Here is what each one actually is, how they relate, and which standard your organization is legally required to meet.",
    intro: "“Section 508,” “WCAG,” and “ADA” get used interchangeably in accessibility conversations — but they are three different things, and knowing which one applies to you is the first step to compliance. One is a set of technical guidelines. The others are laws. Here is how they fit together.",
    answer: "<strong>WCAG</strong> (Web Content Accessibility Guidelines) is the technical standard — the testable checklist, published by the W3C, that defines what “accessible” means. <strong>Section 508</strong> is a federal law requiring federal agencies and federally funded programs to make their information technology accessible, and it adopts WCAG 2.0 Level AA as its technical benchmark. The <strong>ADA</strong> is the civil-rights law that prohibits disability discrimination; under its Title II web rule, state and local governments must meet WCAG 2.1 Level AA by {{ADA_DEADLINE_LARGE}} (large entities) and {{ADA_DEADLINE_SMALL}} (smaller entities and special districts). In short: the ADA and Section 508 are the <em>laws</em> that say you must be accessible; WCAG is the <em>how</em> that everyone points to.",
    body: `<h2>WCAG: the technical standard everyone references</h2>
<p>The Web Content Accessibility Guidelines are maintained by the World Wide Web Consortium (W3C). They are organized around four principles — content must be <strong>Perceivable, Operable, Understandable, and Robust</strong> (POUR) — and broken into testable “success criteria” at three conformance levels: A (minimum), AA (the legal target almost everywhere), and AAA (aspirational). When a law requires “accessibility,” it almost always does so by pointing at a specific WCAG version and level. WCAG itself is not a law; it is the ruler the laws measure against.</p>
<h2>Section 508: the federal IT law</h2>
<p>Section 508 of the Rehabilitation Act requires federal agencies to make their electronic and information technology — websites, documents, software, kiosks, and more — accessible to people with disabilities. The 2018 “508 Refresh” aligned the technical requirements with WCAG 2.0 Level AA. If you are a federal agency, or you sell IT to one, or you run a program funded by federal dollars that flow through a 508-obligated entity, Section 508 is your standard.</p>
<h2>The ADA: the civil-rights law with the biggest reach</h2>
<p>The Americans with Disabilities Act prohibits discrimination on the basis of disability. Two titles matter for the web:</p>
<ul>
<li><strong>Title II</strong> covers state and local governments. In 2024 the Department of Justice published a rule adopting WCAG 2.1 Level AA as the required standard for their websites and mobile apps, with compliance dates of {{ADA_DEADLINE_LARGE}} and {{ADA_DEADLINE_SMALL}}.</li>
<li><strong>Title III</strong> covers private businesses that are “places of public accommodation.” There is no numeric web regulation here yet, but courts have repeatedly treated WCAG 2.1 AA as the practical benchmark in accessibility lawsuits.</li>
</ul>
<h2>Which standard applies to you?</h2>
<ul>
<li><strong>Federal agency or contractor:</strong> Section 508 → WCAG 2.0 AA (build to 2.1 AA to stay ahead).</li>
<li><strong>State or local government (agency, city, county, school district, special district):</strong> ADA Title II → WCAG 2.1 AA by the deadlines above.</li>
<li><strong>Healthcare provider receiving federal funds:</strong> Section 1557 of the ACA and Section 504 of the Rehabilitation Act — the HHS Section 504 digital-accessibility deadline is {{SEC504_DEADLINE}}.</li>
<li><strong>Private business:</strong> ADA Title III — no fixed regulation, but WCAG 2.1 AA is the defensible target.</li>
</ul>
<h2>The good news: they converge</h2>
<p>You do not have to reconcile three different rulebooks. Whatever your obligation, the practical answer is the same: <strong>conform to WCAG 2.1 Level AA, document the work, and keep it current.</strong> Meeting WCAG 2.1 AA satisfies Section 508's 2.0 AA baseline and the ADA Title II standard simultaneously. Build to that target once and you have covered every version of the requirement.</p>`,
    inlineCta: "<strong>Not sure which standard governs your organization — or how far your current site is from it?</strong> We assess your websites and document libraries against WCAG 2.1 AA and give you a prioritized, documented remediation plan.",
    related: [
      { href: "/blog/wcag-ada-compliance-tips", cat: "Digital Accessibility", title: "5 WCAG 2.1 Fixes Every Government Website Needs Right Now", date: "May 28, 2026" },
      { href: "/blog/ada-title-ii-web-rule-deadline-guide", cat: "Digital Accessibility", title: "The ADA Title II Web Rule: Deadlines, Who's Covered, and Where to Start", date: "August 25, 2026" },
    ],
  },
  {
    slug: "ada-title-ii-web-rule-deadline-guide",
    date: "2026-08-25", dateDisplay: "August 25, 2026", readTime: 8,
    title: "The ADA Title II Web Rule: Deadlines, Who's Covered, and Where to Start",
    description: "The DOJ's ADA Title II web rule makes WCAG 2.1 AA mandatory for state and local governments. Here are the deadlines, exactly who is covered, what content is included, and how to start.",
    intro: "In 2024 the U.S. Department of Justice finalized a rule that, for the first time, sets a specific, enforceable technical standard for state and local government websites and mobile apps. If you work for a government agency, city, county, school district, or special district, this rule almost certainly applies to you — and the clock is running.",
    answer: "The ADA Title II web rule requires state and local governments to conform to <strong>WCAG 2.1 Level AA</strong> for their websites and mobile apps. Entities serving <strong>50,000 or more people</strong> must comply by <strong>{{ADA_DEADLINE_LARGE}}</strong>; smaller entities and <strong>special district governments</strong> by <strong>{{ADA_DEADLINE_SMALL}}</strong>. The rule covers web content and mobile apps the entity provides or uses — including PDFs and, in most cases, third-party content that is part of a government service. A documented audit and remediation plan is your best evidence of good-faith effort.",
    body: `<h2>What the rule actually requires</h2>
<p>The standard is <strong>WCAG 2.1 Level AA</strong>. That means your web content and mobile applications must satisfy every Level A and Level AA success criterion — covering color contrast, keyboard operability, text alternatives, captions, form labels, consistent navigation, and dozens of other testable requirements. This is not “make a reasonable effort”; it is a specific, measurable conformance target.</p>
<h2>Who is covered, and by when</h2>
<ul>
<li><strong>Entities serving 50,000+ population:</strong> compliance by <strong>{{ADA_DEADLINE_LARGE}}</strong>.</li>
<li><strong>Entities serving fewer than 50,000, plus special district governments:</strong> compliance by <strong>{{ADA_DEADLINE_SMALL}}</strong>.</li>
</ul>
<p>“State and local government” is broad: state agencies, counties, cities, towns, public school districts, public colleges and universities, courts, transit authorities, water and library districts, and other special-purpose districts are all Title II entities.</p>
<h2>What content is included</h2>
<p>The rule reaches further than most people expect:</p>
<ul>
<li>Your public website and every page on it.</li>
<li>Mobile apps you offer to the public.</li>
<li><strong>PDFs and other documents</strong> — benefit forms, agendas, policies, permits, and reports are all “web content.” This is where most agencies have the largest backlog.</li>
<li>Third-party content that is used to provide a government service (for example, an online payment or permitting portal).</li>
</ul>
<h2>The limited exceptions</h2>
<p>There are narrow exceptions — do not treat them as loopholes. They include certain <strong>archived web content</strong> (kept only for reference, not currently used), <strong>pre-existing electronic documents</strong> that are not used to apply for or access a service, content posted by third parties who are not under the entity's control, and individualized documents about a specific person that are password-protected. Everything that helps a member of the public access a program, service, or activity is in scope.</p>`,
    inlineCta: "<strong>Have thousands of PDFs and no inventory of which ones fail?</strong> We remediate and tag document libraries at scale and document the work so it stands up as evidence of good-faith progress toward the deadline.",
    body2: `<h2>Where to start (a five-step plan)</h2>
<ol>
<li><strong>Inventory.</strong> List your websites, apps, and document libraries. You cannot remediate what you have not counted.</li>
<li><strong>Audit.</strong> Run automated scans, then manual keyboard and screen-reader testing, and map every finding to a WCAG 2.1 AA criterion.</li>
<li><strong>Prioritize.</strong> Fix the content that gates access to services first — the online forms, benefit applications, and high-traffic pages — then work down by impact.</li>
<li><strong>Remediate.</strong> Fix the site, tag the documents, caption the video, and re-test.</li>
<li><strong>Document.</strong> Keep records of your audit, your plan, and your progress. If a complaint arrives, that paper trail is your strongest defense.</li>
</ol>
<h2>Why documentation matters as much as the fixes</h2>
<p>Enforcement rarely punishes an organization that is demonstrably working the problem. It targets the ones with no plan, no audit, and no records. Even a documented automated scan paired with a written remediation schedule shows good-faith effort. Start the paper trail now — well before {{ADA_DEADLINE_LARGE}}.</p>`,
    related: [
      { href: "/blog/section-508-vs-wcag-difference", cat: "Digital Accessibility", title: "Section 508 vs. WCAG vs. ADA: Which Standard Applies to You?", date: "August 26, 2026" },
      { href: "/blog/website-accessibility-audit-guide", cat: "Digital Accessibility", title: "How to Run a Website Accessibility Audit (508 & WCAG)", date: "August 18, 2026" },
    ],
  },
  {
    slug: "accessible-word-documents-508",
    date: "2026-08-22", dateDisplay: "August 22, 2026", readTime: 7,
    title: "How to Create 508-Compliant Word Documents (Before They Become PDFs)",
    description: "Most inaccessible government PDFs start as inaccessible Word documents. Here is how to build accessibility into the source file so your exported PDF is compliant from the start.",
    intro: "Almost every inaccessible government PDF began life as a Word document that was never built for accessibility. Fixing structure in the source Word file takes minutes; remediating the exported PDF afterward can take hours per document. If your team creates its own forms, reports, and notices, this is the highest-leverage accessibility habit you can adopt.",
    answer: "To make a Word document 508-compliant, build structure into the source: use the built-in <strong>heading styles</strong> (not bold text) for hierarchy, add <strong>alt text</strong> to every meaningful image, use real <strong>table headers</strong> with no merged or split cells, create lists with the <strong>list buttons</strong>, write <strong>descriptive link text</strong>, ensure <strong>4.5:1 color contrast</strong>, set the document <strong>title and language</strong> in Properties, run the built-in <strong>Accessibility Checker</strong>, and export to a <strong>tagged PDF</strong>. Done in Word, this is roughly ten times cheaper than remediating the PDF later.",
    body: `<h2>1. Use real heading styles</h2>
<p>Screen-reader users navigate by heading, jumping from section to section the way sighted readers skim. That only works if your headings are actual Word styles — Heading 1, Heading 2, Heading 3 — applied from the Styles gallery, not text you made big and bold. Use one Heading 1 for the title, then nest 2s and 3s logically without skipping levels.</p>
<h2>2. Add alt text to images</h2>
<p>Right-click any image → <em>View Alt Text</em> and write a concise description of what the image communicates. If the image is purely decorative, mark it as decorative so screen readers skip it. For a chart, describe the data or trend — not “bar chart.”</p>
<h2>3. Build tables the right way</h2>
<p>Use Word's <em>Insert Table</em> tool, designate a header row (Table Design → Header Row, and Table Layout → Repeat Header Rows), and — critically — <strong>never merge or split cells</strong>. Merged cells destroy the row/column relationships a screen reader relies on. Keep tables for tabular data only; do not use them to lay out a page.</p>
<h2>4. Make lists real lists</h2>
<p>Use the bulleted and numbered list buttons rather than typing dashes or numbers by hand. A real list tells assistive technology “this is a list of five items,” which a row of manual hyphens does not.</p>
<h2>5. Write descriptive link text</h2>
<p>“Click here” and a raw URL are both barriers. A screen-reader user often pulls up a list of every link on the page; out of context, “click here” means nothing. Write links that describe their destination, like “download the 2026 benefits enrollment form.”</p>
<h2>6. Check color and contrast</h2>
<p>Body text needs a contrast ratio of at least 4.5:1 against its background (3:1 for large text). And never use color <em>alone</em> to convey meaning — if “red means overdue,” add a word or symbol so colorblind readers get the same information.</p>
<h2>7. Set the document properties</h2>
<p>In File → Info, give the document a real <strong>Title</strong>, and confirm the <strong>editing language</strong> is set correctly (Review → Language). These become the PDF's title and language attributes, both of which screen readers announce.</p>`,
    inlineCta: "<strong>Sitting on a library of legacy Word and PDF documents that were never built this way?</strong> We remediate and tag documents at scale — and train your team to author accessibly so the backlog stops growing.",
    body2: `<h2>8. Run the built-in Accessibility Checker</h2>
<p>Word ships with a checker: <em>Review → Check Accessibility</em>. It flags missing alt text, bad table structure, low contrast, and more, with inline fix suggestions. Run it before every export and clear the errors. It is not a complete audit — it cannot judge whether your alt text is <em>good</em> — but it catches the mechanical failures.</p>
<h2>9. Export to a tagged PDF correctly</h2>
<p>When you save as PDF, use <em>File → Save As → PDF</em> (or Export) and make sure “Document structure tags for accessibility” is enabled in the options. Never “print to PDF” — that flattens the document and strips every tag you just built, leaving a file a screen reader cannot read. A properly exported tagged PDF carries your headings, alt text, table structure, and reading order straight through.</p>
<h2>The payoff</h2>
<p>Every one of these steps takes seconds while you are already in the document. Skip them, and each file becomes a remediation project later — multiplied across the hundreds or thousands of documents a public agency publishes. Author it right once, and accessibility becomes a byproduct of normal work instead of a separate, expensive cleanup.</p>`,
    related: [
      { href: "/blog/pdf-remediation-guide", cat: "Digital Accessibility", title: "How to Make Your PDFs Section 508 Compliant: A Step-by-Step Guide", date: "May 20, 2026" },
      { href: "/blog/wcag-ada-compliance-tips", cat: "Digital Accessibility", title: "5 WCAG 2.1 Fixes Every Government Website Needs Right Now", date: "May 28, 2026" },
    ],
  },
  {
    slug: "wcag-2-1-vs-2-2-whats-new",
    date: "2026-08-20", dateDisplay: "August 20, 2026", readTime: 7,
    title: "WCAG 2.1 vs. 2.2: What Changed and What It Means for Your Compliance",
    description: "WCAG 2.2 added nine new success criteria and removed one. Here is exactly what changed, which version the law requires, and why you should build to 2.2 anyway.",
    intro: "WCAG 2.2 became a W3C Recommendation in October 2023, and it raises a fair question for anyone chasing compliance: which version do I actually have to meet, and how different is the newer one? The short version — the law still points at 2.1, but 2.2 is where accessibility is heading, and building to it now is straightforward.",
    answer: "WCAG 2.2 adds <strong>nine new success criteria</strong> to 2.1 and removes one obsolete criterion (4.1.1 Parsing). Six of the additions are at Level A or AA — the legally relevant levels — covering focus visibility, dragging alternatives, minimum target size, consistent help, redundant entry, and accessible authentication. WCAG 2.2 is <strong>backward compatible</strong>: meeting 2.2 AA means you also meet 2.1 AA. The ADA Title II rule currently references <strong>WCAG 2.1 AA</strong>, so that is the binding legal target today — but 2.2 is the direction of travel, and its new criteria are common-sense fixes worth adopting now.",
    body: `<h2>A quick version history</h2>
<p>WCAG 2.0 arrived in 2008 and is still the benchmark Section 508 cites. WCAG 2.1 (2018) added 17 criteria, mostly for mobile, low vision, and cognitive accessibility — and it is the version the ADA Title II rule adopts. WCAG 2.2 (2023) is the latest, adding nine more criteria that reflect what a decade of real-world testing revealed. Each version is additive: 2.2 contains everything in 2.1, which contains everything in 2.0.</p>
<h2>The new Level A and AA criteria in 2.2</h2>
<p>These six are the ones that matter for legal conformance:</p>
<ul>
<li><strong>2.4.11 Focus Not Obscured (Minimum) – AA:</strong> when an element receives keyboard focus, it can't be completely hidden behind a sticky header, cookie banner, or chat widget.</li>
<li><strong>2.5.7 Dragging Movements – AA:</strong> anything you operate by dragging (sliders, drag-and-drop) must also work with a simple tap or click, for users who can't drag precisely.</li>
<li><strong>2.5.8 Target Size (Minimum) – AA:</strong> interactive targets must be at least 24×24 CSS pixels (with spacing exceptions), so buttons and links aren't too small to hit reliably.</li>
<li><strong>3.2.6 Consistent Help – A:</strong> if you offer help (a contact link, phone number, chat), it appears in a consistent place across pages.</li>
<li><strong>3.3.7 Redundant Entry – A:</strong> don't force users to re-enter information they already provided in the same process — auto-populate or let them select it.</li>
<li><strong>3.3.8 Accessible Authentication (Minimum) – AA:</strong> login can't depend on a cognitive test like remembering a password or solving a puzzle CAPTCHA without an accessible alternative (e.g., allow password managers, offer email links).</li>
</ul>
<h2>The one removal: 4.1.1 Parsing</h2>
<p>WCAG 2.2 formally removes success criterion 4.1.1 (Parsing), which required valid HTML parsing. Modern browsers and assistive technologies handle malformed markup gracefully, so the criterion no longer reflected real barriers. It is marked as always satisfied — you don't need to test for it anymore.</p>`,
    inlineCta: "<strong>Not sure whether your site clears 2.1 AA, let alone 2.2?</strong> We audit against the exact success criteria that apply to you and hand you a prioritized, documented remediation plan.",
    body2: `<h2>Which version do you legally have to meet?</h2>
<p>Today, the binding standards point at 2.1 AA (ADA Title II) or 2.0 AA (Section 508). No U.S. regulation yet mandates 2.2. So if you are racing a deadline, <strong>2.1 AA is the requirement</strong> — do not let “but there's a 2.2 now” distract you from clearing the criteria you are actually measured against.</p>
<h2>Why build to 2.2 anyway</h2>
<p>Two reasons. First, the 2.2 additions are cheap, sensible fixes — bigger tap targets, help in a consistent spot, login that doesn't punish people — that improve the experience for everyone, not just users with disabilities. Second, standards only move forward; the next time a regulation updates, it will reference 2.2 (or later). Building to 2.2 AA now means you satisfy every current legal requirement <em>and</em> you are ready for the next one, with no rework. Since 2.2 is backward compatible, there is no downside to aiming a little higher.</p>`,
    related: [
      { href: "/blog/wcag-ada-compliance-tips", cat: "Digital Accessibility", title: "5 WCAG 2.1 Fixes Every Government Website Needs Right Now", date: "May 28, 2026" },
      { href: "/blog/section-508-vs-wcag-difference", cat: "Digital Accessibility", title: "Section 508 vs. WCAG vs. ADA: Which Standard Applies to You?", date: "August 26, 2026" },
    ],
  },
  {
    slug: "website-accessibility-audit-guide",
    date: "2026-08-18", dateDisplay: "August 18, 2026", readTime: 9,
    title: "How to Run a Website Accessibility Audit (Section 508 & WCAG): A Step-by-Step Guide",
    description: "Automated scanners catch only a third of accessibility problems. Here is how to run a real Section 508 / WCAG audit that combines automated, keyboard, and screen-reader testing.",
    intro: "“We ran a scanner and it passed” is one of the most common — and most dangerous — things an organization can believe about its website. Automated tools are a useful first pass, but they catch only a fraction of what WCAG requires. A real audit combines four kinds of testing and ends in a documented, prioritized report. Here is how to run one.",
    answer: "A credible Section 508 / WCAG audit has four parts: <strong>(1) automated scanning</strong> with tools like WAVE or Axe, which catches roughly 30–40% of failures; <strong>(2) manual keyboard-only testing</strong> for focus order, visible focus, and keyboard traps; <strong>(3) screen-reader testing</strong> with NVDA or VoiceOver for reading order, labels, and dynamic content; and <strong>(4) document and media review</strong> for untagged PDFs and uncaptioned video. The deliverable is a report mapping every finding to a specific WCAG 2.1 AA success criterion, prioritized by user impact — and that document is itself evidence of good-faith effort.",
    body: `<h2>Step 1: Inventory your digital assets</h2>
<p>You cannot audit what you have not listed. Catalog your website's key page templates (home, landing, article, form, search results), any mobile apps, and your document libraries (PDFs, Word, PowerPoint). You do not test all 4,000 pages — you test each unique <em>template</em> and a representative sample, plus every high-traffic and service-critical page.</p>
<h2>Step 2: Run automated scans</h2>
<p>Tools like <strong>WAVE</strong>, <strong>Axe</strong>, and Lighthouse quickly flag missing alt text, low contrast, empty links, missing form labels, and structural problems. Run them on every template. But understand their ceiling: automated tools catch only about a third of WCAG failures because most criteria — “is this alt text meaningful?”, “is the focus order logical?” — require human judgment. A clean scan is the floor, not the finish line.</p>
<h2>Step 3: Test with the keyboard only</h2>
<p>Unplug your mouse. Using only <kbd>Tab</kbd>, <kbd>Shift+Tab</kbd>, <kbd>Enter</kbd>, <kbd>Space</kbd>, and arrow keys, try to complete every task on the page. Check that:</p>
<ul>
<li>You can reach and operate every interactive element — links, buttons, form fields, menus, and custom widgets.</li>
<li>The <strong>focus indicator is always visible</strong> so you can see where you are.</li>
<li>Focus order follows the visual/logical order of the page.</li>
<li>You never get <strong>trapped</strong> (stuck inside a widget or modal with no keyboard way out).</li>
<li>A <strong>skip link</strong> lets you jump past the navigation to the main content.</li>
</ul>
<h2>Step 4: Test with a screen reader</h2>
<p>Install <strong>NVDA</strong> (free, Windows) or use <strong>VoiceOver</strong> (built into Mac and iOS); JAWS is the enterprise standard on Windows. Navigate the page by headings, by links, and by form fields. Listen for: are headings announced in a sensible hierarchy? Do images convey useful information or just read a filename? Are form fields announced with their labels and required state? When content updates dynamically (an error message, a live search result), is the change announced? This is where the majority of real barriers surface.</p>`,
    inlineCta: "<strong>Don't have the tools, time, or trained testers in-house?</strong> We run full Section 508 / WCAG 2.1 AA audits — automated, keyboard, and screen-reader — and deliver a prioritized report your procurement file can stand on.",
    body2: `<h2>Step 5: Review documents and media</h2>
<p>Your PDFs are web content under the ADA Title II rule. Check a representative sample for tags, reading order, and alt text — our <a href="/pdf-accessibility-checker">free PDF Accessibility Checker</a> is a fast first pass. For video, confirm accurate (not auto-generated) captions, and audio description where visual information isn't spoken aloud.</p>
<h2>Step 6: Write the report</h2>
<p>Turn findings into an action plan. For each issue, record: the <strong>WCAG success criterion</strong> it violates, the <strong>severity/user impact</strong>, where it occurs, and how to fix it. Then <strong>prioritize</strong> — fix the barriers that block access to services (online forms, applications, high-traffic pages) first, then work down. A findings list mapped to WCAG is what turns “we should be accessible” into a schedule someone can execute.</p>
<h2>Step 7: Remediate, re-test, and keep records</h2>
<p>Fix, then verify each fix with the same manual methods — automated re-scans alone won't confirm a keyboard or screen-reader repair. And keep the paper trail: your audit, your plan, your progress. Accessibility is not a one-time project; every new page, PDF, and video is a new opportunity to regress, so bake a check into your publishing workflow. The documented, ongoing effort is exactly what regulators look for.</p>`,
    related: [
      { href: "/blog/screen-reader-keyboard-testing-guide", cat: "Digital Accessibility", title: "Screen Reader & Keyboard Testing: The Checks Automated Tools Miss", date: "August 13, 2026" },
      { href: "/blog/ada-title-ii-web-rule-deadline-guide", cat: "Digital Accessibility", title: "The ADA Title II Web Rule: Deadlines, Who's Covered, and Where to Start", date: "August 25, 2026" },
    ],
  },
  {
    slug: "accessibility-statement-guide",
    date: "2026-08-15", dateDisplay: "August 15, 2026", readTime: 6,
    title: "How to Write an Accessibility Statement That Actually Helps You",
    description: "An accessibility statement demonstrates good-faith effort and gives users a path to accommodation. Here is what to include, what to avoid, and why overclaiming is a liability.",
    intro: "An accessibility statement is a short, public page that tells visitors what you are doing to make your site accessible, how far along you are, and how to get help if they hit a barrier. It is not legally required — but a good one is one of the cheapest, highest-value things you can publish, and a careless one can actually work against you.",
    answer: "An effective accessibility statement names your <strong>conformance target</strong> (e.g., “we aim to conform to WCAG 2.1 Level AA”), describes the <strong>scope</strong> it covers, states your <strong>current status</strong> honestly, lists <strong>known limitations</strong>, and gives a <strong>feedback channel</strong> — an email or phone number — so users can report barriers or request an accessible version. Include the <strong>date</strong> it was last reviewed. The single biggest mistake is <strong>overclaiming</strong>: stating you are “fully compliant” when you are not hands a plaintiff a written admission. Be accurate, show effort, and give people a way to reach a human.",
    body: `<h2>Why publish one at all?</h2>
<p>Two reasons. First, it demonstrates <strong>good-faith effort</strong> — a public commitment to a specific standard, with a record of progress, is exactly the posture regulators and courts look on favorably. Second, and more importantly, it gives a real person who hits a real barrier a <strong>path to help</strong>: a way to report the problem and request the information in a format they can use. That accommodation channel is often what turns a frustrated user into a resolved issue instead of a complaint.</p>
<h2>What to include</h2>
<ul>
<li><strong>Your commitment and standard.</strong> Name the target explicitly — “We are working to conform to WCAG 2.1 Level AA.”</li>
<li><strong>Scope.</strong> What the statement covers (your main website; note if certain subsites or third-party tools are excluded).</li>
<li><strong>Current status.</strong> Honest and specific: “partially conformant — some content does not yet fully meet the standard,” not a blanket “fully accessible.”</li>
<li><strong>Known limitations.</strong> Name the gaps you are aware of (e.g., “some older PDFs are not yet tagged”) and that you are working on them.</li>
<li><strong>Feedback and contact.</strong> An email and phone number monitored by a real person, with a commitment to respond and to provide accessible alternatives on request.</li>
<li><strong>Date.</strong> When the statement was last reviewed — a stale statement signals a stale program.</li>
</ul>`,
    inlineCta: "<strong>Want your statement backed by a real audit instead of aspiration?</strong> We assess your site against WCAG 2.1 AA and give you the documented status your accessibility statement should honestly reflect.",
    body2: `<h2>What NOT to do</h2>
<p><strong>Do not overclaim.</strong> “Our website is fully ADA compliant” or “100% WCAG conformant” is, for almost every real site, untrue — and a written, public overstatement is a gift to anyone considering a complaint. Claim the target you are working toward and the honest status you are at.</p>
<p><strong>Do not treat an overlay widget as compliance.</strong> The pop-up “accessibility” toolbars that promise instant conformance do not fix the underlying code, are frequently criticized by actual assistive-technology users, and have themselves been named in lawsuits. An overlay is not a substitute for real remediation, and your statement should not lean on one.</p>
<p><strong>Do not bury it.</strong> Link the statement from your footer on every page so it is easy to find — the person who needs it most is the person hitting a barrier right now.</p>
<h2>Keep it current</h2>
<p>An accessibility statement is a living document. Revisit it whenever you complete a remediation milestone, redesign a template, or change your conformance target, and update the review date each time. A statement that honestly tracks a real, ongoing program is an asset; one that was written once and forgotten is just another stale page.</p>`,
    related: [
      { href: "/blog/wcag-ada-compliance-tips", cat: "Digital Accessibility", title: "5 WCAG 2.1 Fixes Every Government Website Needs Right Now", date: "May 28, 2026" },
      { href: "/blog/website-accessibility-audit-guide", cat: "Digital Accessibility", title: "How to Run a Website Accessibility Audit (508 & WCAG)", date: "August 18, 2026" },
    ],
  },
  {
    slug: "screen-reader-keyboard-testing-guide",
    date: "2026-08-13", dateDisplay: "August 13, 2026", readTime: 8,
    title: "Screen Reader and Keyboard Testing: The Accessibility Checks Automated Tools Miss",
    description: "Automated scanners catch only about a third of WCAG failures. The rest need manual keyboard and screen-reader testing. Here is how to do it, and what it reveals.",
    intro: "If your accessibility program stops at an automated scan, you are catching roughly a third of the problems and shipping the rest. The failures that most affect real users — illogical focus order, meaningless alt text, unlabeled controls, dynamic updates that go unannounced — are precisely the ones a scanner can't judge. Manual testing is where those live. Here is how to do it without being an expert.",
    answer: "Automated tools catch only about <strong>30–40% of WCAG failures</strong> because most criteria require human judgment. Two manual methods close the gap. <strong>Keyboard-only testing</strong> — navigating with Tab, Enter, Space, and arrow keys — reveals broken focus order, invisible focus indicators, keyboard traps, and controls you can't reach. <strong>Screen-reader testing</strong> with NVDA (free, Windows) or VoiceOver (built into Mac) reveals poor heading structure, unhelpful alt text, unlabeled form fields, and dynamic content that never gets announced. Together they surface the barriers that actually stop people — the ones a passing scan hides.",
    body: `<h2>Why automated tools aren't enough</h2>
<p>Scanners are excellent at the mechanical, yes/no checks: is there an <code>alt</code> attribute, is the contrast ratio a number above 4.5:1, does this input have a programmatic label. They are useless at the judgment calls that make up most of WCAG: is the alt text <em>meaningful</em>? Does the focus order make <em>sense</em>? Is this custom dropdown <em>operable</em> and correctly announced? Studies consistently put automated coverage around a third of all failures. The other two-thirds are found by people.</p>
<h2>Keyboard-only testing (start here)</h2>
<p>It requires no software — just put your mouse away. Using only the keyboard, work through each page:</p>
<ul>
<li><strong>Tab through everything.</strong> Every link, button, field, and widget should be reachable and operable. Anything you can click with a mouse but can't reach with Tab is a failure.</li>
<li><strong>Watch the focus indicator.</strong> You must always be able to see which element has focus. An invisible focus ring is one of the most common — and most disabling — defects.</li>
<li><strong>Check the order.</strong> Focus should move in a logical order that matches the visual layout, not jump around unpredictably.</li>
<li><strong>Escape every trap.</strong> Open a menu, a modal, a date picker — can you get back out with the keyboard, or are you stuck? Keyboard traps strand users completely.</li>
<li><strong>Find the skip link.</strong> Pressing Tab on a fresh page load should reveal a “skip to main content” link so keyboard users don't tab through the whole nav on every page.</li>
</ul>
<h2>Screen-reader testing (the deeper pass)</h2>
<p>You do not need to be a daily screen-reader user to catch the big problems. Install <strong>NVDA</strong> (free on Windows) or turn on <strong>VoiceOver</strong> (Cmd+F5 on Mac); <strong>JAWS</strong> is the paid enterprise standard. Then listen your way through the page:</p>
<ul>
<li><strong>Headings:</strong> pull up the heading list — is there a logical H1→H2→H3 outline, or are headings missing or out of order?</li>
<li><strong>Links:</strong> do they make sense out of context, or is it a wall of “click here” and “read more”?</li>
<li><strong>Images:</strong> is each meaningful image described usefully, and are decorative images silent?</li>
<li><strong>Forms:</strong> is every field announced with its label and its required state? Are errors read aloud and tied to the field?</li>
<li><strong>Dynamic content:</strong> when something changes without a page reload — a search result, an error, a “saved” confirmation — is it announced, or does it happen silently? This usually requires correct ARIA live regions.</li>
</ul>`,
    inlineCta: "<strong>No screen-reader expertise on the team?</strong> Our testers run full manual keyboard and screen-reader audits against WCAG 2.1 AA and hand you findings mapped to each success criterion — not just a scanner printout.",
    body2: `<h2>The failures manual testing reliably finds</h2>
<p>Across real audits, the same human-only defects recur: focus indicators removed in CSS; custom “buttons” built from <code>&lt;div&gt;</code>s that a screen reader never announces as buttons; modals that don't move focus or trap it; form errors shown only in red with no text and no announcement; carousels and dropdowns that can't be operated by keyboard; and alt text that reads “DSC_0421.jpg.” None of these reliably trip an automated scan — all of them stop a real user cold.</p>
<h2>Build it into your workflow</h2>
<p>You do not need a full audit for every change. Adopt a lightweight habit: for any new template or interactive component, do a five-minute keyboard pass and a quick screen-reader listen before it ships. Reserve the deep, documented audit for launches, redesigns, and your periodic compliance review. The combination — automated scans for coverage, manual testing for truth — is what actually keeps a site accessible over time, and what stands up as good-faith effort if anyone asks.</p>`,
    related: [
      { href: "/blog/website-accessibility-audit-guide", cat: "Digital Accessibility", title: "How to Run a Website Accessibility Audit (508 & WCAG)", date: "August 18, 2026" },
      { href: "/blog/wcag-2-1-vs-2-2-whats-new", cat: "Digital Accessibility", title: "WCAG 2.1 vs. 2.2: What Changed and What It Means for Compliance", date: "August 20, 2026" },
    ],
  },
];

for (const p of POSTS) writeFileSync(join(OUT, `${p.slug}.html`), render(p), "utf8");
console.log(`Generated ${POSTS.length} blog posts -> pages/resources/blog/`);
POSTS.forEach((p) => console.log("  /blog/" + p.slug + "  (" + p.dateDisplay + ")"));

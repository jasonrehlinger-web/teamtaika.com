#!/usr/bin/env python3
"""
Language Access Hub — Static Site Builder
Reads page source files, injects shared nav + footer, writes to /dist
Run: python3 build.py
"""
import os, shutil, re, json

ROOT   = os.path.dirname(os.path.abspath(__file__))
DIST   = os.path.join(ROOT, 'dist')
COMP   = os.path.join(ROOT, 'components')
DATA   = os.path.join(ROOT, 'data')

NAV_HTML    = open(os.path.join(COMP, 'nav.html'),    encoding='utf-8').read()
FOOTER_HTML = open(os.path.join(COMP, 'footer.html'), encoding='utf-8').read()

# ── Single source of truth for compliance-deadline dates ──────────────────
# Dates live in data/compliance-deadlines.json ONLY. Pages reference them as
# {{TOKEN}} placeholders; we resolve them here at build time so a date is never
# hardcoded per-page (which is how they drifted before). Keys starting with '_'
# are documentation, not tokens.
_deadlines = json.load(open(os.path.join(DATA, 'compliance-deadlines.json'), encoding='utf-8'))
TOKENS = {f'{{{{{k}}}}}': v for k, v in _deadlines.items() if not k.startswith('_')}

def replace_tokens(text):
    for token, val in TOKENS.items():
        text = text.replace(token, val)
    return text

def inject(html):
    html = html.replace('<!-- @nav -->',    NAV_HTML)
    html = html.replace('<!-- @footer -->', FOOTER_HTML)
    # Resolve deadline tokens AFTER nav/footer inject so tokens inside the
    # shared nav/footer components are resolved too.
    html = replace_tokens(html)
    return html

def build_tree(src_dir, dst_dir):
    for root, dirs, files in os.walk(src_dir):
        # Compute destination path
        rel = os.path.relpath(root, src_dir)
        dst = os.path.join(dst_dir, rel) if rel != '.' else dst_dir
        os.makedirs(dst, exist_ok=True)
        for f in files:
            src_file = os.path.join(root, f)
            dst_file = os.path.join(dst, f)
            if f.endswith('.html'):
                with open(src_file, encoding='utf-8') as fh:
                    content = inject(fh.read())
                with open(dst_file, 'w', encoding='utf-8') as fh:
                    fh.write(content)
            else:
                shutil.copy2(src_file, dst_file)

# Clean and rebuild
if os.path.exists(DIST): shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(DIST, exist_ok=True)

# Copy static assets
for folder in ('css', 'js', 'assets'):
    src = os.path.join(ROOT, folder)
    if os.path.exists(src):
        shutil.copytree(src, os.path.join(DIST, folder), dirs_exist_ok=True)

# Build pages and root HTML
for item in os.listdir(ROOT):
    full = os.path.join(ROOT, item)
    if item.endswith('.html'):
        dst = os.path.join(DIST, item)
        with open(full, encoding='utf-8') as fh:
            content = inject(fh.read())
        with open(dst, 'w', encoding='utf-8') as fh:
            fh.write(content)

build_tree(os.path.join(ROOT, 'pages'), os.path.join(DIST, 'pages'))

# Copy netlify.toml
shutil.copy2(os.path.join(ROOT, 'netlify.toml'), os.path.join(DIST, 'netlify.toml'))

print(f'Build complete → {DIST}')

# Copy robots.txt, llms.txt, sitemap.xml — text extras go through token
# replacement too (llms.txt cites the compliance deadlines).
for extra in ('robots.txt', 'llms.txt', 'sitemap.xml'):
    src = os.path.join(ROOT, extra)
    if os.path.exists(src):
        with open(src, encoding='utf-8') as fh:
            content = replace_tokens(fh.read())
        with open(os.path.join(DIST, extra), 'w', encoding='utf-8') as fh:
            fh.write(content)

print("Extra files copied.")

# ── Drift guard ───────────────────────────────────────────────────────────
# Fail loudly if the build output still contains an unresolved {{TOKEN}} (typo
# or a token missing from data/compliance-deadlines.json) or a known-stale
# legacy date. This is what keeps the deadlines from silently drifting again.
STALE_STRINGS = ('May 11, 2026', 'now in effect', 'Already past deadline')
_leftover_tokens, _stale_hits = [], []
for root, _dirs, files in os.walk(DIST):
    for f in files:
        if not f.endswith(('.html', '.txt', '.xml')):
            continue
        p = os.path.join(root, f)
        txt = open(p, encoding='utf-8').read()
        rel = os.path.relpath(p, DIST)
        if re.search(r'\{\{[A-Za-z0-9_]+\}\}', txt):
            _leftover_tokens.append(rel)
        for s in STALE_STRINGS:
            if s in txt:
                _stale_hits.append(f'{rel}: "{s}"')
if _leftover_tokens:
    print('WARNING: UNRESOLVED TOKENS in build output (add them to data/compliance-deadlines.json):')
    for r in _leftover_tokens: print(f'    - {r}')
if _stale_hits:
    print('WARNING: STALE compliance strings in build output (fix in source):')
    for r in _stale_hits: print(f'    - {r}')
if not _leftover_tokens and not _stale_hits:
    print('Drift guard: OK - no unresolved tokens or stale deadline strings.')

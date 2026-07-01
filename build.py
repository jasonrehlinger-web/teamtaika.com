#!/usr/bin/env python3
"""
Language Access Hub — Static Site Builder
Reads page source files, injects shared nav + footer, writes to /dist
Run: python3 build.py
"""
import os, shutil, re

ROOT   = os.path.dirname(os.path.abspath(__file__))
DIST   = os.path.join(ROOT, 'dist')
COMP   = os.path.join(ROOT, 'components')

NAV_HTML    = open(os.path.join(COMP, 'nav.html'),    encoding='utf-8').read()
FOOTER_HTML = open(os.path.join(COMP, 'footer.html'), encoding='utf-8').read()

def inject(html):
    html = html.replace('<!-- @nav -->',    NAV_HTML)
    html = html.replace('<!-- @footer -->', FOOTER_HTML)
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

# Copy robots.txt, llms.txt, sitemap.xml
for extra in ('robots.txt', 'llms.txt', 'sitemap.xml'):
    src = os.path.join(ROOT, extra)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(DIST, extra))

print("Extra files copied.")

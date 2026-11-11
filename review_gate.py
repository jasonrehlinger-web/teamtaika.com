#!/usr/bin/env python3
"""
Publication review gate — the deploy-side half.

Jason, 2026-11-11: "If the agents can make mistakes, then you need to enforce
a reviewer agent that is mandatory for any publications."

build.py imports this module (one line, near the top). Netlify runs build.py on
every deploy, so this is the one place on this site where a claim check can
actually STOP a publication: a new or changed page with no passing content
review raises SystemExit here, and the deploy dies before anything is written
to dist/.

WHY THIS IS A SEPARATE MODULE AND NOT FOUR LINES INSIDE build.py
----------------------------------------------------------------
There is no Python on the machine the agents run on (verified 2026-11-11 — the
`python` command is the Microsoft Store shim), so this file CANNOT be tested
locally before it deploys. Code that cannot be tested must not be able to take
the site down.

A SyntaxError is raised when a FILE is compiled, so a try/except written inside
build.py could never catch a mistake in its own text. As a separate module it
can: build.py wraps `import review_gate` in `except Exception`, so anything
wrong with this file degrades to a printed warning and the deploy proceeds.

SystemExit is a BaseException, NOT an Exception, so it passes straight through
that same handler. That is the whole trick, and it gives exactly the asymmetry
we want:

    this file is broken   -> warning, site still deploys
    a page is unreviewed  -> SystemExit, deploy fails

Escape hatch: SKIP_REVIEW_GUARD=1 in the Netlify environment.
"""
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
GUARD = os.path.join(ROOT, 'scripts', 'check-publication-review.mjs')


def run():
    if os.environ.get('SKIP_REVIEW_GUARD') == '1':
        print('[review-guard] SKIPPED (SKIP_REVIEW_GUARD=1)')
        return

    if not os.path.exists(GUARD):
        print('WARNING: scripts/check-publication-review.mjs is missing — '
              'claims on new or changed pages were NOT checked.')
        return

    node = shutil.which('node')
    if not node:
        # A missing toolchain is an infrastructure problem, not a content
        # problem. It must never be the reason a live site stops deploying.
        print('WARNING: node not found — publication review gate SKIPPED. '
              'Claims on new or changed pages were NOT checked.')
        return

    result = subprocess.run([node, GUARD, ROOT])
    if result.returncode != 0:
        print('')
        print('BUILD STOPPED: a page would publish without a passing content '
              'review.')
        print('Run the content-reviewer subagent on each page named above, '
              'then build again.')
        sys.exit(1)


run()

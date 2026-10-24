/* ──────────────────────────────────────────────────────────────────────────
   countdown.js — live compliance-deadline countdown clocks
   ---------------------------------------------------------------------------
   Self-contained: injects its own CSS and animates any .deadline-countdown
   block on the page, so a page only needs the markup + one <script> tag.

   SINGLE SOURCE OF TRUTH for the dates stays data/compliance-deadlines.json —
   build.py resolves {{..._ISO}} tokens into each .dc-item[data-deadline] at
   build time, so this file never hardcodes a date.

   Accessibility (this runs on our ADA/508/WCAG pages — it must itself be
   accessible): the ticking figure is aria-hidden so screen readers are not
   spammed every second; the real, human-readable deadline date is kept as
   plain text in .dc-date for assistive tech. Honors prefers-reduced-motion by
   dropping to a once-a-minute update (no per-second churn).
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CSS =
    '.deadline-countdown{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));' +
      'max-width:1000px;margin:0 auto;}' +
    '.dc-item{background:var(--navy-deep,#0b1b3b);border:1px solid rgba(184,145,58,.35);' +
      'border-radius:14px;padding:20px 22px;text-align:center;color:#fff;}' +
    '.dc-item[data-urgent="1"]{border-color:#DC2626;box-shadow:0 0 0 1px rgba(220,38,38,.35) inset;}' +
    '.dc-title{display:block;font-family:var(--font-display,Georgia,serif);font-size:1.02rem;line-height:1.25;margin-bottom:2px;}' +
    '.dc-sub{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;' +
      'color:var(--gold,#B8913A);font-family:var(--font-mono,monospace);margin-bottom:12px;}' +
    '.dc-clock{display:flex;justify-content:center;gap:8px;margin-bottom:10px;}' +
    '.dc-unit{display:flex;flex-direction:column;align-items:center;min-width:52px;' +
      'background:rgba(255,255,255,.06);border-radius:8px;padding:8px 6px;}' +
    '.dc-num{font-family:var(--font-mono,monospace);font-size:1.7rem;font-weight:600;line-height:1;' +
      'color:#fff;font-variant-numeric:tabular-nums;}' +
    '.dc-label{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-top:5px;}' +
    '.dc-date{display:block;font-size:12.5px;color:rgba(255,255,255,.82);}' +
    '.dc-date strong{color:var(--gold,#B8913A);}' +
    '.dc-passed .dc-num{color:#F87171;}' +
    '@media (max-width:420px){.dc-unit{min-width:44px;}.dc-num{font-size:1.4rem;}}';

  function injectCss() {
    if (document.getElementById('dc-style')) return;
    var s = document.createElement('style');
    s.id = 'dc-style';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Parse "YYYY-MM-DD" to a Date at end-of-day local time (deadlines are a date,
  // not an instant — you have until the end of that day).
  function parseDeadline(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59, 999);
  }

  function buildClock(item) {
    var clock = item.querySelector('.dc-clock');
    if (clock) return clock;
    clock = document.createElement('div');
    clock.className = 'dc-clock';
    clock.setAttribute('aria-hidden', 'true'); // real date lives in .dc-date for AT
    ['Days', 'Hrs', 'Min', 'Sec'].forEach(function (lbl) {
      var u = document.createElement('div');
      u.className = 'dc-unit';
      u.innerHTML = '<span class="dc-num" data-u="' + lbl + '">--</span>' +
                    '<span class="dc-label">' + lbl + '</span>';
      clock.appendChild(u);
    });
    // Insert the clock before the .dc-date line if present, else append.
    var dateLine = item.querySelector('.dc-date');
    if (dateLine) item.insertBefore(clock, dateLine);
    else item.appendChild(clock);
    return clock;
  }

  function render(item, target) {
    var clock = buildClock(item);
    var nums = clock.querySelectorAll('.dc-num');
    var diff = target.getTime() - Date.now();

    if (diff <= 0) {
      item.classList.add('dc-passed');
      item.setAttribute('data-urgent', '1');
      nums.forEach(function (n) { n.textContent = '0'; });
      return false; // stop ticking
    }

    var s = Math.floor(diff / 1000);
    var days = Math.floor(s / 86400);
    var hrs  = Math.floor((s % 86400) / 3600);
    var min  = Math.floor((s % 3600) / 60);
    var sec  = s % 60;
    var map = { Days: String(days), Hrs: pad(hrs), Min: pad(min), Sec: pad(sec) };
    nums.forEach(function (n) { n.textContent = map[n.getAttribute('data-u')]; });

    // Flag the closest deadline(s) as urgent inside the final ~120 days.
    if (days <= 120) item.setAttribute('data-urgent', '1');
    return true;
  }

  function init() {
    var items = document.querySelectorAll('.deadline-countdown .dc-item[data-deadline]');
    if (!items.length) return;
    injectCss();

    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var interval = reduced ? 60000 : 1000;

    var live = [];
    items.forEach(function (item) {
      var target = parseDeadline(item.getAttribute('data-deadline'));
      if (!target) return;
      if (render(item, target)) live.push([item, target]);
    });

    if (!live.length) return;
    setInterval(function () {
      for (var i = live.length - 1; i >= 0; i--) {
        if (!render(live[i][0], live[i][1])) live.splice(i, 1);
      }
    }, interval);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

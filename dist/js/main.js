/* ============================================================
   Language Access Hub — Main JS
   ============================================================ */

(function () {
  'use strict';

  /* ── FAQ ACCORDION ─────────────────────────────────────── */
  function initFaq() {
    document.querySelectorAll('.faq-q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = this.closest('.faq-item, .faq-item-dark');
        if (!item) return;
        var isOpen = item.classList.contains('open');
        var parent = item.closest('.faq-list, .faq-grid, .faq-cols');
        var siblings = parent
          ? parent.querySelectorAll('.faq-item, .faq-item-dark')
          : document.querySelectorAll('.faq-item, .faq-item-dark');
        siblings.forEach(function (el) {
          el.classList.remove('open');
          var q = el.querySelector('.faq-q');
          if (q) q.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          this.setAttribute('aria-expanded', 'true');
          if (window.innerWidth < 640) {
            setTimeout(function () {
              item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
          }
        }
      });
    });
  }

  /* ── SMOOTH SCROLL ─────────────────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = this.getAttribute('href');
        if (id === '#') return;
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          var navH = document.querySelector('.site-nav');
          var offset = navH ? navH.offsetHeight + 16 : 80;
          var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }

  /* ── ACTIVE NAV LINK ───────────────────────────────────── */
  function initActiveNav() {
    var path = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      if (a.getAttribute('href') && path.includes(a.getAttribute('href').replace('../', '').replace('../../', ''))) {
        a.classList.add('active');
      }
    });
  }

  /* ── SCROLL REVEAL ─────────────────────────────────────── */
  function initReveal() {
    if (!window.IntersectionObserver) return;
    var els = document.querySelectorAll('.reveal');
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ── NETLIFY FORM SUBMISSION ───────────────────────────── */
  function encode(data) {
    return Object.keys(data)
      .map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
      })
      .join('&');
  }

  function initForms() {
    document.querySelectorAll('form[data-netlify="true"]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Validate required fields
        var inputs = form.querySelectorAll('input[required], textarea[required]');
        var valid = true;
        inputs.forEach(function (inp) {
          if (!inp.value.trim()) {
            inp.style.borderColor = '#DC2626';
            valid = false;
            setTimeout(function () { inp.style.borderColor = ''; }, 2000);
          }
        });
        if (!valid) return;

        var btn = form.querySelector('.btn-submit, .btn-lead');
        if (!btn || btn.dataset.submitting) return;
        btn.dataset.submitting = '1';
        var origText = btn.textContent;
        btn.textContent = 'Sending…';
        btn.disabled = true;

        // Collect form data
        var data = { 'form-name': form.getAttribute('name') };
        var formData = new FormData(form);
        formData.forEach(function (val, key) { data[key] = val; });

        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: encode(data)
        })
          .then(function () {
            btn.textContent = '✓ Sent! We\'ll be in touch soon.';
            btn.style.background = '#1A6B4A';
            form.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach(function (el) {
              el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
            });
          })
          .catch(function () {
            btn.textContent = origText;
            btn.disabled = false;
            delete btn.dataset.submitting;
            alert('Something went wrong. Please email us directly at sales@taikatranslations.com');
          });
      });
    });
  }

  /* ── LANGUAGE TICKER (homepage) ────────────────────────── */
  function initTicker() {
    var track = document.querySelector('.ticker-track');
    if (!track) return;
  }

  /* ── STICKY NAV SCROLL CLASS ───────────────────────────── */
  function initNavScroll() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 40) {
        nav.style.boxShadow = '0 2px 24px rgba(0,0,0,0.3)';
      } else {
        nav.style.boxShadow = '';
      }
    }, { passive: true });
  }

  /* ── INIT ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initFaq();
    initSmoothScroll();
    initActiveNav();
    initReveal();
    initForms();
    initTicker();
    initNavScroll();
  });

})();

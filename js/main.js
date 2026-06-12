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
        // Close all in same container
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
          // Scroll into view on mobile
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

  /* ── FORM SUBMISSION ───────────────────────────────────── */
  function encode(data) {
    return Object.keys(data).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
    }).join('&');
  }

  function initForms() {
    document.querySelectorAll('.btn-submit, .btn-form, .btn-lead').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var btn = this;
        var form = btn.closest('form');
        var card = btn.closest('.quote-card, .lead-form-card, .lead-strip');

        // Validate email fields
        var container = form || card;
        if (!container) return;
        var inputs = container.querySelectorAll('input[type="email"], input[type="text"][required]');
        var valid = true;
        inputs.forEach(function (inp) {
          if (!inp.value.trim()) {
            inp.style.borderColor = '#DC2626';
            valid = false;
            setTimeout(function () { inp.style.borderColor = ''; }, 2000);
          }
        });
        if (!valid || btn.dataset.submitting) return;

        btn.dataset.submitting = '1';
        btn.textContent = 'Sending…';

        if (form) {
          // Real Netlify form — collect named fields and POST
          var data = {};
          form.querySelectorAll('input, select, textarea').forEach(function (el) {
            if (el.name) data[el.name] = el.value;
          });
          var downloadUrl = form.getAttribute('data-download');
          fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: encode(data)
          }).then(function () {
            if (downloadUrl) {
              var a = document.createElement('a');
              a.href = downloadUrl;
              a.download = downloadUrl.split('/').pop();
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              btn.textContent = '✓ Downloading now!';
            } else {
              btn.textContent = '✓ Sent! We\'ll be in touch soon.';
            }
            btn.style.background = '#1A6B4A';
          }).catch(function () {
            btn.textContent = 'Error — please email sales@taikatranslations.com';
            btn.style.background = '#DC2626';
            btn.dataset.submitting = '';
          });
        } else {
          // Fallback for non-form cards
          setTimeout(function () {
            btn.textContent = '✓ Sent! We\'ll be in touch soon.';
            btn.style.background = '#1A6B4A';
          }, 1200);
        }
      });
    });
  }

  /* ── INIT ──────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initFaq();
    initSmoothScroll();
    initActiveNav();
    initReveal();
    initForms();
  });

}());
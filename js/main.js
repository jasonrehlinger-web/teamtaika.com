/* ============================================================
   Language Access Hub -- Main JS
   ============================================================ */

(function () {
  'use strict';

  /* -- FAQ ACCORDION ---------------------------------------- */
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

  /* -- SMOOTH SCROLL ---------------------------------------- */
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

  /* -- ACTIVE NAV LINK -------------------------------------- */
  function initActiveNav() {
    var path = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      if (a.getAttribute('href') && path.includes(a.getAttribute('href').replace('../', '').replace('../../', ''))) {
        a.classList.add('active');
      }
    });
  }

  /* -- SCROLL REVEAL ---------------------------------------- */
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

  /* -- FILE UPLOAD DROP ZONE -------------------------------- */
  function initUploadDrop() {
    document.querySelectorAll('.upload-drop').forEach(function (drop) {
      var input = drop.querySelector('.upload-input');
      var nameEl = drop.querySelector('.upload-filename');
      if (!input) return;

      function setFile(file) {
        if (!file) return;
        drop.classList.add('has-file');
        if (nameEl) nameEl.textContent = file.name;
      }

      input.addEventListener('change', function () {
        if (this.files && this.files[0]) setFile(this.files[0]);
      });

      drop.addEventListener('dragover', function (e) {
        e.preventDefault();
        drop.classList.add('drag-over');
      });
      drop.addEventListener('dragleave', function () {
        drop.classList.remove('drag-over');
      });
      drop.addEventListener('drop', function (e) {
        e.preventDefault();
        drop.classList.remove('drag-over');
        var file = e.dataTransfer && e.dataTransfer.files[0];
        if (file && input) {
          var dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          setFile(file);
        }
      });
    });
  }

  /* -- FORM SUBMISSION -------------------------------------- */
  var HS_PORTAL = '47509323';
  var HS_FORM   = 'a2c15341-e287-4b14-bc2c-ed20dc17acff';
  var HS_URL    = 'https://api.hsforms.com/submissions/v3/integration/submit/' + HS_PORTAL + '/' + HS_FORM;

  function encode(data) {
    return Object.keys(data).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
    }).join('&');
  }

  function submitToHubSpot(data, formName, fileName) {
    var emailVal = '';
    Object.keys(data).forEach(function (k) {
      if (!emailVal && k.toLowerCase().indexOf('email') !== -1) emailVal = data[k];
    });
    if (!emailVal) return;

    var companyVal = data['org-type'] || data['l_org'] || data['ai_org'] || data['level'] || '';

    var skip = ['form-name', 'bot-field'];
    var msgParts = ['[Form: ' + formName + ']'];
    Object.keys(data).forEach(function (k) {
      if (skip.indexOf(k) !== -1 || k.toLowerCase().indexOf('email') !== -1) return;
      if (data[k]) msgParts.push(k + ': ' + data[k]);
    });
    if (fileName) msgParts.push('attachment: ' + fileName);

    var fields = [{ name: 'email', value: emailVal }];
    if (companyVal) fields.push({ name: 'company', value: companyVal });
    fields.push({ name: 'message', value: msgParts.join(' | ') });

    fetch(HS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: fields,
        context: { pageUri: window.location.href, pageName: document.title }
      })
    }).catch(function () {});
  }

  function initForms() {
    document.querySelectorAll('.btn-submit, .btn-form, .btn-lead').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var btn = this;
        var form = btn.closest('form');
        var card = btn.closest('.quote-card, .lead-form-card, .lead-strip');

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
        btn.textContent = 'Sending...';

        if (form) {
          var data = {};
          form.querySelectorAll('input, select, textarea').forEach(function (el) {
            if (el.name && el.type !== 'file') data[el.name] = el.value;
          });
          var formName = data['form-name'] || 'unknown';
          var downloadUrl = form.getAttribute('data-download');

          // Check for file attachment
          var fileInput = form.querySelector('input[type="file"]');
          var fileName = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0].name : null;

          submitToHubSpot(data, formName, fileName);

          // Use FormData if there's a file, otherwise URL-encoded
          var body, headers;
          if (fileInput && fileInput.files && fileInput.files.length > 0) {
            body = new FormData(form);
            headers = {};
          } else {
            body = encode(data);
            headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
          }

          fetch('/', {
            method: 'POST',
            headers: headers,
            body: body
          }).then(function () {
            if (downloadUrl) {
              var a = document.createElement('a');
              a.href = downloadUrl;
              a.download = downloadUrl.split('/').pop();
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              btn.textContent = 'Downloading now!';
            } else {
              btn.textContent = 'Sent! We will be in touch soon.';
            }
            btn.style.background = '#1A6B4A';
          }).catch(function () {
            btn.textContent = 'Error -- please email sales@taikatranslations.com';
            btn.style.background = '#DC2626';
            btn.dataset.submitting = '';
          });
        } else {
          setTimeout(function () {
            btn.textContent = 'Sent! We will be in touch soon.';
            btn.style.background = '#1A6B4A';
          }, 1200);
        }
      });
    });
  }

  /* -- MOBILE NAV HAMBURGER --------------------------------- */
  function initHamburger() {
    var nav = document.querySelector('.site-nav');
    var btn = document.querySelector('.nav-hamburger');
    if (!nav || !btn) return;

    btn.addEventListener('click', function () {
      nav.classList.toggle('nav-open');
      var expanded = nav.classList.contains('nav-open');
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    document.querySelectorAll('.nav-dropdown > a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (window.innerWidth >= 641) return;
        e.preventDefault();
        var dd = this.closest('.nav-dropdown');
        dd.classList.toggle('open');
      });
    });

    document.querySelectorAll('.nav-links a:not(.nav-dropdown > a)').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('nav-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) {
        nav.classList.remove('nav-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* -- INIT ------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initFaq();
    initSmoothScroll();
    initActiveNav();
    initReveal();
    initForms();
    initHamburger();
    initUploadDrop();
  });

}());

/* ============================================================
   PayPal Smart Checkout
   ============================================================ */
(function () {
  'use strict';

  var PAYPAL_CLIENT_ID = 'AVQvPB5xq8ea6ylu-OBI88CwgzEf9X6YgrK5jlOq2b2xrFJQStSlHv35WDI_N6nkSHK8KXBGqM2j5abS';

  var PRICES = { standard: 24.99, rush: 31.24, sameday: 37.49 };

  function getOrderAmount(form) {
    var svc   = form.querySelector('[name="service-type"]');
    var pages = form.querySelector('[name="page-count"]');
    if (!svc) return null;
    if (svc.value === 'interpretation' || svc.value === 'both') return null; // quote only
    var price = PRICES[svc.value] || 24.99;
    var count = Math.max(1, parseInt((pages && pages.value) || '1', 10));
    return (price * count).toFixed(2);
  }

  function getOrderDescription(form) {
    var svc  = form.querySelector('[name="service-type"]');
    var pg   = form.querySelector('[name="page-count"]');
    var lang = form.querySelector('[name="language"]');
    var svcLabel = { standard: 'Standard', rush: 'Rush (48h)', sameday: 'Same-Day' };
    var count = parseInt((pg && pg.value) || '1', 10);
    return 'Certified Translation'
      + (lang && lang.value ? ' – ' + lang.value : '')
      + ' | ' + (svcLabel[svc && svc.value] || 'Standard')
      + ' | ' + count + ' page' + (count !== 1 ? 's' : '');
  }

  function showSuccess(form, details) {
    var name  = details.payer && details.payer.name ? details.payer.name.given_name : 'there';
    var email = details.payer ? details.payer.email_address : '';
    var txn   = details.id || '';
    var card = form.closest('.order-form-card');
    var target = card || form;
    target.innerHTML = [
      '<div style="text-align:center;padding:40px 16px;">',
      '<div style="font-size:56px;line-height:1;margin-bottom:16px;">✅</div>',
      '<h3 style="font-family:var(--font-display);font-size:1.5rem;color:var(--navy);margin-bottom:8px;">',
      'Payment received, ' + name + '!</h3>',
      '<p style="color:var(--slate);font-size:14px;line-height:1.7;max-width:420px;margin:0 auto 12px;">',
      'Your order is confirmed. We\'ll email you at <strong>' + email + '</strong> within 1 business hour with next steps.</p>',
      '<p style="font-size:11px;color:rgba(0,0,0,.35);">Transaction ID: ' + txn + '</p>',
      '</div>'
    ].join('');
  }

  function submitNetlifyForm(form, extraFields) {
    var data = new FormData(form);
    Object.keys(extraFields).forEach(function (k) { data.append(k, extraFields[k]); });
    return fetch('/', {
      method: 'POST',
      body: new URLSearchParams(data).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  function validateForm(form) {
    var ok = true;
    form.querySelectorAll('input[required], select[required]').forEach(function (el) {
      if (!el.value.trim()) {
        el.style.borderColor = '#DC2626';
        setTimeout(function () { el.style.borderColor = ''; }, 2500);
        ok = false;
      }
    });
    // Email check
    var emailEl = form.querySelector('input[type="email"]');
    if (emailEl && emailEl.value && !/\S+@\S+\.\S+/.test(emailEl.value)) {
      emailEl.style.borderColor = '#DC2626';
      ok = false;
    }
    return ok;
  }

  function renderPayPalButtons(form, container) {
    paypal.Buttons({
      style: {
        layout: 'vertical',
        color:  'gold',
        shape:  'rect',
        label:  'pay',
        height: 48
      },

      onClick: function (data, actions) {
        if (!validateForm(form)) {
          return actions.reject();
        }
        var amount = getOrderAmount(form);
        if (!amount) {
          // Interpretation — skip PayPal, go to quote
          window.location.href = '/index.html#quote';
          return actions.reject();
        }
        return actions.resolve();
      },

      createOrder: function (data, actions) {
        var amount = getOrderAmount(form);
        return actions.order.create({
          purchase_units: [{
            amount: { value: amount, currency_code: 'USD' },
            description: getOrderDescription(form),
            soft_descriptor: 'TaikaTranslations'
          }]
        });
      },

      onApprove: function (data, actions) {
        container.innerHTML = '<p style="text-align:center;font-size:13px;color:var(--slate);padding:16px 0;">Processing payment…</p>';
        return actions.order.capture().then(function (details) {
          submitNetlifyForm(form, {
            'paypal-transaction-id': details.id,
            'paypal-payer-email':    details.payer ? details.payer.email_address : '',
            'paypal-amount':         details.purchase_units[0].amount.value
          }).finally(function () {
            showSuccess(form, details);
          });
        });
      },

      onError: function (err) {
        console.error('[PayPal]', err);
        container.innerHTML = '<p style="color:#DC2626;font-size:13px;text-align:center;padding:12px 0;">'
          + 'Payment failed. Please try again or <a href="mailto:sales@taikatranslations.com">contact us</a>.</p>';
      },

      onCancel: function () {
        container.innerHTML = '';
        renderPayPalButtons(form, container);
      }

    }).render(container);
  }

  function initPayPal() {
    // Find all Netlify order forms on this page
    var forms = document.querySelectorAll('form[data-netlify="true"]');
    if (!forms.length) return;

    // Load PayPal SDK
    var sdk = document.createElement('script');
    sdk.src = 'https://www.paypal.com/sdk/js'
      + '?client-id=' + PAYPAL_CLIENT_ID
      + '&currency=USD'
      + '&intent=capture'
      + '&components=buttons,googlepay';
    sdk.setAttribute('data-sdk-integration-source', 'button-factory');

    sdk.onerror = function () {
      console.warn('[PayPal] SDK failed to load.');
    };

    sdk.onload = function () {
      forms.forEach(function (form) {
        // Replace the existing submit button with a PayPal container
        var oldBtn = form.querySelector('.btn-submit, .btn-order');
        if (!oldBtn) return;

        var container = document.createElement('div');
        container.className = 'paypal-btn-container';
        container.style.cssText = 'margin-top:4px;';

        oldBtn.parentNode.insertBefore(container, oldBtn);
        oldBtn.style.display = 'none';

        // Update price whenever service/page count changes
        var svcEl  = form.querySelector('[name="service-type"]');
        var pgEl   = form.querySelector('[name="page-count"]');

        renderPayPalButtons(form, container);

        // Re-render if switching to/from interpretation (no price → quote only)
        if (svcEl) {
          svcEl.addEventListener('change', function () {
            var isQuote = (this.value === 'interpretation' || this.value === 'both');
            oldBtn.style.display = isQuote ? 'block' : 'none';
            container.style.display = isQuote ? 'none' : 'block';
          });
        }
      });
    };

    document.head.appendChild(sdk);
  }

  document.addEventListener('DOMContentLoaded', initPayPal);

}());

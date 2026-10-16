/**
 * TechHanu - Client Script & Form Controller
 * Production-ready, zero-dependency JavaScript.
 */

(function () {
  'use strict';

  // Configured Google Apps Script Endpoint
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUbXAwKyz0qt1RutZGywTOA6uS_JSoJjTRcfYyJkR9GQC0QwMpK0B36S4Y3WG4wQc5/exec';
  const TECHHANU_PHONE = '918470901434';
  const TECHHANU_EMAIL = 'techhanu.io@gmail.com';

  // State
  let isSubmitting = false;

  // DOM Elements
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupMobileNav();
    setupEnquiryForm();
  }

  /* -------------------------------------------------------------------------
     Mobile Navigation Toggle
     ------------------------------------------------------------------------- */
  function setupMobileNav() {
    const toggleBtn = document.getElementById('navToggleBtn');
    const navLinks = document.getElementById('navLinks');

    if (!toggleBtn || !navLinks) return;

    toggleBtn.addEventListener('click', function () {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
      navLinks.classList.toggle('is-open');
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggleBtn.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!toggleBtn.contains(e.target) && !navLinks.contains(e.target) && navLinks.classList.contains('is-open')) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
      }
    });
  }

  /* -------------------------------------------------------------------------
     Enquiry Form Controller
     ------------------------------------------------------------------------- */
  function setupEnquiryForm() {
    const form = document.getElementById('enquiryForm');
    if (!form) return;

    form.addEventListener('submit', handleFormSubmit);

    // Clear validation styling upon input
    form.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        field.classList.remove('is-invalid');
        hideAlert('formAlertError');
      });
    });
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const form = document.getElementById('enquiryForm');
    const submitBtn = document.getElementById('formSubmitBtn');
    const errorAlert = document.getElementById('formAlertError');
    const successBox = document.getElementById('formSuccessBox');
    const formFields = document.getElementById('formFieldsContainer');

    // Honeypot check
    const honeypot = document.getElementById('website_hp');
    if (honeypot && honeypot.value.trim().length > 0) {
      // Bot detected - show silent success and exit
      formFields.style.display = 'none';
      successBox.style.display = 'block';
      return;
    }

    // Rate limiting: prevent submission more than once every 10 seconds
    const lastSubmitTime = localStorage.getItem('th_last_submit');
    const now = Date.now();
    if (lastSubmitTime && now - parseInt(lastSubmitTime, 10) < 10000) {
      showAlert('formAlertError', 'Please wait a few seconds before submitting another enquiry.');
      return;
    }

    // Collect values
    const name = (document.getElementById('fname') ? document.getElementById('fname').value : '').trim();
    const business = (document.getElementById('fbusiness') ? document.getElementById('fbusiness').value : '').trim();
    const email = (document.getElementById('femail') ? document.getElementById('femail').value : '').trim();
    const phone = (document.getElementById('fphone') ? document.getElementById('fphone').value : '').trim();
    const wa = (document.getElementById('fwa') ? document.getElementById('fwa').value : '').trim();
    const service = (document.getElementById('fservice') ? document.getElementById('fservice').value : '').trim();
    const volume = (document.getElementById('fvolume') ? document.getElementById('fvolume').value : '').trim();
    const message = (document.getElementById('fmsg') ? document.getElementById('fmsg').value : '').trim();

    // Validation
    let isValid = true;

    if (!name || name.length < 2) {
      markInvalid('fname');
      isValid = false;
    }
    if (!business) {
      markInvalid('fbusiness');
      isValid = false;
    }
    if (!email || !isValidEmail(email)) {
      markInvalid('femail');
      isValid = false;
    }
    if (!phone || !isValidPhone(phone)) {
      markInvalid('fphone');
      isValid = false;
    }
    if (!service) {
      markInvalid('fservice');
      isValid = false;
    }

    if (!isValid) {
      showAlert('formAlertError', 'Please check the highlighted fields and ensure all required information is provided.');
      return;
    }

    // Lock UI
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Enquiry...';
    hideAlert('formAlertError');

    const payload = {
      name: sanitizeText(name),
      business: sanitizeText(business),
      email: sanitizeText(email),
      phone: sanitizeText(phone),
      wa: sanitizeText(wa || phone),
      service: sanitizeText(service),
      volume: sanitizeText(volume),
      message: sanitizeText(message),
      source: 'TechHanu Website',
      timestamp: new Date().toISOString()
    };

    // Text formatted for WhatsApp / Mail fallback
    const summaryText = buildSummaryText(payload);

    // Submit via POST using text/plain to comply with Apps Script CORS behavior
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (result) {
        if (result && result.success) {
          localStorage.setItem('th_last_submit', String(Date.now()));
          formFields.style.display = 'none';
          successBox.style.display = 'block';
          document.getElementById('confirmedName').textContent = payload.name;
        } else {
          // Server returned an error (e.g. SPREADSHEET_ID unconfigured or server problem)
          handleRecoverableFailure(payload, summaryText, (result && result.error) || 'Backend sync pending configuration.');
        }
      })
      .catch(function (networkErr) {
        // Network or fetch failure
        handleRecoverableFailure(payload, summaryText, 'Direct network submission could not be verified.');
      })
      .finally(function () {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Enquiry';
      });
  }

  function handleRecoverableFailure(payload, summaryText, errorReason) {
    const errorAlert = document.getElementById('formAlertError');
    if (!errorAlert) return;

    const waUrl = 'https://wa.me/' + TECHHANU_PHONE + '?text=' + encodeURIComponent(summaryText);
    const mailUrl = 'mailto:' + TECHHANU_EMAIL + '?subject=' + encodeURIComponent('New Project Enquiry: ' + payload.service + ' - ' + payload.business) + '&body=' + encodeURIComponent(summaryText);

    errorAlert.innerHTML = `
      <strong>Notice:</strong> We could not automatically record your enquiry in Google Sheets (${escapeHtml(errorReason)}).<br>
      <strong>Your details are preserved.</strong> Please send them directly to our team via WhatsApp or Email below:
      <div class="form-fallback-actions" style="margin-top: 0.75rem;">
        <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-wa btn-sm">Complete via WhatsApp</a>
        <a href="${mailUrl}" class="btn btn-secondary btn-sm">Complete via Email</a>
      </div>
    `;
    errorAlert.style.display = 'block';
  }

  function buildSummaryText(p) {
    let msg = 'Hello TechHanu Team,\n\n';
    msg += 'I submitted a project enquiry on TechHanu (https://techhanuorg.github.io/Techhanu/):\n';
    msg += '• Name: ' + p.name + '\n';
    msg += '• Business: ' + p.business + '\n';
    msg += '• Email: ' + p.email + '\n';
    msg += '• Phone: ' + p.phone + '\n';
    if (p.wa && p.wa !== p.phone) msg += '• WhatsApp: ' + p.wa + '\n';
    msg += '• Service: ' + p.service + '\n';
    if (p.volume) msg += '• Volume / Scope: ' + p.volume + '\n';
    if (p.message) msg += '\nProject Requirements:\n' + p.message + '\n';
    return msg;
  }

  /* -------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------- */
  function markInvalid(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('is-invalid');
  }

  function showAlert(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone) {
    const cleaned = phone.replace(/[\s+\-()]/g, '').slice(-10);
    return /^[6-9]\d{9}$/.test(cleaned);
  }

  function sanitizeText(str) {
    if (typeof str !== 'string') return '';
    return str.trim();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();

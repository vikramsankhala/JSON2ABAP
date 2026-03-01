/**
 * QR Code Generator for E-Invoice JWT
 * Decodes JWT payload and generates QR code from SignedQRCode/SignedInvoice
 */
(function () {
  'use strict';

  const DOM = {
    qrInput: document.getElementById('qr-input'),
    qrError: document.getElementById('qr-error'),
    qrResult: document.getElementById('qr-result'),
    qrCanvas: document.getElementById('qr-canvas'),
    qrPayload: document.getElementById('qr-payload'),
    btnGenerate: document.getElementById('btn-generate-qr'),
    btnLoadFromJson: document.getElementById('btn-load-qr-from-json'),
    jsonInput: document.getElementById('json-input')
  };

  /**
   * Base64URL decode (JWT uses base64url, not standard base64)
   */
  function base64UrlDecode(str) {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    try {
      return decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (e) {
      return null;
    }
  }

  /**
   * Decode JWT payload (middle part)
   */
  function decodeJwtPayload(jwt) {
    const parts = jwt.trim().split('.');
    if (parts.length !== 3) return null;
    const decoded = base64UrlDecode(parts[1]);
    if (!decoded) return null;
    try {
      return JSON.parse(decoded);
    } catch (e) {
      return { raw: decoded };
    }
  }

  /**
   * Check if string looks like a JWT (header.payload.signature)
   */
  function isJwt(str) {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    const parts = trimmed.split('.');
    return parts.length === 3 && parts.every((p) => p.length > 0);
  }

  /**
   * Extract JWT from input (JSON or raw JWT)
   */
  function extractJwt(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (isJwt(trimmed)) return trimmed;

    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') {
        if (obj.SignedQRCode && typeof obj.SignedQRCode === 'string') return obj.SignedQRCode;
        if (obj.SignedInvoice && typeof obj.SignedInvoice === 'string') return obj.SignedInvoice;
      }
    } catch (e) {
      /* not JSON */
    }
    return null;
  }

  function showQrError(msg) {
    DOM.qrError.textContent = msg;
    DOM.qrError.classList.add('visible');
    DOM.qrResult.style.display = 'none';
  }

  function hideQrError() {
    DOM.qrError.classList.remove('visible');
  }

  function generateQr() {
    hideQrError();
    const input = DOM.qrInput.value.trim();

    if (!input) {
      showQrError('Please paste JSON or JWT.');
      return;
    }

    const jwt = extractJwt(input);
    if (!jwt) {
      showQrError('No SignedQRCode or SignedInvoice JWT found. Paste e-invoice JSON or the JWT directly.');
      return;
    }

    const payload = decodeJwtPayload(jwt);
    if (payload) {
      DOM.qrPayload.textContent = JSON.stringify(payload, null, 2);
    } else {
      DOM.qrPayload.textContent = '(Could not decode payload)';
    }

    QRCode.toCanvas(
      DOM.qrCanvas,
      jwt,
      { width: 256, margin: 2, color: { dark: '#000000', light: '#ffffff' } },
      function (err) {
        if (err) {
          showQrError('QR generation failed: ' + (err.message || err));
        } else {
          DOM.qrResult.style.display = 'flex';
        }
      }
    );
  }

  function loadFromJson() {
    const json = DOM.jsonInput ? DOM.jsonInput.value.trim() : '';
    if (json) {
      DOM.qrInput.value = json;
      hideQrError();
    } else {
      showQrError('JSON input is empty. Paste JSON first.');
    }
  }

  DOM.btnGenerate.addEventListener('click', generateQr);
  DOM.btnLoadFromJson.addEventListener('click', loadFromJson);
})();

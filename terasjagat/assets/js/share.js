(function () {
  'use strict';
  var BTN_ID   = 'share-trigger-btn';
  var MODAL_ID = 'share-modal-backdrop';
  var GRID_ID  = 'share-grid';
  var TOAST_ID = 'share-toast';
  var ATTR_URL   = 'data-share-url';
  var ATTR_TITLE = 'data-share-title';
  var ATTR_TEXT  = 'data-share-text';
  var runtimeOverride = null;
  var persistentOverride = false;
  var lastFingerprint = '';
  var lastUrl = location.href;
  function decodeEntities(str) {
    if (typeof str !== 'string' || str.indexOf('&') === -1) return str;
    var txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }
  function cleanUrl(url) {
    var raw = String(url || location.href);
    var STRIP = ['m', 'murl', 'redirect', 'share_mode', 'share_force'];
    try {
      var u = new URL(raw, location.href);
      STRIP.forEach(function (p) { u.searchParams.delete(p); });
      var out = u.toString();
      STRIP.forEach(function (p) {
        out = out.replace(new RegExp('[?&]' + p + '=[^&#]*', 'g'), '');
      });
      out = out.replace(/\?&/g, '?').replace(/[?&]$/g, '').replace(/[?&]#/g, '#');
      return out;
    } catch (e) {
      var s = raw;
      STRIP.forEach(function (p) {
        s = s.replace(new RegExp('[?&]' + p + '=[^&#]*', 'g'), '');
      });
      s = s.replace(/\?&/g, '?').replace(/[?&]$/g, '').replace(/[?&]#/g, '#');
      return s;
    }
  }
  function normalizeUrl(raw) {
    if (!raw || typeof raw !== 'string') return location.href;
    var t = raw.trim();
    if (!t) return location.href;
    if (/^https?:\/\//i.test(t)) return t;
    if (/^\/\//.test(t)) return location.protocol + t;
    if (t.charAt(0) === '/') return location.origin + t;
    return location.origin + '/' + t;
  }
  function buildPayload(cfg) {
    var p = {};
    if (cfg.title) p.title = cfg.title;
    if (cfg.text) p.text = cfg.text;
    if (cfg.url) p.url = cfg.url;
    if (!p.title && !p.text && !p.url) p.url = location.href;
    return p;
  }
  function findConfigElement() {
    return document.querySelector('[' + ATTR_URL + '], [' + ATTR_TITLE + '], [' + ATTR_TEXT + ']');
  }
  function readConfigFromDom() {
    var el = findConfigElement();
    if (!el) return null;
    var url   = el.getAttribute(ATTR_URL);
    var title = el.getAttribute(ATTR_TITLE);
    var text  = el.getAttribute(ATTR_TEXT);
    if (url == null && title == null && text == null) return null;
    return {
      url:   url   != null ? decodeEntities(url)   : '',
      title: title != null ? decodeEntities(title) : '',
      text:  text  != null ? decodeEntities(text)  : ''
    };
  }
  function resolve() {
    var cfg = runtimeOverride || readConfigFromDom() || window.SHARE_CONFIG || null;
    var baseUrl = cleanUrl(location.href);
    var url   = baseUrl;
    var title = document.title || '';
    var text  = '';
    if (cfg) {
      if (cfg.url && String(cfg.url).trim()) {
        url = cleanUrl(normalizeUrl(cfg.url));
      }
      if (cfg.title) title = String(cfg.title);
      if (cfg.text)  text  = String(cfg.text);
    }
    return { url: url, title: title, text: text };
  }
  function fingerprint(cfg) {
    return cfg.url + '||' + cfg.title + '||' + cfg.text;
  }
  function canNativeShare(payload) {
    try {
      if (!navigator.share) return false;
      if (typeof navigator.canShare === 'function') return navigator.canShare(payload);
      return true;
    } catch (e) {
      return !!navigator.share;
    }
  }
  var PLATFORMS = [
    { key: 'wa',   label: 'WhatsApp',  icon: 'chat',     cls: 'bg-[#25D366] text-white',
      href: function (c) { return 'https://wa.me/?text=' + encodeURIComponent(c.text ? c.text + ' ' + c.url : c.url); } },
    { key: 'fb',   label: 'Facebook',  icon: 'thumb_up', cls: 'bg-[#1877F2] text-white',
      href: function (c) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(c.url); } },
    { key: 'x',    label: 'X',         icon: 'tag',      cls: 'bg-black text-white',
      href: function (c) { return 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(c.url) + '&text=' + encodeURIComponent(c.title); } },
    { key: 'tg',   label: 'Telegram',  icon: 'send',     cls: 'bg-[#229ED9] text-white',
      href: function (c) { return 'https://t.me/share/url?url=' + encodeURIComponent(c.url) + '&text=' + encodeURIComponent(c.title); } },
    { key: 'li',   label: 'LinkedIn',  icon: 'work',     cls: 'bg-[#0A66C2] text-white',
      href: function (c) { return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(c.url); } },
    { key: 'pin',  label: 'Pinterest', icon: 'push_pin', cls: 'bg-[#E60023] text-white',
      href: function (c) { return 'https://pinterest.com/pin/create/button/?url=' + encodeURIComponent(c.url) + '&description=' + encodeURIComponent(c.title); } },
    { key: 'copy', label: 'Copy Link', icon: 'link',     cls: 'bg-[#4B5563] text-white', href: null }
  ];
  function buildGrid(cfg) {
    var grid = document.getElementById(GRID_ID);
    if (!grid) return;
    grid.innerHTML = '';
    PLATFORMS.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-platform', p.key);
      btn.setAttribute('aria-label', 'Bagikan ke ' + p.label);
      btn.className =
        'flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-xs font-medium ' +
        'border-0 cursor-pointer min-h-[76px] transition-transform hover:scale-105 active:scale-95 ' +
        p.cls;
      btn.innerHTML =
        '<span class="material-symbols-outlined text-[24px]">' + p.icon + '</span>' +
        '<span>' + p.label + '</span>';
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (p.href) {
          window.open(p.href(cfg), '_blank', 'noopener,noreferrer');
        } else {
          copyToClipboard(cfg.url);
        }
      });
      grid.appendChild(btn);
    });
  }
  function copyToClipboard(text) {
    function done() { showToast('✓ Link berhasil disalin!'); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { console.error(e); }
    document.body.removeChild(ta);
  }
  function showToast(msg) {
    var t = document.getElementById(TOAST_ID);
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(function () { t.classList.add('hidden'); }, 2000);
  }
  function openModal() {
    var cfg = resolve();
    var fp = fingerprint(cfg);
    if (fp !== lastFingerprint) {
      buildGrid(cfg);
      lastFingerprint = fp;
    }
    var bd = document.getElementById(MODAL_ID);
    if (bd) bd.classList.remove('hidden');
  }
  function closeModal() {
    var bd = document.getElementById(MODAL_ID);
    if (bd) bd.classList.add('hidden');
  }
  function trigger() {
    var cfg = resolve();
    var payload = buildPayload(cfg);
    if (canNativeShare(payload)) {
      navigator.share(payload).then(function () {
      }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        openModal();
      });
      return;
    }
    openModal();
  }
  function attachButton() {
    var btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.type = 'button';
    if (btn.__shareBound) return;
    btn.__shareBound = true;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      trigger();
    });
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var triggerBtn = t && t.closest && t.closest('#' + BTN_ID + ', [data-share-trigger]');
    if (triggerBtn) {
      e.preventDefault(); e.stopPropagation();
      trigger();
      return;
    }
    var bd = document.getElementById(MODAL_ID);
    if (bd && t === bd) closeModal();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) closeModal();
  });
  setInterval(attachButton, 1500);
  function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    if (!persistentOverride) runtimeOverride = null;
    lastFingerprint = '';
  }
  ['pushState', 'replaceState'].forEach(function (m) {
    var orig = history[m];
    history[m] = function () {
      var ret = orig.apply(this, arguments);
      onUrlChange();
      return ret;
    };
  });
  window.addEventListener('popstate', onUrlChange);
  window.addEventListener('hashchange', onUrlChange);
  var moTimer = null;
  if (window.MutationObserver) {
    var mo = new MutationObserver(function (mutations) {
      var hit = false;
      for (var i = 0; i < mutations.length && !hit; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n && n.nodeType === 1) {
            if (n.hasAttribute && (n.hasAttribute(ATTR_URL) || n.hasAttribute(ATTR_TITLE) || n.hasAttribute(ATTR_TEXT))) {
              hit = true; break;
            }
            if (n.querySelector && n.querySelector('[' + ATTR_URL + '], [' + ATTR_TITLE + '], [' + ATTR_TEXT + ']')) {
              hit = true; break;
            }
          }
        }
      }
      if (!hit) return;
      clearTimeout(moTimer);
      moTimer = setTimeout(function () {
        attachButton();
        lastFingerprint = '';
      }, 120);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  var ShareWidget = {
    setConfig: function (cfg, persistent) {
      runtimeOverride = Object.assign({}, cfg || {});
      persistentOverride = !!persistent;
      lastFingerprint = '';
    },
    resetOverrides: function () {
      runtimeOverride = null;
      persistentOverride = false;
      lastFingerprint = '';
    },
    refresh: function () {
      lastFingerprint = '';
      attachButton();
    },
    get config()      { return resolve(); },
    get hasNativeShare() { return !!navigator.share; },
    open: openModal,
    close: closeModal,
    trigger: trigger,
    cleanUrl: cleanUrl,
    normalizeUrl: normalizeUrl,
    resolve: resolve,
    debug: function () {
      var header = 'color:#2563eb;font-weight:bold;font-size:13px;';
      console.group('%c🔍 [ShareWidget Debug]', header);
      var domEl = findConfigElement();
      console.log('Config element      :', domEl);
      if (domEl) {
        console.log('  → tagName       :', domEl.tagName);
        console.log('  → ' + ATTR_URL  + ' :', JSON.stringify(domEl.getAttribute(ATTR_URL)));
        console.log('  → ' + ATTR_TITLE + ' :', JSON.stringify(domEl.getAttribute(ATTR_TITLE)));
        console.log('  → ' + ATTR_TEXT + ' :', JSON.stringify(domEl.getAttribute(ATTR_TEXT)));
      } else {
        console.warn('⚠️ Tidak ada elemen dengan atribut share ditemukan di DOM!');
      }
      console.log('window.SHARE_CONFIG :', window.SHARE_CONFIG);
      console.log('runtime override    :', runtimeOverride);
      console.log('persistent override :', persistentOverride);
      var resolved = resolve();
      console.log('%c→ Resolved config:', 'color:#16a34a;font-weight:bold;', resolved);
      console.log('navigator.share     :', !!navigator.share);
      console.log('navigator.canShare  :', typeof navigator.canShare);
      try {
        console.log('canNativeShare      :', canNativeShare(buildPayload(resolved)));
      } catch (e) { console.log('canNativeShare error:', e); }
      var btn = document.getElementById(BTN_ID);
      console.log('Button element      :', btn);
      if (btn) {
        var rect = btn.getBoundingClientRect();
        console.log('  → rect:', rect);
        console.log('  → visible:', rect.width > 0 && rect.height > 0);
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var efp = document.elementFromPoint(cx, cy);
        console.log('  → elementFromPoint(center):', efp);
        console.log('  → is clickable:', efp === btn || (efp && btn.contains(efp)));
        console.log('  → bound:', !!btn.__shareBound);
      } else {
        console.warn('⚠️ Tombol share TIDAK ditemukan di DOM!');
      }
      var modal = document.getElementById(MODAL_ID);
      console.log('Modal element       :', modal);
      if (modal) console.log('  → hidden:', modal.classList.contains('hidden'));
      console.groupEnd();
      return resolved;
    }
  };
  window.ShareWidget = ShareWidget;
  function init() {
    attachButton();
    var cfg = resolve();
    buildGrid(cfg);
    lastFingerprint = fingerprint(cfg);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

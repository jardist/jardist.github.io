(function () {
  const OVERLAY_CLASS = 'pjax-loading-overlay fixed md:left-56 top-16 bottom-20 md:bottom-4 md:right-48 lg:right-58 xl:right-93 md:rounded-m3-xl inset-0 flex items-center justify-center bg-surface-container-lowest/50 backdrop-blur-xs z-[999]';
  const SPINNER_CLASS = 'pjax-loading-spinner w-10 h-10 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin';
  function urlsAreSameIgnoringM(url1, url2) {
    if (url1.pathname !== url2.pathname) return false;
    const params1 = new URLSearchParams(url1.search);
    const params2 = new URLSearchParams(url2.search);
    params1.delete('m');
    params2.delete('m');
    const sorted1 = Array.from(params1.entries())
      .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const sorted2 = Array.from(params2.entries())
      .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return sorted1 === sorted2;
  }
  function isExcluded(url) {
    const excludedPatterns = window.PJAX_EXCLUDED_URLS || [];
    if (!excludedPatterns.length) return false;
    const urlCopy = new URL(url.href);
    urlCopy.searchParams.delete('m');
    const fullUrl = urlCopy.href;
    const pathWithQuery = urlCopy.pathname + urlCopy.search;
    return excludedPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        if (pattern.startsWith('/')) {
          return pathWithQuery.startsWith(pattern) || pathWithQuery === pattern;
        }
        return fullUrl.startsWith(pattern) || fullUrl === pattern;
      } else if (pattern instanceof RegExp) {
        return pattern.test(fullUrl) || pattern.test(pathWithQuery);
      }
      return false;
    });
  }
  function createOverlayForElement(el) {
    if (el._pjaxLoadingOverlay) {
      el._pjaxLoadingOverlay.remove();
      el._pjaxLoadingOverlay = null;
    }
    const overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    const spinner = document.createElement('div');
    spinner.className = SPINNER_CLASS;
    overlay.appendChild(spinner);
    el.prepend(overlay);
    el._pjaxLoadingOverlay = overlay;
  }
  function showLoading() {
    document.querySelectorAll('[data-load]').forEach(el => {
      createOverlayForElement(el);
    });
  }
  function hideLoading() {
    document.querySelectorAll('[data-load]').forEach(el => {
      if (el._pjaxLoadingOverlay) {
        el._pjaxLoadingOverlay.remove();
        el._pjaxLoadingOverlay = null;
      }
    });
    document.querySelectorAll('.pjax-loading-overlay').forEach(ov => ov.remove());
  }
  function getCurrentLoadElements() {
    return Array.from(document.querySelectorAll('[data-load]'));
  }
  function executeScriptsInContainer(container) {
    const scripts = Array.from(container.querySelectorAll('script'));
    scripts.forEach(originalScript => {
      const newScript = document.createElement('script');
      for (let i = 0; i < originalScript.attributes.length; i++) {
        const attr = originalScript.attributes[i];
        if (attr.name === 'async' || attr.name === 'defer' || attr.name === 'nomodule') continue;
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.async = originalScript.async;
      newScript.defer = originalScript.defer;
      newScript.nomodule = originalScript.nomodule;
      if (!originalScript.src) {
        newScript.textContent = originalScript.textContent;
      }
      originalScript.parentNode.replaceChild(newScript, originalScript);
    });
  }
  let previousDataClasses = [];
  function applyDataClassAndTitle(sourceDoc) {
    if (previousDataClasses.length > 0) {
      document.body.classList.remove(...previousDataClasses);
      previousDataClasses = [];
    }
    const classElements = sourceDoc.querySelectorAll('[data-class]');
    let classString = '';
    classElements.forEach(el => {
      const val = el.getAttribute('data-class');
      if (val) {
        classString += (classString ? ' ' : '') + val;
      }
    });
    if (classString) {
      const classes = classString.split(/\s+/).filter(Boolean);
      document.body.classList.add(...classes);
      previousDataClasses = classes;
    }
    const titleElements = sourceDoc.querySelectorAll('[data-title]');
    if (titleElements.length > 0) {
      const firstTitle = titleElements[0];
      const titleValue = firstTitle.getAttribute('data-title');
      const appBarTitle = document.getElementById('appBarTitle');
      if (appBarTitle && titleValue) {
        appBarTitle.innerHTML = titleValue;
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      applyDataClassAndTitle(document);
    });
  } else {
    applyDataClassAndTitle(document);
  }
  function processHTML(html, finalURL, isPopState) {
    const parsedDoc = new DOMParser().parseFromString(html, 'text/html');
    const sourceElements = Array.from(parsedDoc.querySelectorAll('[data-load]'));
    const sourceGroups = new Map();
    sourceElements.forEach(el => {
      const name = el.getAttribute('data-load');
      if (!sourceGroups.has(name)) sourceGroups.set(name, []);
      sourceGroups.get(name).push(el);
    });
    const targetElements = getCurrentLoadElements();
    const targetGroups = new Map();
    targetElements.forEach(el => {
      const name = el.getAttribute('data-load');
      if (!targetGroups.has(name)) targetGroups.set(name, []);
      targetGroups.get(name).push(el);
    });
    let replacedAny = false;
    const updatedTargets = [];
    sourceGroups.forEach((sourceArr, name) => {
      const targetArr = targetGroups.get(name);
      if (!targetArr || targetArr.length === 0) return;
      const pairCount = Math.min(sourceArr.length, targetArr.length);
      for (let i = 0; i < pairCount; i++) {
        const sourceEl = sourceArr[i];
        const targetEl = targetArr[i];
        targetEl.replaceChildren();
        Array.from(sourceEl.childNodes).forEach(child => {
          targetEl.appendChild(child.cloneNode(true));
        });
        updatedTargets.push(targetEl);
        replacedAny = true;
      }
    });
    if (!replacedAny) {
      window.location.href = finalURL;
      return;
    }
    window.dispatchEvent(new CustomEvent('bottomNav:reset'));
    updatedTargets.forEach(target => executeScriptsInContainer(target));
    applyDataClassAndTitle(parsedDoc);
    if (typeof window.processNewAds === 'function') {
      window.processNewAds();
    }
    if (window.__bottomNavConfig) {
      window.dispatchEvent(new CustomEvent('bottomNav:update', {
        detail: { config: window.__bottomNavConfig }
      }));
      delete window.__bottomNavConfig;
    }
    const titleEl = parsedDoc.querySelector('title');
    if (titleEl) {
      document.title = titleEl.textContent || titleEl.innerText;
    }
    const appContent = document.getElementById('appContent');
    if (appContent) {
      appContent.scrollTop = 0;
    }
    if (!isPopState) {
      history.pushState({ pjaxInternal: true }, '', finalURL);
      window.scrollTo(0, 0);
    }
    if (typeof reInit === 'function') {
      reInit();
    }
    hideLoading();
    window.dispatchEvent(new Event('pjax:statechange'));
  }
  async function loadPage(url, isPopState = false) {
    const targetURL = new URL(url, location.origin);
    const currentURL = new URL(location.href);
    if (urlsAreSameIgnoringM(targetURL, currentURL) && targetURL.hash !== currentURL.hash) {
      hideLoading();
      if (targetURL.hash) {
        const el = document.querySelector(targetURL.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        // Pertahankan query string saat ini, hanya ganti hash
        const newUrl = new URL(currentURL.href);
        newUrl.hash = targetURL.hash;
        history.replaceState(null, '', newUrl.href);
      }
      return;
    }
    showLoading();
    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const finalURL = response.url;
      const html = await response.text();
      processHTML(html, finalURL, isPopState);
    } catch (error) {
      hideLoading();
      window.location.href = url;
    }
  }
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a');
    if (!link) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target && link.target.toLowerCase() === '_blank') return;
    if (link.hasAttribute('download')) return;
    const url = new URL(link.href, location.origin);
    url.protocol = location.protocol;
    if (url.hostname !== location.hostname) return;
    if (isExcluded(url)) {
      return;
    }
    const current = new URL(location.href);
    const isSamePage = urlsAreSameIgnoringM(url, current);
    if (isSamePage) {
      event.preventDefault();
      hideLoading();
      if (url.hash) {
        const targetEl = document.querySelector(url.hash);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
        // Pertahankan query string saat ini, hanya ganti hash
        const newUrl = new URL(current.href);
        newUrl.hash = url.hash;
        history.replaceState(null, '', newUrl.href);
      }
      return;
    }
    event.preventDefault();
    loadPage(url.href, false);
  });
  document.addEventListener('submit', function (event) {
    const form = event.target.closest('form');
    if (!form) return;
    const method = (form.method || 'get').toLowerCase();
    if (method !== 'get') return;
    const action = form.action || location.href;
    const url = new URL(action, location.origin);
    const params = new URLSearchParams(new FormData(form));
    url.search = params.toString();
    if (isExcluded(url)) {
      return;
    }
    event.preventDefault();
    const current = new URL(location.href);
    if (urlsAreSameIgnoringM(url, current)) {
      hideLoading();
      return;
    }
    loadPage(url.href, false);
  });
  window.addEventListener('popstate', function () {
    loadPage(location.href, true);
  });
  window.addEventListener('hashchange', function () {
    hideLoading();
  });
})();

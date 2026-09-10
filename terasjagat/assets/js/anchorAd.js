(function () {
  const ANCHOR_SELECTOR = 'ins.adsbygoogle[data-anchor-status]';

  // ==== Konfigurasi CSS yang ingin dipaksa ====
  const ANCHOR_STYLE = {
    'bottom': '80px',
    'z-index': '123',
  };
  // =============================================

  function fixAnchorAd(element) {
    if (!element.matches(ANCHOR_SELECTOR)) return;
    for (const [prop, value] of Object.entries(ANCHOR_STYLE)) {
      element.style.setProperty(prop, value, 'important');
    }
  }

  function observeAnchorAd(element) {
    if (!element || element.dataset.anchorObserver === 'true') return;
    element.dataset.anchorObserver = 'true';

    fixAnchorAd(element);

    const anchorObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type !== 'attributes') return;
        if (
          mutation.attributeName === 'style' ||
          mutation.attributeName === 'data-anchor-status'
        ) {
          if (element.matches(ANCHOR_SELECTOR)) {
            fixAnchorAd(element);
          }
        }
      });
    });

    anchorObserver.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'data-anchor-status'],
    });
  }

  function scanAnchorAds() {
    document.querySelectorAll(ANCHOR_SELECTOR).forEach(observeAnchorAd);
  }

  scanAnchorAds();

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type !== 'childList') return;
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches(ANCHOR_SELECTOR)) {
          observeAnchorAd(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll(ANCHOR_SELECTOR).forEach(observeAnchorAd);
        }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

(function () {
  const ANCHOR_SELECTOR =
    'ins.adsbygoogle[data-anchor-status]';
  function fixAnchorAd(element) {
    if (!element.matches(ANCHOR_SELECTOR)) {
      return;
    }
    element.style.setProperty(
      'margin-bottom',
      '80px',
      'important'
    );
  }
  function observeAnchorAd(element) {
    if (!element || element.dataset.anchorObserver === 'true') {
      return;
    }
    element.dataset.anchorObserver = 'true';
    fixAnchorAd(element);
    const anchorObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes') {
          if (
            mutation.attributeName === 'style' ||
            mutation.attributeName === 'data-anchor-status'
          ) {
            if (element.matches(ANCHOR_SELECTOR)) {
              fixAnchorAd(element);
            }
          }
        }
      });
    });
    anchorObserver.observe(element, {
      attributes: true,
      attributeFilter: [
        'style',
        'data-anchor-status'
      ]
    });
  }
  function scanAnchorAds() {
    document
      .querySelectorAll(ANCHOR_SELECTOR)
      .forEach(function (element) {
        observeAnchorAd(element);
      });
  }
  scanAnchorAds();
  const documentObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type !== 'childList') {
        return;
      }
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) {
          return;
        }
        if (
          node.matches &&
          node.matches(ANCHOR_SELECTOR)
        ) {
          observeAnchorAd(node);
        }
        if (node.querySelectorAll) {
          node
            .querySelectorAll(ANCHOR_SELECTOR)
            .forEach(function (element) {
              observeAnchorAd(element);
            });
        }
      });
    });
  });
  documentObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

(function () {
  'use strict';
  const SELECTOR  = 'ins.adsbygoogle[data-anchor-status]';
  const TARGET_ID = 'appContent';
  document.body?.style.removeProperty('padding');
  document.body?.style.removeProperty('padding-bottom');
  const PB_SCALE = [
    [80,  'pb-20'],  [96,  'pb-24'],  [112, 'pb-28'],  [128, 'pb-32'],
    [144, 'pb-36'],  [160, 'pb-40'],  [176, 'pb-44'],  [192, 'pb-48'],
    [208, 'pb-52'],  [224, 'pb-56'],  [240, 'pb-60'],  [256, 'pb-64'],
    [288, 'pb-72'],  [320, 'pb-80'],  [384, 'pb-96'],
  ];
  const ALL_PB = PB_SCALE.map(([, c]) => c);
  function pickPb(px) {
    for (const [v, cls] of PB_SCALE) if (v >= px) return cls;
    return 'pb-96';
  }
  function apply() {
    const target = document.getElementById(TARGET_ID);
    if (!target) return;
    ALL_PB.forEach(c => target.classList.remove(c));
    const ad = document.querySelector(SELECTOR);
    if (!ad) return;
    const b = parseFloat(ad.style.bottom);
    if (!isNaN(b) && b < 0) return;
    const h = ad.getBoundingClientRect().height || 0;
    if (h > 0) target.classList.add(pickPb(h));
  }
  const ro = new ResizeObserver(apply);
  const seen = new WeakSet();
  function trackAd(ad) {
    if (seen.has(ad)) return;
    seen.add(ad);
    ro.observe(ad);
    new MutationObserver(apply).observe(ad, {
      attributes: true,
      attributeFilter: ['style', 'data-anchor-status'],
    });
  }
  function trackAll() {
    document.querySelectorAll(SELECTOR).forEach(trackAd);
  }
  function scan() {
    trackAll();
    apply();
  }
  scan();
  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener('resize', apply, { passive: true });
})();

(function() {
  const bottomNav = document.getElementById('bottomNav');
  const ORIGINAL_BOTTOM_NAV_INNER_HTML = bottomNav ? bottomNav.innerHTML : '';
  function resetBottomNav() {
    const nav = document.getElementById('bottomNav');
    if (nav && ORIGINAL_BOTTOM_NAV_INNER_HTML) {
      nav.innerHTML = ORIGINAL_BOTTOM_NAV_INNER_HTML;
    }
  }
  function updateBottomNav(config) {
    const navLinks = document.querySelectorAll('#bottomNav a');
    if (!navLinks.length) return;
    let items = [];
    if (Array.isArray(config)) {
      items = config;
    } else if (typeof config === 'object' && config !== null) {
      items = Object.entries(config).map(([key, value]) => ({
        index: parseInt(key) - 1,
        ...value
      }));
    }
    items.forEach(item => {
      const index = item.index !== undefined ? item.index : (item.pos - 1);
      const link = navLinks[index];
      if (!link) return;
      if (item.url) {
        link.setAttribute('href', item.url);
      }
      if (item.label) {
        link.setAttribute('aria-label', item.label);
        const labelSpan = link.querySelector('span:not(.material-symbols-outlined)');
        if (labelSpan) labelSpan.textContent = item.label;
      }
      if (item.icon) {
        let icon = link.querySelector('span.material-symbols-outlined');
        if (!icon) {
          icon = document.createElement('span');
          icon.className = 'material-symbols-outlined';
          link.prepend(icon);
        }
        icon.textContent = item.icon;
      }
    });
  }
  function handleReset() {
    resetBottomNav();
  }
  function handleUpdate(event) {
    const config = event.detail && event.detail.config;
    if (config) {
      updateBottomNav(config);
    }
  }
  window.addEventListener('bottomNav:reset', handleReset);
  window.addEventListener('bottomNav:update', handleUpdate);
  function processInitialConfig() {
    if (window.__bottomNavConfig) {
      updateBottomNav(window.__bottomNavConfig);
      delete window.__bottomNavConfig;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processInitialConfig);
  } else {
    processInitialConfig();
  }
  window.resetBottomNav = resetBottomNav;
  window.updateBottomNav = updateBottomNav;
})();

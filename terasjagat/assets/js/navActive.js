function normalizeUrl(url) {
  try {
    var u = new URL(url);
    u.searchParams.delete('m');
    return u.href;
  } catch (e) {
    return url;
  }
}
function updateActiveLink() {
  var currentUrl = normalizeUrl(window.location.href);
  var navLinks = document.querySelectorAll('#bottomNav a');
  navLinks.forEach(function(link) {
    if (normalizeUrl(link.href) === currentUrl) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
let bottomNavObserver = null;
function observeBottomNav() {
  const bottomNav = document.getElementById('bottomNav');
  if (!bottomNav) return;
  if (bottomNavObserver) {
    bottomNavObserver.disconnect();
  }
  bottomNavObserver = new MutationObserver(function(mutations) {
    updateActiveLink();
  });
  bottomNavObserver.observe(bottomNav, {
    childList: true,
    subtree: true
  });
  updateActiveLink();
}
document.addEventListener('DOMContentLoaded', function() {
  observeBottomNav();
  updateActiveLink();
});
var originalPushState = history.pushState;
history.pushState = function() {
  originalPushState.apply(this, arguments);
  updateActiveLink();
};
var originalReplaceState = history.replaceState;
history.replaceState = function() {
  originalReplaceState.apply(this, arguments);
  updateActiveLink();
};
window.addEventListener('popstate', function() {
  // Tunggu sebentar sampai konten PJAX dimuat
  setTimeout(updateActiveLink, 100);
});
document.addEventListener('pjax:statechange', function() {
  observeBottomNav();
  updateActiveLink();
});

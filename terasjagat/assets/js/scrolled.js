(function() {
    'use strict';
    var SCROLL_THRESHOLD = 100;
    var SCROLL_CONTAINER_ID = 'appContent';
    var body = document.body;
    var scrollContainer = document.getElementById(SCROLL_CONTAINER_ID);
    var ticking = false;
    if (!scrollContainer) {
        console.warn('Elemen dengan ID "' + SCROLL_CONTAINER_ID + '" tidak ditemukan.');
        return;
    }
    function updateScrollClass() {
        var scrollTop = scrollContainer.scrollTop;
        if (scrollTop > SCROLL_THRESHOLD) {
            // Scroll melewati batas -> tambahkan class
            if (!body.classList.contains('scrolled')) {
                body.classList.add('scrolled');
            }
        } else {
            if (body.classList.contains('scrolled')) {
                body.classList.remove('scrolled');
            }
        }
        ticking = false;
    }
    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(updateScrollClass);
            ticking = true;
        }
    }
    updateScrollClass();
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
})();

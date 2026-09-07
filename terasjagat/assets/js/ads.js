(function() {
    'use strict';
    let isAdSenseLoaded = false;
    let isAdSenseScriptLoaded = false;
    const pendingAdCallbacks = [];
    function processAdElements() {
        const adElements = document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
        adElements.forEach(function() {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        });
    }
    function loadAdSense() {
        if (isAdSenseLoaded) {
            return;
        }
        isAdSenseLoaded = true;
        const script = document.createElement('script');
        script.async = true;
        script.setAttribute('data-ad-client', 'ca-pub-9885678587121274');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9885678587121274';
        script.crossOrigin = 'anonymous';
        script.onload = function() {
            isAdSenseScriptLoaded = true;
            processAdElements();
            pendingAdCallbacks.forEach(function(cb) { cb(); });
            pendingAdCallbacks.length = 0;
        };
        document.head.appendChild(script);
    }
    window.processNewAds = function() {
        if (isAdSenseScriptLoaded) {
            processAdElements();
        } else {
            pendingAdCallbacks.push(processAdElements);
            loadAdSense();
        }
    };
    if ('requestIdleCallback' in window) {
        requestIdleCallback(loadAdSense, { timeout: 3000 });
    }
    setTimeout(loadAdSense, 3000);
    const events = ['scroll', 'click', 'mousemove', 'touchstart'];
    events.forEach(function(eventName) {
        window.addEventListener(eventName, loadAdSense, { once: true, passive: true });
    });
})();

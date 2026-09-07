(function() {
    const PullToRefresh = (function() {
        function init(container) {
            if (!container) {
                console.warn('[PullToRefresh] Container <main> tidak ditemukan.');
                return;
            }
            const pullToRefresh = {
                enabled: true,
                isPulling: false,
                isRefreshing: false,
                startX: 0,
                startY: 0,
                currentY: 0,
                distance: 0,
                threshold: 80,
                maxPull: 140,
                indicatorEl: null,
                spinnerEl: null,
                labelEl: null,
                viewEl: null,
                ready: false
            };
            function createPullIndicator() {
                if (pullToRefresh.indicatorEl) return pullToRefresh.indicatorEl;
                const indicator = document.createElement('div');
                indicator.id = 'pullToRefreshIndicator';
                indicator.style.cssText = 'position:absolute; top:0; left:0; right:0; height:60px; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:100; transform: translateY(-100%); transition: transform 0.2s ease;';
                const spinner = document.createElement('div');
                spinner.style.cssText = 'width:24px; height:24px; border:3px solid #3498db; border-top-color:transparent; border-radius:50%; margin-right:8px; display:none;';
                spinner.className = 'animate-spin';
                const label = document.createElement('span');
                label.style.cssText = 'font-size:14px; color:#6b7280;';
                label.textContent = 'Tarik untuk memuat ulang';
                indicator.appendChild(spinner);
                indicator.appendChild(label);
                container.appendChild(indicator);
                if (getComputedStyle(container).position === 'static') {
                    container.style.position = 'relative';
                }
                pullToRefresh.indicatorEl = indicator;
                pullToRefresh.spinnerEl = spinner;
                pullToRefresh.labelEl = label;
                return indicator;
            }
            function setPullIndicator(progress, ready) {
                const el = pullToRefresh.indicatorEl;
                if (!el) return;
                const height = 60;
                const translate = Math.min(progress * height, height) - height;
                el.style.transform = `translateY(${translate}px)`;
                if (pullToRefresh.labelEl) {
                    pullToRefresh.labelEl.textContent = ready ? 'Lepaskan untuk memuat ulang' : 'Tarik untuk memuat ulang';
                }
                if (pullToRefresh.spinnerEl) {
                    pullToRefresh.spinnerEl.style.display = 'none';
                }
            }
            function showPullLoading() {
                const el = pullToRefresh.indicatorEl;
                if (!el) return;
                el.style.transform = 'translateY(0)';
                if (pullToRefresh.spinnerEl) {
                    pullToRefresh.spinnerEl.style.display = 'block';
                }
                if (pullToRefresh.labelEl) {
                    pullToRefresh.labelEl.textContent = 'Memuat...';
                }
            }
            function resetPullView() {
                if (pullToRefresh.viewEl) {
                    pullToRefresh.viewEl.style.transition = 'transform 0.2s ease';
                    pullToRefresh.viewEl.style.transform = '';
                    setTimeout(() => {
                        if (pullToRefresh.viewEl) {
                            pullToRefresh.viewEl.style.transition = '';
                        }
                    }, 200);
                }
            }
            function hidePullIndicator() {
                const el = pullToRefresh.indicatorEl;
                if (!el) return;
                el.style.transform = 'translateY(-100%)';
                if (pullToRefresh.spinnerEl) pullToRefresh.spinnerEl.style.display = 'none';
            }
            function resetPullToRefresh() {
                pullToRefresh.isPulling = false;
                pullToRefresh.ready = false;
                pullToRefresh.distance = 0;
                resetPullView();
                if (!pullToRefresh.isRefreshing) {
                    hidePullIndicator();
                }
            }
            function finishPullToRefresh() {
                pullToRefresh.isRefreshing = false;
                hidePullIndicator();
            }
            function triggerPullToRefresh() {
                if (pullToRefresh.isRefreshing) return;
                pullToRefresh.isRefreshing = true;
                pullToRefresh.isPulling = false;
                pullToRefresh.ready = false;
                pullToRefresh.distance = 0;
                resetPullView();
                showPullLoading();
                if (typeof window.refreshCurrentView === 'function') {
                    try {
                        const result = window.refreshCurrentView();
                        if (result && typeof result.finally === 'function') {
                            result.finally(() => {
                                finishPullToRefresh();
                            });
                        } else {
                            setTimeout(() => finishPullToRefresh(), 300);
                        }
                    } catch (err) {
                        console.error('Error saat memanggil refreshCurrentView:', err);
                        finishPullToRefresh();
                    }
                } else {
                    location.reload();
                }
            }
            container.addEventListener('touchstart', function(e) {
                if (!pullToRefresh.enabled || pullToRefresh.isRefreshing) return;
                if (container.scrollTop !== 0) return;
                const target = e.target;
                if (target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
                const touch = e.touches[0];
                pullToRefresh.startX = touch.clientX;
                pullToRefresh.startY = touch.clientY;
                pullToRefresh.currentY = touch.clientY;
                pullToRefresh.distance = 0;
                pullToRefresh.isPulling = false;
                pullToRefresh.ready = false;
                pullToRefresh.viewEl = container.firstElementChild || container;

                createPullIndicator();
            }, { passive: true });
            container.addEventListener('touchmove', function(e) {
                if (!pullToRefresh.viewEl || pullToRefresh.isRefreshing) return;
                if (container.scrollTop !== 0) {
                    if (pullToRefresh.isPulling) resetPullToRefresh();
                    return;
                }
                const touch = e.touches[0];
                const deltaY = touch.clientY - pullToRefresh.startY;
                const deltaX = Math.abs(touch.clientX - pullToRefresh.startX);
                if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                    if (pullToRefresh.isPulling) resetPullToRefresh();
                    return;
                }
                if (deltaY <= 0) {
                    if (pullToRefresh.isPulling) resetPullToRefresh();
                    return;
                }
                if (!pullToRefresh.isPulling && deltaY < 10) return;
                if (!pullToRefresh.isPulling) {
                    pullToRefresh.isPulling = true;
                    pullToRefresh.viewEl.style.transition = 'none';
                }
                if (e.cancelable) e.preventDefault();
                pullToRefresh.currentY = touch.clientY;
                pullToRefresh.distance = Math.min(deltaY * 0.5, pullToRefresh.maxPull);
                pullToRefresh.ready = pullToRefresh.distance >= pullToRefresh.threshold;
                pullToRefresh.viewEl.style.transform = `translateY(${pullToRefresh.distance}px)`;
                setPullIndicator(pullToRefresh.distance / pullToRefresh.maxPull, pullToRefresh.ready);
            }, { passive: false });
            container.addEventListener('touchend', function(e) {
                if (!pullToRefresh.isPulling) return;
                if (pullToRefresh.ready) {
                    triggerPullToRefresh();
                } else {
                    resetPullToRefresh();
                }
            }, { passive: true });
            container.addEventListener('touchcancel', function(e) {
                resetPullToRefresh();
            }, { passive: true });
        }
        return {
            init: init
        };
    })();
    window.PullToRefresh = PullToRefresh;
    document.addEventListener('DOMContentLoaded', function() {
        const container = document.querySelector('main');
        if (container) {
            PullToRefresh.init(container);
        } else {
            console.warn('[PullToRefresh] Elemen <main> tidak ditemukan. Pull-to-refresh tidak diaktifkan.');
        }
    });
})();

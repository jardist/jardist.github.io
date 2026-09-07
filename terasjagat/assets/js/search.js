(function() {
    const SearchSheet = (function() {
        const dom = {
            sheet: document.getElementById('searchSheet'),
            overlay: document.getElementById('globalOverlay'),
            input: document.getElementById('searchInput'),
            clearBtn: document.getElementById('searchClear'),
            dragHandle: document.getElementById('dragHandle'),
        };
        let isOpen = false;
        let isDragging = false;
        let dragStartY = 0;
        let dragCurrentY = 0;
        let sheetHeight = 0;
        const KEYBOARD_THRESHOLD = 150;
        let keyboardAdjusted = false;
        function handleViewportKeyboard() {
            if (!isOpen || !dom.input) return;
            if (document.activeElement !== dom.input) {
                keyboardAdjusted = false;
                return;
            }
            const vv = window.visualViewport;
            if (!vv) return;
            const keyboardHeight = window.innerHeight - vv.height;
            const isKeyboardOpen = keyboardHeight > KEYBOARD_THRESHOLD;
            if (isKeyboardOpen) {
                if (!keyboardAdjusted) {
                    const rect = dom.input.getBoundingClientRect();
                    const vvTop = vv.offsetTop || 0;
                    const vvBottom = vvTop + vv.height;
                    const inputVisible = rect.top >= vvTop && rect.bottom <= vvBottom;
                    if (!inputVisible) {
                        requestAnimationFrame(() => {
                            dom.input.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });
                        });
                    }
                    keyboardAdjusted = true;
                }
            } else {
                keyboardAdjusted = false;
            }
        }
        function updateOverlay(visible) {
            dom.overlay.classList.toggle('active', visible);
        }
        function updateSheet(visible) {
            dom.sheet.classList.toggle('active', visible);
            if (visible) {
                dom.sheet.style.transform = '';
                dom.sheet.style.transition = '';
            }
        }
        function focusInput() {
            setTimeout(() => dom.input && dom.input.focus(), 150);
        }
        function resetDragStyles() {
            if (!dom.sheet) return;
            dom.sheet.style.transform = '';
            dom.sheet.style.transition = '';
            dom.overlay.style.opacity = '';
            isDragging = false;
        }
        function handleDragStart(e) {
            if (!isOpen) return;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            dragStartY = clientY;
            dragCurrentY = dragStartY;
            sheetHeight = dom.sheet.getBoundingClientRect().height;
            dom.sheet.style.transition = 'none';
            isDragging = false;
        }
        function handleDragMove(e) {
            if (!isOpen || !dom.sheet.classList.contains('active')) {
                if (isDragging) resetDragStyles();
                return;
            }
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            dragCurrentY = clientY;
            const deltaY = dragCurrentY - dragStartY;
            if (deltaY < 0) {
                if (isDragging) resetDragStyles();
                return;
            }
            if (Math.abs(deltaY) > 8 && !isDragging) {
                isDragging = true;
            }
            if (isDragging) {
                e.preventDefault();
                const maxTranslate = sheetHeight;
                const translate = Math.min(deltaY, maxTranslate);
                dom.sheet.style.transform = `translateY(${translate}px)`;
                const progress = maxTranslate > 0 ? translate / maxTranslate : 0;
                dom.overlay.style.opacity = 0.4 * (1 - progress);
            }
        }
        function handleDragEnd(e) {
            if (!isOpen) {
                resetDragStyles();
                return;
            }
            const deltaY = dragCurrentY - dragStartY;
            const threshold = sheetHeight * 0.2;
            if (deltaY > threshold) {
                publicAPI.close();
            } else {
                dom.sheet.style.transition = 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)';
                dom.sheet.style.transform = '';
                dom.overlay.style.opacity = '';
                setTimeout(() => {
                    dom.sheet.style.transition = '';
                }, 350);
            }
            isDragging = false;
        }
        const publicAPI = {
            open: function() {
                if (isOpen) return;
                isOpen = true;
                keyboardAdjusted = false;
                updateOverlay(true);
                updateSheet(true);
                focusInput();
                resetDragStyles();
            },
            close: function() {
                isOpen = false;
                keyboardAdjusted = false;
                updateOverlay(false);
                updateSheet(false);
                if (dom.input) dom.input.blur();
                resetDragStyles();
                dom.sheet.classList.remove('active');
                dom.overlay.classList.remove('active');
            },
            toggle: function() {
                if (isOpen) {
                    this.close();
                } else {
                    this.open();
                }
            },
            isOpen: function() {
                return isOpen;
            },
            init: function() {
                if (!dom.sheet || !dom.overlay) {
                    console.warn('[SearchSheet] Elemen tidak ditemukan, init dibatalkan.');
                    return;
                }
                dom.sheet.addEventListener('touchstart', handleDragStart, { passive: true });
                dom.sheet.addEventListener('touchmove', handleDragMove, { passive: false });
                dom.sheet.addEventListener('touchend', handleDragEnd, { passive: true });
                if (dom.dragHandle) {
                    dom.dragHandle.addEventListener('mousedown', handleDragStart);
                    document.addEventListener('mousemove', handleDragMove);
                    document.addEventListener('mouseup', handleDragEnd);
                }
                dom.overlay.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    publicAPI.close();
                });
                if (dom.clearBtn) {
                    dom.clearBtn.addEventListener('click', function() {
                        if (dom.input) {
                            dom.input.value = '';
                            dom.clearBtn.classList.add('!hidden');
                            dom.input.focus();
                        }
                    });
                }
                if (dom.input) {
                    dom.input.addEventListener('input', function() {
                        if (dom.clearBtn) {
                            dom.clearBtn.classList.toggle('!hidden', this.value.length === 0);
                        }
                    });
                    dom.input.addEventListener('blur', function() {
                        keyboardAdjusted = false;
                    });
                    dom.input.addEventListener('focus', function() {
                        if (window.visualViewport) {
                            setTimeout(handleViewportKeyboard, 250);
                        }
                    });
                }
                if (window.visualViewport) {
                    window.visualViewport.addEventListener('resize', handleViewportKeyboard);
                    window.visualViewport.addEventListener('scroll', handleViewportKeyboard);
                }
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && isOpen) {
                        publicAPI.close();
                    }
                });
                window.addEventListener('search:open', () => publicAPI.open());
                window.addEventListener('search:close', () => publicAPI.close());
                window.addEventListener('search:toggle', () => publicAPI.toggle());
                const searchBtn = document.getElementById('searchBtn');
                if (searchBtn) {
                    searchBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        publicAPI.toggle();
                    });
                }
            }
        };
        return publicAPI;
    })();
    window.SearchSheet = SearchSheet;
    document.addEventListener('DOMContentLoaded', function() {
        SearchSheet.init();
    });
})();

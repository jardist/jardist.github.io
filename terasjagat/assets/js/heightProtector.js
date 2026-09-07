(function () {
    'use strict';
    const PROTECTED_IDS =
        (typeof window !== 'undefined' &&
            window.ProtectedIdsConfig &&
            window.ProtectedIdsConfig.PROTECTED_IDS) ||
        [];
    const protectedHeights = new Map();
    function isElement(node) {
        return node instanceof HTMLElement;
    }
    function isProtected(element) {
        return (
            isElement(element) &&
            PROTECTED_IDS.includes(element.id)
        );
    }
    function getInlineHeight(element) {
        const style = element.getAttribute('style');
        if (!style) {
            return null;
        }
        const match = style.match(
            /(?:^|;)\s*height\s*:\s*([^;]+?)\s*(?:;|$)/i
        );
        return match ? match[1].trim() : null;
    }
    function removeAutoImportantHeight(element) {
        if (!isElement(element)) return;
        const style = element.getAttribute('style');
        if (!style) return;
        const cleaned = style
            .replace(
                /(?:^|;)\s*height\s*:\s*auto\s*!important\s*;?/gi,
                ';'
            )
            .replace(/^\s*;\s*/, '')
            .replace(/\s*;\s*$/i, '')
            .replace(/;\s*;/g, ';')
            .trim();
        if (cleaned === style.trim()) {
            return;
        }
        if (!cleaned) {
            element.removeAttribute('style');
        } else {
            element.setAttribute('style', cleaned);
        }
    }
    function registerProtectedElement(element) {
        if (!isProtected(element)) return;
        const originalHeight = getInlineHeight(element);
        protectedHeights.set(
            element.id,
            originalHeight
        );
    }
    function restoreProtectedHeight(element) {
        if (!isProtected(element)) return;
        const originalHeight =
            protectedHeights.get(element.id);
        if (originalHeight === null) {
            element.style.removeProperty('height');
            if (
                !element.getAttribute('style')?.trim()
            ) {
                element.removeAttribute('style');
            }
            return;
        }
        element.style.setProperty(
            'height',
            originalHeight
        );
    }
    function initializeProtectedElements() {
        PROTECTED_IDS.forEach(function (id) {
            const element =
                document.getElementById(id);
            if (!element) return;
            registerProtectedElement(element);
        });
    }
    const observer =
        new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (
                    mutation.type !== 'attributes' ||
                    mutation.attributeName !== 'style'
                ) {
                    return;
                }
                const element =
                    mutation.target;
                if (!isElement(element)) return;
                if (isProtected(element)) {
                    restoreProtectedHeight(element);
                    return;
                }
                removeAutoImportantHeight(element);
            });
        });
    function start() {
        initializeProtectedElements();
        PROTECTED_IDS.forEach(function (id) {
            const element =
                document.getElementById(id);
            if (!element) return;
            restoreProtectedHeight(element);
        });
        observer.observe(
            document.documentElement,
            {
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            }
        );
        document
            .querySelectorAll('[style]')
            .forEach(function (element) {
                if (isProtected(element)) {
                    restoreProtectedHeight(element);
                } else {
                    removeAutoImportantHeight(element);
                }
            });
    }
    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            start,
            { once: true }
        );
    } else {
        start();
    }
})();

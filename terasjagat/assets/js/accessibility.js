(function() {
    const prefs = {
        theme: localStorage.getItem('tj_theme') || 'system',
        fontSize: localStorage.getItem('tj_fontSize') || 'medium',
        highContrast: localStorage.getItem('tj_highContrast') === 'true',
        reduceMotion: localStorage.getItem('tj_reduceMotion') === 'true'
    };
    function applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'system') {
            const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.classList.toggle('dark', dark);
        } else {
            html.classList.toggle('dark', theme === 'dark');
        }
        localStorage.setItem('tj_theme', theme);
        prefs.theme = theme;
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }
function applyFontSize(size) {
    const root = document.documentElement;
    const map = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-xl'
    };
    root.classList.remove(
        'text-sm',
        'text-base',
        'text-xl'
    );
    root.classList.add(map[size] || 'text-base');
    localStorage.setItem('tj_fontSize', size);
    prefs.fontSize = size;
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.classList.toggle(
            'active',
            btn.dataset.size === size
        );
    });
}
function applyHighContrast(enabled) {
    document.documentElement.classList.toggle('contrast-[1.2]', enabled);
    localStorage.setItem('tj_highContrast', String(enabled));
    prefs.highContrast = enabled;
    const cb = document.getElementById('highContrast');
    if (cb) cb.checked = enabled;
}
    function applyReduceMotion(enabled) {
        document.documentElement.classList.toggle('reduce-motion', enabled);
        localStorage.setItem('tj_reduceMotion', String(enabled));
        prefs.reduceMotion = enabled;
        const cb = document.getElementById('reduceMotion');
        if (cb) cb.checked = enabled;
    }
    function initSettingsView() {
        applyTheme(prefs.theme);
        applyFontSize(prefs.fontSize);
        applyHighContrast(prefs.highContrast);
        applyReduceMotion(prefs.reduceMotion);
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.removeEventListener('click', themeHandler);
            btn.addEventListener('click', themeHandler);
        });
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.removeEventListener('click', fontHandler);
            btn.addEventListener('click', fontHandler);
        });
        const hc = document.getElementById('highContrast');
        const rm = document.getElementById('reduceMotion');
        if (hc) {
            hc.removeEventListener('change', contrastHandler);
            hc.addEventListener('change', contrastHandler);
        }
        if (rm) {
            rm.removeEventListener('change', motionHandler);
            rm.addEventListener('change', motionHandler);
        }
    }
    function themeHandler() {
        const theme = this.dataset.theme;
        applyTheme(theme);
        if (theme === 'system') {
            const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.classList.toggle('dark', dark);
        }
    }
    function fontHandler() {
        applyFontSize(this.dataset.size);
    }
    function contrastHandler() {
        applyHighContrast(this.checked);
    }
    function motionHandler() {
        applyReduceMotion(this.checked);
    }
    const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    darkMedia.addEventListener('change', (e) => {
        if (prefs.theme === 'system') {
            document.documentElement.classList.toggle('dark', e.matches);
        }
    });
    const settingsEl = document.getElementById('view-settings');
    if (settingsEl) {
        const observer = new MutationObserver(() => {
            if (settingsEl.classList.contains('active')) {
                initSettingsView();
            }
        });
        observer.observe(settingsEl, { attributes: true, attributeFilter: ['class'] });
        // Jika sudah aktif (misal dari refresh)
        if (settingsEl.classList.contains('active')) {
            initSettingsView();
        }
    }
    applyTheme(prefs.theme);
    applyFontSize(prefs.fontSize);
    applyHighContrast(prefs.highContrast);
    applyReduceMotion(prefs.reduceMotion);
})();

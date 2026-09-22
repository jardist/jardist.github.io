(function() {
    const sheet = document.getElementById('cari');
    if (!sheet) {
        console.warn('[Search] Elemen #cari tidak ditemukan.');
        return;
    }
    const input    = sheet.querySelector('form input');
    const clearBtn = sheet.querySelector('form button');
    if (!input) {
        console.warn('[Search] Input tidak ditemukan di dalam #cari form.');
        return;
    }
    function focusInput() {
        setTimeout(() => {
            input.focus();
            const len = input.value.length;
            try {
                input.setSelectionRange(len, len);
            } catch (e) {}
        }, 150);
    }
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                const isHidden = sheet.classList.contains('hidden');
                if (!isHidden) {
                    focusInput();
                } else {
                    input.blur();
                }
            }
        });
    });
    observer.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    function updateClearButton() {
        if (!clearBtn) return;
        clearBtn.classList.toggle('!hidden', input.value.length === 0);
    }
    updateClearButton();
    input.addEventListener('input', updateClearButton);
    if (clearBtn) {
        clearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            input.value = '';
            updateClearButton();
            input.focus();
            const len = input.value.length;
            try {
                input.setSelectionRange(len, len);
            } catch (err) {}
        });
    }
})();

(function() {
    const sheet    = document.getElementById('cari');
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
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') input.blur();
    });
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            focusInput();
        });
    }
    window.addEventListener('search:open', focusInput);
    window.SearchSheet = { focusInput, input, clearBtn };
})();

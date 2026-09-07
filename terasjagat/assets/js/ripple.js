(function() {
    document.addEventListener('DOMContentLoaded', function() {
        document.addEventListener('pointerdown', (e) => {
            const container = e.target.closest('.ripple');
            if (!container) return;
            const target = container.querySelector('.ripple-target') || container;
            if (getComputedStyle(target).position === 'static') {
                target.style.position = 'relative';
            }
            const rect = target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const diameter = Math.max(
                Math.hypot(x, y),
                Math.hypot(rect.width - x, y),
                Math.hypot(x, rect.height - y),
                Math.hypot(rect.width - x, rect.height - y)
            ) * 2;
            const ripple = document.createElement('span');
            ripple.className = `
                absolute rounded-full pointer-events-none
                bg-slate-900/20 dark:bg-slate-100/30
                opacity-60 transition-all duration-500 ease-out
            `;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.style.width = `${diameter}px`;
            ripple.style.height = `${diameter}px`;
            ripple.style.transform = 'translate(-50%, -50%) scale(0)';
            target.appendChild(ripple);
            requestAnimationFrame(() => {
                ripple.style.transform = 'translate(-50%, -50%) scale(1)';
                ripple.style.opacity = '0';
            });
            ripple.addEventListener('transitionend', () => {
                ripple.remove();
            }, { once: true });
        });
    });
})();

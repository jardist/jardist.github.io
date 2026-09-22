(() => {
  let active = null;
  const blurCache = new WeakMap();
  const getSheet = overlay =>
    overlay.querySelector(':scope > .bSheet');
  const getBlur = overlay => {
    if (blurCache.has(overlay)) {
      return blurCache.get(overlay);
    }
    const style = getComputedStyle(overlay);
    const filter =
      style.backdropFilter ||
      style.webkitBackdropFilter ||
      '';
    const match =
      filter.match(/blur\(\s*([\d.]+)px\s*\)/);
    const blur =
      match ? parseFloat(match[1]) : 0;
    blurCache.set(overlay, blur);
    return blur;
  };
  const openSheet = overlay => {
    const sheet = getSheet(overlay);
    if (!sheet) return;
    const blur = getBlur(overlay);
    overlay.classList.remove('hidden');
    overlay.style.pointerEvents = 'auto';
    overlay.style.transition = 'none';
    overlay.style.webkitTransition = 'none';
    sheet.style.transition = 'none';
    sheet.style.transform =
      'translateY(100%)';
    overlay.style.backgroundColor =
      'color-mix(in srgb, var(--color-surface-container-lowest) 0%, transparent)';
    overlay.style.backdropFilter =
      'blur(0px)';
    overlay.style.webkitBackdropFilter =
      'blur(0px)';
    requestAnimationFrame(() => {
      sheet.style.transition =
        'transform 220ms cubic-bezier(.2,0,0,1)';
      overlay.style.transition =
        'background-color 220ms ease, backdrop-filter 220ms ease';
      overlay.style.webkitTransition =
        'background-color 220ms ease, -webkit-backdrop-filter 220ms ease';
      requestAnimationFrame(() => {
        sheet.style.transform =
          'translateY(0)';
        overlay.style.backgroundColor =
          'color-mix(in srgb, var(--color-surface-container-lowest) 50%, transparent)';
        overlay.style.backdropFilter =
          `blur(${blur}px)`;
        overlay.style.webkitBackdropFilter =
          `blur(${blur}px)`;
      });
    });
  };
  const closeSheet = overlay => {
    const sheet = getSheet(overlay);
    if (!sheet) return;
    const duration = 220;
    sheet.style.transition =
      `transform ${duration}ms cubic-bezier(.2,0,0,1)`;
    overlay.style.transition =
      `background-color ${duration}ms ease, backdrop-filter ${duration}ms ease`;
    overlay.style.webkitTransition =
      `background-color ${duration}ms ease, -webkit-backdrop-filter ${duration}ms ease`;
    sheet.style.transform =
      'translateY(100%)';
    overlay.style.backgroundColor =
      'color-mix(in srgb, var(--color-surface-container-lowest) 0%, transparent)';
    overlay.style.backdropFilter =
      'blur(0px)';
    overlay.style.webkitBackdropFilter =
      'blur(0px)';
    overlay.style.pointerEvents =
      'none';
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, duration);
  };
  document.addEventListener(
    'pointerdown',
    e => {
      const handle =
        e.target.closest('.bSheet-handle');
      if (!handle) return;
      const overlay =
        handle.closest('.bSheet-overlay');
      if (!overlay) return;
      const sheet =
        getSheet(overlay);
      if (!sheet) return;
      active = {
        overlay,
        sheet,
        pointerId: e.pointerId,
        startY: e.clientY,
        startTime: performance.now(),
        blur: getBlur(overlay)
      };
      handle.style.touchAction =
        'none';
      handle.setPointerCapture?.(
        e.pointerId
      );
      sheet.style.transition =
        'none';
      overlay.style.transition =
        'none';
      overlay.style.webkitTransition =
        'none';
      e.preventDefault();
    }
  );
  document.addEventListener(
    'pointermove',
    e => {
      if (
        !active ||
        e.pointerId !== active.pointerId
      ) {
        return;
      }
      const distance =
        Math.max(
          0,
          e.clientY - active.startY
        );
      const progress =
        Math.min(
          distance / active.sheet.offsetHeight,
          1
        );
      const alpha =
        0.5 * (1 - progress);
      const currentBlur =
        active.blur * (1 - progress);
      active.sheet.style.transform =
        `translateY(${distance}px)`;
      active.overlay.style.backgroundColor =
        `color-mix(
          in srgb,
          var(--color-surface-container-lowest) ${alpha * 100}%,
          transparent
        )`;
      active.overlay.style.backdropFilter =
        `blur(${currentBlur}px)`;
      active.overlay.style.webkitBackdropFilter =
        `blur(${currentBlur}px)`;
      e.preventDefault();
    }
  );
  document.addEventListener(
    'pointerup',
    e => {
      if (
        !active ||
        e.pointerId !== active.pointerId
      ) {
        return;
      }
      const overlay =
        active.overlay;
      const sheet =
        active.sheet;
      const distance =
        Math.max(
          0,
          e.clientY - active.startY
        );
      const elapsed =
        Math.max(
          1,
          performance.now() -
          active.startTime
        );
      const velocity =
        distance / elapsed;
      const threshold =
        Math.max(
          80,
          sheet.offsetHeight * 0.25
        );
      const blur =
        active.blur;
      active = null;
      if (
        distance > threshold ||
        velocity > 0.8
      ) {
        closeSheet(overlay);
        return;
      }
      sheet.style.transition =
        'transform 220ms cubic-bezier(.2,0,0,1)';
      overlay.style.transition =
        'background-color 220ms ease, backdrop-filter 220ms ease';
      overlay.style.webkitTransition =
        'background-color 220ms ease, -webkit-backdrop-filter 220ms ease';
      sheet.style.transform =
        'translateY(0)';
      overlay.style.backgroundColor =
        'color-mix(in srgb, var(--color-surface-container-lowest) 50%, transparent)';
      overlay.style.backdropFilter =
        `blur(${blur}px)`;
      overlay.style.webkitBackdropFilter =
        `blur(${blur}px)`;
    }
  );
  document.addEventListener(
    'pointercancel',
    () => {
      if (!active) return;
      const overlay =
        active.overlay;
      const sheet =
        active.sheet;
      const blur =
        active.blur;
      active = null;
      sheet.style.transition =
        'transform 220ms cubic-bezier(.2,0,0,1)';
      overlay.style.transition =
        'background-color 220ms ease, backdrop-filter 220ms ease';
      overlay.style.webkitTransition =
        'background-color 220ms ease, -webkit-backdrop-filter 220ms ease';
      sheet.style.transform =
        'translateY(0)';
      overlay.style.backgroundColor =
        'color-mix(in srgb, var(--color-surface-container-lowest) 50%, transparent)';
      overlay.style.backdropFilter =
        `blur(${blur}px)`;
      overlay.style.webkitBackdropFilter =
        `blur(${blur}px)`;
    }
  );
  document.addEventListener(
    'click',
    e => {
      if (active) return;
      const overlay =
        e.target.closest('.bSheet-overlay');
      if (!overlay) return;
      if (e.target !== overlay) return;
      closeSheet(overlay);
    }
  );
  const observer =
    new MutationObserver(
      mutations => {
        for (const mutation of mutations) {
          if (
            mutation.type !== 'attributes' ||
            mutation.attributeName !== 'class'
          ) {
            continue;
          }
          const overlay =
            mutation.target;
          if (
            !overlay.matches?.(
              '.bSheet-overlay'
            )
          ) {
            continue;
          }
          const oldClass =
            mutation.oldValue || '';
          const newClass =
            overlay.className;
          const wasHidden =
            oldClass
              .split(/\s+/)
              .includes('hidden');
          const isHidden =
            overlay.classList.contains(
              'hidden'
            );
          if (
            wasHidden &&
            !isHidden
          ) {
            openSheet(overlay);
          }
        }
      }
    );
  observer.observe(
    document.body,
    {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
      childList: true
    }
  );
  window.bSheetOpen = target => {
    const overlay =
      typeof target === 'string'
        ? document.querySelector(target)
        : target;
    if (!overlay) return;
    if (
      overlay.classList.contains('hidden')
    ) {
      overlay.classList.remove('hidden');
    } else {
      openSheet(overlay);
    }
  };
})();

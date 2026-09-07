(function () {
  function updateBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (!backBtn) return;

    if (history.state && history.state.pjaxInternal === true) {
      backBtn.classList.remove('hidden');
    } else {
      backBtn.classList.add('hidden');
    }
  }
  window.addEventListener('pjax:statechange', updateBackButton);
  document.addEventListener('click', function (event) {
    const backBtn = event.target.closest('#backBtn');
    if (backBtn) {
      event.preventDefault();
      history.back();
    }
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateBackButton);
  } else {
    updateBackButton();
  }
})();

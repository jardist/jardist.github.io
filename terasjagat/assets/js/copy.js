document.querySelectorAll('.copy-button').forEach(button => {
  button.onclick = async () => {
    const target = button.closest('.copy').querySelector('.copy-target');
    await navigator.clipboard.writeText(target.textContent);
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-container-highest text-on-surface text-m3-body-medium shadow-md';
    toast.textContent = 'Berhasil di-copy';
    document.body.append(toast);
    setTimeout(() => toast.remove(), 1500);
  };
});

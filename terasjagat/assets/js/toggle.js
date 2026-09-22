document.addEventListener('click', e => {
  const trigger = e.target.closest('[for]');
  if (!trigger) return;
  const id = trigger.getAttribute('for');
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  target.classList.toggle('hidden');
});

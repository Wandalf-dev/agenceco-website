document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (!burger || !nav) return;

  const isOpen = () => nav.classList.contains('active');
  const open = () => {
    nav.classList.add('active');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll'); // optionnel
  };
  const close = () => {
    nav.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  };
  const toggle = () => (isOpen() ? close() : open());

  // Ouvrir/fermer au clic burger
  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  // Fermer en cliquant un lien du menu
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });

  // Fermer en cliquant hors menu
  document.addEventListener('click', (e) => {
    if (isOpen() && !nav.contains(e.target) && e.target !== burger) close();
  });

  // Reset si on repasse en desktop
  const mq = window.matchMedia('(min-width: 769px)');
  (mq.addEventListener ? mq.addEventListener('change', () => close())
                       : mq.addListener(() => close()));
});



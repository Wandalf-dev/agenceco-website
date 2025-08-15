
// JS — Menu burger "rideau" (SOLID): ouverture + fermeture animées
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const nav    = document.getElementById('nav');
  const header = document.querySelector('header');
  if (!burger || !nav || !header) return;

  // État initial
  nav.classList.remove('active');
  burger.setAttribute('aria-expanded', 'false');

  const placeUnderHeader = () => {
    const h = header.offsetHeight || 80;
    document.documentElement.style.setProperty('--header-h', `${h}px`);
    nav.style.top = `${h}px`;
  };

  const isOpen = () => nav.classList.contains('active');
  const toggle = () => (isOpen() ? close() : open());

  const open = () => {
    placeUnderHeader();
    requestAnimationFrame(() => {
      nav.classList.add('active');                // transform 0 → 1 + opacity 0 → 1
      burger.setAttribute('aria-expanded', 'true');
    });
  };

  const close = () => {
    // retirer .active déclenche l'anim inverse 1 → 0 (pas de visibility qui coupe l'anim)
    nav.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
  };

  // Interactions
  burger.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('click', (e) => { if (isOpen() && !nav.contains(e.target) && !burger.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });

  // Reste sous le header si la page bouge pendant que c'est ouvert
  window.addEventListener('resize', () => { if (isOpen()) placeUnderHeader(); });
  window.addEventListener('scroll', () => { if (isOpen()) placeUnderHeader(); }, { passive: true });

  // Repli si on repasse en desktop
  const mq = window.matchMedia('(min-width: 901px)');
  (mq.addEventListener ? mq.addEventListener('change', close) : mq.addListener(close));
});

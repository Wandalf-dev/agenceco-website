/**
 * ================================================================
 *  AgenceEco — Galerie (Slider)
 *  Fonctionnalités :
 *    - Autoplay + navigation via dots + boutons du BAS
 *    - Accessibilité : aria-current, aria-hidden, aria-label
 *    - Desktop : pause au survol, flèches clavier
 *    - Mobile/Tablet : swipe tactile
 * ================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.querySelector('.notre-galerie .galerie-slider');
  if (!slider) return;

  const track    = slider.querySelector('.galerie-track');
  const slides   = Array.from(track?.querySelectorAll('.slide') || []);
  const dotsWrap = slider.querySelector('.galerie-dots');

  // 👉 Utiliser uniquement les BOUTONS DU BAS
  const prevBtn  = document.querySelector('.notre-galerie .navigation-buttons .prev');
  const nextBtn  = document.querySelector('.notre-galerie .navigation-buttons .next');

  if (!track || !slides.length || !dotsWrap) return;

  // Réglages
  let index = 0;
  const INTERVAL  = 2500;  // autoplay
  const DURATION  = 500;   // transition CSS
  const THRESHOLD = 40;    // swipe min
  const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  let timer = null;

  // Dots
  dotsWrap.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Aller à l’image ${i + 1}`);
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  // Moteur d’affichage
  function update() {
    track.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach((d, i) => d.setAttribute('aria-current', i === index ? 'true' : 'false'));
    slides.forEach((s, i) => s.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
  }

  function goTo(i) { index = (i + slides.length) % slides.length; update(); }
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Autoplay
  function start() { stop(); timer = setInterval(next, INTERVAL); }
  function stop()  { if (timer) { clearInterval(timer); timer = null; } }
  const restart = () => { stop(); start(); };

  // Interactions
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); restart(); }));
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); restart(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restart(); });

  // Desktop : hover + clavier
  if (!isTouchDevice) {
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);

    slider.tabIndex = 0;
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { next(); restart(); }
      if (e.key === 'ArrowLeft')  { prev(); restart(); }
    });
  }

  // Mobile/Tablet : swipe tactile
  let startX = null, deltaX = 0, dragging = false;

  function onStartTouch(e) {
    dragging = true;
    startX = e.touches[0].clientX;
    stop();
    track.style.transition = 'none';
  }
  function onMoveTouch(e) {
    if (!dragging) return;
    const x = e.touches[0].clientX;
    deltaX = x - startX;
    const base = -index * slider.clientWidth;
    track.style.transform = `translateX(${base + deltaX}px)`;
  }
  function onEndTouch() {
    if (!dragging) return;
    track.style.transition = `transform ${DURATION}ms ease-in-out`;
    if (Math.abs(deltaX) > THRESHOLD) (deltaX > 0 ? prev() : next());
    else update();
    dragging = false; startX = null; deltaX = 0; start();
  }

  slider.addEventListener('touchstart', onStartTouch, { passive: true });
  slider.addEventListener('touchmove',  onMoveTouch,  { passive: true });
  slider.addEventListener('touchend',   onEndTouch);
  slider.addEventListener('touchcancel',onEndTouch);

  // Onglet caché : pause autoplay
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  // Init
  update();
  start();
});

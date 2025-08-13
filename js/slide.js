// js/slide.js
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.querySelector('.notre-galerie .galerie-slider');
  if (!slider) return;

  const track    = slider.querySelector('.galerie-track');
  const slides   = Array.from(track?.querySelectorAll('.slide') || []);
  const dotsWrap = slider.querySelector('.galerie-dots');

  // Boutons internes (présents seulement sur PC, cachés en mobile via CSS)
  const prevBtn  = slider.querySelector('.slider-buttons .prev');
  const nextBtn  = slider.querySelector('.slider-buttons .next');

  if (!track || !slides.length || !dotsWrap) return;

  /* ====== Réglages ====== */
  let index = 0;
  const INTERVAL  = 3500; // ms entre deux slides (autoplay)
  const DURATION  = 500;  // ms de l’animation; aligner avec le CSS (.galerie-track transition)
  const THRESHOLD = 40;   // px : distance minimale pour valider un swipe
  const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  let timer = null;

  /* ====== Dots ====== */
  dotsWrap.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Aller à l’image ${i + 1}`);
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  /* ====== Moteur ====== */
  function update() {
    track.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach((d, i) => d.setAttribute('aria-current', i === index ? 'true' : 'false'));
    slides.forEach((s, i) => s.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    update();
  }
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  function start() {
    stop();
    timer = setInterval(next, INTERVAL);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  const restart = () => { stop(); start(); };

  /* ====== Dots + Boutons (si présents) ====== */
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); restart(); }));
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); restart(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restart(); });

  /* ====== Desktop : pause au survol + clavier ====== */
  if (!isTouchDevice) {
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);

    slider.tabIndex = 0;
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { next(); restart(); }
      if (e.key === 'ArrowLeft')  { prev(); restart(); }
    });

    // Évite que le focus des boutons garde l’affichage après clic
    const sliderBtns = slider.querySelectorAll('.slider-buttons .btn');
    sliderBtns.forEach(btn => btn.addEventListener('mousedown', e => e.preventDefault()));
    slider.addEventListener('mouseleave', () => {
      sliderBtns.forEach(btn => btn.blur());
    });
  }

  /* ====== Mobile/Tablet : swipe au doigt (pas de drag souris) ====== */
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
    if (Math.abs(deltaX) > THRESHOLD) {
      deltaX > 0 ? prev() : next();
    } else {
      update();
    }
    dragging = false;
    startX = null;
    deltaX = 0;
    start();
  }

  // Tactile uniquement
  slider.addEventListener('touchstart', onStartTouch, { passive: true });
  slider.addEventListener('touchmove',  onMoveTouch,  { passive: true });
  slider.addEventListener('touchend',   onEndTouch);
  slider.addEventListener('touchcancel',onEndTouch);

  // IMPORTANT : on n’attache PAS d’événements drag à la souris (interdit sur PC)

  /* ====== Onglet caché : pause autoplay ====== */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  /* ====== Init ====== */
  update();
  start();
});

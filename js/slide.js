/**
 * ================================================================
 *  AgenceEco — Galerie (Slider)
 *
 *  Objectif :
 *    1) Autoplay + navigation via Dots + 2 boutons BAS (prev/next)
 *    2) Accessibilité : aria-current (dot actif), aria-hidden (slide off)
 *    3) Desktop : pause au survol + flèches clavier (← →)
 *    4) Mobile/Tablet : swipe tactile (seuil configuré)
 *
 *  Pré-requis côté HTML :
 *    .notre-galerie
 *      .galerie-slider
 *        .galerie-track > .slide*      (slides 100% largeur)
 *        .galerie-dots                 (recevra les dots)
 *      .navigation-buttons
 *        .prev / .next                 (2 boutons bas)
 *
 *  Notes techniques :
 *    - Les dots sont générés dynamiquement selon le nombre de .slide
 *    - Le slider translate la track en % (1 slide = 100%)
 *    - Le swipe désactive temporairement la transition pour un drag fluide
 * ================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  // Récupération du composant slider
  const slider = document.querySelector('.notre-galerie .galerie-slider')
  if (!slider) return

  // Éléments internes
  const track    = slider.querySelector('.galerie-track')
  const slides   = Array.from(track?.querySelectorAll('.slide') || [])
  const dotsWrap = slider.querySelector('.galerie-dots')

  // 👉 Navigation : on utilise UNIQUEMENT les boutons du BAS
  const prevBtn  = document.querySelector('.notre-galerie .navigation-buttons .prev')
  const nextBtn  = document.querySelector('.notre-galerie .navigation-buttons .next')

  if (!track || !slides.length || !dotsWrap) return

  // Réglages
  let index = 0                   // index du slide courant
  const INTERVAL  = 2500          // vitesse autoplay (ms)
  const DURATION  = 500           // durée transition CSS (ms)
  const THRESHOLD = 40            // seuil swipe (px)
  const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches

  // Timer autoplay
  let timer = null

  // ================== Dots (pagination) ==================
  // (réinitialise puis crée un dot par slide, avec aria-label)
  dotsWrap.innerHTML = ''
  slides.forEach((_, i) => {
    const dot = document.createElement('button')
    dot.type = 'button'
    dot.setAttribute('aria-label', `Aller à l’image ${i + 1}`)
    dotsWrap.appendChild(dot)
  })
  const dots = Array.from(dotsWrap.children)

  // ================== Moteur d’affichage ==================
  function update() {
    // Translate la track pour afficher la slide courante
    track.style.transform = `translateX(${-index * 100}%)`

    // Accessibilité : dot actif + slides masquées
    dots.forEach((d, i) => d.setAttribute('aria-current', i === index ? 'true' : 'false'))
    slides.forEach((s, i) => s.setAttribute('aria-hidden', i === index ? 'false' : 'true'))
  }

  // Navigation par index (boucle)
  function goTo(i) {
    index = (i + slides.length) % slides.length
    update()
  }
  const next = () => goTo(index + 1)
  const prev = () => goTo(index - 1)

  // ================== Autoplay ==================
  function start() {
    stop()
    timer = setInterval(next, INTERVAL)
  }
  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
  const restart = () => { stop(); start() }

  // ================== Interactions ==================
  // Dots
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); restart() }))

  // Boutons bas
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); restart() })
  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restart() })

  // ================== Desktop ==================
  if (!isTouchDevice) {
    // Pause au survol pour faciliter la lecture
    slider.addEventListener('mouseenter', stop)
    slider.addEventListener('mouseleave', start)

    // Navigation clavier (le slider devient focusable)
    slider.tabIndex = 0
    slider.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { next(); restart() }
      if (e.key === 'ArrowLeft')  { prev(); restart() }
    })
  }

  // ================== Mobile/Tablet (Swipe) ==================
  let startX = null, deltaX = 0, dragging = false

  function onStartTouch(e) {
    dragging = true
    startX = e.touches[0].clientX
    stop()                               // fige l’autoplay pendant le drag
    track.style.transition = 'none'      // retire la transition pour suivre le doigt
  }
  function onMoveTouch(e) {
    if (!dragging) return
    const x = e.touches[0].clientX
    deltaX = x - startX

    // Position de base du slide courant en pixels
    const base = -index * slider.clientWidth
    track.style.transform = `translateX(${base + deltaX}px)`
  }
  function onEndTouch() {
    if (!dragging) return
    // Restaure la transition pour l’atterrissage
    track.style.transition = `transform ${DURATION}ms ease-in-out`

    // Seuil : si déplacement suffisant → navigation, sinon on revient
    if (Math.abs(deltaX) > THRESHOLD) deltaX > 0 ? prev() : next()
    else update()

    // Reset drag + relance autoplay
    dragging = false
    startX = null
    deltaX = 0
    start()
  }

  slider.addEventListener('touchstart', onStartTouch, { passive: true })
  slider.addEventListener('touchmove',  onMoveTouch,  { passive: true })
  slider.addEventListener('touchend',   onEndTouch)
  slider.addEventListener('touchcancel',onEndTouch)

  // ================== Page cachée : pause ==================
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop()
    else start()
  })

  // ================== Init ==================
  update()
  start()
})

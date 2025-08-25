/**
 * ================================================================
 *  AgenceEco — Menu Burger (front)
 *  Objectif exercice :
 *    1) Gérer l’ouverture/fermeture du menu mobile (effet "rideau")
 *    2) Maintenir la cohérence ARIA (accessibilité : aria-expanded)
 *    3) Repositionner dynamiquement le menu sous le header
 *    4) Couvrir tous les cas d’interaction (clic, clic extérieur,
 *       touche Échap, resize/scroll, retour en desktop)
 *
 *  Pré-requis côté HTML :
 *    <header>…<button id="burger">…</button></header>
 *    <nav id="nav">…</nav>
 *
 *  Note UX :
 *    - L’animation est assurée par CSS (.active).
 *    - Pas de `visibility: hidden` pour laisser la transition s’exécuter.
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger') // Bouton déclencheur
  const nav    = document.getElementById('nav')    // Menu cible
  const header = document.querySelector('header')  // Header parent
  if (!burger || !nav || !header) return

  // ====== État initial ======
  nav.classList.remove('active')
  burger.setAttribute('aria-expanded', 'false')

  // Calcule et applique la hauteur du header comme marge supérieure du menu
  const placeUnderHeader = () => {
    const h = header.offsetHeight || 80
    document.documentElement.style.setProperty('--header-h', `${h}px`)
    nav.style.top = `${h}px`
  }

  // Helpers
  const isOpen = () => nav.classList.contains('active')
  const toggle = () => (isOpen() ? close() : open())

  // ====== Actions principales ======
  const open = () => {
    placeUnderHeader() // Position correcte sous le header
    requestAnimationFrame(() => { // Assure le déclenchement de l’anim CSS
      nav.classList.add('active')
      burger.setAttribute('aria-expanded', 'true')
    })
  }

  const close = () => {
    nav.classList.remove('active') // L’anim CSS inverse se joue
    burger.setAttribute('aria-expanded', 'false')
  }

  // ====== Interactions ======
  burger.addEventListener('click', (e) => { e.stopPropagation(); toggle() })
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close() })
  document.addEventListener('click', (e) => {
    if (isOpen() && !nav.contains(e.target) && !burger.contains(e.target)) close()
  })
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close() })

  // ====== Ajustements dynamiques ======
  window.addEventListener('resize', () => { if (isOpen()) placeUnderHeader() })
  window.addEventListener('scroll', () => { if (isOpen()) placeUnderHeader() }, { passive: true })

  // ====== Cas desktop ======
  // Si la largeur dépasse 900px (nav visible en plein), on force la fermeture
  const mq = window.matchMedia('(min-width: 901px)')

  // écoute le passage desktop/mobile
  if (mq.addEventListener) {
    mq.addEventListener('change', close)
  } else {
    mq.addListener(close) // compatibilité anciens navigateurs
  }

})

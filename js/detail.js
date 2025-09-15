/**
 * ================================================================
 *  AgenceEco — Détail d’un article (detail.js)
 *
 *  Objectifs :
 *    1) Récupérer l’ID depuis l’URL et hydrater la page détail.
 *    2) Afficher un état "Chargement…" retardé (anti-flash).
 *    3) Sécurité : échapper le texte et n’autoriser qu’un sous-ensemble HTML.
 *    4) Performance : course de requêtes (Promise.any) sur les endpoints possibles.
 *
 *  Pré-requis HTML :
 *    - Une section #article-detail existe (ou sera injectée en fallback).
 *    - Des emplacements dynamiques (titre, date, excerpt, cover, contenu) sont créés par le script.
 *
 *  Notes techniques :
 *    - Le placeholder "Chargement…" n’apparaît qu’après 250ms (évite un flicker si la réponse est rapide).
 *    - La fonction formatText() permet du texte brut multi-paragraphes ou un HTML éditorial restreint.
 *    - Le rendu définit aussi le <title> du document.
 * ================================================================
 */
;(() => {
  // --- 1) Récupération de l'ID depuis l'URL ---
  const params = new URLSearchParams(location.search)
  const id = params.get('id')
  if (!id) { location.replace('blog.html'); return }

  // --- 2) Ciblage / racine ---
  const root = document.querySelector('#article-detail') || (() => {
    const s = document.createElement('section')
    s.id = 'article-detail'
    document.body.prepend(s)
    return s
  })()

  // Si du HTML "Chargement…" était présent en dur, on le supprime pour éviter tout flash
  root.querySelectorAll('.status').forEach(el => el.remove())

  // --- 3) API : endpoints possibles (on prend le 1er qui répond) ---
  const API_BASE = window.API_BASE || 'http://localhost:3000'
  const urls = [
    `${API_BASE}/articles/${encodeURIComponent(id)}`
  ]

  // --- 4) Helpers sécurité/format ---
  const esc = s => String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  // Autorise UNIQUEMENT ces balises si l'API renvoie déjà du HTML éditorial
  const ALLOWED_HTML_RE = /<(p|br|ul|ol|li|strong|em|b|i|u|a|blockquote|hr|code)\b[\s\S]*?>/i

  // Transforme du texte brut en HTML avec <p>…</p> et <br>
  function formatText(text) {
    if (!text) return ''
    const str = String(text)
    if (ALLOWED_HTML_RE.test(str)) return str   // déjà du HTML "propre"

    let safe = esc(str.trim())
    // escape de pseudo-tags pour les afficher proprement
    safe = safe.replace(/&lt;([a-z][a-z0-9-]*)&gt;/gi, '<code>&lt;$1&gt;</code>')

    return safe.split(/\n{2,}/)                  // paragraphes
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('')
  }

  // Déroule les formats de réponse courants
  function unwrap(data) {
    if (Array.isArray(data)) return data[0] || null
    if (data && typeof data === 'object') {
      if ('data' in data) return data.data
      if ('item' in data) return data.item
      if ('article' in data) return data.article
    }
    return data
  }

  // --- 5) Rendu ---
  function render(a) {
    const title   = a.title || a.titre || '(Sans titre)'
    const img     = a.image || a.cover || a.thumbnail || ''
    const excerpt = a.description || a.excerpt || ''
    const body    = a.content || a.body || ''

    const dateVal = a.publicationDate || a.publishedAt || a.createdAt || a.date || null
    const d = dateVal ? new Date(dateVal) : null
    const dateMachine = d && !Number.isNaN(d) ? d.toISOString().slice(0,10) : ''
    const dateHuman   = d && !Number.isNaN(d) ? d.toLocaleDateString('fr-FR') : ''

    root.innerHTML = `
      <a class="back-link fx-fade delay-0" href="blog.html">← Retour aux actualités</a>
      <article class="article">
        <h1 class="article-title fx-fade fx-underline delay-1">${esc(title)}</h1>
        ${dateHuman ? `<p class="article-date fx-fade delay-2">Publié le <time datetime="${dateMachine}">${dateHuman}</time></p>` : ''}

        ${excerpt ? `<div class="article-excerpt fx-fade delay-3">${formatText(excerpt)}</div>` : ''}

        ${img ? `<img class="article-cover fx-fade delay-4" src="${esc(img)}" alt="${esc(title)}">` : ''}

        <div class="article-content fx-fade delay-5">
          ${formatText(body)}
        </div>
      </article>
    `

    // underline animé (après layout)
    requestAnimationFrame(() => {
      root.querySelector('.article-title')?.classList.add('is-on')
    })

    // Titre d’onglet
    document.title = `${title} — AgenceEco`
  }

  function fail(msg) {
    root.innerHTML = `
      <p class="status error" role="alert">${esc(msg)}</p>
      <p><a class="back-link" href="blog.html">← Retour aux actualités</a></p>
    `
  }

  // --- 6) État de chargement — retardé (évite le flash si ça charge vite) ---
  const statusEl = document.createElement('p')
  statusEl.className = 'status'
  statusEl.setAttribute('role', 'status')
  statusEl.textContent = 'Chargement…'
  statusEl.hidden = true            // caché au départ
  root.appendChild(statusEl)

  const statusTimer = setTimeout(() => { statusEl.hidden = false }, 250)
  const clearStatus = () => { clearTimeout(statusTimer); statusEl.remove() }

  // --- 7) Chargement : fetch en parallèle, première réponse OK gagnante ---
  ;(async () => {
    try {
      const controller = new AbortController()
      const { signal } = controller

      const attempts = urls.map(u =>
        fetch(u, { headers: { 'Accept': 'application/json' }, signal })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(unwrap)
      )

      const data = await Promise.any(attempts)
      controller.abort()           // stoppe les autres requêtes
      render(data)
      clearStatus()                // retire le “Chargement…”
    } catch {
      clearStatus()
      fail(`Impossible de charger l’article (ID=${esc(id)}).`)
    }
  })()
})()

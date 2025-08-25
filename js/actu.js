/**
 * ================================================================
 *  AgenceEco — Actus (front)
 *  Objectif exercice :
 *    1) Appeler l’API (GET /articles) et lire le JSON
 *    2) Générer dynamiquement le HTML dans #news-list
 *    3) Afficher un état "Chargement…", un message d’erreur, et un état "vide"
 *    4) (Bonus qualité) Timeout du fetch, tri par date, gestion de formats JSON courants
 *
 *  Pré-requis côté HTML :
 *    <section id="news-list" aria-labelledby="news-heading" aria-live="polite">
 *      <h2 id="news-heading" class="sr-only">Actualités</h2>
 *    </section>
 *
 *  Note environnement :
 *    - Ouvrir la page via un serveur local (http://...), pas en file:// (CORS).
 *    - L’API doit tourner sur http://localhost:3000 (ou adapter API_BASE).
 * ================================================================
 */

// ====== Config API ======
const API_BASE = 'http://localhost:3000'   // ← Base de l’API (adapter si serveur distant)
const NEWS_URL = `${API_BASE}/articles`    // ← Endpoint de liste (GET). Ex.: /articles ou /api/news

// ====== Utils ======

/**
 * Convertit une valeur en Date valide ou retourne null.
 * - Permet de tolérer les champs de date facultatifs / mal formatés.
 */
function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Formate une date en versions "machine" (YYYY-MM-DD) et "humaine" (fr-FR).
 * - "machine" alimente l’attribut datetime de <time>, utile pour l’accessibilité/SEO.
 */
function formatDateFR(value) {
  const d = parseDate(value)
  if (!d) return null
  return {
    machine: d.toISOString().slice(0, 10),
    human: d.toLocaleDateString('fr-FR'),
  }
}

/**
 * Sélectionne une clé de date parmi les plus fréquentes.
 * - L’API peut renvoyer createdAt, publishedAt, ou simplement date.
 * - Centraliser ici évite de dupliquer la logique.
 */
function pickDate(obj = {}) {
  // ajoute publicationDate en priorité
  return obj.publicationDate || obj.publishedAt || obj.createdAt || obj.date || null
}


// ====== Vue (rendu d'une carte actu) ======

/**
 * Construit une carte <article> à partir d’un objet "article" de l’API.
 * - Pas d’hypothèse forte sur le schéma : on gère l’absence des champs.
 * - Structure : <article> → <h2> + (desc + contenu) + date
 */
function renderArticle(article = {}) {
  const { title, description, content } = article

  // Carte conteneur
  const card = document.createElement('article')
  card.className = 'news-card'

  // Titre
  const h2 = document.createElement('h2')
  h2.className = 'news-title'
  h2.textContent = title ?? 'Sans titre'

  // Corps (description + contenu)
  const body = document.createElement('div')
  body.className = 'news-body'

  const pDesc = document.createElement('p')
  pDesc.className = 'news-desc'
  pDesc.textContent = description ?? ''

  const pContent = document.createElement('p')
  pContent.className = 'news-content'
  pContent.textContent = content ?? ''

  body.append(pDesc, pContent)

  // Méta (date)
  const meta = document.createElement('div')
  meta.className = 'news-meta'

  const d = formatDateFR(pickDate(article))
  if (d) {
    const time = document.createElement('time')
    time.setAttribute('datetime', d.machine)
    time.innerHTML = `Publié le <strong>${d.human}</strong>`
    meta.appendChild(time)
  }

  card.append(h2, body, meta)
  return card
}

// ====== Chargement de la liste ======

/**
 * Charge la liste des actus depuis l’API et met à jour #news-list.
 * Étapes :
 *   1) État "Chargement…" (feedback utilisateur + aria-live)
 *   2) fetch() avec AbortController pour éviter les attentes infinies
 *   3) Lecture du JSON avec gestion des variantes { items:[...] } ou { data:[...] }
 *   4) Gestion des cas : vide / succès / erreur
 *   5) Tri optionnel par date décroissante si des dates sont présentes
 */
async function loadNews() {
  const list = document.getElementById('news-list')
  if (!list) return // sécurité si l’ID n’existe pas

  // 1) État "chargement"
  //    role="status" → annonce vocale (complète aria-live="polite" côté HTML).
  list.innerHTML = '<p class="status" role="status">Chargement…</p>'

  // 2) Timeout propre → évite un "chargement infini" si le serveur ne répond pas
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 secondes

  try {
    // Accept: application/json → informe le serveur du format souhaité.
    // NB: si front & API sont sur origines différentes, prévoir CORS côté API.
    const res = await fetch(NEWS_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    })

    // Statut HTTP non-200 → on déclenche un catch explicite
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    // 3) Lecture du JSON
    let data = await res.json()

    // Gestion de schémas fréquents de pagination/emballage
    // Exemple: { items: [...] } (Algolia-like), { data: [...] } (API REST courant)
    if (data && Array.isArray(data.items)) data = data.items
    if (data && Array.isArray(data.data))  data = data.data

    // 4a) Cas "vide"
    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<p class="status empty">Aucune actualité disponible.</p>'
      return
    }

    // 5) Tri par date décroissante (les plus récentes en premier) si possible
    data.sort((a, b) => {
      const da = parseDate(pickDate(a))
      const db = parseDate(pickDate(b))
      if (!da && !db) return 0 // aucune date sur A ni B
      if (!da) return 1        // A sans date → après B
      if (!db) return -1       // B sans date → après A
      return db - da           // plus récent d’abord
    })

    // Rendu performant : on utilise un DocumentFragment pour limiter les reflows
    const frag = document.createDocumentFragment()
    data.forEach(item => frag.appendChild(renderArticle(item)))

    // 4b) Cas "succès"
    list.innerHTML = ''
    list.appendChild(frag)
  } catch (err) {
    // 4c) Cas "erreur" (réseau, CORS, HTTP non-OK, timeout, JSON invalide…)
    console.error('[NEWS] Échec de récupération:', err)

    // AbortError → message spécifique "délai dépassé"
    if (err.name === 'AbortError') {
      list.innerHTML = '<p class="status error">Temps de réponse dépassé. Réessaie plus tard.</p>'
    } else {
      list.innerHTML = '<p class="status error">Impossible de récupérer les actualités. Réessaie plus tard.</p>'
    }
  } finally {
    // On nettoie le timer du timeout quoi qu’il arrive
    clearTimeout(timeoutId)
  }
}

// Déclenche le chargement une fois le DOM prêt
document.addEventListener('DOMContentLoaded', loadNews)

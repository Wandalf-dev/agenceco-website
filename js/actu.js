/**
 * ================================================================
 *  AgenceEco — Actus (front) — LISTE (blog.html)
 *
 *  Objectif :
 *    1) Appeler GET /articles et récupérer la liste des actualités
 *    2) Gérer les états : chargement, erreur réseau, liste vide
 *    3) Trier par date (desc) en s’adaptant à plusieurs clés possibles
 *    4) Générer des cartes HTML accessibles dans #news-list
 *
 *  Pré-requis côté HTML :
 *    - Un conteneur <section id="news-list" aria-live="polite"></section>
 *
 *  Notes techniques :
 *    - Timeout client (8s) via AbortController pour éviter un écran figé
 *    - Format date tolérant : publicationDate | publishedAt | createdAt | date
 *    - API flexible : gère data.items / data.data / tableau brut
 * ================================================================
 */

const API_BASE = 'http://localhost:3000'
const NEWS_URL = `${API_BASE}/articles`

/**
 * Convertit une valeur en Date JS sûre.
 * @param {string|number|Date} value
 * @returns {Date|null}
 */
function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Formate une date en { machine, human } pour <time>
 * @param {any} value
 * @returns {{machine:string,human:string}|null}
 */
function formatDateFR(value) {
  const d = parseDate(value)
  if (!d) return null
  return { machine: d.toISOString().slice(0, 10), human: d.toLocaleDateString('fr-FR') }
}

/**
 * Sélectionne la meilleure clé de date disponible sur un objet article
 * @param {object} obj
 */
function pickDate(obj = {}) {
  return obj.publicationDate || obj.publishedAt || obj.createdAt || obj.date || null
}

/**
 * Rend une carte d’article minimaliste et accessible
 * @param {object} article
 * @returns {HTMLElement}
 */
function renderArticle(article = {}) {
  const { title, description, content } = article

  const card = document.createElement('article')
  card.className = 'news-card'

  const h2 = document.createElement('h2')
  h2.className = 'news-title'
  h2.textContent = title ?? 'Sans titre'

  const body = document.createElement('div')
  body.className = 'news-body'

  const pDesc = document.createElement('p')
  pDesc.className = 'news-desc'
  pDesc.textContent = description ?? ''

  const pContent = document.createElement('p')
  pContent.className = 'news-content'
  pContent.textContent = content ?? ''

  body.append(pDesc, pContent)

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

/**
 * Charge et affiche la liste des actualités
 */
async function loadNews() {
  const list = document.getElementById('news-list')
  if (!list) return

  // État chargement (ARIA)
  list.innerHTML = '<p class="status" role="status">Chargement…</p>'

  // Timeout client de 8 secondes
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(NEWS_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // Supporte plusieurs enveloppes API courantes
    let data = await res.json()
    if (data && Array.isArray(data.items)) data = data.items
    if (data && Array.isArray(data.data))  data = data.data

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<p class="status empty">Aucune actualité disponible.</p>'
      return
    }

    // Tri descendant par date (les actus les plus récentes en premier)
    data.sort((a, b) => {
      const da = parseDate(pickDate(a))
      const db = parseDate(pickDate(b))
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return db - da
    })

    // Rendu DOM en fragment (perf)
    const frag = document.createDocumentFragment()
    data.forEach(item => frag.appendChild(renderArticle(item)))

    list.innerHTML = ''
    list.appendChild(frag)
  } catch (err) {
    console.error('[NEWS] Échec de récupération:', err)
    list.innerHTML = `<p class="status error">${
      err.name === 'AbortError'
        ? 'Temps de réponse dépassé. Réessaie plus tard.'
        : 'Impossible de récupérer les actualités. Réessayez plus tard.'
    }</p>`
  } finally {
    clearTimeout(timeoutId)
  }
}

// Lance le chargement quand le DOM est prêt
document.addEventListener('DOMContentLoaded', loadNews)

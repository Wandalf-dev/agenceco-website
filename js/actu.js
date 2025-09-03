/**
 * ================================================================
 *  AgenceEco — Actus (front) — LISTE (blog.html)
 *
 *  + GET /articles, tri par date, rendu des cartes
 *  + Titre cliquable -> detail.html?id=__ID__   ← (Option A)
 *  + Boutons Modifier / Supprimer
 *  + Boutons cachés si pas connecté, et jamais visibles sur index.html
 *  + DELETE avec JWT, confirmation, mise à jour DOM sans reload + toast
 *  + Améliorations : TOKEN_KEY unifié, timeout DELETE, palette TOAST,
 *    isHomePage plus robuste, messages "Réessayez"
 * ================================================================
 */

const API_BASE = 'http://localhost:3000'
const NEWS_URL = `${API_BASE}/articles`

/* ---------- auth & toasts ---------- */

const TOKEN_KEY = 'auth_token'
const getToken = () => localStorage.getItem(TOKEN_KEY)

const TOAST = {
  success: '#469B61', // Publié
  warn:    '#F57C00', // Mis à jour
  danger:  '#D32F2F', // Supprimé / erreurs
}

/* ---------- utils ---------- */

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDateFR(value) {
  const d = parseDate(value)
  if (!d) return null
  return {
    machine: d.toISOString().slice(0, 10),
    human: d.toLocaleDateString('fr-FR'),
  }
}

function pickDate(obj = {}) {
  return obj.publicationDate || obj.publishedAt || obj.createdAt || obj.date || null
}

function isHomePage() {
  // Plus robuste si le site est servi sous un sous-dossier
  const last = (location.pathname.split('/').pop() || '').toLowerCase()
  return last === '' || last === 'index' || last === 'index.html'
}

function isAuthenticated() {
  return !!getToken()
}

function shouldShowActions() {
  // Montre les actions seulement si connecté ET pas sur la home
  return isAuthenticated() && !isHomePage()
}

function showToast(msg, color = TOAST.success, iconSvg = null) {
  const t = document.createElement('div')
  t.setAttribute('role', 'status')
  // Icône + texte (si fournie)
  t.innerHTML = iconSvg
    ? `<span aria-hidden="true" style="display:inline-flex;width:18px;height:18px;margin-right:8px;align-items:center;">${iconSvg}</span><span>${msg}</span>`
    : `${msg}`
  Object.assign(t.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    padding: '10px 14px',
    background: color,
    color: '#fff',
    borderRadius: '8px',
    boxShadow: '0 6px 16px rgba(0,0,0,.15)',
    zIndex: 9999,
    fontFamily: 'Poppins, system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    opacity: '0',
    transform: 'translateY(-8px)',
    transition: 'opacity .25s ease, transform .25s ease',
  })
  document.body.appendChild(t)
  requestAnimationFrame(() => {
    t.style.opacity = '1'
    t.style.transform = 'translateY(0)'
  })
  setTimeout(() => {
    t.style.opacity = '0'
    t.style.transform = 'translateY(-8px)'
    setTimeout(() => t.remove(), 220)
  }, 2600)
}

/* ---------- rendu d’une carte ---------- */

function renderArticle(article = {}) {
  const articleId =
    article.id ?? article._id ?? article.articleId ?? article.Id ?? null

  const { title, description, content } = article

  const card = document.createElement('article')
  card.className = 'news-card'
  if (articleId != null) card.dataset.id = String(articleId)

  const h2 = document.createElement('h2')
  h2.className = 'news-title'
  h2.textContent = title ?? 'Sans titre'

  // ⬇️ NOUVEAU : lien vers la page détail (Option A)
  let headerEl = h2
  if (articleId != null) {
    const link = document.createElement('a')
    link.className = 'news-link'
    link.href = `detail.html?id=${encodeURIComponent(articleId)}`
    link.setAttribute('aria-label', `Lire l’actualité : ${h2.textContent}`)
    link.appendChild(h2) // place <h2> dans le <a>
    headerEl = link
  }
  // ⬆️ FIN NOUVEAU

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

  // footer (date + actions si autorisé)
  const footer = document.createElement('div')
  footer.className = 'news-footer'
  footer.appendChild(meta)

  if (shouldShowActions()) {
    const actions = document.createElement('div')
    actions.className = 'news-actions'

    const btnEdit = document.createElement('button')
    btnEdit.type = 'button'
    btnEdit.className = 'btn-edit'
    btnEdit.textContent = 'Modifier'
    if (articleId != null) btnEdit.dataset.id = String(articleId)

    const btnDelete = document.createElement('button')
    btnDelete.type = 'button'
    btnDelete.className = 'btn-delete'
    btnDelete.textContent = 'Supprimer'
    if (articleId != null) btnDelete.dataset.id = String(articleId)

    actions.append(btnEdit, btnDelete)
    footer.appendChild(actions)
  }

  // Ajout : header (lien ou h2), puis contenu et footer
  card.append(headerEl, body, footer)
  return card
}

/* ---------- chargement de la liste ---------- */

async function loadNews() {
  const list = document.getElementById('news-list')
  if (!list) return

  list.innerHTML = '<p class="status" role="status">Chargement…</p>'

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(NEWS_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    let data = await res.json()
    if (data && Array.isArray(data.items)) data = data.items
    if (data && Array.isArray(data.data)) data = data.data

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<p class="status empty">Aucune actualité disponible.</p>'
      return
    }

    data.sort((a, b) => {
      const da = parseDate(pickDate(a))
      const db = parseDate(pickDate(b))
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return db - da
    })

    const frag = document.createDocumentFragment()
    data.forEach(item => frag.appendChild(renderArticle(item)))

    list.innerHTML = ''
    list.appendChild(frag)
  } catch (err) {
    console.error('[NEWS] Échec de récupération:', err)
    const list = document.getElementById('news-list')
    if (list) {
      list.innerHTML = `<p class="status error">${
        err.name === 'AbortError'
          ? 'Temps de réponse dépassé. Réessayez plus tard.'
          : 'Impossible de récupérer les actualités. Réessayez plus tard.'
      }</p>`
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/* ---------- délégation des clics (edit + delete) ---------- */

document.addEventListener('click', async (e) => {
  // EDIT
  const btnEdit = e.target.closest?.('.btn-edit')
  if (btnEdit) {
    const id = btnEdit.dataset.id || btnEdit.closest('.news-card')?.dataset.id
    if (!id) return console.warn('[EDIT] id introuvable')
    window.location.href = `actu.html?id=${encodeURIComponent(id)}`
    return
  }

  // DELETE
  const btnDel = e.target.closest?.('.btn-delete')
  if (btnDel) {
    const id = btnDel.dataset.id || btnDel.closest('.news-card')?.dataset.id
    if (!id) return console.warn('[DELETE] id introuvable')

    if (!isAuthenticated()) {
      showToast('Action réservée aux utilisateurs connectés.', TOAST.danger)
      return
    }

    // Boîte de confirmation custom si dispo, sinon confirm natif
    let ok
    if (window.confirmDialog) {
      ok = await confirmDialog({
        title: 'Supprimer cet article ?',
        message: 'Cette action est définitive et ne peut pas être annulée.',
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        danger: true
      })
    } else {
      ok = confirm('Supprimer définitivement cet article ?')
    }
    if (!ok) return

    // Timeout côté DELETE (symétrie avec GET)
    const controller = new AbortController()
    const tId = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch(`${NEWS_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal: controller.signal,
      })

      clearTimeout(tId)

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          showToast('Non autorisé à supprimer cet article.', TOAST.danger)
        } else if (res.status === 404) {
          showToast('Article introuvable (déjà supprimé ?)', TOAST.danger)
        } else if (res.status === 408) {
          showToast('Délai dépassé. Réessayez.', TOAST.danger)
        } else {
          showToast(`Suppression impossible (HTTP ${res.status}).`, TOAST.danger)
        }
        return
      }

      // succès → enlève la carte du DOM + toast
      const card = btnDel.closest('.news-card')
      if (card) card.remove()

      const list = document.getElementById('news-list')
      if (list && list.querySelectorAll('.news-card').length === 0) {
        list.innerHTML = '<p class="status empty">Aucune actualité disponible.</p>'
      }

      showToast(
        'Article supprimé',
        TOAST.danger,
        `<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24"
            width="18" height="18" aria-hidden="true"
            style="display:block; transform: translateY(2px);">
          <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>`
      )
    } catch (err) {
      clearTimeout(tId)
      console.error('[NEWS] DELETE failed:', err)
      showToast(
        err.name === 'AbortError'
          ? 'Délai dépassé. Réessayez.'
          : 'Erreur réseau pendant la suppression.',
        TOAST.danger
      )
    }
  }
})

/* ---------- init ---------- */

document.addEventListener('DOMContentLoaded', loadNews)

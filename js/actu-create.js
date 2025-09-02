/**
 * ================================================================
 *  AgenceEco — Actu Create/Update (front)
 *
 *  Modes :
 *    - Create  : actu.html                → POST   /articles
 *    - Update  : actu.html?id=123         → PUT    /articles/:id
 *
 *  Détails :
 *    - Pré-remplit le formulaire en mode édition (GET /articles/:id)
 *    - Valide titre/contenu (min), image optionnelle (création)
 *    - Envoie JWT via Authorization: Bearer <token>
 *    - Redirige vers blog.html?added=1 (create) ou ?updated=1 (update)
 *    - Gère erreurs 400/401/403/404 avec mapping des erreurs de champs
 * ================================================================
 */

;(function () {
  const API_BASE = 'http://localhost:3000'  // adapte si besoin
  const ARTICLES_URL = `${API_BASE}/articles`

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('article-form')
    if (!form) {
      console.warn('[actu-create] #article-form introuvable')
      return
    }

    // Empêche le GET ?title=... dans l’URL si jamais
    form.setAttribute('action', 'javascript:void(0)')

    // Champs (fallback name= si id manquant)
    const elTitle     = document.getElementById('art-title')        || form.querySelector('[name="title"]')
    const elDesc      = document.getElementById('art-description')  || form.querySelector('[name="description"]')
    const elContent   = document.getElementById('art-content')      || form.querySelector('[name="content"]')
    const elImage     = document.getElementById('art-image')        || form.querySelector('[name="image"]')
    const elImageAlt  = document.getElementById('art-imageAlt')     || form.querySelector('[name="imageAlt"]')
    const btnSubmit   = form.querySelector('button[type="submit"], .btn-save')
    const btnDelete   = document.getElementById('btn-delete-article') // si présent dans ton HTML

    // Helpers URL/Token
    const params   = new URLSearchParams(location.search)
    const editId   = params.get('id') // si présent ⇒ mode UPDATE
    const token    = () => localStorage.getItem('auth_token')

    // État soumission
    function setSubmitting(v) {
      if (!btnSubmit) return
      btnSubmit.disabled = v
      const original = btnSubmit.dataset.originalText || btnSubmit.textContent
      if (!btnSubmit.dataset.originalText) btnSubmit.dataset.originalText = original
      btnSubmit.textContent = v ? (editId ? 'Mise à jour…' : 'Publication…') : btnSubmit.dataset.originalText
    }

    // Erreurs UI
    function showError(inputOrForm, message) {
      const container = inputOrForm?.closest?.('.field, .form-field') || form
      if (inputOrForm?.setAttribute) inputOrForm.setAttribute('aria-invalid', 'true')
      let hint = container.querySelector('.field-error')
      if (!hint) {
        hint = document.createElement('p')
        hint.className = 'field-error'
        hint.style.margin = '6px 0 0'
        hint.style.fontSize = '0.9rem'
        hint.style.color = '#B00020'
        container.appendChild(hint)
      }
      hint.textContent = message
    }
    function clearErrors() {
      form.querySelectorAll('[aria-invalid="true"]').forEach(n => n.removeAttribute('aria-invalid'))
      form.querySelectorAll('.field-error').forEach(n => n.remove())
    }

    // Mappe les erreurs de validation renvoyées par l’API sur les champs
    function applyFieldErrors(json, fieldsMap) {
      if (!json) return false
      let mapped = false

      // Cas 1 : objet "errors" clé→message
      if (json.errors && !Array.isArray(json.errors) && typeof json.errors === 'object') {
        for (const [field, msg] of Object.entries(json.errors)) {
          const input = fieldsMap[field]
          if (input) {
            showError(input, String(msg))
            mapped = true
          }
        }
      }

      // Cas 2 : tableau d’erreurs [{ field, message }]
      if (Array.isArray(json.errors)) {
        json.errors.forEach(err => {
          const f = err?.field
          const m = err?.message || err?.msg
          if (f && fieldsMap[f]) {
            showError(fieldsMap[f], String(m || 'Champ invalide'))
            mapped = true
          }
        })
      }

      // Message global si rien de mappé
      if (!mapped && json.message) {
        showError(form, String(json.message))
      }
      return mapped
    }

    // Utilitaire date → 'YYYY-MM-DD'
    const todayISO = () => new Date().toISOString().slice(0, 10)

    // ====== MODE ÉDITION : pré-remplissage ======
    let loadedArticle = null  // on garde l’article pour (ex: publicationDate)
    if (editId) {
      // UI
      if (btnSubmit) btnSubmit.textContent = 'Mettre à jour'
      // si tu veux afficher le bouton supprimer uniquement en édition
      if (btnDelete) btnDelete.hidden = false

      // fetch l’article pour pré-remplir
      ;(async () => {
        try {
          const res = await fetch(`${ARTICLES_URL}/${encodeURIComponent(editId)}`, {
            headers: { Accept: 'application/json' }
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          loadedArticle = await res.json()

          // Adapte aux enveloppes d’API éventuelles
          if (loadedArticle?.data) loadedArticle = loadedArticle.data

          // Remplir les champs si dispo
          if (elTitle)   elTitle.value   = loadedArticle.title       ?? ''
          if (elDesc)    elDesc.value    = loadedArticle.description ?? ''
          if (elContent) elContent.value = loadedArticle.content     ?? ''
          // image/imageAlt : on laisse vides côté input file (sécurité navigateur)
        } catch (err) {
          console.error('[actu-create] GET /articles/:id failed:', err)
          showError(form, 'Impossible de charger l’article pour édition.')
        }
      })()
    } else {
      // mode création : cacher le bouton supprimer si tu l’as dans le DOM
      if (btnDelete) btnDelete.hidden = true
    }

    // ====== Submit (Create/Update) ======
    form.addEventListener('submit', onSubmit)

    async function onSubmit(e) {
      e.preventDefault()
      clearErrors()

      // Auth requise
      const jwt = token()
      if (!jwt) {
        showError(elTitle || form, 'Vous devez être connecté pour publier/modifier.')
        return
      }

      // Lecture et validation
      const title   = (elTitle?.value || '').trim()
      const content = (elContent?.value || '').trim()
      const desc    = (elDesc?.value || '').trim()

      const errs = []
      if (title.length < 3)    errs.push([elTitle,   'Le titre doit contenir au moins 3 caractères.'])
      if (content.length < 10) errs.push([elContent, 'Le contenu doit contenir au moins 10 caractères.'])

      // Image : on valide seulement en création (ton PUT API est JSON pur)
      const file = !editId ? (elImage?.files?.[0] || null) : null
      if (!editId && file) {
        const allowed = ['image/jpeg','image/png','image/webp']
        if (!allowed.includes(file.type)) errs.push([elImage, 'Formats autorisés : JPG, PNG, WEBP.'])
        if (file.size > 5 * 1024 * 1024)  errs.push([elImage, 'Taille max 5 Mo.'])
      }

      if (errs.length) {
        errs.forEach(([input, msg]) => showError(input, msg))
        return
      }

      try {
        setSubmitting(true)

        // ====== CREATE (POST) avec éventuellement fichier ======
        if (!editId) {
          let fetchOptions
          if (file) {
            const fd = new FormData()
            fd.append('title', title)
            fd.append('content', content)
            if (desc) fd.append('description', desc)
            fd.append('image', file)
            if (elImageAlt?.value?.trim()) fd.append('imageAlt', elImageAlt.value.trim())

            fetchOptions = {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${jwt}` },
              body: fd
            }
          } else {
            const payload = { title, content }
            if (desc) payload.description = desc

            fetchOptions = {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
              },
              body: JSON.stringify(payload)
            }
          }

          const res = await fetch(ARTICLES_URL, fetchOptions)

          if (!res.ok) {
            let raw = ''
            try { raw = await res.text() } catch {}
            let json = null
            try { json = raw ? JSON.parse(raw) : null } catch {}

            // Mappe erreurs de champs si dispo
            const didMap = applyFieldErrors(json, {
              title: elTitle,
              description: elDesc,
              content: elContent,
              image: elImage
            })

            switch (res.status) {
              case 400: {
                if (!didMap) showError(form, 'Certains champs sont invalides. Merci de corriger.')
                break
              }
              case 401:
              case 403: {
                showError(form, 'Votre session a expiré. Veuillez vous reconnecter.')
                try { localStorage.removeItem('auth_token') } catch {}
                setTimeout(() => { window.location.href = 'login.html?expired=1' }, 1200)
                break
              }
              default: {
                const msg = json?.message || `Erreur serveur (HTTP ${res.status}). Réessayez plus tard.`
                showError(form, msg)
              }
            }
            return
          }

          window.location.href = '/blog.html?added=1'
          return
        }

        // ====== UPDATE (PUT JSON) ======
        // Schéma d’API (fourni) :
        // { id, title, description, content, publicationDate: "YYYY-MM-DD" }
        const publicationDate =
          loadedArticle?.publicationDate ||
          loadedArticle?.publishedAt ||
          loadedArticle?.createdAt ||
          todayISO()

        const payloadUpdate = {
          id: Number.isFinite(+editId) ? +editId : editId, // accepte string/number
          title,
          description: desc || '',
          content,
          publicationDate: String(publicationDate).slice(0, 10)
        }

        const res = await fetch(`${ARTICLES_URL}/${encodeURIComponent(editId)}`, {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify(payloadUpdate)
        })

        if (!res.ok) {
          let raw = ''
          try { raw = await res.text() } catch {}
          let json = null
          try { json = raw ? JSON.parse(raw) : null } catch {}

          const didMap = applyFieldErrors(json, {
            title: elTitle,
            description: elDesc,
            content: elContent
          })

          switch (res.status) {
            case 400: {
              if (!didMap) showError(form, 'Certains champs sont invalides. Merci de corriger.')
              break
            }
            case 401:
            case 403: {
              showError(form, 'Votre session a expiré. Veuillez vous reconnecter.')
              try { localStorage.removeItem('auth_token') } catch {}
              setTimeout(() => { window.location.href = 'login.html?expired=1' }, 1200)
              break
            }
            case 404: {
              showError(form, 'Article introuvable.')
              break
            }
            default: {
              const msg = json?.message || `Erreur serveur (HTTP ${res.status}). Réessayez plus tard.`
              showError(form, msg)
            }
          }
          return
        }

        window.location.href = '/blog.html?updated=1'
      } catch (err) {
        console.error('[actu-create] Submit failed:', err)
        showError(form, 'Impossible de contacter le serveur. Réessayez.')
      } finally {
        setSubmitting(false)
      }
    }

    // ====== (Optionnel) suppression en mode édition — branchement UI uniquement
    if (btnDelete && editId) {
      btnDelete.addEventListener('click', async () => {
        const jwt = token()
        if (!jwt) { showError(form, 'Vous devez être connecté pour supprimer.'); return }
        if (!confirm('Supprimer définitivement cet article ?')) return

        try {
          const res = await fetch(`${ARTICLES_URL}/${encodeURIComponent(editId)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${jwt}` }
          })
          if (!res.ok) {
            let raw = ''
            try { raw = await res.text() } catch {}
            let json = null
            try { json = raw ? JSON.parse(raw) : null } catch {}
            const msg = json?.message || `Suppression impossible (HTTP ${res.status}).`
            showError(form, msg)
            return
          }
          window.location.href = '/blog.html?deleted=1'
        } catch (err) {
          console.error('[actu-create] DELETE failed:', err)
          showError(form, 'Erreur réseau pendant la suppression.')
        }
      })
    }
  })
})()

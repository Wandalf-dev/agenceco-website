/**
 * ================================================================
 *  AgenceEco — Actus (front)
 *
 *  Objectif :
 *    1) Gérer la soumission du formulaire d’ajout d’actualité
 *    2) Valider les champs saisis (titre, contenu, image optionnelle)
 *    3) Envoyer la requête POST /articles avec JWT (localStorage)
 *    4) Rediriger vers blog.html après succès (+ indicateur ?added=1)
 *
 *  Pré-requis côté HTML (actu.html) :
 *    - Un formulaire avec id="article-form"
 *    - Champs attendus :
 *        #art-title        (titre, requis)
 *        #art-description  (description courte, facultatif)
 *        #art-content      (contenu, requis)
 *        #art-image        (fichier image, optionnel)
 *        #art-imageAlt     (texte alternatif, optionnel)
 *
 *  Notes techniques :
 *    - Validation simple côté client (longueur minimale, format image)
 *    - Gestion multipart/form-data si une image est jointe
 *    - Le token JWT doit être stocké sous localStorage["auth_token"]
 * ================================================================
 */

(function () {
  const API_BASE = 'http://localhost:3000'   // Adapter si backend ≠ racine
  const CREATE_URL = `${API_BASE}/articles`

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('article-form')
    if (!form) {
      console.warn('[actu-create] #article-form introuvable')
      return
    }

    // Neutralise la soumission native HTML (empêche GET ?title=... dans l’URL)
    form.setAttribute('action', 'javascript:void(0)')

    // Sélecteurs des champs (fallback par name si id absent)
    const elTitle    = document.getElementById('art-title')        || form.querySelector('[name="title"]')
    const elDesc     = document.getElementById('art-description')  || form.querySelector('[name="description"]')
    const elContent  = document.getElementById('art-content')      || form.querySelector('[name="content"]')
    const elImage    = document.getElementById('art-image')        || form.querySelector('[name="image"]')
    const elImageAlt = document.getElementById('art-imageAlt')     || form.querySelector('[name="imageAlt"]')

    const submitBtn  = form.querySelector('button[type="submit"], .btn-save')

    console.log('[actu-create] bind OK', {
      found: {
        form: !!form, title: !!elTitle, desc: !!elDesc, content: !!elContent, image: !!elImage
      }
    })

    // Bind submit
    form.addEventListener('submit', onSubmit)

    /**
     * Gestion de la soumission
     */
    async function onSubmit(e) {
      e.preventDefault()
      clearErrors()

      // Vérifie présence token
      const token = localStorage.getItem('auth_token')
      if (!token) {
        showError(elTitle || form, 'Vous devez être connecté pour publier.')
        return
      }

      // Lecture des valeurs
      const title   = (elTitle?.value || '').trim()
      const content = (elContent?.value || '').trim()
      const desc    = (elDesc?.value || '').trim()

      // Validation minimale
      const errs = []
      if (title.length < 3)    errs.push([elTitle,   'Le titre doit contenir au moins 3 caractères.'])
      if (content.length < 10) errs.push([elContent, 'Le contenu doit contenir au moins 10 caractères.'])

      // Vérification image (si champ présent et fichier choisi)
      const file = elImage?.files?.[0] || null
      if (file) {
        const allowed = ['image/jpeg','image/png','image/webp']
        if (!allowed.includes(file.type)) errs.push([elImage, 'Formats autorisés : JPG, PNG, WEBP.'])
        if (file.size > 5 * 1024 * 1024)  errs.push([elImage, 'Taille max 5 Mo.'])
      }

      if (errs.length) {
        errs.forEach(([input, msg]) => showError(input, msg))
        return
      }

      // Prépare la requête
      let fetchOptions
      if (file) {
        // multipart si image
        const fd = new FormData()
        fd.append('title', title)
        fd.append('content', content)
        if (desc) fd.append('description', desc)
        fd.append('image', file)
        if (elImageAlt?.value?.trim()) fd.append('imageAlt', elImageAlt.value.trim())

        fetchOptions = {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }, // pas de Content-Type
          body: fd
        }
      } else {
        // JSON simple sinon
        const payload = { title, content }
        if (desc) payload.description = desc

        fetchOptions = {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      }

      try {
        setSubmitting(true)

        const res = await fetch(CREATE_URL, fetchOptions)

        if (!res.ok) {
          // Récupère message d’erreur API si dispo
          let msg = `Échec de la publication (HTTP ${res.status}). Réessayez.`
          try {
            const txt = await res.text()
            const j = JSON.parse(txt)
            if (j?.message) msg = j.message
          } catch {}
          showError(elTitle || form, msg)
          return
        }

        // Succès → redirection vers la liste
        window.location.href = '/blog.html?added=1'
      } catch (err) {
        console.error('[actu-create] POST /articles failed:', err)
        showError(elTitle || form, 'Impossible de contacter le serveur. Réessayez.')
      } finally {
        setSubmitting(false)
      }
    }

    /* ==================== Helpers ==================== */

    // Affiche un message d’erreur sous le champ ou le form
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

    // Supprime les erreurs précédentes
    function clearErrors() {
      form.querySelectorAll('[aria-invalid="true"]').forEach(n => n.removeAttribute('aria-invalid'))
      form.querySelectorAll('.field-error').forEach(n => n.remove())
    }

    // Indique l’état de soumission sur le bouton
    function setSubmitting(v) {
      if (!submitBtn) return
      submitBtn.disabled = v
      const original = submitBtn.dataset.originalText || submitBtn.textContent
      if (!submitBtn.dataset.originalText) submitBtn.dataset.originalText = original
      submitBtn.textContent = v ? 'Publication…' : submitBtn.dataset.originalText
    }
  })
})()

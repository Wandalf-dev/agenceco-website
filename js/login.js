/**
 * ================================================================
 *  AgenceEco — Login (front)
 *
 *  Option B : validation 100% JS avant l'appel API
 *  - Email complet obligatoire (user@domaine.tld)
 *  - Mot de passe obligatoire (≥ 1 caractère)
 *  - Couleurs invalid/valid activées seulement après 1er échec
 *  - Messages combinés et focus sur le 1er champ invalide
 *  - JWT stocké en localStorage puis redirection
 * ================================================================
 */

// ===== Réglages =====
const USE_MOCK_API  = false                // Active/désactive le mock
const API_BASE      = "http://localhost:3000"
const LOGIN_PATH    = "/login"
const LS_TOKEN_KEY  = "auth_token"
const REDIRECT_AFTER = "index.html"

// ===== DOM =====
const form      = document.getElementById("login-form")
const emailEl   = document.getElementById("login-email")
const passEl    = document.getElementById("login-password")
const statusEl  = document.getElementById("login-status")
const submitBtn = form?.querySelector('button[type="submit"]')

// ===== État validation (activée après 1er submit invalide) =====
let validationActive = false
let hadSubmitError = false   // <-- nouveau

// ===== Storage helpers =====
function getToken()   { return localStorage.getItem(LS_TOKEN_KEY) }
function setToken(t)  { localStorage.setItem(LS_TOKEN_KEY, t) }
function clearToken() { localStorage.removeItem(LS_TOKEN_KEY) }

// ===== UI helpers =====
function setStatus(message, kind = 'info') {
  statusEl.textContent = message
  statusEl.className = `login-status ${kind === 'ok' ? 'ok' : kind === 'err' ? 'err' : ''}`
}

function setLoading(loading) {
  if (submitBtn) submitBtn.disabled = loading
  if (emailEl) emailEl.readOnly = loading
  if (passEl) passEl.readOnly = loading
}

// ===== Validation helpers =====
// Email complet obligatoire : user@domaine.tld (TLD ≥ 2)
function isValidEmail(value) {
  const v = String(value || '').trim()
  return /^[A-Za-z0-9._%+-]+@(?:(?!-)[A-Za-z0-9-]+(?<!-)\.)+[A-Za-z]{2,}$/.test(v)
}

// Coloriage en direct — seulement si validationActive === true
function checkEmail() {
  if (!validationActive) return
  const email = emailEl.value.trim()
  const strict = hadSubmitError  // après un submit raté, on force le rouge si vide

  if (!email) {
    if (strict) {
      emailEl.classList.add('invalid')
      emailEl.classList.remove('valid')
    } else {
      // avant tout submit ou si pas d'erreur précédente :
      // neutre si l'autre champ est aussi vide, sinon rouge
      if (passEl.value.trim()) {
        emailEl.classList.add('invalid')
        emailEl.classList.remove('valid')
      } else {
        emailEl.classList.remove('invalid', 'valid')
      }
    }
    return
  }

  if (!isValidEmail(email)) {
    emailEl.classList.add('invalid')
    emailEl.classList.remove('valid')
  } else {
    emailEl.classList.remove('invalid')
    emailEl.classList.add('valid')
  }
}

function checkPass() {
  if (!validationActive) return
  const pass = passEl.value
  const strict = hadSubmitError

  if (!pass) {
    if (strict) {
      passEl.classList.add('invalid')
      passEl.classList.remove('valid')
    } else {
      if (emailEl.value.trim()) {
        passEl.classList.add('invalid')
        passEl.classList.remove('valid')
      } else {
        passEl.classList.remove('invalid', 'valid')
      }
    }
    return
  }

  // ici ta règle minimale (≥1 car.)
  passEl.classList.remove('invalid')
  passEl.classList.add('valid')
}


// ===== Mock API (optionnel) =====
async function mockLogin({ email, password }) {
  await new Promise(r => setTimeout(r, 400))
  if (email === "demo@agenceco.fr" && password === "demo1234") {
    return { token: "mock.jwt.token" }
  }
  const err = new Error("Identifiants invalides")
  err.status = 401
  throw err
}

// ===== Validation avant submit =====
function validateBeforeSubmit() {
  const email = emailEl.value.trim()
  const pass  = passEl.value

  validationActive = true

  let messages = []
  let firstInvalid = null

  if (!email && !pass) {
    messages.push("Veuillez saisir votre adresse e-mail et votre mot de passe.")
    emailEl.classList.add('invalid')
    passEl.classList.add('invalid')
    firstInvalid = emailEl
  } else {
    if (!email) {
      messages.push("Veuillez saisir votre adresse e-mail.")
      emailEl.classList.add('invalid')
      firstInvalid = firstInvalid || emailEl
    } else if (!isValidEmail(email)) {
      messages.push("Veuillez saisir une adresse e-mail valide.")
      emailEl.classList.add('invalid')
      firstInvalid = firstInvalid || emailEl
    }
    if (!pass) {
      messages.push("Veuillez saisir votre mot de passe.")
      passEl.classList.add('invalid')
      firstInvalid = firstInvalid || passEl
    }
  }

  // 🔴⟶ Mémorise l'état d'erreur du submit
  hadSubmitError = messages.length > 0

  // Coloration “live” juste après submit
  checkEmail()
  checkPass()

  if (hadSubmitError) {
    setStatus(messages.join(' '), 'err')
    firstInvalid?.focus()
    return false
  }

  // Pas d'erreurs : reset l'état d’erreur
  hadSubmitError = false
  emailEl.classList.remove('invalid'); emailEl.classList.add('valid')
  passEl.classList.remove('invalid');  passEl.classList.add('valid')
  return true
}



// ===== Écouteurs validation en direct =====
emailEl.addEventListener('input', checkEmail)
passEl.addEventListener('input', checkPass)

// ===== Soumission du formulaire =====
form.addEventListener("submit", async (e) => {
  e.preventDefault()

  if (!validateBeforeSubmit()) return

  setStatus("Connexion en cours…", 'info')
  setLoading(true)

  try {
    let data

    if (USE_MOCK_API) {
      data = await mockLogin({
        email: emailEl.value.trim(),
        password: passEl.value
      })
    } else {
      const res = await fetch(`${API_BASE}${LOGIN_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({
          email: emailEl.value.trim(),
          password: passEl.value
        })
      })

      if (res.status === 401) {
        const errBody = await res.json().catch(() => ({}))
        const msg = errBody?.message || "Adresse e-mail ou mot de passe incorrect."

        setStatus(msg, 'err')

        // ⤵️ Force les deux champs en rouge (bordure uniquement)
        emailEl.classList.add('invalid')
        emailEl.classList.remove('valid')
        passEl.classList.add('invalid')
        passEl.classList.remove('valid')

        // Active le mode "validation stricte" après échec
        validationActive = true
        hadSubmitError = true

        // Focus : au choix, sur le mot de passe (souvent l’utilisateur retente ici)
        passEl.focus()

        setLoading(false)
        return
      }


      if (!res.ok) {
        const msg = await res.text().catch(() => "")
        throw new Error(msg || `HTTP ${res.status}`)
      }

      data = await res.json()   // attendu: { token: "string" }
    }

    if (!data?.token) throw new Error("Réponse inattendue : token manquant")

    setToken(data.token)
    setStatus("Connecté ✓", 'ok')
    setTimeout(() => window.location.href = REDIRECT_AFTER, 600)

    } catch (err) {
      // ⤵️ Uniformise le cas 401 (mock ou API) : identifiants incorrects
      if (err?.status === 401) {
        setStatus("Adresse e-mail ou mot de passe incorrect.", "err")

        emailEl.classList.add("invalid")
        emailEl.classList.remove("valid")
        passEl.classList.add("invalid")
        passEl.classList.remove("valid")

        validationActive = true
        hadSubmitError = true

        passEl.focus()
        setLoading(false)
        return
      }

      // Erreur réseau ou autre
      if (String(err?.message || '').includes("Failed to fetch")) {
        setStatus("Service indisponible, veuillez réessayer plus tard.", "err")
      } else {
        setStatus(err?.message || "Échec de connexion", "err")
      }
    } finally {
      setLoading(false)
    }

})

// ===== Session existante =====
if (getToken()) {
  setStatus("Session active", 'ok')
}

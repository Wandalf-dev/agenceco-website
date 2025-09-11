/**
 * ================================================================
 *  AgenceEco — Login (front)
 *
 *  Objectif exercice :
 *    1) Gérer la soumission du formulaire de connexion (email + mdp)
 *    2) Envoyer les identifiants au backend (/login) ou utiliser un mock
 *    3) Récupérer et stocker le JWT dans localStorage
 *    4) Mettre à jour l’interface selon l’état (en cours, succès, erreur)
 *    5) Rediriger l’utilisateur après authentification réussie
 *
 *  Pré-requis côté HTML :
 *    <form id="login-form">
 *      <input id="login-email" type="email" required />
 *      <input id="login-password" type="password" required />
 *      <button type="submit">Me connecter</button>
 *      <p id="login-status"></p>
 *    </form>
 *
 *  Notes UX :
 *    - Messages dynamiques : "Connexion en cours…", "Connecté ✓",
 *      ou "Veuillez réessayer plus tard" en cas de problème réseau.
 *    - Stockage : le token JWT est conservé en localStorage (clé: auth_token).
 *    - Redirection : après succès, l’utilisateur est renvoyé vers index.html.
 * ================================================================
 */

// ===== Réglages =====
const USE_MOCK_API = false                 // <-- active/désactive le mock
const API_BASE = "http://localhost:3000"   // <-- backend local
const LOGIN_PATH = "/login"                // <-- endpoint réel
const LS_TOKEN_KEY = "auth_token"          // <-- clé de stockage
const REDIRECT_AFTER = "index.html"        // <-- page de redirection après succès

// ===== DOM =====
const form     = document.getElementById("login-form")
const emailEl  = document.getElementById("login-email")
const passEl   = document.getElementById("login-password")
const statusEl = document.getElementById("login-status")

// ===== Storage helpers =====
function getToken()   { return localStorage.getItem(LS_TOKEN_KEY) }
function setToken(t)  { localStorage.setItem(LS_TOKEN_KEY, t) }
function clearToken() { localStorage.removeItem(LS_TOKEN_KEY) }

// ===== Mock (optionnel, si USE_MOCK_API = true) =====
async function mockLogin({ email, password }) {
  await new Promise(r => setTimeout(r, 400))
  if (email === "demo@agenceco.fr" && password === "demo1234") {
    return { token: "mock.jwt.token" }
  }
  throw new Error("Identifiants invalides")
}

// ===== Soumission du formulaire =====
form.addEventListener("submit", async (e) => {
  e.preventDefault()
  statusEl.textContent = "Connexion en cours…"
  statusEl.className = "login-status"

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

      // Cas documenté: 401 avec { message: "Email ou mot de passe incorrect" }
      if (res.status === 401) {
        const errBody = await res.json().catch(() => ({}))
        statusEl.textContent = `${errBody?.message || "Identifiants invalides"}`
        statusEl.className = "login-status err"
        return
      }

      if (!res.ok) {
        const msg = await res.text().catch(() => "")
        throw new Error(msg || `HTTP ${res.status}`)
      }

      data = await res.json() // attendu: { token: "string" }
    }

    if (!data?.token) throw new Error("Réponse inattendue: token manquant")
    setToken(data.token)

    statusEl.textContent = "Connecté"
    statusEl.className = "login-status ok"

    setTimeout(() => window.location.href = REDIRECT_AFTER, 600)

  } catch (err) {
    if (err.message.includes("Failed to fetch")) {
      statusEl.textContent = "Veuillez réessayer plus tard"
    } else {
      statusEl.textContent = err?.message || "Échec de connexion"
    }
    statusEl.className = "login-status err"
  }
})

// ===== État initial si déjà logué =====
if (getToken()) {
  statusEl.textContent = "Session active"
  statusEl.className = "login-status ok"
}

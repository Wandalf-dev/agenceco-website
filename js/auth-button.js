/**
 * ================================================================
 *  AgenceEco — Auth Button (front)
 *
 *  Objectif :
 *    1) Gérer dynamiquement le bouton d’authentification du footer
 *    2) Afficher "Me connecter" si aucun token n’est stocké
 *    3) Afficher "Se déconnecter" si un token est présent
 *    4) Supprimer le token et rediriger vers index.html lors du logout
 *
 *  Pré-requis côté HTML :
 *    - Un bouton ou lien avec id="auth-btn", placé dans le footer :
 *      <a id="auth-btn" class="login-btn" href="login.html">Me connecter</a>
 *
 *  Notes UX :
 *    - Le token JWT est lu/supprimé depuis localStorage (clé "auth_token").
 *    - Après déconnexion, on redirige toujours vers index.html,
 *      peu importe la page courante.
 *    - Le script neutralise l’ancien bouton et recrée un nouveau
 *      pour éviter l’empilement d’event listeners.
 * ================================================================
 */

const LS_TOKEN_KEY = "auth_token"
const REDIRECT_AFTER_LOGOUT = "index.html" // toujours renvoyer vers index.html

;(function initAuthButton() {
  const btn = document.getElementById("auth-btn")
  if (!btn) return

  const token = localStorage.getItem(LS_TOKEN_KEY)

  // Nettoie les anciens listeners (au cas où la page re-injecte le script)
  btn.replaceWith(btn.cloneNode(true))
  const freshBtn = document.getElementById("auth-btn")

  if (token) {
    freshBtn.textContent = "Se déconnecter"
    freshBtn.removeAttribute("href")
    freshBtn.setAttribute("role", "button")

    freshBtn.addEventListener("click", (e) => {
      e.preventDefault()
      localStorage.removeItem(LS_TOKEN_KEY)
      window.location.href = REDIRECT_AFTER_LOGOUT
    })
  } else {
    freshBtn.textContent = "Me connecter"
    freshBtn.setAttribute("href", "login.html")
  }
})()


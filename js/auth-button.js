// js/auth-button.js
const LS_TOKEN_KEY = "auth_token";
const REDIRECT_AFTER_LOGOUT = "index.html"; // toujours renvoyer vers index.html

(function initAuthButton() {
  const btn = document.getElementById("auth-btn");
  if (!btn) return;

  const token = localStorage.getItem(LS_TOKEN_KEY);

  // Nettoie les anciens listeners (au cas où la page re-injecte le script)
  btn.replaceWith(btn.cloneNode(true));
  const freshBtn = document.getElementById("auth-btn");

  if (token) {
    // Connecté -> "Se déconnecter"
    freshBtn.textContent = "Se déconnecter";
    // On neutralise la navigation automatique de l'ancre
    freshBtn.removeAttribute("href");
    freshBtn.setAttribute("role", "button");

    freshBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem(LS_TOKEN_KEY);
      window.location.href = REDIRECT_AFTER_LOGOUT; // toujours index.html
    });
  } else {
    // Pas connecté -> "Se connecter" vers login.html
    freshBtn.textContent = "Me connecter";
    freshBtn.setAttribute("href", "login.html");
    // au besoin, on supprime tout listener existant
  }
})();

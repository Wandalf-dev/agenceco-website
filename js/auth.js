/**
 * ================================================================
 *  AgenceEco — Auth helpers (front)
 *
 *  Objectif :
 *    1) Fournir des utilitaires pour gérer le token JWT côté client
 *    2) Centraliser la récupération / suppression du token (localStorage)
 *    3) Offrir une fonction fetchWithAuth() qui ajoute automatiquement
 *       l'en-tête Authorization: Bearer <token> aux requêtes protégées
 *    4) Rediriger vers login.html si le token est manquant ou invalide
 *
 *  Pré-requis côté backend :
 *    - Les routes protégées exigent un header HTTP :
 *        Authorization: Bearer <token>
 *    - En cas d'échec, le serveur renvoie 401 Unauthorized
 *
 *  Notes UX :
 *    - Le token est stocké en localStorage sous la clé "auth_token".
 *    - fetchWithAuth gère automatiquement :
 *        • l'ajout de l'Authorization header
 *        • la redirection en cas de 401
 *        • le parse JSON de la réponse
 * ================================================================
 */

const LS_TOKEN_KEY = "auth_token"; // clé unique de stockage du token

// Retourne le token depuis localStorage (ou null si absent)
export function getToken() {
  return localStorage.getItem(LS_TOKEN_KEY);
}

// Supprime le token (utile pour la déconnexion)
export function clearToken() {
  localStorage.removeItem(LS_TOKEN_KEY);
}

// fetch sécurisé avec ajout automatique du JWT
export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  if (!token) throw new Error("Pas de session");

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });

  // Si le serveur dit "non autorisé"
  if (res.status === 401) {
    clearToken();
    window.location.href = "login.html"; // renvoi direct
    return;
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  try {
    return await res.json();
  } catch {
    return null;
  }
}

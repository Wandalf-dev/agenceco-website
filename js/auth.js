const LS_TOKEN_KEY = "auth_token";

export function getToken() {
  return localStorage.getItem(LS_TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(LS_TOKEN_KEY);
}

export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  if (!token) throw new Error("Pas de session");

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = "login.html";
    return;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  try { return await res.json(); } catch { return null; }
}

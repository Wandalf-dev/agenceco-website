/**
 * ================================================================
 *  AgenceEco — Actus (front)
 *  Charge GET /articles, gère chargement/erreur/vide, tri par date,
 *  et injecte les cartes dans #news-list.
 * ================================================================
 */

const API_BASE = 'http://localhost:3000';
const NEWS_URL = `${API_BASE}/articles`;

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateFR(value) {
  const d = parseDate(value);
  if (!d) return null;
  return { machine: d.toISOString().slice(0,10), human: d.toLocaleDateString('fr-FR') };
}

function pickDate(obj = {}) {
  return obj.publicationDate || obj.publishedAt || obj.createdAt || obj.date || null;
}

function renderArticle(article = {}) {
  const { title, description, content } = article;

  const card = document.createElement('article');
  card.className = 'news-card';

  const h2 = document.createElement('h2');
  h2.className = 'news-title';
  h2.textContent = title ?? 'Sans titre';

  const body = document.createElement('div');
  body.className = 'news-body';

  const pDesc = document.createElement('p');
  pDesc.className = 'news-desc';
  pDesc.textContent = description ?? '';

  const pContent = document.createElement('p');
  pContent.className = 'news-content';
  pContent.textContent = content ?? '';

  body.append(pDesc, pContent);

  const meta = document.createElement('div');
  meta.className = 'news-meta';

  const d = formatDateFR(pickDate(article));
  if (d) {
    const time = document.createElement('time');
    time.setAttribute('datetime', d.machine);
    time.innerHTML = `Publié le <strong>${d.human}</strong>`;
    meta.appendChild(time);
  }

  card.append(h2, body, meta);
  return card;
}

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list) return;

  list.innerHTML = '<p class="status" role="status">Chargement…</p>';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(NEWS_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let data = await res.json();
    if (data && Array.isArray(data.items)) data = data.items;
    if (data && Array.isArray(data.data))  data = data.data;

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<p class="status empty">Aucune actualité disponible.</p>';
      return;
    }

    data.sort((a, b) => {
      const da = parseDate(pickDate(a));
      const db = parseDate(pickDate(b));
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });

    const frag = document.createDocumentFragment();
    data.forEach(item => frag.appendChild(renderArticle(item)));

    list.innerHTML = '';
    list.appendChild(frag);
  } catch (err) {
    console.error('[NEWS] Échec de récupération:', err);
    list.innerHTML = `<p class="status error">${
      err.name === 'AbortError'
        ? 'Temps de réponse dépassé. Réessaie plus tard.'
        : 'Impossible de récupérer les actualités. Réessayez plus tard.'
    }</p>`;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Lance le chargement quand le DOM est prêt
document.addEventListener('DOMContentLoaded', loadNews);

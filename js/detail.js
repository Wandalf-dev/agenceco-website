// js/detail.js — hydrate #article-detail sans écraser le HTML
(() => {
  // --- 1) ID d'article ---
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { location.replace('blog.html'); return; }

  // --- 2) Ciblage DOM (doit correspondre à ton HTML) ---
  const root = document.getElementById('article-detail');
  const el = {
    title:   document.getElementById('art-title'),
    date:    document.getElementById('art-date'),
    excerpt: document.getElementById('art-excerpt'),
    cover:   document.getElementById('art-cover'),
    content: document.getElementById('art-content'),
    gallery: document.getElementById('art-gallery'),
    status:  document.getElementById('art-status'),
    back:    document.getElementById('back-link'),
  };

  // --- 3) API endpoints possibles ---
  const API_BASE = window.API_BASE || 'http://localhost:3000';
  const urls = [
    `${API_BASE}/articles/${encodeURIComponent(id)}`,
    `${API_BASE}/api/news/${encodeURIComponent(id)}`,
    `${API_BASE}/api/articles/${encodeURIComponent(id)}`,
    `${API_BASE}/news/${encodeURIComponent(id)}`
  ];

  // --- 4) Helpers sécurité/format ---
  const esc = (s) => String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Autorise seulement ces balises dans le HTML éditorial éventuel
  const ALLOWED_HTML_RE = /<(p|br|ul|ol|li|strong|em|b|i|u|a|blockquote|hr|code)\b[\s\S]*?>/i;

  // Texte -> HTML block (génère des <p>…</p>)
  function formatBlock(text) {
    if (!text) return '';
    const str = String(text);
    if (ALLOWED_HTML_RE.test(str)) return str;  // déjà du HTML éditorial
    let safe = esc(str.trim());
    safe = safe.replace(/&lt;([a-z][a-z0-9-]*)&gt;/gi, '<code>&lt;$1&gt;</code>');
    return safe.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  }

  // Texte -> inline (pas de <p> pour éviter <p> dans <p>)
  function formatInline(text) {
    if (!text) return '';
    const str = String(text);
    if (ALLOWED_HTML_RE.test(str)) return str;  // si l’API renvoie du HTML propre
    let safe = esc(str.trim());
    return safe.replace(/\n/g, '<br>');
  }

  // Unwrap réponses API variées
  function unwrap(data) {
    if (Array.isArray(data)) return data[0] || null;
    if (data && typeof data === 'object') {
      if ('data' in data) return data.data;
      if ('item' in data) return data.item;
      if ('article' in data) return data.article;
    }
    return data;
  }

  // --- 5) Rendu ---
  function render(a) {
    const title   = a.title || a.titre || '(Sans titre)';
    const img     = a.image || a.cover || a.thumbnail || '';
    const excerpt = a.description || a.excerpt || '';
    const body    = a.content || a.body || '';

    const dateVal     = a.publicationDate || a.publishedAt || a.createdAt || a.date || null;
    const d           = dateVal ? new Date(dateVal) : null;
    const dateMachine = d && !Number.isNaN(d) ? d.toISOString().slice(0,10) : '';
    const dateHuman   = d && !Number.isNaN(d) ? d.toLocaleDateString('fr-FR') : '';

    // Titre
    if (el.title) el.title.textContent = title;

    // Date (même si masquée par CSS, on la remplit pour l’accessibilité)
    if (el.date) {
      if (dateHuman) {
        el.date.innerHTML = `Publié le <time datetime="${dateMachine}">${dateHuman}</time>`;
        el.date.hidden = false;
      } else {
        el.date.hidden = true;
      }
    }

    // Extrait (inline, pas de <p> imbriqués)
    if (el.excerpt) {
      if (excerpt) {
        el.excerpt.innerHTML = formatInline(excerpt);
        el.excerpt.hidden = false;
      } else {
        el.excerpt.hidden = true;
      }
    }

    // Image
    if (el.cover) {
      if (img) {
        el.cover.src = img;
        el.cover.alt = title || '';
        el.cover.hidden = false;
      } else {
        el.cover.hidden = true;
      }
    }

    // Contenu
    if (el.content) {
      el.content.innerHTML = formatBlock(body);
      // sécurise les liens ouverts par l’API
      el.content.querySelectorAll('a[href]').forEach(a => {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      });
    }

    // Galerie (supporte a.images / a.gallery / a.photos : string[] ou [{src}] )
    if (el.gallery) {
      const arr = a.images || a.gallery || a.photos || [];
      const urls = (Array.isArray(arr) ? arr : []).map(x => {
        if (!x) return null;
        if (typeof x === 'string') return x;
        if (x.src) return x.src;
        if (x.url) return x.url;
        return null;
      }).filter(Boolean);
      if (urls.length) {
        el.gallery.innerHTML = urls.map(u =>
          `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">
             <img src="${esc(u)}" alt="">
           </a>`
        ).join('');
        el.gallery.hidden = false;
      } else {
        el.gallery.hidden = true;
      }
    }

    // Title de l’onglet
    document.title = `${title} — AgenceEco`;

    // underline animé (après layout)
    requestAnimationFrame(() => {
      el.title?.classList.add('is-on');
      el.title?.focus?.(); // petit + accessibilité si focusable
    });

    // back-link : history.back() si possible
    if (el.back) {
      el.back.addEventListener('click', (e) => {
        if (history.length > 1) { e.preventDefault(); history.back(); }
      }, { once: true });
    }

    // status off
    if (el.status) el.status.hidden = true;
  }

  function fail(msg) {
    if (el.status) {
      el.status.textContent = msg;
      el.status.classList.add('error');
      el.status.hidden = false;
    } else {
      root.insertAdjacentHTML('afterbegin', `<p class="status error">${esc(msg)}</p>`);
    }
  }

  // --- 6) Chargement ---
  if (el.status) { el.status.hidden = false; el.status.textContent = 'Chargement…'; }

  (async () => {
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) continue;
        const data = unwrap(await res.json());
        if (data && typeof data === 'object') { render(data); return; }
      } catch {/* try next */}
    }
    fail(`Impossible de charger l’article (ID=${esc(id)}).`);
  })();
})();

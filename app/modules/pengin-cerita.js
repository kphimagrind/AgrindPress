// app/modules/pengin-cerita.js
// Halaman khusus Pengin Cerita: editorial minimal, pencarian, dan render mandiri

import Navbar from '../components/navbar.js';
import Footer from '../components/footer.js';
import ArtikelService from '../services/artikelService.js';
import Pagination from '../templates/pagination.js';
import CONFIG from '../core/config.js';
import Router from '../core/router.js';

const state = {
  all: [],
  filtered: [],
  query: '',
  page: 1,
  perPage: 10
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTanggal(value) {
  const d = parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatTanggalSingkat(value) {
  const d = parseDate(value);
  if (!d) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

function waktuRelatif(value) {
  const d = parseDate(value);
  if (!d) return '';
  const selisih = Math.floor((Date.now() - d.getTime()) / 1000);

  if (selisih < 60) return 'baru saja';
  if (selisih < 3600) return `${Math.floor(selisih / 60)} menit lalu`;
  if (selisih < 86400) return `${Math.floor(selisih / 3600)} jam lalu`;
  if (selisih < 86400 * 2) return 'kemarin';
  if (selisih < 86400 * 7) return `${Math.floor(selisih / 86400)} hari lalu`;
  if (selisih < 86400 * 30) return `${Math.floor(selisih / 86400 / 7)} minggu lalu`;
  return formatTanggal(value);
}

function thumbnailUrl(path) {
  const fallback = `${CONFIG.baseUrl}assets/img/placeholder.jpg`;
  if (!path) return fallback;
  if (/^https?:\/\//i.test(path)) return path;
  return `${CONFIG.baseUrl}${path.replace(/^\/+/, '')}`;
}

function articleUrl(article) {
  return article?.id ? Router.artikelUrl(article.id) : '#';
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function uniqueTags(items) {
  const tags = new Set();
  items.forEach(item => {
    (item.tags || []).forEach(tag => {
      const clean = String(tag || '').trim();
      if (clean) tags.add(clean);
    });
  });
  return Array.from(tags).slice(0, 10);
}

function countAuthors(items) {
  return new Set(items.map(item => String(item.penulis || '').trim()).filter(Boolean)).size;
}

function latestDate(items) {
  return items
    .map(item => parseDate(item.tanggal))
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || null;
}

function filterArticles(items, query) {
  const q = normalizeText(query);
  if (!q) return [...items];

  return items.filter(article => {
    const haystack = [
      article.judul,
      article.ringkasan,
      article.penulis,
      article.sub,
      article.kategori,
      ...(article.tags || [])
    ].join(' ');

    return normalizeText(haystack).includes(q);
  });
}

function truncate(text = '', max = 120) {
  const clean = String(text || '').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function renderSearchBox(tags) {
  const chips = ['Semua', ...tags];
  return `
    <section class="pengin-searchbox" aria-label="Pencarian rubrik Pengin Cerita">
      <p class="pengin-search-label">cari cerita</p>
      <div class="pengin-search-row">
        <input
          type="search"
          id="pengin-search-input"
          class="pengin-search-input"
          placeholder="Cari judul, penulis, tag, atau ringkasan..."
          autocomplete="off"
          aria-label="Cari cerita di rubrik Pengin Cerita"
          value="${escapeHtml(state.query)}"
        />
        <button type="button" class="pengin-search-btn" id="pengin-search-btn" aria-label="Cari">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M10.5 4a6.5 6.5 0 1 0 4.12 11.53l4.42 4.42 1.41-1.41-4.42-4.42A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" fill="currentColor"/>
          </svg>
        </button>
      </div>

      <div class="pengin-chipbar" id="pengin-chipbar">
        ${chips.map((tag, index) => `
          <button
            type="button"
            class="pengin-chip ${index === 0 ? 'is-active' : ''}"
            data-tag="${escapeHtml(index === 0 ? '' : tag)}"
          >
            ${escapeHtml(tag)}
          </button>
        `).join('')}
      </div>

      <div class="pengin-search-meta">
        <span id="pengin-search-summary">${state.filtered.length} cerita ditemukan</span>
        <button type="button" class="pengin-clear-btn" id="pengin-clear-btn">Reset</button>
      </div>
    </section>
  `;
}

function renderFeatureCard(article) {
  if (!article) {
    return `
      <article class="pengin-feature-card pengin-empty-card">
        <div class="pengin-empty-state">
          <p class="pengin-empty-kicker">kosong</p>
          <h2 class="pengin-feature-title">Belum ada cerita yang cocok.</h2>
          <p class="pengin-feature-excerpt">
            Coba kata kunci lain, pilih tag berbeda, atau tekan Reset untuk kembali ke semua tulisan.
          </p>
        </div>
      </article>
    `;
  }

  const rubrik = escapeHtml((article.sub || 'pengin-cerita').replace(/-/g, ' '));
  const title = escapeHtml(article.judul);
  const excerpt = escapeHtml(article.ringkasan || '');

  return `
    <article class="pengin-feature-card">
      <a href="${articleUrl(article)}" class="pengin-feature-link">
        <div class="pengin-feature-media">
          <img
            src="${thumbnailUrl(article.thumbnail)}"
            alt="${title}"
            class="pengin-feature-img"
            loading="lazy"
            decoding="async"
            onerror="this.src='${CONFIG.baseUrl}assets/img/placeholder.jpg'"
          />
        </div>

        <div class="pengin-feature-body">
          <div class="pengin-meta-row">
            <span class="pengin-rubrik">${rubrik}</span>
            <span class="pengin-dot">•</span>
            <span class="pengin-time" title="${escapeHtml(formatTanggal(article.tanggal))}">${escapeHtml(waktuRelatif(article.tanggal))}</span>
          </div>

          <h2 class="pengin-feature-title">${title}</h2>
          <p class="pengin-feature-excerpt">${excerpt}</p>

          <div class="pengin-feature-footer">
            <span class="pengin-author">${escapeHtml(article.penulis || 'Anonim')}</span>
            ${article.estimasi_baca ? `<span class="pengin-read">${escapeHtml(article.estimasi_baca)} menit baca</span>` : ''}
          </div>
        </div>
      </a>
    </article>
  `;
}

function renderRail(items) {
  const list = items.slice(1, 5);

  if (!list.length) {
    return `
      <article class="pengin-rail-card pengin-rail-empty">
        <p class="pengin-empty-kicker">bingkai kecil</p>
        <h3>Belum ada cerita lain.</h3>
      </article>
    `;
  }

  return list.map(article => {
    const rubrik = escapeHtml((article.sub || 'pengin-cerita').replace(/-/g, ' '));
    const title = escapeHtml(article.judul);
    return `
      <article class="pengin-rail-card">
        <a href="${articleUrl(article)}" class="pengin-rail-link">
          <div class="pengin-rail-media">
            <img
              src="${thumbnailUrl(article.thumbnail)}"
              alt="${title}"
              class="pengin-rail-img"
              loading="lazy"
              decoding="async"
              onerror="this.src='${CONFIG.baseUrl}assets/img/placeholder.jpg'"
            />
          </div>

          <div class="pengin-rail-body">
            <div class="pengin-mini-meta">
              <span class="pengin-rubrik">${rubrik}</span>
              <span class="pengin-dot">•</span>
              <span class="pengin-time">${escapeHtml(formatTanggalSingkat(article.tanggal))}</span>
            </div>
            <h3 class="pengin-rail-title">${title}</h3>
          </div>
        </a>
      </article>
    `;
  }).join('');
}

function renderFeedCard(article) {
  const rubrik = escapeHtml((article.sub || 'pengin-cerita').replace(/-/g, ' '));
  const title = escapeHtml(article.judul);

  return `
    <article class="pengin-feed-card">
      <a href="${articleUrl(article)}" class="pengin-feed-link">
        <div class="pengin-feed-media">
          <img
            src="${thumbnailUrl(article.thumbnail)}"
            alt="${title}"
            class="pengin-feed-img"
            loading="lazy"
            decoding="async"
            onerror="this.src='${CONFIG.baseUrl}assets/img/placeholder.jpg'"
          />
        </div>

        <div class="pengin-feed-body">
          <div class="pengin-mini-meta">
            <span class="pengin-rubrik">${rubrik}</span>
            <span class="pengin-dot">•</span>
            <span class="pengin-time" title="${escapeHtml(formatTanggal(article.tanggal))}">${escapeHtml(waktuRelatif(article.tanggal))}</span>
          </div>
          <h3 class="pengin-feed-title-card">${title}</h3>
          <p class="pengin-feed-excerpt">${escapeHtml(truncate(article.ringkasan || '', 92))}</p>
        </div>
      </a>
    </article>
  `;
}

function renderFeed(items, page = 1) {
  const container = document.getElementById('pengin-feed');
  const paginationTarget = document.getElementById('pagination');
  if (!container || !paginationTarget) return;

  if (!state.filtered.length) {
    container.innerHTML = `
      <article class="pengin-empty-feed">
        <p class="pengin-empty-kicker">belum ada hasil</p>
        <h3>Tidak ada cerita yang cocok.</h3>
        <p>Coba kata kunci lain, pilih tag berbeda, atau tekan Reset untuk kembali ke semua cerita.</p>
      </article>
    `;
    paginationTarget.innerHTML = '';
    return;
  }

  if (!items.length) {
    container.innerHTML = `
      <article class="pengin-empty-feed">
        <p class="pengin-empty-kicker">sorotan atas</p>
        <h3>Semua cerita sudah tampil di bagian atas.</h3>
        <p>Nggak ada konten lagi. Ayo kirimin cerita kamu biar kolom ini tambah rame!</p>
      </article>
    `;
    paginationTarget.innerHTML = '';
    return;
  }

  const start = (page - 1) * state.perPage;
  const slice = items.slice(start, start + state.perPage);
  container.innerHTML = slice.map(renderFeedCard).join('');

  paginationTarget.innerHTML = Pagination.render(page, items.length, state.perPage, (nextPage) => {
    state.page = nextPage;
    renderFeed(items, state.page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function syncSearchChipState() {
  const chips = document.querySelectorAll('#pengin-chipbar .pengin-chip');
  const activeQuery = normalizeText(state.query);

  chips.forEach(chip => {
    const chipTag = normalizeText(chip.dataset.tag || '');
    const isActive = !activeQuery ? chipTag === '' : chipTag === activeQuery;
    chip.classList.toggle('is-active', isActive);
  });
}

function bindSearchControls() {
  const input = document.getElementById('pengin-search-input');
  const btn = document.getElementById('pengin-search-btn');
  const clearBtn = document.getElementById('pengin-clear-btn');
  const chipbar = document.getElementById('pengin-chipbar');

  if (input) {
    input.addEventListener('input', () => {
      state.query = input.value;
      state.page = 1;
      renderAll();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.query = input.value;
        state.page = 1;
        renderAll();
      }
    });
  }

  if (btn && input) {
    btn.addEventListener('click', () => {
      state.query = input.value;
      state.page = 1;
      renderAll();
    });
  }

  if (clearBtn && input) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      state.query = '';
      state.page = 1;
      renderAll();
      input.focus();
    });
  }

  if (chipbar) {
    chipbar.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-tag]');
      if (!chip) return;

      const tag = chip.dataset.tag || '';
      if (input) input.value = tag;
      state.query = tag;
      state.page = 1;
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function renderAll() {
  const filtered = filterArticles(state.all, state.query);
  state.filtered = filtered;

  const featureContainer = document.getElementById('pengin-feature');
  const railContainer = document.getElementById('pengin-rail');
  const resultCount = document.getElementById('pengin-result-count');
  const summary = document.getElementById('pengin-search-summary');

  if (featureContainer) {
    featureContainer.innerHTML = renderFeatureCard(filtered[0] || null);
  }

  if (railContainer) {
    railContainer.innerHTML = renderRail(filtered);
  }

  const summaryText = state.query
    ? `${filtered.length} hasil untuk “${state.query}”`
    : `${filtered.length} cerita tersedia`;

  if (resultCount) resultCount.textContent = summaryText;
  if (summary) summary.textContent = summaryText;

  syncSearchChipState();

  const feedItems = filtered.length > 5 ? filtered.slice(5) : filtered.slice(1);
  renderFeed(feedItems, state.page);
}

async function init() {
  await Navbar.render('navbar');
  await Footer.render('footer');

  document.title = 'Pengin Cerita - AgrindPress';

  const items = await ArtikelService.getByKategori('artikel', 'pengin-cerita');
  state.all = uniqueById(items).sort((a, b) => {
    const left = parseDate(b.tanggal)?.getTime?.() ?? 0;
    const right = parseDate(a.tanggal)?.getTime?.() ?? 0;
    return left - right;
  });
  state.filtered = [...state.all];

  const searchContainer = document.getElementById('pengin-search');
  if (searchContainer) {
    searchContainer.innerHTML = renderSearchBox(uniqueTags(state.all));
  }

  bindSearchControls();
  renderAll();
}

init();

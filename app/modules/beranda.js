// app/modules/beranda.js

import Navbar         from '../components/navbar.js';
import Footer         from '../components/footer.js';
import Searchbox      from '../components/searchbox.js';
import ArtikelService from '../services/artikelService.js';
import CardArtikel    from '../templates/cardArtikel.js';
import DataLoader     from '../core/dataLoader.js';

async function renderHero() {
  const config = await DataLoader.loadJSON('config.json');
  if (!config) return;
  const html = `
    <div class="hero">
      <p class="hero-label">${config.site.singkatan}</p>
      <h1 class="hero-judul">${config.site.nama}</h1>
      <p class="hero-sub">${config.site.tagline}</p>
    </div>`;
  document.getElementById('hero').innerHTML = html;
}

// Render headline utama (card besar ala Tirto) + artikel samping
function renderZonaTerbaru(terbaru) {
  const elUtama   = document.getElementById('headline-utama');
  const elSamping = document.getElementById('headline-samping');
  if (!elUtama || !elSamping) return;

  if (!terbaru || terbaru.length === 0) {
    elUtama.innerHTML   = '<p class="kosong">Belum ada konten.</p>';
    elSamping.innerHTML = '';
    return;
  }

  // Artikel pertama: headline besar
  elUtama.innerHTML   = CardArtikel.renderHeadline(terbaru[0]);
  // Artikel berikutnya: daftar kompak di samping
  elSamping.innerHTML = terbaru.slice(1, 5).map(a => CardArtikel.renderKompak(a)).join('');
}

// Render zona Pilihan Editor (scrollable horizontal)
async function renderZonaPilihanEditor() {
  const el = document.getElementById('pilihan-editor-scroll');
  if (!el) return;

  const config = await DataLoader.loadJSON('config.json');
  if (!config || !config.pilihan_editor || config.pilihan_editor.length === 0) {
    el.innerHTML = '<p class="kosong">Belum ada pilihan editor.</p>';
    return;
  }

  const semua = await ArtikelService.getTerbaru(999);
  const items = config.pilihan_editor
    .map(pe => {
      const artikel = semua.find(a => a.id === pe.id);
      return artikel ? { ...artikel, _catatan: pe.catatan } : null;
    })
    .filter(Boolean);

  if (items.length === 0) {
    el.innerHTML = '<p class="kosong">Belum ada pilihan editor.</p>';
    return;
  }

  el.innerHTML = items.map(a => CardArtikel.renderPilihanEditor(a)).join('');
}

// Render zona Pengin Cerita (grid editorial)
async function renderZonaPenginCerita() {
  const el = document.getElementById('list-pengin-cerita');
  if (!el) return;

  const pengin = await ArtikelService.getByKategori('artikel', 'pengin-cerita');

  if (!pengin || pengin.length === 0) {
    el.innerHTML = '<p class="kosong">Belum ada cerita.</p>';
    return;
  }

  const items = pengin.slice(0, 5);
  const hero = CardArtikel.renderPenginGrid(items[0]);
  const side = items.slice(1).map(a => CardArtikel.renderPenginGrid(a)).join('');

  el.innerHTML = `
    <div class="pengin-layout">
      <div class="pengin-hero">
        ${hero}
      </div>
      <div class="pengin-side">
        ${side}
      </div>
    </div>
  `;
}

function renderList(containerId, items, renderFn) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!items || items.length === 0) {
    el.innerHTML = '<p class="kosong">Belum ada konten.</p>';
    return;
  }

  el.innerHTML = items.map(renderFn).join('');
}

async function init() {
  await Navbar.render('navbar');
  await Footer.render('footer');
  await renderHero();
  Searchbox.render('searchbox');
  await renderZonaPilihanEditor();
  await renderZonaPenginCerita();

  const terbaru   = await ArtikelService.getTerbaru(6);
  const informasi = await ArtikelService.getByKategori('informasi');
  const artikel   = await ArtikelService.getByKategori('artikel');
  const galeri    = await ArtikelService.getByKategori('artikel', 'galeri-mahasiswa');

  renderZonaTerbaru(terbaru);
  renderList('list-informasi', informasi.slice(0, 3),  a => CardArtikel.renderKompak(a));
  renderList('list-artikel',   artikel.filter(a => a.sub !== 'galeri-anak-ppa').slice(0, 3),
                                                        a => CardArtikel.renderKompak(a));
  renderList('list-galeri',    galeri.slice(0, 2),     a => CardArtikel.renderGaleri(a));
}

init();

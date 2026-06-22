// app/modules/artikel.js

import Navbar         from '../components/navbar.js';
import Footer         from '../components/footer.js';
import ArtikelService from '../services/artikelService.js';
import CardArtikel    from '../templates/cardArtikel.js';
import DataLoader     from '../core/dataLoader.js';
import Router         from '../core/router.js';
import CONFIG         from '../core/config.js';

function formatTanggal(str) {
  return new Date(str).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function waktuRelatif(str) {
  const sekarang = Date.now();
  const waktu    = new Date(str).getTime();
  const selisih  = Math.floor((sekarang - waktu) / 1000);

  if (selisih < 60)           return 'baru saja';
  if (selisih < 3600)         return `${Math.floor(selisih / 60)} menit lalu`;
  if (selisih < 86400)        return `${Math.floor(selisih / 3600)} jam lalu`;
  if (selisih < 86400 * 2)    return 'kemarin';
  if (selisih < 86400 * 7)    return `${Math.floor(selisih / 86400)} hari lalu`;
  if (selisih < 86400 * 30)   return `${Math.floor(selisih / 86400 / 7)} minggu lalu`;
  return null; // lebih dari 30 hari - tidak tampil
}

async function init() {
  await Navbar.render('navbar');
  await Footer.render('footer');

  const params = Router.getParams();
  const id = params.id;

  if (!id) {
    document.getElementById('artikel-body').innerHTML =
      '<p class="kosong">Artikel tidak ditemukan.</p>';
    return;
  }

  const data = await ArtikelService.getById(id);
  if (!data) {
    document.getElementById('artikel-body').innerHTML =
      '<p class="kosong">Artikel tidak ditemukan.</p>';
    return;
  }

  document.title = `${data.judul} - AgrindPress`;

  // Ambil konten HTML artikel - path relatif ke dokumen menggunakan CONFIG.baseUrl
  let konten = '';

if (data.content_html) {
  konten = data.content_html;
} else if (data.file) {
  konten = await DataLoader.loadHTML(
    CONFIG.baseUrl + data.file
  );
}

  // Related posts
  const related = await ArtikelService.getRelated(data, 4);
  const relatedHtml = related.length > 0
    ? `<div class="related-section">
        <h2 class="related-judul">Artikel Terkait</h2>
        ${related.map(a => CardArtikel.renderKecil(a)).join('')}
       </div>`
    : '';

  const placeholder = CONFIG.baseUrl + 'assets/img/placeholder.jpg';
  const resolveAsset = (path) => {
    if (!path) return placeholder;
    return /^https?:\/\//i.test(path) ? path : CONFIG.baseUrl + path;
  };

  const thumbSrc = resolveAsset(data.thumbnail);

  const galeriHtml = Array.isArray(data.foto) && data.foto.length > 0
  ? `
    <section class="artikel-galeri">
      <div class="artikel-galeri-grid">
        ${data.foto.map((f, i) => `
          <figure class="artikel-galeri-item">
            <img
              src="${resolveAsset(f)}"
              alt="${data.judul} - Foto ${i + 1}"
              loading="lazy"
              onerror="this.src='${placeholder}'"
            >
          </figure>
        `).join('')}
      </div>
    </section>
  `
  : '';

  const html = `
    <main class="artikel-container">
      <span class="artikel-label">${data.sub?.replace(/-/g,' ')}</span>
      <h1 class="artikel-judul">${data.judul}</h1>
      <div class="artikel-meta">
        <span class="artikel-penulis">${data.penulis}</span>
        <span class="card-sep">&middot;</span>
        <span>${formatTanggal(data.tanggal)}${waktuRelatif(data.tanggal) ? ` <span class="artikel-waktu-rel">(${waktuRelatif(data.tanggal)})</span>` : ''}</span>
        <span class="card-sep">&middot;</span>
        <span>${data.estimasi_baca ? `${data.estimasi_baca} menit baca` : ""}</span>
      </div>
      <img
        src="${thumbSrc}"
        alt="${data.judul}"
        class="artikel-header-img"
        onerror="this.src='${placeholder}'"
      >
      ${galeriHtml}  
      <div class="artikel-konten">${konten}</div>
      ${relatedHtml}
    </main>`;

  document.getElementById('artikel-body').innerHTML = html;
}

init();

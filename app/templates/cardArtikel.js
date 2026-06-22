// app/templates/cardArtikel.js
// Menghasilkan HTML kartu artikel

import Router from '../core/router.js';
import CONFIG from '../core/config.js';

function formatTanggal(str) {
  const d = new Date(str);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Waktu relatif: "baru saja", "5 menit lalu", "2 jam lalu", "3 hari lalu", dll.
// Untuk konten lebih dari 30 hari, tampilkan tanggal lengkap
function waktuRelatif(str) {
  const sekarang = Date.now();
  const waktu    = new Date(str).getTime();
  const selisih  = Math.floor((sekarang - waktu) / 1000); // dalam detik

  if (selisih < 60)           return 'baru saja';
  if (selisih < 3600)         return `${Math.floor(selisih / 60)} menit lalu`;
  if (selisih < 86400)        return `${Math.floor(selisih / 3600)} jam lalu`;
  if (selisih < 86400 * 2)    return 'kemarin';
  if (selisih < 86400 * 7)    return `${Math.floor(selisih / 86400)} hari lalu`;
  if (selisih < 86400 * 30)   return `${Math.floor(selisih / 86400 / 7)} minggu lalu`;
  // Lebih dari 30 hari - tampilkan tanggal lengkap
  return formatTanggal(str);
}

function labelSub(sub) {
  const map = {
    'opini': 'Opini',
    'cerpen': 'Cerpen',
    'pengin-cerita': 'Pengin Cerita',
    'galeri-mahasiswa': 'Galeri Mahasiswa',
    'perkuliahan': 'Perkuliahan',
    'kegiatan': 'Kegiatan',
    'organisasi': 'Organisasi'
  };
  return map[sub] || sub;
}

// Prefix gambar relatif ke base (root vs pages/)
const placeholder = `${CONFIG.baseUrl}assets/img/placeholder.jpg`;
function imgSrc(path) {
  if (!path) return placeholder;
  return /^https?:\/\//i.test(path) ? path : CONFIG.baseUrl + path;
}

const CardArtikel = {
  // Card standar untuk listing
  render(artikel) {
    const url  = Router.artikelUrl(artikel.id);
    const thumb = imgSrc(artikel.thumbnail);
    return `
      <article class="card-artikel">
        <a href="${url}" class="card-thumb-link">
          <img
            src="${thumb}"
            alt="${artikel.judul}"
            class="card-thumb"
            loading="lazy"
            onerror="this.src='${placeholder}'"
          />
        </a>
        <div class="card-body">
          <span class="card-label">${labelSub(artikel.sub)}</span>
          <h2 class="card-judul">
            <a href="${url}">${artikel.judul}</a>
          </h2>
          <p class="card-ringkasan">${artikel.ringkasan}</p>
          <div class="card-meta">
            <span class="card-penulis">${artikel.penulis}</span>
            <span class="card-sep">&middot;</span>
            <span class="card-tanggal" title="${formatTanggal(artikel.tanggal)}">${waktuRelatif(artikel.tanggal)}</span>
            <span class="card-sep">&middot;</span>
            <span class="card-baca">${artikel.estimasi_baca ? `${artikel.estimasi_baca} menit baca` : ""}</span>
          </div>
        </div>
      </article>`;
  },

  // Card kecil untuk related posts
  renderKecil(artikel) {
    const url   = Router.artikelUrl(artikel.id);
    const thumb = imgSrc(artikel.thumbnail);
    return `
      <article class="card-kecil">
        <a href="${url}" class="card-kecil-thumb-link">
          <img
            src="${thumb}"
            alt="${artikel.judul}"
            class="card-kecil-thumb"
            loading="lazy"
            onerror="this.src='${placeholder}'"
          />
        </a>
        <div class="card-kecil-body">
          <span class="card-label">${labelSub(artikel.sub)}</span>
          <h3 class="card-kecil-judul">
            <a href="${url}">${artikel.judul}</a>
          </h3>
          <div class="card-meta">
            <span class="card-tanggal" title="${formatTanggal(artikel.tanggal)}">${waktuRelatif(artikel.tanggal)}</span>
          </div>
        </div>
      </article>`;
  },

  // Card headline besar (Tirto-style: foto full lebar + judul overlay)
  renderHeadline(artikel) {
    const url   = Router.artikelUrl(artikel.id);
    const thumb = imgSrc(artikel.thumbnail);
    return `
      <article class="card-headline">
        <a href="${url}" class="card-headline-link">
          <div class="card-headline-img-wrap">
            <img
              src="${thumb}"
              alt="${artikel.judul}"
              class="card-headline-img"
              loading="lazy"
              onerror="this.src='${placeholder}'"
            />
          </div>
          <div class="card-headline-body">
            <span class="card-label">${labelSub(artikel.sub)}</span>
            <h2 class="card-headline-judul">${artikel.judul}</h2>
            <p class="card-headline-ringkasan">${artikel.ringkasan}</p>
            <div class="card-meta" style="margin-top:12px">
              <span class="card-penulis">${artikel.penulis}</span>
              <span class="card-sep">&middot;</span>
              <span class="card-tanggal" title="${formatTanggal(artikel.tanggal)}">${waktuRelatif(artikel.tanggal)}</span>
              <span class="card-sep">&middot;</span>
              <span class="card-baca">${artikel.estimasi_baca ? `${artikel.estimasi_baca} menit baca` : ""}</span>
            </div>
          </div>
        </a>
      </article>`;
  },

  // Card kompak: hanya thumb kecil + judul (untuk sidebar & kolom 2-kolom beranda)
  renderKompak(artikel) {
    const url   = Router.artikelUrl(artikel.id);
    const thumb = imgSrc(artikel.thumbnail);
    return `
      <article class="card-kompak">
        <a href="${url}" class="card-kompak-thumb-link">
          <img
            src="${thumb}"
            alt="${artikel.judul}"
            class="card-kompak-thumb"
            loading="lazy"
            onerror="this.src='${placeholder}'"
          />
        </a>
        <div class="card-kompak-body">
          <span class="card-label">${labelSub(artikel.sub)}</span>
          <h3 class="card-kompak-judul">
            <a href="${url}">${artikel.judul}</a>
          </h3>
          <div class="card-meta">
            <span class="card-penulis">${artikel.penulis}</span>
            <span class="card-sep">&middot;</span>
            <span class="card-tanggal" title="${formatTanggal(artikel.tanggal)}">${waktuRelatif(artikel.tanggal)}</span>
          </div>
        </div>
      </article>`;
  },

  // Card galeri (grid foto)
  renderGaleri(galeri) {
    const url      = Router.artikelUrl(galeri.id);
    const fotoHtml = (galeri.foto || []).slice(0, 4).map((f, i) =>
      `<img src="${imgSrc(f)}" alt="Foto ${i + 1}" class="galeri-foto" loading="lazy"
        onerror="this.src='${placeholder}'">`
    ).join('');
    return `
      <article class="card-galeri">
        <a href="${url}">
          <div class="galeri-grid">${fotoHtml}</div>
          <div class="card-body">
            <h2 class="card-judul"><a href="${url}">${galeri.judul}</a></h2>
            <div class="card-meta">
              <span class="card-tanggal" title="${formatTanggal(galeri.tanggal)}">${waktuRelatif(galeri.tanggal)}</span>
            </div>
          </div>
        </a>
      </article>`;
  },
  // Card Pilihan Editor (scroll horizontal): foto besar + judul overlay bawah
  renderPilihanEditor(artikel) {
    const url   = Router.artikelUrl(artikel.id);
    const thumb = imgSrc(artikel.thumbnail);
    const catatan = artikel._catatan
      ? `<span class="pe-badge">${artikel._catatan}</span>` : '';
    return `
      <article class="card-pe">
        <a href="${url}" class="card-pe-link">
          <div class="card-pe-img-wrap">
            <img
              src="${thumb}"
              alt="${artikel.judul}"
              class="card-pe-img"
              loading="lazy"
              onerror="this.src='${placeholder}'"
            />
            ${catatan}
          </div>
          <div class="card-pe-body">
            <span class="card-label">${labelSub(artikel.sub)}</span>
            <h3 class="card-pe-judul">${artikel.judul}</h3>
            <div class="card-meta">
              <span class="card-penulis">${artikel.penulis}</span>
            </div>
          </div>
        </a>
      </article>`;
  },
  // Card Pengin Cerita - gaya editorial/diajeng
 // Card Pengin Cerita - gaya editorial/diajeng
  renderPenginGrid(artikel) {
    const url   = Router.artikelUrl(artikel.id);
    const thumb = imgSrc(artikel.thumbnail);

    return `
      <article class="card-pengin">
        <a href="${url}" class="card-pengin-link">
          <div class="card-pengin-img-wrap">
            <img
              src="${thumb}"
              alt="${artikel.judul}"
              class="card-pengin-img"
              loading="lazy"
              onerror="this.src='${placeholder}'"
            />
          </div>

          <div class="card-pengin-body">

            <div class="card-pengin-meta">
              <span>${waktuRelatif(artikel.tanggal)}</span>
            </div>

            <h3 class="card-pengin-judul">${artikel.judul}</h3>
            <p class="card-pengin-ringkasan">${artikel.ringkasan}</p>
          </div>
        </a>
      </article>`;
  }
};


export default CardArtikel;

// app/modules/kategori.js

import Navbar         from '../components/navbar.js';
import Footer         from '../components/footer.js';
import Searchbox      from '../components/searchbox.js';
import ArtikelService from '../services/artikelService.js';
import CardArtikel    from '../templates/cardArtikel.js';
import Pagination     from '../templates/pagination.js';
import Router         from '../core/router.js';
import CONFIG         from '../core/config.js';
import Banner         from '../components/banner.js';

const LABEL = {
  informasi: 'Informasi',
  artikel: 'Artikel',
  perkuliahan: 'Perkuliahan',
  kegiatan: 'Kegiatan',
  organisasi: 'Organisasi',
  opini: 'Opini',
  cerpen: 'Cerpen',
  'pengin-cerita': 'Pengin Cerita',
  'galeri-mahasiswa': 'Galeri Mahasiswa'
};

let semuaData = [];
let halamanAktif = 1;

function tampilHalaman(data, hal) {
  const start = (hal - 1) * CONFIG.itemsPerPage;
  const slice = data.slice(start, start + CONFIG.itemsPerPage);

  // Tentukan sub dari item pertama (atau dari URL params)
  const params   = Router.getParams();
  const subParam = params.sub || (slice[0]?.sub ?? '');
  const isGaleri     = subParam === 'galeri-mahasiswa';
  const isPengin     = subParam === 'pengin-cerita';
  const isListBiasa  = subParam === 'perkuliahan' || subParam === 'kegiatan' ||
                       subParam === 'organisasi'  || params.kategori === 'informasi';

  let html = '';
  if (slice.length === 0) {
    html = '<p class="kosong"><span class="kosong-ikon">📭</span><br>Belum ada konten di kategori ini.</p>';
  } else if (isGaleri) {
    html = `<div class="galeri-row">${slice.map(a => CardArtikel.renderGaleri(a)).join('')}</div>`;
  } else if (isPengin) {
    // Pengin Cerita: grid card khusus (dikerjakan di Perubahan 3)
    html = `<div class="pengin-grid">${slice.map(a => CardArtikel.renderPenginGrid(a)).join('')}</div>`;
  } else if (isListBiasa) {
    // Informasi & sub-informasi: tetap list (kartu standar)
    html = slice.map(a => CardArtikel.render(a)).join('');
  } else {
    // artikel/opini/cerpen: grid 2 kolom
    html = `<div class="kategori-grid">${slice.map(a => CardArtikel.render(a)).join('')}</div>`;
  }

  document.getElementById('list-konten').innerHTML = html;

  document.getElementById('pagination').innerHTML =
    Pagination.render(hal, data.length, CONFIG.itemsPerPage, (h) => {
      halamanAktif = h;
      tampilHalaman(data, h);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

async function init() {
  await Navbar.render('navbar');
  await Footer.render('footer');

  const params = Router.getParams();
  const kategori = params.kategori || '';
  const sub = params.sub || '';
  const judul = LABEL[sub] || LABEL[kategori] || 'Konten';

  document.getElementById('judul-kategori').textContent = judul;
  document.title = `${judul} - AgrindPress`;
  // Tambahkan class khusus ke <main> jika Pengin Cerita
  const mainEl = document.querySelector('main');
  if (mainEl && sub === 'pengin-cerita') {
    mainEl.classList.add('pengin-cerita-page');
  }

  Searchbox.render('searchbox');

  semuaData = await ArtikelService.getByKategori(kategori, sub);
  tampilHalaman(semuaData, 1);
  await Banner.render();
}

init();

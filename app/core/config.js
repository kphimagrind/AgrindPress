// app/core/config.js
// Konfigurasi path dan konstanta global

// Deteksi apakah halaman ada di dalam subfolder /pages/
// fetch() dan href relatif bergantung pada lokasi dokumen HTML, bukan lokasi script
const _inPages = window.location.pathname.includes('/pages/');
const _base    = _inPages ? '../' : '';

const CONFIG = {
  baseUrl:       _base,
  dataPath:      _base + 'assets/data/',
  contentPath:   _base + 'content/',
  imgPath:       _base + 'assets/img/',
  itemsPerPage:  8,
  searchMinChar: 2,
  galeriPerPage: 6
};

export default CONFIG;

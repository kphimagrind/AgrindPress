// app/core/router.js
// Membaca parameter URL untuk navigasi

// Deteksi apakah halaman ada di dalam subfolder /pages/
const _inPages = window.location.pathname.includes('/pages/');

const Router = {
  getParams() {
    const params = {};
    new URLSearchParams(window.location.search).forEach((v, k) => {
      params[k] = v;
    });
    return params;
  },

  go(url) {
    window.location.href = url;
  },

  // Bangun URL halaman artikel - menyesuaikan konteks root vs pages/
  artikelUrl(id) {
    return _inPages
      ? `artikel.html?id=${id}`
      : `pages/artikel.html?id=${id}`;
  },

  // Bangun URL kategori - menyesuaikan konteks root vs pages/
  kategoriUrl(kategori, sub = '') {
    const base = _inPages ? 'kategori.html' : 'pages/kategori.html';
    let url = `${base}?kategori=${kategori}`;
    if (sub) url += `&sub=${sub}`;
    return url;
  }
};

export default Router;

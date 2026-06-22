// app/services/searchService.js
// Pencarian full-text + prediksi kata (autocomplete)

import ArtikelService from './artikelService.js';

const SearchService = {
  async getSemuaData() {
    return await ArtikelService.getAll();
  },

  // Cari berdasarkan kata kunci penuh
  async cari(query) {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const semua = await this.getSemuaData();
    return semua
      .map(a => {
        const skor = this._hitungSkor(a, q);
        return { ...a, skor };
      })
      .filter(a => a.skor > 0)
      .sort((a, b) => b.skor - a.skor);
  },

  // Prediksi kata untuk autocomplete (maks 6 saran)
  async prediksi(query) {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const semua = await this.getSemuaData();

    const kandidat = new Set();
    semua.forEach(a => {
      const judul = String(a.judul || '');
      judul.split(' ').forEach(kata => {
        if (kata.toLowerCase().startsWith(q) && kata.length > q.length) {
          kandidat.add(kata);
        }
      });

      (a.tags || []).forEach(tag => {
        const t = String(tag || '');
        if (t.toLowerCase().startsWith(q)) {
          kandidat.add(t);
        }
      });
    });

    return Array.from(kandidat).slice(0, 6);
  },

  _hitungSkor(a, q) {
    let skor = 0;
    const judul = String(a.judul || '').toLowerCase();
    const ringkasan = String(a.ringkasan || '').toLowerCase();
    const penulis = String(a.penulis || '').toLowerCase();

    if (judul.includes(q))       skor += 10;
    if (ringkasan.includes(q))   skor += 5;
    if (penulis.includes(q))     skor += 3;
    (a.tags || []).forEach(t => {
      if (String(t || '').toLowerCase().includes(q)) skor += 4;
    });
    return skor;
  }
};

export default SearchService;

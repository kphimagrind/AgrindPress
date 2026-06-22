// app/modules/search.js

import Navbar       from '../components/navbar.js';
import Footer       from '../components/footer.js';
import Searchbox    from '../components/searchbox.js';
import SearchService from '../services/searchService.js';
import CardArtikel  from '../templates/cardArtikel.js';
import Router       from '../core/router.js';

async function lakukan(query) {
  const info = document.getElementById('search-info');
  const hasil = document.getElementById('search-hasil');

  if (!query || query.trim().length < 2) {
    hasil.innerHTML = '<p class="kosong"><span class="kosong-ikon">🔍</span><br>Ketik minimal 2 karakter.</p>';
    info.textContent = '';
    return;
  }

  hasil.innerHTML = '<p class="loading">Mencari...</p>';
  const data = await SearchService.cari(query);

  info.textContent = data.length > 0
    ? `Ditemukan ${data.length} hasil untuk "${query}"`
    : '';

  hasil.innerHTML = data.length === 0
    ? `<p class="kosong"><span class="kosong-ikon">📭</span><br>Tidak ada hasil untuk "<strong>${query}</strong>".</p>`
    : data.map(a => CardArtikel.render(a)).join('');
}

async function init() {
  await Navbar.render('navbar');
  await Footer.render('footer');

  Searchbox.render('searchbox', (q) => {
    // Update URL tanpa reload
    history.pushState({}, '', `?q=${encodeURIComponent(q)}`);
    lakukan(q);
  });

  // Cek apakah ada query di URL
  const params = Router.getParams();
  if (params.q) {
    const input = document.getElementById('search-input');
    if (input) input.value = params.q;
    lakukan(params.q);
  }
}

init();

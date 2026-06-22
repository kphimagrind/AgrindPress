// app/components/searchbox.js
// Input pencarian dengan prediksi kata

import SearchService from '../services/searchService.js';
import CONFIG        from '../core/config.js';

const Searchbox = {
  render(containerId = 'searchbox', onSubmit) {
    const html = `
      <div class="searchbox-wrap" id="searchbox-wrap">
        <div class="searchbox-inner">
          <input
            type="text"
            id="search-input"
            class="search-input"
            placeholder="Cari artikel, topik, penulis..."
            autocomplete="off"
            aria-label="Cari konten"
          />
          <button class="search-btn" id="search-btn" aria-label="Cari">
           <svg xmlns="http://www.w3.org/2000/svg"
             width="20"
             height="20"
             viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"></circle>
           <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
         </button>
        </div>
        <ul class="autocomplete-list" id="autocomplete-list"></ul>
      </div>`;

    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;

    this._bindEvents(onSubmit);
  },

  _bindEvents(onSubmit) {
    const input = document.getElementById('search-input');
    const list  = document.getElementById('autocomplete-list');
    const btn   = document.getElementById('search-btn');
    if (!input || !list) return;

    let debounce;

    input.addEventListener('input', () => {
      clearTimeout(debounce);
      const q = input.value.trim();
      if (q.length < 2) { list.innerHTML = ''; list.style.display = 'none'; return; }

      debounce = setTimeout(async () => {
        const saran = await SearchService.prediksi(q);
        if (saran.length === 0) { list.innerHTML = ''; list.style.display = 'none'; return; }
        list.innerHTML = saran.map(s =>
          `<li class="autocomplete-item" data-val="${s}">${s}</li>`
        ).join('');
        list.style.display = 'block';
      }, 200);
    });

    list.addEventListener('click', e => {
      if (e.target.classList.contains('autocomplete-item')) {
        input.value = e.target.dataset.val;
        list.innerHTML = '';
        list.style.display = 'none';
        this._submit(input.value, onSubmit);
      }
    });

    btn.addEventListener('click', () => this._submit(input.value, onSubmit));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._submit(input.value, onSubmit);
    });

    // Tutup list saat klik di luar
    document.addEventListener('click', e => {
      if (!e.target.closest('#searchbox-wrap')) {
        list.innerHTML = '';
        list.style.display = 'none';
      }
    });
  },

  _submit(query, onSubmit) {
    if (!query.trim()) return;
    if (onSubmit) {
      onSubmit(query);
    } else {
      // Gunakan CONFIG.baseUrl agar search.html selalu ditemukan dari manapun
      window.location.href = `${CONFIG.baseUrl}pages/search.html?q=${encodeURIComponent(query)}`;
    }
  }
};

export default Searchbox;

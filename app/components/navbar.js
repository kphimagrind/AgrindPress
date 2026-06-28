// app/components/navbar.js
// Menu navigasi dengan dropdown hover

import DataLoader from '../core/dataLoader.js';
import CONFIG    from '../core/config.js';

const Navbar = {
  async render(containerId = 'navbar') {
    const config = await DataLoader.loadJSON('config.json');
    if (!config) return;

    const nav = config.navigasi;
    const currentPath = window.location.pathname;
    const inPages = currentPath.includes('/pages/');

    // Sesuaikan URL navigasi berdasarkan konteks halaman
    function resolveUrl(url) {
      if (url === 'index.html') return inPages ? '../index.html' : 'index.html';
      if (inPages && url.startsWith('pages/')) return url.slice(6);
      return url;
    }

    // Logo putih berlatar putih - cocok untuk navbar putih
    const logoSrc = CONFIG.baseUrl + 'assets/img/logo-putih.jpg';

    const itemsHtml = nav.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const itemUrl     = resolveUrl(item.url);
      const aktif = currentPath.includes(item.url.split('?')[0].replace(/^pages\//, '')) ? 'aktif' : '';

      if (hasChildren) {
        const childrenHtml = item.children.map(c =>
          `<a href="${resolveUrl(c.url)}" class="dropdown-item">${c.label}</a>`
        ).join('');
        return `
          <li class="nav-item has-dropdown ${aktif}">
            <a href="${itemUrl}" class="nav-link">
              ${item.label}
              <span class="arrow">▾</span>
            </a>
            <div class="dropdown-menu">
              ${childrenHtml}
            </div>
          </li>`;
      }

      return `
        <li class="nav-item ${aktif}">
          <a href="${itemUrl}" class="nav-link">${item.label}</a>
        </li>`;
    }).join('');

    const html = `
      <nav class="navbar" id="main-navbar">
        <div class="navbar-inner">
          <div class="navbar-top">
            <a href="${inPages ? '../index.html' : 'index.html'}" class="navbar-brand">
              <img src="${logoSrc}" alt="${config.site.nama}" class="navbar-logo"
                onerror="this.style.display='none';document.querySelector('.navbar-nama').style.display='block'">
              <span class="navbar-nama" style="display:none">${config.site.nama}</span>
            </a>
            <button class="hamburger" id="hamburger" aria-label="Buka menu">
              <span></span><span></span><span></span>
            </button>
          </div>
          <div class="navbar-bottom">
            <ul class="nav-list" id="nav-list">
              ${itemsHtml}
            </ul>
          </div>
        </div>
      </nav>`;

    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;

    this._bindEvents();
  },


  _bindEvents() {
    // Hamburger toggle untuk mobile
    // nav-list ada di dalam navbar-bottom (display:none di mobile)
    // Saat open: posisikan nav-list secara absolut di luar navbar-bottom
    const btn    = document.getElementById('hamburger');
    const list   = document.getElementById('nav-list');
    const bottom = document.querySelector('.navbar-bottom');
    if (btn && list) {
      btn.addEventListener('click', () => {
        const isOpen = list.classList.toggle('open');
        btn.classList.toggle('open');
        // Di mobile, tampilkan/sembunyikan navbar-bottom hanya saat menu terbuka
        if (bottom && window.innerWidth <= 768) {
          bottom.style.display = isOpen ? 'block' : 'none';
        }
      });
    }

    // Dropdown: hover di desktop, klik di mobile
    document.querySelectorAll('.has-dropdown').forEach(item => {
      let closeTimer;

      item.addEventListener('mouseenter', () => {
        if (window.innerWidth > 768) {
          clearTimeout(closeTimer);
          item.classList.add('show');
        }
      });
      item.addEventListener('mouseleave', () => {
        if (window.innerWidth > 768) {
          closeTimer = setTimeout(() => item.classList.remove('show'), 150);
        }
      });
      item.querySelector('.nav-link')?.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          item.classList.toggle('show');
        }
      });
    });
  }
};

export default Navbar;

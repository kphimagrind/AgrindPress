// app/components/footer.js

import DataLoader from '../core/dataLoader.js';
import CONFIG    from '../core/config.js';

const Footer = {
  async render(containerId = 'footer') {
    const config = await DataLoader.loadJSON('config.json');
    if (!config) return;
    const { site } = config;

    const base    = CONFIG.baseUrl;
    const logoSrc = base + 'assets/img/logo-putih.jpg';

    const html = `
      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <a href="${base}index.html">
              <img src="${logoSrc}" alt="${site.nama}" class="footer-logo"
                onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
              <span class="footer-nama" style="display:none">${site.nama}</span>
            </a>
            <p class="footer-tagline">${site.tagline}</p>
            <p class="footer-org">${site.organisasi}</p>
          </div>
          <div class="footer-links">
            <a href="${base}pages/tentang.html">Tentang</a>
            <a href="${base}pages/kirim-tulisan.html">Kirim Tulisan</a>
            <a href="${base}pages/kirim-pesan.html">Kotak Aspirasi</a>
            <a href="${base}pages/search.html">Pencarian</a>
          </div>
          <div class="footer-kontak">
            <span>Kontak:</span>
            <a href="mailto:${site.email_kontak}">${site.email_kontak}</a>
          </div>
        </div>
        <div class="footer-copy">
          &copy; ${site.tahun} ${site.nama} &mdash; ${site.singkatan}
        </div>
      </footer>`;

    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;
  }
};

export default Footer;

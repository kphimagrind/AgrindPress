// app/components/banner.js
import { supabase } from '../core/supabase.js';

const CLOUD_BASE = 'https://himagrind.github.io/cloud/'; // url repo cloud HIMAGRIND

const PAGE_LAYOUT = {
  home: {
    top: ['banner-top'],
    middle: ['banner-middle-1', 'banner-middle-2', 'banner-middle-3'],
    small: ['banner-small-1', 'banner-small-2']
  },
  artikel: {
    top: ['banner-top'],
    middle: ['banner-middle-1', 'banner-middle-2', 'banner-middle-3', 'banner-middle-4'],
    small: ['banner-small-1', 'banner-small-2']
  },
  default: {
    top: ['banner-top'],
    middle: [],
    small: []
  }
};

let bannerCache = null;

function getPageKey() {
  const path = window.location.pathname.replace(/\/+/g, '/');

  if (path === '/' || path.endsWith('/index.html')) return 'home';
  if (path.includes('/pages/artikel.html')) return 'artikel';
  if (path.includes('/pages/kategori.html')) return 'kategori';
  if (path.includes('/pages/search.html')) return 'search';
  if (path.includes('/pages/tentang.html')) return 'tentang';
  if (path.includes('/pages/kirim-pesan.html')) return 'kirim-pesan';
  if (path.includes('/pages/kirim-tulisan.html')) return 'kirim-tulisan';
  if (path.includes('/pages/pengin-cerita.html')) return 'pengin-cerita';
  return 'all';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveUrl(path = '') {
  const raw = String(path).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${CLOUD_BASE.replace(/\/+$/, '/')}${raw.replace(/^\/+/, '')}`;
}

function mimeFromPath(path = '') {
  const ext = String(path).split('.').pop().toLowerCase();
  if (ext === 'webm') return 'video/webm';
  if (ext === 'ogg' || ext === 'ogv') return 'video/ogg';
  return 'video/mp4';
}

async function loadBanners() {
  if (bannerCache) return bannerCache;

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('[Banner]', error);
    bannerCache = [];
    return bannerCache;
  }

  bannerCache = (data || []).sort((a, b) => {
    const ao = Number(a.sort_order ?? 0);
    const bo = Number(b.sort_order ?? 0);
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return bannerCache;
}

function matchesPage(targetPage, pageKey) {
  const value = String(targetPage || 'all').trim().toLowerCase();
  return value === 'all' || value === pageKey;
}

function getLayout(pageKey) {
  return PAGE_LAYOUT[pageKey] || PAGE_LAYOUT.default;
}

function getBannersForSlot(rows, slot, pageKey) {
  return rows.filter((row) =>
    String(row.slot || '').trim().toLowerCase() === slot &&
    matchesPage(row.target_page, pageKey)
  );
}

function renderBannerToElement(el, banner, slotName) {
  const src = resolveUrl(banner.media_path);
  const alt = banner.alt_text || banner.title || 'Banner';
  const isHttpLink = /^https?:\/\//i.test(String(banner.link_url || ''));
  const openNew = banner.open_in_new_tab !== false && isHttpLink;

  const linkOpen = banner.link_url
    ? `<a class="banner-link" href="${escapeHtml(banner.link_url)}"${openNew ? ' target="_blank" rel="noopener noreferrer"' : ''}>`
    : '';

  const linkClose = banner.link_url ? '</a>' : '';

  const media = banner.media_type === 'video'
    ? `
      <video class="banner-media banner-media--video" autoplay muted loop playsinline preload="metadata">
        <source src="${escapeHtml(src)}" type="${mimeFromPath(src)}">
      </video>`
    : `
      <img
        class="banner-media banner-media--image"
        src="${escapeHtml(src)}"
        alt="${escapeHtml(alt)}"
        loading="lazy"
        decoding="async"
      >`;

  el.hidden = false;
  el.innerHTML = `
    <section class="banner-shell banner-shell--${slotName}">
      ${linkOpen}
        ${media}
      ${linkClose}
    </section>
  `;
}

function renderSlotGroup(slotIds, banners, slotName) {
  slotIds.forEach((slotId, index) => {
    const el = document.getElementById(slotId);
    if (!el) return;

    const banner = banners[index] || null;

    if (!banner) {
      el.innerHTML = '';
      el.hidden = slotName !== 'top';
      return;
    }

    renderBannerToElement(el, banner, slotName);
  });
}

const Banner = {
  async render() {
    const rows = await loadBanners();
    const pageKey = getPageKey();
    const layout = getLayout(pageKey);

    renderSlotGroup(layout.top, getBannersForSlot(rows, 'top', pageKey), 'top');
    renderSlotGroup(layout.middle, getBannersForSlot(rows, 'middle', pageKey), 'middle');
    renderSlotGroup(layout.small, getBannersForSlot(rows, 'small', pageKey), 'small');
  }
};

export default Banner;

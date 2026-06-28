import { supabase } from '../../app/core/supabase.js';
import { requireSession, logout, formatDate, typeLabel, typeBadgeClass, deleteArticleImages } from './shared.js';

const statsEl = document.getElementById('stats');

const postsTableBody = document.getElementById('postsTableBody');
const bannersTableBody = document.getElementById('bannersTableBody');

const searchPosts = document.getElementById('searchPosts');
const searchBanners = document.getElementById('searchBanners');

const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

const countPosts = document.getElementById('countPosts');
const countGallery = document.getElementById('countGallery');
const countBanners = document.getElementById('countBanners');

let allPosts = [];
let allBanners = [];

function escapeHtml(input = '') {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bannerSlotLabel(slot = '') {
  const value = String(slot || '').toLowerCase();
  if (value === 'top') return 'Top';
  if (value === 'middle') return 'Middle';
  if (value === 'small') return 'Small';
  return value || '-';
}

function bannerPageLabel(page = '') {
  const value = String(page || 'all').toLowerCase();
  const labels = {
    all: 'Semua',
    home: 'Beranda',
    artikel: 'Artikel',
    kategori: 'Kategori',
    search: 'Cari',
    tentang: 'Tentang',
    'kirim-pesan': 'Kirim Pesan',
    'kirim-tulisan': 'Kirim Tulisan',
    'pengin-cerita': 'Pengin Cerita'
  };
  return labels[value] || value || '-';
}

function bannerMediaLabel(type = '') {
  const value = String(type || '').toLowerCase();
  if (value === 'image') return 'Gambar';
  if (value === 'gif') return 'GIF';
  if (value === 'video') return 'Video';
  return value || '-';
}

function renderStats(posts) {
  const total = posts.length;
  const gallery = posts.filter(p => p.is_gallery || p.sub === 'galeri-mahasiswa').length;
  const articles = total - gallery;

  countPosts.textContent = total;
  countGallery.textContent = gallery;

  statsEl.innerHTML = `
    <div class="card stat"><div class="label">Total Konten</div><div class="value">${total}</div></div>
    <div class="card stat"><div class="label">Artikel</div><div class="value">${articles}</div></div>
    <div class="card stat"><div class="label">Galeri</div><div class="value">${gallery}</div></div>
    <div class="card stat"><div class="label">Terakhir Sync</div><div class="value" style="font-size:1rem">${new Date().toLocaleTimeString('id-ID')}</div></div>
  `;
}

function renderPostRows(posts) {
  if (!posts.length) {
    postsTableBody.innerHTML = `
      <tr><td colspan="6" style="color:#6b7280">Belum ada konten.</td></tr>
    `;
    return;
  }

  postsTableBody.innerHTML = posts.map(post => `
    <tr>
      <td><code>${escapeHtml(post.id)}</code></td>
      <td>
        <div style="font-weight:700">${escapeHtml(post.judul || '-')}</div>
        <div style="color:#6b7280;font-size:.9rem">${escapeHtml(post.ringkasan || '')}</div>
      </td>
      <td><span class="badge ${typeBadgeClass(post)}">${typeLabel(post)}</span></td>
      <td>${escapeHtml(post.sub || '-')}</td>
      <td>${escapeHtml(formatDate(post.tanggal || post.created_at))}</td>
      <td>
        <div class="actions">
          <button class="btn small ghost" data-action="edit" data-id="${escapeHtml(post.id)}">Edit</button>
          <button class="btn small danger" data-action="delete" data-id="${escapeHtml(post.id)}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterPosts() {
  const q = (searchPosts?.value || '').toLowerCase().trim();

  const filtered = !q ? allPosts : allPosts.filter(post => {
    const haystack = [
      post.id,
      post.judul,
      post.kategori,
      post.sub,
      post.penulis,
      post.ringkasan
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  renderPostRows(filtered);
}

async function loadPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    postsTableBody.innerHTML = `<tr><td colspan="6" class="error">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  allPosts = data || [];
  renderStats(allPosts);
  filterPosts();
}

function renderBannerRows(banners) {
  if (!banners.length) {
    if (bannersTableBody) {
      bannersTableBody.innerHTML = `
        <tr><td colspan="7" style="color:#6b7280">Belum ada banner.</td></tr>
      `;
    }
    if (countBanners) countBanners.textContent = '0';
    return;
  }

  if (countBanners) countBanners.textContent = String(banners.length);

  if (!bannersTableBody) return;

  bannersTableBody.innerHTML = banners.map(banner => {
    const active = banner.is_active !== false;
    const statusStyle = active
      ? 'border-color:#86efac;color:#166534;'
      : 'border-color:#fca5a5;color:#b91c1c;';
    return `
      <tr>
        <td><code>${escapeHtml(banner.id)}</code></td>
        <td>
          <div style="font-weight:700">${escapeHtml(banner.title || '-')}</div>
          <div style="color:#6b7280;font-size:.9rem">${escapeHtml(banner.media_path || '')}</div>
        </td>
        <td><span class="badge">${escapeHtml(bannerSlotLabel(banner.slot))}</span></td>
        <td>${escapeHtml(bannerPageLabel(banner.target_page))}</td>
        <td>${escapeHtml(bannerMediaLabel(banner.media_type))}</td>
        <td><span class="badge" style="${statusStyle}">${active ? 'Aktif' : 'Nonaktif'}</span></td>
        <td>
          <div class="actions">
            <button class="btn small ghost" data-action="edit-banner" data-id="${escapeHtml(banner.id)}">Edit</button>
            <button class="btn small danger" data-action="delete-banner" data-id="${escapeHtml(banner.id)}">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterBanners() {
  const q = (searchBanners?.value || '').toLowerCase().trim();

  const filtered = !q ? allBanners : allBanners.filter(banner => {
    const haystack = [
      banner.id,
      banner.title,
      banner.slot,
      banner.target_page,
      banner.media_type,
      banner.media_path,
      banner.link_url,
      banner.alt_text
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  renderBannerRows(filtered);
}

async function loadBanners() {
  if (!bannersTableBody) return;

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    bannersTableBody.innerHTML = `<tr><td colspan="7" class="error">${escapeHtml(error.message)}</td></tr>`;
    if (countBanners) countBanners.textContent = '0';
    return;
  }

  allBanners = data || [];
  filterBanners();
}

async function handlePostsTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const post = allPosts.find(p => p.id === id);

  if (!post) return;

  if (action === 'edit') {
    const isGallery = post.is_gallery || post.sub === 'galeri-mahasiswa';
    location.href = isGallery
      ? `./galeri-form.html?id=${encodeURIComponent(id)}`
      : `./post-form.html?id=${encodeURIComponent(id)}`;
    return;
  }

  if (action === 'delete') {
    const ok = confirm(`Hapus "${post.judul}"?`);
    if (!ok) return;

    try {
      await deleteArticleImages(id);
    } catch (imageError) {
      console.warn('[dashboard deleteArticleImages]', imageError);
    }

    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }

    await loadPosts();
    await loadBanners();
  }
}

async function handleBannersTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const banner = allBanners.find(item => item.id === id);

  if (!banner) return;

  if (action === 'edit-banner') {
    location.href = `./banner-form.html?id=${encodeURIComponent(id)}`;
    return;
  }

  if (action === 'delete-banner') {
    const ok = confirm(`Hapus banner "${banner.title || banner.id}"?`);
    if (!ok) return;

    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }

    await loadBanners();
  }
}

async function loadDashboard() {
  await Promise.all([
    loadPosts(),
    loadBanners()
  ]);
}

async function init() {
  const session = await requireSession();
  if (!session) return;

  const userEmail = session.user?.email || '-';
  document.getElementById('currentUser').textContent = userEmail;

  await loadDashboard();

  searchPosts?.addEventListener('input', filterPosts);
  searchBanners?.addEventListener('input', filterBanners);
  refreshBtn?.addEventListener('click', loadDashboard);
  logoutBtn?.addEventListener('click', logout);
  postsTableBody?.addEventListener('click', handlePostsTableClick);
  bannersTableBody?.addEventListener('click', handleBannersTableClick);
}

init();
      

import { supabase } from '../../app/core/supabase.js';
import { requireSession, logout, formatDate, typeLabel, typeBadgeClass, deleteArticleImages } from './shared.js';

const statsEl = document.getElementById('stats');
const tableBody = document.getElementById('postsTableBody');
const searchInput = document.getElementById('searchPosts');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');
const countPosts = document.getElementById('countPosts');
const countGallery = document.getElementById('countGallery');

let allPosts = [];

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

function renderRows(posts) {
  if (!posts.length) {
    tableBody.innerHTML = `
      <tr><td colspan="6" style="color:#6b7280">Belum ada konten.</td></tr>
    `;
    return;
  }

  tableBody.innerHTML = posts.map(post => `
    <tr>
      <td><code>${post.id}</code></td>
      <td>
        <div style="font-weight:700">${post.judul || '-'}</div>
        <div style="color:#6b7280;font-size:.9rem">${post.ringkasan || ''}</div>
      </td>
      <td><span class="badge ${typeBadgeClass(post)}">${typeLabel(post)}</span></td>
      <td>${post.sub || '-'}</td>
      <td>${formatDate(post.tanggal || post.created_at)}</td>
      <td>
        <div class="actions">
          <button class="btn small ghost" data-action="edit" data-id="${post.id}">Edit</button>
          <button class="btn small danger" data-action="delete" data-id="${post.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterPosts() {
  const q = (searchInput.value || '').toLowerCase().trim();
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
  renderRows(filtered);
}

async function loadPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="6" class="error">${error.message}</td></tr>`;
    return;
  }

  allPosts = data || [];
  renderStats(allPosts);
  filterPosts();
}

async function handleTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const post = allPosts.find(p => p.id === id);

  if (!post) return;

  if (action === 'edit') {
    const isGallery = post.is_gallery || post.sub === 'galeri-mahasiswa';
    location.href = isGallery ? `./galeri-form.html?id=${encodeURIComponent(id)}` : `./post-form.html?id=${encodeURIComponent(id)}`;
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
  }
}

async function init() {
  const session = await requireSession();
  if (!session) return;

  const userEmail = session.user?.email || '-';
  document.getElementById('currentUser').textContent = userEmail;

  await loadPosts();

  searchInput.addEventListener('input', filterPosts);
  refreshBtn.addEventListener('click', loadPosts);
  logoutBtn.addEventListener('click', logout);
  tableBody.addEventListener('click', handleTableClick);
}

init();

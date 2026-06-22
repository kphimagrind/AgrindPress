import { supabase } from '../../app/core/supabase.js';
import {
  requireSession,
  logout,
  dateISO,
  makeId,
  getFilesFromInput,
  uploadPublicFile,
  fetchPostById
} from './shared.js';

const form = document.getElementById('galleryForm');
const titleEl = document.getElementById('title');
const authorEl = document.getElementById('author');
const dateEl = document.getElementById('date');
const excerptEl = document.getElementById('excerpt');
const filesEl = document.getElementById('photos');
const message = document.getElementById('formMessage');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const preview = document.getElementById('photosPreview');
const postIdEl = document.getElementById('postId');

let editingId = new URLSearchParams(location.search).get('id') || '';
let currentImages = [];

function showMessage(text, type = 'notice') {
  message.className = type;
  message.textContent = text;
  message.classList.remove('hidden');
}

function renderPreview(urls = []) {
  if (!urls.length) {
    preview.innerHTML = '<span style="color:#6b7280">Belum ada foto</span>';
    return;
  }
  preview.innerHTML = urls.map(url => `<img src="${url}" alt="preview">`).join('');
}

async function loadExisting() {
  if (!editingId) {
    postIdEl.textContent = 'Baru';
    renderPreview([]);
    return;
  }

  const { data: post, error } = await fetchPostById(editingId);
  if (error) {
    showMessage(error.message, 'error');
    return;
  }
  if (!post) {
    showMessage('Galeri tidak ditemukan.', 'error');
    return;
  }

  postIdEl.textContent = post.id;
  titleEl.value = post.judul || '';
  authorEl.value = post.penulis || '';
  dateEl.value = post.tanggal || dateISO();
  excerptEl.value = post.ringkasan || '';

  const { data: images, error: imgErr } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('post_id', editingId)
    .order('sort_order', { ascending: true });

  if (imgErr) {
    console.warn(imgErr);
    currentImages = [];
  } else {
    currentImages = images || [];
  }

  renderPreview(currentImages.map(i => i.image_url));
}

document.getElementById('logoutBtn').addEventListener('click', logout);

filesEl.addEventListener('change', () => {
  const files = getFilesFromInput(filesEl);
  renderPreview(files.map(f => URL.createObjectURL(f)));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = titleEl.value.trim();
  const author = authorEl.value.trim();
  const date = dateEl.value || dateISO();
  const excerpt = excerptEl.value.trim();
  const files = getFilesFromInput(filesEl);

  if (!title || !author) {
    showMessage('Judul dan penulis wajib diisi.', 'error');
    return;
  }

  if (!editingId && !files.length) {
    showMessage('Pilih minimal satu foto.', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Menyimpan...';

  try {
    const postId = editingId || makeId(title);
    const uploadedUrls = [];

    if (files.length) {
      for (const file of files) {
        const url = await uploadPublicFile('gallery', `gallery/${postId}`, file);
        uploadedUrls.push(url);
      }
    }

    const thumbnail = uploadedUrls[0] || currentImages[0]?.image_url || '';

    const payload = {
      id: postId,
      judul: title,
      kategori: 'artikel',
      sub: 'galeri-mahasiswa',
      penulis: author,
      tanggal: date,
      estimasi_baca: 3,
      thumbnail,
      ringkasan: excerpt,
      content_html: `<p>${excerpt || title}</p>`,
      is_gallery: true
    };

    const { error } = await supabase
      .from('posts')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;

    if (uploadedUrls.length) {
      const rows = uploadedUrls.map((url, index) => ({
        post_id: postId,
        image_url: url,
        caption: excerpt || title,
        sort_order: currentImages.length + index + 1
      }));

      const { error: imgErr } = await supabase.from('gallery_images').insert(rows);
      if (imgErr) throw imgErr;
    }

    showMessage('Galeri berhasil disimpan.', 'notice');
    setTimeout(() => location.href = './dashboard.html', 700);
  } catch (err) {
    showMessage(err.message || 'Gagal menyimpan galeri.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
  }
});

deleteBtn.addEventListener('click', async () => {
  if (!editingId) return;
  const ok = confirm('Hapus galeri ini? Foto-foto terkait juga akan ikut terhapus.');
  if (!ok) return;

  const { error } = await supabase.from('posts').delete().eq('id', editingId);
  if (error) {
    alert(error.message);
    return;
  }
  location.href = './dashboard.html';
});

async function init() {
  const session = await requireSession();
  if (!session) return;

  document.getElementById('currentUser').textContent = session.user?.email || '-';
  dateEl.value = dateISO();
  await loadExisting();
}

init();

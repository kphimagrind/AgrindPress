import { supabase } from '../../app/core/supabase.js';
import { requireSession, logout } from './shared.js';

const form = document.getElementById('bannerForm');
const bannerIdEl = document.getElementById('bannerId');
const titleEl = document.getElementById('title');
const slotEl = document.getElementById('slot');
const targetPageEl = document.getElementById('target_page');
const mediaTypeEl = document.getElementById('media_type');
const mediaPathEl = document.getElementById('media_path');
const linkUrlEl = document.getElementById('link_url');
const altTextEl = document.getElementById('alt_text');
const sortOrderEl = document.getElementById('sort_order');
const openInNewTabEl = document.getElementById('open_in_new_tab');
const activeEl = document.getElementById('is_active');
const messageEl = document.getElementById('formMessage');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const logoutBtn = document.getElementById('logoutBtn');

let editingId = new URLSearchParams(location.search).get('id') || '';

function showMessage(text, type = 'notice') {
  if (!messageEl) return;
  messageEl.className = type;
  messageEl.textContent = text;
  messageEl.classList.remove('hidden');
}

function setSavingState(isSaving) {
  if (!saveBtn) return;
  saveBtn.disabled = !!isSaving;
  saveBtn.textContent = isSaving ? 'Menyimpan...' : 'Simpan';
}

function setDeleteState() {
  if (!deleteBtn) return;
  deleteBtn.disabled = !editingId;
  deleteBtn.title = editingId ? '' : 'Simpan banner baru terlebih dahulu';
}

function resetFormDefaults() {
  if (bannerIdEl) bannerIdEl.textContent = 'Baru';
  if (titleEl) titleEl.value = '';
  if (slotEl) slotEl.value = 'top';
  if (targetPageEl) targetPageEl.value = 'all';
  if (mediaTypeEl) mediaTypeEl.value = 'image';
  if (mediaPathEl) mediaPathEl.value = '';
  if (linkUrlEl) linkUrlEl.value = '';
  if (altTextEl) altTextEl.value = '';
  if (sortOrderEl) sortOrderEl.value = '0';
  if (openInNewTabEl) openInNewTabEl.checked = true;
  if (activeEl) activeEl.checked = true;
}

async function loadExisting() {
  if (!editingId) {
    resetFormDefaults();
    setDeleteState();
    return;
  }

  const { data: banner, error } = await supabase
    .from('banners')
    .select('*')
    .eq('id', editingId)
    .single();

  if (error) {
    showMessage(error.message || 'Banner tidak ditemukan.', 'error');
    setDeleteState();
    return;
  }

  if (!banner) {
    showMessage('Banner tidak ditemukan.', 'error');
    setDeleteState();
    return;
  }

  if (bannerIdEl) bannerIdEl.textContent = banner.id || 'Baru';
  if (titleEl) titleEl.value = banner.title || '';
  if (slotEl) slotEl.value = banner.slot || 'top';
  if (targetPageEl) targetPageEl.value = banner.target_page || 'all';
  if (mediaTypeEl) mediaTypeEl.value = banner.media_type || 'image';
  if (mediaPathEl) mediaPathEl.value = banner.media_path || '';
  if (linkUrlEl) linkUrlEl.value = banner.link_url || '';
  if (altTextEl) altTextEl.value = banner.alt_text || '';
  if (sortOrderEl) sortOrderEl.value = String(banner.sort_order ?? 0);
  if (openInNewTabEl) openInNewTabEl.checked = banner.open_in_new_tab !== false;
  if (activeEl) activeEl.checked = banner.is_active !== false;

  setDeleteState();
}

async function handleSubmit(event) {
  event.preventDefault();

  const title = titleEl.value.trim();
  const slot = slotEl.value;
  const targetPage = targetPageEl.value;
  const mediaType = mediaTypeEl.value;
  const mediaPath = mediaPathEl.value.trim();
  const linkUrl = linkUrlEl.value.trim();
  const altText = altTextEl.value.trim();
  const sortOrder = Number(sortOrderEl.value || 0) || 0;
  const openInNewTab = openInNewTabEl.checked;
  const isActive = activeEl.checked;

  if (!title || !mediaPath) {
    showMessage('Judul dan media path wajib diisi.', 'error');
    return;
  }

  setSavingState(true);

  try {
    const payload = {
      title,
      slot,
      target_page: targetPage,
      media_type: mediaType,
      media_path: mediaPath,
      link_url: linkUrl || null,
      alt_text: altText || null,
      open_in_new_tab: openInNewTab,
      is_active: isActive,
      sort_order: sortOrder
    };

    if (editingId) {
      const { error } = await supabase
        .from('banners')
        .update(payload)
        .eq('id', editingId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('banners')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;

      editingId = data?.id || '';
      if (bannerIdEl && editingId) bannerIdEl.textContent = editingId;
    }

    showMessage('Banner berhasil disimpan.', 'notice');
    setDeleteState();

    setTimeout(() => {
      location.href = './dashboard.html';
    }, 700);
  } catch (error) {
    showMessage(error?.message || 'Gagal menyimpan banner.', 'error');
  } finally {
    setSavingState(false);
  }
}

async function handleDelete() {
  if (!editingId) return;

  const ok = confirm('Hapus banner ini?');
  if (!ok) return;

  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', editingId);

  if (error) {
    showMessage(error.message || 'Gagal menghapus banner.', 'error');
    return;
  }

  location.href = './dashboard.html';
}

async function init() {
  const session = await requireSession();
  if (!session) return;

  if (document.getElementById('currentUser')) {
    document.getElementById('currentUser').textContent = session.user?.email || '-';
  }

  setDeleteState();
  await loadExisting();

  logoutBtn?.addEventListener('click', logout);
  form?.addEventListener('submit', handleSubmit);
  deleteBtn?.addEventListener('click', handleDelete);
}

init();
    

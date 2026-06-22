import { supabase } from '../../app/core/supabase.js';

export const BUCKET_COVERS = 'covers';
export const BUCKET_GALLERY = 'gallery';
export const BUCKET_ARTICLE_IMAGES = 'article-images';

export const SUB_OPTIONS = {
  artikel: [
    { value: 'opini', label: 'Opini' },
    { value: 'cerpen', label: 'Cerpen' },
    { value: 'pengin-cerita', label: 'Pengin Cerita' },
    { value: 'galeri-mahasiswa', label: 'Galeri Mahasiswa' }
  ],
  informasi: [
    { value: 'perkuliahan', label: 'Perkuliahan' },
    { value: 'kegiatan', label: 'Kegiatan' },
    { value: 'organisasi', label: 'Organisasi' }
  ]
};

export function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
}

export function makeId(title = '') {
  return `${slugify(title)}-${Date.now().toString(36)}`;
}

export function dateISO(value = new Date()) {
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
}

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function typeLabel(post) {
  if (post?.is_gallery || post?.sub === 'galeri-mahasiswa') return 'Galeri';
  if (post?.kategori === 'informasi') return 'Informasi';
  return 'Artikel';
}

export function typeBadgeClass(post) {
  if (post?.is_gallery || post?.sub === 'galeri-mahasiswa') return 'gallery';
  if (post?.kategori === 'informasi') return 'info';
  return 'article';
}

export function renderSubOptions(category, current = '') {
  const options = SUB_OPTIONS[category] || [];
  const placeholder = `<option value="">Pilih subkategori</option>`;
  return [placeholder, ...options.map(opt => (
    `<option value="${opt.value}" ${opt.value === current ? 'selected' : ''}>${opt.label}</option>`
  ))].join('');
}

export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.href = './login.html';
    return null;
  }
  return session;
}

export async function logout() {
  await supabase.auth.signOut();
  location.href = './login.html';
}

function buildUploadPayload(file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  return {
    safeName,
    path: ''
  };
}

async function uploadStorageObject(bucket, folder, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || undefined
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    publicUrl: data.publicUrl,
    path
  };
}

export async function uploadPublicFile(bucket, folder, file) {
  const { publicUrl } = await uploadStorageObject(bucket, folder, file);
  return publicUrl;
}

export async function uploadPublicFileDetailed(bucket, folder, file) {
  return await uploadStorageObject(bucket, folder, file);
}

export async function uploadBodyImage(file, articleKey) {
  return await uploadStorageObject(BUCKET_ARTICLE_IMAGES, `articles/${articleKey}`, file);
}

export function getFileFromInput(inputEl) {
  if (!inputEl || !inputEl.files || !inputEl.files[0]) return null;
  return inputEl.files[0];
}

export function getFilesFromInput(inputEl) {
  if (!inputEl || !inputEl.files) return [];
  return Array.from(inputEl.files);
}

export async function fetchPostById(id) {
  return await supabase.from('posts').select('*').eq('id', id).single();
}

export async function fetchEditorPick(id) {
  return await supabase.from('editor_picks').select('*').eq('post_id', id).maybeSingle();
}

export async function fetchArticleImagesByPostId(postId) {
  return await supabase
    .from('article_images')
    .select('*')
    .eq('post_id', postId)
    .order('sort_order', { ascending: true });
}

export async function saveTags(postId, tagsText = '') {
  const tags = String(tagsText)
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  await supabase.from('post_tags').delete().eq('post_id', postId);

  if (!tags.length) return;

  const rows = tags.map(tag => ({ post_id: postId, tag }));
  const { error } = await supabase.from('post_tags').insert(rows);
  if (error) throw error;
}

export async function saveEditorPick(postId, checked, note = '') {
  await supabase.from('editor_picks').delete().eq('post_id', postId);

  if (!checked) return;

  const { error } = await supabase.from('editor_picks').insert({
    post_id: postId,
    catatan: note || null,
    sort_order: 0
  });
  if (error) throw error;
}

export async function saveArticleImage({
  postId,
  imageUrl,
  imagePath,
  altText = '',
  creditText = '',
  sortOrder = 0
}) {
  const { error } = await supabase.from('article_images').insert({
    post_id: postId,
    bucket_name: BUCKET_ARTICLE_IMAGES,
    image_url: imageUrl,
    image_path: imagePath,
    alt_text: altText || null,
    credit_text: creditText || null,
    sort_order: sortOrder
  });

  if (error) throw error;
}

export async function syncArticleImagesPostId(fromPostId, toPostId) {
  if (!fromPostId || !toPostId || fromPostId === toPostId) return;

  const { error } = await supabase
    .from('article_images')
    .update({ post_id: toPostId })
    .eq('post_id', fromPostId);

  if (error) throw error;
}

export async function deleteArticleImages(postId) {
  const { data, error } = await fetchArticleImagesByPostId(postId);
  if (error) throw error;

  const rows = data || [];
  const paths = rows.map(row => row.image_path).filter(Boolean);

  if (paths.length) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET_ARTICLE_IMAGES)
      .remove(paths);

    if (removeError) {
      console.warn('[deleteArticleImages]', removeError);
    }
  }

  const { error: deleteError } = await supabase
    .from('article_images')
    .delete()
    .eq('post_id', postId);

  if (deleteError) throw deleteError;
}

export function toPostPayload(form) {
  const fd = new FormData(form);
  return {
    title: String(fd.get('title') || '').trim(),
    category: String(fd.get('category') || 'artikel'),
    sub: String(fd.get('sub') || '').trim(),
    author: String(fd.get('author') || '').trim(),
    date: String(fd.get('date') || dateISO()),
    readTime: Number(fd.get('read_time') || 0) || null,
    excerpt: String(fd.get('excerpt') || '').trim(),
    contentHtml: String(fd.get('content_html') || '').trim(),
    tags: String(fd.get('tags') || '').trim(),
    editorPick: fd.get('editor_pick') === 'on',
    editorPickNote: String(fd.get('editor_pick_note') || '').trim()
  };
}

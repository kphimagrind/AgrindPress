import { supabase } from '../../app/core/supabase.js';
import {
  deleteArticleImages,
  dateISO,
  fetchArticleImagesByPostId,
  fetchEditorPick,
  fetchPostById,
  getFileFromInput,
  logout,
  makeId,
  requireSession,
  renderSubOptions,
  saveArticleImage,
  saveEditorPick,
  saveTags,
  syncArticleImagesPostId,
  uploadBodyImage,
  uploadPublicFile
} from './shared.js';

const Quill = window.Quill;
if (!Quill) {
  console.error('Quill CDN gagal dimuat. Editor tidak dapat berjalan.');
}

const form = document.getElementById('postForm');
const titleEl = document.getElementById('title');
const categoryEl = document.getElementById('category');
const subEl = document.getElementById('sub');
const contentEl = document.getElementById('content_html');
const editorEl = document.getElementById('editor');
const editorToolbar = document.getElementById('editorToolbar');
const articlePreviewEl = document.getElementById('articlePreview');
const imageModal = document.getElementById('imageModal');
const imageForm = document.getElementById('imageForm');
const imageFileEl = document.getElementById('imageFile');
const imageFilePreviewEl = document.getElementById('imageFilePreview');
const imageModalMessageEl = document.getElementById('imageModalMessage');
const imageCancelBtn = document.getElementById('imageCancel');
const thumbnailInput = document.getElementById('thumbnail');
const thumbnailPreviewEl = document.getElementById('thumbnailPreview');
const messageEl = document.getElementById('formMessage');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const editorPickEl = document.getElementById('editor_pick');
const editorPickNoteEl = document.getElementById('editor_pick_note');
const postIdEl = document.getElementById('postId');

const BLOCK_BUTTONS = {
  p: editorToolbar?.querySelector('[data-action="p"]'),
  neutral: editorToolbar?.querySelector('[data-action="neutral"]'),
  kredit: editorToolbar?.querySelector('[data-action="kredit"]'),
  h2: editorToolbar?.querySelector('[data-action="h2"]'),
  h3: editorToolbar?.querySelector('[data-action="h3"]'),
  quote: editorToolbar?.querySelector('[data-action="quote"]'),
  small: editorToolbar?.querySelector('[data-action="small"]'),
  ol: editorToolbar?.querySelector('[data-action="ol"]'),
  ul: editorToolbar?.querySelector('[data-action="ul"]'),
  bold: editorToolbar?.querySelector('[data-action="bold"]'),
  link: editorToolbar?.querySelector('[data-action="link"]'),
  hr: editorToolbar?.querySelector('[data-action="hr"]'),
  img: editorToolbar?.querySelector('[data-action="img"]')
};

let editor = null;
let editingId = new URLSearchParams(location.search).get('id') || '';
let currentThumbnail = '';
let bodyImageSessionKey = editingId || `draft-${Date.now().toString(36)}`;
let selectedImageFile = null;
let selectedImageObjectUrl = '';
let thumbnailObjectUrl = '';

function shieldTextFieldFocus() {
  const focusTargets = form?.querySelectorAll('input, select, textarea');

  focusTargets?.forEach((el) => {
    el.addEventListener('focus', () => {
      if (editor?.hasFocus?.()) {
        editor.blur();
      }
    });
  });

  form?.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('input, select, textarea')) return;

    if (editor?.hasFocus?.()) {
      editor.blur();
    }
  });
}

const Block = Quill ? Quill.import('blots/block') : null;
const BlockEmbed = Quill ? Quill.import('blots/block/embed') : null;

function escapeHtml(input = '') {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(input = '') {
  return escapeHtml(input);
}

function showMessage(text, type = 'notice') {
  if (!messageEl) return;
  messageEl.className = type;
  messageEl.textContent = text;
  messageEl.classList.remove('hidden');
}

function setSubOptions() {
  const current = subEl.value || '';
  subEl.innerHTML = renderSubOptions(categoryEl.value, current);
}

function updateThumbnailPreview(url, isObjectUrl = false) {
  if (!thumbnailPreviewEl) return;

  if (!url) {
    if (thumbnailObjectUrl) {
      URL.revokeObjectURL(thumbnailObjectUrl);
      thumbnailObjectUrl = '';
    }
    thumbnailPreviewEl.innerHTML = '<span style="color:#6b7280">Belum ada thumbnail</span>';
    return;
  }

  if (isObjectUrl) {
    if (thumbnailObjectUrl && thumbnailObjectUrl !== url) {
      URL.revokeObjectURL(thumbnailObjectUrl);
    }
    thumbnailObjectUrl = url;
  } else if (thumbnailObjectUrl) {
    URL.revokeObjectURL(thumbnailObjectUrl);
    thumbnailObjectUrl = '';
  }

  thumbnailPreviewEl.innerHTML = `<img src="${url}" alt="thumbnail preview">`;
}

function setImageModalMessage(text = '', type = 'notice') {
  if (!imageModalMessageEl) return;
  if (!text) {
    imageModalMessageEl.textContent = '';
    imageModalMessageEl.className = 'notice hidden';
    return;
  }

  imageModalMessageEl.className = type;
  imageModalMessageEl.textContent = text;
  imageModalMessageEl.classList.remove('hidden');
}

function clearSelectedImagePreview() {
  if (selectedImageObjectUrl) {
    URL.revokeObjectURL(selectedImageObjectUrl);
    selectedImageObjectUrl = '';
  }

  selectedImageFile = null;

  if (imageFileEl) imageFileEl.value = '';
  if (imageFilePreviewEl) {
    imageFilePreviewEl.innerHTML = '<span class="preview-empty">Belum ada file dipilih</span>';
  }
}

function setSelectedImagePreview(file) {
  if (!file || !imageFilePreviewEl) {
    clearSelectedImagePreview();
    return;
  }

  if (selectedImageObjectUrl) {
    URL.revokeObjectURL(selectedImageObjectUrl);
  }

  selectedImageFile = file;
  selectedImageObjectUrl = URL.createObjectURL(file);
  imageFilePreviewEl.innerHTML = `<img src="${selectedImageObjectUrl}" alt="Preview gambar dipilih">`;
}

function normalizeEditorHtml(html = '') {
  const cleaned = String(html || '').trim();
  if (!cleaned) return '';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = cleaned;

  const text = wrapper.textContent.replace(/\u00a0/g, ' ').trim();
  const hasImage = !!wrapper.querySelector('img');
  const hasHr = !!wrapper.querySelector('hr');

  if (!text && !hasImage && !hasHr) return '';

  return wrapper.innerHTML.trim();
}

function getEditorHtml() {
  if (!editor) return '';
  const html = normalizeEditorHtml(editor.root?.innerHTML || editor.container?.innerHTML || '');
  return html;
}

function getSelectionRange(focus = true) {
  if (!editor) return null;
  return editor.getSelection(focus);
}

function formatHasValue(value, expected) {
  if (Array.isArray(value)) return value.includes(expected);
  return value === expected;
}

function isParagraphState(formats = {}) {
  return !formats.header && !formats.blockquote && !formats.list && !formats.articleCredit && !formats.smallBlock;
}

function isNeutralState(formats = {}) {
  return isParagraphState(formats) && !formats.bold && !formats.link;
}

function setButtonActive(action, active) {
  const btn = BLOCK_BUTTONS[action];
  if (!btn) return;
  btn.classList.toggle('is-active', !!active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
}

function refreshToolbarState() {
  if (!editor) return;

  const formats = editor.getFormat() || {};

  setButtonActive('p', isParagraphState(formats));
  setButtonActive('neutral', isNeutralState(formats));
  setButtonActive('kredit', !!formats.articleCredit);
  setButtonActive('h2', formatHasValue(formats.header, 2));
  setButtonActive('h3', formatHasValue(formats.header, 3));
  setButtonActive('quote', !!formats.blockquote);
  setButtonActive('small', !!formats.smallBlock);
  setButtonActive('ol', formatHasValue(formats.list, 'ordered'));
  setButtonActive('ul', formatHasValue(formats.list, 'bullet'));
  setButtonActive('bold', !!formats.bold);
  setButtonActive('link', !!formats.link);
}

function clearBlockFormats() {
  if (!editor) return;
  editor.format('header', false);
  editor.format('blockquote', false);
  editor.format('list', false);
  editor.format('articleCredit', false);
  editor.format('smallBlock', false);
}

function clearInlineFormats() {
  if (!editor) return;
  editor.format('bold', false);
  editor.format('link', false);
}

function switchToParagraph() {
  if (!editor) return;
  editor.focus();
  clearBlockFormats();
  updateEditorPreview();
}

function neutralizeAll(removeMarks = true) {
  if (!editor) return;
  editor.focus();
  clearBlockFormats();
  if (removeMarks) clearInlineFormats();
  updateEditorPreview();
}

function switchToHeading(level) {
  if (!editor) return;
  editor.focus();

  const formats = editor.getFormat() || {};
  if (formatHasValue(formats.header, level)) {
    editor.format('header', false);
    updateEditorPreview();
    return;
  }

  clearBlockFormats();
  editor.format('header', level);
  updateEditorPreview();
}

function switchToQuote() {
  if (!editor) return;
  editor.focus();

  const formats = editor.getFormat() || {};
  if (formats.blockquote) {
    editor.format('blockquote', false);
    updateEditorPreview();
    return;
  }

  clearBlockFormats();
  editor.format('blockquote', true);
  updateEditorPreview();
}

function switchToSmall() {
  if (!editor) return;
  editor.focus();

  const formats = editor.getFormat() || {};
  if (formats.smallBlock) {
    editor.format('smallBlock', false);
    updateEditorPreview();
    return;
  }

  clearBlockFormats();
  editor.format('smallBlock', true);
  updateEditorPreview();
}

function switchToCredit() {
  if (!editor) return;
  editor.focus();

  const formats = editor.getFormat() || {};
  if (formats.articleCredit) {
    editor.format('articleCredit', false);
    updateEditorPreview();
    return;
  }

  clearBlockFormats();
  editor.format('articleCredit', true);
  updateEditorPreview();
}

function switchToList(listName) {
  if (!editor) return;
  editor.focus();

  const desired = listName === 'orderedList' ? 'ordered' : 'bullet';
  const formats = editor.getFormat() || {};
  if (formatHasValue(formats.list, desired)) {
    editor.format('list', false);
    updateEditorPreview();
    return;
  }

  clearBlockFormats();
  editor.format('list', desired);
  updateEditorPreview();
}

function toggleBold() {
  if (!editor) return;
  editor.focus();
  const formats = editor.getFormat() || {};
  editor.format('bold', !formats.bold);
  updateEditorPreview();
}

function toggleLink() {
  if (!editor) return;
  editor.focus();

  const range = getSelectionRange(true);
  if (!range) return;

  const formats = editor.getFormat(range) || {};
  if (formats.link) {
    editor.format('link', false);
    updateEditorPreview();
    return;
  }

  const url = window.prompt('Masukkan URL link:', 'https://');
  if (!url) return;

  if (range.length > 0) {
    editor.format('link', url);
    updateEditorPreview();
    return;
  }

  const linkText = window.prompt('Teks link:', 'Tulis teks link di sini');
  if (!linkText) return;

  editor.insertText(range.index, linkText, { link: url });
  editor.setSelection(range.index + linkText.length, 0, 'silent');
  updateEditorPreview();
}

function insertHorizontalRule() {
  if (!editor) return;
  editor.focus();

  const range = getSelectionRange(true);
  if (!range) return;

  if (range.length > 0) {
    editor.deleteText(range.index, range.length, 'user');
  }

  editor.insertEmbed(range.index, 'hr', true, 'user');
  editor.setSelection(range.index + 1, 0, 'silent');
  updateEditorPreview();
}

function insertImage(url) {
  if (!editor) return;
  editor.focus();

  const range = getSelectionRange(true);
  const index = range ? range.index : editor.getLength() - 1;

  if (range && range.length > 0) {
    editor.deleteText(range.index, range.length, 'user');
  }

  editor.insertEmbed(index, 'image', url, 'user');
  editor.setSelection(index + 1, 0, 'silent');
  updateEditorPreview();
}

function handleToolbarAction(action) {
  switch (action) {
    case 'p':
      switchToParagraph();
      break;
    case 'neutral':
      neutralizeAll(true);
      break;
    case 'kredit':
      switchToCredit();
      break;
    case 'h2':
      switchToHeading(2);
      break;
    case 'h3':
      switchToHeading(3);
      break;
    case 'quote':
      switchToQuote();
      break;
    case 'small':
      switchToSmall();
      break;
    case 'ol':
      switchToList('orderedList');
      break;
    case 'ul':
      switchToList('bulletList');
      break;
    case 'bold':
      toggleBold();
      break;
    case 'link':
      toggleLink();
      break;
    case 'hr':
      insertHorizontalRule();
      break;
    case 'img':
      openImageModal();
      break;
    default:
      break;
  }
}

function updateEditorPreview() {
  if (!editor) return;
  const html = getEditorHtml();
  contentEl.value = html;

  if (!html) {
    articlePreviewEl.innerHTML = '<div class="preview-empty">Preview artikel akan muncul di sini.</div>';
  } else {
    articlePreviewEl.innerHTML = `
      <div class="artikel-container">
        <div class="artikel-konten">${html}</div>
      </div>
    `;
  }

  refreshToolbarState();
}

function registerQuillFormats() {
  if (!Quill || !Block || !BlockEmbed) return;

  class HorizontalRuleBlot extends BlockEmbed {}
  HorizontalRuleBlot.blotName = 'hr';
  HorizontalRuleBlot.tagName = 'HR';

  class ArticleCreditBlot extends Block {
    static create(value) {
      const node = super.create(value);
      node.classList.add('artikel-kredit');
      return node;
    }

    static formats(domNode) {
      return domNode.classList.contains('artikel-kredit') ? true : undefined;
    }
  }
  ArticleCreditBlot.blotName = 'articleCredit';
  ArticleCreditBlot.tagName = 'P';

  class SmallBlockBlot extends Block {
    static formats(domNode) {
      return domNode.tagName === 'SMALL' ? true : undefined;
    }
  }
  SmallBlockBlot.blotName = 'smallBlock';
  SmallBlockBlot.tagName = 'SMALL';

  Quill.register(HorizontalRuleBlot, true);
  Quill.register(ArticleCreditBlot, true);
  Quill.register(SmallBlockBlot, true);
}

function createEditor(initialContent = '') {
  if (!Quill) {
    showMessage('Quill gagal dimuat.', 'error');
    return;
  }

  editorEl.innerHTML = '';

  editor = new Quill(editorEl, {
    theme: 'snow',
    placeholder: 'Mulai menulis artikel...',
    modules: {
      toolbar: false,
      history: {
        delay: 1200,
        maxStack: 200,
        userOnly: true
      }
    }
  });

  if (initialContent && initialContent.trim()) {
    editor.clipboard.dangerouslyPasteHTML(initialContent, 'silent');
  } else {
    editor.clipboard.dangerouslyPasteHTML('<p><br></p>', 'silent');
  }

  editor.on('text-change', () => {
    updateEditorPreview();
  });

  updateEditorPreview();
  refreshToolbarState();
}

function openImageModal() {
  imageForm.reset();
  clearSelectedImagePreview();
  setImageModalMessage('');
  imageModal.classList.remove('hidden');
  imageModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => imageFileEl?.focus(), 0);
}

function closeImageModal() {
  imageModal.classList.add('hidden');
  imageModal.setAttribute('aria-hidden', 'true');
  setImageModalMessage('');
  clearSelectedImagePreview();
  editor?.focus();
}

async function loadExisting() {
  if (!editingId) {
    postIdEl.textContent = 'Baru';
    currentThumbnail = '';
    updateThumbnailPreview('');
    setSubOptions();
    createEditor('');
    return;
  }

  const [{ data: post, error }, editorPickRes] = await Promise.all([
    fetchPostById(editingId),
    fetchEditorPick(editingId)
  ]);

  if (error) {
    showMessage(error.message, 'error');
    return;
  }

  if (!post) {
    showMessage('Konten tidak ditemukan.', 'error');
    return;
  }

  postIdEl.textContent = post.id;
  titleEl.value = post.judul || '';
  categoryEl.value = post.kategori || 'artikel';
  setSubOptions();
  subEl.value = post.sub || '';
  document.getElementById('author').value = post.penulis || '';
  document.getElementById('date').value = post.tanggal || dateISO();
  document.getElementById('read_time').value = post.estimasi_baca || '';
  document.getElementById('excerpt').value = post.ringkasan || '';
  document.getElementById('tags').value = (post.tags || []).join(', ');
  currentThumbnail = post.thumbnail || '';
  updateThumbnailPreview(currentThumbnail);

  const editorPick = editorPickRes?.data || null;
  editorPickEl.checked = !!editorPick;
  editorPickNoteEl.value = editorPick?.catatan || '';

  createEditor(post.content_html || '');
}

async function handleImageSubmit(event) {
  event.preventDefault();

  const file = selectedImageFile || getFileFromInput(imageFileEl);
  if (!file) {
    setImageModalMessage('Pilih file gambar terlebih dahulu.', 'error');
    imageFileEl?.focus();
    return;
  }

  const articleKey = bodyImageSessionKey || editingId || makeId(titleEl.value || 'article');

  try {
    setImageModalMessage('Mengunggah gambar...', 'notice');

    const { publicUrl, path } = await uploadBodyImage(file, articleKey);
    const { data: existingImages, error: imagesError } = await fetchArticleImagesByPostId(articleKey);
    if (imagesError) throw imagesError;

    const sortOrder = (existingImages?.length || 0) + 1;

    await saveArticleImage({
      postId: articleKey,
      imageUrl: publicUrl,
      imagePath: path,
      altText: '',
      creditText: '',
      sortOrder
    });

    insertImage(publicUrl);
    setImageModalMessage('');
    closeImageModal();
  } catch (error) {
    setImageModalMessage(error?.message || 'Gagal mengunggah gambar.', 'error');
  }
}

function bindEvents() {
  categoryEl.addEventListener('change', () => {
    setSubOptions();
  });

  thumbnailInput.addEventListener('change', () => {
    const file = getFileFromInput(thumbnailInput);
    if (!file) {
      updateThumbnailPreview(currentThumbnail || '');
      return;
    }
    updateThumbnailPreview(URL.createObjectURL(file), true);
  });

  editorToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    handleToolbarAction(btn.dataset.action);
  });

  imageFileEl.addEventListener('change', () => {
    const file = getFileFromInput(imageFileEl);
    if (file) {
      setImageModalMessage('');
      setSelectedImagePreview(file);
    } else {
      clearSelectedImagePreview();
    }
  });

  imageForm.addEventListener('submit', handleImageSubmit);
  imageCancelBtn.addEventListener('click', closeImageModal);

  imageModal.addEventListener('click', (e) => {
    if (e.target?.dataset?.modalClose === 'true') {
      closeImageModal();
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!editor) {
      showMessage('Editor belum siap.', 'error');
      return;
    }

    const title = titleEl.value.trim();
    const category = categoryEl.value.trim();
    const sub = subEl.value.trim();
    const author = document.getElementById('author').value.trim();
    const date = document.getElementById('date').value || dateISO();
    const readTime = Number(document.getElementById('read_time').value || 0) || null;
    const excerpt = document.getElementById('excerpt').value.trim();
    const contentHtml = getEditorHtml();
    const tags = document.getElementById('tags').value.trim();
    const editorPick = editorPickEl.checked;
    const editorPickNote = editorPickNoteEl.value.trim();

    contentEl.value = contentHtml;

    if (!title || !category || !sub || !author || !contentHtml) {
      showMessage('Judul, kategori, subkategori, penulis, dan isi artikel wajib diisi.', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    try {
      let thumbnail = currentThumbnail;
      const file = getFileFromInput(thumbnailInput);

      if (file) {
        thumbnail = await uploadPublicFile('covers', 'posts', file);
      }

      const postId = editingId || makeId(title);

      const payload = {
        id: postId,
        judul: title,
        kategori: category,
        sub,
        penulis: author,
        tanggal: date,
        estimasi_baca: readTime,
        thumbnail,
        ringkasan: excerpt,
        content_html: contentHtml,
        is_gallery: false
      };

      const { error: postError } = await supabase
        .from('posts')
        .upsert(payload, { onConflict: 'id' });

      if (postError) throw postError;

      await saveTags(postId, tags);
      await saveEditorPick(postId, editorPick, editorPickNote);

      if (bodyImageSessionKey && bodyImageSessionKey !== postId) {
        await syncArticleImagesPostId(bodyImageSessionKey, postId);
        bodyImageSessionKey = postId;
      }

      if (thumbnailObjectUrl) {
        URL.revokeObjectURL(thumbnailObjectUrl);
        thumbnailObjectUrl = '';
      }

      showMessage('Konten berhasil disimpan.', 'notice');
      setTimeout(() => {
        location.href = './dashboard.html';
      }, 700);
    } catch (error) {
      showMessage(error?.message || 'Gagal menyimpan konten.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan';
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!editingId) return;

    const ok = window.confirm('Hapus konten ini?');
    if (!ok) return;

    try {
      await deleteArticleImages(editingId);
    } catch (error) {
      console.warn('[deleteArticleImages]', error);
    }

    const { error } = await supabase.from('posts').delete().eq('id', editingId);
    if (error) {
      window.alert(error.message);
      return;
    }

    location.href = './dashboard.html';
  });
}

async function init() {
  document.getElementById('currentUser').textContent = '-';
  document.getElementById('date').value = dateISO();

  registerQuillFormats();
  shieldTextFieldFocus();
  bindEvents();
  await loadExisting();
}

init();

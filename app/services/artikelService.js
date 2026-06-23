// app/services/artikelService.js
// Semua akses dan filter data artikel

import DataLoader from '../core/dataLoader.js';
import { supabase } from '../core/supabase.js';

function uniqById(items) {
  const map = new Map();
  for (const item of items) {
    if (!item || !item.id) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const bucket = item?.[key];
    if (!bucket) return acc;
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push(item);
    return acc;
  }, {});
}

function normalizeText(value = '') {
  return String(value).trim().toLowerCase();
}

const ArtikelService = {
  async getAll() {
    const artikel = await DataLoader.loadJSON('artikel.json') || [];
    const galeri  = await DataLoader.loadJSON('galeri.json')  || [];

    const [{ data: posts, error: postsError }, { data: tags, error: tagsError }, { data: galleryImages, error: galleryError }] =
      await Promise.all([
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('post_tags').select('*'),
        supabase.from('gallery_images').select('*').order('sort_order', { ascending: true })
      ]);

    if (postsError) console.error('[ArtikelService] posts', postsError);
    if (tagsError) console.error('[ArtikelService] post_tags', tagsError);
    if (galleryError) console.error('[ArtikelService] gallery_images', galleryError);

    const tagsByPost = groupBy(tags || [], 'post_id');
    const fotosByPost = groupBy(galleryImages || [], 'post_id');

    const postsNormalized = (posts || []).map(post => ({
      ...post,
      tags: (tagsByPost[post.id] || []).map(t => t.tag),
      foto: (fotosByPost[post.id] || []).map(g => g.image_url)
    }));

    return uniqById([...artikel, ...galeri, ...postsNormalized]);
  },

  async getByKategori(kategori, sub = '') {
    const semua = await this.getAll();
    return semua.filter(a => {
      const cocokKategori = a.kategori === kategori;
      const cocokSub = sub ? a.sub === sub : true;
      return cocokKategori && cocokSub;
    });
  },

  async getById(id) {
    const semua = await this.getAll();
    return semua.find(a => a.id === id) || null;
  },

  async getTerbaru(limit = 6) {
    const semua = await this.getAll();
    return semua
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
      .slice(0, limit);
  },

  async getRelated(artikel, limit = 4) {
    const semua = await this.getAll();
    const seenTitles = new Set([normalizeText(artikel.judul)]);

    return semua
      .filter(a => a.id !== artikel.id && a.sub === artikel.sub)
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
      .filter(a => {
        const key = normalizeText(a.judul);
        if (!key || seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      })
      .slice(0, limit);
  },
  // Tambahkan di dalam objek ArtikelService { ... }

async getEditorPicks() {
  const semua = await this.getAll();

  // Coba ambil dari Supabase dulu
  const { data: picks, error } = await supabase
    .from('editor_picks')
    .select('*')
    .order('sort_order', { ascending: true });

  if (!error && picks && picks.length > 0) {
    // Sumber: Supabase
    return picks
      .map(pe => {
        const artikel = semua.find(a => a.id === pe.post_id);
        return artikel ? { ...artikel, _catatan: pe.catatan } : null;
      })
      .filter(Boolean);
  }

  // Fallback: config.json (sistem lama)
  const config = await DataLoader.loadJSON('config.json');
  if (!config?.pilihan_editor?.length) return [];

  return config.pilihan_editor
    .map(pe => {
      const artikel = semua.find(a => a.id === pe.id);
      return artikel ? { ...artikel, _catatan: pe.catatan } : null;
    })
    .filter(Boolean);
}
};

export default ArtikelService;

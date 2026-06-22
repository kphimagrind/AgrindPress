// app/core/dataLoader.js
// Satu-satunya titik akses data JSON

import CONFIG from './config.js';

const cache = {};

async function loadJSON(filename) {
  if (cache[filename]) return cache[filename];
  try {
    const res = await fetch(CONFIG.dataPath + filename);
    if (!res.ok) throw new Error(`Gagal memuat ${filename}`);
    const data = await res.json();
    cache[filename] = data;
    return data;
  } catch (err) {
    console.error('[DataLoader]', err);
    return null;
  }
}

async function loadHTML(filepath) {
  try {
    const res = await fetch(filepath);
    if (!res.ok) throw new Error(`Gagal memuat konten: ${filepath}`);
    return await res.text();
  } catch (err) {
    console.error('[DataLoader]', err);
    return '<p>Konten tidak tersedia.</p>';
  }
}

const DataLoader = { loadJSON, loadHTML };
export default DataLoader;

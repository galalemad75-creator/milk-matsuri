// ═══════════════════════════════════════
// CONFIG — Milk Matsuri Data Layer
// Cache-Free GitHub API + Cloudinary
// ═══════════════════════════════════════
const API_URL = '/api/data';
const CLOUDINARY_CLOUD_NAME = 'dse1s0loh';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

async function uploadToCloudinary(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', 'kidmom');
  fd.append('resource_type', 'auto');
  fd.append('folder', 'milk-matsuri/audio');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);
    xhr.upload.addEventListener('progress', e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); });
    xhr.onload = () => {
      if (xhr.status === 200) { const r = JSON.parse(xhr.responseText); resolve({ url: r.secure_url, publicId: r.public_id }); }
      else { try { reject(new Error(JSON.parse(xhr.responseText).error?.message || 'Upload failed')); } catch { reject(new Error('Upload failed')); } }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(fd);
  });
}

const DEFAULT_DATA = {
  chapters: [],
  nextId: { chapter: 1, song: 1 },
  ads: [
    { id: 1, name: 'Ad Box 1 — Header Banner', position: 'after_hero', code: '', enabled: false },
    { id: 2, name: 'Ad Box 2 — Mid Content', position: 'after_features', code: '', enabled: false },
    { id: 3, name: 'Ad Box 3 — Footer Banner', position: 'before_footer', code: '', enabled: false },
  ],
  admin: { email: 'galalemad75@gmail.com', password: 'MilkMatsuri2026!' }
};

const DB = {
  _cache: null,

  async init() {
    try {
      const res = await fetch(API_URL + '?t=' + Date.now());
      if (res.ok) { const remote = await res.json(); if (remote && remote.chapters) { this._cache = remote; localStorage.setItem('mm_cache', JSON.stringify(remote)); await this._autoSync(remote); return remote; } }
    } catch (e) { console.warn('DB init:', e.message); }
    const local = localStorage.getItem('mm_cache');
    if (local) { this._cache = JSON.parse(local); return this._cache; }
    this._cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
    return this._cache;
  },

  async _autoSync(remote) {
    try {
      const l = localStorage.getItem('mm_cache'); if (!l) return;
      const local = JSON.parse(l);
      const rs = remote.chapters.reduce((s, c) => s + (c.songs?.length || 0), 0);
      const ls = local.chapters.reduce((s, c) => s + (c.songs?.length || 0), 0);
      if (ls > rs) { this._cache = local; localStorage.setItem('mm_cache', JSON.stringify(local)); await this._write(local); }
    } catch (e) { console.warn('Auto-sync:', e.message); }
  },

  async save() { localStorage.setItem('mm_cache', JSON.stringify(this._cache)); try { await this._write(this._cache); } catch (e) { console.warn('Save:', e.message); } },

  async _write(data) {
    const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Write failed'); }
    return true;
  },

  getData() { return this._cache || DEFAULT_DATA; },
  getChapters() { return this.getData().chapters; },

  addChapter(name, icon) { const d = this._cache; const ch = { id: d.nextId.chapter++, name, icon, songs: [] }; d.chapters.push(ch); this.save(); return ch; },
  updateChapter(id, u) { const ch = this._cache.chapters.find(c => c.id === id); if (ch) { Object.assign(ch, u); this.save(); } return ch; },
  deleteChapter(id) { this._cache.chapters = this._cache.chapters.filter(c => c.id !== id); this.save(); },

  addSong(chId, title, audioUrl, pubId, imageUrl) {
    const ch = this._cache.chapters.find(c => c.id === chId); if (!ch) return null;
    const s = { id: this._cache.nextId.song++, title, audio: audioUrl, image: imageUrl || '', cloudinary_id: pubId, created: new Date().toISOString(), plays: 0 };
    if (!ch.songs) ch.songs = []; ch.songs.push(s); this.save(); return s;
  },
  deleteSong(chId, sId) { const ch = this._cache.chapters.find(c => c.id === chId); if (ch) { ch.songs = (ch.songs || []).filter(s => s.id !== sId); this.save(); } },

  getAds() { return this.getData().ads || []; },
  updateAd(id, u) { const ad = (this._cache.ads || []).find(a => a.id === id); if (ad) { Object.assign(ad, u); this.save(); } return ad; },
  addAd(name, pos, code) { const d = this._cache; if (!d.ads) d.ads = []; const m = d.ads.reduce((x, a) => Math.max(x, a.id), 0); const ad = { id: m + 1, name, position: pos, code: code || '', enabled: false }; d.ads.push(ad); this.save(); return ad; },
  deleteAd(id) { if (this._cache.ads) { this._cache.ads = this._cache.ads.filter(a => a.id !== id); this.save(); } },

  login(email, password) { const a = this._cache?.admin; return a && email.trim() === a.email && password.trim() === a.password; },
  isLoggedIn() { return !!localStorage.getItem('mm_admin'); },
  setSession(email) { localStorage.setItem('mm_admin', JSON.stringify({ email, ts: Date.now() })); },
  logout() { localStorage.removeItem('mm_admin'); },
};

const SYNC = {
  async loadChapters() { await DB.init(); return DB.getChapters(); },
  async addChapter(n, i) { return DB.addChapter(n, i); },
  async updateChapter(id, d) { return DB.updateChapter(id, d); },
  async removeChapter(id) { DB.deleteChapter(id); },
  async addSong(c, t, a, p, img) { return DB.addSong(c, t, a, p, img); },
  async removeSong(c, s) { DB.deleteSong(c, s); },
  async uploadAudio(f, cb) { return uploadToCloudinary(f, cb); },
  getAds() { return DB.getAds(); },
  async updateAd(id, d) { return DB.updateAd(id, d); },
  async addAd(n, p, c) { return DB.addAd(n, p, c); },
  async removeAd(id) { DB.deleteAd(id); },
};

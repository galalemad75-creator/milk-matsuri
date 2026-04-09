/* ═══════════════════════════════════════
   MILK MATSURI — Main App JS
   ═══════════════════════════════════════ */

const player = document.getElementById('player');
let currentChapter = null;
let currentSong = -1;
let chapters = [];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initScrollAnimations();
  initCounterAnimations();
  initChapters();
  initCookieBanner();
  if (typeof lucide !== 'undefined') lucide.createIcons();
});

// ─── THEME ───
function initTheme() {
  const saved = localStorage.getItem('mm_theme');
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mm_theme', next);
  });
}

// ─── NAV ───
function initNav() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50), { passive: true });
  const hamburger = document.getElementById('hamburger'), navMenu = document.getElementById('navMenu');
  hamburger?.addEventListener('click', () => { hamburger.classList.toggle('active'); navMenu.classList.toggle('open'); });
  navMenu?.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => { hamburger?.classList.remove('active'); navMenu?.classList.remove('open'); }));
}

// ─── SCROLL ANIMATIONS ───
function initScrollAnimations() {
  const obs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
  }), { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.animate-on-scroll, .grid .card').forEach(el => obs.observe(el));
}

function initCounterAnimations() {
  const obs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { animateCounter(e.target); obs.unobserve(e.target); }
  }), { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(c => obs.observe(c));
}

function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-count'));
  if (isNaN(target)) return;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / 1500, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── CHAPTERS ───
async function initChapters() {
  await DB.init();
  chapters = DB.getChapters();
  renderChapters();
  renderAds();
}

function renderChapters() {
  const grid = document.getElementById('chaptersGrid');
  if (!grid) return;
  grid.innerHTML = chapters.map(c => `
    <div class="card" onclick="openChapter(${c.id})">
      <div class="num">${c.id}</div>
      <div class="name">${c.icon} ${c.name}</div>
      <div class="count">${(c.songs || []).length} song${(c.songs || []).length !== 1 ? 's' : ''}</div>
    </div>
  `).join('');
  const obs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
  }), { threshold: 0.1 });
  grid.querySelectorAll('.card').forEach(c => obs.observe(c));
}

// ─── ADS ───
function renderAds() {
  const ads = DB.getAds();
  if (!ads?.length) return;
  ads.forEach(ad => {
    if (!ad.enabled || !ad.code) return;
    const slot = document.getElementById('ad-' + ad.position);
    if (!slot) return;
    slot.style.display = 'block';
    slot.innerHTML = `<div class="ad-container" style="max-width:900px;margin:20px auto;padding:0 20px;text-align:center;">${ad.code}</div>`;
    slot.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script');
      Array.from(old.attributes).forEach(a => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.parentNode.replaceChild(s, old);
    });
  });
}

// ─── CHAPTER / SONG VIEW ───
function openChapter(id) {
  currentChapter = chapters.find(c => c.id === id);
  if (!currentChapter) return;
  ['hero','features','chapters'].forEach(s => document.getElementById(s)?.style.setProperty('display','none'));
  document.querySelector('.cta-section')?.style.setProperty('display','none');
  let sv = document.getElementById('songsView');
  if (!sv) { sv = document.createElement('div'); sv.id = 'songsView'; sv.className = 'songs-view';
    sv.innerHTML = `<button class="back-btn" onclick="showHome()">← Back to Episodes</button><h2 id="chapterTitle" style="margin-bottom:24px;"></h2><div id="songsList"></div>`;
    document.body.insertBefore(sv, document.querySelector('.np-bar'));
  }
  sv.style.display = 'block';
  document.getElementById('chapterTitle').textContent = currentChapter.icon + ' ' + currentChapter.name;
  const sl = document.getElementById('songsList');
  if (!currentChapter.songs?.length) { sl.innerHTML = '<div class="empty"><div class="empty-icon">🎵</div><h3>No songs yet</h3><p>Episodes coming soon!</p></div>'; }
  else { sl.innerHTML = currentChapter.songs.map((s, i) => `<div class="song-card" id="sc-${i}"><button class="song-play" onclick="event.stopPropagation();playSong(${i})">▶</button><span class="song-title">${s.title}</span></div>`).join(''); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHome() {
  ['hero','features','chapters'].forEach(s => document.getElementById(s)?.style.removeProperty('display'));
  document.querySelector('.cta-section')?.style.removeProperty('display');
  document.getElementById('songsView')?.style.setProperty('display','none');
}

// ─── PLAYER (Cross-Chapter) ───
function playSong(i) {
  if (!currentChapter?.songs?.[i]) return;
  currentSong = i;
  const s = currentChapter.songs[i];
  if (!s.audio) return;
  player.src = s.audio;
  player.play().catch(() => {});
  document.getElementById('npTitle').textContent = s.title;
  document.getElementById('npChapter').textContent = currentChapter.name;
  const npImg = document.getElementById('npImg');
  if (s.image) { npImg.src = s.image; npImg.style.display = 'block'; } else { npImg.style.display = 'none'; }
  document.getElementById('playBtn').textContent = '⏸';
  document.getElementById('npBar').style.display = 'block';
  const ct = document.getElementById('chapterTitle');
  if (ct) ct.textContent = `${currentChapter.icon} ${currentChapter.name}`;
  document.querySelectorAll('.song-card').forEach(c => c.classList.remove('playing'));
  document.getElementById('sc-' + i)?.classList.add('playing');
}

function prevSong() {
  if (!currentChapter) return;
  if (currentSong > 0) { playSong(currentSong - 1); return; }
  const ci = chapters.findIndex(c => c.id === currentChapter.id);
  for (let j = ci - 1; j >= 0; j--) { if (chapters[j].songs?.length) { currentChapter = chapters[j]; playSong(chapters[j].songs.length - 1); return; } }
}

function nextSong() {
  if (!currentChapter) return;
  if (currentSong + 1 < currentChapter.songs.length) { playSong(currentSong + 1); return; }
  const ci = chapters.findIndex(c => c.id === currentChapter.id);
  for (let j = ci + 1; j < chapters.length; j++) { if (chapters[j].songs?.length) { currentChapter = chapters[j]; playSong(0); return; } }
}

function togglePlay() { if (player.paused) { player.play(); document.getElementById('playBtn').textContent = '⏸'; } else { player.pause(); document.getElementById('playBtn').textContent = '▶'; } }
function stopAudio() { player.pause(); player.currentTime = 0; document.getElementById('playBtn').textContent = '▶'; document.getElementById('npFill').style.width = '0%'; document.getElementById('npCur').textContent = '0:00'; }
function seekAudio(e) { player.currentTime = ((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width) * player.duration; }
function formatTime(s) { if (isNaN(s)) return '0:00'; return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
function closePlayer() { player.pause(); player.src = ''; document.getElementById('npBar').style.display = 'none'; document.querySelectorAll('.song-card').forEach(c => c.classList.remove('playing')); currentSong = -1; }

if (player) {
  player.addEventListener('timeupdate', () => { if (player.duration) { document.getElementById('npFill').style.width = (player.currentTime / player.duration * 100) + '%'; document.getElementById('npCur').textContent = formatTime(player.currentTime); document.getElementById('npDur').textContent = formatTime(player.duration); } });
  player.addEventListener('ended', () => {
    if (currentChapter) {
      if (currentSong + 1 < currentChapter.songs.length) { playSong(currentSong + 1); return; }
      const ci = chapters.findIndex(c => c.id === currentChapter.id);
      for (let j = ci + 1; j < chapters.length; j++) { if (chapters[j].songs?.length) { currentChapter = chapters[j]; playSong(0); return; } }
    }
    document.getElementById('playBtn').textContent = '▶';
  });
}

// ─── COOKIE BANNER ───
function initCookieBanner() {
  if (!localStorage.getItem('mm_cookies')) { document.getElementById('cookieBanner').style.display = 'flex'; }
}
function acceptCookies() { localStorage.setItem('mm_cookies', '1'); document.getElementById('cookieBanner').classList.add('hidden'); }

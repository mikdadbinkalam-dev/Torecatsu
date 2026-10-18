/* TORECATSU background music player. Renders into #musicMount. Playlist: music/playlist.json */
(function () {
  var mount = document.getElementById('musicMount');
  if (!mount) return;
  var LS = { get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var list = [], idx = 0, wantOn = LS.get('tore_music_on', '1') === '1', vol = parseFloat(LS.get('tore_music_vol', '0.4')), failed = 0, started = false;
  var audio = new Audio(); audio.preload = 'none'; audio.volume = isNaN(vol) ? 0.4 : vol;

  mount.innerHTML =
    '<div class="flex items-center gap-2 sm:gap-3 text-slate-300">' +
    '<button type="button" id="mPrev" aria-label="Previous track" class="hover:text-brand-cyan"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM9.5 12 18 6v12z"/></svg></button>' +
    '<button type="button" id="mPlay" aria-label="Play or pause music" class="hover:text-brand-cyan"></button>' +
    '<button type="button" id="mNext" aria-label="Next track" class="hover:text-brand-cyan"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18V6l8.5 6z"/></svg></button>' +
    '<span id="mTitle" class="hidden md:inline-block max-w-[180px] truncate text-[10px] text-brand-cyan font-mono">MUSIC</span>' +
    '<input id="mVol" type="range" min="0" max="1" step="0.01" aria-label="Music volume" class="w-14 sm:w-24 accent-cyan-400 cursor-pointer">' +
    '<button type="button" id="mOnOff" class="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 hover:border-brand-cyan"></button>' +
    '</div>';
  var $ = function (id) { return document.getElementById(id); };
  var PLAY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  $('mVol').value = audio.volume;

  function ui() {
    var playing = !audio.paused;
    $('mPlay').innerHTML = playing ? PAUSE : PLAY;
    $('mOnOff').textContent = wantOn ? 'MUSIC: ON' : 'MUSIC: OFF';
    $('mOnOff').style.color = wantOn ? '#00F0FF' : '#64748b';
    var t = list[idx] ? list[idx].title : 'ADD MP3 FILES';
    $('mTitle').textContent = (playing ? '♪ ' : '') + t;
    $('mTitle').title = t;
  }
  function load(i) {
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    audio.src = list[idx].file; LS.set('tore_music_idx', String(idx));
  }
  function play() {
    if (!list.length) { ui(); return; }
    if (!audio.src) load(idx);
    var p = audio.play();
    if (p && p.catch) p.catch(function () { /* blocked until the visitor interacts */ ui(); });
  }
  function next(step) { load(idx + (step || 1)); if (wantOn) play(); }

  audio.addEventListener('play', ui); audio.addEventListener('pause', ui);
  audio.addEventListener('ended', function () { next(1); });
  audio.addEventListener('error', function () {
    failed++;
    if (failed >= list.length) { list = []; ui(); return; } /* no mp3 files uploaded */
    next(1);
  });
  audio.addEventListener('playing', function () { failed = 0; });
  $('mPlay').onclick = function () { wantOn = true; LS.set('tore_music_on', '1'); audio.paused ? play() : audio.pause(); if (audio.paused) { wantOn = false; LS.set('tore_music_on', '0'); } ui(); };
  $('mNext').onclick = function () { wantOn = true; LS.set('tore_music_on', '1'); next(1); };
  $('mPrev').onclick = function () { wantOn = true; LS.set('tore_music_on', '1'); next(-1); };
  $('mOnOff').onclick = function () { wantOn = !wantOn; LS.set('tore_music_on', wantOn ? '1' : '0'); if (wantOn) play(); else audio.pause(); ui(); };
  $('mVol').oninput = function () { audio.volume = +this.value; LS.set('tore_music_vol', this.value); };

  /* browsers block autoplay: start on the visitor's first click / touch / key */
  function firstGesture() {
    if (started) return; started = true;
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) { window.removeEventListener(e, firstGesture, true); });
    if (wantOn) { if (window.TORE_INTRO_GATE && document.getElementById('splash')) setTimeout(play, 3600); else play(); }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) { window.addEventListener(e, firstGesture, true); });

  fetch('music/playlist.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (d) {
    list = Array.isArray(d) ? d.filter(function (x) { return x && x.file; }) : [];
    var s = parseInt(LS.get('tore_music_idx', '0'), 10); idx = (s >= 0 && s < list.length) ? s : 0;
    if (list.length) load(idx);
    ui();
    if (wantOn) { var p = list.length ? audio.play() : null; if (p && p.catch) p.catch(function () {}); }
  });
  ui();
})();

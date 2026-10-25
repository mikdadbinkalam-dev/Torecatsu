/* ================= TORECATSU CYBER PACK (js) =================
   1) Sound persistence + click sounds   2) Terminal CLI   3) Subject modal
   4) Transmission modal (window.toreTx)   Works with the existing playBeep/toggleAudio/toggleChat. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function beep(f) { try { if (typeof playBeep === 'function') playBeep(f); } catch (e) {} }

  /* ---------- 1. Sound effects: ON/OFF saved in localStorage ---------- */
  (function () {
    if (typeof toggleAudio !== 'function') return;
    var orig = toggleAudio;
    window.toggleAudio = function () { orig(); LS.set('tore_sound', typeof soundEnabled !== 'undefined' && soundEnabled ? '1' : '0'); };
    // Browsers only allow audio after a gesture, so a saved "ON" is restored on the first tap/click.
    if (LS.get('tore_sound') === '1') {
      var restore = function () { document.removeEventListener('pointerdown', restore, true); if (typeof soundEnabled !== 'undefined' && !soundEnabled) orig(); };
      document.addEventListener('pointerdown', restore, true);
    }
    // click sound on buttons and links (only plays when sound is ON)
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('button,a,[role=button]')) beep(520); }, true);
  })();

  /* ---------- 4. Transmission modal ---------- */
  var tx = document.createElement('div'); tx.className = 'tore-ov'; tx.id = 'toreTx'; tx.setAttribute('role', 'dialog'); tx.setAttribute('aria-modal', 'true');
  tx.innerHTML = '<div class="tore-card tx-box"><div class="tx-ring" id="txIcon">&#10003;</div><div class="ok" id="txMsg"></div><div class="ref" id="txRef"></div><button type="button" class="tore-btn" id="txOk">ACKNOWLEDGE</button></div>';
  document.body.appendChild(tx);
  function closeTx() { tx.classList.remove('open'); }
  $('#txOk', tx).onclick = closeTx; tx.addEventListener('click', function (e) { if (e.target === tx) closeTx(); });
  window.toreTx = function (ok, detail) {
    var id = 'TX-' + Math.random().toString(16).slice(2, 10).toUpperCase();
    $('#txIcon').innerHTML = ok ? '&#10003;' : '!'; $('#txIcon').style.color = ok ? '' : '#ff6b8b'; $('#txIcon').style.borderColor = ok ? '' : '#ff6b8b';
    var m = $('#txMsg'); m.className = 'ok' + (ok ? '' : ' bad');
    m.textContent = ok ? '[ENCRYPTED PAYLOAD TRANSMITTED SUCCESSFULLY]' : '[TRANSMISSION FAILED]';
    $('#txRef').textContent = (ok ? 'Reference: ' + id + (detail ? ' | ' + detail : '') : (detail || 'Check your connection (turn off VPN) and try again.'));
    tx.classList.add('open'); beep(ok ? 880 : 220); $('#txOk').focus();
  };

  /* ---------- 3. Subject modal with article previews ---------- */
  var SUBJ = {
    'Physics': { ic: 'fa-atom', blurb: 'Motion, energy, forces and the laws that run the universe - from falling apples to quantum particles.', arts: [
      ['Why is the sky blue?', 'Sunlight contains all colours. Air molecules scatter short (blue) wavelengths much more than long (red) ones - this is called Rayleigh scattering.', 'learn-why-sky-is-blue.html'],
      ['Newton\'s three laws', '1) Things keep their motion unless a force acts. 2) Force = mass x acceleration (F = ma). 3) Every action has an equal and opposite reaction.'],
      ['Quantum basics', 'At atomic scales energy comes in tiny packets called quanta, and particles are described by probabilities until they are measured. This is the base of lasers, chips and future quantum computers.']] },
    'Biology': { ic: 'fa-dna', blurb: 'Cells, genes, ecosystems and the science of living things.', arts: [
      ['DNA in one minute', 'DNA is a long molecule written with four letters (A, T, G, C). Groups of three letters tell a cell which amino acid to add when it builds a protein.'],
      ['The cell', 'The cell is the basic unit of life. Plant and animal cells have a nucleus; mitochondria release energy from food; ribosomes build proteins.'],
      ['Natural selection', 'Individuals with traits that help them survive and reproduce pass those traits on more often, so populations change slowly over many generations.']] },
    'Chemistry': { ic: 'fa-flask', blurb: 'Atoms, molecules, reactions and how matter changes.', arts: [
      ['Atoms and the periodic table', 'Every atom has protons, neutrons and electrons. The periodic table orders elements by number of protons, and elements in the same column behave alike.'],
      ['What is a chemical reaction?', 'Bonds between atoms break and new ones form, making new substances. The atoms are rearranged, never created or destroyed.'],
      ['Acids and bases', 'The pH scale runs from 0 to 14. Below 7 is acidic, 7 is neutral (pure water), above 7 is basic.']] },
    'Astrophysics': { ic: 'fa-star', blurb: 'Stars, galaxies, black holes and the origin of the cosmos.', arts: [
      ['What is a black hole?', 'A region where gravity is so strong that nothing, not even light, can escape once it crosses the event horizon.', 'learn-black-holes.html'],
      ['How do stars shine?', 'Deep inside a star, hydrogen nuclei fuse into helium and release huge amounts of energy as light and heat. Our Sun has done this for about 4.6 billion years.'],
      ['The expanding universe', 'Distant galaxies are moving away from us, and farther ones recede faster (Hubble\'s law). Space itself is stretching.']] },
    'Mathematics': { ic: 'fa-square-root-variable', blurb: 'Algebra, calculus, geometry and the language of science.', arts: [
      ['Why prime numbers matter', 'Multiplying two huge primes is easy but factoring the result is very hard. Much of modern encryption relies on that gap.', 'learn-encryption.html'],
      ['The Pythagorean theorem', 'In a right triangle, a squared plus b squared equals c squared, where c is the longest side.'],
      ['What is a derivative?', 'A derivative measures how fast something is changing at one exact moment - like the slope of a curve at a point, or speed from a distance-time graph.']] },
    'Computer Science': { ic: 'fa-laptop-code', blurb: 'How computers, programs and the internet work - the base for building real projects.', arts: [
      ['What is an algorithm?', 'An algorithm is a clear list of steps that solves a problem, like a recipe. Good algorithms solve problems with fewer steps.'],
      ['How does a mesh network work?', 'In a mesh network every device can pass data to its neighbours, so there is no single central router.', 'learn-mesh-network.html'],
      ['Binary and bits', 'Computers store everything as bits (0 or 1). Eight bits make a byte, and a byte can hold one letter.']] },
    'Artificial Intelligence': { ic: 'fa-robot', blurb: 'How machines learn from data, and how to use that power responsibly.', arts: [
      ['What is machine learning?', 'Instead of following hand-written rules, a model learns patterns from many examples and then makes predictions on new data.', 'learn-machine-learning.html'],
      ['AI can be wrong', 'Models can be biased or confidently wrong. Always check important answers, including those from TORE-AI.'],
      ['Training vs using', 'Training teaches the model from data (slow and costly). Using it, called inference, is fast and cheap.']] },
    'Earth Science': { ic: 'fa-earth-asia', blurb: 'Geology, climate, oceans and the planet we live on.', arts: [
      ['Why do we have seasons?', 'Earth\'s axis is tilted about 23.5 degrees. When your hemisphere tilts toward the Sun you get summer; away from it, winter. Distance from the Sun is not the cause.'],
      ['Plate tectonics', 'Earth\'s crust is split into moving plates. Where they collide, slide or separate we get mountains, earthquakes and volcanoes.'],
      ['The greenhouse effect', 'Gases like carbon dioxide and methane trap heat in the atmosphere. A natural amount keeps Earth warm; extra from human activity warms it further.']] }
  };
  var sm = document.createElement('div'); sm.className = 'tore-ov'; sm.id = 'toreSubj'; sm.setAttribute('role', 'dialog'); sm.setAttribute('aria-modal', 'true');
  sm.innerHTML = '<div class="tore-card"><button type="button" class="x" aria-label="Close">&times;</button><div id="subjBody"></div></div>';
  document.body.appendChild(sm);
  function closeSubj() { sm.classList.remove('open'); }
  $('.x', sm).onclick = closeSubj; sm.addEventListener('click', function (e) { if (e.target === sm) closeSubj(); });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function askAI(q) {
    closeSubj();
    try { if ($('#chatDrawer').classList.contains('hidden')) toggleChat(); var i = $('#chatInput'); i.value = q; (i.form.requestSubmit ? i.form.requestSubmit() : i.form.dispatchEvent(new Event('submit', { cancelable: true }))); } catch (e) {}
  }
  function openSubj(name) {
    var d = SUBJ[name]; if (!d) return;
    var h = '<div class="font-mono" style="color:var(--neon);font-size:11px;letter-spacing:.12em;margin-bottom:6px"><i class="fa-solid ' + d.ic + '"></i> // KNOWLEDGE DOMAIN</div><h3>' + esc(name) + '</h3><p style="color:#94a3b8;font-size:.9rem;margin:0 0 6px">' + esc(d.blurb) + '</p>';
    d.arts.forEach(function (a) { h += '<div class="art"><h4>' + esc(a[0]) + '</h4><p>' + esc(a[1]) + '</p>' + (a[2] ? '<a href="' + a[2] + '">READ FULL ARTICLE &rarr;</a>' : '') + '</div>'; });
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button type="button" class="tore-btn" id="subjAsk">ASK TORE-AI ABOUT ' + esc(name.toUpperCase()) + '</button><a class="tore-btn ghost" href="learn.html" style="text-decoration:none">ALL ARTICLES</a></div>';
    $('#subjBody').innerHTML = h; $('#subjAsk').onclick = function () { askAI('Tell me about ' + name.toLowerCase()); };
    sm.classList.add('open'); beep(700); $('.x', sm).focus();
  }
  document.querySelectorAll('#subjects .glass-panel').forEach(function (c) {
    var t = c.querySelector('h3'); if (!t || !SUBJ[t.textContent.trim()]) return;
    c.classList.add('subj-card'); c.setAttribute('role', 'button'); c.tabIndex = 0;
    var hint = document.createElement('div'); hint.className = 'font-mono'; hint.style.cssText = 'margin-top:12px;font-size:10px;letter-spacing:.1em;color:var(--neon)'; hint.textContent = 'OPEN ARTICLES →'; c.appendChild(hint);
    var go = function () { openSubj(t.textContent.trim()); };
    c.addEventListener('click', go); c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  /* ---------- 2. Cyber terminal ---------- */
  var term = document.createElement('div'); term.id = 'toreTerm'; term.setAttribute('role', 'dialog'); term.setAttribute('aria-label', 'TORECATSU terminal');
  term.innerHTML = '<div class="tt-bar"><span><span class="live-dot"></span>TORE-TERM v1.0</span><button type="button" aria-label="Close terminal">&times;</button></div><div class="tt-out" id="ttOut" aria-live="polite"></div><form class="tt-in" id="ttForm" autocomplete="off"><span>&gt;</span><input id="ttIn" type="text" aria-label="Terminal command" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="type help"></form>';
  document.body.appendChild(term);
  var out = $('#ttOut'), inp = $('#ttIn'), hist = [], hi = 0, booted = false, queue = [], typing = false, skipTyping = false;
  function scroll() { out.scrollTop = out.scrollHeight; }
  // typewriter: lines are {t:text, href?, cls?}
  function pump() {
    if (typing) return; var ln = queue.shift(); if (!ln) return; typing = true;
    var el = document.createElement(ln.href ? 'a' : 'div'); if (ln.href) el.href = ln.href; if (ln.cls) el.className = ln.cls; if (ln.href) el.style.display = 'block'; out.appendChild(el);
    var i = 0, txt = ln.t;
    (function step() {
      if (reduce || skipTyping || ln.instant || i >= txt.length) { el.textContent = txt; typing = false; scroll(); return pump(); }
      var n = txt.length > 60 ? 3 : 1; el.textContent = txt.slice(0, i += n); scroll(); setTimeout(step, 11);
    })();
  }
  function print(lines) { [].concat(lines).forEach(function (l) { queue.push(typeof l === 'string' ? { t: l } : l); }); pump(); }
  var PROJ = [['Chronos', 'project-chronos.html', 'AI prediction grid'], ['Aegis Shield', 'project-aegis.html', 'zero-knowledge privacy'], ['Nexus Hyper-Mesh', 'project-nexus.html', 'community mesh networks'], ['Vortex Agent DAO', 'project-vortex.html', 'autonomous agents'], ['Sovereign Passport', 'project-passport.html', 'self-sovereign identity'], ['Null-OS', 'project-null-os.html', 'zero-telemetry operating system']];
  function jump(sel) { var e = $(sel); if (e) e.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); if (innerWidth < 700) closeTerm(); }
  var CMD = {
    help: function () { return ['Available commands:', '  about      what TORECATSU is', '  projects   list our research projects', '  subjects   science domains', '  learn      open the Learn hub', '  join       go to the enrollment form', '  members    go to the member registry', '  contact    go to the contact form', '  ai         open TORE-AI chat', '  sound on|off   UI sounds', '  whoami | date | clear | exit']; },
    about: function () { return ['TORECATSU is a community of curious students and builders.', 'We learn science and technology, then build open systems that work for everyone.', 'Motto: KNOW THE SYSTEM. BREAK THE SYSTEM.']; },
    projects: function () { return PROJ.map(function (p, i) { return { t: (i + 1) + '. ' + p.slice(0, 1) + ' - ' + p[2], href: p[1] }; }); },
    subjects: function () { jump('#subjects'); return ['Physics, Biology, Chemistry, Astrophysics, Mathematics, Earth Science.', 'Tap a card to read article previews.']; },
    learn: function () { return [{ t: '> opening learn.html ...', href: 'learn.html' }]; },
    join: function () { jump('#join'); return ['Opening enrollment form... fill in your handle and join.']; },
    members: function () { jump('#members'); return ['Opening member registry...']; },
    contact: function () { jump('#contact'); return ['Opening secure transmission form...']; },
    ai: function () { try { if ($('#chatDrawer').classList.contains('hidden')) toggleChat(); } catch (e) {} return ['TORE-AI online. Ask it anything.']; },
    sound: function (a) { var on = typeof soundEnabled !== 'undefined' && soundEnabled; if (a === 'on' && !on) toggleAudio(); else if (a === 'off' && on) toggleAudio(); else if (a !== 'on' && a !== 'off') return ['usage: sound on | sound off']; return ['sound: ' + (typeof soundEnabled !== 'undefined' && soundEnabled ? 'ON' : 'OFF')]; },
    whoami: function () { return ['guest@torecatsu - Initiate level (join to get a member ID)']; },
    date: function () { return [new Date().toString()]; },
    clear: function () { out.innerHTML = ''; queue = []; return []; },
    exit: function () { closeTerm(); return []; }
  };
  function run(raw) {
    var line = raw.trim(); if (!line) return;
    hist.push(line); hi = hist.length;
    queue.push({ t: '> ' + line, cls: 'cmd', instant: true });
    var p = line.toLowerCase().split(/\s+/), f = CMD[p[0]];
    if (f) { var r = f(p[1]); if (p[0] === 'clear') { return; } if (r && r.length) print(r); else pump(); } else print([{ t: 'command not found: ' + p[0] + '  (type help)', cls: 'err' }]);
    scroll();
  }
  function openTerm() {
    term.classList.add('open'); var ai = $('#aiIntro'); if (ai) ai.classList.remove('show'); beep(640);
    if (!booted) { booted = true; print(['TORE-TERM v1.0 // secure shell (simulated)', 'Type "help" to see commands.', '']); }
    setTimeout(function () { inp.focus(); }, 50);
  }
  function closeTerm() { term.classList.remove('open'); }
  window.toreTerminal = function () { term.classList.contains('open') ? closeTerm() : openTerm(); };
  $('.tt-bar button', term).onclick = closeTerm;
  $('#ttForm').addEventListener('submit', function (e) { e.preventDefault(); skipTyping = false; var v = inp.value; inp.value = ''; run(v); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp') { if (hi > 0) inp.value = hist[--hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(hi + 1, hist.length); inp.value = hist[hi] || ''; e.preventDefault(); }
    else if (e.key === 'Enter' && typing) { skipTyping = true; setTimeout(function () { skipTyping = false; }, 60); }
  });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Escape') { closeTerm(); closeSubj(); closeTx(); }
    if (e.key === '`' && tag !== 'input' && tag !== 'textarea') { e.preventDefault(); window.toreTerminal(); }
  });
  /* ---------- Accessibility: move focus into modals when they open, return it on close ---------- */
  ['authModal', 'projectModal'].forEach(function (id) {
    var m = document.getElementById(id); if (!m || !window.MutationObserver) return; var prev = null;
    new MutationObserver(function () {
      var open = !m.classList.contains('hidden');
      if (open && !m.dataset.on) { m.dataset.on = '1'; prev = document.activeElement; setTimeout(function () { var f = m.querySelector('input,button,a[href]'); if (f) f.focus(); }, 80); }
      else if (!open && m.dataset.on) { delete m.dataset.on; if (prev && prev.focus) prev.focus(); }
    }).observe(m, { attributes: true, attributeFilter: ['class'] });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    try { if (!$('#authModal').classList.contains('hidden')) closeAuthModal(); if (!$('#projectModal').classList.contains('hidden')) closeProjectModal(); } catch (x) {}
  });
  /* ---------- chat example prompts ---------- */
  document.querySelectorAll('.chat-ex').forEach(function (b) { b.addEventListener('click', function () { var i = $('#chatInput'); if (!i) return; i.value = b.textContent; (i.form.requestSubmit ? i.form.requestSubmit() : i.form.dispatchEvent(new Event('submit', { cancelable: true }))); }); });
  /* ---------- current-section indicator in the header ---------- */
  (function () {
    if (!window.IntersectionObserver) return;
    var links = document.querySelectorAll('#mainHeader nav a[href^="#"]'), map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting && map[e.target.id]) { links.forEach(function (l) { l.classList.remove('active-sec'); l.removeAttribute('aria-current'); }); map[e.target.id].classList.add('active-sec'); map[e.target.id].setAttribute('aria-current', 'true'); } }); }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  })();
  /* ---------- never leave "Loading members..." forever ---------- */
  setTimeout(function () { var g = document.getElementById('member-list'); if (g && /Loading members/i.test(g.textContent)) g.innerHTML = '<p class="text-center text-slate-400 text-sm col-span-full">Could not load the member list. Please refresh the page. If it keeps failing, tell us through the contact form.</p>'; }, 9000);
  var tb = $('#termBtn'); if (tb) tb.addEventListener('click', window.toreTerminal);
})();

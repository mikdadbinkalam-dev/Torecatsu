/* TORECATSU: language (EN/BN) + light/dark theme. Loaded in <head> so the saved choice applies before first paint. */
(function () {
  var LS = { get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var root = document.documentElement;
  var st = document.createElement('style');
  st.textContent =
    'html:not([data-lang="bn"]) [lang="bn"]{display:none!important}' +
    'html[data-lang="bn"] [lang="en"]{display:none!important}' +
    'html.light{filter:invert(1) hue-rotate(180deg);background:#fff}' +
    'html.light img,html.light canvas,html.light video,html.light .no-invert{filter:invert(1) hue-rotate(180deg)}' +
    'html[data-lang="bn"] body{font-family:"Outfit","Noto Sans Bengali","Hind Siliguri",sans-serif}' +
    '.tore-tools{display:inline-flex;gap:6px;align-items:center}' +
    '.tore-tools button{font:600 10px "JetBrains Mono",monospace;padding:2px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.12);color:#cbd5e1;background:transparent;cursor:pointer;line-height:1.6}' +
    '.tore-tools button:hover{border-color:#00F0FF;color:#00F0FF}';
  document.head.appendChild(st);

  var lang = LS.get('tore_lang', 'en') === 'bn' ? 'bn' : 'en';
  var theme = LS.get('tore_theme', 'dark') === 'light' ? 'light' : 'dark';
  if (lang === 'bn') root.setAttribute('data-lang', 'bn');
  if (theme === 'light') root.classList.add('light');

  /* exact-text dictionary for the home page and manifesto (English -> Bangla) */
  var D = {
    'ABOUT': 'পরিচিতি', 'MANIFESTO': 'ম্যানিফেস্টো', 'MISSION': 'মিশন', 'PROJECTS': 'প্রজেক্ট', 'SUBJECTS': 'বিষয়',
    'NETWORK': 'নেটওয়ার্ক', 'GLOBAL NETWORK': 'নেটওয়ার্ক', 'COMMUNITY': 'কমিউনিটি', 'MEMBERS': 'সদস্য', 'CONTACT': 'যোগাযোগ',
    'LEARN': 'শিখুন', 'HOME': 'হোম', 'JOIN': 'যোগ দিন',
    '[ ACCESS PORTAL ]': '[ অ্যাক্সেস পোর্টাল ]', 'ACCESS PORTAL': 'অ্যাক্সেস পোর্টাল', 'PORTAL': 'পোর্টাল',
    'JOIN TORECATSU': 'TORECATSU-তে যোগ দিন', 'LOGIN / SIGN UP': 'লগইন / সাইন আপ', 'LAUNCH TORE-AI': 'TORE-AI চালু করুন',
    'KNOW THE SYSTEM.': 'সিস্টেম জানুন।', 'BREAK THE SYSTEM.': 'সিস্টেম ভাঙুন।',
    'Systems Laboratory': 'সিস্টেম ল্যাবরেটরি', 'ALL': 'সব', 'INSPECT': 'দেখুন',
    'Subjects': 'বিষয়সমূহ', 'Explore the sciences and more. Learn together, ask anything.': 'বিজ্ঞান ও আরও অনেক কিছু জানুন। একসাথে শিখুন, যা খুশি জিজ্ঞাসা করুন।',
    'Physics': 'পদার্থবিজ্ঞান', 'Biology': 'জীববিজ্ঞান', 'Chemistry': 'রসায়ন', 'Astrophysics': 'জ্যোতিঃপদার্থবিজ্ঞান', 'Mathematics': 'গণিত', 'Earth Science': 'ভূবিজ্ঞান',
    'Motion, energy, forces, and the laws that govern the universe.': 'গতি, শক্তি, বল এবং মহাবিশ্বের নিয়মকানুন।',
    'Cells, genetics, ecosystems, and the science of living things.': 'কোষ, বংশগতি, বাস্তুতন্ত্র এবং জীবজগতের বিজ্ঞান।',
    'Atoms, molecules, reactions, and how matter changes.': 'পরমাণু, অণু, বিক্রিয়া এবং পদার্থ কীভাবে বদলায়।',
    'Stars, galaxies, black holes, and the origins of the cosmos.': 'তারা, ছায়াপথ, ব্ল্যাক হোল এবং মহাবিশ্বের উৎপত্তি।',
    'Algebra, calculus, geometry, and the language of science.': 'বীজগণিত, ক্যালকুলাস, জ্যামিতি এবং বিজ্ঞানের ভাষা।',
    'Geology, climate, oceans, and the planet we live on.': 'ভূতত্ত্ব, জলবায়ু, সাগর এবং আমাদের গ্রহ।',
    'Decentralized Community Tiers': 'কমিউনিটি স্তর', 'INITIATE': 'ইনিশিয়েট', 'ARCHITECT': 'আর্কিটেক্ট', 'SOVEREIGN': 'সভরেন',
    'OPEN ACCESS': 'সবার জন্য খোলা', 'VETTED BUILDER': 'যাচাই করা নির্মাতা', 'COUNCIL ONLY': 'শুধু কাউন্সিল',
    'Members': 'সদস্য', 'Everyone in the community, with their member ID.': 'কমিউনিটির সবাই, তাদের সদস্য আইডিসহ।',
    'Loading members...': 'সদস্য লোড হচ্ছে...',
    'Initiate Direct Uplink': 'সরাসরি যোগাযোগ করুন',
    'Operator Handle / Name *': 'নাম / হ্যান্ডেল *', 'Encrypted Communication (Email) *': 'ইমেইল *', 'Primary Field of Mastery *': 'প্রধান আগ্রহের বিষয় *',
    'GitHub / Portfolio / PGP Key': 'GitHub / পোর্টফোলিও', 'Statement of Intent (How will you break the system?) *': 'আপনার উদ্দেশ্য (আপনি কীভাবে সিস্টেম ভাঙবেন?) *',
    'TRANSMIT CLEARANCE REQUEST': 'আবেদন পাঠান', 'OR CREATE ACCOUNT - ACCESS PORTAL': 'অথবা অ্যাকাউন্ট খুলুন - অ্যাক্সেস পোর্টাল',
    'Cipher Alias': 'আপনার নাম', 'Subject Channel': 'বিষয়', 'Your Email (for reply)': 'আপনার ইমেইল (উত্তরের জন্য)', 'Encrypted Payload (Message)': 'বার্তা',
    'SEND ENCRYPTED PAYLOAD': 'বার্তা পাঠান', 'OPERATOR LOGIN': 'লগইন', 'REGISTER CIPHER': 'নিবন্ধন', 'AUTHENTICATE': 'লগইন করুন',
    'Operator Key / Identity': 'ইমেইল / পরিচয়', 'Passphrase / Signature': 'পাসওয়ার্ড', 'Remember Session': 'আমাকে মনে রাখুন',
    'Choose Operator Alias': 'নাম বা ডাকনাম', 'Encrypted Mail': 'ইমেইল', 'Master Secret Key': 'পাসওয়ার্ড', 'GENERATE SYSTEM CREDENTIALS': 'অ্যাকাউন্ট তৈরি করুন',
    'ASK ME ANYTHING': 'যা খুশি জিজ্ঞাসা করুন', 'LATER': 'পরে',
    'PRIVACY CHARTER': 'প্রাইভেসি নীতি', 'SMART DISCLOSURES': 'প্রকাশ নীতি',
    'Official TORECATSU Social Grid': 'TORECATSU-এর সোশ্যাল লিংক', 'LEVEL 01': 'স্তর ০১', 'LEVEL 02': 'স্তর ০২', 'LEVEL 03': 'স্তর ০৩',
    'COMMENCE INITIATION': 'শুরু করুন', 'APPLY AS ARCHITECT': 'আর্কিটেক্ট হিসেবে আবেদন', 'AUTHENTICATE CREDENTIALS': 'যাচাই করুন'
  };
  var BN2EN = {}; for (var k in D) BN2EN[D[k]] = k;
  var orig = new WeakMap();
  function apply(toBn) {
    if (!document.body) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { var p = n.parentNode && n.parentNode.nodeName; return (p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    var n;
    while ((n = w.nextNode())) {
      var raw = n.nodeValue, t = raw.trim();
      if (!t) continue;
      if (toBn) {
        if (D[t] && !orig.has(n)) { orig.set(n, raw); n.nodeValue = raw.replace(t, D[t]); }
      } else if (orig.has(n)) { n.nodeValue = orig.get(n); orig.delete(n); }
    }
    var ph = document.querySelectorAll('[placeholder]');
    for (var i = 0; i < ph.length; i++) {
      var e = ph[i], p0 = e.getAttribute('data-ph-en');
      if (toBn && D[e.placeholder] && !p0) { e.setAttribute('data-ph-en', e.placeholder); e.placeholder = D[e.placeholder]; }
      else if (!toBn && p0) { e.placeholder = p0; e.removeAttribute('data-ph-en'); }
    }
  }
  function setLang(l) {
    lang = l; LS.set('tore_lang', l);
    if (l === 'bn') root.setAttribute('data-lang', 'bn'); else root.removeAttribute('data-lang');
    apply(l === 'bn'); refresh();
  }
  function setTheme(t) {
    theme = t; LS.set('tore_theme', t);
    root.classList.toggle('light', t === 'light'); refresh();
  }
  var btns = [];
  function refresh() { btns.forEach(function (f) { f(); }); }
  window.ToreTools = {
    mount: function (el) {
      var box = document.createElement('span'); box.className = 'tore-tools';
      var b1 = document.createElement('button'); b1.type = 'button'; b1.id = 'langBtn';
      var b2 = document.createElement('button'); b2.type = 'button'; b2.id = 'themeBtn';
      b1.onclick = function () { setLang(lang === 'bn' ? 'en' : 'bn'); };
      b2.onclick = function () { setTheme(theme === 'light' ? 'dark' : 'light'); };
      btns.push(function () {
        b1.textContent = lang === 'bn' ? 'EN' : 'বাং'; b1.setAttribute('aria-label', lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন');
        b2.textContent = theme === 'light' ? 'DARK' : 'LIGHT'; b2.setAttribute('aria-label', theme === 'light' ? 'Dark mode' : 'Light mode');
      });
      box.appendChild(b1); box.appendChild(b2); el.appendChild(box); refresh();
    },
    refreshText: function () { if (lang === 'bn') apply(true); }
  };
  document.addEventListener('DOMContentLoaded', function () {
    if (lang === 'bn') { apply(true); setTimeout(function () { apply(true); }, 1500); }
  });
})();

/* =====================================================================
   TORECATSU CINEMATIC INTRO  -  dark katana sequence
   Canvas 2D (no WebGL needed, so it can never fail on weak devices) +
   procedural Web Audio (all sounds are generated here: nothing copyrighted).
   Public API:  ToreIntro.start({sound:true})  ToreIntro.skip()  ToreIntro.replay()
   ===================================================================== */
(function () {
'use strict';
var seen = false; try { seen = sessionStorage.getItem('tore_entered') === '1' || sessionStorage.getItem('tore_cine_seen') === '1'; } catch (e) {}
if (seen && !window.TORE_CINE_FORCE) { window.ToreIntro = { replay: function () { try { sessionStorage.removeItem('tore_entered'); sessionStorage.removeItem('tore_cine_seen'); } catch (e) {} location.reload(); } }; return; }
window.TORE_INTRO_GATE = true; window.TORE_CINE_PENDING = true;
var host = document.createElement('style'); host.textContent = "/* ---------- intro overlay ---------- */ #cine{font-family:Outfit,system-ui,sans-serif;color:#e2e8f0;position:fixed;inset:0;z-index:99999;background:#000;opacity:1;transition:opacity .9s ease} #cine.out{opacity:0;pointer-events:none} #cine.gone{display:none} #cv,#gl{position:absolute;inset:0;width:100%;height:100%;display:block}#gl{pointer-events:none} #gate{z-index:2;position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px;background:#000} #gate .t{font:600 11px 'JetBrains Mono',monospace;letter-spacing:.35em;color:#6f86b8} #gate .row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center} #gate img{width:84px;height:84px;border-radius:16px;mix-blend-mode:screen;opacity:.95} #gate .btn.main{background:linear-gradient(90deg,rgba(122,168,255,.25),rgba(138,91,255,.25));border-color:rgba(160,190,255,.8);color:#fff} #ctl{z-index:3;position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:none;justify-content:space-between;padding:0 16px;pointer-events:none} #ctl button{pointer-events:auto;font:600 11px 'JetBrains Mono',monospace;letter-spacing:.14em;padding:9px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.45);color:#cfd8ee;cursor:pointer} #ctl button:hover,#ctl button:focus-visible{border-color:#9bbcff;color:#fff;outline:none} .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}"; document.head.appendChild(host);
var root = document.createElement('div'); root.id = 'cine'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'TORECATSU intro');
root.innerHTML = '<canvas id="cv" aria-hidden="true"></canvas><canvas id="gl" aria-hidden="true"></canvas><div id="gate"><img src="logo-512.png" alt="TORECATSU logo"><div class="t">KNOW THE SYSTEM &middot; BREAK THE SYSTEM</div><div class="row"><button class="btn main" id="enterSound" type="button">ENTER EXPERIENCE (SOUND ON)</button><button class="btn" id="enterSilent" type="button">ENTER SILENT</button></div><button class="btn" id="enterSkip" type="button" style="border-color:rgba(255,255,255,.2);color:#94a3b8">SKIP INTRO</button><div class="t" style="font-size:9px;letter-spacing:.2em;opacity:.7">HEADPHONES RECOMMENDED &middot; ~11 SECONDS</div></div><div id="ctl"><button id="snd" type="button" aria-pressed="true">SOUND: ON</button><button id="skip" type="button">SKIP INTRO &#9654;</button></div>';
document.body.insertBefore(root, document.body.firstChild);
var LOGO_SRC = 'logo-512.png';
var cine = document.getElementById('cine'), cv = document.getElementById('cv'), ctx = cv.getContext('2d');
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var TAU = Math.PI * 2;

/* ---------------- tiny helpers ---------------- */
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function lerp(a, b, t) { return a + (b - a) * t; }
function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function eio(t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function eout(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function rr(a, b) { return a + (b - a) * rnd(); }

/* ---------------- timeline (story seconds) ---------------- */
var T = { fadeIn: .15, holdEnd: 2.0, textOut: 2.8, glint: 2.7, fall0: 2.9, unsheath: 3.4, engrave: 3.7, sysIn: 4.4, toSys: 4.6, slash0: 5.2, impact: 5.85,
          smokeOpen: 6.3, logoHit: 7.0, tagline: 8.1, outro: 9.8, end: 10.7 };
/* time ramp: very fast fall -> slow-motion hover (engraving readable) -> fast plunge -> hit-stop -> fast release */
function rate(s) {
  if (s < 3.5) return 1;
  if (s < 3.8) return lerp(1, .4, (s - 3.5) / .3);
  if (s < 4.9) return .4;
  if (s < 5.2) return lerp(.4, 1.1, (s - 4.9) / .3);
  if (s < T.impact) return 1.1;
  if (s < T.impact + .22) return lerp(.22, 2.2, (s - T.impact) / .22);
  if (s < T.impact + .6) return lerp(2.2, 1, (s - T.impact - .22) / .38);
  return 1;
}
function realDur(a, b) { var d = 0, st = .005; for (var s = a; s < b; s += st) d += st / rate(s); return d; }

/* ---------------- layout (recomputed on resize) ---------------- */
var W = 0, H = 0, DPR = 1, CX = 0, CY = 0, U = 1, TW = 0, FS1 = 0, FS2 = 0;
var KL = 0, THETA = 90 * Math.PI / 180, SYSDY = 0;     // katana length, slash angle
var sysCv = null, sysMeta = null, vig = null, puffSprite = null, logoImg = null;
var puffs = [], dust = [], shards = [], sparks = [], debris = [], jag = [];
var isSmall = false;

function fontStack(wt) { return wt + ' 100px Cinzel, "Trajan Pro", "Times New Roman", Georgia, serif'; }
function trackedWidth(str, fs, sp, wt) { var w = 0; ctx.font = fontStack(wt || 900).replace('100px', fs + 'px'); for (var i = 0; i < str.length; i++) w += ctx.measureText(str[i]).width + sp * fs; return w - sp * fs; }
function drawTracked(str, cx, cy, fs, sp, fill, glow, wt) {
  ctx.save();
  ctx.font = fontStack(wt || 900).replace('100px', fs + 'px'); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  var tw = 0, i; for (i = 0; i < str.length; i++) tw += ctx.measureText(str[i]).width + sp * fs; tw -= sp * fs;
  var x = cx - tw / 2;
  if (glow) { ctx.shadowColor = glow.c; ctx.shadowBlur = glow.b; }
  ctx.fillStyle = fill;
  for (i = 0; i < str.length; i++) { ctx.fillText(str[i], x, cy); x += ctx.measureText(str[i]).width + sp * fs; }
  ctx.restore();
}
function layout() {
  DPR = Math.min(window.devicePixelRatio || 1, W0() > 900 ? 2 : 1.6);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  CX = W / 2; CY = H / 2; isSmall = W < 640;
  U = Math.min(W, H * 1.35);
  KL = isSmall ? H * .7 : H * .88; SYSDY = H * .2;
  // headline font size so the longest line fits
  var target = W * (isSmall ? .9 : .78), fs = 100, sp = .1;
  var w100 = trackedWidth('BREAK THE SYSTEM', 100, .16, 600); FS1 = Math.min(fs * target / w100, H * .12);
  // SYSTEM word
  TW = W * (isSmall ? .88 : .74);
  var ws = trackedWidth('SYSTEM', 100, .03); FS2 = Math.min(100 * TW / ws, H * .3); TW = trackedWidth('SYSTEM', FS2, .03);
  glResize(); buildSystemWord(); buildSprites(); buildSeed();
}
function W0() { return window.innerWidth; }

/* offscreen metallic SYSTEM word */
function buildSystemWord() {
  // chiselled stone / dark-metal 3D word: extrusion, bevel, grain, cold rim light
  var pad = Math.round(FS2 * .3), cw = Math.ceil(TW + pad * 2), ch = Math.ceil(FS2 * 1.7);
  sysCv = document.createElement('canvas'); sysCv.width = cw; sysCv.height = ch;
  var c = sysCv.getContext('2d'), sp = .03 * FS2, depth = Math.max(4, Math.round(FS2 * .085));
  c.font = fontStack(900).replace('100px', FS2 + 'px'); c.textBaseline = 'middle'; c.textAlign = 'left';
  function word(dx, dy, style, stroke) {
    var x = pad; c.fillStyle = style;
    for (var i = 0; i < 6; i++) { var chr = 'SYSTEM'[i]; if (stroke) c.strokeText(chr, x + dx, ch / 2 + dy); else c.fillText(chr, x + dx, ch / 2 + dy); x += c.measureText(chr).width + sp; }
  }
  // extrusion (depth) going down-right, darker with depth
  for (var d = depth; d >= 1; d--) { var k = d / depth; word(d * .55, d * .9, 'rgb(' + Math.round(10 + 22 * (1 - k)) + ',' + Math.round(12 + 24 * (1 - k)) + ',' + Math.round(22 + 34 * (1 - k)) + ')'); }
  // top face: stone gradient
  var g = c.createLinearGradient(0, ch / 2 - FS2 * .5, 0, ch / 2 + FS2 * .5);
  g.addColorStop(0, '#8d97aa'); g.addColorStop(.35, '#5c6577'); g.addColorStop(.7, '#3a4150'); g.addColorStop(1, '#262b37');
  word(0, 0, g);
  // stone grain / chips
  c.save(); c.globalCompositeOperation = 'source-atop'; seed = 31;
  for (var n = 0; n < 1400; n++) { var gx = rnd() * cw, gy = rnd() * ch, r = rr(.6, 2.4) * (FS2 / 140 + .4); c.fillStyle = rnd() < .5 ? 'rgba(255,255,255,' + rr(.02, .09) + ')' : 'rgba(0,0,0,' + rr(.06, .2) + ')'; c.beginPath(); c.arc(gx, gy, r, 0, TAU); c.fill(); }
  // veins
  c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1;
  for (n = 0; n < 40; n++) { var vx = rnd() * cw, vy = ch * .3 + rnd() * ch * .4; c.beginPath(); c.moveTo(vx, vy); for (var q = 0; q < 5; q++) { vx += rr(-14, 14) * (FS2 / 140 + .4); vy += rr(-9, 9); c.lineTo(vx, vy); } c.stroke(); }
  c.restore();
  // bevel highlights: light edge on top-left, cold-blue rim on the lower-right
  c.lineJoin = 'round'; c.lineWidth = Math.max(1.5, FS2 * .014); c.strokeStyle = 'rgba(210,225,255,.55)'; word(-.5, -.8, 'transparent', true);
  c.lineWidth = Math.max(1, FS2 * .008); c.strokeStyle = 'rgba(110,150,255,.7)'; word(depth * .55 + .5, depth * .9 + .5, 'transparent', true);
  sysMeta = { w: cw, h: ch, pad: pad };
}
function buildSprites() {
  var s = 256; puffSprite = document.createElement('canvas'); puffSprite.width = puffSprite.height = s;
  var c = puffSprite.getContext('2d'); seed = 11;
  for (var i = 0; i < 26; i++) {
    var a = rnd() * TAU, r = rnd() * s * .22, x = s / 2 + Math.cos(a) * r, y = s / 2 + Math.sin(a) * r, rad = s * (.16 + rnd() * .2);
    var g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(80,95,145,.13)'); g.addColorStop(1, 'rgba(150,165,205,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
  }
  vig = ctx.createRadialGradient(CX, CY, Math.min(W, H) * .25, CX, CY, Math.max(W, H) * .78);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.88)');
}
function buildSeed() {
  seed = 99; puffs = []; var np = isSmall ? 20 : 34, i;
  for (i = 0; i < np; i++) puffs.push({ x: rnd(), y: .1 + rnd() * .9, r: rr(.35, .8), vx: rr(-.02, .02) + .018, vy: rr(-.006, .006), rot: rnd() * TAU, vr: rr(-.08, .08), a: rr(.5, 1), fg: i % 4 === 0 });
  dust = []; for (i = 0; i < (isSmall ? 60 : 110); i++) dust.push({ x: rnd(), y: rnd(), z: rr(.3, 1), ph: rnd() * TAU, sp: rr(.01, .035) });
  // jagged seam (line-local coords)
  jag = []; var R = TW * .85, st = Math.max(8, TW / 90);
  for (i = -R; i <= R; i += st) jag.push([i, (rnd() - .5) * Math.max(3, FS2 * .026) * (Math.abs(i) < TW * .6 ? 1 : .2)]);
  sparks = []; for (i = 0; i < (isSmall ? 30 : 52); i++) { var sd = rr(-1, 1) * TW * .5, an = rr(-Math.PI, Math.PI); sparks.push({ u: sd, sp: rr(300, 1100) * (W / 1280 + .4), an: an, life: rr(.45, 1.1), len: rr(.015, .04), hue: rnd() }); }
  // Voronoi fracture of the SYSTEM word: convex chunks, split in two by the slash line
  shards = [];
  var nS = isSmall ? 26 : 40, sites = [], bx0 = CX - sysMeta.w / 2 + sysMeta.pad * .4, bx1 = CX + sysMeta.w / 2 - sysMeta.pad * .4, by0 = CY - FS2 * .62, by1 = CY + FS2 * .7;
  for (i = 0; i < nS; i++) sites.push([rr(bx0, bx1), rr(by0, by1)]);
  var nx = -Math.sin(THETA), ny = Math.cos(THETA);
  function clip(poly, a, b, c0) { var out = [], n = poly.length; for (var k = 0; k < n; k++) { var p = poly[k], q = poly[(k + 1) % n], dp = a * p[0] + b * p[1] - c0, dq = a * q[0] + b * q[1] - c0; if (dp <= 0) out.push(p); if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { var t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return out; }
  for (i = 0; i < nS; i++) {
    var cell = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]];
    for (var j = 0; j < nS && cell.length > 2; j++) { if (j === i) continue; var mx = (sites[i][0] + sites[j][0]) / 2, my = (sites[i][1] + sites[j][1]) / 2, ax = sites[j][0] - sites[i][0], ay = sites[j][1] - sites[i][1]; cell = clip(cell, ax, ay, ax * mx + ay * my); }
    if (cell.length < 3) continue;
    // split by the slash line (through the word centre, direction THETA)
    var c0 = nx * CX + ny * CY, parts = [[clip(cell, nx, ny, c0), -1], [clip(cell, -nx, -ny, -c0), 1]];
    parts.forEach(function (pp) {
      var poly = pp[0]; if (poly.length < 3) return;
      var cx2 = 0, cy2 = 0, ar = 0; poly.forEach(function (v) { cx2 += v[0]; cy2 += v[1]; }); cx2 /= poly.length; cy2 /= poly.length;
      for (var m = 0; m < poly.length; m++) { var v1 = poly[m], v2 = poly[(m + 1) % poly.length]; ar += (v1[0] * v2[1] - v2[0] * v1[1]) / 2; } ar = Math.abs(ar);
      if (ar < 30) return;
      var dx = cx2 - CX, dy = cy2 - CY, dl = Math.hypot(dx, dy) + 1, sc = W / 1280 + .4;
      shards.push({ poly: poly, cx: cx2, cy: cy2, side: pp[1], ar: ar, vx: dx / dl * rr(120, 520) * sc + nx * pp[1] * rr(60, 260) * sc, vy: dy / dl * rr(60, 300) * sc + ny * pp[1] * rr(60, 260) * sc - rr(0, 120) * sc, spin: rr(-1.6, 1.6) / Math.sqrt(1 + ar / 9000), rot0: 0, delay: dl / (W * 6) });
    });
  }
}
/* ---------------- WebGL volumetric smoke (falls back to 2D puffs if WebGL is missing) ---------------- */
var glc = document.getElementById('gl'), gl = null, glOK = false, glU = {}, grain = null, logoA = null, sweepCv = null, reflCv = null;
function glInit() {
  try { gl = glc.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
  if (!gl) return;
  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = 'precision mediump float;uniform vec2 uRes,uLight;uniform float uT,uAmt,uClear,uLI,uViolet,uTy,uTa;' +
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}' +
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}' +
    'float dens(vec2 p,float t){vec2 q=vec2(fbm(p+vec2(0.,t*.05)),fbm(p+vec2(5.2,1.3)-t*.04));vec2 r=vec2(fbm(p+2.*q+vec2(1.7,9.2)+t*.06),fbm(p+2.*q+vec2(8.3,2.8)-t*.05));return fbm(p+2.2*r);}' +
    'void main(){vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;vec2 p=(uv-.5)*vec2(asp,1.)*2.6+vec2(uT*.045,0.);' +
    'float d=dens(p,uT),dx=dens(p+vec2(.07,0.),uT),dy=dens(p+vec2(0.,.07),uT);vec2 g=vec2(dx-d,dy-d)/.07;' +
    'vec2 L=normalize(uLight-uv+1e-4);float rim=clamp(dot(normalize(g+1e-4),-L)*.5+.5,0.,1.);' +
    'float dn=smoothstep(.36,.78,d);' +
    'float dist=distance(uv*vec2(asp,1.),vec2(.5*asp,.5));float clear=uClear>0.?smoothstep(uClear*.65,uClear*1.15,dist):1.;' +
    'float lf=exp(-distance(uv*vec2(asp,1.),uLight*vec2(asp,1.))*2.0)*uLI;' +
    'vec3 cold=vec3(.16,.28,.85),vio=vec3(.5,.28,.95);vec3 lc=mix(cold,vio,uViolet);' +
    'vec3 col=vec3(.012,.014,.03)+lc*(rim*rim*1.5+.18)*lf*dn;' +
    'float tc=abs(uv.x-.5)*asp;float tear=uTa*(1.-smoothstep(.02,.16,tc))*step(uTy,uv.y);float a=dn*uAmt*clear*(1.-tear*.92);gl_FragColor=vec4(col*a,a);}';
  function sh(t, src) { var o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
  try {
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uLight', 'uT', 'uAmt', 'uClear', 'uLI', 'uViolet', 'uTy', 'uTa'].forEach(function (n) { glU[n] = gl.getUniformLocation(pr, n); });
    glOK = true;
  } catch (e) { glOK = false; gl = null; }
}
function glResize() { if (!glOK) return; var sc = isSmall ? .36 : .5; glc.width = Math.max(2, Math.round(W * sc)); glc.height = Math.max(2, Math.round(H * sc)); gl.viewport(0, 0, glc.width, glc.height); }
function glFrame(s, amt, clear, lx, ly, li, vio, ty, ta) {
  if (!glOK) return; gl.viewport(0, 0, glc.width, glc.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (amt <= .003) return;
  gl.uniform2f(glU.uRes, glc.width, glc.height); gl.uniform2f(glU.uLight, lx, 1 - ly); gl.uniform1f(glU.uT, s); gl.uniform1f(glU.uAmt, amt); gl.uniform1f(glU.uClear, clear); gl.uniform1f(glU.uLI, li); gl.uniform1f(glU.uViolet, vio); gl.uniform1f(glU.uTy, ty || 0); gl.uniform1f(glU.uTa, ta || 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
function buildGrain() { grain = document.createElement('canvas'); grain.width = grain.height = 160; var c = grain.getContext('2d'), d = c.createImageData(160, 160); for (var i = 0; i < d.data.length; i += 4) { var v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } c.putImageData(d, 0, 0); }
function prepLogo(img) {   // turn the logo's black background into transparency so it can glow, reflect and catch light
  var n = img.naturalWidth || 512; logoA = document.createElement('canvas'); logoA.width = logoA.height = n; var c = logoA.getContext('2d'); c.drawImage(img, 0, 0, n, n);
  try { var d = c.getImageData(0, 0, n, n), p = d.data; for (var i = 0; i < p.length; i += 4) { var m = Math.max(p[i], p[i + 1], p[i + 2]); p[i + 3] = Math.min(255, m * 2.2); } c.putImageData(d, 0, 0); } catch (e) { /* tainted canvas: use the plain logo */ }
  sweepCv = document.createElement('canvas'); sweepCv.width = sweepCv.height = n; reflCv = document.createElement('canvas'); reflCv.width = n; reflCv.height = Math.round(n * .5);
}

/* ---------------- audio (all synthesized, original) ---------------- */
var A = { ctx: null, master: null, wet: null, noiseBuf: null, on: true, started: false, rumble: null };
function audioInit() {
  var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  var c = A.ctx = new AC();
  var comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = .003; comp.release.value = .25;
  A.master = c.createGain(); A.master.gain.value = A.on ? .9 : 0; A.master.connect(comp); comp.connect(c.destination);
  var conv = c.createConvolver(), len = c.sampleRate * 2.6, ir = c.createBuffer(2, len, c.sampleRate);
  for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  conv.buffer = ir; A.wet = c.createGain(); A.wet.gain.value = .32; conv.connect(A.wet); A.wet.connect(A.master); A.conv = conv;
  var nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0); for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; A.noiseBuf = nb;
  return true;
}
function out(node, verb) { node.connect(A.master); if (verb) { var s = A.ctx.createGain(); s.gain.value = verb; node.connect(s); s.connect(A.conv); } }
function tone(o) {
  var c = A.ctx, t = c.currentTime + (o.when || 0), osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.sweep || o.dur));
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain, t + (o.att || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + o.dur);
  osc.connect(g); out(g, o.verb); osc.start(t); osc.stop(t + o.dur + .05); return g;
}
function noise(o) {
  var c = A.ctx, t = c.currentTime + (o.when || 0), src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = A.noiseBuf; src.loop = true; f.type = o.type || 'bandpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f0, t);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain, t + (o.att || .01));
  if (o.hold) g.gain.setValueAtTime(o.gain, t + o.hold);
  g.gain.exponentialRampToValueAtTime(.0001, t + o.dur);
  src.connect(f); f.connect(g); out(g, o.verb); src.start(t, Math.random()); src.stop(t + o.dur + .05); return g;
}
var cuesDone = {};
function cue(name, fn) { if (cuesDone[name] || !A.ctx || !A.started) return; cuesDone[name] = 1; try { fn(); } catch (e) {} }
function audioCues(s) {
  if (s >= 0) cue('rumble', function () { tone({ f: 41, type: 'sine', gain: .5, att: 3.2, dur: 7.4 }); noise({ type: 'lowpass', f0: 140, q: .5, gain: .35, att: 3, dur: 7.4, verb: .2 }); tone({ f: 82, type: 'sine', gain: .12, att: 3.5, dur: 7 }); });
  if (s >= 1.9) cue('riser1', function () { tone({ f: 70, to: 260, type: 'sine', gain: .12, att: 1.2, dur: 1.9, verb: .4 }); noise({ f0: 300, f1: 2400, q: 1.5, gain: .09, att: 1.2, dur: 1.9, verb: .5 }); });
  if (s >= T.fall0) cue('unsheath', function () {
    noise({ f0: 1800, f1: 8200, q: 7, gain: .26, att: .02, dur: 1.0, verb: .45 });
    noise({ type: 'highpass', f0: 5200, q: .7, gain: .08, att: .04, dur: .9 });
    [2210, 3340, 5120, 7400].forEach(function (f, i) { tone({ f: f, gain: .055 / (i + 1), att: .01, dur: 2.2 - i * .3, when: .05 + i * .02, verb: .6 }); });
  });
  if (s >= T.fall0 - .05) cue('fall', function () { noise({ f0: 4200, f1: 260, q: 1.6, gain: .5, att: .03, dur: .75, verb: .3 }); tone({ f: 520, to: 70, type: 'sawtooth', gain: .05, att: .02, dur: .7, sweep: .6, verb: .3 }); });
  if (s >= T.toSys) cue('anticip', function () {
    var d = realDur(T.toSys, T.impact);
    tone({ f: 55, to: 520, type: 'sawtooth', gain: .06, att: d * .7, dur: d, sweep: d, verb: .3 });
    tone({ f: 110, to: 880, gain: .08, att: d * .8, dur: d, sweep: d, verb: .4 });
    noise({ type: 'highpass', f0: 800, f1: 6000, q: .7, gain: .1, att: d * .85, dur: d, verb: .2 });
    tone({ f: 58, to: 40, gain: .55, att: .004, dur: .5, when: .35 }); tone({ f: 58, to: 40, gain: .65, att: .004, dur: .5, when: 1.0 });
  });
  if (s >= T.slash0) cue('whoosh', function () {
    var d = realDur(T.slash0, T.impact);
    noise({ f0: 260, f1: 2800, q: 2.2, gain: .38, att: d * .8, dur: d, verb: .35 });
    noise({ type: 'lowpass', f0: 500, f1: 120, q: .6, gain: .25, att: d * .6, dur: d + .2 });
  });
  if (s >= T.impact) cue('impact', function () {
    if (A.master) { A.master.gain.cancelScheduledValues(A.ctx.currentTime); A.master.gain.setValueAtTime(A.master.gain.value, A.ctx.currentTime); A.master.gain.linearRampToValueAtTime(A.on ? .95 : 0, A.ctx.currentTime + .05); }
    tone({ f: 120, to: 30, gain: 1.0, att: .003, dur: 1.9, sweep: .55, verb: .25 });
    tone({ f: 62, to: 34, gain: .8, att: .003, dur: 2.4, verb: .2 });
    noise({ type: 'lowpass', f0: 420, f1: 60, q: .7, gain: .75, att: .003, dur: .8, verb: .3 });
    noise({ type: 'highpass', f0: 3200, q: .8, gain: .55, att: .001, dur: .12 });
    [1180, 1930, 3160, 4720, 6900].forEach(function (f, i) { tone({ f: f, gain: .2 / (1 + i * .5), att: .001, dur: 1.5 - i * .18, verb: .55 }); });
    for (var i = 0; i < 16; i++) noise({ f0: rr(1800, 6500), q: 4, gain: rr(.05, .13), att: .001, dur: rr(.02, .06), when: .06 + rnd() * 1.3, verb: .3 });
    tone({ f: 220, gain: .09, att: .02, dur: 3, verb: .8 });
    noise({ type: 'lowpass', f0: 1100, f1: 40, q: .6, gain: 1.0, att: .002, dur: 1.7, verb: .45 });
  });
  if (s >= T.logoHit) cue('logo', function () {
    tone({ f: 64, to: 44, gain: .95, att: .005, dur: 2.6, sweep: .8, verb: .25 });
    noise({ type: 'lowpass', f0: 300, f1: 70, gain: .5, att: .004, dur: .6 });
    [660, 990, 1485, 2240, 3350].forEach(function (f, i) { tone({ f: f, gain: .07 / (1 + i * .45), att: .01, dur: 4.2 - i * .4, verb: .9 }); });
    [110, 164.8, 220, 329.6].forEach(function (f) { tone({ f: f, type: 'triangle', gain: .09, att: 1.4, dur: 4.5, verb: .9 }); });
    tone({ f: 3520, gain: .03, att: .005, dur: 1.8, verb: 1 });
    noise({ type: 'highpass', f0: 6000, gain: .1, att: .002, dur: .25 });
  });
}
function audioFadeOut() { if (!A.ctx) return; try { var t = A.ctx.currentTime; A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(A.master.gain.value, t); A.master.gain.linearRampToValueAtTime(0, t + .6); setTimeout(function () { try { A.ctx.close(); } catch (e) {} A.ctx = null; A.started = false; }, 800); } catch (e) {} }

/* ---------------- drawing pieces ---------------- */
function smoke(s, amount, part, fgPass) {
  if (amount <= .002) return;
  var t = s;
  for (var i = 0; i < puffs.length; i++) {
    var p = puffs[i]; if (!!p.fg !== !!fgPass) continue;
    var x = ((p.x + p.vx * t) % 1.4 + 1.4) % 1.4 - .2, y = p.y + p.vy * t + Math.sin(t * .35 + i) * .015;
    var px = x * W, py = y * H, size = p.r * Math.max(W, H) * 1.05 * (1 + part * .8);
    var a = amount * p.a * .24;
    if (part > 0) { var dx = px - CX, dy = py - CY, dist = Math.sqrt(dx * dx + dy * dy), clear = part * Math.max(W, H) * .65; a *= sstep(clear * .55, clear * 1.1, dist); px += dx * part * .35; py += dy * part * .35; }
    if (a <= .004) continue;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(px, py); ctx.rotate(p.rot + p.vr * t); ctx.drawImage(puffSprite, -size / 2, -size / 2, size, size); ctx.restore();
  }
}
function dustLayer(s, amt) {
  if (amt <= .01) return; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < dust.length; i++) {
    var d = dust[i], x = ((d.x + Math.sin(s * .2 + d.ph) * .02) % 1 + 1) % 1, y = ((d.y - d.sp * s * d.z) % 1 + 1) % 1;
    var tw = .5 + .5 * Math.sin(s * 1.7 + d.ph * 3); ctx.globalAlpha = amt * d.z * tw * .5; ctx.fillStyle = i % 5 ? '#9db8ff' : '#b79bff';
    var r = (.6 + d.z * 1.4) * (W / 1280 + .5); ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* katana drawn in local coordinates: guard at x=0, tip at x=KL, blade points +x */
function bladePath(c, L, bw) {
  var k = L * .045;                                     // blade curvature toward the tip
  var x0 = L * .03, n = 26;
  c.beginPath();
  // spine (top) from guard to tip
  for (var i = 0; i <= n; i++) { var u = i / n, x = lerp(x0, L, u), cy = -k * u * u, w = bw * (1 - .3 * u) * .5; if (u > .955) w *= (1 - (u - .955) / .045) * .9 + .1; c[i ? 'lineTo' : 'moveTo'](x, cy - w * (u > .955 ? (1 - (u - .955) / .045) * .3 + .7 : 1)); }
  c.lineTo(L * 1.012, -k + bw * .02);                  // kissaki point
  for (i = n; i >= 0; i--) { u = i / n; x = lerp(x0, L, u); cy = -k * u * u; w = bw * (1 - .3 * u) * .5; if (u > .955) w *= (1 - (u - .955) / .045) * .75 + .25; c.lineTo(x, cy + w); }
  c.closePath();
}
function bladeCenterY(L, u) { return -L * .045 * u * u; }
function drawKatana(c, L, lit, sweep, engr, glowBlue, seamLight, tms) {
  var bw = L * .088, k = L * .045;
  c.save();
  // ---- tsuka (wrapped handle)
  var th = L * .044, tx0 = -L * .31, tx1 = -L * .025;
  var g = c.createLinearGradient(0, -th, 0, th); g.addColorStop(0, '#040409'); g.addColorStop(.45, '#171728'); g.addColorStop(1, '#030307');
  c.fillStyle = g; c.beginPath(); c.moveTo(tx0, -th * .9); c.lineTo(tx1, -th); c.lineTo(tx1, th); c.lineTo(tx0, th * .9); c.quadraticCurveTo(tx0 - L * .02, 0, tx0, -th * .9); c.closePath(); c.fill();
  c.save(); c.clip(); c.lineWidth = Math.max(1, L * .0016);
  for (var x = tx0; x < tx1; x += L * .021) { c.strokeStyle = 'rgba(10,10,18,.95)'; c.beginPath(); c.moveTo(x, -th); c.lineTo(x + th, 0); c.lineTo(x, th); c.stroke(); c.strokeStyle = 'rgba(90,100,200,' + (.1 + .28 * lit) + ')'; c.beginPath(); c.moveTo(x + L * .0035, -th); c.lineTo(x + th + L * .0035, 0); c.lineTo(x + L * .0035, th); c.stroke(); c.beginPath(); c.moveTo(x + L * .0105, -th); c.lineTo(x + L * .0105 - th, 0); c.lineTo(x + L * .0105, th); c.stroke(); }
  var hg = c.createLinearGradient(0, -th, 0, th); hg.addColorStop(0, 'rgba(120,130,255,' + (.22 * lit) + ')'); hg.addColorStop(.3, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = hg; c.fillRect(tx0, -th, tx1 - tx0, th * 2);
  c.restore();
  c.fillStyle = 'rgba(160,140,255,' + (.35 + .5 * lit) + ')'; c.beginPath(); c.moveTo(-L * .17, -L * .009); c.lineTo(-L * .162, 0); c.lineTo(-L * .17, L * .009); c.lineTo(-L * .178, 0); c.closePath(); c.fill();   // menuki
  c.fillStyle = '#0b0b14'; c.strokeStyle = 'rgba(140,150,230,' + (.25 + .4 * lit) + ')'; c.lineWidth = Math.max(1, L * .0018); c.beginPath(); c.ellipse(tx0, 0, L * .013, th * .98, 0, 0, TAU); c.fill(); c.stroke();      // kashira
  // ---- tsuba (guard)
  var tg = c.createLinearGradient(0, -L * .07, 0, L * .07); tg.addColorStop(0, '#2a2b3a'); tg.addColorStop(.5, '#0a0a12'); tg.addColorStop(1, '#1c1d2b');
  c.fillStyle = tg; c.strokeStyle = 'rgba(160,130,255,' + (.35 + .5 * lit) + ')'; c.lineWidth = Math.max(1, L * .003);
  c.beginPath(); c.ellipse(-L * .006, 0, L * .015, L * .07, 0, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(140,170,255,' + (.18 + .3 * lit) + ')'; c.lineWidth = Math.max(1, L * .0012); c.beginPath(); c.ellipse(-L * .006, 0, L * .0085, L * .05, 0, 0, TAU); c.stroke();
  for (var i2 = -2; i2 <= 2; i2++) { c.fillStyle = 'rgba(190,200,255,' + (.2 + .4 * lit) + ')'; c.beginPath(); c.arc(-L * .006, i2 * L * .022, L * .0028, 0, TAU); c.fill(); }
  // ---- habaki (collar)
  var hb = c.createLinearGradient(0, -bw, 0, bw); hb.addColorStop(0, '#1b170c'); hb.addColorStop(.5, '#9a8650'); hb.addColorStop(1, '#17130a');
  c.globalAlpha *= (.5 + .5 * lit); c.fillStyle = hb; c.fillRect(L * .006, -bw * .62, L * .036, bw * 1.24); c.globalAlpha /= (.5 + .5 * lit);
  // ---- blade body
  function path() {
    var x0 = L * .03, n = 30, u, w, cy; c.beginPath();
    for (var q = 0; q <= n; q++) { u = q / n; cy = -k * u * u; w = bw * (1 - .3 * u) * .5; if (u > .955) w *= .35 + .65 * (1 - (u - .955) / .045); c[q ? 'lineTo' : 'moveTo'](lerp(x0, L, u), cy - w); }
    c.lineTo(L * 1.014, -k + bw * .03);
    for (q = n; q >= 0; q--) { u = q / n; cy = -k * u * u; w = bw * (1 - .3 * u) * .5; if (u > .955) w *= .1 + .9 * (1 - (u - .955) / .045); c.lineTo(lerp(x0, L, u), cy + w); }
    c.closePath();
  }
  path();
  var bg = c.createLinearGradient(0, -bw * .55, 0, bw * .55);
  bg.addColorStop(0, '#07090f'); bg.addColorStop(.3, '#2b3345'); bg.addColorStop(.47, '#6c7a98'); bg.addColorStop(.52, '#cdd9f2'); bg.addColorStop(.58, '#3c465e'); bg.addColorStop(.85, '#8a9bc0'); bg.addColorStop(1, '#dde8ff');
  c.fillStyle = bg; c.fill();
  c.save(); path(); c.clip();
  if (lit < 1) { c.fillStyle = 'rgba(1,2,6,' + (1 - lit) * .94 + ')'; c.fillRect(-L * .1, -bw * 2, L * 1.3, bw * 4); }
  // hamon (temper line) and ridge
  c.strokeStyle = 'rgba(225,236,255,' + (.5 * lit) + ')'; c.lineWidth = Math.max(1, bw * .055); c.beginPath();
  for (var i = 0; i <= 120; i++) { var u2 = i / 120; c[i ? 'lineTo' : 'moveTo'](lerp(L * .05, L * .97, u2), -k * u2 * u2 + bw * (.2 + .07 * Math.sin(u2 * 70) * Math.sin(u2 * 9.1))); } c.stroke();
  c.strokeStyle = 'rgba(2,4,10,' + (.55 * lit) + ')'; c.lineWidth = Math.max(1, bw * .05); c.beginPath(); c.moveTo(L * .04, -bw * .08); for (i = 1; i <= 30; i++) { u2 = i / 30; c.lineTo(lerp(L * .04, L * .96, u2), -k * u2 * u2 - bw * .08 * (1 - .3 * u2)); } c.stroke();
  // narrow cold-blue light reflection sweeping along the blade
  if (sweep >= 0 && sweep <= 1.4) { var sx = lerp(-L * .1, L * 1.1, sweep), sg = c.createLinearGradient(sx - L * .07, 0, sx + L * .07, 0); sg.addColorStop(0, 'rgba(110,160,255,0)'); sg.addColorStop(.5, 'rgba(225,238,255,1)'); sg.addColorStop(1, 'rgba(110,160,255,0)'); c.globalCompositeOperation = 'lighter'; c.fillStyle = sg; c.fillRect(sx - L * .07, -bw, L * .14, bw * 2); c.globalCompositeOperation = 'source-over'; }
  // edge (cutting side) light line
  c.strokeStyle = 'rgba(180,212,255,' + (.3 + .7 * lit) + ')'; c.lineWidth = Math.max(1, bw * .07); c.beginPath(); for (i = 0; i <= 60; i++) { u2 = i / 60; c[i ? 'lineTo' : 'moveTo'](lerp(L * .03, L, u2), -k * u2 * u2 + bw * (1 - .3 * u2) * .5); } c.stroke();
  // engraved / illuminated TORECATSU
  if (engr > 0) {
    var fs = bw * .5, text = 'TORECATSU', sp = fs * .3;
    c.font = '700 ' + fs + 'px Cinzel, "Times New Roman", serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
    var tot = 0, kk; for (kk = 0; kk < text.length; kk++) tot += c.measureText(text[kk]).width + sp; var xcur = L * .5 - tot / 2;
    for (kk = 0; kk < text.length; kk++) {
      var chw = c.measureText(text[kk]).width, uu = (xcur + chw / 2) / L, ang = Math.atan2(-2 * .045 * uu, 1), inten = clamp(engr * 1.7 - (kk / text.length) * .7, 0, 1);
      c.save(); c.translate(xcur, -k * uu * uu - bw * .02); c.rotate(ang);
      c.fillStyle = 'rgba(0,0,0,' + (.55 * inten) + ')'; c.fillText(text[kk], .8, 1.3);
      c.shadowColor = 'rgba(120,170,255,' + inten + ')'; c.shadowBlur = fs * 1.1 * inten;
      c.fillStyle = 'rgba(' + Math.round(lerp(60, 225, inten)) + ',' + Math.round(lerp(80, 238, inten)) + ',255,' + (.3 + .7 * inten) + ')'; c.fillText(text[kk], 0, 0); c.restore();
      xcur += chw + sp;
    }
  }
  if (seamLight > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(160,200,255,' + (.3 * seamLight) + ')'; c.fillRect(-L * .1, -bw, L * 1.3, bw * 2); }
  c.restore();
  // ---- blue-violet energy hugging the cutting edge + drifting wisps
  if (glowBlue > 0) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (var pass = 0; pass < 3; pass++) {
      c.strokeStyle = pass === 0 ? 'rgba(90,130,255,' + (.16 * glowBlue) + ')' : pass === 1 ? 'rgba(130,160,255,' + (.35 * glowBlue) + ')' : 'rgba(215,230,255,' + (.85 * glowBlue) + ')';
      c.lineWidth = [bw * .55, bw * .22, Math.max(1, bw * .06)][pass]; c.shadowColor = 'rgba(100,140,255,.9)'; c.shadowBlur = [bw * .8, bw * .5, bw * .2][pass]; c.beginPath();
      for (i = 0; i <= 60; i++) { u2 = i / 60; c[i ? 'lineTo' : 'moveTo'](lerp(L * .04, L * 1.005, u2), -k * u2 * u2 + bw * (1 - .3 * u2) * .5 + bw * .03); } c.stroke();
    }
    c.shadowBlur = 0; c.lineWidth = Math.max(1, bw * .05);
    for (var wv = 0; wv < 5; wv++) {
      var ph = wv * 1.7, a0 = .5 + .5 * Math.sin(tms * 1.3 + ph); c.strokeStyle = 'rgba(' + (wv % 2 ? '150,120,255' : '120,170,255') + ',' + (.32 * glowBlur(glowBlue) * a0) + ')'; c.beginPath();
      for (i = 0; i <= 28; i++) { u2 = .45 + .55 * i / 28; var wy = -k * u2 * u2 + bw * .55 + Math.sin(u2 * 18 + tms * 2.2 + ph) * bw * (.15 + .5 * (i / 28)) * (1 + wv * .25) + wv * bw * .12; c[i ? 'lineTo' : 'moveTo'](u2 * L, wy); } c.stroke();
    }
    c.restore();
  }
  c.restore();
}
function glowBlur(g) { return g; }
function seamProgress(s) { return clamp((s - T.slash0) / (T.impact - T.slash0), 0, 1); }
function pose(s) {
  var P = {}, k = KL * .045, SY = CY + SYSDY, PAN0 = H * .2, Y0 = -H * .3, YH = H * .36;
  var f = clamp((s - T.fall0) / (T.unsheath - T.fall0), 0, 1), Y;
  if (s < T.slash0) Y = lerp(Y0, YH, 1 - Math.pow(1 - f, 4)) + H * .03 * sstep(T.unsheath, T.slash0, s);
  else { var p = seamProgress(s); Y = lerp(YH + H * .03, SY, Math.pow(p, 2.2)); }
  var sway = s < T.slash0 ? .035 * Math.sin(s * 1.4) * sstep(T.unsheath, T.unsheath + .5, s) : 0, ang = Math.PI / 2 + sway;
  P.ang = ang; P.tip = [CX, Y]; P.tipPos = Y; P.p = seamProgress(s);
  P.ox = CX - k - Math.cos(ang) * KL; P.oy = Y - Math.sin(ang) * KL;
  P.alpha = (s < T.glint ? 0 : sstep(T.glint, T.glint + .4, s)) * (1 - sstep(T.impact + .12, T.impact + .6, s));
  P.lit = s < T.unsheath ? .12 + .5 * sstep(T.fall0, T.unsheath, s) : lerp(.62, 1, sstep(T.unsheath, T.unsheath + .6, s));
  P.sweep = s < T.fall0 ? -1 : s < T.unsheath + 1.6 ? clamp((s - T.fall0) / 1.8, 0, 1) * 1.3 - .1 : -1;
  P.engr = clamp(sstep(T.engrave, T.engrave + 1.0, s), 0, 1);
  P.pan = s < T.toSys ? PAN0 : PAN0 * (1 - eio((s - T.toSys) / .9));
  var z = 1 + .05 * sstep(3.6, 4.8, s) * (1 - sstep(4.8, 5.7, s));
  if (s > T.impact) z = 1.04 - .04 * eout((s - T.impact) / 1.0);
  P.zoom = z; P.fall = f;
  return P;
}
/* ---------------- main render (pure function of story time) ---------------- */
function render(s) {
  var c = ctx; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  var P = pose(s), tau = s - T.impact, afterImpact = tau >= 0;
  // camera (zoom + shake) around the screen centre; zoom is eased so the focus point drifts to the blade centre in scene 3
  var shake = (tau > 0 && tau < .9) ? 15 * Math.exp(-tau * 6.5) * (W / 1280 + .45) : 0;
  var shx = shake * Math.sin(tau * 91.3) , shy = shake * Math.cos(tau * 77.1);
  var zc = P.zoom;
  c.save(); c.translate(CX + shx, CY + shy); c.scale(zc, zc); c.translate(-CX, -CY); c.translate(0, P.pan);

  // ambient cold glow behind the action
  var glowA = sstep(2.4, 3.8, s) * (1 - sstep(T.impact - .2, T.impact + .6, s)) * .5; if (glowA > 0) { var g = c.createRadialGradient(CX, CY, 0, CX, CY, U * .7); g.addColorStop(0, 'rgba(60,95,210,' + glowA * .32 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-W, -H, W * 3, H * 3); }

  // smoke amount profile (GL smoke is composited on top at the end of render)
  var smokeAmt = sstep(1.8, 3.1, s) * (1 - .25 * sstep(3.6, 4.4, s)) * (1 - .3 * sstep(5.0, 5.8, s));
  var part = sstep(T.smokeOpen, T.smokeOpen + 1.5, s);
  if (s > T.impact) smokeAmt = Math.max(smokeAmt, .78 * sstep(T.impact, T.impact + .5, s)) * (1 - sstep(7.6, 9.0, s) * .35);
  if (!glOK) smoke(s, smokeAmt * 1.4, part, false);
  dustLayer(s, sstep(1.5, 3, s) * .9 + sstep(7, 8, s) * .5);

  // ---- scene 1: headline (serif, cold-blue glow, light flare between the lines)
  if (s < T.textOut + .1) {
    var ta = sstep(T.fadeIn, .95, s) * (1 - sstep(T.holdEnd, T.textOut, s)), sp = lerp(.34, .15, eout(s / 2.6));
    if (ta > 0.002) {
      c.save(); c.globalAlpha = ta;
      var gl2 = { c: 'rgba(90,140,255,.8)', b: FS1 * .55 * (.6 + .4 * ta) }, gy = c.createLinearGradient(0, CY - FS1 * 1.2, 0, CY + FS1 * 1.2);
      gy.addColorStop(0, '#f6f8ff'); gy.addColorStop(.5, '#b9c9f2'); gy.addColorStop(1, '#8da6e6');
      drawTracked('KNOW THE SYSTEM', CX, CY - FS1 * .78, FS1, sp, gy, gl2, 600);
      drawTracked('BREAK THE SYSTEM', CX, CY + FS1 * .78, FS1, sp, gy, gl2, 600);
      c.globalCompositeOperation = 'lighter'; var fl = c.createLinearGradient(CX - W * .3, 0, CX + W * .3, 0); fl.addColorStop(0, 'rgba(90,140,255,0)'); fl.addColorStop(.5, 'rgba(170,205,255,' + (.9 * sstep(.3, 1.2, s)) + ')'); fl.addColorStop(1, 'rgba(90,140,255,0)');
      c.fillStyle = fl; c.fillRect(CX - W * .3, CY - 1.5, W * .6, 3); c.restore();
    }
  }

  // ---- SYSTEM word (scene 4) + split
  if (s >= T.sysIn - .1 && s < 7.7) { c.save(); c.translate(0, SYSDY); drawSystem(c, s, P, tau); c.restore(); }

  // ---- katana
  if (P.alpha > .002 && !(afterImpact && P.tipPos > TW * 3)) {
    c.save(); c.globalAlpha = P.alpha; c.translate(P.ox, P.oy); c.rotate(P.ang);
    drawKatana(c, KL, P.lit, P.sweep, P.engr, sstep(T.glint, T.unsheath + 1, s) * .85, 0, s);
    c.restore();
    // speed streaks while it falls / plunges
    var spd = s < T.unsheath ? 1 - P.fall * .85 : (s > T.slash0 && s < T.impact ? sstep(0, .35, P.p) : 0);
    if (spd > .02) { c.save(); c.globalCompositeOperation = 'lighter'; for (var q = 0; q < 16; q++) { var rx = ((Math.sin(q * 12.9898) * 43758.5453) % 1 + 1) % 1, xx = CX + (rx - .5) * U * .42, ln = U * (.25 + .35 * rx) * spd, yy = P.tip[1] - ln * .3 - (q % 3) * U * .05; var sg = c.createLinearGradient(0, yy - ln, 0, yy); sg.addColorStop(0, 'rgba(140,180,255,0)'); sg.addColorStop(1, 'rgba(190,215,255,' + (.35 * spd * (1 - Math.abs(rx - .5))) + ')'); c.fillStyle = sg; c.fillRect(xx, yy - ln, Math.max(1, U * .0018), ln); } c.restore(); }
  }
  // foreground smoke over the katana (it emerges from it)
  if (!glOK) smoke(s, (1 - sstep(3.4, 5.0, s) * .8) * smokeAmt * (s < 5.4 ? 1 : 0), 0, true);

  // impact fx
  if (afterImpact) { c.save(); c.translate(0, SYSDY); impactFx(c, tau); c.restore(); }
  c.restore();

  // ---- scene 5: logo
  if (s >= T.logoHit - .6) drawLogo(c, s);

  // vignette + flash (screen space)
  c.fillStyle = vig; c.fillRect(0, 0, W, H);
  if (afterImpact && tau < .4) { c.fillStyle = 'rgba(215,230,255,' + (.34 * Math.exp(-tau * 20)) + ')'; c.fillRect(0, 0, W, H); }
  // volumetric smoke on top (lit by a cold light that follows the action), then film grain
  if (glOK) {
    var lx = .5 + .14 * Math.sin(s * .45), ly = .52, li = sstep(2.4, 3.6, s) * .8, vio = sstep(T.logoHit - .5, T.logoHit + .3, s) * .85;
    if (s >= T.fall0 && s < T.impact) { lx = .5; ly = clamp((P.tip[1] + P.pan) / H, 0, 1); li = 1.0; }
    if (s >= T.impact && s < T.logoHit + .85) { li = .8 + .5 * Math.exp(-tau * 3); lx = .5; ly = (CY + SYSDY) / H; }
    if (s >= T.logoHit + .85) { lx = .5; ly = .47; li = lerp(1, 1.15, sstep(T.logoHit + .85, T.logoHit + 1.25, s)); }
    var clearR = sstep(T.smokeOpen, T.smokeOpen + 1.7, s) * .66, tearA = sstep(T.fall0, T.fall0 + .15, s) * (1 - sstep(T.impact - .4, T.impact, s)) * .9;
    glFrame(s, (s > T.impact && s < T.impact + .6) ? smokeAmt * (.35 + .65 * sstep(T.impact, T.impact + .6, s)) : smokeAmt, clearR, lx, ly, li, vio, 1 - clamp((P.tip[1] + P.pan) / H, 0, 1), tearA);
  }
  if (grain) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .045; var gx = (Math.floor(s * 24) * 37) % 160, gy2 = (Math.floor(s * 24) * 91) % 160; c.fillStyle = c.createPattern(grain, 'repeat'); c.translate(-gx, -gy2); c.fillRect(0, 0, W + 160, H + 160); c.restore(); }
}

function drawSystem(c, s, P, tau) {
  var appear = sstep(T.sysIn, T.sysIn + .9, s), scl = lerp(.78, 1, eout((s - T.sysIn) / 1.3));
  var vanish = 1 - sstep(T.impact + .9, T.impact + 1.9, s);
  var ox = CX - sysMeta.w / 2, oy = CY - sysMeta.h / 2;
  if (tau < 0) {
    c.save(); c.globalAlpha = appear; c.translate(CX, CY); c.scale(scl, scl); c.translate(-CX, -CY); c.drawImage(sysCv, ox, oy);
    c.restore(); return;
  }
  c.save();
  for (var j = 0; j < shards.length; j++) {
    var sh = shards[j], t2 = Math.max(0, tau - sh.delay), ex = 1 - Math.exp(-t2 * 2.2), fall = t2 * t2 * 230 * (W / 1280 + .4);
    var ox2 = sh.vx * ex * 1.5, oy2 = sh.vy * ex * 1.5 + fall, al = vanish * (1 - sstep(.9, 2.2, t2) * .4);
    c.save(); c.globalAlpha = al;
    c.translate(sh.cx + ox2, sh.cy + oy2); c.rotate(sh.spin * ex * 1.6); c.translate(-sh.cx, -sh.cy);
    c.beginPath(); c.moveTo(sh.poly[0][0], sh.poly[0][1]); for (var q = 1; q < sh.poly.length; q++) c.lineTo(sh.poly[q][0], sh.poly[q][1]); c.closePath();
    c.save(); c.clip(); c.drawImage(sysCv, ox, oy); c.fillStyle = 'rgba(0,0,8,' + (.6 * sstep(.15, 1.4, t2)) + ')'; c.fillRect(0, 0, W, H); c.restore();
    // glowing fracture edges (cold energy leaking out of the cracks)
    var ge = Math.exp(-t2 * 2.1); if (ge > .02) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(150,190,255,' + (.9 * ge) + ')'; c.lineWidth = Math.max(1, U * .0022); c.shadowColor = 'rgba(110,150,255,1)'; c.shadowBlur = 10 * ge; c.stroke(); }
    c.restore();
  }
  c.restore();
}
function seamLine(c, w, u0, u1, alpha) {
  if (alpha <= .01) return; var d = [Math.cos(THETA), Math.sin(THETA)], n = [-d[1], d[0]];
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
  for (var pass = 0; pass < 2; pass++) {
    c.strokeStyle = pass ? 'rgba(235,245,255,' + alpha + ')' : 'rgba(110,160,255,' + alpha * .55 + ')'; c.lineWidth = pass ? Math.max(1.2, U * .0018) : Math.max(4, U * .0065);
    c.beginPath(); var f = true;
    for (var i = 0; i < jag.length; i++) { var u = jag[i][0]; if (u < u0 || u > u1) continue; var x = CX + d[0] * u + n[0] * jag[i][1], y = CY + d[1] * u + n[1] * jag[i][1]; if (f) { c.moveTo(x, y); f = false; } else c.lineTo(x, y); } c.stroke();
  }
  c.restore();
}
function impactFx(c, tau) {
  var sc = W / 1280 + .45, d = [1, 0];
  // explosion: white-blue core, violet bloom, rising column of light
  c.save(); c.globalCompositeOperation = 'lighter';
  var cr = U * (.08 + .5 * eout(tau / .55)), ca = Math.exp(-tau * 4.2), cg = c.createRadialGradient(CX, CY, 0, CX, CY, cr);
  cg.addColorStop(0, 'rgba(240,248,255,' + ca + ')'); cg.addColorStop(.3, 'rgba(120,170,255,' + ca * .7 + ')'); cg.addColorStop(.7, 'rgba(90,60,220,' + ca * .3 + ')'); cg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = cg; c.fillRect(CX - cr, CY - cr, cr * 2, cr * 2);
  var pw = U * .05 * (1 + tau * 2), pa = Math.exp(-tau * 3.2), pg = c.createLinearGradient(CX - pw, 0, CX + pw, 0); pg.addColorStop(0, 'rgba(120,170,255,0)'); pg.addColorStop(.5, 'rgba(210,228,255,' + pa * .85 + ')'); pg.addColorStop(1, 'rgba(120,170,255,0)'); c.fillStyle = pg; c.fillRect(CX - pw, -H, pw * 2, H + CY);
  c.restore();
  // shockwave rings
  c.save(); c.globalCompositeOperation = 'lighter';
  [[0, 'rgba(170,205,255,', 1], [.09, 'rgba(150,110,255,', .7]].forEach(function (r) {
    var t = tau - r[0]; if (t < 0 || t > 1.2) return; var rad = 20 + 1500 * sc * (1 - Math.exp(-t * 2.8)), a = Math.exp(-t * 3.4) * r[2] * .6;
    c.strokeStyle = r[1] + a + ')'; c.lineWidth = Math.max(1.2, 5 * sc * Math.exp(-t * 2.5)); c.beginPath(); c.arc(CX, CY, rad, 0, TAU); c.stroke();
  });
  // sparks
  for (var i = 0; i < sparks.length; i++) {
    var sp = sparks[i]; if (tau > sp.life) continue; var k = tau / sp.life, dist = sp.sp * (1 - Math.exp(-tau * 3.2)) / 3.2 * 1.1;
    var x = CX + d[0] * sp.u + Math.cos(sp.an) * dist, y = CY + d[1] * sp.u + Math.sin(sp.an) * dist + tau * tau * 420 * sc;
    var vx = Math.cos(sp.an) * sp.sp * Math.exp(-tau * 3.2), vy = Math.sin(sp.an) * sp.sp * Math.exp(-tau * 3.2) + tau * 840 * sc, len = Math.max(2, Math.hypot(vx, vy) * sp.len);
    var ang = Math.atan2(vy, vx);
    c.strokeStyle = 'rgba(' + (i % 3 ? '200,225,255' : '255,235,200') + ',' + (1 - k) + ')'; c.lineWidth = Math.max(1, 2 * sc * (1 - k * .6));
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len); c.stroke();
  }
  // dark dispersion (dust cloud puffs flung out)
  c.globalCompositeOperation = 'source-over';
  for (i = 0; i < 12; i++) {
    var a = i / 12 * TAU + .3, t = tau; if (t > 1.8) break; var r = (1 - Math.exp(-t * 1.6)) * (W * .5), size = U * (.25 + (i % 4) * .08) * (1 + t * .5);
    c.globalAlpha = .45 * Math.exp(-t * 1.1) * (.6 + (i % 3) * .2); c.save(); c.translate(CX + Math.cos(a) * r * .7 + d[0] * (i - 6) * 10, CY + Math.sin(a) * r * .5); c.rotate(a + t * .3); c.drawImage(puffSprite, -size / 2, -size / 2, size, size); c.restore();
  }
  c.restore();
}
function drawLogo(c, s) {
  var la = eio((s - T.logoHit) / 1.4), size = Math.min(Math.min(W, H) * (isSmall ? .46 : .5), 400), pulse = Math.exp(-(s - T.logoHit) * 2.2), rt = s - T.logoHit;
  var cx = CX, cy = CY - (isSmall ? H * .06 : H * .075), sc = lerp(.93, 1, eout(rt / 1.8)), A = clamp(la, 0, 1);
  if (rt > -.1) {
    var g = c.createRadialGradient(cx, cy, size * .1, cx, cy, size * 1.3); g.addColorStop(0, 'rgba(120,80,255,' + (A * .5 + pulse * .4) * .55 + ')'); g.addColorStop(.5, 'rgba(60,100,255,' + A * .16 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 0, W, H);
    // violet halo ring with rotating bright arcs
    var rad = size * .66 * sc; c.lineCap = 'round'; c.shadowColor = 'rgba(140,100,255,.95)'; c.shadowBlur = size * .05;
    c.strokeStyle = 'rgba(120,90,230,' + A * .45 + ')'; c.lineWidth = Math.max(1.5, size * .008); c.beginPath(); c.arc(cx, cy, rad, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(190,170,255,' + A * .95 + ')'; c.lineWidth = Math.max(2, size * .014);
    var rot = s * .5; for (var k = 0; k < 3; k++) { c.beginPath(); c.arc(cx, cy, rad, rot + k * TAU / 3, rot + k * TAU / 3 + .55); c.stroke(); }
    c.shadowBlur = 0;
    if (rt >= 0 && rt < 1.6) { c.strokeStyle = 'rgba(150,190,255,' + (.8 * Math.exp(-rt * 2.4)) + ')'; c.lineWidth = Math.max(2, 7 * Math.exp(-rt * 2)); c.beginPath(); c.arc(cx, cy, size * .2 + eout(rt / 1.6) * Math.max(W, H) * .6, 0, TAU); c.stroke(); }
    if (rt >= 0 && rt < 1.3) { var sa = Math.exp(-rt * 3.5), sg = c.createLinearGradient(cx - W * .45, 0, cx + W * .45, 0); sg.addColorStop(0, 'rgba(120,160,255,0)'); sg.addColorStop(.5, 'rgba(215,228,255,' + sa + ')'); sg.addColorStop(1, 'rgba(120,160,255,0)'); c.fillStyle = sg; c.fillRect(cx - W * .45, cy - 2, W * .9, 4); }
    c.restore();
  }
  if (!logoA) return;
  var half = size * sc / 2;
  // wet-floor reflection
  var rh = reflCv.height; var rc = reflCv.getContext('2d'); rc.clearRect(0, 0, reflCv.width, rh); rc.save(); rc.translate(0, 0); rc.scale(1, -1); rc.drawImage(logoA, 0, -logoA.height, logoA.width, logoA.height); rc.restore();
  rc.globalCompositeOperation = 'destination-in'; var rg = rc.createLinearGradient(0, 0, 0, rh); rg.addColorStop(0, 'rgba(0,0,0,.5)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); rc.fillStyle = rg; rc.fillRect(0, 0, reflCv.width, rh); rc.globalCompositeOperation = 'source-over';
  c.save(); c.globalAlpha = A * .55; c.drawImage(reflCv, cx - half, cy + half + size * .015, size * sc, size * sc * .5); c.restore();
  // the logo itself, with glow
  c.save(); c.globalAlpha = A; c.shadowColor = 'rgba(120,110,255,.9)'; c.shadowBlur = size * .09 * (.45 + pulse); c.drawImage(logoA, cx - half, cy - half, size * sc, size * sc); c.restore();
  // light sweep across the logo (masked by the logo itself)
  if (A > .5) {
    var sc2 = sweepCv.getContext('2d'), n = sweepCv.width; sc2.clearRect(0, 0, n, n); sc2.globalCompositeOperation = 'source-over'; sc2.drawImage(logoA, 0, 0);
    sc2.globalCompositeOperation = 'source-atop'; var u = ((rt - .4) % 3.4) / 3.4 * 2.4 - .7, lg = sc2.createLinearGradient(n * (u - .18), 0, n * (u + .18), n * .5); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(235,242,255,.9)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); sc2.fillStyle = lg; sc2.fillRect(0, 0, n, n); sc2.globalCompositeOperation = 'source-over';
    c.save(); c.globalAlpha = A * .85; c.globalCompositeOperation = 'lighter'; c.drawImage(sweepCv, cx - half, cy - half, size * sc, size * sc); c.restore();
  }
  // chrome wordmark + tagline
  var wa = sstep(T.logoHit + .5, T.logoHit + 1.6, s), fsw = Math.min(size * .2, W * .082), wy = cy + size * .5 + fsw * 1.15;
  if (wa > 0) {
    c.save(); c.globalAlpha = wa; var cg = c.createLinearGradient(0, wy - fsw * .5, 0, wy + fsw * .5); cg.addColorStop(0, '#ffffff'); cg.addColorStop(.48, '#aebbe0'); cg.addColorStop(.52, '#59658a'); cg.addColorStop(1, '#cfd9f5');
    drawTracked('TORECATSU', cx, wy, fsw, lerp(.5, .2, eout((s - T.logoHit - .5) / 2)), cg, { c: 'rgba(110,130,255,.75)', b: fsw * .45 }, 700); c.restore();
  }
  var ta = sstep(T.tagline, T.tagline + .9, s);
  if (ta > 0) { var fst = Math.min(fsw * .36, W * .028); c.save(); c.globalAlpha = ta * .9; drawTracked('UNDERSTAND. CHALLENGE. REBUILD.', cx, wy + fsw * .95, fst, .34, '#aab8e8', null, 400); c.restore(); }
}
/* ---------------- engine: clock with time dilation ---------------- */
var E = { raf: 0, last: 0, s: 0, running: false, ended: false, t0: 0 };
function frame(now) {
  if (!E.running) return;
  var dt = Math.min(.1, (now - E.last) / 1000); E.last = now;
  if (now - E.t0 > 17000 && !cine.classList.contains('out')) { cine.classList.add('out'); audioFadeOut(); setTimeout(finish, 900); }   /* slow device safety net */
  E.s += dt * rate(E.s);
  if (E.s > 2.6 && E.s < 7.6 && rate(E.s) !== 1) { /* time dilation applies */ }
  audioCues(E.s);
  render(E.s);
  if (E.s >= T.outro && !cine.classList.contains('out')) { cine.classList.add('out'); audioFadeOut(); }
  if (E.s >= T.end) { finish(); return; }
  E.raf = requestAnimationFrame(frame);
}
function reducedFrames() {   // short, calm alternative: logo fades in, no flashing or fast motion
  var t0 = performance.now(); var dur = 2600;
  (function f(now) {
    if (!E.running) return; var k = (now - t0) / dur; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    var s = T.logoHit + clamp(k, 0, 1) * 2.6; drawLogo(ctx, s); ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    if (k >= 1.15) { cine.classList.add('out'); } if (k >= 1.6) { finish(); return; } E.raf = requestAnimationFrame(f);
  })(t0);
}
function finish() {
  E.running = false; cancelAnimationFrame(E.raf); E.ended = true; cine.classList.add('out');
  setTimeout(function () { cine.classList.add('gone'); ctx.clearRect(0, 0, cv.width, cv.height); cv.width = cv.height = 1; if (glOK) { glc.width = glc.height = 1; try { gl.getExtension('WEBGL_lose_context') && gl.getExtension('WEBGL_lose_context').loseContext(); } catch (e) {} } document.body.style.overflow = ''; }, 950);   // overlay removed: nothing blocks the page
  audioFadeOut(); try { sessionStorage.setItem('tore_cine_seen', '1'); sessionStorage.setItem('tore_entered', '1'); } catch (e) {} window.TORE_CINE_PENDING = false; try { window.dispatchEvent(new Event('tore:intro-end')); } catch (e) {} document.body.style.overflow = '';
}
function start(opts) {
  opts = opts || {}; E.ended = false; cuesDone = {}; seed = 5;
  cine.classList.remove('out', 'gone'); document.getElementById('gate').style.display = 'none'; document.getElementById('ctl').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  A.on = !!opts.sound; var snd = document.getElementById('snd'); snd.textContent = 'SOUND: ' + (A.on ? 'ON' : 'OFF'); snd.setAttribute('aria-pressed', A.on);
  if (A.on || true) { try { if (!A.ctx) A.started = audioInit(); else A.started = true; if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); if (A.master) A.master.gain.value = A.on ? .9 : 0; } catch (e) { A.started = false; } }
  layout(); E.s = 0; E.last = performance.now(); E.t0 = E.last; E.running = true;
  var go = function () { if (reduce) reducedFrames(); else E.raf = requestAnimationFrame(frame); };
  if (document.fonts && document.fonts.load) { Promise.race([Promise.all([document.fonts.load('900 60px Cinzel'), document.fonts.load('600 60px Cinzel'), document.fonts.load('700 60px Cinzel'), document.fonts.load('400 30px Cinzel')]), new Promise(function (r) { setTimeout(r, 1500); })]).then(function () { layout(); E.last = performance.now(); go(); }); } else go();
}
function finishNow() { cine.classList.add('out'); setTimeout(finish, 350); }
function skip() { if (!E.running) return; cine.classList.add('out'); audioFadeOut(); setTimeout(finish, 350); }
function replay() { try { sessionStorage.removeItem('tore_entered'); sessionStorage.removeItem('tore_cine_seen'); } catch (e) {} location.reload(); return; cine.classList.remove('gone', 'out'); document.getElementById('ctl').style.display = 'none'; document.getElementById('gate').style.display = 'flex'; document.body.style.overflow = 'hidden'; layout(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }

/* ---------------- wiring ---------------- */
logoImg = new Image(); logoImg.onload = function () { prepLogo(logoImg); }; logoImg.src = LOGO_SRC; glInit(); buildGrain();
document.getElementById('enterSound').onclick = function () { start({ sound: true }); };
document.getElementById('enterSilent').onclick = function () { start({ sound: false }); };
document.getElementById('skip').onclick = skip;
document.getElementById('snd').onclick = function () { A.on = !A.on; this.textContent = 'SOUND: ' + (A.on ? 'ON' : 'OFF'); this.setAttribute('aria-pressed', A.on); if (A.master) A.master.gain.value = A.on ? .9 : 0; if (A.on && !A.ctx) { A.started = audioInit(); } };
document.getElementById('enterSkip').onclick = function () { finishNow(); };
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !cine.classList.contains('gone')) { if (E.running) skip(); else finishNow(); } });
var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (!cine.classList.contains('gone')) { var s = E.s; layout(); if (!E.running) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } } }, 150); });
document.addEventListener('visibilitychange', function () { if (A.ctx) { if (document.hidden) A.ctx.suspend(); else if (E.running) A.ctx.resume(); } E.last = performance.now(); });
layout(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
document.getElementById('enterSound').focus({ preventScroll: true });
window.ToreIntro = { start: start, skip: skip, replay: replay, _render: function (s) { layout(); cine.classList.remove('gone', 'out'); document.getElementById('gate').style.display = 'none'; E.s = s; render(s); }, _T: T };
})();

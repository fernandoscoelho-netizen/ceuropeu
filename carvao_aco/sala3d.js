/* Carvão e Aço: a Missão Schuman · Sala do Relógio em three.js (r160)
   Toda a modelação é procedimental: geometrias three.js e texturas desenhadas em <canvas>.
   Não há modelos nem imagens externas, por isso o jogo funciona sem Internet. */
(function () {
'use strict';

var T = window.THREE;
var Sala = window.Sala = {};
var renderer, scene, camera, pmrem, clock;
var root, container, hitList = [], stations = {}, markers = {};
var hands = {}, safe = {}, dialMesh = null, sunLight = null;
var yaw = 0, pitch = -0.04, fovBase = 55;
var camPos = new T.Vector3(0, 1.62, 4.3), camLook = new T.Vector3(0, 1.55, -5);
var tween = null, focused = null, onPick = null, onHover = null, hovered = null;
var needShadow = 3, running = false, reduced = false, quality = 1;
var tmpV = new T.Vector3();

/* ---------------- Utilidades de textura ---------------- */
function rnd(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function canvasTex(w, h, draw, opts) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var g = c.getContext('2d'); draw(g, w, h);
  var t = new T.CanvasTexture(c);
  opts = opts || {};
  if (!opts.linear) t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  if (opts.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  t.userData.canvas = c;
  return t;
}
function noise(g, w, h, amt, seed, alpha) {
  var r = rnd(seed || 7), img = g.getImageData(0, 0, w, h), d = img.data;
  for (var i = 0; i < d.length; i += 4) { var n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; if (alpha) d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}
function wrapText(g, text, x, y, maxW, lh) {
  var words = text.split(' '), line = '', yy = y;
  for (var i = 0; i < words.length; i++) {
    var test = line ? line + ' ' + words[i] : words[i];
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = words[i]; yy += lh; } else line = test;
  }
  if (line) g.fillText(line, x, yy);
  return yy + lh;
}

/* Parquet em espinha (herringbone): faixas em escada que pavimentam o plano */
function parquetTex() {
  var k = 5, U = 52, S = 2 * k * U; // tábua: 1 × k unidades; período 2k
  return canvasTex(S, S, function (g) {
    var r = rnd(11);
    g.fillStyle = '#3b2412'; g.fillRect(0, 0, S, S);
    function plank(x, y, w, h, horiz) {
      for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) {
        var X = x * U + ox, Y = y * U + oy, W = w * U, H = h * U;
        if (X > S || Y > S || X + W < 0 || Y + H < 0) continue;
        var base = 0.82 + r() * 0.3, hue = 26 + r() * 8;
        g.fillStyle = 'hsl(' + hue + ',' + (48 + r() * 12) + '%,' + (30 * base) + '%)';
        g.fillRect(X + 1, Y + 1, W - 2, H - 2);
        g.save(); g.beginPath(); g.rect(X + 1, Y + 1, W - 2, H - 2); g.clip();
        for (var i = 0; i < 26; i++) { // veio da madeira ao longo da tábua
          g.strokeStyle = 'rgba(' + (r() < .5 ? '20,10,4' : '255,220,170') + ',' + (0.05 + r() * 0.08) + ')';
          g.lineWidth = 0.6 + r() * 1.6; g.beginPath();
          var p = r(), amp = r() * 3;
          if (horiz) { var yy = Y + p * H; g.moveTo(X, yy); g.bezierCurveTo(X + W * .3, yy + amp, X + W * .6, yy - amp, X + W, yy + amp * .5); }
          else { var xx = X + p * W; g.moveTo(xx, Y); g.bezierCurveTo(xx + amp, Y + H * .3, xx - amp, Y + H * .6, xx + amp * .5, Y + H); }
          g.stroke();
        }
        var gr = horiz ? g.createLinearGradient(X, 0, X + W, 0) : g.createLinearGradient(0, Y, 0, Y + H);
        gr.addColorStop(0, 'rgba(0,0,0,.10)'); gr.addColorStop(.5, 'rgba(255,255,255,.03)'); gr.addColorStop(1, 'rgba(0,0,0,.12)');
        g.fillStyle = gr; g.fillRect(X, Y, W, H); g.restore();
      }
    }
    for (var n = -4; n <= 4; n++) for (var s = -2 * k - 4; s <= 2 * k + 4; s++) {
      plank(s + n * k, s - n * k, k, 1, true);
      plank(s + k + n * k, s + 1 - k - n * k, 1, k, false);
    }
    noise(g, S, S, 10, 3);
  }, { repeat: [1, 1] });
}
function woodTex(base, seed, w, h, dark) {
  return canvasTex(w || 512, h || 512, function (g, W, H) {
    var r = rnd(seed || 5);
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 140; i++) {
      var y = r() * H, a = r() * 6;
      g.strokeStyle = 'rgba(' + (dark || '30,8,2') + ',' + (0.06 + r() * 0.12) + ')';
      g.lineWidth = 0.5 + r() * 2.5; g.beginPath(); g.moveTo(0, y);
      for (var x = 0; x <= W; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * a + (r() - .5) * 1.5);
      g.stroke();
    }
    noise(g, W, H, 8, seed + 1);
  }, { repeat: [1, 1] });
}
function marbleTex(seed) {
  return canvasTex(512, 512, function (g, W, H) {
    var r = rnd(seed || 9);
    var gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#f3efe8'); gr.addColorStop(1, '#e2dcd2');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 22; i++) {
      g.strokeStyle = 'rgba(' + (90 + r() * 40) + ',' + (90 + r() * 30) + ',' + (95 + r() * 30) + ',' + (0.12 + r() * 0.3) + ')';
      g.lineWidth = 0.4 + r() * 2.2; g.beginPath();
      var x = r() * W, y = r() * H; g.moveTo(x, y);
      for (var j = 0; j < 14; j++) { x += (r() - 0.3) * 60; y += (r() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
    noise(g, W, H, 6, seed + 2);
  }, { repeat: [1, 1] });
}
function plasterTex() {
  return canvasTex(256, 256, function (g, W, H) {
    g.fillStyle = '#ece3d0'; g.fillRect(0, 0, W, H); noise(g, W, H, 9, 21);
  }, { repeat: [6, 3] });
}
function damaskTex() { // papel/estofo damasco da parede
  return canvasTex(256, 256, function (g, W, H) {
    g.fillStyle = '#7b1e22'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,200,170,.07)';
    for (var k = 0; k < 2; k++) {
      var cx = k ? 0 : W / 2, cy = k ? 0 : H / 2;
      for (var dx = -W; dx <= W; dx += W) for (var dy = -H; dy <= H; dy += H) {
        g.save(); g.translate(cx + dx, cy + dy);
        for (var a = 0; a < 8; a++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, 26, 9, 26, 0, 0, Math.PI * 2); g.fill(); }
        g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
    noise(g, W, H, 10, 4);
  }, { repeat: [3, 2] });
}
function rugTex() {
  return canvasTex(1024, 640, function (g, W, H) {
    var r = rnd(31);
    g.fillStyle = '#27304a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#a88c52'; g.lineWidth = 10; g.strokeRect(30, 30, W - 60, H - 60);
    g.fillStyle = '#6a2a26'; g.fillRect(56, 56, W - 112, H - 112);
    g.strokeStyle = '#bba273'; g.lineWidth = 4; g.strokeRect(70, 70, W - 140, H - 140);
    g.fillStyle = '#d8c9a6'; g.fillRect(96, 96, W - 192, H - 192);
    // cercadura com flores estilizadas
    for (var x = 120; x < W - 100; x += 46) { flower(x, 63, 9); flower(x, H - 63, 9); }
    for (var y = 120; y < H - 100; y += 46) { flower(63, y, 9); flower(W - 63, y, 9); }
    // medalhão central
    g.save(); g.translate(W / 2, H / 2);
    g.fillStyle = '#6a2a26'; g.beginPath(); g.ellipse(0, 0, 230, 160, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#27304a'; g.beginPath(); g.ellipse(0, 0, 200, 132, 0, 0, Math.PI * 2); g.fill();
    for (var i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillStyle = i % 2 ? '#a88c52' : '#cdb98c'; g.beginPath(); g.ellipse(0, 90, 16, 40, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#6a2a26'; g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#cdb98c'; g.beginPath(); g.arc(0, 0, 20, 0, Math.PI * 2); g.fill();
    g.restore();
    // cantos
    [[150, 150], [W - 150, 150], [150, H - 150], [W - 150, H - 150]].forEach(function (p) {
      g.fillStyle = '#8a4436'; g.beginPath(); g.arc(p[0], p[1], 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#27304a'; g.beginPath(); g.arc(p[0], p[1], 18, 0, Math.PI * 2); g.fill();
    });
    function flower(x, y, s) { g.fillStyle = '#bba273'; for (var a = 0; a < 5; a++) { g.beginPath(); g.arc(x + Math.cos(a * 1.256) * s * .6, y + Math.sin(a * 1.256) * s * .6, s * .45, 0, 7); g.fill(); } g.fillStyle = '#6a2a26'; g.beginPath(); g.arc(x, y, s * .3, 0, 7); g.fill(); }
    // desgaste e textura de lã
    var img = g.getImageData(0, 0, W, H), d = img.data;
    for (var p = 0; p < d.length; p += 4) { var n = (r() - .5) * 26; d[p] += n; d[p + 1] += n; d[p + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}
function paintingTex(seed, kind) {
  return canvasTex(512, 384, function (g, W, H) {
    var r = rnd(seed);
    var sky = g.createLinearGradient(0, 0, 0, H * .65);
    if (kind === 'sea') { sky.addColorStop(0, '#5d7086'); sky.addColorStop(1, '#d9c7a0'); }
    else { sky.addColorStop(0, '#7f8f9a'); sky.addColorStop(1, '#e6d4a8'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,250,235,' + r() * .25 + ')'; g.beginPath(); g.ellipse(r() * W, r() * H * .45, 20 + r() * 60, 6 + r() * 14, 0, 0, 7); g.fill(); }
    if (kind === 'sea') {
      g.fillStyle = '#3d5160'; g.fillRect(0, H * .62, W, H);
      for (var j = 0; j < 220; j++) { g.fillStyle = 'rgba(230,235,230,' + r() * .25 + ')'; g.fillRect(r() * W, H * .62 + r() * H * .38, 4 + r() * 16, 1.5); }
      g.fillStyle = '#2b2a25'; g.beginPath(); g.moveTo(W * .55, H * .62); g.lineTo(W * .62, H * .3); g.lineTo(W * .64, H * .62); g.fill();
      g.fillStyle = '#efe7d2'; g.beginPath(); g.moveTo(W * .62, H * .31); g.lineTo(W * .74, H * .58); g.lineTo(W * .62, H * .58); g.fill();
    } else {
      var hills = ['#5d6b4a', '#4c5a3c', '#3c4830'];
      hills.forEach(function (c, k) { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (var x = 0; x <= W; x += 16) g.lineTo(x, H * (.55 + k * .1) + Math.sin(x * .012 + k * 3 + seed) * 18 + r() * 5); g.lineTo(W, H); g.fill(); });
      for (var t = 0; t < 14; t++) { var tx = r() * W, ty = H * (.6 + r() * .25); g.fillStyle = 'rgba(30,40,22,.8)'; g.beginPath(); g.ellipse(tx, ty, 10 + r() * 14, 16 + r() * 20, 0, 0, 7); g.fill(); }
    }
    // verniz envelhecido
    var v = g.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, W * .7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,25,5,.55)');
    g.fillStyle = v; g.fillRect(0, 0, W, H); noise(g, W, H, 14, seed + 3);
  });
}
function skyTex() {
  return canvasTex(1024, 512, function (g, W, H) {
    var s = g.createLinearGradient(0, 0, 0, H); s.addColorStop(0, '#9fbfd9'); s.addColorStop(.55, '#f6e2bd'); s.addColorStop(1, '#f3c98f');
    g.fillStyle = s; g.fillRect(0, 0, W, H);
    var r = rnd(4);
    for (var i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,' + r() * .35 + ')'; g.beginPath(); g.ellipse(r() * W, r() * H * .4, 40 + r() * 90, 8 + r() * 14, 0, 0, 7); g.fill(); }
    // telhados de Paris e a cúpula dos Inválidos ao longe
    g.fillStyle = '#8c8f99';
    g.beginPath(); g.moveTo(0, H); var x = 0; while (x < W) { var hh = H * (.66 + r() * .06); g.lineTo(x, hh); g.lineTo(x + 18, hh - 14); g.lineTo(x + 50 + r() * 40, hh - 14); g.lineTo(x + 70 + r() * 40, hh); x += 80 + r() * 50; } g.lineTo(W, H); g.fill();
    g.fillStyle = '#9b9ba2'; g.beginPath(); g.arc(W * .62, H * .56, 34, Math.PI, 0); g.fill(); g.fillRect(W * .62 - 40, H * .56, 80, 60);
    g.fillStyle = '#c9a85a'; g.fillRect(W * .62 - 2, H * .46, 4, 24);
    g.fillStyle = '#6f7a5e'; for (var t = 0; t < 40; t++) { g.beginPath(); g.ellipse(r() * W, H * .78 + r() * 30, 26 + r() * 30, 18 + r() * 12, 0, 0, 7); g.fill(); }
  });
}
function blobTex() {
  return canvasTex(128, 128, function (g, W, H) {
    var gr = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
}

/* ---------------- Materiais ---------------- */
var M = {};
function makeMaterials() {
  var std = function (o) { return new T.MeshStandardMaterial(o); };
  var phy = function (o) { return new T.MeshPhysicalMaterial(o); };
  M.gold = std({ color: 0xd4ad5a, metalness: 1, roughness: 0.26 });
  M.goldDull = std({ color: 0xb8924a, metalness: 1, roughness: 0.42 });
  M.brass = std({ color: 0xc19a52, metalness: 1, roughness: 0.3 });
  M.steel = std({ color: 0x9aa0a6, metalness: 1, roughness: 0.25 });
  M.blackMetal = std({ color: 0x18181a, metalness: 0.6, roughness: 0.35 });
  M.wallWhite = std({ color: 0xf1e9d8, roughness: 0.85, map: plasterTex() });
  M.trim = std({ color: 0xf6f0e3, roughness: 0.6 });
  M.ceiling = std({ color: 0xf5efe2, roughness: 0.95 });
  M.damask = std({ color: 0xffffff, roughness: 0.9, map: damaskTex() });
  var pq = parquetTex(); pq.rotation = Math.PI / 4; pq.repeat.set(14, 14);
  M.floor = std({ color: 0xffffff, map: pq, roughness: 0.32, metalness: 0 });
  M.mahogany = phy({ color: 0xffffff, map: woodTex('#5a2414', 3), roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  M.oak = std({ color: 0xffffff, map: woodTex('#7a5634', 8, 512, 512, '40,20,6'), roughness: 0.55 });
  M.marble = phy({ color: 0xffffff, map: marbleTex(9), roughness: 0.14, clearcoat: 0.4 });
  M.marbleDark = std({ color: 0x2a2523, roughness: 0.3 });
  M.velvet = phy({ color: 0x84141d, roughness: 0.92, sheen: 1, sheenColor: new T.Color(0xff8a80), sheenRoughness: 0.45 });
  M.velvetBlue = phy({ color: 0x1c2b57, roughness: 0.92, sheen: 1, sheenColor: new T.Color(0x9fb4ff), sheenRoughness: 0.5 });
  M.leather = std({ color: 0x23442f, roughness: 0.55 });
  M.lacquer = phy({ color: 0x0d0d0e, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
  M.keyTop = phy({ color: 0xf2ece0, roughness: 0.3, clearcoat: 0.6 });
  M.rubber = std({ color: 0x151515, roughness: 0.8 });
  M.paper = std({ color: 0xf7f2e4, roughness: 0.95, side: T.DoubleSide });
  M.glass = phy({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.12, envMapIntensity: 1.5, depthWrite: false, side: T.DoubleSide });
  M.windowGlass = phy({ color: 0xdfeaf2, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false });
  M.crystal = phy({ color: 0xffffff, roughness: 0, metalness: 0.1, transparent: true, opacity: 0.75, envMapIntensity: 3, ior: 1.6 });
  M.candle = std({ color: 0xfaf3e2, roughness: 0.6 });
  M.flame = new T.MeshBasicMaterial({ color: 0xffd9a0 });
  M.mirror = std({ color: 0xd8dcd8, metalness: 1, roughness: 0.0 });
  M.safeGreen = phy({ color: 0x1b3a2a, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.18 });
  M.dark = std({ color: 0x0b0a09, roughness: 0.9 });
  M.hit = new T.MeshBasicMaterial({ visible: false });
  M.blob = new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.9 });
}

/* ---------------- Geometrias auxiliares ---------------- */
function box(w, h, d, mat, x, y, z, parent, opts) {
  var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = !(opts && opts.noCast); m.receiveShadow = true;
  (parent || root).add(m); return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent, seg) {
  var m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 24), mat);
  m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true;
  (parent || root).add(m); return m;
}
function roundedBoxGeo(w, h, d, r, seg) {
  var s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  var g = new T.ExtrudeGeometry(s, { depth: d - 2 * r * 0.6, bevelEnabled: true, bevelThickness: r * 0.6, bevelSize: r * 0.6, bevelSegments: seg || 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * r * 0.6) / 2); g.computeVertexNormals();
  return g;
}
function lathe(points, mat, segs) {
  var pts = points.map(function (p) { return new T.Vector2(p[0], p[1]); });
  var m = new T.Mesh(new T.LatheGeometry(pts, segs || 32), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
// Moldura dourada em relevo (para painéis da boiserie e quadros)
function moulding(w, h, t, depth, mat) {
  var g = new T.Group(), half = t / 2;
  var prof = new T.Shape(); prof.moveTo(0, 0); prof.lineTo(t, 0); prof.lineTo(t, depth * .4); prof.quadraticCurveTo(t * .55, depth * 1.2, 0, depth); prof.lineTo(0, 0);
  function side(len, rotZ, x, y) {
    var geo = new T.ExtrudeGeometry(prof, { depth: len, bevelEnabled: false, steps: 1 });
    geo.translate(-t / 2, 0, -len / 2); // perfil em XY, comprimento em Z
    var m = new T.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = true;
    m.rotation.set(-Math.PI / 2, 0, 0); // depth -> +z (para fora da parede)
    var holder = new T.Group(); holder.add(m); m.rotation.set(Math.PI / 2, 0, 0); m.rotation.order = 'XYZ';
    holder.rotation.z = rotZ; holder.position.set(x, y, 0); g.add(holder);
  }
  // cada lado: perfil extrudido ao longo do eixo do lado
  side(w + t, Math.PI / 2, 0, h / 2 - half);
  side(w + t, -Math.PI / 2, 0, -h / 2 + half);
  side(h - t, Math.PI, -w / 2 + half, 0);
  side(h - t, 0, w / 2 - half, 0);
  return g;
}
function frameBox(w, h, t, d, mat, parent) { // moldura simples de 4 barras (mais leve)
  var g = new T.Group();
  box(w, t, d, mat, 0, h / 2 - t / 2, 0, g, { noCast: true });
  box(w, t, d, mat, 0, -h / 2 + t / 2, 0, g, { noCast: true });
  box(t, h - 2 * t, d, mat, -w / 2 + t / 2, 0, 0, g, { noCast: true });
  box(t, h - 2 * t, d, mat, w / 2 - t / 2, 0, 0, g, { noCast: true });
  if (parent) parent.add(g);
  return g;
}
function blob(x, z, sx, sz) {
  var m = new T.Mesh(new T.PlaneGeometry(sx, sz), M.blob);
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); m.renderOrder = 1; root.add(m); return m;
}

/* ---------------- Sala ---------------- */
var W = 16, D = 11, H = 5.6, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;
var WIN_Z = [-3.2, 0, 3.2], WIN_W = 1.5, WIN_Y0 = 0.55, WIN_H = 3.55;

function buildRoom() {
  // chão
  var floor = new T.Mesh(new T.PlaneGeometry(W, D), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  // teto com sanca e caixotões
  var ceil = new T.Mesh(new T.PlaneGeometry(W, D), M.ceiling);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; root.add(ceil);
  for (var cx = -1; cx <= 1; cx += 2) {
    var f = frameBox(5.6, 4.2, 0.12, 0.08, M.trim); f.rotation.x = Math.PI / 2; f.position.set(cx * 4, H - 0.04, 0); root.add(f);
    var fi = frameBox(5.2, 3.8, 0.05, 0.05, M.gold); fi.rotation.x = Math.PI / 2; fi.position.set(cx * 4, H - 0.05, 0); root.add(fi);
    var ros = lathe([[0, 0], [0.42, 0], [0.38, -0.05], [0.22, -0.09], [0.08, -0.12], [0, -0.12]], M.trim, 40);
    ros.position.set(cx * 4, H, 0); root.add(ros);
  }
  // paredes: fundo (lareira), frente, direita (porta e cofre), esquerda (janelas)
  wallSolid(0, Z0, W, 0);          // fundo
  wallSolid(0, Z1, W, Math.PI);    // frente
  wallSolid(X1, 0, D, -Math.PI / 2); // direita
  wallWithWindows();               // esquerda
  // rodapé, lambril (cimaise) e sanca a toda a volta
  ring(0.22, 0.04, 0.11, M.trim);
  ring(0.96, 0.06, 0.05, M.trim);
  ring(H - 0.22, 0.26, 0.18, M.trim, true);
  ring(H - 0.46, 0.04, 0.05, M.gold);
  // painéis de boiserie
  boiseries();
}
function wallSolid(cx, cz, len, ry) {
  var g = new T.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; root.add(g);
  var m = new T.Mesh(new T.PlaneGeometry(len, H), M.wallWhite); m.position.y = H / 2; m.receiveShadow = true; g.add(m);
  return g;
}
function wallWithWindows() {
  var g = new T.Group(); g.position.set(X0, 0, 0); g.rotation.y = Math.PI / 2; root.add(g);
  // a parede é feita de blocos à volta das janelas, para que a luz do sol entre só pelos vãos
  var th = 0.45, edges = [-D / 2];
  WIN_Z.forEach(function (z) { edges.push(-z - WIN_W / 2, -z + WIN_W / 2); }); edges.push(D / 2);
  edges.sort(function (a, b) { return a - b; });
  for (var i = 0; i < edges.length; i += 2) {
    var a = edges[i], b = edges[i + 1];
    box(b - a, H, th, M.wallWhite, (a + b) / 2, H / 2, -th / 2, g);
  }
  WIN_Z.forEach(function (z) {
    var x = -z;
    box(WIN_W, WIN_Y0, th, M.wallWhite, x, WIN_Y0 / 2, -th / 2, g);
    box(WIN_W, H - WIN_Y0 - WIN_H, th, M.wallWhite, x, WIN_Y0 + WIN_H + (H - WIN_Y0 - WIN_H) / 2, -th / 2, g);
    windowAt(g, x, th);
  });
  // céu de Paris lá fora
  var sky = new T.Mesh(new T.PlaneGeometry(40, 18), new T.MeshBasicMaterial({ map: skyTex(), toneMapped: false, color: 0xd8d2c8 }));
  sky.position.set(-9.5 - 6, 4.5, 0); sky.rotation.y = Math.PI / 2; root.add(sky);
}
function windowAt(g, x, th) {
  var wg = new T.Group(); wg.position.set(x, WIN_Y0, -th * 0.55); g.add(wg);
  var fw = 0.07;
  // aros e caixilhos (janela à francesa com duas folhas e travessas)
  frameBox(WIN_W, WIN_H, fw, 0.1, M.trim, wg).position.set(0, WIN_H / 2, 0);
  box(0.05, WIN_H, 0.08, M.trim, 0, WIN_H / 2, 0, wg);
  for (var k = 1; k < 4; k++) { box(WIN_W, 0.035, 0.06, M.trim, 0, WIN_H * k / 4, 0, wg); }
  var gl = new T.Mesh(new T.PlaneGeometry(WIN_W - 0.1, WIN_H - 0.1), M.windowGlass); gl.position.set(0, WIN_H / 2, 0); wg.add(gl);
  // puxadores
  box(0.02, 0.18, 0.04, M.brass, 0.05, 1.2, 0.06, wg);
  // ombreiras do vão
  box(0.06, WIN_H, th, M.trim, -WIN_W / 2 - 0.03, WIN_H / 2, th * 0.55 - th / 2, wg);
  box(0.06, WIN_H, th, M.trim, WIN_W / 2 + 0.03, WIN_H / 2, th * 0.55 - th / 2, wg);
  // cortinas de veludo com pregas
  [-1, 1].forEach(function (s) {
    var cg = new T.PlaneGeometry(0.62, H - 0.55, 24, 1), p = cg.attributes.position;
    for (var i = 0; i < p.count; i++) { var u = p.getX(i); p.setZ(i, Math.sin((u + 0.31) * 30) * 0.045 + 0.04); }
    cg.computeVertexNormals();
    var c = new T.Mesh(cg, M.velvet); c.castShadow = true; c.receiveShadow = true;
    c.position.set(s * (WIN_W / 2 + 0.22), (H - 0.55) / 2 - WIN_Y0 + 0.02, 0.18);
    wg.add(c);
    // abraçadeira dourada
    var tie = new T.Mesh(new T.TorusGeometry(0.09, 0.015, 8, 24), M.gold); tie.position.set(s * (WIN_W / 2 + 0.25), 1.0, 0.24); tie.scale.set(2.6, 1, 1); wg.add(tie);
  });
  // sanefa
  var val = box(WIN_W + 1.1, 0.42, 0.12, M.velvet, 0, H - WIN_Y0 - 0.52, 0.22, wg);
  box(WIN_W + 1.2, 0.05, 0.16, M.gold, 0, H - WIN_Y0 - 0.3, 0.22, wg);
  box(WIN_W + 1.1, 0.04, 0.13, M.gold, 0, H - WIN_Y0 - 0.74, 0.22, wg);
}
function ring(y, h, d, mat, crown) {
  var segs = [
    [0, Z0 + d / 2, W, 0], [0, Z1 - d / 2, W, 0], [X1 - d / 2, 0, D, Math.PI / 2], [X0 + d / 2, 0, D, Math.PI / 2]
  ];
  segs.forEach(function (s) {
    if (s[3] && s[0] < 0 && !crown && y < 1.2) { // parede das janelas: só entre janelas
      var edges = [Z0]; WIN_Z.forEach(function (z) { edges.push(z - WIN_W / 2 - 0.05, z + WIN_W / 2 + 0.05); }); edges.push(Z1);
      for (var i = 0; i < edges.length; i += 2) { var m = box(edges[i + 1] - edges[i], h, d, mat, s[0], y, (edges[i] + edges[i + 1]) / 2); m.rotation.y = 0; m.scale.set(1, 1, 1); m.geometry = new T.BoxGeometry(d, h, edges[i + 1] - edges[i]); }
      return;
    }
    var m = box(s[2], h, d, mat, s[0], y, s[1]); if (s[3]) { m.geometry = new T.BoxGeometry(d, h, s[2]); }
    if (crown) m.castShadow = false;
  });
}
function boiseries() {
  // painéis no fundo, de cada lado da lareira, e na parede da frente
  function panelRow(axis, fixed, from, to, n, face) {
    var step = (to - from) / n;
    for (var i = 0; i < n; i++) {
      var c = from + step * (i + 0.5);
      // painel superior grande com damasco
      var pw = step - 0.5, ph = 2.7;
      var up = new T.Group();
      var dm = new T.Mesh(new T.PlaneGeometry(pw - 0.1, ph - 0.1), M.damask); dm.receiveShadow = true; up.add(dm);
      var fr = frameBox(pw, ph, 0.07, 0.04, M.gold); up.add(fr);
      place(up, axis, fixed, c, 1.25 + ph / 2 + 0.2, face);
      // painel inferior (lambrim)
      var lo = frameBox(pw, 0.5, 0.04, 0.025, M.goldDull);
      place(lo, axis, fixed, c, 0.6, face);
    }
  }
  function place(obj, axis, fixed, c, y, face) {
    if (axis === 'x') { obj.position.set(c, y, fixed + face * 0.012); obj.rotation.y = face > 0 ? 0 : Math.PI; }
    else { obj.position.set(fixed + face * 0.012, y, c); obj.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; }
    root.add(obj);
  }
  panelRow('x', Z0, X0 + 0.3, -2.3, 2, 1);
  panelRow('x', Z0, 2.3, X1 - 0.3, 2, 1);
  panelRow('x', Z1, X0 + 0.3, X1 - 0.3, 5, -1);
  // parede direita: painéis entre a porta e o cofre
  panelRow('z', X1, Z0 + 0.3, -3.9, 1, -1);
  panelRow('z', X1, -1.0, 3.0, 2, -1);
}

/* ---------------- Lareira e relógio ---------------- */
function buildFireplace() {
  var g = new T.Group(); g.position.set(0, 0, Z0); root.add(g);
  // lareira de mármore
  box(2.6, 0.12, 0.62, M.marble, 0, 1.2, 0.31, g);             // tampo
  box(2.5, 0.06, 0.58, M.marble, 0, 1.12, 0.29, g);
  box(2.3, 0.28, 0.42, M.marble, 0, 0.98, 0.21, g);             // friso
  box(0.36, 0.84, 0.46, M.marble, -0.97, 0.42, 0.23, g);        // pés direitos
  box(0.36, 0.84, 0.46, M.marble, 0.97, 0.42, 0.23, g);
  box(1.58, 0.84, 0.05, M.marbleDark, 0, 0.42, 0.04, g);        // fundo da fornalha
  box(1.58, 0.02, 0.4, M.dark, 0, 0.01, 0.22, g);
  box(2.9, 0.04, 0.9, M.marble, 0, 0.02, 0.45, g);              // soleira
  // guarda-fogo de latão
  var screen = new T.Group(); screen.position.set(0, 0, 0.6); g.add(screen);
  box(1.4, 0.03, 0.03, M.brass, 0, 0.62, 0, screen);
  for (var i = -6; i <= 6; i++) cyl(0.006, 0.006, 0.6, M.brass, i * 0.11, 0.31, 0, screen, 6);
  // lenha
  for (var j = 0; j < 3; j++) { var l = cyl(0.06, 0.07, 0.9, M.oak, -0.1 + j * 0.1, 0.1 + (j === 2 ? 0.09 : 0), 0.25 + j * 0.06, g, 10); l.rotation.z = Math.PI / 2; l.rotation.y = 0.2 * (j - 1); }
  // espelho com moldura dourada (trumeau)
  var mir = new T.Mesh(new T.PlaneGeometry(2.1, 2.5), M.mirror); mir.position.set(0, 2.62, 0.02); g.add(mir);
  var mf = frameBox(2.3, 2.7, 0.12, 0.08, M.gold); mf.position.set(0, 2.62, 0.05); g.add(mf);
  var crest = lathe([[0, 0], [0.25, 0], [0.2, 0.18], [0.06, 0.32], [0, 0.36]], M.gold, 24); crest.scale.set(1.6, 1, 0.25); crest.position.set(0, 3.97, 0.06); g.add(crest);
  // candelabros
  [-1, 1].forEach(function (s) {
    var c = lathe([[0, 0], [0.09, 0], [0.08, 0.03], [0.03, 0.06], [0.025, 0.3], [0.04, 0.33], [0.02, 0.36], [0, 0.36]], M.gold); c.position.set(s * 1.0, 1.26, 0.32); g.add(c);
    [-1, 0, 1].forEach(function (k) {
      var arm = cyl(0.008, 0.008, 0.16, M.gold, s * 1.0 + k * 0.09, 1.26 + 0.38, 0.32, g, 8); arm.rotation.z = k * 0.6;
      var cdl = cyl(0.014, 0.014, 0.14, M.candle, s * 1.0 + k * 0.13, 1.26 + 0.5 + (k ? 0 : 0.06), 0.32, g, 12);
    });
  });
  buildClock(g);
  // hit box da estação do relógio
  addStation('relogio', g, new T.Vector3(0, 1.75, 0.35), [1.2, 1.3, 0.7], { pos: [0, 1.72, -3.55], look: [0, 1.58, Z0] });
}
function buildClock(parent) {
  var g = new T.Group(); g.position.set(0, 1.26, 0.3); parent.add(g);
  // pedestal de bronze dourado com friso
  var base = new T.Mesh(roundedBoxGeo(0.62, 0.07, 0.26, 0.015), M.gold); base.position.y = 0.035; base.castShadow = true; g.add(base);
  var plinth = new T.Mesh(roundedBoxGeo(0.54, 0.09, 0.22, 0.012), M.goldDull); plinth.position.y = 0.11; g.add(plinth);
  [-0.26, 0.26].forEach(function (x) { var f = lathe([[0, 0], [0.03, 0], [0.025, 0.02], [0, 0.03]], M.gold, 16); f.position.set(x, -0.02, 0.1); g.add(f); var f2 = f.clone(); f2.position.z = -0.1; g.add(f2); });
  // caixa do relógio (tambor)
  var drum = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.16, 48), M.gold); drum.rotation.x = Math.PI / 2; drum.position.set(0, 0.36, 0); drum.castShadow = true; g.add(drum);
  var body = new T.Mesh(roundedBoxGeo(0.4, 0.26, 0.15, 0.03), M.goldDull); body.position.set(0, 0.2, 0); g.add(body);
  // colunas laterais
  [-0.22, 0.22].forEach(function (x) {
    var col = lathe([[0, 0], [0.03, 0], [0.025, 0.02], [0.018, 0.03], [0.018, 0.33], [0.028, 0.35], [0.03, 0.37], [0, 0.37]], M.gold, 18);
    col.position.set(x, 0.155, 0.04); g.add(col);
    var urn = lathe([[0, 0], [0.025, 0], [0.04, 0.04], [0.03, 0.08], [0.01, 0.1], [0.015, 0.12], [0, 0.13]], M.gold, 18); urn.position.set(x, 0.525, 0.04); g.add(urn);
  });
  // cúpula e remate
  var top = lathe([[0, 0], [0.18, 0], [0.17, 0.02], [0.12, 0.07], [0.05, 0.11], [0.02, 0.16], [0.035, 0.19], [0, 0.23]], M.gold, 40);
  top.position.set(0, 0.52, 0); g.add(top);
  // mostrador em esmalte com numeração romana
  var faceT = canvasTex(512, 512, function (c, w, h) {
    var gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#fbf8f0'); gr.addColorStop(1, '#e8e0cf');
    c.fillStyle = gr; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 40, 0, 7); c.stroke();
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 22, 0, 7); c.stroke();
    for (var i = 0; i < 60; i++) { var a = i / 60 * Math.PI * 2; c.lineWidth = i % 5 ? 2 : 5; c.beginPath(); c.moveTo(w / 2 + Math.sin(a) * (w / 2 - 24), h / 2 - Math.cos(a) * (w / 2 - 24)); c.lineTo(w / 2 + Math.sin(a) * (w / 2 - (i % 5 ? 36 : 40)), h / 2 - Math.cos(a) * (w / 2 - (i % 5 ? 36 : 40))); c.stroke(); }
    var R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    c.fillStyle = '#1d1d1d'; c.font = '600 46px "Times New Roman", serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    R.forEach(function (r, i) { var a = i / 12 * Math.PI * 2; c.save(); c.translate(w / 2 + Math.sin(a) * (w / 2 - 92), h / 2 - Math.cos(a) * (w / 2 - 92)); c.rotate(a); c.fillText(r, 0, 0); c.restore(); });
    c.font = 'italic 24px "Times New Roman", serif'; c.fillText('Paris', w / 2, h / 2 + 70);
  });
  var face = new T.Mesh(new T.CircleGeometry(0.135, 64), new T.MeshStandardMaterial({ map: faceT, roughness: 0.25 }));
  face.position.set(0, 0.36, 0.081); g.add(face);
  var bezel = new T.Mesh(new T.TorusGeometry(0.14, 0.012, 12, 64), M.gold); bezel.position.set(0, 0.36, 0.085); g.add(bezel);
  var glassDome = new T.Mesh(new T.SphereGeometry(0.135, 32, 12, 0, Math.PI * 2, 0, 0.45), M.glass); glassDome.rotation.x = Math.PI / 2; glassDome.position.set(0, 0.36, 0.05); g.add(glassDome);
  // ponteiros em aço azulado
  var handMat = new T.MeshStandardMaterial({ color: 0x1b2440, metalness: 0.8, roughness: 0.3 });
  function hand(len, wid) { var h = new T.Group(); var m = new T.Mesh(new T.BoxGeometry(wid, len, 0.004), handMat); m.position.y = len / 2 - 0.012; h.add(m); var tip = new T.Mesh(new T.CircleGeometry(wid * 1.4, 3), handMat); tip.position.set(0, len - 0.01, 0); tip.rotation.z = Math.PI / 2; h.add(tip); h.position.set(0, 0.36, 0.09); g.add(h); return h; }
  hands.h = hand(0.075, 0.008); hands.m = hand(0.112, 0.005); hands.h.position.z = 0.088; hands.m.position.z = 0.092;
  var pin = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.01, 16), M.gold); pin.rotation.x = Math.PI / 2; pin.position.set(0, 0.36, 0.096); g.add(pin);
  // pêndulo visível por baixo
  var pend = new T.Group(); pend.position.set(0, 0.25, 0.08); g.add(pend);
  var rod = new T.Mesh(new T.BoxGeometry(0.006, 0.07, 0.004), M.gold); rod.position.y = -0.035; pend.add(rod);
  var bob = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.006, 24), M.gold); bob.rotation.x = Math.PI / 2; bob.position.y = -0.075; pend.add(bob);
  hands.pend = pend;
  hands.group = g;
}

/* ---------------- Mobiliário ---------------- */
function chairGeo() {
  var g = new T.Group();
  var leg = lathe([[0, 0], [0.018, 0], [0.024, 0.06], [0.02, 0.18], [0.028, 0.3], [0.03, 0.42], [0.032, 0.44], [0, 0.44]], M.trim, 12);
  [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(function (p) { var l = leg.clone(); l.position.set(p[0], 0, p[1]); g.add(l); });
  var frame = new T.Mesh(roundedBoxGeo(0.5, 0.07, 0.5, 0.02), M.trim); frame.position.y = 0.46; frame.castShadow = true; g.add(frame);
  var seat = new T.Mesh(roundedBoxGeo(0.46, 0.08, 0.46, 0.035), M.velvet); seat.position.y = 0.52; seat.castShadow = true; g.add(seat);
  var gilt = new T.Mesh(new T.BoxGeometry(0.5, 0.012, 0.012), M.gold); gilt.position.set(0, 0.45, 0.252); g.add(gilt);
  // costas: medalhão oval de veludo numa moldura branca e dourada
  var back = new T.Group(); back.position.set(0, 0.86, -0.22); back.rotation.x = -0.08; g.add(back);
  var ov = new T.Mesh(new T.TorusGeometry(0.2, 0.022, 10, 40), M.trim); ov.scale.set(1, 1.18, 1); back.add(ov);
  var ovg = new T.Mesh(new T.TorusGeometry(0.2, 0.007, 8, 40), M.gold); ovg.scale.set(1, 1.18, 1); ovg.position.z = 0.02; back.add(ovg);
  var cush = new T.Mesh(new T.CylinderGeometry(0.19, 0.19, 0.05, 32), M.velvet); cush.rotation.x = Math.PI / 2; cush.scale.set(1, 1, 1.16); back.add(cush);
  [-0.2, 0.2].forEach(function (x) { var p = cyl(0.016, 0.018, 0.4, M.trim, x, -0.24, 0.0, back, 10); });
  g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function buildChairs() {
  var proto = chairGeo();
  var rows = [[-1.55], [-0.55]];
  rows.forEach(function (r, ri) {
    for (var i = 0; i < 4; i++) {
      var c = proto.clone(); var x = -1.8 + i * 1.2 + (ri ? 0.12 : 0);
      c.position.set(x, 0, r[0]); c.rotation.y = Math.PI + (Math.random() - .5) * 0.06; c.scale.setScalar(0.9); root.add(c);
      blob(x, r[0], 0.9, 0.9);
    }
  });
  // tapete por baixo
  var rug = new T.Mesh(new T.PlaneGeometry(5.6, 3.5), new T.MeshStandardMaterial({ map: rugTex(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.008, -1.0); rug.receiveShadow = true; root.add(rug);
  // púlpito com microfone ao estilo de 1950
  var lec = new T.Group(); lec.position.set(1.75, 0, -3.65); lec.rotation.y = -0.3; root.add(lec);
  var col = lathe([[0, 0], [0.22, 0], [0.2, 0.05], [0.07, 0.1], [0.06, 1.0], [0.1, 1.04], [0, 1.04]], M.mahogany); lec.add(col);
  var top = new T.Mesh(roundedBoxGeo(0.6, 0.04, 0.42, 0.012), M.mahogany); top.position.set(0, 1.1, 0); top.rotation.x = 0.28; top.castShadow = true; lec.add(top);
  var mic = new T.Group(); mic.position.set(0, 1.13, -0.12); lec.add(mic);
  cyl(0.008, 0.008, 0.32, M.steel, 0, 0.16, 0, mic, 8);
  var head = new T.Mesh(new T.CapsuleGeometry(0.035, 0.06, 6, 16), M.steel); head.position.set(0, 0.36, 0.02); head.rotation.x = 0.4; mic.add(head);
  var grill = new T.Mesh(new T.TorusGeometry(0.036, 0.006, 8, 24), M.blackMetal); grill.position.set(0, 0.36, 0.02); grill.rotation.x = 0.4 + Math.PI / 2; mic.add(grill);
  blob(1.75, -3.65, 0.8, 0.8);
  // bandeiras (França e União Europeia) junto à lareira
  flag(-1.85, -4.95, 'fr'); flag(-2.25, -4.75, 'eu');
}
function flag(x, z, kind) {
  var g = new T.Group(); g.position.set(x, 0, z); root.add(g);
  var base = lathe([[0, 0], [0.16, 0], [0.14, 0.04], [0.04, 0.07], [0.03, 0.1], [0, 0.1]], M.gold); g.add(base);
  cyl(0.016, 0.016, 2.5, M.gold, 0, 1.3, 0, g, 10);
  var fin = new T.Mesh(new T.SphereGeometry(0.035, 16, 12), M.gold); fin.position.y = 2.58; g.add(fin);
  var tex = canvasTex(300, 200, function (c, w, h) {
    if (kind === 'fr') { c.fillStyle = '#1c3f94'; c.fillRect(0, 0, w / 3, h); c.fillStyle = '#f4f4f0'; c.fillRect(w / 3, 0, w / 3, h); c.fillStyle = '#d32a2e'; c.fillRect(2 * w / 3, 0, w / 3, h); }
    else {
      c.fillStyle = '#003399'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffcc00';
      for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, cx = w / 2 + Math.sin(a) * h / 3, cy = h / 2 - Math.cos(a) * h / 3; c.beginPath(); for (var j = 0; j < 10; j++) { var b = j / 10 * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? 4.2 : 10.5; c.lineTo(cx + Math.cos(b) * rr, cy + Math.sin(b) * rr); } c.fill(); }
    }
    var gr = c.createLinearGradient(0, 0, w, 0); for (var k = 0; k <= 8; k++) gr.addColorStop(k / 8, 'rgba(0,0,0,' + (k % 2 ? .16 : 0) + ')');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  // bandeira pendente (caída), com pregas verticais
  var fg = new T.PlaneGeometry(0.62, 1.05, 20, 8), p = fg.attributes.position;
  for (var i = 0; i < p.count; i++) { var u = p.getX(i) + 0.31, v = p.getY(i); p.setZ(i, Math.sin(u * 22) * 0.03 * (0.4 + u)); p.setX(i, p.getX(i) * (1 - (0.52 - v) * 0.12)); }
  fg.computeVertexNormals();
  var fm = new T.Mesh(fg, new T.MeshStandardMaterial({ map: tex, side: T.DoubleSide, roughness: 0.85 }));
  fm.position.set(0.32, 1.95, 0); fm.rotation.y = 0.5; fm.castShadow = true; g.add(fm);
}

/* ---------------- Secretária, máquina de escrever, telefone ---------------- */
var paperTex = null;
function buildDesk() {
  var g = new T.Group(); g.position.set(-3.9, 0, -2.35); g.rotation.y = 0.42; root.add(g);
  // bureau plat em mogno com tampo de couro verde
  var top = new T.Mesh(roundedBoxGeo(1.7, 0.05, 0.86, 0.015), M.mahogany); top.position.y = 0.76; top.castShadow = true; top.receiveShadow = true; g.add(top);
  var lea = new T.Mesh(new T.PlaneGeometry(1.5, 0.68), M.leather); lea.rotation.x = -Math.PI / 2; lea.position.y = 0.787; lea.receiveShadow = true; g.add(lea);
  var edge = frameBox(1.52, 0.7, 0.012, 0.004, M.gold); edge.rotation.x = -Math.PI / 2; edge.position.y = 0.788; g.add(edge);
  box(1.6, 0.12, 0.78, M.mahogany, 0, 0.67, 0, g);
  box(0.5, 0.06, 0.01, M.mahogany, -0.5, 0.67, 0.395, g); box(0.5, 0.06, 0.01, M.mahogany, 0.5, 0.67, 0.395, g);
  [-0.5, 0.5].forEach(function (x) { var kn = new T.Mesh(new T.SphereGeometry(0.014, 12, 8), M.brass); kn.position.set(x, 0.67, 0.405); g.add(kn); });
  var leg = lathe([[0, 0], [0.025, 0], [0.03, 0.05], [0.022, 0.2], [0.03, 0.45], [0.04, 0.58], [0.05, 0.61], [0, 0.61]], M.mahogany, 14);
  [[-0.76, -0.35], [0.76, -0.35], [-0.76, 0.35], [0.76, 0.35]].forEach(function (p) { var l = leg.clone(); l.position.set(p[0], 0, p[1]); g.add(l); var sab = new T.Mesh(new T.CylinderGeometry(0.03, 0.026, 0.04, 12), M.gold); sab.position.set(p[0], 0.02, p[1]); g.add(sab); });
  blob(-3.9, -2.35, 2.3, 1.4);
  // cadeira da secretária
  var ch = chairGeo(); ch.position.set(0.05, 0, 0.75); ch.rotation.y = Math.PI + 0.15; g.add(ch);
  buildTypewriter(g);
  buildPhone(g);
  buildLamp(g);
  // pilha de dossiês e tinteiro
  for (var i = 0; i < 4; i++) { var d = box(0.32, 0.018, 0.24, new T.MeshStandardMaterial({ color: [0xc8b58a, 0x9a6b3d, 0xd8cfb4, 0x7d8a6a][i], roughness: 0.9 }), 0.62, 0.8 + i * 0.019, -0.12, g); d.rotation.y = (i - 1.5) * 0.06; }
  var ink = lathe([[0, 0], [0.04, 0], [0.045, 0.02], [0.03, 0.05], [0.015, 0.06], [0.015, 0.07], [0, 0.07]], M.crystal, 20); ink.position.set(0.52, 0.79, 0.2); g.add(ink);
  var pen = cyl(0.004, 0.003, 0.16, M.blackMetal, 0.48, 0.8, 0.12, g, 8); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.6;
  addStation('maquina', g, new T.Vector3(-0.15, 0.95, 0.05), [0.75, 0.45, 0.6], { pos: [-2.75, 1.45, -1.25], look: [-3.98, 0.88, -2.35] });
  addStation('telefone', g, new T.Vector3(-0.62, 0.86, 0.05), [0.3, 0.25, 0.3], null);
}
function buildTypewriter(parent) {
  var g = new T.Group(); g.position.set(-0.15, 0.79, 0.04); parent.add(g);
  // corpo em laca preta, com a forma inclinada das máquinas dos anos 1940
  var sh = new T.Shape(); sh.moveTo(-0.17, 0); sh.lineTo(0.17, 0); sh.lineTo(0.17, 0.05); sh.quadraticCurveTo(0.12, 0.14, -0.04, 0.17); sh.lineTo(-0.15, 0.17); sh.quadraticCurveTo(-0.17, 0.12, -0.17, 0);
  var bg = new T.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 });
  bg.translate(0, 0, -0.18); bg.rotateY(Math.PI / 2); bg.computeVertexNormals();
  var body = new T.Mesh(bg, M.lacquer); body.castShadow = true; body.receiveShadow = true; g.add(body);
  // fendas e emblema
  var badge = new T.Mesh(new T.PlaneGeometry(0.08, 0.016), new T.MeshStandardMaterial({ color: 0xd8c28a, metalness: 1, roughness: 0.3 }));
  badge.position.set(0, 0.11, 0.115); badge.rotation.x = -0.75; g.add(badge);
  // teclado: 4 filas de teclas redondas com aro cromado
  var keyGeo = new T.CylinderGeometry(0.0105, 0.0105, 0.006, 20);
  var rimGeo = new T.TorusGeometry(0.0108, 0.0016, 6, 20);
  var stemGeo = new T.CylinderGeometry(0.0018, 0.0018, 0.03, 6);
  var keys = new T.InstancedMesh(keyGeo, M.keyTop, 46), rims = new T.InstancedMesh(rimGeo, M.steel, 46), stems = new T.InstancedMesh(stemGeo, M.steel, 46);
  var mtx = new T.Matrix4(), q = new T.Quaternion(), qr = new T.Quaternion(), e = new T.Euler(), s1 = new T.Vector3(1, 1, 1), n = 0;
  for (var r = 0; r < 4; r++) {
    var cnt = [11, 12, 11, 10][r];
    for (var k = 0; k < cnt; k++) {
      var x = (k - (cnt - 1) / 2) * 0.026 + (r % 2) * 0.006, z = 0.2 - r * 0.026, y = 0.045 + r * 0.016;
      q.setFromEuler(e.set(-0.3, 0, 0)); mtx.compose(new T.Vector3(x, y, z), q, s1); keys.setMatrixAt(n, mtx);
      qr.setFromEuler(e.set(Math.PI / 2 - 0.3, 0, 0)); mtx.compose(new T.Vector3(x, y + 0.002, z), qr, s1); rims.setMatrixAt(n, mtx);
      mtx.compose(new T.Vector3(x, y - 0.016, z - 0.004), q, s1); stems.setMatrixAt(n, mtx);
      n++;
    }
  }
  keys.count = rims.count = stems.count = n;
  [keys, rims, stems].forEach(function (m) { m.castShadow = true; g.add(m); });
  var space = new T.Mesh(roundedBoxGeo(0.17, 0.008, 0.016, 0.004), M.keyTop); space.position.set(0, 0.03, 0.235); space.rotation.x = -0.3; g.add(space);
  // cesto dos tipos (segmento) e rolo com o papel
  var basket = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.02, 32, 1, false, Math.PI, Math.PI), M.blackMetal); basket.position.set(0, 0.15, 0.03); basket.rotation.x = Math.PI / 2 - 0.4; g.add(basket);
  var carriage = new T.Group(); carriage.position.set(0, 0.19, -0.05); g.add(carriage);
  var platen = new T.Mesh(new T.CylinderGeometry(0.024, 0.024, 0.38, 28), M.rubber); platen.rotation.z = Math.PI / 2; carriage.add(platen);
  [-0.2, 0.2].forEach(function (x) { var kn = new T.Mesh(new T.CylinderGeometry(0.026, 0.026, 0.02, 24), M.lacquer); kn.rotation.z = Math.PI / 2; kn.position.x = x; carriage.add(kn); });
  box(0.42, 0.03, 0.06, M.lacquer, 0, -0.02, -0.03, carriage);
  var lever = new T.Mesh(new T.TorusGeometry(0.04, 0.005, 8, 16, Math.PI * 0.7), M.steel); lever.position.set(-0.22, 0.03, 0.02); lever.rotation.set(0, Math.PI / 2, 0.5); carriage.add(lever);
  var guide = box(0.3, 0.004, 0.02, M.steel, 0, 0.02, 0.025, carriage);
  // folha de papel com o rascunho
  paperTex = canvasTex(512, 720, drawDraft);
  var pg = new T.PlaneGeometry(0.21, 0.29, 1, 12), pp = pg.attributes.position;
  for (var i = 0; i < pp.count; i++) { var vy = pp.getY(i); pp.setZ(i, vy < -0.1 ? (vy + 0.1) * (vy + 0.1) * 4 : 0); }
  pg.computeVertexNormals();
  var paper = new T.Mesh(pg, new T.MeshStandardMaterial({ map: paperTex, roughness: 0.95, side: T.DoubleSide }));
  paper.position.set(0, 0.16, -0.02); paper.rotation.x = -0.18; paper.castShadow = true; carriage.add(paper);
  Sala._paperMesh = paper;
}
var draftDone = false;
function drawDraft(c, w, h) {
  c.fillStyle = '#f5efdf'; c.fillRect(0, 0, w, h); noise(c, w, h, 8, 77);
  c.fillStyle = '#1e1b18'; c.font = '19px "Courier New", monospace';
  var lines = draftDone ? [
    'DECLARATION DU 9 MAI 1950', '', 'La paix mondiale ne saurait', 'être sauvegardée sans des', 'efforts créateurs à la mesure', 'des dangers qui la menacent.', '', 'L\'Europe ne se fera pas d\'un', 'coup, ni dans une construction', 'd\'ensemble : elle se fera par', 'des réalisations concrètes', 'créant d\'abord une solidarité', 'de fait.', '', '            — 9e version —'
  ] : ['DECLARATION DU 9 MAI 1950', '', 'La paix mondiale ne saurait', 'être sauvegardée sans des', 'efforts ________ à la mesure', 'des dangers qui la menacent.', '', 'L\'Europe ne se fera pas d\'un', 'coup ...', '', '   [ texte incomplet ]'];
  lines.forEach(function (l, i) { c.globalAlpha = 0.82 + Math.random() * 0.18; c.fillText(l, 40, 70 + i * 34); });
  c.globalAlpha = 1;
  if (draftDone) { c.strokeStyle = 'rgba(160,20,20,.75)'; c.lineWidth = 3; c.strokeRect(300, 560, 170, 70); c.fillStyle = 'rgba(160,20,20,.8)'; c.font = 'bold 22px sans-serif'; c.fillText('VU · R.S.', 330, 603); }
}
function buildPhone(parent) {
  var g = new T.Group(); g.position.set(-0.62, 0.79, 0.04); g.rotation.y = 0.3; parent.add(g);
  // telefone de baquelite com marcador rotativo
  var sh = new T.Shape(); sh.moveTo(-0.09, 0); sh.lineTo(0.09, 0); sh.lineTo(0.075, 0.08); sh.quadraticCurveTo(0, 0.1, -0.075, 0.08); sh.lineTo(-0.09, 0);
  var bg = new T.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 4 }); bg.translate(0, 0, -0.08); bg.computeVertexNormals();
  var body = new T.Mesh(bg, M.lacquer); body.castShadow = true; g.add(body);
  var dialT = canvasTex(256, 256, function (c, w, h) {
    c.fillStyle = '#f3ecdc'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
    c.fillStyle = '#111'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var i = 0; i < 10; i++) { var a = (-60 - i * 28) * Math.PI / 180; c.fillText(String((i + 1) % 10), w / 2 + Math.cos(a) * 90, h / 2 + Math.sin(a) * 90); }
    c.fillStyle = '#9b1b1b'; c.font = 'bold 16px sans-serif'; c.fillText('ARCHIVES', w / 2, h / 2);
  });
  var dial = new T.Mesh(new T.CircleGeometry(0.048, 40), new T.MeshStandardMaterial({ map: dialT, roughness: 0.4 }));
  dial.position.set(0, 0.075, 0.055); dial.rotation.x = -0.55; g.add(dial);
  var finger = new T.Mesh(new T.RingGeometry(0.03, 0.05, 40), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1 }));
  finger.position.set(0, 0.078, 0.057); finger.rotation.x = -0.55; g.add(finger);
  // auscultador
  var hs = new T.Group(); hs.position.set(0, 0.115, -0.01); g.add(hs);
  var handle = new T.Mesh(new T.CapsuleGeometry(0.014, 0.16, 6, 12), M.lacquer); handle.rotation.z = Math.PI / 2; hs.add(handle);
  [-0.095, 0.095].forEach(function (x) { var cup = new T.Mesh(new T.CylinderGeometry(0.028, 0.02, 0.04, 20), M.lacquer); cup.position.set(x, -0.012, 0); hs.add(cup); });
  [-0.06, 0.06].forEach(function (x) { var cr = box(0.012, 0.03, 0.02, M.lacquer, x, 0.095, -0.01, g); });
  // fio em espiral
  var pts = []; for (var i = 0; i <= 120; i++) { var t = i / 120; pts.push(new T.Vector3(-0.11 - t * 0.12 + Math.cos(t * 60) * 0.008, 0.06 - t * 0.055 + Math.sin(t * 60) * 0.008, -0.02 + t * 0.05)); }
  var cord = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 240, 0.003, 6), M.lacquer); g.add(cord);
  Sala._handset = hs;
}
function buildLamp(parent) {
  var g = new T.Group(); g.position.set(0.55, 0.79, -0.27); parent.add(g);
  var base = lathe([[0, 0], [0.08, 0], [0.075, 0.015], [0.03, 0.03], [0, 0.03]], M.brass); g.add(base);
  cyl(0.008, 0.008, 0.34, M.brass, 0, 0.19, 0, g, 10);
  var arm = cyl(0.006, 0.006, 0.18, M.brass, -0.07, 0.36, 0, g, 8); arm.rotation.z = Math.PI / 2;
  // abajur de banqueiro em vidro verde
  var shadeMat = new T.MeshPhysicalMaterial({ color: 0x0f5a35, roughness: 0.15, clearcoat: 1, side: T.DoubleSide, emissive: 0x0a2a14, emissiveIntensity: 0.4 });
  var shade = new T.Mesh(new T.CylinderGeometry(0.03, 0.11, 0.09, 40, 1, true, 0, Math.PI * 2), shadeMat); shade.scale.set(1.6, 1, 1); shade.rotation.y = Math.PI / 2; shade.position.set(-0.16, 0.34, 0); shade.rotation.order = 'YXZ'; g.add(shade);
  var bulb = new T.Mesh(new T.SphereGeometry(0.02, 12, 8), new T.MeshBasicMaterial({ color: 0xfff1c9 })); bulb.position.set(-0.16, 0.32, 0); g.add(bulb);
  var L = new T.PointLight(0xffd59a, 1.6, 2.2, 2); L.position.set(-0.16, 0.3, 0); g.add(L);
}

/* ---------------- Mapa no cavalete ---------------- */
var mapTex = null, mapSel = {};
function buildEasel() {
  var g = new T.Group(); g.position.set(4.35, 0, -2.65); g.rotation.y = -0.45; root.add(g);
  var legL = box(0.05, 2.2, 0.04, M.oak, -0.55, 1.05, 0.05, g); legL.rotation.z = -0.12;
  var legR = box(0.05, 2.2, 0.04, M.oak, 0.55, 1.05, 0.05, g); legR.rotation.z = 0.12;
  var legB = box(0.05, 2.1, 0.04, M.oak, 0, 1.0, -0.45, g); legB.rotation.x = 0.28;
  box(1.25, 0.05, 0.08, M.oak, 0, 0.7, 0.08, g);
  box(0.5, 0.03, 0.03, M.oak, 0, 1.92, 0.04, g);
  // quadro do mapa
  var board = new T.Mesh(roundedBoxGeo(1.36, 1.06, 0.03, 0.01), M.oak); board.position.set(0, 1.25, 0.11); board.rotation.x = -0.08; board.castShadow = true; g.add(board);
  mapTex = canvasTex(1360, 1060, drawMap);
  var map = new T.Mesh(new T.PlaneGeometry(1.3, 1.0), new T.MeshStandardMaterial({ map: mapTex, roughness: 0.9 }));
  map.position.set(0, 1.25, 0.128); map.rotation.x = -0.08; g.add(map);
  // pioneses
  [[-0.62, 1.72], [0.62, 1.72], [-0.62, 0.78], [0.62, 0.78]].forEach(function (p) { var pin = new T.Mesh(new T.SphereGeometry(0.012, 10, 8), M.brass); pin.position.set(p[0], p[1], 0.15 - (p[1] - 1.25) * 0.08); g.add(pin); });
  blob(4.35, -2.65, 1.6, 1.2);
  addStation('mapa', g, new T.Vector3(0, 1.25, 0.15), [1.4, 1.1, 0.3], { pos: [3.45, 1.4, -0.75], look: [4.35, 1.25, -2.65] });
}
function proj(lon, lat) { var a = (lon - 10) * Math.PI / 180, b = lat * Math.PI / 180, o = 52 * Math.PI / 180, k = Math.sqrt(2 / (1 + Math.sin(o) * Math.sin(b) + Math.cos(o) * Math.cos(b) * Math.cos(a))); return [400 + 800 * k * Math.cos(b) * Math.sin(a), 340 - 800 * k * (Math.cos(o) * Math.sin(b) - Math.sin(o) * Math.cos(b) * Math.cos(a))]; }
Sala.proj = proj;
Sala.INNER_BORDER = [[10.9, 54.0], [10.75, 53.6], [10.6, 53.36], [11.0, 53.2], [11.55, 52.95], [11.0, 52.78], [10.78, 52.5], [10.95, 52.07], [10.6, 51.65], [10.2, 51.45], [9.95, 51.25], [10.18, 50.95], [9.95, 50.62], [10.45, 50.38], [10.9, 50.33], [11.3, 50.45], [11.7, 50.38], [12.1, 50.32]];
Sala.BASINS = [['Ruhr', 7.2, 51.5], ['Sarre', 7.0, 49.3], ['Lorena', 6.05, 49.25], ['Norte · Pas-de-Calais', 2.85, 50.45], ['Valónia', 4.6, 50.45], ['Limburgo', 5.9, 50.95]];
function drawMap(c, w, h) {
  // papel envelhecido
  c.fillStyle = '#efe4c8'; c.fillRect(0, 0, w, h);
  var v = c.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, w * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(110,70,20,.35)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  c.save();
  // enquadramento: Europa Ocidental (coordenadas da projeção 800×640)
  var sx = w / 470, ox = 150, oy = 250; c.scale(sx, sx); c.translate(-ox, -oy);
  c.fillStyle = '#c9d6d2'; c.fillRect(ox, oy, 470, 380);
  var sel = mapSel;
  (window.MAPA_EUROPA || []).forEach(function (m) {
    var p = new Path2D(m.d);
    c.fillStyle = sel[m.id] === 'ok' ? '#e0b44a' : sel[m.id] === 'no' ? '#c4b8a4' : '#efe6cf';
    c.fill(p); c.strokeStyle = '#7d6a4a'; c.lineWidth = 0.7; c.stroke(p);
  });
  // fronteira de 1950 entre a RFA e a RDA
  c.setLineDash([4, 3]); c.strokeStyle = '#8b1a1a'; c.lineWidth = 1.6; c.beginPath();
  Sala.INNER_BORDER.forEach(function (p, i) { var q = proj(p[0], p[1]); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.stroke(); c.setLineDash([]);
  // bacias de carvão e aço
  Sala.BASINS.forEach(function (b) { var q = proj(b[1], b[2]); c.fillStyle = '#1c1c1c'; c.beginPath(); c.moveTo(q[0], q[1] - 5); c.lineTo(q[0] + 4.5, q[1] + 3); c.lineTo(q[0] - 4.5, q[1] + 3); c.fill(); });
  c.restore();
  // cartela
  c.fillStyle = 'rgba(245,236,212,.95)'; c.fillRect(30, 30, 520, 120); c.strokeStyle = '#5a4630'; c.lineWidth = 3; c.strokeRect(30, 30, 520, 120);
  c.fillStyle = '#2a2018'; c.font = 'bold 40px Georgia, serif'; c.fillText('EUROPA OCIDENTAL · 1950', 50, 84);
  c.font = 'italic 26px Georgia, serif'; c.fillText('▲ bacias de carvão e aço   ─ ─ RFA / RDA', 50, 128);
  c.strokeStyle = '#5a4630'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
  noise(c, w, h, 10, 55);
}

/* ---------------- Vitrina com o Tratado de Paris ---------------- */
var treatyTex = null;
function buildVitrine() {
  var g = new T.Group(); g.position.set(-5.2, 0, 2.3); g.rotation.y = 0.9; root.add(g);
  // móvel de mogno com pés torneados
  var cab = new T.Mesh(roundedBoxGeo(1.3, 0.72, 0.8, 0.02), M.mahogany); cab.position.y = 0.52; cab.castShadow = true; cab.receiveShadow = true; g.add(cab);
  var leg = lathe([[0, 0], [0.03, 0], [0.035, 0.05], [0.025, 0.12], [0.04, 0.16], [0, 0.16]], M.mahogany, 12);
  [[-0.58, -0.34], [0.58, -0.34], [-0.58, 0.34], [0.58, 0.34]].forEach(function (p) { var l = leg.clone(); l.position.set(p[0], 0, p[1]); g.add(l); });
  var fb = frameBox(1.1, 0.5, 0.025, 0.02, M.gold); fb.position.set(0, 0.52, 0.41); g.add(fb);
  // forro de veludo azul, almofada inclinada
  var bed = box(1.22, 0.03, 0.72, M.velvetBlue, 0, 0.9, 0, g);
  var cush = box(0.8, 0.06, 0.5, M.velvetBlue, 0, 0.94, 0, g); cush.rotation.x = -0.18;
  // o livro do Tratado aberto
  treatyTex = canvasTex(1024, 720, drawTreaty);
  var book = new T.Group(); book.position.set(0, 0.99, 0.0); book.rotation.x = -0.18; g.add(book);
  var cover = new T.Mesh(roundedBoxGeo(0.66, 0.012, 0.44, 0.004), new T.MeshStandardMaterial({ color: 0x5a1a1a, roughness: 0.6 })); book.add(cover);
  // páginas curvas
  var pg = new T.PlaneGeometry(0.64, 0.42, 32, 1), pp = pg.attributes.position;
  for (var i = 0; i < pp.count; i++) { var x = pp.getX(i); pp.setZ(i, 0.025 * Math.sin(Math.abs(x) / 0.32 * Math.PI) * (1 - Math.abs(x) / 0.32 * 0.3) + (Math.abs(x) < 0.01 ? -0.01 : 0)); }
  pg.rotateX(-Math.PI / 2); pg.computeVertexNormals();
  var pages = new T.Mesh(pg, new T.MeshStandardMaterial({ map: treatyTex, roughness: 0.9 })); pages.position.y = 0.012; pages.castShadow = true; book.add(pages);
  // fitas de seda e selos de lacre
  ['#1c3f94', '#c9a85a', '#b31d24'].forEach(function (col, k) {
    var rb = new T.Mesh(new T.PlaneGeometry(0.012, 0.22), new T.MeshStandardMaterial({ color: col, roughness: 0.5, side: T.DoubleSide })); rb.rotation.x = -Math.PI / 2 + 0.3; rb.position.set(0.01 + k * 0.014, 0.01, 0.3); book.add(rb);
  });
  // caixa de vidro com arestas de latão
  var glass = new T.Mesh(new T.BoxGeometry(1.24, 0.52, 0.74), M.glass); glass.position.y = 1.17; g.add(glass);
  [[-0.62, -0.37], [0.62, -0.37], [-0.62, 0.37], [0.62, 0.37]].forEach(function (p) { box(0.015, 0.52, 0.015, M.brass, p[0], 1.17, p[1], g); });
  var topF = frameBox(1.26, 0.76, 0.015, 0.015, M.brass); topF.rotation.x = Math.PI / 2; topF.position.y = 1.43; g.add(topF);
  var botF = frameBox(1.26, 0.76, 0.015, 0.015, M.brass); botF.rotation.x = Math.PI / 2; botF.position.y = 0.915; g.add(botF);
  // etiqueta do museu
  var lab = canvasTex(512, 160, function (c, w, h) { c.fillStyle = '#f7f1e2'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 34px Georgia, serif'; c.fillText('Tratado de Paris', 24, 56); c.font = '24px Georgia, serif'; c.fillText('18 de abril de 1951 · Cópia de exposição', 24, 100); c.fillText('Comunidade Europeia do Carvão e do Aço', 24, 136); });
  var labM = new T.Mesh(new T.PlaneGeometry(0.34, 0.106), new T.MeshStandardMaterial({ map: lab, roughness: 0.8 })); labM.position.set(0.3, 0.915, 0.38); labM.rotation.x = -0.6; g.add(labM);
  blob(-5.2, 2.3, 1.9, 1.5);
  addStation('tratado', g, new T.Vector3(0, 1.1, 0), [1.3, 0.7, 0.85], { pos: [-3.85, 1.85, 1.65], look: [-5.2, 0.98, 2.3] });
}
var treatyStage = 0;
function drawTreaty(c, w, h) {
  c.fillStyle = '#f3ead2'; c.fillRect(0, 0, w, h);
  var gr = c.createLinearGradient(w / 2 - 60, 0, w / 2 + 60, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(80,50,10,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(w / 2 - 60, 0, 120, h);
  c.fillStyle = '#2a2018'; c.textAlign = 'left';
  c.font = 'bold 30px Georgia, serif'; c.fillText('Article 97', 60, 90);
  c.font = '25px Georgia, serif';
  wrapText(c, 'Le présent Traité est conclu pour une durée de cinquante ans à dater de son entrée en vigueur.', 60, 140, 400, 36);
  c.font = 'italic 22px Georgia, serif'; c.fillText('Fait à Paris, le dix-huit avril', 60, 330); c.fillText('mil neuf cent cinquante et un.', 60, 362);
  // assinaturas
  var sigs = ['Adenauer', 'Paul van Zeeland', 'J. Meurice', 'Schuman', 'Sforza', 'Jos. Bech', 'Stikker', 'v. d. Brink'];
  c.font = 'italic 30px "Brush Script MT", "Segoe Script", cursive';
  sigs.forEach(function (s, i) { var x = 560 + (i % 2) * 220, y = 110 + Math.floor(i / 2) * 140; c.fillStyle = '#1b2a55'; c.fillText(s, x, y); c.fillStyle = 'rgba(160,25,25,.9)'; c.beginPath(); c.arc(x + 150, y + 36, 26, 0, 7); c.fill(); c.fillStyle = 'rgba(255,200,180,.35)'; c.beginPath(); c.arc(x + 146, y + 32, 12, 0, 7); c.fill(); });
  noise(c, w, h, 9, 91);
}

/* ---------------- Cofre ---------------- */
function buildSafe() {
  var g = new T.Group(); g.position.set(X1 - 0.5, 0, 1.6); g.rotation.y = -Math.PI / 2; root.add(g);
  var Wd = 0.92, Hd = 1.45, Dp = 0.72;
  // plinto e pés
  box(Wd + 0.08, 0.12, Dp + 0.06, M.blackMetal, 0, 0.06, 0, g);
  // corpo (verde com filetes dourados)
  var stripes = canvasTex(512, 800, function (c, w, h) {
    c.fillStyle = '#1b3a2a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c9a85a'; c.lineWidth = 4; c.strokeRect(26, 26, w - 52, h - 52); c.lineWidth = 1.5; c.strokeRect(40, 40, w - 80, h - 80);
    [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 14, 0, 7); c.stroke(); });
    noise(c, w, h, 6, 12);
  });
  var sideMat = new T.MeshPhysicalMaterial({ map: stripes, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  // corpo oco (paredes grossas), para se ver o interior quando a porta abre
  var t = 0.07, y0 = 0.12 + Hd / 2;
  box(t, Hd, Dp, sideMat, -Wd / 2 + t / 2, y0, 0, g); box(t, Hd, Dp, sideMat, Wd / 2 - t / 2, y0, 0, g);
  box(Wd, t, Dp, sideMat, 0, 0.12 + Hd - t / 2, 0, g); box(Wd, t, Dp, sideMat, 0, 0.12 + t / 2, 0, g);
  box(Wd, Hd, t, sideMat, 0, y0, -Dp / 2 + t / 2, g);
  var cap = new T.Mesh(roundedBoxGeo(Wd + 0.04, 0.05, Dp + 0.04, 0.015), M.blackMetal); cap.position.y = 0.12 + Hd + 0.025; cap.castShadow = true; g.add(cap);
  // interior escuro visível quando a porta abre
  var innerMat = new T.MeshStandardMaterial({ color: 0x6b1d22, roughness: 0.9 });
  box(Wd - 0.15, Hd - 0.15, 0.01, innerMat, 0, 0.12 + Hd / 2, -Dp / 2 + 0.075, g);
  box(Wd - 0.15, 0.02, Dp - 0.1, M.steel, 0, 0.12 + Hd * 0.55, 0, g);
  box(Wd - 0.15, 0.02, Dp - 0.1, M.steel, 0, 0.12 + Hd * 0.25, 0, g);
  for (var bi = 0; bi < 3; bi++) { var bx = box(0.24, 0.3, 0.05 + bi * 0.01, new T.MeshStandardMaterial({ color: [0x7a5a34, 0x3d4a5a, 0x5a3434][bi], roughness: 0.8 }), -0.25 + bi * 0.08, 0.12 + Hd * 0.25 + 0.16, -0.1 + bi * 0.06, g); bx.rotation.y = 0.1 * bi; }
  // documento dentro do cofre
  var docT = canvasTex(256, 360, function (c, w, h) { c.fillStyle = '#efe6cf'; c.fillRect(0, 0, w, h); c.fillStyle = '#7a1d1d'; c.font = 'bold 22px Georgia, serif'; c.fillText('DÉCLARATION', 40, 70); c.font = '18px Georgia, serif'; c.fillStyle = '#333'; c.fillText('9 mai 1950', 70, 100); for (var i = 0; i < 12; i++) { c.fillRect(30, 140 + i * 16, 190 - (i % 3) * 30, 3); } });
  var doc = new T.Mesh(new T.BoxGeometry(0.26, 0.02, 0.34), [M.paper, M.paper, new T.MeshStandardMaterial({ map: docT, roughness: 0.9 }), M.paper, M.paper, M.paper]);
  doc.position.set(0.05, 0.12 + Hd * 0.55 + 0.02, 0.05); g.add(doc); safe.doc = doc;
  var glow = new T.PointLight(0xffe2a8, 0, 1.4, 2); glow.position.set(0, 0.12 + Hd * 0.55 + 0.3, 0.2); g.add(glow); safe.glow = glow;
  // porta com dobradiça à esquerda
  var hinge = new T.Group(); hinge.position.set(-Wd / 2 + 0.05, 0.12 + Hd / 2, Dp / 2 + 0.005); g.add(hinge);
  var doorT = canvasTex(512, 800, function (c, w, h) {
    c.fillStyle = '#1d3d2c'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d4b46a'; c.lineWidth = 5; c.strokeRect(30, 30, w - 60, h - 60); c.lineWidth = 2; c.strokeRect(48, 48, w - 96, h - 96);
    c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 80, h / 2 - 90, 0, 0, 7); c.stroke();
    c.fillStyle = '#d4b46a'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('A. DUBOIS & Cie', w / 2, 110); c.font = 'italic 22px Georgia, serif'; c.fillText('Coffres-forts · Paris · 1924', w / 2, 142);
    noise(c, w, h, 6, 19);
  });
  var doorMat = new T.MeshPhysicalMaterial({ map: doorT, roughness: 0.36, clearcoat: 0.9, clearcoatRoughness: 0.18 });
  var door = new T.Mesh(roundedBoxGeo(Wd - 0.1, Hd - 0.1, 0.08, 0.02), doorMat); door.position.set(Wd / 2 - 0.05, 0, 0.03); door.castShadow = true; hinge.add(door);
  // dobradiças cromadas
  [-0.5, 0.5].forEach(function (y) { var hg = cyl(0.025, 0.025, 0.16, M.brass, -0.01, y, 0.02, hinge, 16); });
  // marcador de combinação 0–99
  var dialT = canvasTex(512, 512, function (c, w, h) {
    var gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#e8d6a2'); gr.addColorStop(1, '#a8823f');
    c.fillStyle = gr; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
    c.fillStyle = '#2a1e10'; c.strokeStyle = '#2a1e10'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var i = 0; i < 100; i++) {
      var a = i / 100 * Math.PI * 2; var r0 = w / 2 - 8, r1 = r0 - (i % 10 === 0 ? 34 : i % 5 === 0 ? 24 : 14);
      c.lineWidth = i % 10 === 0 ? 4 : 2; c.beginPath(); c.moveTo(w / 2 + Math.sin(a) * r0, h / 2 - Math.cos(a) * r0); c.lineTo(w / 2 + Math.sin(a) * r1, h / 2 - Math.cos(a) * r1); c.stroke();
      if (i % 10 === 0) { c.save(); c.translate(w / 2 + Math.sin(a) * (r0 - 62), h / 2 - Math.cos(a) * (r0 - 62)); c.rotate(a); c.font = 'bold 40px Georgia, serif'; c.fillText(String(i), 0, 0); c.restore(); }
    }
    c.beginPath(); c.arc(w / 2, h / 2, 90, 0, 7); c.lineWidth = 3; c.stroke();
  });
  var dialG = new T.Group(); dialG.position.set(Wd / 2 - 0.05, 0.18, 0.08); hinge.add(dialG);
  var ringM = new T.Mesh(new T.CylinderGeometry(0.115, 0.12, 0.02, 64), M.gold); ringM.rotation.x = Math.PI / 2; dialG.add(ringM);
  var dialFace = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.03, 64), [M.gold, new T.MeshStandardMaterial({ map: dialT, metalness: 0.6, roughness: 0.35 }), M.gold]);
  dialFace.rotation.x = Math.PI / 2; dialFace.position.z = 0.02;
  var dialSpin = new T.Group(); dialSpin.position.z = 0; dialSpin.add(dialFace); dialG.add(dialSpin); dialMesh = dialSpin;
  dialFace.rotation.y = Math.PI; // o «0» fica em cima
  var knob = lathe([[0, 0], [0.045, 0], [0.045, 0.02], [0.035, 0.04], [0, 0.045]], M.gold, 32); knob.rotation.x = Math.PI / 2; knob.position.z = 0.035; dialSpin.add(knob);
  var mark = new T.Mesh(new T.ConeGeometry(0.012, 0.025, 3), new T.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.4 })); mark.position.set(0, 0.135, 0.02); mark.rotation.z = Math.PI; dialG.add(mark);
  // puxador em cruz (volante)
  var wheel = new T.Group(); wheel.position.set(Wd / 2 - 0.05, -0.22, 0.09); hinge.add(wheel); safe.wheel = wheel;
  var hub = cyl(0.03, 0.035, 0.05, M.gold, 0, 0, 0, wheel, 24); hub.rotation.x = Math.PI / 2;
  for (var k = 0; k < 4; k++) { var sp = cyl(0.01, 0.01, 0.13, M.gold, 0, 0, 0.02, wheel, 10); sp.rotation.z = k * Math.PI / 2; sp.position.set(Math.cos(k * Math.PI / 2) * 0.065, Math.sin(k * Math.PI / 2) * 0.065, 0.02); var bal = new T.Mesh(new T.SphereGeometry(0.02, 16, 12), M.gold); bal.position.set(Math.cos(k * Math.PI / 2) * 0.13, Math.sin(k * Math.PI / 2) * 0.13, 0.02); wheel.add(bal); }
  // espelho da fechadura
  var esc = new T.Mesh(new T.CircleGeometry(0.03, 24), M.gold); esc.position.set(Wd / 2 - 0.05, -0.47, 0.075); hinge.add(esc);
  safe.hinge = hinge;
  blob(X1 - 0.5, 1.6, 1.3, 1.3);
  addStation('cofre', g, new T.Vector3(0, 0.85, 0.35), [1.0, 1.5, 0.9], { pos: [X1 - 2.9, 1.35, 1.6], look: [X1 - 0.3, 0.88, 1.6] });
}

/* ---------------- Porta, quadros, lustres ---------------- */
function buildDoorAndArt() {
  // porta dupla na parede direita
  var g = new T.Group(); g.position.set(X1 - 0.02, 0, -2.4); g.rotation.y = -Math.PI / 2; root.add(g);
  var fr = frameBox(2.0, 3.4, 0.14, 0.1, M.trim); fr.position.set(0, 1.7, 0); g.add(fr);
  [-1, 1].forEach(function (s) {
    var leaf = new T.Group(); leaf.position.set(s * 0.45, 1.66, 0); g.add(leaf);
    box(0.86, 3.25, 0.05, M.trim, 0, 0, 0, leaf);
    var p1 = frameBox(0.62, 1.6, 0.03, 0.025, M.gold); p1.position.set(0, 0.55, 0.03); leaf.add(p1);
    var p2 = frameBox(0.62, 0.9, 0.03, 0.025, M.gold); p2.position.set(0, -1.0, 0.03); leaf.add(p2);
    var h = cyl(0.012, 0.012, 0.22, M.gold, -s * 0.36, -0.05, 0.06, leaf, 10);
  });
  var ped = lathe([[0, 0], [0.3, 0], [0.2, 0.12], [0, 0.3]], M.trim); ped.scale.set(3.4, 1, 0.3); ped.position.set(0, 3.42, 0.05); g.add(ped);
  // quadros
  painting(-5.1, 2.9, Z0 + 0.03, 0, 1.9, 1.4, 7, 'land');
  painting(5.1, 2.9, Z0 + 0.03, 0, 1.9, 1.4, 13, 'sea');
  painting(X1 - 0.03, 2.95, 0.95, -Math.PI / 2, 1.6, 1.2, 19, 'land');
}
function painting(x, y, z, ry, w, h, seed, kind) {
  var g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g);
  var c = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: paintingTex(seed, kind), roughness: 0.5 })); c.position.z = 0.03; g.add(c);
  var f = frameBox(w + 0.22, h + 0.22, 0.13, 0.08, M.gold); f.position.z = 0.04; g.add(f);
  var f2 = frameBox(w + 0.06, h + 0.06, 0.04, 0.09, M.goldDull); f2.position.z = 0.05; g.add(f2);
  // pequena luz de quadro
  var lamp = cyl(0.015, 0.015, w * 0.5, M.brass, 0, h / 2 + 0.2, 0.18, g, 10); lamp.rotation.z = Math.PI / 2;
}
var chandLights = [];
function buildChandelier(x, z) {
  var g = new T.Group(); g.position.set(x, H, z); root.add(g);
  cyl(0.012, 0.012, 0.9, M.gold, 0, -0.45, 0, g, 8);
  var body = lathe([[0, 0], [0.06, 0], [0.12, -0.08], [0.16, -0.2], [0.1, -0.32], [0.05, -0.38], [0.08, -0.5], [0.03, -0.62], [0, -0.66]], M.gold, 32);
  body.position.y = -0.9; g.add(body);
  var crystalGeo = new T.OctahedronGeometry(0.022, 0);
  var crystals = new T.InstancedMesh(crystalGeo, M.crystal, 160), mtx = new T.Matrix4(), n = 0;
  var flameGeo = new T.SphereGeometry(0.018, 10, 8); flameGeo.scale(1, 1.8, 1);
  for (var i = 0; i < 10; i++) {
    var a = i / 10 * Math.PI * 2, r = 0.62;
    var pts = [new T.Vector3(0, -1.25, 0), new T.Vector3(Math.cos(a) * 0.3, -1.38, Math.sin(a) * 0.3), new T.Vector3(Math.cos(a) * 0.55, -1.25, Math.sin(a) * 0.55), new T.Vector3(Math.cos(a) * r, -1.08, Math.sin(a) * r)];
    var arm = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.012, 8), M.gold); g.add(arm);
    var cup = lathe([[0, 0], [0.045, 0.0], [0.05, 0.02], [0.02, 0.03], [0, 0.03]], M.gold, 16); cup.position.set(Math.cos(a) * r, -1.09, Math.sin(a) * r); g.add(cup);
    var cd = cyl(0.014, 0.014, 0.12, M.candle, Math.cos(a) * r, -1.0, Math.sin(a) * r, g, 10);
    var fl = new T.Mesh(flameGeo, M.flame); fl.position.set(Math.cos(a) * r, -0.92, Math.sin(a) * r); g.add(fl);
    for (var k = 0; k < 6; k++) { var t = k / 6; mtx.makeTranslation(Math.cos(a + t * 0.6) * (0.2 + t * 0.4), -1.3 - Math.sin(t * Math.PI) * 0.12 - 0.05, Math.sin(a + t * 0.6) * (0.2 + t * 0.4)); crystals.setMatrixAt(n++, mtx); }
  }
  for (var j = 0; j < 40; j++) { var b = j / 40 * Math.PI * 2; mtx.makeTranslation(Math.cos(b) * 0.24, -1.62 - (j % 2) * 0.05, Math.sin(b) * 0.24); crystals.setMatrixAt(n++, mtx); }
  for (var l = 0; l < 30; l++) { var c2 = l / 30 * Math.PI * 2; mtx.makeTranslation(Math.cos(c2) * 0.42, -1.45, Math.sin(c2) * 0.42); crystals.setMatrixAt(n++, mtx); }
  crystals.count = n; g.add(crystals);
  var L = new T.PointLight(0xffd8a0, 9, 0, 2); L.position.set(0, -1.15, 0); g.add(L); chandLights.push(L);
}


/* ---------------- Peças extra: telegrama, retratos, jornais ---------------- */
function gueridon(x, z, parent) {
  var g = new T.Group(); g.position.set(x, 0, z); (parent || root).add(g);
  var top = lathe([[0, 0], [0.42, 0], [0.43, 0.02], [0.42, 0.04], [0, 0.04]], M.marble, 48); top.position.y = 0.72; g.add(top);
  var rim = new T.Mesh(new T.TorusGeometry(0.425, 0.012, 8, 48), M.gold); rim.rotation.x = Math.PI / 2; rim.position.y = 0.74; g.add(rim);
  var ped = lathe([[0, 0], [0.05, 0], [0.04, 0.1], [0.03, 0.4], [0.05, 0.62], [0.09, 0.7], [0, 0.72]], M.mahogany, 20); g.add(ped);
  for (var i = 0; i < 3; i++) { var a = i / 3 * Math.PI * 2; var f = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0.12, 0), new T.Vector3(Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16), new T.Vector3(Math.cos(a) * 0.3, 0.015, Math.sin(a) * 0.3)]), 16, 0.022, 8), M.mahogany); f.castShadow = true; g.add(f); var sab = new T.Mesh(new T.SphereGeometry(0.025, 10, 8), M.gold); sab.position.set(Math.cos(a) * 0.3, 0.015, Math.sin(a) * 0.3); g.add(sab); }
  blob(x, z, 1.0, 1.0);
  return g;
}
function buildTelegram() {
  var g = gueridon(5.75, 3.55); g.rotation.y = -2.4;
  var tex = canvasTex(600, 420, function (c, w, h) {
    c.fillStyle = '#f2e8c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#3d2a14';
    c.font = 'bold 34px "Courier New", monospace'; c.fillText('TELEGRAMME', 40, 60);
    c.font = '20px "Courier New", monospace'; c.fillText('BONN  9 MAI 1950  11H', 40, 96);
    c.fillStyle = '#e9dcb0'; c.fillRect(40, 130, 520, 34); c.fillRect(40, 180, 520, 34); c.fillRect(40, 230, 520, 34);
    c.fillStyle = '#1a1a1a'; c.font = 'bold 26px "Courier New", monospace';
    c.fillText('?????? ????? ? ?????', 52, 156); c.fillText('?? ???? ? ???????', 52, 206); c.fillText('CHAVE: ver disco', 52, 256);
    noise(c, w, h, 8, 61);
  });
  var p = new T.Mesh(new T.PlaneGeometry(0.44, 0.31), new T.MeshStandardMaterial({ map: tex, roughness: 0.95, color: 0xe8e0d0 }));
  p.rotation.x = -Math.PI / 2; p.rotation.z = 0.15; p.position.set(-0.08, 0.765, 0.05); p.receiveShadow = true; g.add(p);
  // disco de cifra em latão (dois anéis)
  var outerT = canvasTex(512, 512, function (c, w, h) { discLetters(c, w, h, '#e3cf95', '#2a1d0c', 0); });
  var innerT = canvasTex(512, 512, function (c, w, h) { discLetters(c, w, h, '#cdb06a', '#5a1010', 0, true); });
  var d1 = new T.Mesh(new T.CircleGeometry(0.11, 64), new T.MeshStandardMaterial({ map: outerT, metalness: 0.7, roughness: 0.35 })); d1.rotation.x = -Math.PI / 2; d1.position.set(0.2, 0.767, -0.08); g.add(d1);
  var d2 = new T.Mesh(new T.CircleGeometry(0.075, 64), new T.MeshStandardMaterial({ map: innerT, metalness: 0.7, roughness: 0.35 })); d2.rotation.x = -Math.PI / 2; d2.position.set(0.2, 0.769, -0.08); g.add(d2);
  var pin = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.01, 12), M.gold); pin.position.set(0.2, 0.772, -0.08); g.add(pin);
  Sala._cipherInner = d2;
  addStation('telegrama', g, new T.Vector3(0.05, 0.85, 0), [0.8, 0.3, 0.8], { pos: [5.0, 1.55, 2.75], look: [5.75, 0.74, 3.55] });
}
function discLetters(c, w, h, bg, fg, shift, inner) {
  c.fillStyle = bg; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
  c.fillStyle = fg; c.strokeStyle = fg; c.font = 'bold ' + (inner ? 44 : 34) + 'px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  var L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (var i = 0; i < 26; i++) { var a = i / 26 * Math.PI * 2; c.save(); c.translate(w / 2 + Math.sin(a) * (w / 2 - (inner ? 50 : 30)), h / 2 - Math.cos(a) * (w / 2 - (inner ? 50 : 30))); c.rotate(a); c.fillText(L[i], 0, 0); c.restore(); }
  c.lineWidth = 3; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.stroke();
}
function buildPortraits() {
  var g = new T.Group(); g.position.set(-6.35, 0, -3.75); g.rotation.y = 0.75; root.add(g);
  // painel de exposição em pé, forrado a tecido azul
  box(1.9, 2.1, 0.06, M.velvetBlue, 0, 1.25, 0, g);
  box(1.96, 0.05, 0.1, M.gold, 0, 2.32, 0, g); box(1.96, 0.05, 0.1, M.gold, 0, 0.18, 0, g);
  box(0.06, 0.2, 0.5, M.blackMetal, -0.8, 0.1, 0, g); box(0.06, 0.2, 0.5, M.blackMetal, 0.8, 0.1, 0, g);
  var titleT = canvasTex(800, 90, function (c, w, h) { c.fillStyle = '#1c2b57'; c.fillRect(0, 0, w, h); c.fillStyle = '#f0d58a'; c.font = 'bold 46px Georgia, serif'; c.textAlign = 'center'; c.fillText('OS PAIS FUNDADORES', w / 2, 60); });
  var tm = new T.Mesh(new T.PlaneGeometry(1.6, 0.18), new T.MeshStandardMaterial({ map: titleT, roughness: 0.8 })); tm.position.set(0, 2.12, 0.035); g.add(tm);
  for (var i = 0; i < 4; i++) {
    var x = (i % 2 ? 0.42 : -0.42), y = i < 2 ? 1.6 : 0.8;
    var ph = canvasTex(256, 320, function (c, w, h) {
      // fotografia antiga em sépia: silhueta de busto (não é um retrato real)
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#cbb894'); gr.addColorStop(1, '#8f7a58'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#3e3020'; c.beginPath(); c.ellipse(w / 2, h * .42, 58, 72, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(w / 2 - 110, h); c.quadraticCurveTo(w / 2 - 100, h * .66, w / 2, h * .66); c.quadraticCurveTo(w / 2 + 100, h * .66, w / 2 + 110, h); c.fill();
      c.fillStyle = '#f3ecdc'; c.font = 'bold 120px Georgia, serif'; c.textAlign = 'center'; c.fillText('?', w / 2, h * .5);
      noise(c, w, h, 22, 70 + i);
    });
    var f = new T.Mesh(new T.PlaneGeometry(0.42, 0.52), new T.MeshStandardMaterial({ map: ph, roughness: 0.6 })); f.position.set(x, y, 0.04); g.add(f);
    var fr = frameBox(0.5, 0.6, 0.04, 0.03, M.gold); fr.position.set(x, y, 0.045); g.add(fr);
  }
  blob(-6.35, -3.75, 2.0, 0.9);
  addStation('retratos', g, new T.Vector3(0, 1.25, 0.1), [1.9, 2.1, 0.3], { pos: [-4.55, 1.6, -1.95], look: [-6.35, 1.25, -3.75] });
}
function buildNewspapers() {
  var g = gueridon(-2.6, 3.35); g.rotation.y = 0.6;
  var papers = [['LA GAZETTE DE PARIS', 'M. Schuman propose de mettre en commun le charbon et l\'acier'], ['LE COURRIER DU RHIN', 'Bonn : le chancelier accueille le plan français'], ['IL CORRIERE DI ROMA', 'Carbone e acciaio: la proposta francese']];
  papers.forEach(function (p, i) {
    var tex = canvasTex(512, 680, function (c, w, h) {
      c.fillStyle = '#ece4cf'; c.fillRect(0, 0, w, h); c.fillStyle = '#151515';
      c.font = 'bold 40px "Times New Roman", serif'; c.textAlign = 'center'; c.fillText(p[0], w / 2, 64);
      c.fillRect(20, 80, w - 40, 3); c.font = '16px serif'; c.fillText('Mercredi 10 mai 1950', w / 2, 104); c.fillRect(20, 114, w - 40, 1);
      c.textAlign = 'left'; c.font = 'bold 34px "Times New Roman", serif'; wrapText(c, p[1], 26, 160, w - 52, 40);
      c.fillStyle = '#9a9283'; c.fillRect(26, 300, 220, 160);
      for (var l = 0; l < 26; l++) { c.fillStyle = '#4a4a4a'; c.fillRect(l < 11 ? 262 : 26, 300 + (l < 11 ? l : l - 11 + 11) * 13, l < 11 ? 220 : 460 * (0.7 + Math.random() * 0.3), 4); }
      noise(c, w, h, 12, 80 + i);
    });
    var m = new T.Mesh(new T.PlaneGeometry(0.3, 0.4), new T.MeshStandardMaterial({ map: tex, roughness: 0.95, side: T.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = (i - 1) * 0.35; m.position.set((i - 1) * 0.12, 0.765 + i * 0.002, (i - 1) * 0.05); m.receiveShadow = true; g.add(m);
  });
  addStation('jornais', g, new T.Vector3(0, 0.85, 0), [0.85, 0.3, 0.85], { pos: [-1.95, 1.65, 4.4], look: [-2.6, 0.76, 3.35] });
}

/* ---------------- Ambiente (reflexos) ---------------- */
function buildEnvironment() {
  var env = new T.Scene();
  var room = new T.Mesh(new T.BoxGeometry(16, 6, 11), new T.MeshBasicMaterial({ color: 0x8a7a66, side: T.BackSide }));
  env.add(room);
  var floorE = new T.Mesh(new T.PlaneGeometry(16, 11), new T.MeshBasicMaterial({ color: 0x3a2416 })); floorE.rotation.x = -Math.PI / 2; floorE.position.y = -2.9; env.add(floorE);
  WIN_Z.forEach(function (z) { var w = new T.Mesh(new T.PlaneGeometry(1.4, 3.4), new T.MeshBasicMaterial({ color: new T.Color(6, 5.2, 4.2) })); w.position.set(-7.9, 0.4, z); w.rotation.y = Math.PI / 2; env.add(w); });
  [-4, 4].forEach(function (x) { var l = new T.Mesh(new T.SphereGeometry(0.5, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(8, 6, 3.5) })); l.position.set(x, 1.6, 0); env.add(l); });
  var wall = new T.Mesh(new T.PlaneGeometry(16, 3), new T.MeshBasicMaterial({ color: 0x7b1e22 })); wall.position.set(0, 0.5, -5.4); env.add(wall);
  var rt = pmrem.fromScene(env, 0.03);
  scene.environment = rt.texture;
}

/* ---------------- Estações e marcadores ---------------- */
function addStation(id, parent, localCenter, size, view) {
  var hit = new T.Mesh(new T.BoxGeometry(size[0], size[1], size[2]), M.hit);
  hit.position.copy(localCenter); hit.userData.station = id; parent.add(hit); hitList.push(hit);
  stations[id] = { hit: hit, view: view };
  // marcador flutuante (anel dourado com número)
  if (id === 'telefone') return;
  var num = { maquina: '1', relogio: '2', mapa: '3', tratado: '4', telegrama: '5', retratos: '6', jornais: '7', cofre: '★' }[id];
  var tex = canvasTex(128, 128, function (c, w, h) {
    c.fillStyle = 'rgba(14,24,60,.88)'; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill();
    c.strokeStyle = '#f0c75e'; c.lineWidth = 7; c.stroke();
    c.fillStyle = '#f7d779'; c.font = 'bold 64px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(num, 64, 68);
  });
  var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(0.22, 0.22, 1); sp.renderOrder = 10;
  var wp = parent.localToWorld(localCenter.clone()); sp.position.copy(wp); sp.position.y += size[1] / 2 + 0.25;
  sp.userData.baseY = sp.position.y; sp.userData.station = id;
  scene.add(sp); markers[id] = sp; hitList.push(sp);
}

/* ---------------- Câmara e interação ---------------- */
function applyLook() {
  if (tween || focused) return;
  pitch = Math.max(-0.6, Math.min(0.45, pitch));
  yaw = Math.max(-2.6, Math.min(2.6, yaw));
  var dir = new T.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  camera.position.copy(camPos); camera.lookAt(tmpV.copy(camPos).add(dir));
}
function tweenTo(pos, look, ms, done) {
  var p0 = camera.position.clone(), l0 = new T.Vector3(); camera.getWorldDirection(l0); l0.multiplyScalar(3).add(p0);
  tween = { p0: p0, l0: l0, p1: new T.Vector3().fromArray(pos), l1: new T.Vector3().fromArray(look), start: performance.now(), ms: reduced ? 1 : ms, done: done };
}
function stepTween(dt) {
  if (!tween) return;
  var k = Math.min(1, (performance.now() - tween.start) / tween.ms); var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(tween.p0, tween.p1, e);
  tmpV.lerpVectors(tween.l0, tween.l1, e); camera.lookAt(tmpV);
  if (k >= 1) { var d = tween.done; tween = null; if (d) d(); }
}
Sala.focus = function (id) {
  var st = stations[id]; if (!st || !st.view) return;
  focused = id; setOffset(true); for (var k in markers) markers[k].visible = false;
  tweenTo(st.view.pos, st.view.look, 1100);
};
Sala.home = function () {
  focused = null; setOffset(false); for (var k in markers) markers[k].visible = true;
  var dir = new T.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  tweenTo(camPos.toArray(), camPos.clone().add(dir.multiplyScalar(3)).toArray(), 900);
};
var offsetOn = false;
function setOffset(on) { offsetOn = on; resize(); }
function resize() {
  if (!renderer) return;
  var w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < 0.9 ? 70 : fovBase;
  if (offsetOn) {
    var wide = w > 820;
    // o painel ocupa a direita (ecrã largo) ou a parte de baixo (ecrã estreito): deslocamos o centro da imagem
    if (wide) camera.setViewOffset(w, h, Math.round(w * 0.24), 0, w, h);
    else camera.setViewOffset(w, h, 0, Math.round(h * 0.22), w, h);
  } else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
function pick(ev) {
  var r = renderer.domElement.getBoundingClientRect();
  var m = new T.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  var ray = new T.Raycaster(); ray.setFromCamera(m, camera);
  var hits = ray.intersectObjects(hitList, false);
  return hits.length ? hits[0].object.userData.station : null;
}
function bindInput(el) {
  var down = null, moved = 0;
  el.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch }; moved = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', function (e) {
    if (down) {
      var dx = e.clientX - down.x, dy = e.clientY - down.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      if (!focused && !tween) { yaw = down.yaw - dx * 0.0042; pitch = down.pitch + dy * 0.0032; applyLook(); }
    } else if (e.pointerType === 'mouse') {
      var id = pick(e); if (id !== hovered) { hovered = id; el.style.cursor = id ? 'pointer' : 'grab'; if (onHover) onHover(id, e); }
      else if (id && onHover) onHover(id, e);
    }
  });
  el.addEventListener('pointerup', function (e) {
    if (down && moved < 8) { var id = pick(e); if (id && onPick) onPick(id); }
    down = null;
  });
  el.addEventListener('pointerleave', function () { if (onHover) onHover(null); hovered = null; });
  el.addEventListener('wheel', function (e) { if (focused) return; fovBase = Math.max(38, Math.min(68, fovBase + e.deltaY * 0.02)); resize(); e.preventDefault(); }, { passive: false });
  window.addEventListener('keydown', function (e) {
    if (focused || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
    if (e.key === 'ArrowLeft') { yaw -= 0.12; applyLook(); } if (e.key === 'ArrowRight') { yaw += 0.12; applyLook(); }
    if (e.key === 'ArrowUp') { pitch += 0.08; applyLook(); } if (e.key === 'ArrowDown') { pitch -= 0.08; applyLook(); }
  });
}

/* ---------------- Estado vindo do jogo ---------------- */
var clockMinutes = 25 * 60; // segundos depois das 17:00
Sala.setClock = function (secondsAfter17) { clockMinutes = secondsAfter17; };
Sala.setSolved = function (id, on) { var m = markers[id]; if (!m) return; m.material.opacity = on ? 0.35 : 1; m.userData.solved = !!on; };
Sala.setMarkerVisible = function (id, on) { if (markers[id]) markers[id].visible = on; };
Sala.setDraftDone = function (on) { draftDone = on; if (paperTex) { var c = paperTex.userData.canvas; drawDraft(c.getContext('2d'), c.width, c.height); paperTex.needsUpdate = true; } };
Sala.setMapSelection = function (sel) { mapSel = sel || {}; if (mapTex) { var c = mapTex.userData.canvas; drawMap(c.getContext('2d'), c.width, c.height); mapTex.needsUpdate = true; } };
var dialTarget = 0, dialNow = 0;
Sala.setDial = function (n) { dialTarget = n; };
Sala.spinDial = function (turns) { dialTarget += turns * 100; };
var doorOpen = 0, doorTarget = 0, wheelSpin = 0;
Sala.openSafe = function (instant) { doorTarget = 1; if (instant) doorOpen = 1; needShadow = 999; };
Sala.closeSafe = function () { doorTarget = 0; doorOpen = 0; needShadow = 3; };
var ringT = 0;
Sala.ring = function () { ringT = 1.2; };
Sala.isFocused = function () { return focused; };
Sala.setCipher = function (shift) { if (Sala._cipherInner) Sala._cipherInner.rotation.z = shift / 26 * Math.PI * 2; };

/* ---------------- Ciclo de animação ---------------- */
function animate() {
  if (!running) return;
  requestAnimationFrame(animate);
  var dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  stepTween(dt);
  // relógio: horas e minutos reais da história (17h25 → 18h00)
  var s = clockMinutes, hh = 5 + s / 3600, mm = (s % 3600) / 60;
  if (hands.h) { hands.h.rotation.z = -(hh % 12) / 12 * Math.PI * 2; hands.m.rotation.z = -mm / 60 * Math.PI * 2; hands.pend.rotation.z = Math.sin(t * Math.PI) * 0.18; }
  // marcadores a flutuar
  for (var k in markers) { var m = markers[k]; m.position.y = m.userData.baseY + (m.userData.solved ? 0 : Math.sin(t * 2 + k.length) * 0.03); }
  // marcador do cofre
  if (dialMesh) { dialNow += (dialTarget - dialNow) * Math.min(1, dt * 6); dialMesh.rotation.z = dialNow / 100 * Math.PI * 2; }
  // porta do cofre
  if (safe.hinge) {
    if (doorTarget && wheelSpin < 1) { wheelSpin = Math.min(1, wheelSpin + dt * 0.9); safe.wheel.rotation.z = -wheelSpin * Math.PI * 0.75; }
    else if (doorTarget) { doorOpen += (1 - doorOpen) * Math.min(1, dt * 1.6); }
    safe.hinge.rotation.y = -doorOpen * 1.75;
    safe.glow.intensity = doorOpen * 1.2;
    if (doorOpen > 0.995 && needShadow > 3) needShadow = 2;
  }
  // telefone a tocar
  if (ringT > 0 && Sala._handset) { ringT -= dt; Sala._handset.position.y = 0.115 + Math.abs(Math.sin(t * 40)) * 0.006 * Math.min(1, ringT); }
  // chamas a tremeluzir
  chandLights.forEach(function (L, i) { L.intensity = 9 * (0.94 + Math.sin(t * 7 + i * 3) * 0.03 + Math.sin(t * 13.1 + i) * 0.03); });
  if (needShadow > 0) { renderer.shadowMap.needsUpdate = true; needShadow--; }
  renderer.render(scene, camera);
}

/* ---------------- Arranque ---------------- */
Sala.init = function (el, opts) {
  opts = opts || {};
  container = el; onPick = opts.onPick; onHover = opts.onHover;
  reduced = !!opts.reducedMotion;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  if (!renderer || !renderer.getContext()) return false;
  quality = opts.low ? 0.75 : 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.low ? 1 : 1.75));
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  el.appendChild(renderer.domElement); renderer.domElement.className = 'sala-canvas';
  scene = new T.Scene(); scene.background = new T.Color(0x1b140e); scene.fog = new T.Fog(0x2a2016, 18, 40);
  camera = new T.PerspectiveCamera(fovBase, 1, 0.05, 80);
  pmrem = new T.PMREMGenerator(renderer);
  root = new T.Group(); scene.add(root);
  clock = new T.Clock();
  // A sala é construída aos poucos, para o browser não «congelar» e para mostrar o progresso
  var steps = [
    ['Materiais e texturas', makeMaterials], ['Reflexos', buildEnvironment], ['Paredes e parquet', buildRoom],
    ['Lareira e relógio', buildFireplace], ['Cadeiras e tapete', buildChairs], ['Secretária e máquina de escrever', buildDesk],
    ['Mapa de 1950', buildEasel], ['Vitrina do Tratado', buildVitrine], ['Cofre', buildSafe], ['Porta e quadros', buildDoorAndArt],
    ['Lustres', function () { buildChandelier(-3.6, 0.2); buildChandelier(3.6, 0.2); }],
    ['Telegrama, retratos e jornais', function () { buildTelegram(); buildPortraits(); buildNewspapers(); }],
    ['Luz do sol', function () {
      scene.add(new T.HemisphereLight(0xfff0dc, 0x4a3020, 0.55));
      sunLight = new T.DirectionalLight(0xffd6a0, 5.2);
      sunLight.position.set(-17, 9.5, -4); sunLight.target.position.set(0, 0, 0.8); scene.add(sunLight.target);
      sunLight.castShadow = true; sunLight.shadow.mapSize.set(opts.low ? 1024 : 2048, opts.low ? 1024 : 2048);
      var sc = sunLight.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40; sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.02; sunLight.shadow.radius = 4;
      scene.add(sunLight);
      var fill = new T.DirectionalLight(0xbcd0ff, 0.35); fill.position.set(6, 5, 8); scene.add(fill);
      resize(); applyLook();
    }],
    ['A preparar os materiais na placa gráfica', function () { try { renderer.compile(scene, camera); } catch (e) {} }],
    ['Espelho e reflexos dourados', function () {
      // reflexos verdadeiros: fotografamos a sala em cubo uma vez e usamo-la no espelho e nos metais
      try {
        var cubeRT = new T.WebGLCubeRenderTarget(opts.low ? 256 : 512, { type: T.HalfFloatType });
        var cubeCam = new T.CubeCamera(0.1, 40, cubeRT); cubeCam.position.set(0, 2.2, -1.5); scene.add(cubeCam);
        for (var k in markers) markers[k].visible = false;
        renderer.shadowMap.needsUpdate = true; cubeCam.update(renderer, scene);
        for (var k2 in markers) markers[k2].visible = true;
        M.mirror.envMap = cubeRT.texture; M.mirror.envMapIntensity = 1; M.mirror.needsUpdate = true;
        var envRT = pmrem.fromCubemap(cubeRT.texture); scene.environment = envRT.texture;
      } catch (e) {}
    }],
    ['Último retoque', function () { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); }]
  ];
  var i = 0;
  function next() {
    if (i >= steps.length) {
      bindInput(renderer.domElement);
      window.addEventListener('resize', resize);
      if (window.ResizeObserver) new ResizeObserver(resize).observe(el);
      resize(); applyLook();
      running = true; animate();
      if (opts.onReady) opts.onReady();
      return;
    }
    var st = steps[i];
    if (opts.onProgress) opts.onProgress(i / steps.length, st[0]);
    // deixa o browser desenhar a barra de progresso antes de cada passo pesado
    requestAnimationFrame(function () { setTimeout(function () {
      try { st[1](); } catch (e) { console.error(e); }
      i++; next();
    }, 0); });
  }
  next();
  return true;
};
Sala.lookAtStation = function (id) { // vira a vista para a estação sem a abrir
  var st = stations[id]; if (!st || !st.view) return;
  var d = new T.Vector3().fromArray(st.view.look).sub(camPos); yaw = Math.atan2(d.x, -d.z); pitch = -0.08; applyLook();
};
Sala.screenPos = function (id) {
  var m = markers[id]; if (!m) return null; var v = m.position.clone().project(camera);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, front: v.z < 1 };
};
})();

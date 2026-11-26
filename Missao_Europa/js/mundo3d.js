/* ============================================================
   Missão Europa — mundo 3D (three.js r160, incluído em lib/three)
   Toda a modelação e todas as texturas são geradas em código.
   As posições lógicas de dados.js (960 × 600) são convertidas em
   metros: 40 px = 1 m. Ilustrações esquemáticas, não reconstruções.
   ============================================================ */
"use strict";

(function () {
  const T = window.THREE, D = window.DADOS;
  const S = 1 / 40;
  const toX = x => (x - 480) * S, toZ = y => (y - 300) * S;
  const SALA = { x0: -11.6, x1: 11.6, z0: -6.4, z1: 7.6, h: 4.2 };
  const LIM = { x0: -11.1, x1: 11.1, z0: -5.9, z1: 7.1 };
  const RAIO = 0.38, VEL = 4.3, ALCANCE = 1.05;
  const TELEMOVEL = matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 600;

  let renderer = null, cena, camara, relogio, contentor, ok = false;
  let salaId = "atrio", salaAtual = null;
  const cache = {};
  const jog = { x: 0, z: 4, dir: Math.PI, fase: 0, movendo: false, grupo: null, partes: null };
  let alvo = null, presoT = 0, ultimaDist = 0;
  let proximo = null, hover = null;
  const teclas = new Set();
  let yaw = 0, dist = 17, yawAlvo = 0;
  const camPos = new T.Vector3(0, 9, 14), camOlhar = new T.Vector3();
  let particulas = [];
  let marcaAlvo = null;
  const ray = new T.Raycaster(), rato = new T.Vector2();
  let elPrompt, elEtiqueta, elFade;

  /* ============================================================
     UTILIDADES: texturas em canvas e materiais
     ============================================================ */
  function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function texDe(c, rep) {
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
    if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  function tex(w, h, desenhar, rep) { const c = canvas(w, h); desenhar(c.getContext("2d"), w, h, c); return texDe(c, rep); }
  function ruido(c, w, h, n, a) {
    for (let i = 0; i < n; i++) {
      c.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${Math.random() * a})` : `rgba(255,255,255,${Math.random() * a})`;
      c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  }
  function aleatorio(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const matCache = {};
  function mat(cor, o = {}) {
    const k = cor + JSON.stringify(o, (key, v) => v && v.isTexture ? v.uuid : v);
    if (matCache[k] && !o.unico) return matCache[k];
    const op = Object.assign({ color: cor, roughness: .6, metalness: 0 }, o); delete op.unico;
    const m = new T.MeshStandardMaterial(op);
    if (!o.unico) matCache[k] = m;
    return m;
  }
  const M = {};
  function materiaisBase() {
    M.madeira = mat(0xffffff, { map: tex(256, 256, (c, w, h) => {
      c.fillStyle = "#8a5a33"; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(${60 + Math.random() * 40},${30 + Math.random() * 20},10,${.15 + Math.random() * .2})`; c.fillRect(0, y, w, 1 + Math.random() * 2); }
      ruido(c, w, h, 900, .08);
    }), roughness: .55 });
    M.madeiraEsc = mat(0xffffff, { map: tex(256, 256, (c, w, h) => {
      c.fillStyle = "#4a2c18"; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(20,10,4,${.15 + Math.random() * .25})`; c.fillRect(0, y, w, 1 + Math.random() * 2); }
      ruido(c, w, h, 800, .07);
    }), roughness: .5 });
    M.ouro = mat(0xd9a92e, { metalness: .85, roughness: .28 });
    M.latao = mat(0xc89b3c, { metalness: .8, roughness: .35 });
    M.aco = mat(0xa9b0b8, { metalness: .85, roughness: .3 });
    M.acoEsc = mat(0x4a5058, { metalness: .7, roughness: .4 });
    M.preto = mat(0x1b1d22, { roughness: .5 });
    M.branco = mat(0xf3f1ea, { roughness: .7 });
    M.papel = mat(0xf6efdc, { roughness: .9 });
    M.vidro = new T.MeshPhysicalMaterial({ color: 0xcfe8ff, transparent: true, opacity: .22, roughness: .05, metalness: 0, depthWrite: false });
    M.azulUE = mat(0x003399, { roughness: .55 });
    M.marmore = mat(0xffffff, { map: tex(512, 512, (c, w, h) => {
      c.fillStyle = "#eae6dc"; c.fillRect(0, 0, w, h);
      const r = aleatorio(7);
      for (let i = 0; i < 26; i++) {
        c.strokeStyle = `rgba(120,115,105,${.05 + r() * .15})`; c.lineWidth = .5 + r() * 2; c.beginPath();
        let x = r() * w, y = r() * h; c.moveTo(x, y);
        for (let k = 0; k < 8; k++) { x += (r() - .5) * 120; y += (r() - .3) * 90; c.lineTo(x, y); }
        c.stroke();
      }
    }), roughness: .25 });
    M.pele = mat(0xf0c39a, { roughness: .7 });
    M.planta = mat(0x2f7d3a, { roughness: .8 });
    M.vaso = mat(0xb4683e, { roughness: .8 });
  }
  function caixa(w, h, d, m, x = 0, y = 0, z = 0, pai) {
    const me = new T.Mesh(new T.BoxGeometry(w, h, d), m); me.position.set(x, y, z);
    me.castShadow = true; me.receiveShadow = true; if (pai) pai.add(me); return me;
  }
  function cil(rt, rb, h, m, x = 0, y = 0, z = 0, pai, seg = 24) {
    const me = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z);
    me.castShadow = true; me.receiveShadow = true; if (pai) pai.add(me); return me;
  }
  function esf(r, m, x = 0, y = 0, z = 0, pai, seg = 24) {
    const me = new T.Mesh(new T.SphereGeometry(r, seg, Math.round(seg * .75)), m); me.position.set(x, y, z);
    me.castShadow = true; if (pai) pai.add(me); return me;
  }
  function plano(w, h, m, pai) { const me = new T.Mesh(new T.PlaneGeometry(w, h), m); if (pai) pai.add(me); return me; }
  function torno(pts, m, seg = 28) {
    const me = new T.Mesh(new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg), m);
    me.castShadow = true; me.receiveShadow = true; return me;
  }
  function estrelaForma(r1, r2) {
    const s = new T.Shape();
    for (let k = 0; k < 10; k++) {
      const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? r2 : r1;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (k) s.lineTo(x, y); else s.moveTo(x, y);
    }
    s.closePath(); return s;
  }
  const geoEstrela = {};
  function estrela3D(r, prof, m) {
    const k = r + "_" + prof;
    if (!geoEstrela[k]) { geoEstrela[k] = new T.ExtrudeGeometry(estrelaForma(r, r * .42), { depth: prof, bevelEnabled: true, bevelThickness: prof * .4, bevelSize: r * .06, bevelSegments: 2 }); geoEstrela[k].center(); }
    const me = new T.Mesh(geoEstrela[k], m); me.castShadow = true; return me;
  }
  function desenharEstrela2D(c, x, y, r1, r2) {
    c.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? r2 : r1; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath(); c.fill();
  }
  function bandeiraUE(c, w, h, n = 12, apagadas = false) {
    c.fillStyle = "#003399"; c.fillRect(0, 0, w, h);
    const R = h / 3, r1 = h / 18;
    for (let k = 0; k < 12; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 6;
      c.fillStyle = k < n ? "#ffcc00" : (apagadas ? "rgba(255,255,255,.14)" : "#ffcc00");
      desenharEstrela2D(c, w / 2 + Math.cos(a) * R, h / 2 + Math.sin(a) * R, r1, r1 * .4);
    }
  }
  function textoMultilinha(c, txt, x, y, larg, alt) {
    const pal = txt.split(" "); let linha = "", yy = y;
    pal.forEach(p => {
      const t = linha ? linha + " " + p : p;
      if (c.measureText(t).width > larg && linha) { c.fillText(linha, x, yy); linha = p; yy += alt; } else linha = t;
    });
    if (linha) c.fillText(linha, x, yy);
    return yy;
  }
  const FONTE = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
  function imagem(src, cb) { const i = new Image(); i.onload = () => cb(i); i.src = src; return i; }
  function texImagem(src, w, h, fundo, margem = 0) {
    const c = canvas(w, h), cx = c.getContext("2d");
    cx.fillStyle = fundo || "#fff"; cx.fillRect(0, 0, w, h);
    const t = texDe(c);
    if (src) imagem(src, img => {
      const esc = Math.min((w - margem * 2) / img.width, (h - margem * 2) / img.height);
      cx.drawImage(img, (w - img.width * esc) / 2, (h - img.height * esc) / 2, img.width * esc, img.height * esc);
      t.needsUpdate = true;
    });
    return t;
  }
  const bandeiraSrc = cod => window.BANDEIRAS_DATA && window.BANDEIRAS_DATA[cod];
  const UE27 = ["pt", "es", "fr", "de", "it", "be", "nl", "lu", "ie", "dk", "se", "fi", "ee", "lv", "lt", "pl", "cz", "sk", "at", "hu", "si", "hr", "ro", "bg", "gr", "cy", "mt"];

  /* ============================================================
     TEXTURAS DE CHÃO E PAREDE (por sala)
     ============================================================ */
  function texChao(id) {
    const W = 2048, H = 1228; // 23.2 m × 14 m
    return tex(W, H, (c) => {
      const px = W / (SALA.x1 - SALA.x0);
      if (id === "atrio") {
        const t = 1.2 * px;
        for (let y = 0; y < H; y += t) for (let x = 0; x < W; x += t) {
          const par = (Math.round(x / t) + Math.round(y / t)) % 2;
          c.fillStyle = par ? "#1c3577" : "#cfc6ae"; c.fillRect(x, y, t + 1, t + 1);
        }
        ruido(c, W, H, 9000, .05);
        // rosácea central com 12 estrelas
        const cx = W / 2, cy = (0 - SALA.z0) * px;
        const g = c.createRadialGradient(cx, cy, 10, cx, cy, 3.4 * px);
        g.addColorStop(0, "#0b3aa8"); g.addColorStop(1, "#06215f");
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 3.4 * px, 0, 7); c.fill();
        c.strokeStyle = "#d9a92e"; c.lineWidth = 10; c.stroke();
        c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 3.1 * px, 0, 7); c.stroke();
        c.fillStyle = "#d9a92e";
        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; desenharEstrela2D(c, cx + Math.cos(a) * 2.6 * px, cy + Math.sin(a) * 2.6 * px, 22, 9); }
        // passadeira para as portas
        c.fillStyle = "rgba(160,20,40,.85)";
        c.fillRect(cx - .9 * px, 0, 1.8 * px, cy - 3.4 * px);
        c.fillRect(cx - .9 * px, cy + 3.4 * px, 1.8 * px, H);
      } else if (id === "simbolos") {
        c.fillStyle = "#3b2f6e"; c.fillRect(0, 0, W, H);
        c.strokeStyle = "rgba(255,204,0,.12)"; c.lineWidth = 2;
        for (let x = 0; x < W; x += 64) for (let y = 0; y < H; y += 64) { c.beginPath(); c.arc(x, y, 18, 0, 7); c.stroke(); }
        ruido(c, W, H, 14000, .06);
        c.strokeStyle = "#d9a92e"; c.lineWidth = 14; c.strokeRect(60, 60, W - 120, H - 120);
      } else if (id === "mapa") {
        parquet(c, W, H, ["#a8774a", "#b98856", "#9a6a40"]);
        // rosa dos ventos
        const cx = W / 2, cy = H * .55;
        c.save(); c.translate(cx, cy); c.globalAlpha = .85;
        c.fillStyle = "#e9dcc0"; c.beginPath(); c.arc(0, 0, 210, 0, 7); c.fill();
        c.strokeStyle = "#5b3a1e"; c.lineWidth = 4; c.stroke();
        for (let k = 0; k < 8; k++) {
          c.rotate(Math.PI / 4); c.fillStyle = k % 2 ? "#7fd3ff" : "#0b3a66";
          c.beginPath(); c.moveTo(0, -(k % 2 ? 130 : 195)); c.lineTo(-22, 0); c.lineTo(22, 0); c.fill();
        }
        c.rotate(Math.PI * 2 - Math.PI * 2); c.fillStyle = "#3a2410"; c.font = `bold 44px ${FONTE}`; c.textAlign = "center";
        c.fillText("N", 0, -150); c.restore();
      } else if (id === "historia") {
        tabuas(c, W, H, "#5c3b20");
        c.fillStyle = "rgba(120,20,20,.75)"; c.fillRect(W * .2, H * .62, W * .6, H * .3);
        c.strokeStyle = "#d9a92e"; c.lineWidth = 6; c.strokeRect(W * .2 + 14, H * .62 + 14, W * .6 - 28, H * .3 - 28);
      } else if (id === "instituicoes") {
        c.fillStyle = "#1f4c3c"; c.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${i % 2 ? .02 : 0})`; c.fillRect(0, i * 32, W, 16); }
        ruido(c, W, H, 16000, .07);
        c.strokeStyle = "rgba(155,227,192,.35)"; c.lineWidth = 6;
        c.beginPath(); c.arc(W / 2, H * .18, 520, 0, Math.PI); c.stroke();
        c.beginPath(); c.arc(W / 2, H * .18, 600, 0, Math.PI); c.stroke();
      } else if (id === "direitos") {
        const t = 96;
        for (let y = 0; y < H; y += t) for (let x = 0; x < W; x += t) {
          c.fillStyle = ((x + y) / t) % 2 ? "#a8553e" : "#b9654a"; c.fillRect(x, y, t, t);
          c.strokeStyle = "rgba(60,20,10,.4)"; c.lineWidth = 3; c.strokeRect(x, y, t, t);
        }
        ruido(c, W, H, 12000, .07);
      } else {
        // futuro: pedra clara + relvado nas margens
        const t = 128;
        for (let y = 0; y < H; y += t) for (let x = 0; x < W; x += t) {
          c.fillStyle = `hsl(${70 + Math.random() * 20}, 14%, ${56 + Math.random() * 7}%)`; c.fillRect(x + 2, y + 2, t - 4, t - 4);
        }
        ruido(c, W, H, 12000, .06);
      }
    });
  }
  function parquet(c, W, H, cores) {
    const lw = 120, lh = 30;
    for (let y = 0; y < H; y += lh) for (let x = -(y / lh % 4) * 30; x < W; x += lw) {
      c.fillStyle = cores[Math.floor(Math.random() * cores.length)]; c.fillRect(x, y, lw - 2, lh - 2);
    }
    ruido(c, W, H, 15000, .06);
  }
  function tabuas(c, W, H, base) {
    for (let y = 0; y < H; y += 44) {
      let x = -Math.random() * 300;
      while (x < W) {
        const l = 260 + Math.random() * 300;
        c.fillStyle = base; c.fillRect(x, y, l, 42);
        c.fillStyle = `rgba(${Math.random() < .5 ? "0,0,0" : "255,220,180"},${Math.random() * .12})`; c.fillRect(x, y, l, 42);
        for (let k = 0; k < 6; k++) { c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(x, y + Math.random() * 42, l, 1); }
        x += l + 2;
      }
    }
    ruido(c, W, H, 9000, .06);
  }
  function texParede(cor, acento, estilo) {
    return tex(512, 512, (c, w, h) => {
      c.fillStyle = cor; c.fillRect(0, 0, w, h);
      // papel de parede subtil
      c.globalAlpha = .08; c.fillStyle = "#fff";
      if (estilo === "riscas") for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 12, h);
      else for (let y = 20; y < h * .62; y += 48) for (let x = (y / 48 % 2) * 32; x < w; x += 64) desenharEstrela2D(c, x, y, 7, 3);
      c.globalAlpha = 1;
      // lambrim (terço inferior)
      const yl = h * .68;
      const g = c.createLinearGradient(0, yl, 0, h); g.addColorStop(0, "rgba(0,0,0,.18)"); g.addColorStop(1, "rgba(0,0,0,.45)");
      c.fillStyle = g; c.fillRect(0, yl, w, h - yl);
      c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 3;
      for (let x = 16; x < w; x += 128) c.strokeRect(x, yl + 18, 96, h - yl - 40);
      c.fillStyle = acento; c.fillRect(0, yl - 6, w, 8);
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, yl + 2, w, 3);
      c.fillStyle = acento; c.fillRect(0, 0, w, 6);
      ruido(c, w, h, 2500, .05);
    }, [6, 1]);
  }

  /* ============================================================
     PEÇAS REUTILIZÁVEIS
     ============================================================ */
  function mesaExpo(w, d, toalha, pai, alt = .82) {
    const g = new T.Group();
    caixa(w, .06, d, M.madeira, 0, alt, 0, g);
    if (toalha) {
      caixa(w + .04, .015, d * .5, mat(toalha, { roughness: .9 }), 0, alt + .035, 0, g);
    }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cil(.035, .03, alt, M.madeiraEsc, a * (w / 2 - .08), alt / 2, b * (d / 2 - .08), g, 10));
    if (pai) pai.add(g); return g;
  }
  function pedestalExpo(w, d, alt, pai) {
    const g = new T.Group();
    caixa(w, alt, d, M.branco, 0, alt / 2, 0, g);
    caixa(w + .06, .05, d + .06, M.madeiraEsc, 0, alt + .025, 0, g);
    caixa(w + .04, .06, d + .04, M.madeiraEsc, 0, .03, 0, g);
    if (pai) pai.add(g); return g;
  }
  function vitrina(w, d, alt, pai) {
    const g = pedestalExpo(w, d, alt, pai);
    const v = caixa(w * .92, .55, d * .92, M.vidro, 0, alt + .05 + .275, 0, g); v.castShadow = false;
    return g;
  }
  function cavalete(w, h, texMap, pai, inclin = .12) {
    const g = new T.Group();
    const m = M.madeiraEsc;
    [-1, 1].forEach(s => { const p = caixa(.05, h + .9, .05, m, s * w * .42, (h + .9) / 2, 0, g); p.rotation.x = -inclin; });
    const tr = caixa(.05, h + .6, .05, m, 0, (h + .6) / 2, -.35, g); tr.rotation.x = .35;
    const q = new T.Group(); q.position.set(0, .9 + h / 2, .1); q.rotation.x = -inclin; g.add(q);
    caixa(w + .1, h + .1, .05, M.ouro, 0, 0, -.03, q);
    const p = plano(w, h, mat(0xffffff, { map: texMap, roughness: .8 }), q); p.position.z = .001;
    caixa(w + .2, .06, .14, m, 0, -h / 2 - .06, .04, q);
    if (pai) pai.add(g); return g;
  }
  function moldura(w, h, texMap, m = M.ouro) {
    const g = new T.Group();
    caixa(w + .12, h + .12, .05, m, 0, 0, 0, g);
    const p = plano(w, h, mat(0xffffff, { map: texMap, roughness: .85 }), g); p.position.z = .027;
    return g;
  }
  function planta(pai, x, z, esc = 1) {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(esc);
    const v = torno([[0, 0], [.2, 0], [.27, .45], [.3, .5], [0, .5]], M.vaso); g.add(v);
    const r = aleatorio(Math.round((x + 20) * 100 + z * 7));
    for (let i = 0; i < 9; i++) {
      const f = new T.Mesh(new T.SphereGeometry(.18 + r() * .12, 8, 6), mat(r() < .5 ? 0x2f7d3a : 0x3d9446, { roughness: .85 }));
      f.position.set((r() - .5) * .45, .7 + r() * .6, (r() - .5) * .45); f.scale.y = 1.4; f.castShadow = true; g.add(f);
    }
    pai.add(g); return g;
  }
  function coluna(pai, x, z, h) {
    const g = new T.Group(); g.position.set(x, 0, z);
    g.add(torno([[0, 0], [.42, 0], [.42, .15], [.34, .22], [.3, .3], [.28, h - .35], [.34, h - .25], [.42, h - .12], [.42, h], [0, h]], M.marmore, 24));
    pai.add(g); return g;
  }
  function textoTex(linhas, o = {}) {
    const w = o.w || 512, h = o.h || 256;
    return tex(w, h, (c) => {
      c.fillStyle = o.fundo || "#f6efdc"; c.fillRect(0, 0, w, h);
      if (o.borda) { c.strokeStyle = o.borda; c.lineWidth = o.bl || 10; c.strokeRect(o.bl / 2 || 5, o.bl / 2 || 5, w - (o.bl || 10), h - (o.bl || 10)); }
      c.fillStyle = o.cor || "#1d2340"; c.textAlign = "center"; c.textBaseline = "middle";
      const tot = linhas.length;
      linhas.forEach((l, i) => {
        const tam = Array.isArray(l) ? l[1] : (o.tam || 40);
        const txt = Array.isArray(l) ? l[0] : l;
        c.font = (Array.isArray(l) && l[2] ? l[2] + " " : "bold ") + tam + "px " + (o.serif ? "Georgia, serif" : FONTE);
        if (Array.isArray(l) && l[3]) c.fillStyle = l[3];
        c.fillText(txt, w / 2, h / 2 + (i - (tot - 1) / 2) * (o.esp || tam * 1.25));
        c.fillStyle = o.cor || "#1d2340";
      });
      if (o.ruido !== false) ruido(c, w, h, 600, .04);
    });
  }

  /* ============================================================
     MODELOS DOS OBJETOS (um por «desenho» de dados.js)
     Cada função recebe (g, W, P, o) — grupo já centrado na
     posição do objeto, largura W e profundidade P em metros.
     ============================================================ */
  const TXT_PLACA = {
    a_placa: null,
    s_lema: ["«Unida na", "diversidade»"],
    v_coe: ["CONSELHO DA EUROPA", "Estrasburgo"]
  };
  const MODELOS = {
    porta(g, W, P, o, sala) {
      const sul = o.y > 300;
      const corS = o.destino ? D.SALAS[o.destino].chao : "#2d5a2a";
      const acento = o.destino ? D.SALAS[o.destino].acento : "#ffcc00";
      const grupo = new T.Group(); g.add(grupo);
      grupo.position.z = sul ? (SALA.z1 - toZ(o.y + o.h / 2)) - .05 : (SALA.z0 - toZ(o.y + o.h / 2)) + .05;
      if (sul) grupo.rotation.y = Math.PI;
      const w = 2.0, h = 2.9;
      caixa(.22, h + .1, .3, M.ouro, -w / 2 - .11, (h + .1) / 2, 0, grupo);
      caixa(.22, h + .1, .3, M.ouro, w / 2 + .11, (h + .1) / 2, 0, grupo);
      caixa(w + .66, .26, .34, M.ouro, 0, h + .13, 0, grupo);
      const mp = mat(new T.Color(corS).offsetHSL(0, .05, .08), { roughness: .45 });
      [-1, 1].forEach(s => {
        const f = caixa(w / 2 - .02, h - .02, .08, mp, s * w / 4, h / 2, .02, grupo);
        [.75, 1.95].forEach(y => { const pa = caixa(w / 2 - .3, y === .75 ? .9 : 1.1, .03, mat(new T.Color(corS).offsetHSL(0, 0, .16)), s * w / 4, y, .07, grupo); pa.castShadow = false; });
        esf(.05, M.latao, s * .12, 1.3, .1, grupo, 12);
      });
      // tabuleta com nome e estrelas (dinâmica)
      const c = canvas(512, 160);
      const t = texDe(c);
      const tab = plano(2.5, .78, mat(0xffffff, { map: t, roughness: .5 }), grupo); tab.position.set(0, h + .72, .12);
      caixa(2.6, .88, .06, M.ouro, 0, h + .72, .07, grupo);
      // tapete de entrada
      const nomeTap = o.destino ? o.rotulo : "↩ Átrio";
      const tTap = tex(512, 256, (c, w, h) => {
        c.fillStyle = acento; c.fillRect(0, 0, w, h);
        c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(10, 10, w - 20, h - 20);
        c.fillStyle = "#10204f"; c.textAlign = "center"; c.textBaseline = "middle";
        c.font = `bold ${nomeTap.length > 16 ? 46 : 58}px ${FONTE}`; textoMultilinha(c, nomeTap, w / 2, nomeTap.length > 16 ? 90 : 128, w - 50, 70);
      });
      const tap = plano(2.4, 1.2, mat(0xffffff, { map: tTap, roughness: .9 }), g); tap.rotation.x = -Math.PI / 2; tap.position.y = .012; tap.receiveShadow = true;
      tap.position.z = sul ? -.25 : .25;
      g.userData.tabuleta = { c, t, o, acento, corS };
      return 3.8;
    },
    saida(g, W, P, o) {
      const r = MODELOS.porta(g, W, P, Object.assign({}, o, { destino: null }));
      return r;
    },
    pedestal(g) {
      g.add(torno([[0, 0], [1.45, 0], [1.45, .18], [1.2, .18], [1.2, .36], [.9, .36], [.9, .5], [0, .5]], M.marmore, 48));
      const anel = new T.Mesh(new T.TorusGeometry(1.32, .035, 8, 64), M.ouro); anel.rotation.x = Math.PI / 2; anel.position.y = .19; g.add(anel);
      cil(.045, .055, 3.3, M.latao, 0, .5 + 1.65, 0, g, 12);
      esf(.09, M.ouro, 0, 3.86, 0, g, 16);
      // bandeira ondulante (textura dinâmica)
      const c = canvas(512, 342), t = texDe(c);
      const geo = new T.PlaneGeometry(1.65, 1.1, 24, 8); geo.translate(.825, 0, 0);
      const ban = new T.Mesh(geo, mat(0xffffff, { map: t, side: T.DoubleSide, roughness: .8, unico: true }));
      ban.position.set(.05, 3.15, 0); ban.castShadow = true; g.add(ban);
      geo.userData.base = geo.attributes.position.array.slice();
      // 12 nichos para as estrelas (acendem quando recuperadas)
      const estrelas = [];
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        const e = estrela3D(.16, .05, mat(0x5a6a99, { metalness: .3, roughness: .4, unico: true }));
        e.position.set(Math.cos(a) * 1.05, .62, Math.sin(a) * 1.05); e.rotation.y = -a + Math.PI / 2;
        g.add(e); estrelas.push(e);
      }
      g.userData.pedestal = { c, t, ban, estrelas };
      return 4.1;
    },
    placa(g, W, P, o) {
      let t;
      if (o.id === "a_placa") {
        const c = canvas(512, 384), cx = c.getContext("2d"); t = texDe(c);
        const desenhar = (img) => {
          cx.fillStyle = "#0f2a73"; cx.fillRect(0, 0, 512, 384);
          cx.strokeStyle = "#d9a92e"; cx.lineWidth = 12; cx.strokeRect(6, 6, 500, 372);
          if (img) cx.drawImage(img, 176, 26, 160, 160);
          cx.fillStyle = "#fff"; cx.textAlign = "center"; cx.font = `bold 38px ${FONTE}`; cx.fillText("CLUBE EUROPEU", 256, 238);
          cx.font = `26px ${FONTE}`; cx.fillStyle = "#ffdf6b"; cx.fillText("Rede Nacional de Clubes Europeus", 256, 284);
          cx.fillStyle = "#c9d3f5"; cx.fillText("desde 1986", 256, 324); t.needsUpdate = true;
        };
        desenhar(null);
        if (window.LOGOS_DATA) imagem(window.LOGOS_DATA["clube-europeu"], desenhar);
      } else {
        const l = TXT_PLACA[o.id] || [o.rotulo];
        t = textoTex(l.map(x => [x, 46]), { fundo: "#d9b04a", cor: "#3a2a08", borda: "#8a6512", bl: 14, serif: true, w: 512, h: 300 });
      }
      cavalete(Math.min(1.6, W + .2), Math.min(1.6, W + .2) * .7, t, g);
      return 2.6;
    },
    correio(g) {
      cil(.06, .06, 1.0, M.acoEsc, 0, .5, 0, g, 10);
      const cx = caixa(.7, .55, .45, mat(0x0a3a9e, { roughness: .4, metalness: .3 }), 0, 1.25, 0, g);
      const topo = new T.Mesh(new T.CylinderGeometry(.225, .225, .7, 20, 1, false, 0, Math.PI), cx.material);
      topo.rotation.z = Math.PI / 2; topo.position.set(0, 1.52, 0); topo.castShadow = true; g.add(topo);
      caixa(.4, .03, .02, M.preto, 0, 1.38, .231, g);
      const env = caixa(.32, .2, .01, M.papel, 0, 1.46, .24, g); env.rotation.x = -.2;
      const ban = plano(.36, .24, mat(0xffffff, { map: tex(128, 86, (c, w, h) => bandeiraUE(c, w, h)) }), g); ban.position.set(0, 1.2, .232);
      return 2.0;
    },
    bandeira(g, W, P) {
      mesaExpo(W, P, "#2d2466", g);
      for (let i = 0; i < 4; i++) caixa(.7 - i * .02, .06, .5, mat(0x0a3fa8, { roughness: .8 }), (i % 2) * .03, .9 + i * .065, 0, g);
      const t = plano(.66, .46, mat(0xffffff, { map: tex(256, 180, (c, w, h) => bandeiraUE(c, w, h)), roughness: .8 }), g);
      t.rotation.x = -Math.PI / 2; t.position.y = 1.15;
      return 1.6;
    },
    etiqueta(g, W, P) {
      pedestalExpo(.5, .5, .9, g);
      const t = caixa(.34, .22, .01, mat(0xffffff, { map: textoTex([["1955", 70], ["Conselho da Europa", 28, "italic"]], { fundo: "#efe2bf", w: 256, h: 160, serif: true }) }), 0, 1.0, 0, g);
      t.rotation.x = -.9;
      const fio = cil(.004, .004, .3, mat(0xb0281f), -.15, 1.05, -.05, g, 4); fio.rotation.z = .8;
      return 1.5;
    },
    giradiscos(g, W, P) {
      caixa(W * .9, .7, P * .8, M.madeiraEsc, 0, .35, 0, g);
      caixa(W * .85, .14, P * .75, M.madeira, 0, .77, 0, g);
      const prato = cil(.38, .38, .03, M.acoEsc, -.12, .86, 0, g, 40);
      const disco = cil(.36, .36, .012, M.preto, -.12, .885, 0, g, 40);
      cil(.11, .11, .014, mat(0xffcc00), -.12, .89, 0, g, 20);
      const braco = caixa(.5, .025, .025, M.aco, .32, .93, -.05, g); braco.rotation.y = .5;
      cil(.05, .05, .08, M.aco, .52, .88, -.2, g, 12);
      g.userData.rodar = disco;
      // notas musicais flutuantes
      const notas = [];
      for (let i = 0; i < 3; i++) {
        const s = new T.Sprite(new T.SpriteMaterial({ map: tex(64, 64, (c) => { c.fillStyle = "#ffdf6b"; c.font = "bold 52px serif"; c.textAlign = "center"; c.fillText(i % 2 ? "♪" : "♫", 32, 50); }), transparent: true, depthWrite: false }));
        s.scale.set(.3, .3, .3); g.add(s); notas.push(s);
      }
      g.userData.notas = notas;
      return 1.6;
    },
    calendario(g, W) {
      const t = tex(256, 320, (c, w, h) => {
        c.fillStyle = "#fffaf0"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#003399"; c.fillRect(0, 0, w, 90);
        c.fillStyle = "#ffcc00"; c.font = `bold 52px ${FONTE}`; c.textAlign = "center"; c.fillText("MAIO", w / 2, 66);
        c.fillStyle = "#1d2340"; c.font = `bold 170px ${FONTE}`; c.fillText("9", w / 2, 255);
        c.font = `24px ${FONTE}`; c.fillText("Dia da Europa", w / 2, 300);
        c.fillStyle = "#555"; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(24 + i * 30, 10, 5, 0, 7); c.fill(); }
      });
      cavalete(.8, 1.0, t, g, .1);
      return 2.3;
    },
    saudacoes(g, W, P) {
      const pal = ["Olá!", "Hello!", "Bonjour!", "Hallo!", "Ciao!", "¡Hola!", "Cześć!", "Hej!", "Γεια σου!", "Szia!", "Ahoj!", "Tere!", "Labas!", "Sveiki!", "Bună!", "Здравей!", "Dia dhuit!", "Moi!", "Živjo!", "Bok!", "Hallå!", "Merħba!", "Dobrý deň!", "Moien!"];
      const t = tex(512, 640, (c, w, h) => {
        c.fillStyle = "#1c1446"; c.fillRect(0, 0, w, h);
        c.strokeStyle = "#ffcc00"; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
        c.fillStyle = "#ffcc00"; c.font = `bold 34px ${FONTE}`; c.textAlign = "center"; c.fillText("SAUDAÇÕES DA EUROPA", w / 2, 54);
        const cores = ["#fff", "#7fd3ff", "#ffb3c9", "#9be3c0", "#ffdf6b", "#c4a7ff"];
        pal.forEach((p, i) => {
          c.fillStyle = cores[i % cores.length]; c.font = `bold ${30 + (i * 7) % 12}px ${FONTE}`;
          c.fillText(p, 90 + (i % 3) * 165, 120 + Math.floor(i / 3) * 62);
        });
      });
      const q = new T.Group(); g.add(q); q.rotation.y = -Math.PI / 2;
      caixa(1.9, 2.4, .08, M.madeiraEsc, 0, 1.4, 0, q);
      const p = plano(1.76, 2.2, mat(0xffffff, { map: t, roughness: .7 }), q); p.position.set(0, 1.4, .045);
      [-1, 1].forEach(s => caixa(.08, .3, .5, M.madeiraEsc, s * .8, .15, 0, q));
      return 2.9;
    },
    globo(g, W, P) {
      g.add(torno([[0, 0], [.35, 0], [.35, .05], [.1, .1], [.06, .8], [0, .8]], M.madeiraEsc));
      const meridiano = new T.Mesh(new T.TorusGeometry(.56, .02, 8, 48, Math.PI * 1.2), M.latao);
      meridiano.position.y = 1.35; meridiano.rotation.z = -.4; g.add(meridiano);
      const tGlobo = tex(1024, 512, (c, w, h) => {
        const g2 = c.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, "#2a7bc0"); g2.addColorStop(.5, "#1f6fb5"); g2.addColorStop(1, "#2a7bc0");
        c.fillStyle = g2; c.fillRect(0, 0, w, h);
        // Europa (projeção do mapa GISCO esticada sobre a zona da Europa)
        if (window.MAPA_EUROPA) {
          c.save(); c.translate(w * .47, h * .1); c.scale(.17, .2);
          window.MAPA_EUROPA.forEach(m => { const p = new Path2D(m.d); c.fillStyle = UE27.includes(codigoISO(m.id)) ? "#ffcc00" : "#7db36a"; c.fill(p); });
          c.restore();
        }
        // outros continentes (esquemáticos)
        c.fillStyle = "#7db36a";
        [[w * .5, h * .55, 70, 120], [w * .2, h * .35, 110, 80], [w * .26, h * .7, 50, 90], [w * .72, h * .3, 160, 70], [w * .83, h * .68, 60, 40]].forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(x, y, rx, ry, .3, 0, 7); c.fill(); });
        ruido(c, w, h, 3000, .05);
      });
      const s = esf(.5, mat(0xffffff, { map: tGlobo, roughness: .45 }), 0, 1.35, 0, g, 40);
      s.rotation.z = -.4; g.userData.rodar = s;
      return 2.1;
    },
    moedas(g, W, P) {
      mesaExpo(W, P, "#0b2d40", g);
      const r = aleatorio(Math.round(W * 1000));
      for (let p = 0; p < 4; p++) {
        const n = 3 + Math.floor(r() * 5);
        for (let i = 0; i < n; i++) cil(.09, .09, .022, i % 3 ? M.ouro : M.aco, -W / 3 + p * W / 5, .865 + i * .024, (r() - .5) * .3, g, 20);
      }
      const bolsa = esf(.22, mat(0x7a3b1c, { roughness: .7 }), W / 3, 1.0, 0, g, 16); bolsa.scale.set(1.1, .7, .7);
      cil(.04, .04, .2, M.latao, W / 3, 1.16, 0, g, 8).rotation.z = Math.PI / 2;
      return 1.5;
    },
    passaporte(g, W, P) {
      pedestalExpo(.6, .6, .9, g);
      const t = tex(200, 280, (c, w, h) => {
        c.fillStyle = "#6b1424"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#e3c26a"; c.textAlign = "center"; c.font = `bold 20px ${FONTE}`;
        c.fillText("UNIÃO EUROPEIA", w / 2, 40); c.fillText("PASSAPORTE", w / 2, 240);
        c.beginPath(); c.arc(w / 2, 135, 40, 0, 7); c.lineWidth = 4; c.strokeStyle = "#e3c26a"; c.stroke();
        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; desenharEstrela2D(c, w / 2 + Math.cos(a) * 55, 135 + Math.sin(a) * 55, 7, 3); }
      });
      const l = caixa(.3, .03, .42, mat(0x6b1424), 0, .97, 0, g); l.rotation.y = .3;
      const cap = plano(.3, .42, mat(0xffffff, { map: t }), g); cap.rotation.x = -Math.PI / 2; cap.rotation.z = .3; cap.position.y = .987;
      return 1.4;
    },
    postal(g, W, P, o) {
      mesaExpo(W, P, null, g);
      const cenas = o.id === "f_postal"
        ? [["#7fb6e0", "#c46a3a", "PORTO"], ["#9fd0ef", "#3b6fa0", "DOURO"]]
        : [["#a6d3f2", "#2c5c8a", "NORGE"], ["#cde8f7", "#f2f2f2", "SCHWEIZ"], ["#8cc4e8", "#3c7a3a", "ÍSLAND"]];
      cenas.forEach((cn, i) => {
        const t = tex(256, 170, (c, w, h) => {
          c.fillStyle = cn[0]; c.fillRect(0, 0, w, h);
          c.fillStyle = cn[1]; c.beginPath(); c.moveTo(0, h); c.lineTo(w * .3, h * .35); c.lineTo(w * .55, h * .7); c.lineTo(w * .75, h * .3); c.lineTo(w, h); c.fill();
          c.fillStyle = "#fff"; c.font = `bold 26px ${FONTE}`; c.fillText(cn[2], 12, 32);
          c.strokeStyle = "#fff"; c.lineWidth = 8; c.strokeRect(0, 0, w, h);
        });
        const pc = plano(.42, .28, mat(0xffffff, { map: t, side: T.DoubleSide }), g);
        pc.rotation.x = -Math.PI / 2; pc.rotation.z = (i - 1) * .35; pc.position.set((i - (cenas.length - 1) / 2) * .36, .87 + i * .004, (i % 2) * .08);
      });
      // expositor vertical
      const sup = caixa(.05, .6, .05, M.aco, W / 2 - .2, 1.15, -.2, g);
      return 1.6;
    },
    jornal(g, W, P, o) {
      mesaExpo(W, P, null, g);
      const hoje = o.id === "f_jornal";
      const t = tex(300, 400, (c, w, h) => {
        c.fillStyle = hoje ? "#fbfbf7" : "#e9dfc2"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#1a1a1a"; c.textAlign = "center"; c.font = "bold 34px Georgia, serif";
        c.fillText(hoje ? "O DIÁRIO" : "LE MONDE?", w / 2, 40);
        c.fillRect(10, 52, w - 20, 3);
        c.font = "bold 26px Georgia, serif"; textoMultilinha(c, hoje ? "Europa enfrenta novos desafios" : "9 de maio de 1950: proposta de Schuman", w / 2, 90, w - 30, 30);
        c.fillStyle = "#9a9a9a"; for (let y = 170; y < h - 20; y += 12) { c.fillRect(14, y, w / 2 - 22, 6); c.fillRect(w / 2 + 8, y, w / 2 - 22, 6); }
        if (!hoje) { c.fillStyle = "rgba(120,80,20,.15)"; c.fillRect(0, 0, w, h); }
      });
      // o título acima não pretende reproduzir um jornal real: é genérico
      const j = plano(.48, .64, mat(0xffffff, { map: t, side: T.DoubleSide }), g); j.rotation.x = -Math.PI / 2; j.rotation.z = .15; j.position.y = .87;
      const d = plano(.48, .64, mat(0xffffff, { map: t }), g); d.rotation.x = -Math.PI / 2 + .5; d.rotation.z = -.1; d.position.set(.3, .95, -.15);
      return 1.5;
    },
    caixa(g, W, P) {
      const cx = new T.Group(); g.add(cx);
      caixa(W * .8, .55, P * .7, M.madeira, 0, .275, 0, cx);
      [-1, 1].forEach(s => caixa(W * .82, .06, .04, M.madeiraEsc, 0, .2 + (s + 1) * .12, s * P * .35, cx));
      const r = aleatorio(31);
      for (let i = 0; i < 18; i++) {
        const k = new T.Mesh(new T.IcosahedronGeometry(.07 + r() * .05, 0), mat(0x1a1a1c, { roughness: .9 }));
        k.position.set(-W * .35 + r() * W * .32, .58 + r() * .06, (r() - .5) * P * .5); k.rotation.set(r() * 3, r() * 3, 0); k.castShadow = true; g.add(k);
      }
      for (let i = 0; i < 3; i++) caixa(W * .32, .07, .1, M.aco, W * .18, .6 + i * .075, (i - 1) * .12, g);
      const et = plano(.5, .2, mat(0xffffff, { map: textoTex([["CARVÃO · AÇO", 40]], { fundo: "#d8c79a", w: 300, h: 110, serif: true }) }), g);
      et.position.set(0, .3, P * .35 + .005);
      return 1.3;
    },
    pergaminho(g, W, P) {
      mesaExpo(W, P, "#5c3b20", g);
      const t = tex(300, 220, (c, w, h) => {
        c.fillStyle = "#ead9ad"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#4a2e12"; c.font = "italic bold 30px Georgia, serif"; c.textAlign = "center"; c.fillText("Roma, 1957", w / 2, 50);
        c.fillStyle = "rgba(74,46,18,.55)"; for (let y = 80; y < h - 30; y += 16) c.fillRect(30, y, w - 60 - (y % 3) * 20, 5);
        ruido(c, w, h, 900, .08);
      });
      const fo = plano(.62, .44, mat(0xffffff, { map: t, side: T.DoubleSide }), g); fo.rotation.x = -Math.PI / 2; fo.position.y = .87;
      [-1, 1].forEach(s => { const r = cil(.045, .045, .5, mat(0xd7c08a), s * .33, .9, 0, g, 14); r.rotation.x = Math.PI / 2; });
      const lacre = cil(.05, .05, .015, mat(0x9b1c1c), .15, .88, .13, g, 16);
      return 1.4;
    },
    foto(g, W) {
      const t = tex(400, 300, (c, w, h) => {
        const ce = c.createLinearGradient(0, 0, 0, h); ce.addColorStop(0, "#9ec7ea"); ce.addColorStop(1, "#e9eef2");
        c.fillStyle = ce; c.fillRect(0, 0, w, h);
        c.fillStyle = "#e3d6b8"; c.fillRect(20, 150, 360, 110);
        for (let i = 0; i < 10; i++) { c.fillStyle = "#b9a982"; c.beginPath(); c.arc(45 + i * 34, 215, 13, Math.PI, 0); c.fill(); c.fillRect(32 + i * 34, 215, 26, 30); }
        c.fillStyle = "#d8caa6"; c.fillRect(250, 80, 60, 100); c.beginPath(); c.moveTo(245, 80); c.lineTo(280, 40); c.lineTo(315, 80); c.fill();
        c.fillStyle = "#6f8f5a"; c.fillRect(0, 258, w, 42);
        c.fillStyle = "#333"; c.font = `bold 20px ${FONTE}`; c.fillText("Lisboa · 1985", 14, 290);
      });
      cavalete(1.2, .9, t, g);
      return 2.3;
    },
    pasta(g, W, P) {
      mesaExpo(W, P, null, g);
      const t = tex(256, 190, (c, w, h) => {
        c.fillStyle = "#123d9e"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#ffcc00"; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; desenharEstrela2D(c, w / 2 + Math.cos(a) * 50, h / 2 + Math.sin(a) * 50, 9, 4); }
        c.font = `bold 20px ${FONTE}`; c.textAlign = "center"; c.fillText("MAASTRICHT 1992", w / 2, h - 14);
      });
      caixa(.55, .04, .4, mat(0x123d9e), 0, .87, 0, g);
      const cap = plano(.55, .4, mat(0xffffff, { map: t }), g); cap.rotation.x = -Math.PI / 2; cap.position.y = .892;
      return 1.4;
    },
    caneta(g) {
      vitrina(.6, .6, .9, g);
      const c = cil(.018, .018, .38, mat(0x101a3a, { metalness: .4, roughness: .3 }), 0, 1.0, 0, g, 12); c.rotation.z = Math.PI / 2; c.rotation.y = .5;
      const p = cil(.002, .018, .06, M.ouro, .2, 1.0, -.1, g, 12); p.rotation.z = -Math.PI / 2; p.rotation.y = .5;
      const pap = plano(.4, .28, M.papel, g); pap.rotation.x = -Math.PI / 2; pap.position.y = .956;
      return 1.7;
    },
    medalha(g) {
      vitrina(.6, .6, .9, g);
      const m = cil(.13, .13, .025, M.ouro, 0, 1.15, 0, g, 32); m.rotation.x = Math.PI / 2;
      const fita = caixa(.1, .25, .01, mat(0x003399), 0, 1.33, 0, g);
      const sup = caixa(.3, .02, .2, M.madeiraEsc, 0, .965, 0, g);
      g.userData.rodar = m;
      return 1.7;
    },
    hemiciclo(g, W, P) {
      const azul = mat(0x2a4fa8, { roughness: .6 }), cinza = mat(0x6b7486, { roughness: .6 });
      const cx = 0, cz = -P / 2 + .15;
      for (let fila = 0; fila < 4; fila++) {
        const r = 1.3 + fila * .55, n = 9 + fila * 4;
        // degrau
        const deg = new T.Mesh(new T.CylinderGeometry(r + .28, r + .28, .12 + fila * .14, 40, 1, false, Math.PI / 2, Math.PI), mat(0x284a3c, { roughness: .8 }));
        deg.position.set(cx, (.12 + fila * .14) / 2, cz); deg.receiveShadow = true; deg.castShadow = true; g.add(deg);
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 + (i + .5) / n * Math.PI;
          const x = cx + Math.sin(a) * r, z = cz - Math.cos(a) * r;
          const y = .12 + fila * .14;
          const as = caixa(.26, .28, .24, i % 5 === 0 ? cinza : azul, x, y + .14, z, g); as.rotation.y = a;
          const enc = caixa(.26, .3, .05, i % 5 === 0 ? cinza : azul, x + Math.sin(a) * .13, y + .35, z - Math.cos(a) * .13, g); enc.rotation.y = a;
        }
      }
      // mesa da presidência
      caixa(1.4, .8, .4, M.madeira, cx, .4, cz - .1, g);
      cil(.03, .03, .4, M.aco, cx, 1.0, cz - .1, g, 8);
      return 1.6;
    },
    pulpito(g, W, P) {
      const t = tex(256, 256, (c, w, h) => {
        c.fillStyle = "#0b3aa8"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#ffcc00"; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; desenharEstrela2D(c, w / 2 + Math.cos(a) * 55, 100 + Math.sin(a) * 55, 10, 4); }
        c.fillStyle = "#fff"; c.font = `bold 30px ${FONTE}`; c.textAlign = "center"; c.fillText("COMISSÃO", w / 2, 210);
      });
      const corpo = caixa(.8, 1.15, .6, M.madeira, 0, .575, 0, g);
      const frente = plano(.66, .66, mat(0xffffff, { map: t }), g); frente.position.set(0, .62, .301);
      const tampo = caixa(.86, .05, .5, M.madeiraEsc, 0, 1.2, -.05, g); tampo.rotation.x = .25;
      const mic = cil(.008, .008, .35, M.preto, .2, 1.38, .05, g, 6); mic.rotation.x = .5;
      esf(.025, M.preto, .2, 1.54, .13, g, 8);
      return 2.0;
    },
    mesa(g, W, P) {
      caixa(W, .06, P * .7, M.madeiraEsc, 0, .78, 0, g);
      caixa(W - .1, .74, .08, M.madeiraEsc, 0, .37, 0, g);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x = -W / 2 + .3 + i * (W - .6) / (n - 1);
        cadeira(g, x, -P * .55, 0);
        const cods = ["pt", "fr", "de", "es", "it"];
        cil(.006, .006, .3, M.aco, x, .96, .05, g, 6);
        const b = plano(.16, .11, mat(0xffffff, { map: texImagem(bandeiraSrc(cods[i]), 128, 88, "#ddd"), side: T.DoubleSide }), g); b.position.set(x + .08, 1.06, .05);
        caixa(.22, .07, .03, M.branco, x, .845, .15, g);
      }
      return 1.5;
    },
    mesaredonda(g, W, P) {
      const r = Math.min(W, P) * .42;
      cil(r, r, .06, M.madeira, 0, .78, 0, g, 40);
      cil(.12, .2, .75, M.madeiraEsc, 0, .375, 0, g, 16);
      const anel = new T.Mesh(new T.TorusGeometry(r * .55, .02, 6, 40), M.ouro); anel.rotation.x = Math.PI / 2; anel.position.y = .815; g.add(anel);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cadeira(g, Math.cos(a) * (r + .25), Math.sin(a) * (r + .25), -a - Math.PI / 2); }
      return 1.5;
    },
    martelo(g) {
      pedestalExpo(.6, .6, .9, g);
      cil(.12, .12, .05, M.madeiraEsc, 0, .975, 0, g, 24);
      const cab = cil(.06, .06, .22, M.madeiraEsc, 0, 1.06, 0, g, 16); cab.rotation.z = Math.PI / 2;
      const ca = cil(.018, .018, .32, M.madeira, .05, 1.06, .15, g, 8); ca.rotation.x = Math.PI / 2;
      [-1, 1].forEach(s => { const b = cil(.065, .065, .02, M.latao, s * .1, 1.06, 0, g, 16); b.rotation.z = Math.PI / 2; });
      return 1.5;
    },
    cofre(g, W, P) {
      const corpo = caixa(1.0, 1.25, .85, mat(0x3a4250, { metalness: .6, roughness: .35 }), 0, .625, 0, g);
      caixa(.84, 1.07, .03, mat(0x4d5768, { metalness: .65, roughness: .3 }), 0, .64, .43, g);
      const disco = cil(.15, .15, .05, M.aco, -.1, .8, .46, g, 32); disco.rotation.x = Math.PI / 2;
      const pega = caixa(.06, .3, .06, M.latao, .25, .62, .48, g);
      const t = plano(.4, .2, mat(0xffffff, { map: textoTex([["€ BCE", 52]], { fundo: "#d9b04a", cor: "#2b1d05", w: 256, h: 128 }) }), g); t.position.set(-.05, 1.1, .461);
      g.userData.rodar = disco; g.userData.eixo = "y";
      return 1.75;
    },
    bilhete(g) {
      pedestalExpo(.5, .5, .9, g);
      const t = tex(200, 200, (c, w, h) => {
        c.fillStyle = "#ffe55c"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#3a3000"; c.font = `bold 28px ${FONTE}`; c.textAlign = "center"; c.fillText("ATENÇÃO!", w / 2, 50);
        c.font = `22px ${FONTE}`; textoMultilinha(c, "Conselho ≠ Conselho ≠ Conselho", w / 2, 95, w - 20, 28);
      });
      const b = plano(.3, .3, mat(0xffffff, { map: t, side: T.DoubleSide }), g); b.rotation.x = -1.1; b.position.set(0, 1.03, 0);
      return 1.5;
    },
    cartaz(g, W) {
      const t = tex(360, 480, (c, w, h) => {
        c.fillStyle = "#f4efe3"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#1a5fb4"; c.fillRect(0, 0, w, 110);
        c.fillStyle = "#fff"; c.font = `bold 30px ${FONTE}`; c.textAlign = "center";
        c.fillText("DECLARAÇÃO UNIVERSAL", w / 2, 46); c.fillText("DOS DIREITOS HUMANOS", w / 2, 86);
        c.fillStyle = "#1d2340"; c.font = `bold 64px ${FONTE}`; c.fillText("1948", w / 2, 190);
        c.font = `italic 24px Georgia, serif`; textoMultilinha(c, "«Todos os seres humanos nascem livres e iguais em dignidade e em direitos.»", w / 2, 250, w - 50, 32);
        c.fillStyle = "#1a5fb4"; c.beginPath(); c.arc(w / 2, 420, 34, 0, 7); c.fill();
        c.fillStyle = "#fff"; c.font = `bold 26px ${FONTE}`; c.fillText("30", w / 2, 429);
      });
      cavalete(1.2, 1.6, t, g, .08);
      return 2.9;
    },
    quadro(g, W) {
      const t = tex(600, 340, (c, w, h) => {
        c.fillStyle = "#24392c"; c.fillRect(0, 0, w, h);
        ruido(c, w, h, 3000, .06);
        c.fillStyle = "rgba(255,255,255,.9)"; c.font = `bold 34px "Comic Sans MS", ${FONTE}`; c.textAlign = "center";
        c.fillText("Os valores da UE", w / 2, 54);
        c.font = `26px "Comic Sans MS", ${FONTE}`;
        ["Dignidade humana", "Liberdade", "Democracia", "Igualdade", "Estado de direito", "Direitos humanos"].forEach((v, i) => c.fillText("• " + v, 150 + (i % 2) * 300, 120 + Math.floor(i / 2) * 70));
      });
      const q = new T.Group(); g.add(q);
      caixa(2.6, 1.5, .08, M.madeira, 0, 1.75, 0, q);
      const p = plano(2.45, 1.38, mat(0xffffff, { map: t, roughness: .95 }), q); p.position.set(0, 1.75, .045);
      caixa(2.5, .05, .14, M.madeira, 0, .98, .06, q);
      [-1, 1].forEach(s => { caixa(.07, 2.5, .07, M.madeiraEsc, s * 1.2, 1.25, -.05, q); caixa(.07, .05, .7, M.madeiraEsc, s * 1.2, .03, -.05, q); });
      return 2.8;
    },
    livro(g) {
      const est = new T.Group(); g.add(est);
      cil(.05, .12, 1.0, M.madeiraEsc, 0, .5, 0, est, 12);
      const tampo = caixa(.6, .04, .45, M.madeiraEsc, 0, 1.03, 0, est); tampo.rotation.x = .3;
      const t = tex(256, 180, (c, w, h) => {
        c.fillStyle = "#fbf7ea"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#555"; for (let y = 22; y < h - 10; y += 12) { c.fillRect(12, y, w / 2 - 24, 4); c.fillRect(w / 2 + 12, y, w / 2 - 24, 4); }
        c.fillStyle = "#123d9e"; c.font = `bold 16px ${FONTE}`; c.fillText("Carta dos Direitos", 16, 16);
        c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(w / 2 - 2, 0, 4, h);
      });
      const l = plano(.5, .34, mat(0xffffff, { map: t }), g); l.position.set(0, 1.07, 0); l.rotation.x = -Math.PI / 2 + .3;
      caixa(.52, .03, .36, mat(0x123d9e), 0, 1.055, -.005, g).rotation.x = .3;
      return 1.6;
    },
    urna(g) {
      caixa(.7, .78, .6, M.madeira, 0, .39, 0, g);
      const v = caixa(.62, .55, .52, M.vidro, 0, 1.06, 0, g); v.castShadow = false;
      caixa(.66, .04, .56, M.acoEsc, 0, 1.35, 0, g);
      caixa(.24, .045, .03, M.preto, 0, 1.36, 0, g);
      const r = aleatorio(5);
      for (let i = 0; i < 14; i++) { const p = caixa(.16, .005, .1, M.papel, (r() - .5) * .45, .81 + r() * .2, (r() - .5) * .35, g); p.rotation.set(r(), r() * 3, r()); p.castShadow = false; }
      const e = plano(.36, .2, mat(0xffffff, { map: textoTex([["VOTO", 50]], { fundo: "#003399", cor: "#ffcc00", w: 256, h: 140 }) }), g); e.position.set(0, .55, .301);
      return 1.7;
    },
    maquete(g, W, P) {
      mesaExpo(W, P, "#2d5a2a", g);
      const pedra = mat(0xe8dcbc, { roughness: .8 });
      const b = new T.Group(); b.position.y = .85; g.add(b);
      caixa(W * .8, .05, P * .55, mat(0x7da35d), 0, .025, 0, b);
      caixa(W * .65, .28, .3, pedra, 0, .19, 0, b);
      for (let i = 0; i < 9; i++) { const a = caixa(.06, .14, .02, M.preto, -W * .28 + i * W * .07, .14, .151, b); a.castShadow = false; }
      caixa(.24, .55, .24, pedra, W * .22, .33, 0, b);
      const cone = new T.Mesh(new T.ConeGeometry(.15, .25, 4), mat(0x8a7a5a)); cone.position.set(W * .22, .72, 0); cone.rotation.y = Math.PI / 4; b.add(cone);
      caixa(.3, .4, .3, pedra, -W * .35, .25, .05, b);
      return 1.6;
    },
    folha(g) {
      vitrina(.6, .6, .9, g);
      const forma = new T.Shape(); forma.moveTo(0, -.15); forma.quadraticCurveTo(.12, 0, 0, .17); forma.quadraticCurveTo(-.12, 0, 0, -.15);
      const f = new T.Mesh(new T.ShapeGeometry(forma, 12), mat(0x2e8b3a, { side: T.DoubleSide, roughness: .6 }));
      f.position.set(0, 1.15, 0); f.rotation.x = -.4; g.add(f); g.userData.rodar = f;
      caixa(.006, .3, .006, mat(0x1f5f27), 0, 1.13, 0, g);
      return 1.7;
    },
    mapario(g, W, P) {
      mesaExpo(W, P, null, g);
      const t = tex(400, 260, (c, w, h) => {
        c.fillStyle = "#efe6cf"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#e2d5b4"; c.fillRect(0, 0, w * .42, h);
        c.strokeStyle = "#7d6a4a"; c.setLineDash([8, 6]); c.lineWidth = 3; c.beginPath(); c.moveTo(w * .42, 0); c.lineTo(w * .42, h); c.stroke(); c.setLineDash([]);
        c.strokeStyle = "#2a7bc0"; c.lineWidth = 8; c.beginPath(); c.moveTo(w - 10, h * .3);
        c.bezierCurveTo(w * .7, h * .55, w * .55, h * .35, w * .4, h * .55); c.bezierCurveTo(w * .25, h * .7, w * .12, h * .45, 14, h * .5); c.stroke();
        c.fillStyle = "#1d2340"; c.font = `bold 22px ${FONTE}`; c.fillText("Porto", 20, h * .5 - 14); c.fillText("ESPANHA", w * .64, 34); c.fillText("PORTUGAL", 18, 34);
        c.font = `italic 22px Georgia, serif`; c.fillText("Rio Douro", w * .5, h * .78);
      });
      const m = plano(W * .85, P * .7, mat(0xffffff, { map: t }), g); m.rotation.x = -Math.PI / 2; m.position.y = .87;
      return 1.4;
    },
    painelsolar(g, W, P) {
      const t = tex(256, 160, (c, w, h) => {
        c.fillStyle = "#0e2a5a"; c.fillRect(0, 0, w, h);
        c.strokeStyle = "#8fb3ff"; c.lineWidth = 2;
        for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
        for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "rgba(255,255,255,.25)"); gr.addColorStop(.5, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      });
      const p = new T.Group(); p.position.y = 1.0; p.rotation.x = -.6; g.add(p);
      caixa(W * .8, .05, P * .9, M.aco, 0, 0, 0, p);
      const pl = plano(W * .78, P * .88, mat(0xffffff, { map: t, metalness: .4, roughness: .2 }), p); pl.rotation.x = -Math.PI / 2; pl.position.y = .027;
      [-1, 1].forEach(s => { caixa(.05, 1.1, .05, M.aco, s * W * .35, .55, .2, g); caixa(.05, .7, .05, M.aco, s * W * .35, .35, -.3, g); });
      // pequena eólica
      const e = new T.Group(); e.position.set(W * .5, 0, -.2); g.add(e);
      cil(.03, .05, 2.2, M.branco, 0, 1.1, 0, e, 10);
      const rotor = new T.Group(); rotor.position.set(0, 2.2, .06); e.add(rotor);
      for (let i = 0; i < 3; i++) { const pa = caixa(.06, .6, .015, M.branco, 0, .3, 0); const pv = new T.Group(); pv.rotation.z = i * Math.PI * 2 / 3; pv.add(pa); rotor.add(pv); }
      g.userData.rotor = rotor;
      return 2.6;
    },
    mochila(g) {
      const az = mat(0x1d4fa8, { roughness: .8 });
      const c = caixa(.55, .7, .3, az, 0, .45, 0, g);
      const tampa = esf(.28, az, 0, .8, 0, g, 16); tampa.scale.set(1, .4, .55);
      caixa(.42, .3, .1, mat(0x173f88), 0, .35, .18, g);
      [-1, 1].forEach(s => caixa(.06, .6, .04, mat(0x111a33), s * .17, .5, -.17, g));
      const t = plano(.4, .14, mat(0xffffff, { map: textoTex([["Erasmus", 44]], { fundo: "#ffcc00", cor: "#0a1a4a", w: 256, h: 90 }) }), g); t.position.set(0, .62, .157);
      return 1.3;
    },
    estacao(g, W, P, o) {
      // consola hexagonal com estrela flutuante
      g.add(torno([[0, 0], [.6, 0], [.6, .1], [.45, .16], [.38, .85], [.5, .95], [.5, 1.02], [0, 1.02]], mat(0x24305a, { metalness: .4, roughness: .35 }), 6));
      const anel = new T.Mesh(new T.TorusGeometry(.42, .03, 8, 6), mat(0xffcc00, { emissive: 0xffcc00, emissiveIntensity: .8, unico: true }));
      anel.rotation.x = Math.PI / 2; anel.position.y = 1.03; g.add(anel);
      const ecra = plano(.5, .3, mat(0xffffff, { map: textoTex([["DESAFIO", 50]], { fundo: "#0b1a4a", cor: "#ffcc00", w: 256, h: 150 }), emissive: 0x222244 }), g);
      ecra.position.set(0, .62, .42); ecra.rotation.x = -.08;
      const est = estrela3D(.32, .1, mat(0xffcc00, { metalness: .6, roughness: .25, emissive: 0x806000, emissiveIntensity: .6, unico: true }));
      est.position.y = 1.75; g.add(est);
      const luz = new T.PointLight(0xffcc66, 0, 3.5, 2); luz.position.y = 1.7; g.add(luz);
      g.userData.estacao = { anel, est, luz };
      return 2.4;
    }
  };
  function cadeira(pai, x, z, rot) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const m = mat(0x2a3a66, { roughness: .7 });
    caixa(.4, .06, .4, m, 0, .45, 0, g);
    caixa(.4, .5, .05, m, 0, .72, -.18, g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cil(.02, .02, .45, M.acoEsc, a * .16, .225, b * .16, g, 6));
    pai.add(g); return g;
  }
  function codigoISO(id) { return ({ EL: "gr", UK: "gb" }[id] || id).toLowerCase(); }

  /* ============================================================
     MARCADORES (por investigar, investigado, estrela, cadeado…)
     ============================================================ */
  const texMarc = {};
  function texMarcador(tipo) {
    if (texMarc[tipo]) return texMarc[tipo];
    texMarc[tipo] = tex(128, 128, (c) => {
      const cor = { nova: "#ffcc00", vista: "#2fbf71", bloqueado: "#8a93ad", disponivel: "#ffcc00", feito: "#2fbf71", porta: "#7fd3ff" }[tipo];
      c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 8;
      c.fillStyle = cor; c.beginPath(); c.arc(64, 60, 44, 0, 7); c.fill();
      c.shadowBlur = 0; c.strokeStyle = "#fff"; c.lineWidth = 6; c.stroke();
      c.beginPath(); c.moveTo(52, 100); c.lineTo(64, 122); c.lineTo(76, 100); c.fillStyle = cor; c.fill();
      c.strokeStyle = "#0a1a4a"; c.fillStyle = "#0a1a4a"; c.lineWidth = 8; c.lineCap = "round";
      if (tipo === "nova") { c.beginPath(); c.arc(58, 54, 17, 0, 7); c.stroke(); c.beginPath(); c.moveTo(70, 66); c.lineTo(84, 80); c.stroke(); }
      else if (tipo === "vista" || tipo === "feito") { c.beginPath(); c.moveTo(42, 60); c.lineTo(58, 76); c.lineTo(86, 44); c.stroke(); }
      else if (tipo === "bloqueado") { c.fillRect(46, 56, 36, 28); c.beginPath(); c.arc(64, 54, 13, Math.PI, 0); c.stroke(); }
      else if (tipo === "disponivel") { c.fillStyle = "#0a1a4a"; desenharEstrela2D(c, 64, 62, 30, 12); }
    });
    return texMarc[tipo];
  }

  /* ============================================================
     CONSTRUÇÃO DE UMA SALA
     ============================================================ */
  const PAREDES = {
    atrio: { cor: "#16306f", acento: "#d9a92e" },
    simbolos: { cor: "#3a2c74", acento: "#ffcc00" },
    mapa: { cor: "#1b5570", acento: "#7fd3ff", estilo: "riscas" },
    historia: { cor: "#5a3a22", acento: "#f0c27a", estilo: "riscas" },
    instituicoes: { cor: "#1f4c3c", acento: "#9be3c0" },
    direitos: { cor: "#7a2a48", acento: "#ffb3c9", estilo: "riscas" },
    futuro: { cor: "#2f6a3a", acento: "#c8f08f" }
  };

  function construirSala(id) {
    const s = D.SALAS[id], pal = PAREDES[id];
    const grupo = new T.Group();
    const info = { id, grupo, objetos: {}, colisoes: [], paredes: [], pick: [], anim: [] };
    const largura = SALA.x1 - SALA.x0, prof = SALA.z1 - SALA.z0;
    // chão
    const chao = new T.Mesh(new T.PlaneGeometry(largura, prof), mat(0xffffff, { map: texChao(id), roughness: id === "atrio" ? .3 : .75, unico: true }));
    chao.rotation.x = -Math.PI / 2; chao.position.set(0, 0, (SALA.z0 + SALA.z1) / 2); chao.receiveShadow = true;
    chao.userData.chao = true; grupo.add(chao); info.chao = chao;
    // base exterior (para o vazio à volta)
    const base = new T.Mesh(new T.BoxGeometry(largura + .6, .5, prof + .6), mat(0x0a1430)); base.position.set(0, -.26, (SALA.z0 + SALA.z1) / 2); grupo.add(base);
    // paredes
    const tParede = texParede(pal.cor, pal.acento, pal.estilo);
    const mParede = () => mat(0xffffff, { map: tParede, roughness: .85, transparent: true, unico: true });
    const espessura = .3;
    const P = [
      { w: largura + espessura * 2, h: SALA.h, x: 0, z: SALA.z0 - espessura / 2, n: [0, 1], lado: "n" },
      { w: largura + espessura * 2, h: .9, x: 0, z: SALA.z1 + espessura / 2, n: [0, -1], lado: "s" },
      { w: prof, h: SALA.h, x: SALA.x0 - espessura / 2, z: (SALA.z0 + SALA.z1) / 2, n: [1, 0], lado: "o" },
      { w: prof, h: SALA.h, x: SALA.x1 + espessura / 2, z: (SALA.z0 + SALA.z1) / 2, n: [-1, 0], lado: "e" }
    ];
    P.forEach(p => {
      const lateral = p.lado === "o" || p.lado === "e";
      const m = new T.Mesh(new T.BoxGeometry(lateral ? espessura : p.w, p.h, lateral ? p.w : espessura), mParede());
      m.position.set(p.x, p.h / 2, p.z); m.receiveShadow = true; m.castShadow = p.lado !== "s";
      grupo.add(m); info.paredes.push({ m, n: p.n, lado: p.lado, x: p.x, z: p.z });
      // rodapé e cornija douradas
      const r = caixa(lateral ? espessura + .04 : p.w, .12, lateral ? p.w : espessura + .04, mat(pal.acento, { metalness: .5, roughness: .4 }), p.x, p.h - .06, p.z, grupo);
      r.castShadow = false; info.paredes[info.paredes.length - 1].extra = [r];
    });
    // decoração da sala
    DECOR[id] && DECOR[id](grupo, info);
    // objetos
    s.objetos.forEach(o => {
      const g = new T.Group();
      const cx = toX(o.x + o.w / 2), cz = toZ(o.y + o.h / 2);
      g.position.set(cx, 0, cz);
      const W = o.w * S, Pp = o.h * S;
      const f = MODELOS[o.desenho] || MODELOS.placa;
      const alt = f(g, W, Pp, o, id) || 1.5;
      g.traverse(m => { if (m.isMesh) { m.userData.objId = o.id; info.pick.push(m); } });
      grupo.add(g);
      // marcador flutuante
      let marc = null;
      if (o.tipo === "pista" || o.tipo === "desafio") {
        marc = new T.Sprite(new T.SpriteMaterial({ map: texMarcador("nova"), depthTest: false, transparent: true }));
        marc.scale.set(.55, .55, .55); marc.position.set(cx, alt + .45, cz); marc.renderOrder = 10;
        grupo.add(marc);
      }
      const aabb = { x0: toX(o.x), x1: toX(o.x + o.w), z0: toZ(o.y), z1: toZ(o.y + o.h) };
      if ((o.tipo === "porta" || o.tipo === "saida") && o.y > 300) {
        const mats = [];
        g.children[0].traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; mats.push(m.material); m.castShadow = false; } });
        info.fadeSul = info.fadeSul || []; info.fadeSul.push({ mats, aabb, op: 1 });
      }
      info.objetos[o.id] = { o, g, marc, alt, aabb, base: alt + .45 };
      if (o.tipo !== "porta" && o.tipo !== "saida") info.colisoes.push(aabb);
    });
    // luzes da sala
    const hemi = new T.HemisphereLight(0xdfe8ff, new T.Color(s.chao), .9); grupo.add(hemi);
    const sol = new T.DirectionalLight(0xfff1dc, 2.1);
    sol.position.set(-6, 14, 9); sol.target.position.set(0, 0, 0);
    sol.castShadow = true;
    const tam = TELEMOVEL ? 1024 : 2048;
    sol.shadow.mapSize.set(tam, tam);
    Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 40 });
    sol.shadow.bias = -.0004; sol.shadow.normalBias = .02;
    grupo.add(sol, sol.target);
    const preench = new T.DirectionalLight(new T.Color(s.acento), .35); preench.position.set(8, 6, -6); grupo.add(preench);
    // candeeiros de parede (pontos de luz quentes)
    [-7, 0, 7].forEach(x => {
      const l = new T.PointLight(0xffd9a0, 6, 9, 2); l.position.set(x, 3.3, SALA.z0 + .8); grupo.add(l);
      arandela(grupo, x, SALA.z0 + .02);
    });
    info.raio = s.rio ? construirRio(grupo, info) : null;
    return info;
  }
  function arandela(g, x, z) {
    caixa(.18, .3, .06, M.latao, x, 3.25, z + .03, g);
    const b = esf(.12, mat(0xfff1c0, { emissive: 0xffd27a, emissiveIntensity: 1.4 }), x, 3.45, z + .16, g, 12); b.castShadow = false;
  }

  /* ---------- decoração específica ---------- */
  function quadroParede(g, x, y, z, w, h, t, rotY = 0, m) {
    const q = moldura(w, h, t, m); q.position.set(x, y, z); q.rotation.y = rotY; g.add(q); return q;
  }
  const naParedeN = (x, y, w, h, t, g, m) => quadroParede(g, x, y, SALA.z0 + .04, w, h, t, 0, m);
  const naParedeO = (z, y, w, h, t, g) => quadroParede(g, SALA.x0 + .04, y, z, w, h, t, Math.PI / 2);
  const naParedeE = (z, y, w, h, t, g) => quadroParede(g, SALA.x1 - .04, y, z, w, h, t, -Math.PI / 2);
  function janela(g, x, z, rotY, w = 2, h = 2.2, paisagem) {
    const q = new T.Group(); q.position.set(x, 2.1, z); q.rotation.y = rotY; g.add(q);
    const t = tex(256, 280, (c, W, H) => {
      const ce = c.createLinearGradient(0, 0, 0, H); ce.addColorStop(0, "#7fb9ea"); ce.addColorStop(1, "#d8ecfa");
      c.fillStyle = ce; c.fillRect(0, 0, W, H);
      if (paisagem === "douro") {
        c.fillStyle = "#6f9a4e"; c.beginPath(); c.moveTo(0, H * .55); c.quadraticCurveTo(W * .4, H * .35, W, H * .5); c.lineTo(W, H); c.lineTo(0, H); c.fill();
        c.strokeStyle = "rgba(40,70,20,.5)"; c.lineWidth = 2; for (let y = H * .55; y < H; y += 10) { c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W * .4, y - 20, W, y - 5); c.stroke(); }
        c.fillStyle = "#3f86c6"; c.fillRect(0, H * .86, W, H * .14);
      } else {
        c.fillStyle = "#9fb3c8"; c.fillRect(0, H * .6, W, H * .4);
        c.fillStyle = "#cdd6e0"; for (let i = 0; i < 6; i++) c.fillRect(i * 44, H * .45 - (i % 3) * 20, 36, H);
      }
      c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.moveTo(0, 0); c.lineTo(W * .5, 0); c.lineTo(0, H * .5); c.fill();
    });
    const v = plano(w, h, mat(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .55 }), q); v.position.z = .01;
    caixa(w + .2, .12, .1, M.branco, 0, h / 2, .04, q); caixa(w + .2, .16, .2, M.branco, 0, -h / 2, .06, q);
    caixa(.1, h, .1, M.branco, -w / 2, 0, .04, q); caixa(.1, h, .1, M.branco, w / 2, 0, .04, q); caixa(.06, h, .06, M.branco, 0, 0, .04, q);
    // cortinas
    [-1, 1].forEach(s => { const ct = caixa(.35, h + .5, .08, mat(0x8a1f2f, { roughness: .9 }), s * (w / 2 + .25), .1, .12, q); });
  }
  function estante(g, x, z, rotY, w = 2.2, h = 2.6) {
    const e = new T.Group(); e.position.set(x, 0, z); e.rotation.y = rotY; g.add(e);
    caixa(w, h, .42, M.madeiraEsc, 0, h / 2, 0, e);
    const r = aleatorio(Math.round(x * 13 + z * 7 + 99));
    for (let p = 0; p < 4; p++) {
      const y = .25 + p * (h - .3) / 4;
      caixa(w - .1, .03, .38, M.madeira, 0, y, .03, e);
      let xx = -w / 2 + .1;
      while (xx < w / 2 - .15) {
        const bw = .05 + r() * .06, bh = .32 + r() * .16;
        const cor = new T.Color().setHSL(r(), .45, .25 + r() * .2);
        const l = caixa(bw, bh, .26, mat(cor, { roughness: .8 }), xx + bw / 2, y + bh / 2 + .015, .06, e); l.castShadow = false;
        xx += bw + .008;
      }
    }
  }
  function grinalda(g, x0, x1, y, z, cods) {
    const n = cods.length;
    const fio = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(x0, y, z), new T.Vector3((x0 + x1) / 2, y - .5, z + .3), new T.Vector3(x1, y, z)]), 40, .01, 4), M.preto);
    g.add(fio);
    cods.forEach((cod, i) => {
      const t = (i + .5) / n, x = x0 + (x1 - x0) * t, yy = y - Math.sin(t * Math.PI) * .5;
      const b = plano(.42, .3, mat(0xffffff, { map: texImagem(bandeiraSrc(cod), 128, 90, "#ccc"), side: T.DoubleSide }), g);
      b.position.set(x, yy - .2, z + .3 * Math.sin(t * Math.PI) + .02);
    });
  }
  function texMapaParede() {
    return tex(1024, 720, (c, w, h) => {
      c.fillStyle = "#cfe3ef"; c.fillRect(0, 0, w, h);
      c.save(); const sx = w / 640; c.scale(sx, sx); c.translate(-180, -120);
      (window.MAPA_EUROPA || []).forEach(m => {
        const p = new Path2D(m.d);
        const ue = UE27.includes(codigoISO(m.id));
        c.fillStyle = ue ? "#2f5fc4" : "#efe6cf"; c.fill(p);
        c.strokeStyle = ue ? "#ffcc00" : "#9a8a6a"; c.lineWidth = .7; c.stroke(p);
      });
      c.restore();
      c.fillStyle = "rgba(255,255,255,.9)"; c.fillRect(20, h - 92, 430, 72);
      c.fillStyle = "#2f5fc4"; c.fillRect(36, h - 76, 34, 22);
      c.fillStyle = "#1d2340"; c.font = `bold 26px ${FONTE}`; c.fillText("Estados-membros da UE (27)", 84, h - 56);
      c.font = `18px ${FONTE}`; c.fillText("Mapa: Eurostat/GISCO, © EuroGeographics", 36, h - 30);
      c.strokeStyle = "#5a4630"; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    });
  }
  function tapete(g, x, z, r, cor, borda, desenho) {
    const t = tex(512, 512, (c, w, h) => {
      c.fillStyle = cor; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill();
      c.strokeStyle = borda; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 20, 0, 7); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 44, 0, 7); c.stroke();
      if (desenho) desenho(c, w, h);
      ruido(c, w, h, 5000, .07);
    });
    const m = new T.Mesh(new T.CircleGeometry(r, 48), mat(0xffffff, { map: t, roughness: .95, transparent: true }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .008, z); m.receiveShadow = true; g.add(m);
  }
  const DECOR = {
    atrio(g, info) {
      [[-10.6, -5.6], [10.6, -5.6], [-10.6, 6.8], [10.6, 6.8], [-4.4, -5.6], [4.4, -5.6]].forEach(([x, z]) => coluna(g, x, z, SALA.h));
      info.colisoes.push(...[[-10.6, -5.6], [10.6, -5.6], [-10.6, 6.8], [10.6, 6.8], [-4.4, -5.6], [4.4, -5.6]].map(([x, z]) => ({ x0: x - .45, x1: x + .45, z0: z - .45, z1: z + .45 })));
      // estandartes com os logótipos
      const tClube = texImagem(window.LOGOS_DATA && window.LOGOS_DATA["clube-europeu"], 256, 380, "#0f2a73", 26);
      const tAgr = texImagem(window.LOGOS_DATA && window.LOGOS_DATA["agrupamento-spc"], 512, 160, "#ffffff", 14);
      [-1, 1].forEach(s => {
        const b = plano(1.3, 1.95, mat(0xffffff, { map: tClube, side: T.DoubleSide }), g); b.position.set(s * 11.5, 2.6, -1.2); b.rotation.y = s * -Math.PI / 2;
        caixa(.06, .06, 1.5, M.latao, s * 11.45, 3.6, -1.2, g);
      });
      const placa = plano(3.6, 1.1, mat(0xffffff, { map: tAgr }), g); placa.position.set(0, 3.55, SALA.z0 + .17);
      // letreiro
      const letr = plano(4.6, .6, mat(0xffffff, { map: textoTex([["CASA DA EUROPA", 64]], { fundo: "#0b1a4a", cor: "#ffcc00", w: 768, h: 100, ruido: false }), emissive: 0x332200 }), g);
      letr.position.set(0, 2.7, SALA.z0 + .17);
      planta(g, -8.4, -5.5, 1.2); planta(g, 8.4, -5.5, 1.2); planta(g, -8.4, 6.9, 1.2); planta(g, 8.4, 6.9, 1.2);
      [[-8.4, -5.5], [8.4, -5.5], [-8.4, 6.9], [8.4, 6.9]].forEach(([x, z]) => info.colisoes.push({ x0: x - .35, x1: x + .35, z0: z - .35, z1: z + .35 }));
      // bancos
      [-1, 1].forEach(s => { const b = new T.Group(); b.position.set(s * 7.2, 0, 2.2); g.add(b); caixa(2, .1, .55, M.madeira, 0, .45, 0, b); caixa(1.9, .4, .45, M.acoEsc, 0, .2, 0, b); info.colisoes.push({ x0: s * 7.2 - 1, x1: s * 7.2 + 1, z0: 1.9, z1: 2.5 }); });
    },
    simbolos(g, info) {
      const ban = plano(3.6, 2.4, mat(0xffffff, { map: tex(600, 400, (c, w, h) => bandeiraUE(c, w, h)), side: T.DoubleSide, roughness: .85 }), g);
      ban.position.set(-SALA.x1 + .2, 2.4, 3.2); ban.rotation.y = Math.PI / 2;
      caixa(.08, .08, 3.9, M.latao, SALA.x0 + .1, 3.65, 3.2, g);
      const pauta = tex(900, 180, (c, w, h) => {
        c.fillStyle = "#f7f1e1"; c.fillRect(0, 0, w, h); c.strokeStyle = "#333"; c.lineWidth = 2;
        for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(30, 50 + i * 16); c.lineTo(w - 30, 50 + i * 16); c.stroke(); }
        const notas = [2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1]; c.fillStyle = "#222";
        notas.forEach((n, i) => { const x = 90 + i * 52, y = 114 - n * 8; c.beginPath(); c.ellipse(x, y, 9, 7, -.4, 0, 7); c.fill(); c.fillRect(x + 7, y - 44, 2.5, 44); });
        c.font = "italic 22px Georgia, serif"; c.fillText("«Hino à Alegria» — L. van Beethoven", 30, 30);
      });
      naParedeN(-6.5, 2.9, 4.2, .84, pauta, g);
      tapete(g, -1.2, 1.2, 3.2, "#24195a", "#ffcc00", (c, w, h) => { c.fillStyle = "#ffcc00"; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; desenharEstrela2D(c, w / 2 + Math.cos(a) * 150, h / 2 + Math.sin(a) * 150, 24, 10); } });
      naParedeN(6.5, 2.9, 2.6, 1.2, textoTex([["Unida na", 56], ["diversidade", 56]], { fundo: "#0b1a4a", cor: "#ffcc00", serif: true, w: 512, h: 240 }), g);
      janela(g, SALA.x1 - .02, 1.5, -Math.PI / 2, 2.2, 2.2);
      planta(g, 10.6, -5.5, 1.1); planta(g, -10.6, -5.5, 1.1);
    },
    mapa(g, info) {
      naParedeN(0, 2.3, 5.2, 3.65, texMapaParede(), g, M.madeiraEsc);
      grinalda(g, SALA.x0 + .4, -2.9, 3.95, SALA.z0 + .15, UE27.slice(0, 13));
      grinalda(g, 2.9, SALA.x1 - .4, 3.95, SALA.z0 + .15, UE27.slice(13));
      janela(g, SALA.x0 + .02, 1.5, Math.PI / 2, 2.2, 2.2);
      // baú de explorador
      const b = new T.Group(); b.position.set(-10.4, 0, 5.8); g.add(b); caixa(1.2, .6, .7, M.madeira, 0, .3, 0, b); caixa(1.24, .08, .74, M.latao, 0, .6, 0, b);
      info.colisoes.push({ x0: -11, x1: -9.8, z0: 5.4, z1: 6.2 });
      planta(g, 10.6, 6.6, 1.1);
    },
    historia(g, info) {
      [-8.8, -6.4].forEach(x => estante(g, x, SALA.z0 + .25, 0));
      [6.4, 8.8].forEach(x => estante(g, x, SALA.z0 + .25, 0));
      [-1.5, 2.2].forEach(z => { estante(g, SALA.x0 + .25, z, Math.PI / 2); });
      info.colisoes.push({ x0: SALA.x0, x1: SALA.x0 + .5, z0: -2.7, z1: 3.4 });
      [-4.0, 4.0].forEach(z => estante(g, SALA.x1 - .25, z + 1.5, -Math.PI / 2));
      // relógio de pé
      const r = new T.Group(); r.position.set(-10.6, 0, 6.6); g.add(r);
      caixa(.6, 2.3, .4, M.madeiraEsc, 0, 1.15, 0, r);
      const mostr = plano(.44, .44, mat(0xffffff, { map: tex(128, 128, (c) => { c.fillStyle = "#f5ecd5"; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = "#222"; c.lineWidth = 4; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 22); c.moveTo(64, 64); c.lineTo(92, 70); c.stroke(); }) }), r);
      mostr.position.set(0, 1.9, .201);
      info.colisoes.push({ x0: -11, x1: -10.2, z0: 6.3, z1: 6.9 });
      naParedeN(0, 2.6, 2.4, 1.6, textoTex([["ARQUIVO", 60], ["da construção europeia", 30, "italic"]], { fundo: "#3a2410", cor: "#f0c27a", serif: true, w: 512, h: 300 }), g);
    },
    instituicoes(g, info) {
      // semicírculo de mastros com as bandeiras da UE atrás do hemiciclo
      UE27.forEach((cod, i) => {
        const a = Math.PI * (.12 + .76 * i / 26), r = 4.2;
        const x = Math.cos(a) * r * 1.6, z = SALA.z0 + .5;
        if (i % 2) return;
        cil(.02, .02, 2.8, M.aco, -9 + i * .69, 1.4, SALA.z0 + .5, g, 6);
        const b = plano(.5, .34, mat(0xffffff, { map: texImagem(bandeiraSrc(cod), 128, 88, "#ccc"), side: T.DoubleSide }), g);
        b.position.set(-9 + i * .69 + .26, 2.6, SALA.z0 + .5);
      });
      const ecra = plano(4.2, 1.4, mat(0xffffff, { map: textoTex([["SESSÃO PLENÁRIA", 56], ["Estrasburgo · Bruxelas", 30, "italic", "#9be3c0"]], { fundo: "#0d2a20", cor: "#ffffff", w: 768, h: 256, ruido: false }), emissive: 0x112218 }), g);
      ecra.position.set(0, 3.45, SALA.z0 + .17);
      planta(g, 10.6, -5.5, 1.1); planta(g, -10.6, 6.6, 1.1);
      janela(g, SALA.x0 + .02, 2.5, Math.PI / 2, 2, 2.1);
      tapete(g, -.6, 3.2, 2.6, "#123d2f", "#9be3c0", (c, w, h) => { c.fillStyle = "#9be3c0"; c.textAlign = "center"; c.font = `bold 40px ${FONTE}`; c.fillText("27 países", w / 2, h / 2 - 6); c.font = `28px ${FONTE}`; c.fillText("uma União", w / 2, h / 2 + 36); });
    },
    direitos(g, info) {
      const valores = ["Dignidade humana", "Liberdade", "Democracia", "Igualdade", "Estado de direito", "Direitos humanos"];
      valores.forEach((v, i) => {
        const t = textoTex([[v, 46]], { fundo: "#fbefe9", cor: "#7a2a48", w: 512, h: 160, borda: "#ffb3c9", bl: 12 });
        if (i < 3) naParedeO(-3.6 + i * 3.4, 2.6, 2.2, .7, t, g); else naParedeE(-3.6 + (i - 3) * 3.4, 2.6, 2.2, .7, t, g);
      });
      naParedeN(-3.2, 2.9, 1.6, 1.1, tex(300, 200, (c, w, h) => { bandeiraUE(c, w, h); }), g);
      naParedeN(3.2, 2.9, 1.6, 1.1, textoTex([["Conselho", 34], ["da Europa", 34], ["46 Estados", 26, "italic"]], { fundo: "#1a5fb4", cor: "#fff", w: 300, h: 200 }), g);
      planta(g, 10.6, -5.5, 1.1); planta(g, -10.6, -5.5, 1.1); planta(g, 10.6, 6.6, 1.1);
      tapete(g, -.8, 1.4, 3, "#f3dfe6", "#7a2a48", (c, w, h) => {
        c.fillStyle = "#7a2a48"; c.textAlign = "center"; c.font = `bold 44px Georgia, serif`;
        c.fillText("Livres e iguais", w / 2, h / 2 - 10); c.font = `italic 30px Georgia, serif`; c.fillText("em dignidade e em direitos", w / 2, h / 2 + 36);
      });
    },
    futuro(g, info) {
      janela(g, -6.8, SALA.z0 + .02, 0, 2.6, 2.3, "douro");
      janela(g, 6.8, SALA.z0 + .02, 0, 2.6, 2.3, "douro");
      janela(g, SALA.x1 - .02, 3.5, -Math.PI / 2, 2.2, 2.2, "douro");
      [[-10.5, -5.4], [10.5, -5.4], [-10.6, 6.7], [10.6, 6.7], [10.6, 1.2]].forEach(([x, z]) => {
        planta(g, x, z, 1.5); info.colisoes.push({ x0: x - .4, x1: x + .4, z0: z - .4, z1: z + .4 });
      });
      naParedeN(0, 3.3, 3.2, .7, textoTex([["Património · Ambiente · Futuro", 40]], { fundo: "#173016", cor: "#c8f08f", w: 768, h: 160 }), g);
    }
  };
  function construirRio(g, info) {
    const z0 = toZ(272), z1 = toZ(328);
    const larg = SALA.x1 - SALA.x0;
    const leito = new T.Mesh(new T.BoxGeometry(larg, .3, z1 - z0 + .3), mat(0x355e44)); leito.position.set(0, -.15, (z0 + z1) / 2); g.add(leito);
    const tAgua = tex(512, 128, (c, w, h) => {
      c.fillStyle = "#2d79c7"; c.fillRect(0, 0, w, h);
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 3;
      for (let i = 0; i < 22; i++) { const x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 15, y - 5, x + 34, y); c.stroke(); }
    }, [8, 1]);
    const agua = new T.Mesh(new T.PlaneGeometry(larg, z1 - z0), mat(0xffffff, { map: tAgua, roughness: .1, metalness: .2, transparent: true, opacity: .92 }));
    agua.rotation.x = -Math.PI / 2; agua.position.set(0, .006, (z0 + z1) / 2); agua.receiveShadow = true; g.add(agua);
    // chão de vidro por cima e margens de pedra
    const vidro = new T.Mesh(new T.PlaneGeometry(larg, z1 - z0), new T.MeshPhysicalMaterial({ color: 0xe6f6ff, transparent: true, opacity: .12, roughness: .02, depthWrite: false }));
    vidro.rotation.x = -Math.PI / 2; vidro.position.set(0, .014, (z0 + z1) / 2); g.add(vidro);
    [z0, z1].forEach(z => caixa(larg, .06, .12, mat(0xb9ab8e), 0, .02, z, g).castShadow = false);
    // ponte de madeira
    const ponte = new T.Group(); ponte.position.set(toX(480), 0, (z0 + z1) / 2); g.add(ponte);
    for (let i = 0; i < 10; i++) caixa(2.0, .06, .18, M.madeira, 0, .05, -1.1 + i * .245, ponte);
    [-1, 1].forEach(s => { caixa(.06, .06, 2.6, M.madeiraEsc, s * .98, .75, 0, ponte); [-1.2, 0, 1.2].forEach(z => caixa(.06, .75, .06, M.madeiraEsc, s * .98, .38, z, ponte)); });
    const placa = plano(2.2, .36, mat(0xffffff, { map: textoTex([["Rio Douro (ilustração)", 40]], { fundo: "#173016", cor: "#fff", w: 512, h: 84 }), side: T.DoubleSide }), g);
    placa.position.set(-4.6, .02, z1 + .35); placa.rotation.x = -Math.PI / 2;
    info.anim.push(t => { tAgua.offset.x = -t * .05; });
    return true;
  }

  /* ============================================================
     AVATAR
     ============================================================ */
  function criarAvatar() {
    const g = new T.Group();
    const camisola = mat(0x1d4fc4, { roughness: .75 }), calca = mat(0x26324f, { roughness: .8 }), sapato = mat(0x2a1a10);
    const tronco = new T.Group(); tronco.position.y = .95; g.add(tronco);
    const corpo = new T.Mesh(new T.CapsuleGeometry(.24, .38, 6, 16), camisola); corpo.position.y = .2; corpo.castShadow = true; tronco.add(corpo);
    const emblema = new T.Mesh(new T.CircleGeometry(.09, 24), mat(0xffffff, { map: tex(128, 128, (c, w, h) => { c.fillStyle = "#003399"; c.beginPath(); c.arc(64, 64, 64, 0, 7); c.fill(); c.fillStyle = "#ffcc00"; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; desenharEstrela2D(c, 64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40, 9, 4); } }) }));
    emblema.position.set(.1, .32, .245); tronco.add(emblema);
    const cabeca = esf(.2, M.pele, 0, .78, 0, tronco, 24);
    const cabelo = new T.Mesh(new T.SphereGeometry(.215, 24, 16, 0, Math.PI * 2, 0, Math.PI * .55), mat(0x3b2414, { roughness: .9 }));
    cabelo.position.set(0, .8, -.02); cabelo.rotation.x = -.25; cabelo.castShadow = true; tronco.add(cabelo);
    [-1, 1].forEach(s => esf(.025, M.preto, s * .075, .8, .18, tronco, 8));
    const mochila = caixa(.36, .42, .16, mat(0xffcc00, { roughness: .7 }), 0, .25, -.3, tronco);
    const bracos = [-1, 1].map(s => {
      const b = new T.Group(); b.position.set(s * .32, .48, 0); tronco.add(b);
      const m = new T.Mesh(new T.CapsuleGeometry(.07, .4, 4, 10), camisola); m.position.y = -.25; m.castShadow = true; b.add(m);
      esf(.07, M.pele, 0, -.52, 0, b, 10);
      return b;
    });
    const pernas = [-1, 1].map(s => {
      const p = new T.Group(); p.position.set(s * .12, .95, 0); g.add(p);
      const m = new T.Mesh(new T.CapsuleGeometry(.09, .62, 4, 10), calca); m.position.y = -.45; m.castShadow = true; p.add(m);
      caixa(.15, .09, .26, sapato, 0, -.88, .05, p);
      return p;
    });
    // sombra de contacto
    const sombra = new T.Mesh(new T.CircleGeometry(.45, 24), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .25, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = .01; g.add(sombra);
    jog.partes = { tronco, bracos, pernas };
    return g;
  }

  /* ============================================================
     ESTADO DOS OBJETOS → aparência
     ============================================================ */
  function atualizarAparencia() {
    if (!salaAtual || !window.App) return;
    atualizarPrompt();
    Object.values(salaAtual.objetos).forEach(it => {
      const e = window.App.estadoObjeto(it.o);
      if (it.marc) {
        const tipo = it.o.tipo === "pista" ? (e === "vista" ? "vista" : "nova") : (e === "feito" ? "feito" : e === "bloqueado" ? "bloqueado" : "disponivel");
        it.marc.material.map = texMarcador(tipo); it.marc.material.needsUpdate = true;
        it.marc.userData.tipo = tipo;
        const s = tipo === "vista" ? .38 : .55; it.marc.scale.set(s, s, s);
      }
      const st = it.g.userData.estacao;
      if (st) {
        const cor = e === "feito" ? 0x2fbf71 : e === "bloqueado" ? 0x5a6380 : 0xffcc00;
        st.anel.material.color.setHex(cor); st.anel.material.emissive.setHex(cor);
        st.est.material.color.setHex(e === "bloqueado" ? 0xb8c0d8 : 0xffcc00);
        st.est.material.emissive.setHex(e === "bloqueado" ? 0x2a3350 : e === "feito" ? 0x996e00 : 0x806000);
        st.luz.intensity = e === "bloqueado" ? 0 : e === "feito" ? 3 : 1.6;
        st.estado = e;
      }
      const tb = it.g.userData.tabuleta;
      if (tb) desenharTabuleta(tb);
      const pd = it.g.userData.pedestal;
      if (pd) {
        const n = window.App.estrelas();
        const cx = pd.c.getContext("2d"); bandeiraUE(cx, pd.c.width, pd.c.height, n, true); pd.t.needsUpdate = true;
        pd.estrelas.forEach((s, k) => { const on = k < n; s.material.color.setHex(on ? 0xffcc00 : 0x5a6a99); s.material.emissive.setHex(on ? 0x997700 : 0x000000); s.material.metalness = on ? .8 : .3; });
      }
    });
  }
  function desenharTabuleta(tb) {
    const c = tb.c.getContext("2d"), w = tb.c.width, h = tb.c.height, o = tb.o;
    c.fillStyle = "#0b1a4a"; c.fillRect(0, 0, w, h);
    c.fillStyle = tb.acento; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10);
    c.textAlign = "center"; c.fillStyle = "#fff";
    if (o.destino) {
      const [num, ...resto] = o.rotulo.split(" · ");
      c.font = `bold 40px ${FONTE}`; c.fillText(resto.join(" · ") || o.rotulo, w / 2 + 26, 70);
      c.fillStyle = tb.acento; c.beginPath(); c.arc(42, 58, 30, 0, 7); c.fill();
      c.fillStyle = "#0b1a4a"; c.font = `bold 38px ${FONTE}`; c.fillText(num, 42, 72);
      const n = window.App ? window.App.estrelasSala(o.destino) : 0;
      for (let k = 0; k < 2; k++) { c.fillStyle = k < n ? "#ffcc00" : "rgba(255,255,255,.25)"; desenharEstrela2D(c, w / 2 - 26 + k * 52, 120, 20, 8); }
    } else {
      c.font = `bold 46px ${FONTE}`; c.fillText("↩ Voltar ao átrio", w / 2, 96);
    }
    tb.t.needsUpdate = true;
  }

  /* ============================================================
     CICLO PRINCIPAL
     ============================================================ */
  function iniciar() {
    contentor = document.getElementById("mundo");
    if (!contentor) return;
    elPrompt = document.getElementById("promptInteragir");
    elEtiqueta = document.getElementById("etiquetaHover");
    elFade = document.getElementById("fadeSala");
    try {
      renderer = new T.WebGLRenderer({ antialias: !TELEMOVEL || devicePixelRatio < 2, powerPreference: "high-performance" });
    } catch (e) { renderer = null; }
    if (!renderer || !renderer.getContext()) { semWebGL(); return; }
    ok = true;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, TELEMOVEL ? 1.6 : 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("aria-hidden", "true");
    contentor.appendChild(renderer.domElement);
    cena = new T.Scene();
    cena.background = new T.Color(0x06102e);
    cena.fog = new T.Fog(0x06102e, 26, 48);
    camara = new T.PerspectiveCamera(42, 1, .1, 120);
    relogio = new T.Clock();
    materiaisBase();
    jog.grupo = criarAvatar(); cena.add(jog.grupo);
    marcaAlvo = new T.Mesh(new T.RingGeometry(.25, .36, 32), new T.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: .9, depthWrite: false }));
    marcaAlvo.rotation.x = -Math.PI / 2; marcaAlvo.position.y = .02; marcaAlvo.visible = false; cena.add(marcaAlvo);
    dimensionar();
    new ResizeObserver(dimensionar).observe(contentor);
    ligarEntrada();
    entrarSala("atrio", D.SALAS.atrio.inicio);
    renderer.setAnimationLoop(ciclo);
  }
  function semWebGL() {
    contentor.classList.add("sem-3d");
    contentor.innerHTML = `<div class="aviso-sem-3d"><strong>Este dispositivo não consegue mostrar o mundo 3D.</strong><br>Podes jogar na mesma: usa a lista «Nesta sala» para investigar objetos, abrir estações e mudar de sala.</div>`;
    document.body.classList.add("modo-sem-3d");
  }
  function dimensionar() {
    if (!renderer) return;
    const w = contentor.clientWidth || 800, h = contentor.clientHeight || 500;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // em ecrãs estreitos a câmara afasta-se para ver a sala toda
    camara.fov = w / h < 1 ? 55 : 42;
    camara.updateProjectionMatrix();
  }

  function entrarSala(id, pos) {
    salaId = id;
    if (!ok) return;
    if (salaAtual) cena.remove(salaAtual.grupo);
    if (!cache[id]) cache[id] = construirSala(id);
    salaAtual = cache[id];
    cena.add(salaAtual.grupo);
    jog.x = toX(pos.x); jog.z = toZ(pos.y);
    jog.dir = Math.PI; alvo = null; particulas.forEach(p => cena.remove(p.s)); particulas = [];
    teclas.clear(); hover = null; proximo = null; marcaAlvo.visible = false;
    yaw = yawAlvo = 0;
    atualizarAparencia();
    ajustarCamara(true);
    if (elFade) { elFade.classList.add("ativo"); setTimeout(() => elFade.classList.remove("ativo"), 60); }
  }

  function ajustarCamara(imediato) {
    const largura = contentor.clientWidth / Math.max(1, contentor.clientHeight);
    const estreito = largura < 1;
    const d = dist * (estreito ? .95 : 1);
    // segue o jogador, mas mantém a sala enquadrada (em ecrãs estreitos segue mais de perto)
    const fx = T.MathUtils.lerp(0, jog.x, estreito ? .92 : .6), fz = T.MathUtils.lerp(-.6, jog.z, estreito ? .6 : .35);
    const alvoOlhar = new T.Vector3(fx, .6, fz - .8);
    const pos = new T.Vector3(fx + Math.sin(yaw) * d * .62, d * .9, fz + Math.cos(yaw) * d * .62);
    if (imediato) { camPos.copy(pos); camOlhar.copy(alvoOlhar); }
    else { camPos.lerp(pos, .08); camOlhar.lerp(alvoOlhar, .1); }
    camara.position.copy(camPos); camara.lookAt(camOlhar);
  }

  function colide(x, z) {
    if (x < LIM.x0 || x > LIM.x1 || z < LIM.z0 || z > LIM.z1) return true;
    return salaAtual.colisoes.some(a => x > a.x0 - RAIO && x < a.x1 + RAIO && z > a.z0 - RAIO && z < a.z1 + RAIO);
  }
  function distRet(x, z, a) {
    const dx = Math.max(a.x0 - x, 0, x - a.x1), dz = Math.max(a.z0 - z, 0, z - a.z1);
    return Math.hypot(dx, dz);
  }
  function pontoFrente(o) {
    const it = salaAtual.objetos[o.id]; const a = it.aabb;
    const cx = (a.x0 + a.x1) / 2, cz = (a.z0 + a.z1) / 2, m = RAIO + .25;
    const lim = (v, a0, a1) => Math.max(a0, Math.min(a1, v));
    let c = [{ x: cx, z: a.z1 + m }, { x: cx, z: a.z0 - m }, { x: a.x0 - m, z: cz }, { x: a.x1 + m, z: cz }]
      .map(p => ({ x: lim(p.x, LIM.x0 + RAIO, LIM.x1 - RAIO), z: lim(p.z, LIM.z0 + RAIO, LIM.z1 - RAIO) }));
    if (o.tipo === "porta" || o.tipo === "saida") c = [{ x: cx, z: o.y > 300 ? a.z0 + .2 : a.z1 - .2 }];
    const livres = c.filter(p => !colide(p.x, p.z));
    livres.sort((p, q) => Math.hypot(p.x - jog.x, p.z - jog.z) - Math.hypot(q.x - jog.x, q.z - jog.z));
    return livres[0] || c[0];
  }

  function moverPara(dx, dz, dt, vel) {
    const v = (vel || VEL) * dt;
    const nx = jog.x + dx * v, nz = jog.z + dz * v;
    let moveu = false;
    if (!colide(nx, nz)) { jog.x = nx; jog.z = nz; moveu = true; }
    else if (!colide(nx, jog.z)) { jog.x = nx; moveu = true; }
    else if (!colide(jog.x, nz)) { jog.z = nz; moveu = true; }
    if (dx || dz) jog.dirAlvo = Math.atan2(dx, dz);
    return moveu;
  }

  function ciclo() {
    const dt = Math.min(.05, relogio.getDelta()), t = relogio.elapsedTime;
    if (!salaAtual) return;
    const ativo = !window.App || window.App.jogoAtivo();
    // teclado (relativo à câmara)
    let ix = 0, iz = 0;
    if (ativo) {
      if (teclas.has("arrowleft") || teclas.has("a")) ix -= 1;
      if (teclas.has("arrowright") || teclas.has("d")) ix += 1;
      if (teclas.has("arrowup") || teclas.has("w")) iz -= 1;
      if (teclas.has("arrowdown") || teclas.has("s")) iz += 1;
    }
    jog.movendo = false;
    if (ix || iz) {
      alvo = null; marcaAlvo.visible = false;
      const l = Math.hypot(ix, iz); ix /= l; iz /= l;
      const c = Math.cos(yaw), s = Math.sin(yaw);
      jog.movendo = moverPara(ix * c + iz * s, -ix * s + iz * c, dt);
    } else if (alvo && ativo) {
      const dx = alvo.x - jog.x, dz = alvo.z - jog.z, d = Math.hypot(dx, dz);
      const passo = (alvo.vel || VEL) * dt;
      const perto = alvo.obj && salaAtual.objetos[alvo.obj.id] && distRet(jog.x, jog.z, salaAtual.objetos[alvo.obj.id].aabb) < ALCANCE * .8;
      if (d <= passo + .02 && !perto) { jog.x = alvo.x; jog.z = alvo.z; }
      if (d <= passo + .02 || perto) {
        const o = alvo.obj; alvo = null; marcaAlvo.visible = false;
        if (o) chegar(o);
      } else {
        const moveu = moverPara(dx / d, dz / d, dt, alvo.vel);
        jog.movendo = moveu;
        if (Math.abs(d - ultimaDist) < .004) presoT += dt; else presoT = 0;
        ultimaDist = d;
        if (presoT > .45) {
          presoT = 0; const o = alvo.obj; alvo = null; marcaAlvo.visible = false;
          if (o) { const p = pontoFrente(o); jog.x = p.x; jog.z = p.z; chegar(o); }
        }
      }
    }
    // orientação e animação do avatar
    if (jog.dirAlvo !== undefined) {
      let dd = jog.dirAlvo - jog.dir; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2;
      jog.dir += dd * Math.min(1, dt * 12);
    }
    jog.grupo.position.set(jog.x, 0, jog.z); jog.grupo.rotation.y = jog.dir;
    const P = jog.partes;
    if (jog.movendo) jog.fase += dt * 10; else jog.fase *= .85;
    const sw = Math.sin(jog.fase) * (jog.movendo ? .6 : 0);
    P.pernas[0].rotation.x = sw; P.pernas[1].rotation.x = -sw;
    P.bracos[0].rotation.x = -sw * .8; P.bracos[1].rotation.x = sw * .8;
    P.tronco.position.y = .95 + Math.abs(Math.sin(jog.fase)) * (jog.movendo ? .05 : 0) + (jog.movendo ? 0 : Math.sin(t * 2) * .008);
    if (marcaAlvo.visible) { const k = 1 + Math.sin(t * 6) * .12; marcaAlvo.scale.set(k, k, k); }

    // objeto mais próximo
    let melhor = null, md = ALCANCE;
    Object.values(salaAtual.objetos).forEach(it => {
      const d = distRet(jog.x, jog.z, it.aabb);
      if (d < md) { md = d; melhor = it.o; }
    });
    if (melhor !== proximo) { proximo = melhor; atualizarPrompt(); }

    // animações dos objetos
    Object.values(salaAtual.objetos).forEach(it => {
      const u = it.g.userData;
      if (it.marc) {
        const tp = it.marc.userData.tipo;
        it.marc.position.y = it.base + (tp === "nova" || tp === "disponivel" ? Math.sin(t * 3 + it.aabb.x0) * .1 : 0);
        it.marc.material.opacity = (proximo === it.o || hover === it.o.id) ? 1 : (tp === "vista" ? .75 : .95);
      }
      if (u.estacao) { u.estacao.est.rotation.y = t * 1.2; u.estacao.est.position.y = 1.75 + Math.sin(t * 2) * .06; }
      if (u.rodar) { if (u.eixo === "y") u.rodar.rotation.z = Math.sin(t * .6) * .6; else u.rodar.rotation.y = t * .5; }
      if (u.rotor) u.rotor.rotation.z = t * 2.5;
      if (u.notas) u.notas.forEach((n, i) => { const f = (t * .4 + i / 3) % 1; n.position.set(-.1 + Math.sin(f * 6 + i) * .2, 1.0 + f * 1.1, 0); n.material.opacity = Math.sin(f * Math.PI); });
      if (u.pedestal) {
        const geo = u.pedestal.ban.geometry, pos = geo.attributes.position, b = geo.userData.base;
        for (let i = 0; i < pos.count; i++) { const x = b[i * 3]; pos.array[i * 3 + 2] = Math.sin(x * 3 - t * 3) * .08 * x; }
        pos.needsUpdate = true; geo.computeVertexNormals();
        u.pedestal.estrelas.forEach((s, k) => { s.rotation.y += dt * (s.material.metalness > .5 ? 1.5 : .2); });
      }
    });
    salaAtual.anim.forEach(f => f(t));
    (salaAtual.fadeSul || []).forEach(f => {
      const alvoOp = distRet(jog.x, jog.z, f.aabb) < 1.6 ? 1 : .1;
      f.op += (alvoOp - f.op) * .12;
      f.mats.forEach(m => { m.opacity = f.op; m.depthWrite = f.op > .9; });
    });

    // partículas
    particulas = particulas.filter(p => {
      p.v -= dt; if (p.v <= 0) { cena.remove(p.s); return false; }
      p.vy -= 6 * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      p.s.material.opacity = Math.min(1, p.v); p.s.material.rotation += dt * 4;
      return true;
    });

    // câmara
    yaw += (yawAlvo - yaw) * .12;
    ajustarCamara(false);
    // paredes entre a câmara e a sala ficam transparentes
    salaAtual.paredes.forEach(p => {
      const fora = p.n[0] ? (p.n[0] > 0 ? camara.position.x < p.x : camara.position.x > p.x) : (p.n[1] > 0 ? camara.position.z < p.z : camara.position.z > p.z);
      const op = fora && p.lado !== "n" ? .14 : 1;
      p.m.material.opacity += (op - p.m.material.opacity) * .15;
      p.m.material.depthWrite = p.m.material.opacity > .9;
      p.m.castShadow = p.lado !== "s";
    });
    renderer.render(cena, camara);
    posicionarEtiquetas();
  }

  function chegar(o) {
    // vira-se para o objeto e interage
    const a = salaAtual.objetos[o.id].aabb;
    jog.dirAlvo = Math.atan2((a.x0 + a.x1) / 2 - jog.x, (a.z0 + a.z1) / 2 - jog.z);
    if (window.App) window.App.interagir(o);
  }

  /* ---------- prompt de interação e etiquetas ---------- */
  function textoAcao(o) {
    const e = window.App ? window.App.estadoObjeto(o) : "";
    switch (o.tipo) {
      case "pista": return e === "vista" ? "Reler" : "Investigar";
      case "desafio": return e === "feito" ? "Treinar outra vez" : e === "bloqueado" ? "Ver o que falta" : "Abrir o desafio";
      case "porta": return "Entrar";
      case "saida": return "Voltar ao átrio";
      case "pedestal": return "Colocar as estrelas";
    }
    return "Usar";
  }
  function atualizarPrompt() {
    if (!elPrompt) return;
    if (!proximo) { elPrompt.hidden = true; return; }
    elPrompt.hidden = false;
    elPrompt.querySelector(".acao").textContent = textoAcao(proximo);
    elPrompt.querySelector(".nome").textContent = proximo.rotulo;
  }
  const v3 = new T.Vector3();
  function posicionarEtiquetas() {
    if (!elEtiqueta) return;
    const id = hover || (proximo && proximo.id);
    const it = id && salaAtual.objetos[id];
    if (!it || !window.App || !window.App.jogoAtivo()) { elEtiqueta.hidden = true; return; }
    v3.set((it.aabb.x0 + it.aabb.x1) / 2, it.alt + (it.marc ? .9 : .4), (it.aabb.z0 + it.aabb.z1) / 2).project(camara);
    const r = contentor.getBoundingClientRect();
    elEtiqueta.hidden = false;
    elEtiqueta.style.transform = `translate(${(v3.x + 1) / 2 * r.width}px, ${(1 - v3.y) / 2 * r.height}px) translate(-50%, -100%)`;
    const txt = it.o.rotulo + (window.App ? " · " + window.App.descricaoEstado(it.o) : "");
    if (elEtiqueta.textContent !== txt) elEtiqueta.textContent = txt;
  }

  /* ---------- entrada: rato, toque, teclado ---------- */
  function ligarEntrada() {
    const el = renderer.domElement;
    let baixo = null, arrastou = false;
    const toques = new Map(); let pinch = null;
    el.addEventListener("pointerdown", e => {
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (toques.size === 2) { const [a, b] = [...toques.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist }; }
      baixo = { x: e.clientX, y: e.clientY, yaw: yawAlvo }; arrastou = false;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", e => {
      if (toques.has(e.pointerId)) toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && toques.size === 2) {
        const [a, b] = [...toques.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        dist = T.MathUtils.clamp(pinch.dist * pinch.d / d, 8, 19); arrastou = true; return;
      }
      if (baixo) {
        const dx = e.clientX - baixo.x;
        if (Math.abs(dx) > 6 || Math.abs(e.clientY - baixo.y) > 6) arrastou = true;
        if (arrastou) yawAlvo = T.MathUtils.clamp(baixo.yaw - dx * .005, -.85, .85);
        return;
      }
      if (e.pointerType === "mouse") {
        const h = escolher(e);
        hover = h && h.id ? h.id : null;
        el.style.cursor = hover ? "pointer" : "default";
      }
    });
    const fim = e => {
      toques.delete(e.pointerId);
      if (toques.size < 2) pinch = null;
      if (!baixo) return;
      const b = baixo; baixo = null;
      if (arrastou || !(!window.App || window.App.jogoAtivo())) return;
      const h = escolher(e);
      if (!h) return;
      if (h.id) {
        const it = salaAtual.objetos[h.id];
        if (distRet(jog.x, jog.z, it.aabb) < ALCANCE) { alvo = null; chegar(it.o); }
        else { const p = pontoFrente(it.o); alvo = { x: p.x, z: p.z, obj: it.o }; marcaAlvo.visible = false; presoT = 0; }
        if (window.Som) window.Som.efeito("clique");
      } else if (h.ponto) {
        alvo = { x: T.MathUtils.clamp(h.ponto.x, LIM.x0, LIM.x1), z: T.MathUtils.clamp(h.ponto.z, LIM.z0, LIM.z1), obj: null };
        marcaAlvo.position.set(alvo.x, .02, alvo.z); marcaAlvo.visible = true; presoT = 0;
      }
    };
    el.addEventListener("pointerup", fim);
    el.addEventListener("pointercancel", e => { toques.delete(e.pointerId); baixo = null; pinch = null; });
    el.addEventListener("pointerleave", () => { hover = null; });
    el.addEventListener("wheel", e => { e.preventDefault(); dist = T.MathUtils.clamp(dist + Math.sign(e.deltaY) * .9, 8, 19); }, { passive: false });
    window.addEventListener("keydown", e => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (window.App && !window.App.jogoAtivo()) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        if (tag === "button" && k.startsWith("arrow") && e.target.closest(".painel-sala, .menu-jogo, .mini-mapa")) return;
        e.preventDefault(); teclas.add(k);
      } else if ((k === "e" || ((k === "enter" || k === " ") && (tag === "body" || e.target === contentor || e.target === el)))) {
        e.preventDefault(); Mundo.interagirProximo();
      } else if (k === "q") { yawAlvo = T.MathUtils.clamp(yawAlvo + .3, -.85, .85); }
      else if (k === "r") { yawAlvo = T.MathUtils.clamp(yawAlvo - .3, -.85, .85); }
      else if (k === "+" || k === "=") dist = Math.max(8, dist - 1);
      else if (k === "-") dist = Math.min(19, dist + 1);
    });
    window.addEventListener("keyup", e => teclas.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => teclas.clear());
  }
  function escolher(e) {
    const r = renderer.domElement.getBoundingClientRect();
    rato.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(rato, camara);
    const marcs = Object.values(salaAtual.objetos).filter(i => i.marc).map(i => i.marc);
    const hm = ray.intersectObjects(marcs, false)[0];
    if (hm) { const it = Object.values(salaAtual.objetos).find(i => i.marc === hm.object); return { id: it.o.id }; }
    const h = ray.intersectObjects(salaAtual.pick.concat([salaAtual.chao]), false)[0];
    if (!h) return null;
    if (h.object.userData.objId) return { id: h.object.userData.objId };
    if (h.object.userData.chao) return { ponto: h.point };
    return null;
  }

  /* ============================================================
     VISTA DE INSPEÇÃO (miniatura 3D do objeto na janela da pista)
     ============================================================ */
  let insp = null;
  function inspecionar(id, el) {
    pararInspecao();
    if (!ok || !el || !salaAtual || !salaAtual.objetos[id]) return false;
    const it = salaAtual.objetos[id];
    if (!insp) {
      try {
        const r = new T.WebGLRenderer({ antialias: true, alpha: true });
        r.toneMapping = T.ACESFilmicToneMapping; r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
        const sc = new T.Scene();
        sc.add(new T.HemisphereLight(0xffffff, 0x334477, 1.4));
        const dl = new T.DirectionalLight(0xffffff, 2.2); dl.position.set(3, 5, 4); sc.add(dl);
        insp = { r, sc, cam: new T.PerspectiveCamera(32, 1, .05, 50), obj: null, ativo: false };
      } catch (e) { return false; }
    }
    const clone = it.g.clone(true);
    clone.position.set(0, 0, 0);
    const box = new T.Box3().setFromObject(clone);
    const c = box.getCenter(new T.Vector3()), tam = box.getSize(new T.Vector3());
    const piv = new T.Group(); clone.position.set(-c.x, -c.y, -c.z); piv.add(clone);
    insp.sc.add(piv); insp.obj = piv;
    const raio = Math.max(tam.x, tam.y, tam.z) * .62;
    insp.cam.position.set(0, raio * .55, raio * 2.6); insp.cam.lookAt(0, 0, 0);
    el.innerHTML = ""; el.appendChild(insp.r.domElement);
    const w = el.clientWidth || 300, h = el.clientHeight || 180;
    insp.r.setSize(w, h); insp.cam.aspect = w / h; insp.cam.updateProjectionMatrix();
    insp.ativo = true;
    const t0 = performance.now();
    const passo = () => {
      if (!insp || !insp.ativo) return;
      piv.rotation.y = -.5 + (performance.now() - t0) / 2200;
      insp.r.render(insp.sc, insp.cam);
      requestAnimationFrame(passo);
    };
    passo();
    return true;
  }
  function pararInspecao() {
    if (!insp) return;
    insp.ativo = false;
    if (insp.obj) { insp.sc.remove(insp.obj); insp.obj = null; }
  }

  /* ============================================================
     API usada pela App
     ============================================================ */
  window.Mundo = {
    get ativo() { return ok; },
    entrarSala(id, pos) { entrarSala(id, pos); },
    posicionarJunto(o) {
      if (!ok || !salaAtual || !salaAtual.objetos[o.id]) return;
      const p = pontoFrente(o); jog.x = p.x; jog.z = p.z; alvo = null; marcaAlvo.visible = false;
      const a = salaAtual.objetos[o.id].aabb;
      jog.dirAlvo = Math.atan2((a.x0 + a.x1) / 2 - jog.x, (a.z0 + a.z1) / 2 - jog.z);
    },
    irPara(o) {
      // caminha depressa até ao objeto e interage ao chegar
      if (!ok || !salaAtual || !salaAtual.objetos[o.id]) { if (window.App) window.App.interagir(o); return; }
      const it = salaAtual.objetos[o.id];
      if (distRet(jog.x, jog.z, it.aabb) < ALCANCE) { chegar(o); return; }
      const p = pontoFrente(o); alvo = { x: p.x, z: p.z, obj: o, vel: VEL * 2.2 }; presoT = 0;
    },
    interagirProximo() {
      if (proximo) chegar(proximo);
      else if (window.App) window.App.toast("Aproxima-te de um objeto para o investigar.", "info");
    },
    atualizar: atualizarAparencia,
    aviso(txt) { if (window.App) window.App.toast(txt, "aviso"); },
    brilho(id) {
      if (!ok || !salaAtual || !salaAtual.objetos[id]) return;
      const it = salaAtual.objetos[id];
      explosao(new T.Vector3((it.aabb.x0 + it.aabb.x1) / 2, it.alt, (it.aabb.z0 + it.aabb.z1) / 2), 14, 0x7fd3ff);
    },
    celebrar() { if (ok) explosao(new T.Vector3(jog.x, 1.6, jog.z), 46, 0xffcc00); },
    inspecionar, pararInspecao,
    rodar(d) { yawAlvo = T.MathUtils.clamp(yawAlvo + d, -.85, .85); },
    zoom(d) { dist = T.MathUtils.clamp(dist + d, 8, 19); },
    centrar() { yawAlvo = 0; dist = 17; }
  };
  let texEstrela = null;
  function explosao(pos, n, cor) {
    if (!texEstrela) texEstrela = tex(64, 64, c => { c.fillStyle = "#fff"; desenharEstrela2D(c, 32, 32, 30, 12); });
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: texEstrela, color: cor, transparent: true, depthWrite: false }));
      const k = .12 + Math.random() * .16; s.scale.set(k, k, k); s.position.copy(pos);
      cena.add(s);
      particulas.push({ s, vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 4, vz: (Math.random() - .5) * 4, v: 1.2 + Math.random() * .8 });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();

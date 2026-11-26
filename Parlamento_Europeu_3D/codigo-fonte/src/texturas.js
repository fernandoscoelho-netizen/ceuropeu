// Texturas procedimentais (desenhadas em canvas; sem imagens externas).
import * as THREE from 'three';

function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function fazTextura(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Madeira clara em ripas verticais (revestimento das paredes e do teto)
export function madeiraRipas(base = [196, 152, 98], ripas = 16) {
  const W = 512, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = rnd(7);
  const lw = W / ripas;
  for (let i = 0; i < ripas; i++) {
    const v = (r() - 0.5) * 26;
    g.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.85},${base[2] + v * 0.7})`;
    g.fillRect(i * lw, 0, lw, H);
    // veios
    for (let k = 0; k < 22; k++) {
      const x = i * lw + r() * lw;
      g.strokeStyle = `rgba(90,55,25,${0.05 + r() * 0.12})`;
      g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= H; y += 32) g.lineTo(x + Math.sin(y * 0.02 + k) * 2.2 * r(), y);
      g.stroke();
    }
    // junta escura entre ripas
    g.fillStyle = 'rgba(40,22,8,.28)'; g.fillRect(i * lw + lw - 4, 0, 4, H);
    g.fillStyle = 'rgba(255,240,210,.18)'; g.fillRect(i * lw, 0, 2, H);
  }
  return fazTextura(c);
}

// Madeira lisa (tampos das bancadas)
export function madeiraLisa(base = [205, 165, 112]) {
  const W = 512, H = 256, c = canvas(W, H), g = c.getContext('2d'), r = rnd(11);
  g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 140; k++) {
    const y = r() * H;
    g.strokeStyle = `rgba(110,70,30,${0.04 + r() * 0.1})`;
    g.lineWidth = 0.5 + r() * 2;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= W; x += 24) g.lineTo(x, y + Math.sin(x * 0.015 + k) * 3);
    g.stroke();
  }
  return fazTextura(c);
}

// Alcatifa azul com ruído fino
export function alcatifa(base = [28, 52, 120], escala = 1) {
  const W = 256, H = 256, c = canvas(W, H), g = c.getContext('2d'), r = rnd(3);
  const img = g.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const n = (r() - 0.5) * 9;
    img.data[i * 4] = base[0] + n * 0.6; img.data[i * 4 + 1] = base[1] + n * 0.8; img.data[i * 4 + 2] = base[2] + n; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return fazTextura(c, escala, escala);
}

// Tecido (estofo dos lugares): textura neutra que recebe a cor de cada lugar
export function tecido() {
  const W = 128, H = 128, c = canvas(W, H), g = c.getContext('2d'), r = rnd(5);
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const trama = ((x % 8 < 4) ^ (y % 8 < 4)) ? 3 : -3;
    const v = 225 + trama + (r() - 0.5) * 20;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return fazTextura(c, 3, 3);
}

// Bandeira / emblema da UE: 12 estrelas douradas em círculo sobre azul
export function bandeiraUE(w = 768, h = 512) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#003399'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#FFCC00';
  const R = h / 3, cx = w / 2, cy = h / 2, re = h / 18;
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    estrela(g, cx + R * Math.sin(a), cy - R * Math.cos(a), re);
  }
  return fazTextura(c);
}

export function estrela(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.382 : r;
    g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  g.closePath(); g.fill();
}

// Ecrã com a composição do Parlamento (desenhado a partir dos dados oficiais)
export function ecraComposicao(grupos, ordem, total, data) {
  const W = 1024, H = 576, c = canvas(W, H), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0a1f5c'); gr.addColorStop(1, '#06123a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#FFCC00'; g.fillRect(0, 0, W, 10);
  g.fillStyle = '#fff'; g.font = 'bold 40px system-ui, Arial'; g.textAlign = 'left';
  g.fillText('Parlamento Europeu', 40, 70);
  g.font = '26px system-ui, Arial'; g.fillStyle = '#cdd8ff';
  g.fillText(`${total} deputados · composição a ${data}`, 40, 110);
  // mini-hemiciclo
  const cx = 300, cy = 500, filas = 9;
  const pontos = [];
  for (let f = 0; f < filas; f++) {
    const rr = 120 + f * 26, n = Math.round(Math.PI * rr / 27);
    for (let i = 0; i < n; i++) { const a = Math.PI - (i + 0.5) * Math.PI / n; pontos.push([cx + rr * Math.cos(a), cy - rr * Math.sin(a), a]); }
  }
  pontos.sort((p, q) => q[2] - p[2]);
  let idx = 0; const N = pontos.length;
  for (const k of ordem) {
    const m = Math.round(grupos[k].n / total * N);
    g.fillStyle = grupos[k].cor;
    for (let i = 0; i < m && idx < N; i++, idx++) { g.beginPath(); g.arc(pontos[idx][0], pontos[idx][1], 9.5, 0, Math.PI * 2); g.fill(); }
  }
  // lista
  g.font = 'bold 28px system-ui, Arial';
  ordem.forEach((k, i) => {
    const y = 175 + i * 42;
    g.fillStyle = grupos[k].cor; g.fillRect(640, y - 22, 26, 26);
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(grupos[k].sig, 680, y);
    g.textAlign = 'right'; g.fillText(String(grupos[k].n), 980, y);
  });
  return fazTextura(c);
}

// Modelação 3D do hemiciclo de Estrasburgo (todos os modelos são gerados por código).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './texturas.js';

// Escala: unidades da planta oficial -> metros (aproximação)
export const S = 0.055;
export const CX = 460, CY = 500;          // centro dos arcos da planta oficial
export const R0 = 95, DR = 30.8;          // raio da 1.ª fila e distância entre filas (unidades da planta)
export const ALT = k => 0.12 + 0.42 * k;  // altura do degrau da fila k (m)
export const Z_PAREDE = 11.2;             // parede da Presidência
export const R_PAREDE = 28.7, R_GALERIA = 33.6, Y_GALERIA = 7.3, Y_TETO = 19.5;

const DEG = Math.PI / 180;

export function polar(rPlanta, aGraus) {
  return new THREE.Vector3(rPlanta * S * Math.cos(aGraus * DEG), 0, -rPlanta * S * Math.sin(aGraus * DEG));
}

// Prisma em setor anelar (degraus, galerias)
function setorPrisma(r0, r1, a0, a1, y0, y1, seg, traseira = true) {
  const pos = [], uv = [], idx = [];
  const ponto = (r, a, y) => [r * Math.cos(a * DEG), y, -r * Math.sin(a * DEG)];
  const quad = (p0, p1, p2, p3, u0, u1, v0, v1) => {
    const b = pos.length / 3;
    pos.push(...p0, ...p1, ...p2, ...p3);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  for (let i = 0; i < seg; i++) {
    const aa = a0 + (a1 - a0) * i / seg, ab = a0 + (a1 - a0) * (i + 1) / seg;
    const ua = r1 * aa * DEG, ub = r1 * ab * DEG;
    // topo
    quad(ponto(r0, ab, y1), ponto(r0, aa, y1), ponto(r1, aa, y1), ponto(r1, ab, y1), ub, ua, 0, r1 - r0);
    // espelho (frente, virado para o centro)
    quad(ponto(r0, ab, y0), ponto(r0, aa, y0), ponto(r0, aa, y1), ponto(r0, ab, y1), ub, ua, y0, y1);
    // traseira (omitida nos degraus: evita faces coincidentes que cintilam)
    if (traseira) quad(ponto(r1, aa, y0), ponto(r1, ab, y0), ponto(r1, ab, y1), ponto(r1, aa, y1), ua, ub, y0, y1);
  }
  // topos laterais
  const lado = (a, inv) => {
    const p = [ponto(r0, a, y0), ponto(r1, a, y0), ponto(r1, a, y1), ponto(r0, a, y1)];
    if (inv) quad(p[1], p[0], p[3], p[2], 0, r1 - r0, y0, y1); else quad(p[0], p[1], p[2], p[3], 0, r1 - r0, y0, y1);
  };
  lado(a0, false); lado(a1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function caixa(w, h, d, x = 0, y = 0, z = 0, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z); return g;
}
function caixaR(w, h, d, r, x = 0, y = 0, z = 0, rx = 0) {
  const g = new RoundedBoxGeometry(w, h, d, 1, r);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z); return g;
}
function cil(r0, r1, h, x = 0, y = 0, z = 0, seg = 12, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(r0, r1, h, seg);
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz);
  g.translate(x, y, z); return g;
}
// remove atributos não partilhados para permitir a fusão
function limpa(g) { const n = g.toNonIndexed ? g : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n.index ? n.toNonIndexed() : n; }
function funde(lista) { return mergeGeometries(lista.map(limpa)); }

// ---------------- Modelos de um lugar (no referencial local: +Z aponta para a Presidência) ----------------
function modelosLugar() {
  // estofo: assento + encosto alto (arestas arredondadas)
  const estofo = funde([
    caixaR(0.5, 0.1, 0.48, 0.04, 0, 0.47, -0.30),
    caixaR(0.5, 0.66, 0.1, 0.045, 0, 0.86, -0.56, -0.16),
  ]);
  // estrutura metálica da cadeira: coluna, base, braços (geometria simples)
  const estrutura = funde([
    cil(0.035, 0.035, 0.36, 0, 0.24, -0.32, 6),
    cil(0.26, 0.26, 0.025, 0, 0.02, -0.32, 5),
    caixa(0.05, 0.05, 0.34, -0.27, 0.66, -0.3),
    caixa(0.05, 0.05, 0.34, 0.27, 0.66, -0.3),
    caixa(0.03, 0.18, 0.03, -0.27, 0.56, -0.38),
    caixa(0.03, 0.18, 0.03, 0.27, 0.56, -0.38),
    caixa(0.44, 0.04, 0.04, 0, 0.42, -0.3),
  ]);
  const tampo = funde([caixa(0.84, 0.045, 0.5, 0, 0.76, 0.2, 0.06)]);
  const frente = funde([caixa(0.84, 1.0, 0.05, 0, 0.26, 0.46)]);
  const equip = funde([
    caixa(0.22, 0.03, 0.12, 0.18, 0.795, 0.12, 0.06),
    cil(0.012, 0.012, 0.42, 0.0, 0.98, 0.2, 4, -0.55),
    cil(0.022, 0.03, 0.07, 0.0, 1.19, 0.08, 6, -0.55),
    caixa(0.12, 0.03, 0.08, -0.22, 0.795, 0.12, 0.06),
  ]);
  const luz = cil(0.024, 0.024, 0.012, 0.0, 1.225, 0.06, 6, -0.55);
  const alvo = caixa(0.84, 1.3, 1.25, 0, 0.6, -0.05);
  return { estofo, estrutura, tampo, frente, equip, luz, alvo };
}

export function construirHemiciclo(scene, lugares, prog = () => {}, alta = true) {
  const T = {
    ripas: TX.madeiraRipas(),
    ripasEsc: TX.madeiraRipas([150, 108, 64], 10),
    lisa: TX.madeiraLisa(),
    alcatifa: TX.alcatifa([26, 50, 118], 6),
    alcatifaDeg: TX.alcatifa([22, 42, 100], 1),
    tecido: TX.tecido(),
    bandeira: TX.bandeiraUE(),
  };
  T.alcatifaDeg.repeat.set(0.8, 0.8);
  const M = {
    madeira: new THREE.MeshStandardMaterial({ map: T.ripas, roughness: 0.62, metalness: 0.02 }),
    madeiraEsc: new THREE.MeshStandardMaterial({ map: T.ripasEsc, roughness: 0.6 }),
    tampo: new THREE.MeshStandardMaterial({ map: T.lisa, roughness: 0.38, metalness: 0.0 }),
    alcatifa: new THREE.MeshStandardMaterial({ map: T.alcatifa, roughness: 0.95 }),
    degrau: new THREE.MeshStandardMaterial({ map: T.alcatifaDeg, roughness: 0.95 }),
    estofo: new THREE.MeshStandardMaterial({ map: T.tecido, roughness: 0.85, color: 0xffffff }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.35, metalness: 0.8 }),
    cromado: new THREE.MeshStandardMaterial({ color: 0xc9ced8, roughness: 0.18, metalness: 1.0 }),
    equip: new THREE.MeshStandardMaterial({ color: 0x1b1e25, roughness: 0.4, metalness: 0.5 }),
    luz: new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a2a, emissiveIntensity: 0.0 }),
    vidro: new THREE.MeshPhysicalMaterial({ color: 0xbfd8ff, roughness: 0.05, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.28 }),
    cabine: new THREE.MeshStandardMaterial({ color: 0xfff2d6, emissive: 0xffe2a8, emissiveIntensity: 0.55, roughness: 0.6 }),
    branco: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }),
    escuro: new THREE.MeshStandardMaterial({ color: 0x15192a, roughness: 0.5 }),
  };

  const raiz = new THREE.Group(); scene.add(raiz);

  // ---------- chão central ----------
  const chao = new THREE.Mesh(new THREE.CircleGeometry(60, 96), M.alcatifa);
  chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; raiz.add(chao);
  // círculo decorativo no centro
  const anel = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.45, 96), new THREE.MeshStandardMaterial({ color: 0xc9a64a, roughness: 0.5, metalness: 0.5 }));
  anel.rotation.x = -Math.PI / 2; anel.position.set(0, 0.03, 0.8); raiz.add(anel);

  // ---------- degraus (um setor por fila, a partir das posições oficiais) ----------
  const filas = new Map();
  for (const l of lugares) {
    if (!filas.has(l.fila)) filas.set(l.fila, { min: 999, max: -999 });
    const f = filas.get(l.fila); f.min = Math.min(f.min, l.ang); f.max = Math.max(f.max, l.ang);
  }
  const degraus = [];
  for (const [k, f] of filas) {
    const r = (R0 + DR * k) * S, d = DR * S;
    const pad = 1.0 / r / DEG; // ~1 m de margem
    degraus.push(setorPrisma(r - d / 2, r + d / 2, f.min - pad - k * 0.013, f.max + pad + k * 0.013, 0, ALT(k), Math.ceil((f.max - f.min) / 3), false));
  }
  const mDeg = new THREE.Mesh(mergeGeometries(degraus), M.degrau);
  mDeg.receiveShadow = true; mDeg.castShadow = false; raiz.add(mDeg);
  // corrimão de remate na fila mais alta
  const kMax = Math.max(...filas.keys()), fMax = filas.get(kMax);
  const rTopo = (R0 + DR * kMax) * S + DR * S / 2;
  const muro = new THREE.Mesh(setorPrisma(rTopo, rTopo + 0.18, fMax.min - 3, fMax.max + 3, ALT(kMax), ALT(kMax) + 1.0, 80), M.madeiraEsc);
  muro.castShadow = true; raiz.add(muro);
  prog(0.35);

  // ---------- lugares (InstancedMesh) ----------
  const mod = modelosLugar();
  const n = lugares.length;
  const mk = (geo, mat, sombra = true) => {
    const im = new THREE.InstancedMesh(geo, mat, n);
    im.castShadow = false; im.receiveShadow = alta; raiz.add(im); return im;
  };
  const I = {
    estofo: mk(mod.estofo, M.estofo),
    estrutura: mk(mod.estrutura, M.metal),
    tampo: mk(mod.tampo, M.tampo),
    frente: mk(mod.frente, M.madeiraEsc),
    equip: mk(mod.equip, M.equip, false),
    luz: mk(mod.luz, new THREE.MeshBasicMaterial({ color: 0x5a1010 }), false),
    alvo: mk(mod.alvo, new THREE.MeshBasicMaterial({ visible: false }), false),
  };
  I.luz.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(0.35), 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), um = new THREE.Vector3(1, 1, 1);
  const foco = new THREE.Vector3(0, 0, 1.2);
  lugares.forEach((l, i) => {
    const p = new THREE.Vector3(l.X, ALT(l.fila), l.Z);
    l.pos = p;
    const rot = Math.atan2(foco.x - p.x, foco.z - p.z);
    l.rot = rot;
    e.set(0, rot, 0); q.setFromEuler(e); m4.compose(p, q, um);
    for (const k in I) I[k].setMatrixAt(i, m4);
    I.estofo.setColorAt(i, new THREE.Color(0x2f4fa8));
  });
  for (const k in I) { I[k].instanceMatrix.needsUpdate = true; I[k].computeBoundingSphere(); }
  I.estofo.instanceColor.needsUpdate = true;
  prog(0.55);

  // marcadores flutuantes (destaques)
  const marc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < n; i++) { marc.setMatrixAt(i, zero); marc.setColorAt(i, new THREE.Color(1, 1, 1)); }
  marc.count = 0;
  marc.frustumCulled = false; raiz.add(marc);
  const hastes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), n);
  for (let i = 0; i < n; i++) hastes.setMatrixAt(i, zero);
  hastes.count = 0;
  hastes.frustumCulled = false; raiz.add(hastes);

  // ---------- Presidência ----------
  const pres = new THREE.Group(); raiz.add(pres);
  const zP = 8.9;
  // estrado principal em dois níveis
  const estrado1 = new THREE.Mesh(caixaR(11, 0.6, 4.6, 0.05, 0, 0.3, zP - 0.2), M.madeiraEsc);
  const estrado2 = new THREE.Mesh(caixaR(8.4, 0.75, 2.2, 0.05, 0, 0.6 + 0.375, zP + 1.0), M.madeiraEsc);
  // mesa da Presidência (curva, em madeira clara com frente em ripas)
  const mesa = new THREE.Mesh(setorPrisma(9.2, 9.7, 72, 108, 1.35, 2.45, 24), M.madeira);
  mesa.position.z = zP + 10.2; // centro do arco atrás do estrado
  const tampoMesa = new THREE.Mesh(setorPrisma(9.15, 10.2, 72, 108, 2.45, 2.52, 24), M.tampo);
  tampoMesa.position.z = zP + 10.2;
  pres.add(estrado1, estrado2, mesa, tampoMesa);
  // cadeiras da Presidência: Presidente ao centro (encosto mais alto) e serviços de sessão
  const cadeiraP = (x, alto) => {
    const g = new THREE.Group();
    const est = new THREE.Mesh(funde([caixaR(0.6, 0.12, 0.56, 0.05, 0, 0.52, 0), caixaR(0.62, alto, 0.12, 0.05, 0, 0.55 + alto / 2, 0.3, 0.12)]), new THREE.MeshStandardMaterial({ map: T.tecido, color: 0x203a8a, roughness: 0.8 }));
    const base = new THREE.Mesh(funde([cil(0.04, 0.04, 0.42, 0, 0.24, 0), cil(0.3, 0.3, 0.03, 0, 0.02, 0, 5)]), M.metal);
    est.castShadow = true; g.add(est, base);
    g.position.set(x, 1.35, zP + 1.55); g.rotation.y = Math.PI;
    return g;
  };
  pres.add(cadeiraP(0, 1.05));
  [-2.4, -1.2, 1.2, 2.4].forEach(x => pres.add(cadeiraP(x, 0.7)));
  // mesa dos serviços de sessão (nível inferior, à frente)
  const mesaS = new THREE.Mesh(setorPrisma(9.2, 9.6, 67, 113, 0, 1.45, 24), M.madeira); mesaS.position.z = zP + 8;
  const tampoS = new THREE.Mesh(setorPrisma(9.15, 9.95, 67, 113, 1.45, 1.51, 24), M.tampo); tampoS.position.z = zP + 8;
  pres.add(mesaS, tampoS);
  [-3.4, -2.1, -0.8, 0.8, 2.1, 3.4].forEach(x => { const c = cadeiraP(x, 0.6); c.position.y = 0.6; c.position.z = zP + 8 - Math.sqrt(8.65 ** 2 - x * x); pres.add(c); });
  // microfones da Presidência
  for (const x of [0, -2.4, -1.2, 1.2, 2.4]) { const mic = new THREE.Mesh(funde([cil(0.012, 0.012, 0.45, 0, 0.2, 0, 8, 0.5), cil(0.024, 0.03, 0.07, 0, 0.4, -0.1, 10, 0.5)]), M.equip); mic.position.set(x, 2.52, zP + 0.75); pres.add(mic); }
  // tribuna dos oradores
  const tribuna = new THREE.Group();
  tribuna.add(new THREE.Mesh(caixaR(1.3, 1.15, 0.75, 0.04, 0, 0.575, 0), M.madeira));
  tribuna.add(new THREE.Mesh(caixaR(1.45, 0.06, 0.85, 0.02, 0, 1.18, -0.05, -0.18), M.tampo));
  tribuna.add(new THREE.Mesh(funde([cil(0.012, 0.012, 0.4, -0.2, 1.36, -0.25, 8, -0.4), cil(0.012, 0.012, 0.4, 0.2, 1.36, -0.25, 8, -0.4)]), M.equip));
  tribuna.add(new THREE.Mesh(caixa(1.1, 0.02, 0.02, 0, 0.02, -0.4), M.cromado));
  tribuna.position.set(0, 0, 5.2); tribuna.traverse(o => { if (o.isMesh) o.castShadow = true; });
  pres.add(tribuna);
  pres.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  prog(0.65);

  // ---------- parede da Presidência ----------
  const L = 66, H = 32;
  const paredeP = new THREE.Mesh(new THREE.PlaneGeometry(L, H), M.madeira.clone());
  paredeP.material.map = T.ripas.clone(); paredeP.material.map.repeat.set(L / 4, H / 4); paredeP.material.map.needsUpdate = true;
  paredeP.rotation.y = Math.PI; paredeP.position.set(0, H / 2, Z_PAREDE); paredeP.receiveShadow = true; raiz.add(paredeP);
  // painel azul com o emblema de 12 estrelas
  const emb = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshStandardMaterial({ map: T.bandeira, roughness: 0.6, emissive: 0x111a44, emissiveIntensity: 0.25 }));
  emb.rotation.y = Math.PI; emb.position.set(0, 9.2, Z_PAREDE - 0.11); raiz.add(emb);
  const moldura = new THREE.Mesh(caixa(9.5, 6.5, 0.12, 0, 9.2, Z_PAREDE - 0.02), M.madeiraEsc); raiz.add(moldura);
  // mastro com a bandeira da UE
  const mastro = new THREE.Mesh(funde([cil(0.04, 0.04, 6, 0, 3, 0, 12), new THREE.SphereGeometry(0.09, 12, 8).translate(0, 6.05, 0)]), M.cromado);
  mastro.position.set(-5.0, 0.6, zP + 1.4); raiz.add(mastro);
  const bandGeo = new THREE.PlaneGeometry(2.1, 1.4, 20, 8);
  const pos = bandGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, Math.sin((x + 1.05) * 2.6) * 0.09 * (x + 1.05)); pos.setY(i, pos.getY(i) - (x + 1.05) * 0.12); }
  bandGeo.computeVertexNormals();
  const bandeira = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ map: T.bandeira, side: THREE.DoubleSide, roughness: 0.8 }));
  bandeira.position.set(-5.0 + 1.08, 0.6 + 5.1, zP + 1.4); bandeira.rotation.y = Math.PI; bandeira.castShadow = true; raiz.add(bandeira);

  // ecrãs gigantes
  const ecras = [];
  for (const sx of [-1, 1]) {
    const ecra = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    ecra.rotation.y = Math.PI; ecra.position.set(sx * 13.5, 8.6, Z_PAREDE - 0.13); raiz.add(ecra); ecras.push(ecra);
    raiz.add(new THREE.Mesh(caixa(10, 5.8, 0.15, sx * 13.5, 8.6, Z_PAREDE - 0.02), M.escuro));
  }

  // ---------- cabines de interpretação (24 línguas oficiais: 12 de cada lado) ----------
  const cabines = new THREE.Group(); raiz.add(cabines);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const fila = Math.floor(i / 6), col = i % 6;
      const x = sx * (20.5 + col * 1.75), y = 12.2 + fila * 2.3;
      const fundo = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.9), M.cabine);
      fundo.rotation.y = Math.PI; fundo.position.set(x, y, Z_PAREDE - 0.03);
      const vidro = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.25), M.vidro);
      vidro.rotation.y = Math.PI; vidro.position.set(x, y + 0.25, Z_PAREDE - 0.72);
      const caixilho = new THREE.Mesh(funde([caixa(1.7, 0.75, 0.75, x, y - 0.68, Z_PAREDE - 0.38), caixa(1.7, 0.12, 0.75, x, y + 0.93, Z_PAREDE - 0.38), caixa(0.08, 1.9, 0.75, x - 0.81, y, Z_PAREDE - 0.38), caixa(0.08, 1.9, 0.75, x + 0.81, y, Z_PAREDE - 0.38)]), M.madeiraEsc);
      // intérprete (silhueta simples)
      const pessoa = new THREE.Mesh(funde([new THREE.SphereGeometry(0.13, 12, 8).translate(0, 0.42, 0), caixaR(0.4, 0.45, 0.25, 0.08, 0, 0.08, 0)]), new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.7 }));
      pessoa.position.set(x + (col % 2 ? 0.25 : -0.25), y - 0.3, Z_PAREDE - 0.3);
      cabines.add(fundo, vidro, caixilho, pessoa);
    }
  }

  // ---------- paredes curvas, galeria do público e teto ----------
  const aIni = -Math.asin(Z_PAREDE / R_PAREDE) / DEG, aFim = 180 - aIni; // ângulo onde a parede encontra a parede da Presidência
  const cilParede = (r, y0, y1, a0, a1, mat) => {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, 128, 1, true, (a0 + 90) * DEG, (a1 - a0) * DEG);
    g.translate(0, (y0 + y1) / 2, 0);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
  };
  const matParede = M.madeira.clone(); matParede.side = THREE.BackSide;
  matParede.map = T.ripas.clone(); matParede.map.repeat.set(60, 2); matParede.map.needsUpdate = true;
  raiz.add(cilParede(R_PAREDE, 0, Y_GALERIA, aIni, aFim, matParede));
  const aIniG = -Math.asin(Z_PAREDE / R_GALERIA) / DEG, aFimG = 180 - aIniG;
  const matParede2 = matParede.clone(); matParede2.map = T.ripas.clone(); matParede2.map.repeat.set(70, 3); matParede2.map.needsUpdate = true;
  raiz.add(cilParede(R_GALERIA, Y_GALERIA, Y_TETO + 1, aIniG, aFimG, matParede2));
  // galeria: degraus com cadeiras para o público
  const galDeg = [];
  for (let k = 0; k < 4; k++) galDeg.push(setorPrisma(R_PAREDE + k * 1.2, R_GALERIA + 0.05, aIni + 2 + k * 0.02, aFim - 2 - k * 0.02, Y_GALERIA - 0.6 + k * 0.01, Y_GALERIA + k * 0.45, 80, false));
  const mGal = new THREE.Mesh(mergeGeometries(galDeg), M.degrau); mGal.receiveShadow = true; raiz.add(mGal);
  // laje/teto falso por baixo da galeria
  raiz.add(new THREE.Mesh(setorPrisma(R_PAREDE - 0.12, R_GALERIA, aIni, aFim, Y_GALERIA - 0.95, Y_GALERIA - 0.65, 80), M.madeiraEsc));
  // vidro da galeria
  const gv = new THREE.CylinderGeometry(R_PAREDE - 0.05, R_PAREDE - 0.05, 1.05, 128, 1, true, (aIni + 2 + 90) * DEG, (aFim - aIni - 4) * DEG);
  gv.translate(0, Y_GALERIA + 0.5, 0);
  raiz.add(new THREE.Mesh(gv, new THREE.MeshPhysicalMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide })));
  const corrimao = new THREE.Mesh(new THREE.TorusGeometry(R_PAREDE - 0.05, 0.035, 8, 200, (aFim - aIni - 4) * DEG), M.cromado);
  corrimao.rotation.x = -Math.PI / 2; corrimao.rotation.z = (aIni + 2) * DEG; corrimao.position.y = Y_GALERIA + 1.05; raiz.add(corrimao);
  // cadeiras do público
  const cadPub = [];
  const geoPub = funde([caixa(0.46, 0.08, 0.42, 0, 0.45, 0), caixa(0.46, 0.5, 0.07, 0, 0.72, -0.2, -0.12)]);
  for (let k = 0; k < 4; k++) {
    const r = R_PAREDE + 0.75 + k * 1.2;
    const passos = Math.floor((aFim - aIni - 8) * DEG * r / 0.58);
    for (let j = 0; j < passos; j++) {
      const a = aIni + 4 + (aFim - aIni - 8) * (j + 0.5) / passos;
      if (Math.abs(((a - 90) % 30 + 30) % 30 - 15) < 1.2) continue; // corredores
      cadPub.push([r, a, Y_GALERIA + k * 0.45]);
    }
  }
  const imPub = new THREE.InstancedMesh(geoPub, new THREE.MeshStandardMaterial({ map: T.tecido, color: 0x8e2430, roughness: 0.85 }), cadPub.length);
  cadPub.forEach(([r, a, y], i) => {
    const x = r * Math.cos(a * DEG), z = -r * Math.sin(a * DEG);
    e.set(0, Math.atan2(-x, -z), 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, um); imPub.setMatrixAt(i, m4);
  });
  imPub.receiveShadow = true; raiz.add(imPub);
  prog(0.8);

  // teto em cúpula com ripas de madeira, nervuras e anéis de luz
  const cupGeo = new THREE.SphereGeometry(R_GALERIA, 96, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  cupGeo.scale(1, 0.36, 1); cupGeo.translate(0, Y_TETO + 1, 0);
  const matCup = M.madeira.clone(); matCup.side = THREE.BackSide; matCup.map = T.ripas.clone(); matCup.map.repeat.set(90, 4); matCup.map.needsUpdate = true;
  const teto = new THREE.Group(); raiz.add(teto);
  const cupula = new THREE.Mesh(cupGeo, matCup); teto.add(cupula);
  const nerv = [];
  for (let i = 0; i < 36; i++) {
    const a = i * 10 * DEG;
    const curva = new THREE.EllipseCurve(0, 0, R_GALERIA - 0.3, R_GALERIA * 0.36 - 0.2, 0, Math.PI / 2 - 0.05);
    const pts = curva.getPoints(24).map(p => new THREE.Vector3(p.x * Math.cos(a), Y_TETO + 1 + p.y, p.x * Math.sin(a))).filter(v => v.z < Z_PAREDE - 0.2);
    if (pts.length > 2) nerv.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.12, 5, false));
  }
  teto.add(new THREE.Mesh(mergeGeometries(nerv), M.madeiraEsc));
  // óculo central luminoso
  const oculo = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshBasicMaterial({ color: 0xfff6e0 }));
  oculo.rotation.x = Math.PI / 2; oculo.position.y = Y_TETO + 1 + R_GALERIA * 0.36 - 0.05; teto.add(oculo);
  // focos de luz no teto
  const focos = [];
  for (const [rr, nn] of [[9, 24], [15, 36], [21, 48], [27, 60]]) {
    for (let i = 0; i < nn; i++) {
      const a = i / nn * Math.PI * 2, x = rr * Math.cos(a), z = rr * Math.sin(a);
      const t = Math.sqrt(Math.max(0, 1 - (rr / R_GALERIA) ** 2));
      focos.push([x, Y_TETO + 1 + R_GALERIA * 0.36 * t - 0.06, z]);
    }
  }
  const imFoco = new THREE.InstancedMesh(new THREE.CircleGeometry(0.22, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff3d6 }), focos.length);
  focos.forEach((f, i) => { m4.makeTranslation(f[0], f[1], f[2]); imFoco.setMatrixAt(i, m4); });
  teto.add(imFoco);
  prog(0.9);

  // ---------- iluminação ----------
  scene.add(new THREE.HemisphereLight(0xfff4e2, 0x2a3350, 0.55));
  const sol = new THREE.DirectionalLight(0xfff1dc, 1.6);
  sol.position.set(6, 34, 6); sol.target.position.set(0, 0, -8);
  sol.castShadow = alta; sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 5, far: 70 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.03;
  scene.add(sol, sol.target);
  const spot = new THREE.SpotLight(0xffffff, 260, 40, 0.55, 0.6, 1.6);
  spot.position.set(0, 16, -6); spot.target.position.set(0, 1.5, 8.5); scene.add(spot, spot.target);
  scene.add(new THREE.AmbientLight(0xfff1e0, 0.55));
  prog(1);

  return { I, M, marc, hastes, ecras, raiz, zP, teto };
}

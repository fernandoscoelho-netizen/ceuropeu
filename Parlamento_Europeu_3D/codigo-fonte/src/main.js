// Visita virtual ao hemiciclo do Parlamento Europeu (Estrasburgo)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GEOMETRIA } from './dados_lugares.js';
import { LUGARES, DATA_PLANTA } from './dados_deputados.js';
import { PARTIDOS, DATA_LISTA } from './dados_partidos.js';
import { construirHemiciclo, S, CX, CY, R0, DR, ALT, Z_PAREDE, R_PAREDE, Y_GALERIA } from './cena.js';
import { ecraComposicao } from './texturas.js';
import { criarAtividades } from './atividades.js';

// ======================= DADOS =======================
const GRUPOS = {
  L: { sig: 'The Left', nome: 'Grupo da Esquerda no Parlamento Europeu - GUE/NGL', cor: '#460000', c2024: 46 },
  S: { sig: 'S&D', nome: 'Grupo da Aliança Progressista dos Socialistas e Democratas no Parlamento Europeu', cor: '#C80000', c2024: 136 },
  G: { sig: 'Verts/ALE', nome: 'Grupo dos Verdes/Aliança Livre Europeia', cor: '#32C800', c2024: 53 },
  R: { sig: 'Renew', nome: 'Grupo Renew Europe', cor: '#FFAA00', c2024: 77 },
  E: { sig: 'PPE', nome: 'Grupo do Partido Popular Europeu (Democratas-Cristãos)', cor: '#003C78', c2024: 188 },
  C: { sig: 'ECR', nome: 'Grupo dos Conservadores e Reformistas Europeus', cor: '#0082FF', c2024: 78 },
  P: { sig: 'PfE', nome: 'Grupo «Patriotas pela Europa»', cor: '#9B20A9', c2024: 84 },
  N: { sig: 'ESN', nome: 'Grupo Europa das Nações Soberanas', cor: '#808080', c2024: 25 },
  I: { sig: 'NI', nome: 'Não Inscritos (deputados que não pertencem a nenhum grupo)', cor: '#666666', c2024: 33 },
};
const OUTROS = {
  K: { sig: 'Conselho da UE', nome: 'Lugares do Conselho da União Europeia', cor: '#2284A1' },
  M: { sig: 'Comissão Europeia', nome: 'Lugares da Comissão Europeia', cor: '#F67003' },
};
const PAISES = {
  de: 'Alemanha', at: 'Áustria', be: 'Bélgica', bg: 'Bulgária', cy: 'Chipre', hr: 'Croácia', dk: 'Dinamarca', sk: 'Eslováquia', si: 'Eslovénia',
  es: 'Espanha', ee: 'Estónia', fi: 'Finlândia', fr: 'França', gr: 'Grécia', hu: 'Hungria', ie: 'Irlanda', it: 'Itália', lv: 'Letónia',
  lt: 'Lituânia', lu: 'Luxemburgo', mt: 'Malta', nl: 'Países Baixos', pl: 'Polónia', pt: 'Portugal', cz: 'Chéquia', ro: 'Roménia', se: 'Suécia',
};
const EN2CC = { Austria: 'at', Belgium: 'be', Bulgaria: 'bg', Croatia: 'hr', Cyprus: 'cy', Czechia: 'cz', Denmark: 'dk', Estonia: 'ee', Finland: 'fi', France: 'fr', Germany: 'de', Greece: 'gr', Hungary: 'hu', Ireland: 'ie', Italy: 'it', Latvia: 'lv', Lithuania: 'lt', Luxembourg: 'lu', Malta: 'mt', Netherlands: 'nl', Poland: 'pl', Portugal: 'pt', Romania: 'ro', Slovakia: 'sk', Slovenia: 'si', Spain: 'es', Sweden: 'se' };
const GP2G = { EPP: 'E', SD: 'S', PFE: 'P', ECR: 'C', RE: 'R', GRE: 'G', LEFT: 'L', ESN: 'N', NI: 'I' };
const TOTAL = 720, MAIORIA = 361;
const fmtData = iso => iso.split('-').reverse().join('/');
const D_PLANTA = fmtData(DATA_PLANTA), D_LISTA = fmtData(DATA_LISTA);

// lugares: geometria oficial + ocupação oficial
const ocup = new Map();
for (const t of LUGARES.split(';')) {
  const [id, g, cc, pid, ...nome] = t.split(',');
  ocup.set(+id, { g, cc, pid, nome: nome.join(',') });
}
const lugares = GEOMETRIA.split(';').map(t => {
  const [id, x, y] = t.split(',').map(Number);
  const r = Math.hypot(x - CX, y - CY);
  let ang = Math.atan2(CY - y, x - CX) * 180 / Math.PI; if (ang < -90) ang += 360;
  const fila = Math.max(0, Math.min(13, Math.round((r - R0) / DR)));
  const o = ocup.get(id) || { g: null };
  return { id, r, ang, fila, X: (x - CX) * S, Z: (y - CY) * S, ...o };
});
// contagens
for (const k in GRUPOS) GRUPOS[k].n = 0;
const porPais = {};
for (const l of lugares) if (GRUPOS[l.g]) {
  GRUPOS[l.g].n++;
  porPais[l.cc] ??= { n: 0, g: {} };
  porPais[l.cc].n++; porPais[l.cc].g[l.g] = (porPais[l.cc].g[l.g] || 0) + 1;
}
const partidos = {};
for (const linha of PARTIDOS.split('\n')) {
  const [p, g, nome, n] = linha.split('|');
  const cc = EN2CC[p]; (partidos[cc] ??= []).push({ g: GP2G[g], nome: nome === '-' ? 'Sem partido nacional indicado' : nome.replace(/^Independent$|^Independiente$|^Sans parti$/, 'Independente'), n: +n });
}
// ordem dos grupos no hemiciclo (da esquerda para a direita, vista da Presidência)
const angMedio = {};
for (const k in GRUPOS) { const a = lugares.filter(l => l.g === k).map(l => l.ang); angMedio[k] = a.reduce((s, v) => s + v, 0) / a.length; }
const ORDEM = Object.keys(GRUPOS).sort((a, b) => angMedio[b] - angMedio[a]);
// NI ficam no fim (sentam-se em vários pontos do fundo do hemiciclo)
ORDEM.splice(ORDEM.indexOf('I'), 1); ORDEM.push('I');
const vazios = lugares.filter(l => !l.g).length;

// ======================= RENDERIZAÇÃO =======================
const contentor = document.getElementById('cena');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
// qualidade adaptada ao dispositivo (pode ser mudada no painel)
const QUAL_GUARDADA = (() => { try { return localStorage.getItem('pe3d-qualidade'); } catch (e) { return null; } })();
const DISP_FRACO = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;
const ALTA = QUAL_GUARDADA ? QUAL_GUARDADA === 'alta' : !DISP_FRACO;
renderer.setPixelRatio(ALTA ? Math.min(window.devicePixelRatio, 1.5) : 1);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = ALTA;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
contentor.appendChild(renderer.domElement);
const css = new CSS2DRenderer({ element: document.getElementById('etiquetas') });
css.setSize(innerWidth, innerHeight);

let sujo = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1534);
scene.fog = new THREE.Fog(0x0b1534, 90, 160);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 400);
camera.position.set(0, 54, 4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -8.5);
controls.enableDamping = true; controls.dampingFactor = 0.12;
controls.rotateSpeed = 0.5; controls.zoomSpeed = 0.8; controls.panSpeed = 0.7;
controls.screenSpacePanning = false; // deslocar ao nível do chão
controls.maxDistance = 80; controls.minDistance = 2.5;
controls.minPolarAngle = 0.02; controls.maxPolarAngle = Math.PI * 0.47;
controls.autoRotateSpeed = 0.6;

const barra = document.querySelector('#carregar i');
const progresso = v => { barra.style.width = Math.round(v * 100) + '%'; };
const H = construirHemiciclo(scene, lugares, progresso, ALTA);

// ecrãs com a composição atual (dados oficiais)
const texEcra = ecraComposicao(GRUPOS, ORDEM, TOTAL, D_PLANTA);
H.ecras.forEach(e => { e.material.map = texEcra; e.material.needsUpdate = true; });

// ======================= CORES DOS LUGARES =======================
const cAzul = new THREE.Color(0x2f4fa8), cVazio = new THREE.Color(0xc9ced8), cApagado = new THREE.Color(0xd7dbe3);
const corDe = k => new THREE.Color((GRUPOS[k] || OUTROS[k] || {}).cor || '#c9ced8');
const zero = new THREE.Matrix4().makeScale(0, 0, 0), m4 = new THREE.Matrix4();
function pintar(fn) {
  const marcados = [];
  lugares.forEach((l, i) => {
    const r = fn(l);
    H.I.estofo.setColorAt(i, r.cor);
    H.I.luz.setColorAt(i, r.luz ? new THREE.Color(1, 0.15, 0.15) : new THREE.Color(0.35, 0.08, 0.08));
    if (r.marca) {
      const j = marcados.length; // só os lugares marcados são desenhados
      m4.makeTranslation(l.pos.x, l.pos.y + 3.0, l.pos.z); H.marc.setMatrixAt(j, m4); H.marc.setColorAt(j, r.marca);
      m4.makeScale(2, 2.7, 2).setPosition(l.pos.x, l.pos.y + 0.15, l.pos.z); H.hastes.setMatrixAt(j, m4);
      marcados.push(l);
    }
  });
  H.marc.count = H.hastes.count = marcados.length;
  sujo = true;
  for (const a of [H.I.estofo.instanceColor, H.I.luz.instanceColor, H.marc.instanceMatrix, H.marc.instanceColor, H.hastes.instanceMatrix]) a.needsUpdate = true;
  return marcados;
}

// ======================= ETIQUETAS 3D =======================
const grupoEtiq = new THREE.Group(); scene.add(grupoEtiq);
const grupoCont = new THREE.Group(); scene.add(grupoCont);
function etiqueta(texto, pos, info) {
  const el = document.createElement('div'); el.className = 'et3d';
  el.innerHTML = `<span class="ponto"></span><span class="txt">${texto}</span>`;
  el.addEventListener('pointerdown', ev => ev.stopPropagation());
  el.addEventListener('click', ev => { ev.stopPropagation(); mostrarInfoLocal(texto, info); });
  const o = new CSS2DObject(el); o.position.copy(pos); grupoEtiq.add(o); return o;
}
const centro = f => { const v = new THREE.Vector3(); const ls = lugares.filter(f); ls.forEach(l => v.add(l.pos)); return v.divideScalar(ls.length || 1); };
const P = {
  pres: new THREE.Vector3(0, 3.4, H.zP + 1.3),
  serv: new THREE.Vector3(2.6, 2.1, H.zP - 0.9),
  trib: new THREE.Vector3(0, 1.9, 5.2),
  cons: centro(l => l.g === 'K').add(new THREE.Vector3(0, 1.6, 0)),
  com: centro(l => l.g === 'M').add(new THREE.Vector3(0, 1.6, 0)),
  lideres: new THREE.Vector3(0, 1.9, -5.4),
  bancadas: new THREE.Vector3(-8, ALT(8) + 1.6, -14),
  cabines: new THREE.Vector3(24.9, 15.6, Z_PAREDE - 0.8),
  galeria: new THREE.Vector3(0, Y_GALERIA + 1.8, -(R_PAREDE + 2.2)),
  ecras: new THREE.Vector3(-13.5, 11.8, Z_PAREDE - 0.3),
  emblema: new THREE.Vector3(0, 12.6, Z_PAREDE - 0.3),
  voto: (() => { const l = lugares.find(l => l.id === 97); return l.pos.clone().add(new THREE.Vector3(0, 1.3, 0)); })(),
};
const INFO = {
  pres: 'Daqui a Presidente (ou um dos vice-presidentes) dirige os debates e as votações. A Presidente do Parlamento Europeu é Roberta Metsola (Malta), reeleita na sessão constitutiva de 16 de julho de 2024.',
  serv: 'Na bancada à frente da Presidência sentam-se funcionários dos serviços de sessão, que apoiam a condução dos trabalhos.',
  trib: 'Tribuna usada, por exemplo, em intervenções de convidados. Durante os debates, os deputados falam normalmente a partir do seu próprio lugar.',
  cons: 'Lugares reservados ao Conselho da União Europeia (representantes dos governos dos Estados-Membros), segundo a planta oficial.',
  com: 'Lugares reservados à Comissão Europeia, segundo a planta oficial.',
  lideres: 'Na primeira fila sentam-se os presidentes dos grupos políticos. Os grupos ocupam setores em forma de cunha, como as fatias de um gráfico circular.',
  bancadas: `O hemiciclo tem ${TOTAL} deputados, cada um com lugar atribuído. A distribuição dos lugares entre grupos é decidida pela Conferência dos Presidentes no início de cada legislatura.`,
  cabines: 'Cabines de interpretação: os debates são interpretados nas 24 línguas oficiais da União Europeia.',
  galeria: 'Galeria do público: os visitantes podem assistir às sessões plenárias.',
  ecras: 'Ecrãs gigantes: mostram quem tem a palavra e os resultados das votações. Aqui mostram a composição atual do Parlamento.',
  emblema: 'Emblema europeu: doze estrelas douradas em círculo sobre fundo azul, símbolo de união, solidariedade e harmonia entre os povos da Europa.',
  voto: 'Cada lugar tem microfone e consola de voto eletrónico: os deputados votam com um cartão pessoal (a favor, contra ou abstenção).',
};
const ETQ = {
  pres: etiqueta('Presidência', P.pres, INFO.pres),
  serv: etiqueta('Serviços de sessão', P.serv, INFO.serv),
  trib: etiqueta('Tribuna', P.trib, INFO.trib),
  cons: etiqueta('Conselho da UE', P.cons, INFO.cons),
  com: etiqueta('Comissão Europeia', P.com, INFO.com),
  lideres: etiqueta('Líderes dos grupos (1.ª fila)', P.lideres, INFO.lideres),
  bancadas: etiqueta('Bancadas dos deputados', P.bancadas, INFO.bancadas),
  cabines: etiqueta('Cabines de interpretação', P.cabines, INFO.cabines),
  galeria: etiqueta('Galeria do público', P.galeria, INFO.galeria),
  ecras: etiqueta('Ecrãs de votação', P.ecras, INFO.ecras),
  emblema: etiqueta('Emblema europeu', P.emblema, INFO.emblema),
  voto: etiqueta('Microfone e consola de voto', P.voto, INFO.voto),
};

function contagens(fonte) {
  grupoCont.clear();
  for (const k of ORDEM) {
    const ls = lugares.filter(l => l.g === k);
    // posição: lugar mais próximo do ângulo médio, numa fila intermédia
    const am = angMedio[k];
    const r = k === 'I' ? 26 : 19;
    const pos = new THREE.Vector3(r * Math.cos(am * Math.PI / 180), ALT(10) + 4.2, -r * Math.sin(am * Math.PI / 180));
    if (k === 'I') pos.set(16, ALT(13) + 4.6, -22);
    const el = document.createElement('div'); el.className = 'contagem';
    const n = fonte === '2024' ? GRUPOS[k].c2024 : ls.length;
    el.innerHTML = `<span class="n">${n}</span><span class="s" style="background:${GRUPOS[k].cor}">${GRUPOS[k].sig}</span>`;
    const o = new CSS2DObject(el); o.position.copy(pos); grupoCont.add(o);
  }
}

// ======================= CÂMARA =======================
let anim = null;
function voar(pos, alvo, dur = 1600) {
  // em ecrãs estreitos (telemóvel na vertical) afasta a câmara nas vistas gerais
  const asp = innerWidth / innerHeight;
  if (asp < 1.2 && pos.y >= 15) pos = alvo.clone().add(pos.clone().sub(alvo).multiplyScalar(Math.min(2.1, 1.25 / asp)));
  anim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: alvo.clone(), ini: performance.now(), dur };
}
const lugarPT = lugares.find(l => l.id === 97);
const VISTAS = {
  geral: ['Vista geral', new THREE.Vector3(0, 54, 4), new THREE.Vector3(0, 0, -8.5)],
  presidencia2: ['Vista de frente', new THREE.Vector3(0, 14, -24), new THREE.Vector3(0, 3.5, 5)],
  presidencia: ['Da Presidência', new THREE.Vector3(0, 3.3, H.zP + 1.2), new THREE.Vector3(0, 3, -18)],
  deputado: ['Lugar de um deputado', (() => { const p = lugarPT.pos.clone(); return p.add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(new THREE.Vector3(Math.sin(lugarPT.rot), 0, Math.cos(lugarPT.rot)), -0.35); })(), new THREE.Vector3(0, 3, H.zP)],
  galeria: ['Galeria do público', new THREE.Vector3(4, Y_GALERIA + 2.6, -(R_PAREDE + 2.5)), new THREE.Vector3(0, 2, 4)],
  cabines: ['Cabines de interpretação', new THREE.Vector3(14, 9, -6), new THREE.Vector3(25, 13.5, Z_PAREDE)],
  aerea: ['Vista aérea', new THREE.Vector3(0, 50, 7), new THREE.Vector3(0, 0, -8)],
  lado: ['Vista lateral', new THREE.Vector3(-30, 14, 10), new THREE.Vector3(0, 2, -6)],
};

// ======================= INTERAÇÃO (lugares) =======================
const ray = new THREE.Raycaster(), rato = new THREE.Vector2();
const dica = document.getElementById('dica');
let ultimo = -1, pendente = null;
function lugarSob(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  rato.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(rato, camera);
  const h = ray.intersectObject(H.I.alvo, false)[0];
  return h ? lugares[h.instanceId] : null;
}
function descLugar(l) {
  if (!l.g) return `<b>Lugar n.º ${l.id}</b><br>Sem atribuição na planta oficial`;
  if (OUTROS[l.g]) return `<span class="g" style="background:${OUTROS[l.g].cor}"></span><b>${OUTROS[l.g].sig}</b><br>Lugar n.º ${l.id}`;
  return `<span class="g" style="background:${GRUPOS[l.g].cor}"></span><b>${l.nome}</b><br>${PAISES[l.cc]} · ${GRUPOS[l.g].sig} · lugar n.º ${l.id}`;
}
renderer.domElement.addEventListener('pointermove', ev => {
  if (ev.pointerType === 'touch') return;
  if (ev.buttons) { dica.style.display = 'none'; return; } // a rodar: não procurar lugares
  pendente = ev;
});
function processarRato() {
  if (!pendente) return;
  const ev = pendente; pendente = null;
  const l = lugarSob(ev);
  if (l) {
    dica.innerHTML = descLugar(l); dica.style.display = 'block';
    dica.style.left = Math.min(ev.clientX + 14, innerWidth - 270) + 'px'; dica.style.top = (ev.clientY + 14) + 'px';
    renderer.domElement.style.cursor = 'pointer'; ultimo = l.id;
  } else { dica.style.display = 'none'; renderer.domElement.style.cursor = ''; ultimo = -1; }
}
let baixo = null;
renderer.domElement.addEventListener('pointerdown', ev => { baixo = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener('pointerup', ev => {
  if (!baixo || Math.hypot(ev.clientX - baixo[0], ev.clientY - baixo[1]) > 6) return;
  const l = lugarSob(ev); if (l) abrirFicha(l);
});
const ficha = document.getElementById('ficha');
document.getElementById('fecharFicha').onclick = () => { ficha.style.display = 'none'; };
function abrirFicha(l) {
  let h;
  if (!l.g) h = `<h4>Lugar n.º ${l.id}</h4><p>Este lugar não tem ocupante atribuído na planta oficial de ${D_PLANTA}.</p>`;
  else if (OUTROS[l.g]) h = `<h4>${OUTROS[l.g].sig}</h4><div class="faixaG" style="background:${OUTROS[l.g].cor}"></div><p>${OUTROS[l.g].nome}. Lugar n.º ${l.id}.</p>`;
  else {
    const g = GRUPOS[l.g];
    h = `<h4>${l.nome}</h4><div class="faixaG" style="background:${g.cor}"></div>
      <p><b>Estado-Membro:</b> ${PAISES[l.cc]}<br><b>Grupo político:</b> ${g.sig}<br><small>${g.nome}</small><br><b>Lugar:</b> n.º ${l.id} (fila ${l.fila + 1})</p>
      <p><a href="https://www.europarl.europa.eu/meps/pt/${l.pid}" target="_blank" rel="noopener">Ver a página oficial do deputado ↗</a></p>`;
  }
  document.getElementById('fichaConteudo').innerHTML = h;
  ficha.style.display = 'block';
}

// ======================= PAINEL / MODOS =======================
const pTitulo = document.getElementById('pTitulo'), pConteudo = document.getElementById('pConteudo'), pFonte = document.getElementById('pFonte');
const ATIV = criarAtividades({ lugares, GRUPOS, OUTROS, ORDEM, PAISES, TOTAL, MAIORIA, pintar, corDe, voar, abrirFicha, pConteudo, porPais, H, D_PLANTA });
const painel = document.getElementById('painel'), abrirP = document.getElementById('abrirPainel');
document.getElementById('fecharPainel').onclick = () => { painel.classList.add('fechado'); abrirP.classList.add('ver'); };
abrirP.onclick = () => { painel.classList.remove('fechado'); abrirP.classList.remove('ver'); };
const FONTE_CURTA = `Dados: <a href="https://www.europarl.europa.eu/erpl-public/hemicycle/index.htm?lang=pt&loc=str" target="_blank" rel="noopener">planta oficial do hemiciclo</a> (Parlamento Europeu, ${D_PLANTA}) e <a href="https://www.europarl.europa.eu/meps/pt/full-list" target="_blank" rel="noopener">lista oficial de deputados</a> (consultada a ${D_LISTA}). <a href="#" data-fontes>Mais sobre as fontes</a>`;

let modo = 'visita', filtroGrupo = null, paisSel = null;
function mostrarInfoLocal(titulo, texto) {
  if (modo !== 'visita') definirModo('visita');
  const caixa = document.getElementById('infoLocal');
  if (caixa) { caixa.innerHTML = `<b>${titulo}</b><br>${texto}`; caixa.style.display = 'block'; caixa.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  painel.classList.remove('fechado'); abrirP.classList.remove('ver');
}

const ROTEIRO = [
  ['geral', 'O hemiciclo de Estrasburgo', `É em Estrasburgo (França), sede oficial do Parlamento Europeu, que se realizam as 12 sessões plenárias anuais. Os ${TOTAL} lugares de deputado foram preenchidos nas eleições europeias de junho de 2024, para a 10.ª legislatura (2024-2029).`],
  ['presidencia', 'A Presidência', INFO.pres + ' ' + INFO.serv],
  ['lado', 'Conselho e Comissão', 'Junto à Presidência, de cada lado, ficam os lugares reservados ao Conselho da UE e à Comissão Europeia, que participam nos debates.'],
  ['deputado', 'Um lugar de deputado', INFO.voto + ' Este é o lugar de um deputado português (lugar n.º 97).'],
  ['aerea', 'Os grupos políticos', INFO.lideres + ' Experimenta o modo «Grupos políticos» para ver as cores de cada grupo.'],
  ['cabines', 'Interpretação', INFO.cabines],
  ['galeria', 'A galeria do público', INFO.galeria],
];
let passo = -1;

function htmlVisita() {
  return `
  <p>Bem-vindo ao <b>hemiciclo do Parlamento Europeu em Estrasburgo</b>. Cada lugar está colocado na posição indicada na planta oficial do Parlamento (${lugares.length} lugares, dos quais ${TOTAL} de deputados).</p>
  <div id="infoLocal" class="nota" style="display:none"></div>
  <h3>Visita guiada</h3>
  <div id="roteiro" class="nota" style="display:none"></div>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="bt claro" id="bRot">${passo < 0 ? 'Iniciar visita guiada' : 'Seguinte ›'}</button><button class="bt sec" id="bRotAnt" ${passo < 1 ? 'disabled' : ''}>‹ Anterior</button></div>
  <h3>Ir para…</h3>
  <div class="grelhaBt">${Object.entries(VISTAS).map(([k, v]) => `<button class="bt sec" data-vista="${k}">${v[0]}</button>`).join('')}</div>
  <h3>Opções</h3>
  <div class="grelhaBt">
    <button class="bt sec" id="bEtq" aria-pressed="${grupoEtiq.visible}">Etiquetas</button>
    <button class="bt sec" id="bRodar" aria-pressed="${controls.autoRotate}">Rodar automaticamente</button>
    <button class="bt sec" id="bQual" title="Muda a qualidade gráfica (a página volta a carregar)">Qualidade: ${ALTA ? 'alta' : 'leve'}</button>
  </div>
  <p class="nota">Clica nas etiquetas amarelas para saber o que é cada local. Passa o rato sobre um lugar (ou toca nele) para veres quem lá se senta.</p>`;
}
function htmlGrupos() {
  const lista = ORDEM.map(k => `<li data-g="${k}" class="${filtroGrupo === k ? 'ativo' : ''}"><span class="cor" style="background:${GRUPOS[k].cor}"></span><span class="nome"><b>${GRUPOS[k].sig}</b><small>${GRUPOS[k].nome}</small></span><span class="num">${GRUPOS[k].n}</span></li>`).join('');
  const sequencia = ORDEM.filter(k => k !== 'I').map(k => GRUPOS[k].sig).join(' → ');
  return `
  <p>Os deputados não se sentam por país: sentam-se por <b>grupo político</b>. Cada grupo ocupa um setor do hemiciclo, com os líderes na primeira fila.</p>
  <p class="nota"><b>Da esquerda para a direita</b> (vistos da Presidência):<br>${sequencia}.<br>Os Não Inscritos (NI) ficam em lugares nas filas de trás.</p>
  <ul class="legenda" id="legenda">${lista}
    <li data-g="K"><span class="cor" style="background:${OUTROS.K.cor}"></span><span class="nome"><b>${OUTROS.K.sig}</b><small>${OUTROS.K.nome}</small></span><span class="num">${lugares.filter(l => l.g === 'K').length}</span></li>
    <li data-g="M"><span class="cor" style="background:${OUTROS.M.cor}"></span><span class="nome"><b>${OUTROS.M.sig}</b><small>${OUTROS.M.nome}</small></span><span class="num">${lugares.filter(l => l.g === 'M').length}</span></li>
  </ul>
  <p style="font-size:.8rem;color:var(--suave)">Clica num grupo para o destacar. Clica outra vez para ver todos. As cores são as usadas pelo Parlamento Europeu. Lugares sem atribuição: ${vazios}.</p>
  <h3>Procurar um deputado</h3>
  <input type="search" id="procura" placeholder="Escreve um nome (ex.: Metsola)">
  <ul class="resultados" id="resultados"></ul>`;
}
function htmlNumero(fonte = 'atual') {
  const max = Math.max(...ORDEM.map(k => Math.max(GRUPOS[k].n, GRUPOS[k].c2024)));
  const barras = ORDEM.map(k => {
    const n = fonte === '2024' ? GRUPOS[k].c2024 : GRUPOS[k].n, outro = fonte === '2024' ? GRUPOS[k].n : GRUPOS[k].c2024;
    const dif = GRUPOS[k].n - GRUPOS[k].c2024;
    return `<div class="barra" title="${GRUPOS[k].nome}"><span><b>${GRUPOS[k].sig}</b></span><span class="trilho"><span class="enchimento" style="width:${n / max * 100}%;background:${GRUPOS[k].cor}"></span><span class="ant" style="left:${outro / max * 100}%"></span></span><span class="n">${n}${fonte === 'atual' && dif ? `<small style="display:block;font-weight:600;color:${dif > 0 ? '#167a2c' : '#b3261e'}">${dif > 0 ? '+' : ''}${dif}</small>` : ''}</span></div>`;
  }).join('');
  return `
  <div class="destaque"><span class="grande">${TOTAL}</span> deputados<br><small>Maioria absoluta: ${MAIORIA} votos (metade dos membros + 1)</small></div>
  <div class="grelhaBt"><button class="bt sec" data-fonte="atual" aria-pressed="${fonte === 'atual'}">Hoje (${D_PLANTA})</button><button class="bt sec" data-fonte="2024" aria-pressed="${fonte === '2024'}">Início da legislatura (2024)</button></div>
  ${barras}
  <p style="font-size:.78rem;color:var(--suave)">${fonte === 'atual' ? 'O traço preto mostra o número no início da legislatura (sessão constitutiva, 16/07/2024). Os números a verde e vermelho indicam a variação desde então.' : 'Composição na sessão constitutiva de 16/07/2024, segundo o sítio oficial de resultados das eleições europeias de 2024. O traço preto mostra o número atual.'}</p>
  <p class="nota">Ao longo da legislatura, os números mudam: há deputados que trocam de grupo, que saem de um grupo para os Não Inscritos ou que são substituídos.</p>
  <h3>Grupos necessários para chegar a ${MAIORIA}</h3>
  <p style="font-size:.85rem">Nenhum grupo tem maioria sozinho. Por exemplo: PPE + S&D + Renew = <b>${GRUPOS.E.n + GRUPOS.S.n + GRUPOS.R.n}</b> deputados (dados atuais).</p>`;
}
function htmlEstados() {
  const ordemP = Object.keys(PAISES).sort((a, b) => porPais[b].n - porPais[a].n || PAISES[a].localeCompare(PAISES[b], 'pt'));
  let det = '';
  if (paisSel) {
    const p = porPais[paisSel];
    const gs = ORDEM.filter(k => p.g[k]);
    det = `<div class="destaque"><span class="grande">${p.n}</span> deputados eleitos por <b>${PAISES[paisSel]}</b><br><small>${(p.n / TOTAL * 100).toFixed(1).replace('.', ',')}% dos ${TOTAL} lugares</small></div>
    <h3>Por grupo político</h3>
    ${gs.map(k => `<div class="barra"><span><b>${GRUPOS[k].sig}</b></span><span class="trilho"><span class="enchimento" style="width:${p.g[k] / p.n * 100}%;background:${GRUPOS[k].cor}"></span></span><span class="n">${p.g[k]}</span></div>`).join('')}
    <h3>Por partido nacional</h3>
    <ul class="partidos">${partidos[paisSel].slice().sort((a, b) => b.n - a.n).map(x => `<li><span>${x.nome}</span><span style="color:${GRUPOS[x.g].cor};font-weight:800">${GRUPOS[x.g].sig}</span><b>${x.n}</b></li>`).join('')}</ul>
    <p style="font-size:.78rem;color:var(--suave)">Os nomes dos partidos são apresentados como constam na lista oficial do Parlamento Europeu.</p>`;
  } else det = `<p class="nota">Escolhe um país para ver no hemiciclo onde se sentam os seus deputados.</p>`;
  return `
  <p>O número de deputados de cada país é fixado pelo Conselho Europeu (Decisão (UE) 2023/2061) segundo a <b>proporcionalidade degressiva</b>: os países mais populosos elegem mais deputados, mas cada deputado de um país pequeno representa menos cidadãos. Nenhum país tem menos de 6 nem mais de 96 lugares.</p>
  ${det}
  <div class="paises" id="paises">${ordemP.map(cc => `<button data-cc="${cc}" aria-pressed="${paisSel === cc}">${PAISES[cc]} <b>${porPais[cc].n}</b></button>`).join('')}</div>
  ${paisSel ? '<button class="bt sec" id="bTodos">Ver todos os países</button>' : ''}
  <p style="font-size:.78rem;color:var(--suave)">Total: ${Object.values(porPais).reduce((s, p) => s + p.n, 0)} deputados de 27 Estados-Membros.</p>`;
}

let fonteNum = 'atual';
function definirModo(m) {
  modo = m;
  ATIV.parar();
  document.querySelectorAll('#modos button[data-modo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.modo === m));
  ficha.style.display = 'none';
  grupoCont.visible = m === 'numero';
  if (m === 'visita') {
    pTitulo.textContent = 'Visita ao hemiciclo';
    grupoEtiq.visible = grupoEtiq.userData.ver ?? true;
    pConteudo.innerHTML = htmlVisita();
    pintar(l => ({ cor: cAzul }));
    ligarVisita();
  } else {
    grupoEtiq.visible = false;
  }
  if (m === 'grupos') {
    pTitulo.textContent = 'Grupos políticos';
    pConteudo.innerHTML = htmlGrupos();
    aplicarGrupo();
    ligarGrupos();
  }
  if (m === 'numero') {
    pTitulo.textContent = 'Número de deputados';
    pConteudo.innerHTML = htmlNumero(fonteNum);
    contagens(fonteNum);
    pintar(l => ({ cor: GRUPOS[l.g] ? corDe(l.g) : (OUTROS[l.g] ? corDe(l.g) : cVazio) }));
    pConteudo.querySelectorAll('[data-fonte]').forEach(b => b.onclick = () => { fonteNum = b.dataset.fonte; definirModo('numero'); });
    if (!anim) voar(new THREE.Vector3(0, 52, 9.5), new THREE.Vector3(0, 0, -9.5));
  }
  if (m === 'estados') {
    pTitulo.textContent = 'Estados-Membros';
    pConteudo.innerHTML = htmlEstados();
    aplicarPais();
    pConteudo.querySelectorAll('[data-cc]').forEach(b => b.onclick = () => { paisSel = paisSel === b.dataset.cc ? null : b.dataset.cc; definirModo('estados'); });
    const bt = document.getElementById('bTodos'); if (bt) bt.onclick = () => { paisSel = null; definirModo('estados'); };
  }
  if (m === 'atividades') {
    pTitulo.textContent = 'Atividades';
    ATIV.menu();
  }
  pFonte.innerHTML = FONTE_CURTA;
  pFonte.querySelector('[data-fontes]').onclick = e => { e.preventDefault(); abrirFontes(); };
}
function ligarVisita() {
  pConteudo.querySelectorAll('[data-vista]').forEach(b => b.onclick = () => { const v = VISTAS[b.dataset.vista]; controls.autoRotate = false; voar(v[1], v[2]); });
  const bE = document.getElementById('bEtq'); bE.onclick = () => { grupoEtiq.visible = !grupoEtiq.visible; grupoEtiq.userData.ver = grupoEtiq.visible; bE.setAttribute('aria-pressed', grupoEtiq.visible); };
  document.getElementById('bQual').onclick = () => { try { localStorage.setItem('pe3d-qualidade', ALTA ? 'leve' : 'alta'); } catch (e) {} location.reload(); };
  const bR = document.getElementById('bRodar'); bR.onclick = () => { controls.autoRotate = !controls.autoRotate; bR.setAttribute('aria-pressed', controls.autoRotate); };
  const mostrarPasso = () => {
    const [v, t, txt] = ROTEIRO[passo];
    const r = document.getElementById('roteiro'); r.style.display = 'block';
    r.innerHTML = `<b>${passo + 1}/${ROTEIRO.length} · ${t}</b><br>${txt}`;
    controls.autoRotate = false; voar(VISTAS[v][1], VISTAS[v][2], 2200);
    document.getElementById('bRot').textContent = passo === ROTEIRO.length - 1 ? 'Recomeçar' : 'Seguinte ›';
    document.getElementById('bRotAnt').disabled = passo < 1;
  };
  document.getElementById('bRot').onclick = () => { passo = (passo + 1) % ROTEIRO.length; mostrarPasso(); };
  document.getElementById('bRotAnt').onclick = () => { if (passo > 0) { passo--; mostrarPasso(); } };
  if (passo >= 0) mostrarPasso();
}
function aplicarGrupo() {
  const marcados = pintar(l => {
    if (!l.g) return { cor: cVazio };
    const c = corDe(l.g);
    if (!filtroGrupo) return { cor: c };
    return l.g === filtroGrupo ? { cor: c, marca: c, luz: true } : { cor: cApagado };
  });
  if (filtroGrupo) {
    const c = centro(l => l.g === filtroGrupo);
    voar(new THREE.Vector3(c.x * 0.3, 34, 9), new THREE.Vector3(c.x * 0.7, 0, c.z * 0.7));
  }
  return marcados;
}
function ligarGrupos() {
  pConteudo.querySelectorAll('#legenda li').forEach(li => li.onclick = () => {
    filtroGrupo = filtroGrupo === li.dataset.g ? null : li.dataset.g;
    pConteudo.querySelectorAll('#legenda li').forEach(x => x.classList.toggle('ativo', x.dataset.g === filtroGrupo));
    aplicarGrupo();
  });
  const inp = document.getElementById('procura'), res = document.getElementById('resultados');
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  inp.oninput = () => {
    const t = norm(inp.value.trim());
    if (t.length < 2) { res.innerHTML = ''; return; }
    const ach = lugares.filter(l => GRUPOS[l.g] && norm(l.nome).includes(t)).slice(0, 25);
    res.innerHTML = ach.length ? ach.map(l => `<li data-id="${l.id}"><span class="cor" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${GRUPOS[l.g].cor}"></span> ${l.nome} <small>(${PAISES[l.cc]}, ${GRUPOS[l.g].sig})</small></li>`).join('') : '<li>Nenhum deputado encontrado.</li>';
    res.querySelectorAll('[data-id]').forEach(li => li.onclick = () => {
      const l = lugares.find(x => x.id === +li.dataset.id);
      filtroGrupo = null; pConteudo.querySelectorAll('#legenda li').forEach(x => x.classList.remove('ativo'));
      pintar(x => x === l ? { cor: corDe(x.g), marca: corDe(x.g), luz: true } : { cor: x.g ? (GRUPOS[x.g] || OUTROS[x.g] ? corDe(x.g).lerp(cApagado, 0.65) : cVazio) : cVazio });
      const dir = new THREE.Vector3(Math.sin(l.rot), 0, Math.cos(l.rot));
      voar(l.pos.clone().addScaledVector(dir, 6).add(new THREE.Vector3(0, 4, 0)), l.pos.clone().add(new THREE.Vector3(0, 1, 0)));
      abrirFicha(l);
    });
  };
}
function aplicarPais() {
  pintar(l => {
    if (!paisSel) return { cor: GRUPOS[l.g] ? corDe(l.g) : (OUTROS[l.g] ? corDe(l.g) : cVazio) };
    if (l.cc === paisSel) { const c = corDe(l.g); return { cor: c, marca: c, luz: true }; }
    return { cor: cApagado };
  });
  if (paisSel) voar(new THREE.Vector3(0, 52, 9.5), new THREE.Vector3(0, 0, -9.5));
}
document.querySelectorAll('#modos button[data-modo]').forEach(b => b.onclick = () => definirModo(b.dataset.modo));

// ======================= FONTES =======================
const modalF = document.getElementById('fontes');
function abrirFontes() { modalF.hidden = false; }
document.getElementById('bFontes').onclick = abrirFontes;
document.getElementById('fecharFontes').onclick = () => { modalF.hidden = true; };
modalF.addEventListener('click', e => { if (e.target === modalF) modalF.hidden = true; });
document.getElementById('fontesConteudo').innerHTML = `
<p>Todos os números desta visita foram retirados de fontes oficiais da União Europeia:</p>
<ul>
<li><b>Lugares e ocupação do hemiciclo de Estrasburgo</b> (posição de cada um dos ${lugares.length} lugares, deputado, grupo e país): <a href="https://www.europarl.europa.eu/erpl-public/hemicycle/index.htm?lang=pt&loc=str" target="_blank" rel="noopener">planta interativa oficial do Parlamento Europeu</a>, dados de <b>${D_PLANTA}</b>.</li>
<li><b>Deputados por grupo, por Estado-Membro e por partido nacional</b>: <a href="https://www.europarl.europa.eu/meps/pt/full-list" target="_blank" rel="noopener">lista oficial dos deputados ao Parlamento Europeu</a>, consultada a <b>${D_LISTA}</b>. As contagens por grupo e por país coincidem com a planta oficial.</li>
<li><b>Composição no início da legislatura</b> (sessão constitutiva de 16/07/2024): <a href="https://results.elections.europa.eu/pt/" target="_blank" rel="noopener">resultados oficiais das eleições europeias de 2024</a> (PPE 188, S&amp;D 136, PfE 84, ECR 78, Renew 77, Verts/ALE 53, The Left 46, ESN 25, NI 33).</li>
<li><b>Número de deputados por Estado-Membro (2024-2029)</b>: <a href="https://eur-lex.europa.eu/eli/dec/2023/2061/oj" target="_blank" rel="noopener">Decisão (UE) 2023/2061 do Conselho Europeu, de 22 de setembro de 2023</a> (720 lugares).</li>
<li><b>Funcionamento</b> (12 sessões plenárias por ano em Estrasburgo; lugares atribuídos pela Conferência dos Presidentes; líderes na 1.ª fila): páginas oficiais do Parlamento Europeu sobre os <a href="https://www.europarl.europa.eu/meps/pt/home" target="_blank" rel="noopener">deputados</a> e sobre os <a href="https://www.europarl.europa.eu/news/pt/faq/10/seating-in-the-plenary-chamber" target="_blank" rel="noopener">lugares no hemiciclo</a>.</li>
</ul>
<p><b>Nota:</b> a posição dos lugares segue a planta oficial; as medidas da sala, os materiais e a decoração são uma reconstituição aproximada, feita para fins educativos. A composição do Parlamento muda ao longo da legislatura: os dados correspondem às datas indicadas.</p>
<p><b>Créditos:</b> modelos 3D e texturas criados por código para esta visita. Motor 3D: <a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> (licença MIT). Dados © União Europeia, Parlamento Europeu (reutilização autorizada mediante indicação da fonte).</p>`;

// ======================= ESTRELAS (cabeçalho) =======================
for (const id of ['estrelasTopo', 'estrelasEntrada']) {
  const g = document.getElementById(id);
  let s = '';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6, x = 30 * Math.sin(a), y = -30 * Math.cos(a);
    let pts = []; for (let j = 0; j < 10; j++) { const b = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 2.3 : 6; pts.push((x + r * Math.cos(b)).toFixed(2) + ',' + (y + r * Math.sin(b)).toFixed(2)); }
    s += `<polygon points="${pts.join(' ')}"/>`;
  }
  g.innerHTML = s;
}

// ======================= CICLO =======================
addEventListener('resize', () => {
  ultimaVista = '';
  renderer.setSize(innerWidth, innerHeight); css.setSize(innerWidth, innerHeight);
});
// desloca o centro da imagem para a esquerda quando o painel está aberto (ecrãs largos)
let ultimaVista = '';
function ajustarVista() {
  const aberto = !painel.classList.contains('fechado');
  const largo = innerWidth > 760 && aberto, estreito = innerWidth <= 760 && aberto;
  const pw = largo ? painel.offsetWidth + 24 : 0;
  const ph = estreito ? Math.round(painel.offsetHeight * 0.8) : 0;
  const chave = innerWidth + 'x' + innerHeight + ':' + pw + ':' + ph;
  if (chave === ultimaVista) return false; ultimaVista = chave;
  camera.fov = innerWidth < innerHeight ? 62 : 50;
  controls.maxDistance = innerWidth < innerHeight ? 125 : 80;
  camera.aspect = (innerWidth + pw) / (innerHeight + ph);
  if (pw || ph) camera.setViewOffset(innerWidth + pw, innerHeight + ph, pw, ph, innerWidth, innerHeight); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  return true;
}
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const marcarSujo = () => { sujo = true; };
for (const ev of ['pointerdown', 'pointerup', 'wheel', 'keydown', 'click', 'touchstart', 'resize']) addEventListener(ev, marcarSujo, { passive: true });
controls.addEventListener('change', marcarSujo);
const LIM = new THREE.Vector3();
function limitarCamera() {
  // alvo dentro da sala
  const t = controls.target;
  t.x = THREE.MathUtils.clamp(t.x, -24, 24); t.y = THREE.MathUtils.clamp(t.y, 0, 12); t.z = THREE.MathUtils.clamp(t.z, -27, 9);
  // câmara: não atravessa a parede da Presidência nem o chão; dentro das paredes curvas quando está abaixo do teto
  const c = camera.position;
  if (c.z > Z_PAREDE - 0.6) c.z = Z_PAREDE - 0.6;
  if (c.y < 0.8) c.y = 0.8;
  if (c.y < 20) { const r = Math.hypot(c.x, c.z), rm = 31.5; if (r > rm) { c.x *= rm / r; c.z *= rm / r; } }
}
function ciclo(t) {
  if (anim) {
    sujo = true;
    const k = Math.min(1, (t - anim.ini) / anim.dur), e = ease(k);
    camera.position.lerpVectors(anim.p0, anim.p1, e);
    controls.target.lerpVectors(anim.t0, anim.t1, e);
    if (k >= 1) anim = null;
  }
  if (controls.update()) sujo = true;
  if (controls.autoRotate) sujo = true;
  limitarCamera();
  H.teto.visible = camera.position.y < 20.5 && Math.hypot(camera.position.x, camera.position.z) < 33;
  if (ajustarVista()) sujo = true;
  processarRato();
  if (!sujo) return; // só desenha quando algo muda (poupa bateria e processador)
  sujo = false;
  renderer.render(scene, camera);
  css.render(scene, camera);
}
definirModo('visita');
voar(VISTAS.geral[1], VISTAS.geral[2], 10);
renderer.setAnimationLoop(ciclo);
controls.addEventListener('start', () => { anim = null; });

// entrada
const bEntrar = document.getElementById('bEntrar');
progresso(1);
bEntrar.disabled = false; bEntrar.textContent = 'Entrar no hemiciclo';
bEntrar.onclick = () => { document.getElementById('entrada').hidden = true; };
// acesso direto por endereço (ex.: #grupos) — útil para a sala de aula
const h = location.hash.replace('#', '');
if (['grupos', 'numero', 'estados', 'atividades'].includes(h)) { document.getElementById('entrada').hidden = true; definirModo(h); }
window.__visita = { ATIV, renderer, lugarSob, definirModo, voar, VISTAS, camera, controls, lugares, GRUPOS, porPais, setPais: cc => { paisSel = cc; definirModo('estados'); }, setGrupo: g => { filtroGrupo = g; definirModo('grupos'); } };

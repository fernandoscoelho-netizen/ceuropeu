/* Carvão e Aço: a Missão Schuman · Lógica do jogo */
(function () {
'use strict';
var C = window.CONTEUDOS, Sala = window.Sala;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var KEY = 'carvao-aco-missao-schuman', GAME_MS = 40 * 60 * 1000, HINT_MS = 2 * 60 * 1000, HINTS = 5;
var ENIGMAS = ['maquina', 'relogio', 'mapa', 'tratado', 'telegrama', 'retratos', 'jornais'];
var COMBO = [18, 6, 50];
var EST = {}; C.estacoes.forEach(function (e) { EST[e.id] = e; });
var has3D = false, current = null;

/* ---------- Estado ---------- */
function fresh() {
  var s = { v: 2, team: '', started: false, finished: false, solved: {}, inv: {}, hints: HINTS, hintsUsed: 0, hintSeen: {}, penalty: 0, elapsed: 0, errors: 0, attempts: 3, lockUntil: 0, paused: false, sound: true, finalTime: 0, sub: {} };
  ENIGMAS.forEach(function (id) { s.solved[id] = false; });
  return s;
}
var S = fresh();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function load() { try { var t = localStorage.getItem(KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function nSolved() { return ENIGMAS.filter(function (i) { return S.solved[i]; }).length; }

/* ---------- Utilidades ---------- */
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(msg, kind) { var t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 450); }, 4200); }
function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function pad(n) { return String(n).padStart(2, '0'); }
function used() { return S.elapsed + S.penalty; }
function fmtLong(ms) { var t = Math.round(ms / 1000); return Math.floor(t / 60) + ' min ' + pad(t % 60) + ' s'; }
function msg(text, kind) { var m = $('#pMsg'); m.textContent = text || ''; m.className = 'p-msg ' + (kind || ''); }

/* ---------- Som (Web Audio, sem ficheiros) ---------- */
var AC = null;
function ac() { if (!S.sound) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; }
function tone(f, d, type, vol, when) {
  var a = ac(); if (!a) return; var t = a.currentTime + (when || 0);
  var o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.05);
}
var sfx = {
  click: function () { tone(1800, 0.03, 'square', 0.03); },
  type: function () { tone(220 + Math.random() * 80, 0.04, 'square', 0.05); },
  good: function () { tone(660, 0.18, 'triangle', 0.14); tone(990, 0.3, 'triangle', 0.12, 0.12); },
  bad: function () { tone(180, 0.28, 'sawtooth', 0.07); },
  chime: function (n) { for (var i = 0; i < n; i++) { tone(523, 1.6, 'sine', 0.16, i * 0.9); tone(1046, 1.2, 'sine', 0.05, i * 0.9); } },
  ring: function () { for (var i = 0; i < 6; i++) tone(i % 2 ? 950 : 1150, 0.12, 'square', 0.04, i * 0.13); },
  safe: function () { for (var i = 0; i < 4; i++) tone(90 + i * 20, 0.25, 'square', 0.06, i * 0.35); tone(440, 1.4, 'triangle', 0.1, 1.6); tone(660, 1.6, 'triangle', 0.08, 1.8); }
};

/* ---------- HUD ---------- */
function updateHud() {
  var u = used(), s = 20 * 60 + u / 1000; // segundos depois das 17h00
  var h = 17 + Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  $('#hHora').textContent = pad(h) + ':' + pad(m);
  var left = GAME_MS - u, rel = $('.relogio');
  if (left >= 0) { $('#hFalta').textContent = 'faltam ' + pad(Math.floor(left / 60000)) + ':' + pad(Math.floor(left / 1000) % 60); rel.classList.remove('atraso'); }
  else { $('#hFalta').textContent = 'atraso de ' + pad(Math.floor(-left / 60000)) + ':' + pad(Math.floor(-left / 1000) % 60); rel.classList.add('atraso'); }
  $('#hPistas b').textContent = S.hints;
  $('#hEnigmas b').textContent = nSolved() + '/7';
  if (has3D) Sala.setClock(s);
}
function renderInv() {
  var I = S.inv, li = [];
  li.push(['Ordem da combinação', I.ordem ? 'hora · países · anos' : '?', !!I.ordem]);
  li.push(['1.º número (hora)', I.hora ? '18' : '—', !!I.hora]);
  li.push(['2.º número (países)', I.paises ? '6' : '—', !!I.paises]);
  li.push(['3.º número (anos)', I.anos ? '50' : '—', !!I.anos]);
  var html = li.map(function (l) { return '<li class="' + (l[2] ? 'ok' : '') + '">' + l[0] + '<span class="v">' + (l[0].indexOf('Ordem') === 0 && l[2] ? '✓' : l[1]) + '</span></li>'; }).join('');
  html += '<li class="' + (I.argola && I.haste && I.palhetao ? 'ok' : '') + '">Chave<span class="chave"><i class="' + (I.argola ? 'ok' : '') + '" title="Argola">A</i><i class="' + (I.haste ? 'ok' : '') + '" title="Haste">H</i><i class="' + (I.palhetao ? 'ok' : '') + '" title="Palhetão">P</i></span></li>';
  $('#invLista').innerHTML = html;
}
function renderBar() {
  $('#estacoes').innerHTML = C.estacoes.map(function (e) {
    var ok = e.id === 'cofre' ? S.finished : S.solved[e.id];
    return '<button class="est ' + (ok ? 'ok' : '') + '" type="button" data-id="' + e.id + '" aria-label="' + esc(e.n + '. ' + e.nome + (ok ? ' (resolvido)' : '')) + '"><span class="n">' + (ok ? '✓' : e.n) + '</span><span class="t">' + esc(e.nome) + '</span></button>';
  }).join('');
}
function refresh() { updateHud(); renderInv(); renderBar(); if (has3D) ENIGMAS.forEach(function (id) { Sala.setSolved(id, S.solved[id]); }); }

/* ---------- Relógio do jogo ---------- */
var last = Date.now();
setInterval(function () {
  var now = Date.now(), dt = now - last; last = now;
  if (S.started && !S.finished && !S.paused && document.visibilityState !== 'hidden') {
    S.elapsed += Math.min(dt, 2000);
    if (!S.warned && used() > GAME_MS) { S.warned = true; toast('São 18h00! A exposição devia abrir agora. Continuem: o tempo extra fica registado.', 'bad'); }
  }
  if (S.started) updateHud();
}, 250);
setInterval(function () { if (S.started) save(); }, 3000);

/* ---------- Abrir e fechar estações ---------- */
function openStation(id) {
  if (!S.started) return;
  if (id === 'telefone') { pedirPista(); return; }
  current = id; var e = EST[id];
  $('#pEyebrow').textContent = id === 'cofre' ? 'Final' : 'Enigma ' + e.n + ' · ' + e.nome;
  $('#pTitulo').textContent = e.titulo;
  $('#painel').hidden = false; msg('');
  $('#pPista').disabled = S.hints <= 0;
  render();
  if (has3D) Sala.focus(id);
  sfx.click();
}
function closeStation() { current = null; $('#painel').hidden = true; if (has3D) Sala.home(); }
function render() { if (!current) return; var body = $('#pBody'); body.innerHTML = ''; R[current](body); var hs = S.hintSeen[current]; if (hs && hs.length) { var d = document.createElement('div'); d.className = 'sabiam'; d.innerHTML = '<b>☎ Pistas do arquivo</b><br>' + hs.map(esc).join('<br>'); body.appendChild(d); } }

/* ---------- Pistas ---------- */
function pedirPista() {
  if (has3D) Sala.ring(); sfx.ring();
  if (!current) { toast('O arquivo atende! Abram primeiro um enigma e depois liguem para pedir uma pista.', 'gold'); return; }
  if (current !== 'cofre' && S.solved[current]) { msg('Este enigma já está resolvido.'); return; }
  var seen = S.hintSeen[current] = S.hintSeen[current] || [], list = C.pistas[current];
  if (seen.length >= list.length) { msg('O arquivo já não tem mais pistas para este enigma.'); return; }
  if (S.hints <= 0) { msg('Já usaram as 5 pistas.', 'bad'); return; }
  S.hints--; S.hintsUsed++; S.penalty += HINT_MS; seen.push(list[seen.length]);
  $('#pPista').disabled = S.hints <= 0;
  render(); msg('Pista recebida: o relógio avançou 2 minutos.', 'good'); save(); updateHud();
}

/* ---------- Resolver ---------- */
function solve(id, premio) {
  if (S.solved[id]) return;
  S.solved[id] = true; S.inv[premio] = true; sfx.good(); save(); refresh();
  var falta = 7 - nSolved();
  toast(falta ? 'Enigma resolvido! Faltam ' + falta + '.' : 'Os sete enigmas estão resolvidos. Vão ao cofre!', 'good');
}
function wrong(text) { S.errors++; sfx.bad(); msg(text, 'bad'); shake($('#pBody')); save(); }
function premioHtml(titulo, grande, texto, id) {
  return '<div class="premio"><b>' + titulo + '</b>' + (grande ? '<span class="grande">' + grande + '</span>' : '') + '<div>' + texto + '</div></div>' +
    (C.sabiam[id] ? '<div class="sabiam"><b>Sabiam que…</b> ' + esc(C.sabiam[id]) + '</div>' : '');
}

var R = {};
/* ---------- 1 · O nono rascunho ---------- */
R.maquina = function (body) {
  var st = S.sub.maquina = S.sub.maquina || { a: [] }, done = S.solved.maquina;
  var html = '<p class="lead">Na máquina de escrever está a última versão da declaração, mas faltam palavras. Escolham a palavra certa para cada frase.</p><div class="doc typed">';
  C.lacunas.forEach(function (l, i) {
    var ops = st.ops && st.ops[i] ? st.ops[i] : null;
    if (!ops) { st.ops = st.ops || []; ops = st.ops[i] = shuffle(l.opcoes); }
    html += '<div class="lacuna">' + esc(l.antes) + ' <span class="chips">' + ops.map(function (o) {
      var cls = st.a[i] === o ? 'sel' : ''; if (done && o === l.certa) cls = 'ok'; else if (st.mark && st.a[i] === o) cls = st.mark[i] ? 'ok' : 'no';
      return '<button type="button" class="chip ' + cls + '" data-i="' + i + '" data-o="' + esc(o) + '"' + (done ? ' disabled' : '') + '>' + esc(o) + '</button>';
    }).join('') + '</span> ' + esc(l.depois) + (done || (st.mark && st.mark[i]) ? '<div class="porque">' + esc(l.porque) + '</div>' : '') + '</div>';
  });
  html += '</div>';
  if (done) html += premioHtml('Nota do conservador', '', esc(C.notaOrdem), 'maquina');
  else html += '<div class="acoes"><button class="btn btn-gold" type="button" id="e1ok">Bater o texto</button></div>';
  body.innerHTML = html;
  body.onclick = function (e) {
    var c = e.target.closest('.chip'); if (c && !done) { st.a[+c.dataset.i] = c.dataset.o; st.mark = null; sfx.type(); render(); return; }
    if (e.target.id === 'e1ok') {
      if (C.lacunas.some(function (l, i) { return !st.a[i]; })) { msg('Falta escolher uma palavra em todas as frases.', 'bad'); return; }
      st.mark = C.lacunas.map(function (l, i) { return st.a[i] === l.certa; });
      var n = st.mark.filter(Boolean).length;
      if (n === C.lacunas.length) { solve('maquina', 'ordem'); if (has3D) Sala.setDraftDone(true); render(); msg('O texto está completo e certo.', 'good'); }
      else { render(); wrong(n + ' de 5 palavras certas. As que estão a vermelho não são do texto de Schuman.'); }
    }
  };
};

/* ---------- 2 · O dia mais longo ---------- */
R.relogio = function (body) {
  var st = S.sub.relogio = S.sub.relogio || { pool: shuffle(C.cronologia.map(function (c) { return c.id; })), placed: [] }, done = S.solved.relogio;
  var byId = {}; C.cronologia.forEach(function (c) { byId[c.id] = c; });
  if (done) st.placed = C.cronologia.map(function (c) { return c.id; });
  var html = '<p class="lead">O relógio da lareira parou. Para o pôr a andar, ponham os acontecimentos por ordem, do mais antigo para o mais recente. Toquem num cartão para o colocar; toquem na linha do tempo para o tirar.</p><div class="crono"><h3>Linha do tempo</h3><div class="slots">';
  for (var i = 0; i < C.cronologia.length; i++) {
    var id = st.placed[i];
    if (id) { var ok = st.mark ? (st.mark[i] ? ' ok' : ' no') : (done ? ' ok' : ''); html += '<div class="slot cheio' + ok + '" data-i="' + i + '" role="button" tabindex="0"><div><small>' + esc(byId[id].data) + '</small>' + esc(byId[id].txt) + '</div></div>'; }
    else html += '<div class="slot"></div>';
  }
  html += '</div>';
  var pool = st.pool.filter(function (id) { return st.placed.indexOf(id) < 0; });
  if (pool.length) html += '<h3>Cartões</h3><div class="cartas">' + pool.map(function (id) { return '<button type="button" class="carta" data-id="' + id + '"><small>' + esc(byId[id].data) + '</small>' + esc(byId[id].txt) + '</button>'; }).join('') + '</div>';
  html += '</div>';
  if (done) html += premioHtml('O relógio bateu seis vezes: são 18h00, a hora a que Schuman leu a declaração.', '18', 'Primeiro número da combinação.', 'relogio');
  else if (!pool.length) html += '<div class="acoes"><button class="btn btn-gold" type="button" id="e2ok">Acertar o relógio</button></div>';
  body.innerHTML = html;
  body.onclick = function (e) {
    if (done) return;
    var c = e.target.closest('.carta'); if (c) { st.placed.push(c.dataset.id); st.mark = null; sfx.click(); render(); return; }
    var s = e.target.closest('.slot.cheio'); if (s) { st.placed.splice(+s.dataset.i, 1); st.mark = null; render(); return; }
    if (e.target.id === 'e2ok') {
      st.mark = st.placed.map(function (id, i) { return C.cronologia[i].id === id; });
      var n = st.mark.filter(Boolean).length;
      if (n === C.cronologia.length) { solve('relogio', 'hora'); sfx.chime(6); render(); msg('Tic-tac! O relógio voltou a andar.', 'good'); }
      else { render(); wrong(n + ' de 7 cartões estão no lugar certo. Toquem nos vermelhos para os tirar.'); }
    }
  };
};

/* ---------- 3 · Os Seis ---------- */
var LBL = { FR: [2.4, 46.6, 'FR'], DE: [9.0, 50.6, 'RFA'], IT: [12.4, 42.9, 'IT'], BE: [4.4, 50.55, 'BE'], NL: [5.6, 52.3, 'NL'], LU: [6.6, 49.45, 'LU'], UK: [-1.8, 52.6, 'UK'], PT: [-8.1, 39.8, 'PT'], ES: [-3.7, 40.2, 'ES'], CH: [8.0, 46.8, 'CH'], AT: [14.3, 47.5, 'AT'], DK: [9.2, 56.1, 'DK'] };
var RDA = [[10.9, 54.0], [10.75, 53.6], [10.6, 53.36], [11.0, 53.2], [11.55, 52.95], [11.0, 52.78], [10.78, 52.5], [10.95, 52.07], [10.6, 51.65], [10.2, 51.45], [9.95, 51.25], [10.18, 50.95], [9.95, 50.62], [10.45, 50.38], [10.9, 50.33], [11.3, 50.45], [11.7, 50.38], [12.1, 50.32], [12.5, 50.4], [13.0, 50.55], [14.0, 50.85], [14.8, 50.87], [14.95, 51.5], [14.6, 52.6], [14.15, 52.9], [14.3, 53.3], [14.2, 53.9], [13.4, 54.6], [12.0, 54.2], [11.0, 54.05]];
R.mapa = function (body) {
  var st = S.sub.mapa = S.sub.mapa || { sel: {} }, done = S.solved.mapa;
  if (done) { st.sel = {}; Object.keys(C.paises).forEach(function (k) { if (C.paises[k].ok) st.sel[k] = true; }); }
  var P = Sala.proj, paths = (window.MAPA_EUROPA || []).map(function (m) {
    var cand = C.paises[m.id], cls = cand ? 'cand' : ''; if (st.sel[m.id]) cls += ' sel'; if (st.bad && st.bad[m.id]) cls += ' no';
    return '<path d="' + m.d + '" class="' + cls + '" data-id="' + (cand ? m.id : '') + '"/>';
  }).join('');
  var rda = 'M' + RDA.map(function (p) { var q = P(p[0], p[1]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join('L') + 'Z';
  var lu = P(6.13, 49.75);
  var basins = Sala.BASINS.map(function (b) { var q = P(b[1], b[2]); return '<path d="M' + q[0] + ',' + (q[1] - 4) + 'l3.5,6h-7z" fill="#1c1c1c"/>'; }).join('');
  var labels = Object.keys(LBL).map(function (k) { var q = P(LBL[k][0], LBL[k][1]); return '<text class="lbl" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" text-anchor="middle">' + LBL[k][2] + '</text>'; }).join('');
  var svg = '<svg viewBox="160 240 440 360" role="group" aria-label="Mapa da Europa Ocidental em 1950. Toquem nos países para os escolher.">' +
    '<defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#b9b3a6"/><line x1="0" y1="0" x2="0" y2="4" stroke="#8b1a1a" stroke-width="1.2"/></pattern></defs>' +
    paths + '<path d="' + rda + '" fill="url(#hatch)" stroke="#8b1a1a" stroke-width="1" stroke-dasharray="3 2" pointer-events="none"/>' +
    '<text class="lbl" x="' + P(12.6, 52.2)[0] + '" y="' + P(12.6, 52.2)[1] + '" text-anchor="middle" fill="#8b1a1a">RDA</text>' +
    '<circle class="lux ' + (st.sel.LU ? 'sel' : '') + '" cx="' + lu[0] + '" cy="' + lu[1] + '" r="4.5" data-id="LU"/>' + basins + labels + '</svg>';
  var chips = Object.keys(C.paises).map(function (k) { return '<button type="button" class="pchip ' + (st.sel[k] ? 'sel' : '') + (st.bad && st.bad[k] ? ' no' : '') + '" data-id="' + k + '"' + (done ? ' disabled' : '') + '>' + esc(C.paises[k].nome) + '</button>'; }).join('');
  var html = '<p class="lead">Que países assinaram o Tratado de Paris, em 1951? Escolham-nos no mapa ou na lista e leiam as notas do arquivo.</p>' +
    '<div class="mapa-wrap">' + svg + '</div><div class="paises-chips">' + chips + '</div>' +
    '<ul class="notas">' + C.notasMapa.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
  if (st.feedback) html += '<div class="sabiam">' + st.feedback + '</div>';
  if (done) html += premioHtml('Os Seis', '6', 'Segundo número da combinação.', 'mapa');
  else html += '<div class="acoes"><button class="btn btn-gold" type="button" id="e3ok">Confirmar os países</button></div>';
  body.innerHTML = html;
  body.onclick = function (e) {
    if (done) return;
    var t = e.target.closest('[data-id]'); if (t && t.dataset.id) { var k = t.dataset.id; if (st.sel[k]) delete st.sel[k]; else st.sel[k] = true; st.bad = null; st.feedback = ''; sfx.click(); if (has3D) Sala.setMapSelection(selMap()); render(); return; }
    if (e.target.id === 'e3ok') {
      var chosen = Object.keys(st.sel), bad = chosen.filter(function (k) { return !C.paises[k].ok; }), miss = Object.keys(C.paises).filter(function (k) { return C.paises[k].ok && !st.sel[k]; });
      if (!bad.length && !miss.length) { st.feedback = ''; solve('mapa', 'paises'); if (has3D) Sala.setMapSelection(selMap()); render(); msg('Certo: são os seis países fundadores.', 'good'); return; }
      st.bad = {}; bad.forEach(function (k) { st.bad[k] = true; });
      st.feedback = bad.map(function (k) { return '<b>' + esc(C.paises[k].nome) + ':</b> ' + esc(C.paises[k].porque); }).join('<br>') + (miss.length ? (bad.length ? '<br>' : '') + 'Ainda falta' + (miss.length > 1 ? 'm ' + miss.length + ' países.' : ' 1 país.') : '');
      render(); wrong(bad.length ? 'Há países a mais. Leiam porquê.' : 'Faltam países.');
    }
  };
  function selMap() { var o = {}; Object.keys(st.sel).forEach(function (k) { o[k] = C.paises[k].ok || !st.bad ? 'ok' : 'no'; }); return o; }
};

/* ---------- 4 · O Tratado de Paris ---------- */
R.tratado = function (body) {
  var st = S.sub.tratado = S.sub.tratado || { step: 1, a: {}, order: shuffle(C.signatarios.map(function (s, i) { return i; })) }, done = S.solved.tratado;
  var html = '';
  if (st.step === 1 && !done) {
    var opts = '<option value="">País…</option>' + Object.keys(C.selos).map(function (k) { return '<option value="' + k + '">' + esc(C.selos[k]) + '</option>'; }).join('');
    html += '<p class="lead">Na vitrina está o Tratado que criou a CECA, assinado em Paris a 18 de abril de 1951. As páginas das assinaturas descolaram-se dos selos. Liguem cada assinatura ao seu país: olhem para a língua do cargo e para a cidade.</p><div class="assin">' +
      st.order.map(function (i) { var s = C.signatarios[i], m = st.mark ? (st.mark[i] ? ' ok' : ' no') : ''; return '<div class="card' + m + '"><div><b>' + esc(s.nome) + '</b><small>' + esc(s.cargo) + ' · ' + esc(s.cidade) + '</small></div><select data-i="' + i + '" aria-label="País de ' + esc(s.nome) + '">' + opts.replace('value="' + (st.a[i] || '#') + '"', 'value="' + st.a[i] + '" selected') + '</select></div>'; }).join('') +
      '</div><p class="porque" style="color:var(--muted)">A Bélgica e os Países Baixos assinaram com dois ministros cada. Aqui aparece só um de cada.</p><div class="acoes"><button class="btn btn-gold" type="button" id="e4a">Colar as assinaturas</button></div>';
  } else {
    html += '<p class="lead">As assinaturas estão no lugar. Na última página do Tratado lê-se:</p><div class="doc"><p class="artigo"><b>Article 97</b><br>' + esc(C.artigo97) + '</p><p style="margin:0">O Tratado entrou em vigor a <b>23 de julho de 1952</b>.</p></div>';
    if (done) html += premioHtml('O Tratado esteve em vigor de 1952 a 2002.', '50', 'Terceiro número da combinação.', 'tratado');
    else html += '<div class="num-in"><label for="e4n">Quantos anos esteve o Tratado em vigor?</label></div><div class="num-in"><input id="e4n" inputmode="numeric" maxlength="4" autocomplete="off"><button class="btn btn-gold" type="button" id="e4b">Confirmar</button></div>';
  }
  body.innerHTML = html;
  body.onchange = function (e) { var s = e.target.closest('select'); if (s) { st.a[+s.dataset.i] = s.value; st.mark = null; } };
  body.onclick = function (e) {
    if (e.target.id === 'e4a') {
      if (C.signatarios.some(function (s, i) { return !st.a[i]; })) { msg('Escolham um país para cada assinatura.', 'bad'); return; }
      st.mark = C.signatarios.map(function (s, i) { return st.a[i] === s.pais; });
      var n = st.mark.filter(Boolean).length;
      if (n === 6) { st.step = 2; st.mark = null; sfx.good(); render(); msg('Assinaturas certas! Agora leiam o artigo 97.', 'good'); }
      else { render(); wrong(n + ' de 6 assinaturas certas.'); }
    }
    if (e.target.id === 'e4b') checkN();
  };
  var inp = $('#e4n', body); if (inp) { inp.onkeydown = function (e) { if (e.key === 'Enter') checkN(); }; }
  function checkN() {
    var v = parseInt(($('#e4n', body) || {}).value, 10);
    if (v === 50) { solve('tratado', 'anos'); render(); msg('Certo: cinquenta anos.', 'good'); }
    else if (v === 2002) wrong('2002 é o ano em que o Tratado terminou. Quantos ANOS durou?');
    else if (v === 1952 || v === 1951) wrong('Esse é um ano. Pedimos o número de anos que o Tratado esteve em vigor.');
    else wrong('Não é esse número. «Cinquante», em francês, lembra que palavra portuguesa?');
  }
};

/* ---------- 5 · Telegrama cifrado ---------- */
var AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function caesar(t, k) { return t.replace(/[A-Z]/g, function (ch) { return AB[(AB.indexOf(ch) + k + 26) % 26]; }); }
R.telegrama = function (body) {
  var st = S.sub.telegrama = S.sub.telegrama || { k: 0 }, done = S.solved.telegrama, key = C.telegrama.chave;
  if (done) st.k = key;
  var cif = C.telegrama.linhas.map(function (l) { return caesar(l, key); });
  var html = '<p class="lead">Na mesa está um telegrama cifrado enviado de Bona na manhã de 9 de maio de 1950, e um disco de cifra. Por baixo do telegrama, a lápis: <b>«A chave é o dia do mês em que tudo começou.»</b></p>' +
    '<div class="doc tele"><div><b>TELEGRAMME · BONN · 9 MAI 1950 · 11H</b></div><br>' + cif.map(function (l) { return '<div class="linha">' + l + '</div>'; }).join('') +
    '<hr style="border:0;border-top:1px dashed #8b7550"><div style="font-size:.8rem">A ler com a chave ' + st.k + ':</div>' + cif.map(function (l) { return '<div class="linha dec">' + caesar(l, -st.k) + '</div>'; }).join('') + '</div>' +
    '<div class="disco">' + discSvg(st.k) + '<div class="ctl"><div>Chave do disco</div><div class="row"><button class="btn btn-sm" type="button" id="kMenos" aria-label="Rodar para trás">◀</button><span class="k" id="kVal">' + st.k + '</span><button class="btn btn-sm" type="button" id="kMais" aria-label="Rodar para a frente">▶</button></div>' +
    (done ? '' : '<button class="btn btn-gold" type="button" id="e5ok">Esta é a chave</button>') + '</div></div>' +
    '<p class="porque" style="color:var(--muted)">Recriação para o jogo: a mensagem foi traduzida para português. O enviado de Schuman a Bona chamava-se Robert Mischlich.</p>';
  if (done) html += premioHtml('Dentro do envelope do telegrama estava a argola da chave.', '', 'Primeira parte da chave: <b>argola</b>.', 'telegrama');
  body.innerHTML = html;
  body.onclick = function (e) {
    if (e.target.id === 'kMenos' || e.target.id === 'kMais') { if (done) return; st.k = (st.k + (e.target.id === 'kMais' ? 1 : 25)) % 26; sfx.click(); if (has3D) Sala.setCipher(st.k); render(); return; }
    if (e.target.id === 'e5ok') {
      if (st.k === key) { solve('telegrama', 'argola'); render(); msg('Mensagem decifrada: Adenauer aceitou o plano!', 'good'); }
      else wrong('Com a chave ' + st.k + ' a mensagem não faz sentido. Lembrem-se: o dia do mês em que tudo começou.');
    }
  };
};
function discSvg(k) {
  var s = '<svg viewBox="-100 -100 200 200" aria-hidden="true"><circle r="98" fill="#e3cf95" stroke="#8a6a2a" stroke-width="2"/><circle r="66" fill="#cdb06a" stroke="#8a6a2a" stroke-width="2"/>';
  for (var i = 0; i < 26; i++) {
    var a = i / 26 * Math.PI * 2, x = Math.sin(a) * 82, y = -Math.cos(a) * 82;
    s += '<text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#2a1d0c" font-family="Georgia">' + AB[i] + '</text>';
    var x2 = Math.sin(a) * 52, y2 = -Math.cos(a) * 52;
    s += '<text x="' + x2.toFixed(1) + '" y="' + (y2 + 4).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#6a1010" font-family="Georgia">' + AB[(i + k) % 26] + '</text>';
  }
  return s + '<circle r="6" fill="#b8924a"/><text y="4" text-anchor="middle" font-size="9" fill="#2a1d0c">' + k + '</text></svg>';
}

/* ---------- 6 · Os pais fundadores ---------- */
R.retratos = function (body) {
  var st = S.sub.retratos = S.sub.retratos || { a: {}, order: shuffle(C.pais.map(function (p, i) { return i; })) }, done = S.solved.retratos;
  var opts = '<option value="">Quem é?</option>' + C.pais.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nome) + '</option>'; }).join('');
  var html = '<p class="lead">No painel da exposição, as fotografias perderam as legendas. Leiam as biografias e digam quem é quem.</p><div class="retr">' +
    st.order.map(function (i) { var p = C.pais[i], m = done ? ' ok' : st.mark ? (st.mark[i] ? ' ok' : ' no') : ''; var sel = done ? p.id : st.a[i]; return '<div class="card' + m + '"><div class="foto" aria-hidden="true"></div><div><p>' + esc(p.bio) + '</p><select data-i="' + i + '"' + (done ? ' disabled' : '') + ' aria-label="Nome">' + opts.replace('value="' + (sel || '#') + '"', 'value="' + sel + '" selected') + '</select></div></div>'; }).join('') + '</div>';
  if (done) html += premioHtml('Atrás do painel estava pendurada a haste da chave.', '', 'Segunda parte da chave: <b>haste</b>.', 'retratos');
  else html += '<div class="acoes"><button class="btn btn-gold" type="button" id="e6ok">Pôr as legendas</button></div>';
  body.innerHTML = html;
  body.onchange = function (e) { var s = e.target.closest('select'); if (s) { st.a[+s.dataset.i] = s.value; st.mark = null; } };
  body.onclick = function (e) {
    if (e.target.id !== 'e6ok') return;
    if (C.pais.some(function (p, i) { return !st.a[i]; })) { msg('Escolham um nome para cada biografia.', 'bad'); return; }
    st.mark = C.pais.map(function (p, i) { return st.a[i] === p.id; });
    var n = st.mark.filter(Boolean).length;
    if (n === 4) { solve('retratos', 'haste'); render(); msg('Legendas certas!', 'good'); }
    else { render(); wrong(n + ' de 4 legendas certas.'); }
  };
};

/* ---------- 7 · Verdade ou mentira? ---------- */
R.jornais = function (body) {
  var st = S.sub.jornais = S.sub.jornais || { a: {} }, done = S.solved.jornais;
  var html = '<p class="lead">Na manhã de 10 de maio de 1950, os jornais falavam da proposta de Schuman. Mas o arquivo misturou manchetes verdadeiras com manchetes falsas. Para cada uma, decidam: <b>V</b>erdadeira ou <b>F</b>alsa?</p><div class="manch">' +
    C.manchetes.map(function (m, i) {
      var a = done ? m.v : st.a[i], mk = done ? ' ok' : st.mark ? (st.mark[i] ? ' ok' : ' no') : '';
      return '<div class="m' + mk + '"><div>' + esc(m.t) + '</div><div class="vf"><button type="button" data-i="' + i + '" data-v="1" class="' + (a === true ? 'sel' : '') + '"' + (done ? ' disabled' : '') + '>V</button><button type="button" data-i="' + i + '" data-v="0" class="' + (a === false ? 'sel' : '') + '"' + (done ? ' disabled' : '') + '>F</button></div>' +
        ((done || (st.mark && st.mark[i])) ? '<p class="porque">' + esc(m.porque) + '</p>' : '') + '</div>';
    }).join('') + '</div>';
  if (done) html += premioHtml('Dobrado dentro do último jornal estava o palhetão da chave.', '', 'Terceira parte da chave: <b>palhetão</b>.', 'jornais');
  else html += '<div class="acoes"><button class="btn btn-gold" type="button" id="e7ok">Verificar as manchetes</button></div>';
  body.innerHTML = html;
  body.onclick = function (e) {
    if (done) return;
    var b = e.target.closest('[data-v]'); if (b) { st.a[+b.dataset.i] = b.dataset.v === '1'; st.mark = null; sfx.click(); render(); return; }
    if (e.target.id === 'e7ok') {
      if (C.manchetes.some(function (m, i) { return st.a[i] === undefined; })) { msg('Respondam a todas as manchetes.', 'bad'); return; }
      st.mark = C.manchetes.map(function (m, i) { return st.a[i] === m.v; });
      var n = st.mark.filter(Boolean).length;
      if (n === C.manchetes.length) { solve('jornais', 'palhetao'); render(); msg('Todas certas!', 'good'); }
      else { render(); wrong(n + ' de 7 certas. As que estão a vermelho têm a resposta errada.'); }
    }
  };
};

/* ---------- ★ · O cofre ---------- */
var lockTimer = null;
R.cofre = function (body) {
  var st = S.sub.cofre = S.sub.cofre || { v: [0, 0, 0], active: 0, comboOk: false }, I = S.inv;
  var locked = Date.now() < S.lockUntil;
  var falta = [];
  if (!I.ordem) falta.push('a ordem da combinação (enigma 1)');
  if (!I.hora) falta.push('o 1.º número (enigma 2)');
  if (!I.paises) falta.push('o 2.º número (enigma 3)');
  if (!I.anos) falta.push('o 3.º número (enigma 4)');
  if (!I.argola) falta.push('a argola da chave (enigma 5)');
  if (!I.haste) falta.push('a haste da chave (enigma 6)');
  if (!I.palhetao) falta.push('o palhetão da chave (enigma 7)');
  var dirs = ['para a direita', 'para a esquerda', 'para a direita'];
  var html = '<div class="cofre-ui"><p class="lead" style="margin:0">Um cofre parisiense dos anos 1920. Para o abrir é preciso rodar o marcador até três números e, depois, usar a chave.</p>' +
    (falta.length ? '<div class="falta">Ainda vos falta:<ul>' + falta.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul></div>' : '<div class="falta" style="color:#9fe0b0">Têm tudo o que precisam!</div>') +
    '<div class="combo">' + [0, 1, 2].map(function (i) {
      return '<div class="roda" data-r="' + i + '"><span class="dir">' + (i + 1) + '.º · ' + dirs[i] + '</span><span class="val">' + pad(st.v[i]) + '</span><div class="bts"><button type="button" data-r="' + i + '" data-d="-10">−10</button><button type="button" data-r="' + i + '" data-d="-1">−1</button><button type="button" data-r="' + i + '" data-d="1">+1</button><button type="button" data-r="' + i + '" data-d="10">+10</button></div></div>';
    }).join('') + '</div>' +
    '<div class="row"><button class="btn btn-gold" type="button" id="cTenta"' + (locked || st.comboOk ? ' disabled' : '') + '>Rodar o marcador</button><span id="cInfo" style="align-self:center;color:var(--muted)">' + (st.comboOk ? 'Combinação certa: o trinco soltou-se!' : locked ? 'Cofre bloqueado.' : 'Tentativas: ' + S.attempts + ' de 3') + '</span></div>' +
    '<div class="chave-ui"><span>Chave:</span><span class="peca ' + (I.argola ? 'ok' : '') + '">argola</span><span class="peca ' + (I.haste ? 'ok' : '') + '">haste</span><span class="peca ' + (I.palhetao ? 'ok' : '') + '">palhetão</span></div>' +
    '<div class="row"><button class="btn btn-gold" type="button" id="cAbre"' + (st.comboOk && I.argola && I.haste && I.palhetao ? '' : ' disabled') + '>Montar a chave e abrir o cofre</button></div></div>';
  body.innerHTML = html;
  if (locked) {
    clearInterval(lockTimer);
    lockTimer = setInterval(function () { var s = Math.ceil((S.lockUntil - Date.now()) / 1000); var el = $('#cInfo'); if (!el || current !== 'cofre') { clearInterval(lockTimer); return; } if (s <= 0) { clearInterval(lockTimer); render(); } else el.textContent = 'Cofre bloqueado: ' + s + ' s'; }, 500);
  }
  body.onclick = function (e) {
    var b = e.target.closest('[data-d]');
    if (b && !st.comboOk) { var r = +b.dataset.r; st.v[r] = (st.v[r] + (+b.dataset.d) + 100) % 100; sfx.click(); if (has3D) Sala.setDial(st.v[r]); render(); return; }
    if (e.target.id === 'cTenta') {
      if (Date.now() < S.lockUntil) return;
      if (has3D) Sala.spinDial(2);
      if (st.v[0] === COMBO[0] && st.v[1] === COMBO[1] && st.v[2] === COMBO[2]) { st.comboOk = true; sfx.good(); save(); render(); msg(I.argola && I.haste && I.palhetao ? 'Ouviu-se um clique. Agora a chave!' : 'Ouviu-se um clique. Falta a chave completa.', 'good'); }
      else {
        S.attempts--;
        if (S.attempts <= 0) { S.lockUntil = Date.now() + 60000; S.attempts = 3; toast('Três tentativas erradas: o cofre bloqueou durante 1 minuto.', 'bad'); }
        render(); wrong('O trinco não se mexe. Confirmem os números e a ordem.');
      }
    }
    if (e.target.id === 'cAbre') abrirCofre();
  };
};
function abrirCofre() {
  if (S.finished) return;
  S.finished = true; S.finalTime = used(); save();
  sfx.safe(); if (has3D) Sala.openSafe();
  msg('A porta do cofre está a abrir…', 'good');
  setTimeout(function () { closeStation(); showFinal(); }, has3D && !RM ? 3600 : 400);
  renderBar();
}

/* ---------- Final ---------- */
function showFinal() {
  var t = S.finalTime, late = t > GAME_MS;
  var h = '<p class="eyebrow">Missão cumprida · 18h00 · Sala do Relógio</p><h1>O cofre <em>está aberto!</em></h1>' +
    '<p class="lead">Lá dentro estava a cópia da Declaração Schuman. A exposição pode abrir.' + (late ? ' Chegaram um pouco atrasados, mas conseguiram.' : ' E chegaram a tempo!') + '</p>' +
    '<div class="cert"><span class="eyebrow">Certificado · Guardiões da Declaração</span><span class="eq">' + esc(S.team || 'Equipa') + '</span><span>abriu o Cofre de Schuman em <b>' + fmtLong(t) + '</b>' + (late ? ' (' + fmtLong(t - GAME_MS) + ' depois das 18h00)' : '') + '.</span><span>Pistas usadas: ' + S.hintsUsed + ' · Respostas erradas: ' + S.errors + '</span></div>' +
    '<div class="row no-print" style="margin-top:12px"><button class="btn" type="button" id="fImprimir">Imprimir certificado</button><button class="btn" type="button" id="fSala">Ver a sala</button><button class="btn btn-gold" type="button" id="fDeNovo">Jogar de novo</button></div>' +
    '<h2>A Declaração em seis ideias</h2><div class="resumo">' + C.resumo.map(function (r) { return '<div><b>' + esc(r[0]) + '</b>' + esc(r[1]) + '</div>'; }).join('') + '</div>' +
    '<h2>O texto integral</h2><details class="integral" open><summary>Declaração de 9 de maio de 1950 · ler o texto completo</summary><div class="paper declaracao">' + C.declaracao.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
    '<p class="fonte">Tradução portuguesa publicada no portal oficial da União Europeia (european-union.europa.eu).</p></div></details>' +
    '<h2>O que descobriram</h2><ul>' + ENIGMAS.map(function (id) { return '<li>' + esc(C.sabiam[id]) + '</li>'; }).join('') + '</ul>' +
    '<h2>Para conversar na turma</h2><ul>' + C.conversar.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul>' +
    '<h2>Fontes</h2><ul>' + C.fontes.map(function (f) { return '<li><a href="' + f[1] + '" target="_blank" rel="noopener">' + esc(f[0]) + '</a></li>'; }).join('') + '</ul>';
  $('#finalBody').innerHTML = h; $('#final').hidden = false; $('#final').scrollTop = 0;
  $('#fImprimir').onclick = function () { window.print(); };
  $('#fSala').onclick = function () { $('#final').hidden = true; toast('Toquem no cofre (★) para voltar a ver a Declaração.', 'gold'); };
  $('#fDeNovo').onclick = restart;
}

/* ---------- Guia do professor ---------- */
function showGuia() {
  var sol = [
    ['1 · O nono rascunho', 'criativos · facto · Alemanha · carvão · impossível', 'Ordem da combinação: hora, países, anos'],
    ['2 · O dia mais longo', '1945 → Bona de manhã → Conselho de Ministros → 18h00 → 1951 → 1952 → 1985', '18'],
    ['3 · Os Seis', 'França, RFA, Itália, Bélgica, Países Baixos, Luxemburgo', '6'],
    ['4 · O Tratado de Paris', 'Adenauer–RFA, Van Zeeland–Bélgica, Schuman–França, Sforza–Itália, Bech–Luxemburgo, Stikker–Países Baixos; artigo 97: 50 anos', '50'],
    ['5 · Telegrama cifrado', 'Chave 9 (9 de maio): ADENAUER ACEITA O PLANO', 'Argola'],
    ['6 · Os pais fundadores', 'Luxemburgo 1886 = Schuman; conhaque = Monnet; Colónia = Adenauer; Trentino = De Gasperi', 'Haste'],
    ['7 · Verdade ou mentira?', 'V, F, F, V, F, F, V', 'Palhetão'],
    ['★ · O cofre', '18 · 6 · 50 e a chave com as três partes', 'Fim']
  ];
  var h = '<p class="aviso">Esta janela mostra as soluções. Não a abram à frente dos alunos.</p>' +
    '<h3>Em resumo</h3><p>«Carvão e Aço: a Missão Schuman» é a 2.ª versão de «O Cofre de Schuman». É um escape room 3D para o 3.º ciclo (História e Cidadania e Desenvolvimento) sobre a Declaração Schuman. As equipas, de 4 a 6 alunos, têm 40 minutos (das 17h20 às 18h00 no relógio da sala) para resolver sete enigmas, por qualquer ordem, e abrir o cofre. Há 5 pistas; cada uma custa 2 minutos. No fim, aparecem um resumo da Declaração em seis ideias, o texto integral oficial em português, perguntas para debate e um certificado para imprimir.</p>' +
    '<h3>Soluções</h3><table><tr><th>Enigma</th><th>Solução</th><th>Dá</th></tr>' + sol.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</table>' +
    '<h3>Sugestão de sessão (50 min)</h3><p>5 min de arranque (ler a história e formar equipas), 40 min de jogo e 5 min de balanço com o resumo final. Numa sessão dupla, usem a segunda parte para ler o texto integral e discutir as perguntas do fim.</p>' +
    '<h3>Rigor histórico</h3><p>A história do jogo (o conservador, o cofre, o telegrama em português) é inventada e está assinalada como tal. As citações seguem a tradução portuguesa oficial do portal da União Europeia. A Sala do Relógio (Salon de l\'Horloge) do Quai d\'Orsay é a sala verdadeira onde a declaração foi lida às 18h00. As bandeiras da sala (França e União Europeia) pertencem à exposição de hoje: a bandeira europeia só foi adotada em 1955 pelo Conselho da Europa e em 1985 pelas Comunidades.</p>' +
    '<h3>Problemas frequentes</h3><p>Se a sala 3D não aparecer, o computador não suporta WebGL: o jogo funciona na mesma com a barra de baixo. O progresso fica guardado neste browser. Entre turmas, usem o botão abaixo.</p>' +
    '<div class="row" style="margin-top:14px"><button class="btn" type="button" id="gReset">Recomeçar o jogo (apaga o progresso)</button></div>' +
    '<h3>Fontes</h3><ul>' + C.fontes.map(function (f) { return '<li><a href="' + f[1] + '" target="_blank" rel="noopener">' + esc(f[0]) + '</a></li>'; }).join('') + '</ul>';
  $('#guiaBody').innerHTML = h; $('#mGuia').hidden = false;
  var armed = false;
  $('#gReset').onclick = function () { if (!armed) { armed = true; this.textContent = 'Carreguem outra vez para confirmar'; return; } restart(); };
}
function pedirSenha() { $('#senha').value = ''; $('#senhaMsg').textContent = ''; $('#mSenha').hidden = false; setTimeout(function () { $('#senha').focus(); }, 50); }
function restart() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }

/* ---------- Introdução ---------- */
function typeStory() {
  var box = $('#story'); box.innerHTML = '';
  if (RM) { box.innerHTML = C.historia.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); return; }
  var pi = 0, ci = 0, p = null;
  (function tick() {
    if (pi >= C.historia.length) return;
    if (!p) { p = document.createElement('p'); box.appendChild(p); }
    ci++; p.textContent = C.historia[pi].slice(0, ci);
    if (ci >= C.historia[pi].length) { pi++; ci = 0; p = null; setTimeout(tick, 380); } else setTimeout(tick, 18);
  })();
  box.onclick = function () { pi = C.historia.length; box.innerHTML = C.historia.map(function (q) { return '<p>' + esc(q) + '</p>'; }).join(''); };
}
function startGame(resume) {
  if (!resume) { var team = $('#equipa').value.trim(); S = fresh(); S.team = team || 'Equipa'; S.sound = soundPref; }
  S.started = true; S.paused = false; last = Date.now(); save();
  $('#intro').hidden = true; $('#hudStats').hidden = false; $('#inventario').hidden = false; $('#estacoes').hidden = false; $('#btnPausa').hidden = false; $('#btnCaderno').hidden = false;
  if (has3D) {
    Sala.setDraftDone(!!S.solved.maquina);
    if (S.sub.mapa && S.solved.mapa) { var o = {}; Object.keys(C.paises).forEach(function (k) { if (C.paises[k].ok) o[k] = 'ok'; }); Sala.setMapSelection(o); }
    if (S.solved.telegrama) Sala.setCipher(C.telegrama.chave);
    if (S.finished) Sala.openSafe(true);
    var d = $('#dicaRato'); d.textContent = 'Arrastem para olhar à volta · toquem nos números dourados'; d.hidden = false; setTimeout(function () { d.style.opacity = 0; }, 6000); setTimeout(function () { d.hidden = true; }, 7200);
  }
  refresh();
  if (S.finished) showFinal();
  else toast(resume ? 'Bem-vindos de volta, ' + S.team + '!' : 'Boa sorte, ' + S.team + '! São 17h20.', 'gold');
}

/* ---------- Ligações ---------- */
var soundPref = true;
function bind() {
  $('#startForm').onsubmit = function (e) { e.preventDefault(); ac(); startGame(false); };
  $('#btnContinuar').onclick = function () { ac(); startGame(true); };
  $('#pFechar').onclick = closeStation;
  $('#pPista').onclick = pedirPista;
  $('#estacoes').onclick = function (e) { var b = e.target.closest('[data-id]'); if (!b) return; if (b.dataset.id === 'cofre' && S.finished) { showFinal(); return; } openStation(b.dataset.id); };
  $('#btnPausa').onclick = function () { S.paused = true; save(); $('#mPausa').hidden = false; };
  $('#btnRetomar').onclick = function () { S.paused = false; last = Date.now(); save(); $('#mPausa').hidden = true; };
  $('#btnSom').onclick = function () { S.sound = soundPref = !S.sound; this.textContent = (S.sound ? '🔊' : '🔇') + ' Som'; this.setAttribute('aria-pressed', S.sound); save(); };
  $('#btnGuia').onclick = pedirSenha;
  $('#fSenha').onsubmit = function (e) {
    e.preventDefault();
    if ($('#senha').value.trim().toUpperCase() === 'PROFESSOR') { $('#mSenha').hidden = true; showGuia(); }
    else { $('#senhaMsg').textContent = 'Senha errada.'; shake($('#fSenha')); $('#senha').select(); }
  };
  $('#senhaCancelar').onclick = function () { $('#mSenha').hidden = true; };
  $('#btnCaderno').onclick = function () { $('#inventario').classList.toggle('aberto'); };
  $('#gFechar').onclick = function () { $('#mGuia').hidden = true; };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!$('#mSenha').hidden) $('#mSenha').hidden = true; else if (!$('#mGuia').hidden) $('#mGuia').hidden = true; else if (current) closeStation(); }
  });
}
function initScene() {
  var tip = $('#tooltip');
  try {
    has3D = !!(window.THREE && Sala.init($('#sala'), {
      reducedMotion: RM,
      low: (navigator.hardwareConcurrency || 4) <= 2,
      onPick: function (id) { if (!S.started) return; if (id === 'cofre' && S.finished) { showFinal(); return; } openStation(id); },
      onHover: function (id, e) {
        if (!id || !S.started) { tip.hidden = true; return; }
        var name = id === 'telefone' ? 'Telefone · pedir uma pista ao arquivo' : EST[id].n + ' · ' + EST[id].nome + ((id !== 'cofre' && S.solved[id]) ? ' ✓' : '');
        tip.textContent = name; tip.hidden = false; if (e) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
      }
    }));
  } catch (err) { console.error(err); has3D = false; }
  if (!has3D) { $('#semWebgl').hidden = false; $('#semWebgl').innerHTML = '<p>Este dispositivo não mostra a sala em 3D. O jogo funciona na mesma: usem a barra de baixo para abrir cada peça da exposição.</p>'; }
}

/* ---------- Arranque ---------- */
bind(); initScene();
var saved = load();
if (saved && saved.v === 2 && saved.started) {
  S = saved; soundPref = S.sound; $('#btnSom').textContent = (S.sound ? '🔊' : '🔇') + ' Som';
  $('#btnContinuar').hidden = false; $('#btnContinuar').textContent = 'Continuar (' + S.team + ')';
  $('#equipa').required = false;
}
typeStory();
window.__jogo = { S: function () { return S; }, open: openStation, solveAll: function () { ENIGMAS.forEach(function (id, i) { S.solved[id] = true; }); ['ordem', 'hora', 'paises', 'anos', 'argola', 'haste', 'palhetao'].forEach(function (k) { S.inv[k] = true; }); refresh(); }, abrir: abrirCofre, final: showFinal, close: closeStation };
})();

/* ============================================================
   Missão Europa — estado do jogo, interface, caderno, conclusão
   ============================================================ */
"use strict";

window.App = (function () {
  const D = window.DADOS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => window.Desafios.esc(s);
  const CHAVE = "missaoEuropa_v1";
  const TOTAL_ESTRELAS = 12;

  const TODAS_PISTAS = Object.keys(D.PISTAS);
  const TODOS_DESAFIOS = Object.keys(D.DESAFIOS);

  let estado = novoEstado(2);

  function novoEstado(nivel) {
    return { nivel, sala: "atrio", pistas: {}, ordemPistas: [], desafios: {}, completo: false, inicio: Date.now(), tempoAcumulado: 0 };
  }

  /* ---------- Guardar / carregar (opcional; falha em silêncio) ---------- */
  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify({ ...estado, tempoAcumulado: tempoJogo(), inicio: Date.now() })); } catch (e) { /* sem armazenamento */ }
  }
  function carregar() {
    try { const s = localStorage.getItem(CHAVE); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function apagar() { try { localStorage.removeItem(CHAVE); } catch (e) {} }
  function tempoJogo() { return estado.tempoAcumulado + (Date.now() - estado.inicio); }

  /* ---------- Contagens ---------- */
  const estrelas = () => TODOS_DESAFIOS.filter(id => estado.desafios[id] && estado.desafios[id].feito).length;
  const pontos = () => TODOS_DESAFIOS.reduce((s, id) => s + ((estado.desafios[id] && estado.desafios[id].pontos) || 0), 0);
  const nPistas = () => Object.keys(estado.pistas).length;
  function estrelasSala(sala) { return TODOS_DESAFIOS.filter(id => D.DESAFIOS[id].sala === sala && estado.desafios[id] && estado.desafios[id].feito).length; }
  function pistasEmFalta(desafioId) { return D.DESAFIOS[desafioId].requer.filter(p => !estado.pistas[p]); }

  /* ---------- Estado de cada objeto (usado também pelo mundo) ---------- */
  function estadoObjeto(o) {
    switch (o.tipo) {
      case "pista": return estado.pistas[o.id] ? "vista" : "nova";
      case "desafio":
        if (estado.desafios[o.id] && estado.desafios[o.id].feito) return "feito";
        return pistasEmFalta(o.id).length ? "bloqueado" : "disponivel";
      case "porta": return estrelasSala(o.destino) === 2 ? "concluida" : "aberta";
      case "pedestal": return estrelas() >= TOTAL_ESTRELAS ? "pronto" : "incompleto";
      default: return "";
    }
  }
  function descricaoEstado(o) {
    const e = estadoObjeto(o);
    switch (o.tipo) {
      case "pista": return e === "vista" ? "✔ investigado" : "🔍 por investigar";
      case "desafio": return e === "feito" ? "✅ estrela recuperada" : e === "bloqueado" ? "🔒 faltam pistas" : "⭐ disponível";
      case "porta": return `${estrelasSala(o.destino)}/2 ⭐ · ${pistasSala(o.destino).vistas}/${pistasSala(o.destino).total} pistas`;
      case "saida": return "voltar ao átrio";
      case "pedestal": return `${estrelas()}/12 ⭐`;
    }
    return "";
  }
  function icone(o, e) {
    if (o.tipo === "pista") return e === "vista" ? "✔" : "🔍";
    if (o.tipo === "desafio") return e === "feito" ? "★" : e === "bloqueado" ? "🔒" : "⭐";
    if (o.tipo === "porta") return ICONE_SALA[o.destino] || "🚪";
    return { saida: "↩", pedestal: "🏛️" }[o.tipo] || "•";
  }

  /* ---------- Mensagens ---------- */
  function mensagem(txt, tipo) { $("mensagem").textContent = txt; toast(txt, tipo || "info"); }
  function toast(txt, tipo) {
    const cx = $("toasts"); if (!cx) return;
    const el = document.createElement("div");
    el.className = "toast-jogo " + (tipo || "info"); el.textContent = txt;
    cx.appendChild(el);
    while (cx.children.length > 3) cx.firstChild.remove();
    setTimeout(() => { el.classList.add("sai"); setTimeout(() => el.remove(), 400); }, tipo === "aviso" ? 5200 : 4200);
  }

  /* ---------- Painel ---------- */
  let estrelasAntes = -1;
  function salaSugerida() { return D.ORDEM_SALAS.find(s => estrelasSala(s) < 2); }
  function pistasSala(sid) {
    const ids = D.SALAS[sid].objetos.filter(o => o.tipo === "pista").map(o => o.id);
    return { total: ids.length, vistas: ids.filter(i => estado.pistas[i]).length };
  }
  function atualizarPainel() {
    const n = estrelas();
    const cont = $("estrelasPainel");
    cont.innerHTML = "";
    for (let i = 0; i < TOTAL_ESTRELAS; i++) {
      const s = document.createElement("span");
      s.className = "e" + (i < n ? " on" : "") + (estrelasAntes >= 0 && i >= estrelasAntes && i < n ? " nova" : "");
      s.textContent = "★"; s.setAttribute("aria-hidden", "true");
      cont.appendChild(s);
    }
    estrelasAntes = n;
    cont.setAttribute("aria-label", `${n} de 12 estrelas recuperadas`);
    $("pontos").textContent = pontos();
    $("contaPistas").textContent = `${nPistas()}/${TODAS_PISTAS.length}`;
    $("contaCaderno").textContent = nPistas();
    $("nivelTexto").textContent = estado.nivel === 3 ? "Embaixador · 3.º ciclo" : "Explorador · 2.º ciclo";

    const sala = D.SALAS[estado.sala];
    $("nomeSala").textContent = sala.nome;
    $("migalhaSala").textContent = sala.nome;
    $("progressoSala").textContent = estado.sala === "atrio" ? `${n}/12` : `${estrelasSala(estado.sala)}/2`;
    $("progressoSala").parentElement.title = estado.sala === "atrio" ? "Estrelas recuperadas" : "Estrelas desta sala";

    // objetivo
    let obj;
    if (estado.completo) obj = "Missão cumprida! Podes rever o caderno ou explorar livremente.";
    else if (n >= TOTAL_ESTRELAS) obj = estado.sala === "atrio" ? "Tens as 12 estrelas! Leva-as ao pedestal da bandeira, no centro do átrio." : "Tens as 12 estrelas! Volta ao átrio e leva-as ao pedestal da bandeira.";
    else if (estado.sala === "atrio") obj = `Há 2 estrelas em cada sala. Sugestão: entra na sala ${D.ORDEM_SALAS.indexOf(salaSugerida()) + 1}, «${D.SALAS[salaSugerida()].curto}».`;
    else if (estrelasSala(estado.sala) === 2) obj = "Sala concluída! Escolhe outra sala no mapa ou volta ao átrio.";
    else {
      const ps = pistasSala(estado.sala);
      obj = ps.vistas < ps.total ? `Investiga os objetos 🔍 (${ps.vistas}/${ps.total}) e resolve as 2 estações ⭐ desta sala.` : "Já tens as pistas todas: resolve as estações ⭐ desta sala.";
    }
    $("textoObjetivo").textContent = obj;

    // lista de objetos, agrupada
    const lista = $("listaObjetos");
    lista.innerHTML = "";
    const grupos = [
      ["Estações ⭐", sala.objetos.filter(o => o.tipo === "desafio" || o.tipo === "pedestal")],
      ["Objetos para investigar", sala.objetos.filter(o => o.tipo === "pista")],
      [estado.sala === "atrio" ? "Portas das salas" : "Saída", sala.objetos.filter(o => o.tipo === "porta" || o.tipo === "saida")]
    ];
    grupos.forEach(([titulo, objs]) => {
      if (!objs.length) return;
      const h = document.createElement("div"); h.className = "grupo-sala"; h.textContent = titulo; lista.appendChild(h);
      objs.forEach(o => {
        const b = document.createElement("button");
        const e = estadoObjeto(o);
        b.type = "button"; b.className = "item-sala " + e;
        const est = descricaoEstado(o);
        b.innerHTML = `<span class="ico" aria-hidden="true">${icone(o, e)}</span><span class="txt">${esc(o.rotulo)}<span class="est">${esc(est)}</span></span>`;
        b.setAttribute("aria-label", `${o.rotulo} — ${est.replace(/[^\p{L}\p{N}/ ]/gu, "").trim()}`);
        b.addEventListener("click", () => {
          if (window.Mundo && window.Mundo.ativo && o.tipo !== "porta" && o.tipo !== "saida") window.Mundo.irPara(o);
          else interagir(o);
          if (matchMedia("(max-width: 860px)").matches) fecharPainelSala(true);
    if (matchMedia("(max-height: 520px)").matches) $("btnRecolherMissao").click();
        });
        lista.appendChild(b);
      });
    });
    const ps = estado.sala === "atrio" ? null : pistasSala(estado.sala);
    $("resumoSala").textContent = ps ? `🔍 ${ps.vistas}/${ps.total} · ⭐ ${estrelasSala(estado.sala)}/2` : `⭐ ${n}/12`;

    renderMapa($("miniMapa"), false);
    renderMapa($("mapaCasa"), true);
    if (window.Mundo && window.Mundo.atualizar) window.Mundo.atualizar();
  }

  /* ---------- Mapa da Casa (mini-mapa e janela) ---------- */
  const ICONE_SALA = { simbolos: "🎵", mapa: "🌍", historia: "📜", instituicoes: "🏛️", direitos: "⚖️", futuro: "🌱" };
  function renderMapa(el, grande) {
    if (!el) return;
    el.innerHTML = "";
    const sug = salaSugerida();
    const celula = (sid, i) => {
      const s = D.SALAS[sid], b = document.createElement("button");
      b.type = "button";
      const ne = sid === "atrio" ? estrelas() : estrelasSala(sid);
      const feita = sid !== "atrio" && ne === 2;
      b.className = "sala-mm" + (sid === "atrio" ? " atrio" : "") + (estado.sala === sid ? " atual" : "") + (sid === sug ? " sugerida" : "") + (feita ? " feita" : "");
      b.style.background = `linear-gradient(160deg, ${s.chao2}, ${s.parede})`;
      const est = sid === "atrio" ? `${ne}/12 ★` : `<span class="${ne > 0 ? "on" : ""}">★</span><span class="${ne > 1 ? "on" : ""}">★</span>`;
      if (grande) {
        const ps = sid === "atrio" ? null : pistasSala(sid);
        b.innerHTML = `<span class="n">${sid === "atrio" ? "🏛️ " : (ICONE_SALA[sid] + " " + i + " · ")}${esc(s.curto === "Átrio" ? "Átrio (pedestal da bandeira)" : s.nome)}</span>
          <span class="desc">${esc(s.descricao)}</span>
          <span class="d-flex justify-content-between align-items-end"><span class="est">${est}</span>${ps ? `<span class="pis">🔍 ${ps.vistas}/${ps.total} pistas</span>` : ""}</span>`;
      } else {
        b.innerHTML = sid === "atrio" ? `<span class="n">🏛️ Átrio</span><span class="est">${est}</span>` : `<span class="n">${i} · ${esc(s.curto)}</span><span class="est">${est}</span>`;
      }
      b.title = estado.sala === sid ? `Estás aqui: ${s.nome}` : `Ir para: ${s.nome}`;
      b.setAttribute("aria-label", `${s.nome}${estado.sala === sid ? " (estás aqui)" : ""}, ${sid === "atrio" ? ne + " de 12" : ne + " de 2"} estrelas`);
      b.addEventListener("click", () => {
        const m = bootstrap.Modal.getInstance($("modalMapa")); if (m) m.hide();
        if (estado.sala !== sid) irParaSala(sid);
      });
      return b;
    };
    D.ORDEM_SALAS.slice(0, 3).forEach((sid, i) => el.appendChild(celula(sid, i + 1)));
    el.appendChild(celula("atrio"));
    D.ORDEM_SALAS.slice(3).forEach((sid, i) => el.appendChild(celula(sid, i + 4)));
  }
  function irParaSala(sid) {
    if (sid === "atrio") entrarSala("atrio", estado.sala);
    else entrarSala(sid);
  }
  function fecharPainelSala(fechar) {
    const p = $("painelSala"); p.classList.toggle("fechado", fechar);
    document.body.classList.toggle("painel-fechado", fechar);
    $("btnPainelSala").setAttribute("aria-expanded", String(!fechar));
  }

  /* ---------- Navegação ---------- */
  function entrarSala(id, vindoDe) {
    estado.sala = id;
    const sala = D.SALAS[id];
    let pos = sala.inicio;
    if (id === "atrio" && vindoDe) {
      const porta = sala.objetos.find(o => o.destino === vindoDe);
      if (porta) pos = { x: porta.x + porta.w / 2, y: porta.y < 300 ? porta.y + porta.h + 40 : porta.y - 40 };
    }
    if (window.Mundo) window.Mundo.entrarSala(id, pos);
    window.Som.efeito("porta");
    atualizarPainel();
    $("mensagem").textContent = `Entraste: ${sala.nome}. ${sala.descricao}`;
    guardar();
  }

  /* ---------- Interação com objetos ---------- */
  function interagir(o) {
    if (!o) return;
    switch (o.tipo) {
      case "porta": entrarSala(o.destino); break;
      case "saida": entrarSala("atrio", estado.sala); break;
      case "pista": abrirPista(o.id); break;
      case "desafio": abrirDesafio(o.id); break;
      case "pedestal": usarPedestal(); break;
    }
  }

  function abrirPista(id) {
    const p = D.PISTAS[id];
    const nova = !estado.pistas[id];
    if (nova) { estado.pistas[id] = true; estado.ordemPistas.push(id); window.Som.efeito("pista"); }
    $("tPista").textContent = "🔍 " + p.nome;
    const tipo = $("pistaTipo");
    tipo.textContent = p.tipo;
    tipo.className = "badge mb-2 " + (p.tipo === "Nota de rigor" ? "tipo-rigor" : p.tipo === "Facto e projeção" ? "tipo-projecao" : "tipo-facto");
    $("pistaTexto").textContent = p.texto;
    $("pistaFonte").innerHTML = window.Desafios.fonteHTML(p.fonte);
    // desbloqueios
    const desbloq = nova ? TODOS_DESAFIOS.filter(d => D.DESAFIOS[d].requer.includes(id) && !(estado.desafios[d] && estado.desafios[d].feito) && pistasEmFalta(d).length === 0) : [];
    $("pistaNota").textContent = nova
      ? (desbloq.length ? `Guardado no caderno ✓ · Desbloqueaste: «${D.DESAFIOS[desbloq[0]].titulo}» ⭐` : "Nova pista guardada no caderno ✓")
      : "Já tinhas esta pista no caderno.";
    $("modalPista").dataset.pista = id;
    bootstrap.Modal.getOrCreateInstance($("modalPista")).show();
    $("mensagem").textContent = nova ? `Nova pista: ${p.nome}.` : `Releste: ${p.nome}.`;
    atualizarPainel(); renderCaderno(); guardar();
    if (window.Mundo) window.Mundo.brilho(id);
  }

  function abrirDesafio(id) {
    const def = D.DESAFIOS[id];
    const falta = pistasEmFalta(id);
    if (falta.length) {
      window.Som.efeito("erro");
      mensagem(`🔒 A estação «${def.titulo}» está trancada. Investiga primeiro: ${window.Desafios.nomesPistas(falta)}.`, "aviso");
      return;
    }
    const feito = estado.desafios[id] && estado.desafios[id].feito;
    window.Desafios.abrir(id, {
      nivel: estado.nivel, revisao: feito,
      aoConcluir: (did, tentativas, pts) => {
        estado.desafios[did] = { feito: true, tentativas, pontos: pts };
        atualizarPainel(); renderCaderno(); guardar();
        $("mensagem").textContent = `⭐ Estrela recuperada: ${def.titulo}! Tens ${estrelas()} de 12.`;
        if (window.Mundo) window.Mundo.celebrar();
        toast(`⭐ Estrela recuperada! Tens ${estrelas()} de 12.`, "sucesso");
      },
      aoFechar: () => { const m = $("mundo"); if (m) m.focus({ preventScroll: true }); }
    });
  }

  function usarPedestal() {
    const n = estrelas();
    if (n >= TOTAL_ESTRELAS) {
      if (!estado.completo) { estado.completo = true; window.Som.efeito("final"); guardar(); }
      if (window.Mundo) window.Mundo.celebrar();
      mostrarFinal();
    } else {
      const faltam = D.ORDEM_SALAS.filter(s => estrelasSala(s) < 2).map(s => `${D.SALAS[s].curto} (${2 - estrelasSala(s)})`);
      mensagem(`O pedestal tem ${n} de 12 estrelas. Ainda faltam estrelas em: ${faltam.join(", ")}.`, "aviso");
    }
  }

  /* ---------- Caderno de descobertas ---------- */
  function classeEntrada(tipo) { return tipo === "Nota de rigor" ? "rigor" : tipo === "Facto e projeção" ? "projecao" : ""; }
  function renderCaderno() {
    const c = $("cadernoCorpo");
    let html = `<p class="small mb-2">Tens <strong>${nPistas()}</strong> de ${TODAS_PISTAS.length} pistas e <strong>${estrelas()}</strong> de 12 estrelas. As fontes estão indicadas em cada entrada.</p>
      <ul class="nav nav-pills nav-fill mb-2" role="tablist">
        <li class="nav-item" role="presentation"><button class="nav-link active" id="tabPistas" data-bs-toggle="pill" data-bs-target="#painelPistas" type="button" role="tab" aria-controls="painelPistas" aria-selected="true">Pistas</button></li>
        <li class="nav-item" role="presentation"><button class="nav-link" id="tabAprend" data-bs-toggle="pill" data-bs-target="#painelAprend" type="button" role="tab" aria-controls="painelAprend" aria-selected="false">Aprendizagens</button></li>
      </ul><div class="tab-content">`;

    // Pistas por sala
    html += `<div class="tab-pane fade show active" id="painelPistas" role="tabpanel" aria-labelledby="tabPistas">`;
    ["atrio", ...D.ORDEM_SALAS].forEach(sid => {
      const sala = D.SALAS[sid];
      const ids = sala.objetos.filter(o => o.tipo === "pista").map(o => o.id);
      const achadas = ids.filter(i => estado.pistas[i]);
      html += `<h3>${esc(sala.nome)} <span class="small fw-normal">(${achadas.length}/${ids.length})</span></h3>`;
      if (!achadas.length) html += `<p class="vazio small">Ainda não investigaste nada aqui.</p>`;
      achadas.forEach(i => {
        const p = D.PISTAS[i];
        html += `<div class="entrada ${classeEntrada(p.tipo)}"><div class="t">${esc(p.nome)} <span class="badge ${p.tipo === "Nota de rigor" ? "tipo-rigor" : p.tipo === "Facto e projeção" ? "tipo-projecao" : "tipo-facto"}">${esc(p.tipo)}</span></div>
          <div>${esc(p.texto)}</div><div class="f">${window.Desafios.fonteHTML(p.fonte)}</div></div>`;
      });
    });
    html += `</div>`;

    // Aprendizagens
    html += `<div class="tab-pane fade" id="painelAprend" role="tabpanel" aria-labelledby="tabAprend">`;
    D.ORDEM_SALAS.forEach(sid => {
      html += `<h3>${esc(D.SALAS[sid].nome)}</h3>`;
      TODOS_DESAFIOS.filter(d => D.DESAFIOS[d].sala === sid).forEach(d => {
        const def = D.DESAFIOS[d], r = estado.desafios[d];
        html += r && r.feito
          ? `<div class="entrada desafio"><div class="t">⭐ ${esc(def.titulo)} <span class="badge tipo-desafio">${r.pontos} pt</span></div><div><strong>Aprendi a:</strong> ${esc(def.aprendizagem)}</div><div class="mt-1">${esc(def.explicacao)}</div><div class="f">${window.Desafios.fonteHTML(def.fonte)}</div></div>`
          : `<div class="entrada"><div class="t">☆ ${esc(def.titulo)}</div><div class="vazio">Por resolver.</div></div>`;
      });
    });
    html += `</div></div>`;
    c.innerHTML = html;
  }

  /* ---------- Fontes ---------- */
  function renderFontes() {
    const lst = Object.values(D.FONTES).map(f => `<li><a href="${f.url}" target="_blank" rel="noopener">${esc(f.nome)}</a></li>`).join("");
    $("fontesCorpo").innerHTML = `
      <h3 class="h6">Fontes consultadas</h3><ul class="small">${lst}</ul>
      <h3 class="h6">Notas de rigor e correções</h3>
      <ul class="small">
        <li>A lista de temas dos Clubes Europeus junta a <strong>União Europeia</strong>, o <strong>Conselho da Europa</strong> e a <strong>Declaração Universal dos Direitos Humanos</strong>. São realidades diferentes: a DUDH é da ONU (1948); o Conselho da Europa (46 países) não faz parte da UE (27 países). O jogo trabalha esta distinção.</li>
        <li>A expressão «direitos do homem» (usada na fonte) é a designação tradicional; hoje usa-se preferencialmente «direitos humanos», que inclui explicitamente mulheres e homens.</li>
        <li>A bandeira europeia não nasceu na UE: foi adotada pelo Conselho da Europa em 1955 e pelas Comunidades Europeias em 1985. As 12 estrelas não representam países.</li>
        <li>Dados que mudam com o tempo (verificados em outubro de 2026): 27 Estados-membros; 21 países na área do euro desde a entrada da Bulgária, a 1 de janeiro de 2026; Parlamento Europeu com 720 deputados (2024-2029), 21 eleitos em Portugal.</li>
        <li>Distinção usada no jogo: <strong>factos</strong> (datas, tratados, números com fonte), <strong>projeções</strong> (por exemplo, se a neutralidade climática em 2050 será atingida) e <strong>interpretações</strong> (por exemplo, o peso relativo das razões para a integração europeia, debatido pelos historiadores).</li>
        <li>As ilustrações do jogo são esquemáticas e não são reconstruções exatas de edifícios, objetos ou documentos.</li>
      </ul>
      <p class="small">As ligações abrem páginas na Internet; o jogo em si funciona sem ligação.</p>
`;
  }
  function htmlBanco() {
    return `<h3 id="tBanco">Banco de perguntas</h3>
      <p class="small mb-2">As perguntas de cada desafio estão no ficheiro <code>dados/banco-perguntas.json</code>. Sempre que um desafio é aberto, o jogo sorteia um novo conjunto de itens (por exemplo, 6 ou 10 das 27 bandeiras da UE). Podes editar esse ficheiro e carregá-lo aqui: fica guardado neste navegador.</p>
      <p class="small mb-2" id="estadoBanco" role="status" aria-live="polite"></p>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <label class="btn btn-sm btn-outline-light mb-0" for="ficheiroBanco">Carregar banco (.json)</label>
        <input type="file" id="ficheiroBanco" accept=".json,application/json" class="visually-hidden">
        <button type="button" class="btn btn-sm btn-outline-light" id="btnDescarregarBanco">Descarregar banco atual</button>
        <button type="button" class="btn btn-sm btn-outline-light" id="btnReporBanco">Repor banco original</button>
      </div>`;
  }

  /* ---------- Banco de perguntas: carregar, importar, repor ---------- */
  const CHAVE_BANCO = "missaoEuropa_banco";
  function resumoBanco() {
    const b = window.Desafios.banco.desafios || {};
    const total = Object.values(b).reduce((s, e) => s + ((e.pares || e.itens || []).length) + ((e.passos || []).reduce((t, p) => t + (p.variantes ? p.variantes.length : 1), 0)) + ((e.cenarios || []).length), 0);
    const orig = { original: "banco original", servidor: "banco original (lido do ficheiro JSON)", importado: "banco carregado por ti" }[window.Desafios.origemBanco] || "—";
    return `Em uso: ${orig} · ${total} perguntas, itens e variantes.`;
  }
  function ligarBancoUI() {
    const est = $("estadoBanco"); if (!est) return; est.textContent = resumoBanco();
    $("ficheiroBanco").addEventListener("change", (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        let b;
        try { b = JSON.parse(r.result); } catch (e) { $("estadoBanco").textContent = "⚠️ O ficheiro não é um JSON válido. Verifica vírgulas, aspas e chavetas (podes usar um validador de JSON)."; return; }
        const erros = window.Desafios.aplicarBanco(b, "importado");
        if (erros.length) { $("estadoBanco").innerHTML = "⚠️ O banco não foi carregado:<br>" + erros.slice(0, 8).map(esc).join("<br>"); return; }
        try { localStorage.setItem(CHAVE_BANCO, r.result); } catch (e) {}
        $("estadoBanco").textContent = "✔ Banco carregado. " + resumoBanco();
      };
      r.readAsText(f, "utf-8");
      ev.target.value = "";
    });
    $("btnDescarregarBanco").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(window.Desafios.banco, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "banco-perguntas.json";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $("btnReporBanco").addEventListener("click", () => {
      try { localStorage.removeItem(CHAVE_BANCO); } catch (e) {}
      if (window.BANCO_PERGUNTAS) window.Desafios.aplicarBanco(window.BANCO_PERGUNTAS, "original");
      $("estadoBanco").textContent = "✔ Banco original reposto. " + resumoBanco();
    });
  }
  function carregarBanco() {
    let guardado = null;
    try { guardado = localStorage.getItem(CHAVE_BANCO); } catch (e) {}
    if (guardado) {
      try { if (!window.Desafios.aplicarBanco(JSON.parse(guardado), "importado").length) return Promise.resolve(); } catch (e) {}
    }
    // Com servidor (http/https), lê diretamente o JSON; ao abrir o ficheiro localmente usa a cópia em banco-perguntas.js
    if (location.protocol.startsWith("http") && window.fetch) {
      return fetch("dados/banco-perguntas.json", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then(b => { if (b) window.Desafios.aplicarBanco(b, "servidor"); })
        .catch(() => {});
    }
    return Promise.resolve();
  }

  /* ---------- Ecrã final ---------- */
  function mostrarFinal() {
    const n = estrelas(), pts = pontos();
    const minutos = Math.max(1, Math.round(tempoJogo() / 60000));
    const primeira = TODOS_DESAFIOS.filter(d => estado.desafios[d] && estado.desafios[d].feito && estado.desafios[d].tentativas === 0).length;
    $("finalResumo").textContent = n >= 12
      ? "Parabéns! Devolveste as 12 estrelas à bandeira do Clube Europeu. A missão está cumprida!"
      : `Recuperaste ${n} de 12 estrelas. Podes voltar ao jogo e continuar quando quiseres.`;
    $("finalNumeros").innerHTML = `
      <li>⭐ Estrelas: <strong>${n}/12</strong></li>
      <li>🏅 Pontos: <strong>${pts}/36</strong></li>
      <li>🔍 Pistas recolhidas: <strong>${nPistas()}/${TODAS_PISTAS.length}</strong></li>
      <li>🎯 Desafios resolvidos à primeira: <strong>${primeira}</strong></li>
      <li>📚 Nível: <strong>${estado.nivel === 3 ? "Embaixador (3.º ciclo)" : "Explorador (2.º ciclo)"}</strong></li>
      <li>⏱️ Tempo de jogo: <strong>cerca de ${minutos} min</strong></li>`;
    $("finalAprendizagens").innerHTML = TODOS_DESAFIOS.map(d => {
      const def = D.DESAFIOS[d], ok = estado.desafios[d] && estado.desafios[d].feito;
      const objs = def.objetivos.map(o => D.OBJETIVOS_CLUBE[o]).join("; ");
      return `<li class="${ok ? "" : "falta"}"><span class="${ok ? "ok" : ""}">${ok ? "✔" : "☐"}</span> ${esc(def.aprendizagem)}<br><span class="small opacity-75">Objetivos do Clube: ${esc(objs)}</span></li>`;
    }).join("");
    $("ecraFinal").classList.remove("d-none");
    $("ecraFinal").focus();
  }

  /* ---------- Overlays / estado de interação ---------- */
  function jogoAtivo() {
    return $("ecraInicio").classList.contains("d-none") && $("ecraFinal").classList.contains("d-none") &&
      !document.querySelector(".modal.show, .offcanvas.show, .offcanvas.showing, .modal.fade.show");
  }

  /* ---------- Início ---------- */
  function comecar(nivel, guardado) {
    if (guardado) { estado = guardado; estado.inicio = Date.now(); }
    else { apagar(); estado = novoEstado(nivel); }
    $("ecraInicio").classList.add("d-none");
    renderCaderno();
    entrarSala(estado.sala || "atrio");
    mensagem(guardado ? "Missão retomada. Bom regresso!" : "Bem-vindo(a) ao Clube Europeu! Investiga os objetos do átrio e escolhe uma porta.");
    setTimeout(() => $("mundo").focus({ preventScroll: true }), 50);
  }

  function ligarSom() {
    const chk = $("somLigado"), vol = $("volumeSom");
    if (!window.Som.suportado()) {
      chk.disabled = true; $("avisoSom").textContent = "Este navegador não suporta som gerado (Web Audio).";
    }
    const atualizarIcone = () => { $("iconeSom").textContent = window.Som.cfg.ligado ? "🔊" : "🔇"; };
    chk.addEventListener("change", () => { window.Som.ligar(chk.checked); atualizarIcone(); });
    document.querySelectorAll('input[name="modoSom"]').forEach(r => r.addEventListener("change", () => window.Som.definirModo(r.value)));
    vol.addEventListener("input", () => { $("volumeValor").textContent = vol.value; window.Som.definirVolume(vol.value / 100); });
    $("efeitosLigados").addEventListener("change", e => window.Som.definirEfeitos(e.target.checked));
    $("btnSilenciar").addEventListener("click", () => { chk.checked = false; window.Som.ligar(false); atualizarIcone(); });
    window.Som.definirVolume(vol.value / 100);
  }

  function iniciar() {
    carregarBanco().then(() => { const e = $("estadoBanco"); if (e) e.textContent = resumoBanco(); });
    renderFontes(); renderCaderno(); atualizarPainel(); ligarSom();
    const g = carregar();
    if (g && (Object.keys(g.pistas || {}).length || Object.keys(g.desafios || {}).length)) {
      $("btnContinuar").classList.remove("d-none");
      $("btnContinuar").addEventListener("click", () => comecar(g.nivel, g));
    }
    $("btnComecar").addEventListener("click", () => comecar(+document.querySelector('input[name="nivel"]:checked').value));
    $("btnTerminar").addEventListener("click", mostrarFinal);
    $("btnVoltarJogo").addEventListener("click", () => { $("ecraFinal").classList.add("d-none"); $("mundo").focus({ preventScroll: true }); });
    $("btnFinalCaderno").addEventListener("click", () => {
      $("ecraFinal").classList.add("d-none");
      bootstrap.Offcanvas.getOrCreateInstance($("caderno")).show();
      setTimeout(() => { const t = document.getElementById("tabAprend"); if (t) bootstrap.Tab.getOrCreateInstance(t).show(); }, 50);
    });
    $("btnImprimir").addEventListener("click", () => window.print());
    const reiniciar = () => {
      if (!window.confirm("Queres mesmo recomeçar? Perdes as estrelas e as pistas desta missão.")) return;
      apagar(); estado = novoEstado(estado.nivel);
      $("ecraFinal").classList.add("d-none");
      $("btnContinuar").classList.add("d-none");
      $("ecraInicio").classList.remove("d-none");
      renderCaderno(); atualizarPainel();
      if (window.Mundo) window.Mundo.entrarSala("atrio", D.SALAS.atrio.inicio);
      $("btnComecar").focus();
    };
    $("btnReiniciar").addEventListener("click", reiniciar);
    $("btnReiniciarMenu").addEventListener("click", reiniciar);
    $("btnGuia").addEventListener("click", () => window.Professor && window.Professor.pedirSenha());
    $("migalhaCasa").addEventListener("click", () => bootstrap.Modal.getOrCreateInstance($("modalMapa")).show());
    $("btnPainelSala").addEventListener("click", () => fecharPainelSala(!$("painelSala").classList.contains("fechado")));
    $("btnRecolherMissao").addEventListener("click", (e) => {
      const b = e.currentTarget, aberto = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", String(!aberto)); $("corpoMissao").hidden = aberto;
    });
    $("promptInteragir").addEventListener("click", () => window.Mundo && window.Mundo.interagirProximo());
    const cam = { camEsq: () => window.Mundo.rodar(.3), camDir: () => window.Mundo.rodar(-.3), camCima: () => window.Mundo.inclinar(.12), camBaixo: () => window.Mundo.inclinar(-.12),
      camMais: () => window.Mundo.zoom(-2), camMenos: () => window.Mundo.zoom(2) };
    Object.keys(cam).forEach(k => {
      // carregar e manter premido repete a ação
      let t = null;
      const parar = () => { clearInterval(t); t = null; };
      $(k).addEventListener("pointerdown", (e) => { if (!(window.Mundo && window.Mundo.ativo)) return; e.preventDefault(); cam[k](); parar(); t = setInterval(cam[k], 110); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(ev => $(k).addEventListener(ev, parar));
      $(k).addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && window.Mundo && window.Mundo.ativo) { e.preventDefault(); cam[k](); } });
    });
    $("camGeral").addEventListener("click", () => window.Mundo && window.Mundo.ativo && window.Mundo.vistaGeral());
    $("camCentro").addEventListener("click", () => window.Mundo && window.Mundo.ativo && window.Mundo.centrar());
    try { if (localStorage.getItem("missaoEuropa_dica") === "x") $("dicaControlos").hidden = true; } catch (e) {}
    $("fecharDica").addEventListener("click", () => { $("dicaControlos").hidden = true; try { localStorage.setItem("missaoEuropa_dica", "x"); } catch (e) {} });
    // em ecrãs pequenos o painel da sala começa recolhido
    if (matchMedia("(max-width: 860px)").matches) fecharPainelSala(true);
    if (matchMedia("(max-height: 520px)").matches) $("btnRecolherMissao").click();
    // miniatura 3D do objeto na janela da pista
    $("modalPista").addEventListener("shown.bs.modal", () => {
      const v = $("pistaVista"); v.innerHTML = "";
      if (window.Mundo && window.Mundo.ativo) window.Mundo.inspecionar($("modalPista").dataset.pista, v);
    });
    $("modalPista").addEventListener("hidden.bs.modal", () => { if (window.Mundo && window.Mundo.ativo) window.Mundo.pararInspecao(); $("pistaVista").innerHTML = ""; });

    // atalhos de teclado globais
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!jogoAtivo()) return;
      const k = e.key.toLowerCase();
      if (k === "c") { e.preventDefault(); bootstrap.Offcanvas.getOrCreateInstance($("caderno")).show(); }
      else if (k === "h") { e.preventDefault(); bootstrap.Modal.getOrCreateInstance($("modalAjuda")).show(); }
      else if (k === "m") { e.preventDefault(); bootstrap.Modal.getOrCreateInstance($("modalMapa")).show(); }
    });
    // ao fechar pista, devolve o foco ao mundo se a interação veio de lá
    $("modalPista").addEventListener("hidden.bs.modal", () => { if (document.activeElement === document.body) $("mundo").focus({ preventScroll: true }); });
    setInterval(guardar, 30000);
    $("btnComecar").focus();
  }

  document.addEventListener("DOMContentLoaded", iniciar);

  return {
    get estado() { return estado; },
    estadoObjeto, descricaoEstado, interagir, jogoAtivo, mensagem, toast, estrelas, estrelasSala, irParaSala,
    htmlBanco, ligarBancoUI, resumoBanco,
    _mostrarFinal: mostrarFinal
  };
})();

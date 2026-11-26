/* ============================================================
   Missão Europa — Guia do professor (protegido pela senha PROFESSOR)
   Notas pedagógicas, soluções de todos os desafios (geradas a
   partir do banco de perguntas em uso) e gestão do banco.
   ============================================================ */
"use strict";

window.Professor = (function () {
  const D = window.DADOS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => window.Desafios.esc(s);
  const SENHA = "PROFESSOR";
  let desbloqueado = false;

  function pedirSenha() {
    if (desbloqueado) { abrirGuia(); return; }
    $("senha").value = ""; $("erroSenha").textContent = "";
    const m = bootstrap.Modal.getOrCreateInstance($("modalSenha"));
    m.show();
    setTimeout(() => $("senha").focus(), 300);
  }
  function verificar(ev) {
    ev.preventDefault();
    if ($("senha").value.trim().toUpperCase() === SENHA) {
      desbloqueado = true;
      bootstrap.Modal.getOrCreateInstance($("modalSenha")).hide();
      setTimeout(abrirGuia, 350);
    } else {
      $("erroSenha").textContent = "Senha incorreta. Tenta outra vez.";
      $("senha").select();
    }
  }

  /* ---------- Soluções ---------- */
  const subst = (t) => String(t).replace(/\{(\w+)\}/g, "[$1]");
  const nivelTxt = (x) => x && x.nivel === 3 ? ' <span class="badge text-bg-secondary">3.º ciclo</span>' : "";
  const bandeira = (cod) => `<img class="bandeira" alt="" src="${(window.BANDEIRAS_DATA && window.BANDEIRAS_DATA[cod]) || "img/bandeiras/" + cod + ".svg"}">`;

  function solucao(id) {
    const def = D.DESAFIOS[id], b = (window.Desafios.banco.desafios || {})[id] || {};
    let h = `<h4>${esc(def.titulo)} <span class="small opacity-75">(${esc(def.tipo)})</span></h4>`;
    h += `<p class="small mb-1"><strong>Pistas necessárias:</strong> ${window.Desafios.nomesPistas(def.requer)}</p>`;
    switch (def.tipo) {
      case "construir":
        h += `<p class="certa mb-1">Fundo azul · estrelas douradas · 12 estrelas · em círculo.</p>`;
        break;
      case "associar":
        h += `<table><tr><th>${esc(def.colA || "A")}</th><th>${esc(def.colB || "B")}</th></tr>` +
          (b.pares || []).map(p => `<tr><td>${p.bandeira ? bandeira(p.a) + esc(p.a.toUpperCase()) : esc(p.a)}${nivelTxt(p)}</td><td class="certa">${esc(Array.isArray(p.b) ? p.b.join(" / ") : p.b)}</td></tr>`).join("") + `</table>`;
        break;
      case "classificar": {
        const nome = (c) => (def.categorias.find(x => x.id === c) || { nome: c }).nome;
        h += `<table><tr><th>Item</th><th>Resposta</th><th>Explicação</th></tr>` +
          (b.itens || []).map(x => `<tr><td>${x.bandeira ? bandeira(x.bandeira) : ""}${esc(x.texto)}${nivelTxt(x)}</td><td class="certa">${esc(nome(x.cat))}</td><td class="small">${esc(x.explicacao || "")}</td></tr>`).join("") + `</table>`;
        break;
      }
      case "ordenar":
        h += `<table><tr><th>Ano</th><th>Acontecimento</th></tr>` +
          (b.itens || []).slice().sort((p, q) => String(p.ano).localeCompare(String(q.ano))).map(x => `<tr><td class="certa">${esc(x.ano)}</td><td>${esc(x.texto)}${nivelTxt(x)}</td></tr>`).join("") + `</table>`;
        break;
      case "passos": {
        if (b.cenarios) h += `<p class="small mb-1"><strong>Cenários sorteados:</strong> ${b.cenarios.map(c => esc(Object.values(c).join(" · "))).join(" | ")}</p>`;
        (b.passos || []).forEach((p, i) => {
          const vs = p.variantes ? p.variantes : [p];
          vs.forEach((v, k) => {
            h += `<p class="mb-1 mt-2"><strong>Etapa ${i + 1}${vs.length > 1 ? ` (variante ${k + 1})` : ""}:</strong> ${esc(subst(v.pergunta))}${nivelTxt(p)}${p.aberta ? ' <span class="badge selo-interpretacao">interpretação: todas válidas</span>' : ""}</p><ul class="small mb-1">` +
              v.opcoes.map(o => `<li class="${o.certa || p.aberta ? "certa" : "errada"}">${o.certa ? "✔ " : ""}${esc(subst(o.texto))}</li>`).join("") + `</ul>`;
          });
        });
        break;
      }
    }
    h += `<p class="small opacity-75 mb-0">${esc(def.explicacao || "")}</p>`;
    return h;
  }

  function htmlNotas() {
    const linhas = D.ORDEM_SALAS.map(sid => Object.keys(D.DESAFIOS).filter(d => D.DESAFIOS[d].sala === sid).map((d, i) => {
      const def = D.DESAFIOS[d];
      return `<tr><td>${i === 0 ? esc(D.SALAS[sid].nome) : ""}</td><td>${esc(def.titulo)} (${esc(def.tipo)})</td><td>${esc(def.aprendizagem)}</td><td>${esc(def.objetivos.map(o => D.OBJETIVOS_CLUBE[o]).join("; "))}</td></tr>`;
    }).join("")).join("");
    return `
      <h3>1. Estrutura do jogo</h3>
      <p>Aventura 3D de exploração com lógica de <em>escape room</em>: o aluno desloca-se pela «Casa da Europa» (átrio e 6 salas), investiga ${Object.keys(D.PISTAS).length} objetos que dão pistas (registadas no caderno de descobertas) e desbloqueia 12 estações-desafio. Cada desafio devolve uma estrela à bandeira do clube. Dois níveis: <strong>Explorador</strong> (2.º ciclo) e <strong>Embaixador</strong> (3.º ciclo, com mais itens e uma pergunta de interpretação histórica).</p>
      <p>As perguntas são <strong>sorteadas</strong> a cada abertura a partir do banco de perguntas, com regras de equilíbrio: mínimo de itens por categoria, sem saudações quase iguais na mesma ronda, anos diferentes na linha do tempo e, no 3.º ciclo, pelo menos metade de itens de nível 3.</p>
      <p class="nota mb-0"><strong>Navegação:</strong> o aluno pode andar pelo mundo 3D (rato, toque ou teclado), saltar diretamente para qualquer sala no mapa da Casa da Europa, ou usar o painel «Nesta sala», que lista todos os objetos com o seu estado. O painel é também a alternativa acessível ao 3D e funciona mesmo em computadores sem WebGL.</p>

      <h3>2. Desafios, tipos de atividade e aprendizagens</h3>
      <table><tr><th>Sala</th><th>Desafio (tipo)</th><th>Aprendizagem a demonstrar</th><th>Objetivos dos Clubes Europeus</th></tr>${linhas}</table>

      <h3>3. Notas de rigor e correções</h3>
      <ul>
        <li><strong>Mistura de organizações na fonte.</strong> A lista de temas dos Clubes Europeus junta UE, Conselho da Europa e DUDH. São entidades distintas: a DUDH é da ONU (1948); o Conselho da Europa (46 países) não pertence à UE (27). O jogo trata esta distinção de forma explícita (sala 5 e «bilhete amarelo» da sala 4).</li>
        <li><strong>Terminologia.</strong> A fonte usa «direitos do homem» (designação tradicional). O jogo usa «direitos humanos», hoje preferida.</li>
        <li><strong>Bandeira.</strong> Adotada primeiro pelo Conselho da Europa (1955) e depois pelas Comunidades Europeias (1985); as 12 estrelas não representam países.</li>
        <li><strong>Dados que mudam.</strong> Números verificados em outubro de 2026 (27 Estados-membros; 21 na área do euro desde a entrada da Bulgária, a 1 de janeiro de 2026; 720 eurodeputados, 21 eleitos em Portugal). Convém revê-los no banco de perguntas quando houver alterações.</li>
        <li><strong>Factos, projeções e interpretações.</strong> O caderno identifica factos, notas de rigor e uma «projeção» (neutralidade climática em 2050). As perguntas abertas (razões da integração; ação do clube) estão assinaladas como interpretação e aceitam várias respostas.</li>
        <li><strong>Simplificações assumidas.</strong> «Proposta de lei» refere-se ao processo legislativo ordinário; o valor «mais evidente» de cada situação é uma simplificação, porque várias situações tocam vários valores (o jogo explica-o).</li>
        <li><strong>Ilustrações.</strong> Todo o cenário 3D (salas, objetos, jornais, postais, maquetes) é esquemático e foi desenhado em código: não são reconstruções exatas nem reproduções de documentos reais. O mapa da parede usa dados Eurostat/GISCO (© EuroGeographics); as bandeiras são da coleção flag-icons (licença MIT).</li>
      </ul>

      <h3>4. Sugestões de exploração em aula</h3>
      <ul>
        <li>Em pares: um aluno conduz o avatar e o outro regista no caderno as pistas «Nota de rigor»; trocam de papel em cada sala.</li>
        <li>No fim, projetar o ecrã «Resultado da sessão» e discutir as perguntas de interpretação (sala 3 e sala 6): não há resposta única, mas há respostas mais bem justificadas.</li>
        <li>Depois de recuperar uma estrela, a estação pode ser aberta outra vez para treinar com um novo sorteio, sem pontos.</li>
      </ul>`;
  }

  function abrirGuia() {
    const corpo = $("guiaCorpo");
    corpo.innerHTML = `<div class="guia">
      <ul class="nav nav-pills mb-3 flex-wrap gap-1" role="tablist">
        <li class="nav-item" role="presentation"><button class="nav-link active" data-bs-toggle="pill" data-bs-target="#gNotas" type="button" role="tab">Notas pedagógicas</button></li>
        <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#gSol" type="button" role="tab">Soluções</button></li>
        <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#gBanco" type="button" role="tab">Banco de perguntas</button></li>
      </ul>
      <div class="tab-content">
        <div class="tab-pane fade show active" id="gNotas" role="tabpanel">${htmlNotas()}</div>
        <div class="tab-pane fade" id="gSol" role="tabpanel">
          <p class="nota">Soluções de <strong>todos</strong> os itens do banco em uso (o jogo sorteia uma parte deles em cada abertura). Os itens marcados «3.º ciclo» só aparecem no nível Embaixador.</p>
          ${D.ORDEM_SALAS.map(sid => `<h3>${esc(D.SALAS[sid].nome)}</h3>` + Object.keys(D.DESAFIOS).filter(d => D.DESAFIOS[d].sala === sid).map(solucao).join("")).join("")}
        </div>
        <div class="tab-pane fade" id="gBanco" role="tabpanel">${window.App.htmlBanco()}
          <p class="nota mt-3 mb-0">Edita <code>dados/banco-perguntas.json</code> (Bloco de Notas ou outro editor) e carrega-o aqui. O jogo valida o ficheiro (categorias, campos obrigatórios, número de itens suficiente para cada nível) e mostra os erros em português. Para acrescentar uma bandeira nova, coloca o SVG em <code>img/bandeiras/</code> com o código do país (ex.: <code>al.svg</code>) e corre <code>ferramentas/gerar-recursos.cjs</code>.</p>
        </div>
      </div></div>`;
    window.App.ligarBancoUI();
    bootstrap.Modal.getOrCreateInstance($("modalGuia")).show();
  }

  function imprimir() {
    const w = window.open("", "_blank");
    if (!w) { window.print(); return; }
    const conteudo = $("guiaCorpo").querySelectorAll(".tab-pane");
    w.document.write(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Missão Europa — Guia do professor</title>
      <style>body{font-family:"Segoe UI",system-ui,Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#1d2340;line-height:1.45}
      h1,h3{color:#003399}h3{border-bottom:2px solid #ffcc00;padding-bottom:.2rem;margin-top:1.6rem}table{border-collapse:collapse;width:100%;font-size:.86rem;margin-bottom:.8rem}
      th,td{border:1px solid #bbb;padding:4px 6px;vertical-align:top;text-align:left}th{background:#e8edf9}.certa{font-weight:600;color:#0a6b35}.errada{color:#666}
      .nota{background:#fff7d6;border-left:4px solid #e0a800;padding:.5rem .8rem}img.bandeira{width:28px;vertical-align:middle;margin-right:4px;border:1px solid #999}
      .badge{font-size:.7rem;border:1px solid #999;border-radius:4px;padding:0 4px}button,label.btn,input,#estadoBanco{display:none}</style></head><body>
      <h1>Missão Europa — Guia do professor</h1>${[...conteudo].map(c => c.innerHTML).join("<hr>")}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("formSenha").addEventListener("submit", verificar);
    $("btnImprimirGuia").addEventListener("click", imprimir);
  });

  return { pedirSenha, _solucao: solucao };
})();

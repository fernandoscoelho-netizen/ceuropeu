// Atividades: votação simulada, coligações, percurso de uma lei, «sê deputado» e quiz.
import * as THREE from 'three';

export function criarAtividades(ctx) {
  const { lugares, GRUPOS, OUTROS, ORDEM, PAISES, TOTAL, MAIORIA, pintar, corDe, voar, abrirFicha, pConteudo, porPais, H, D_PLANTA } = ctx;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const cApagado = new THREE.Color(0xd7dbe3), cVazio = new THREE.Color(0xc9ced8);
  const COR_VOTO = { F: new THREE.Color('#1e9e3a'), C: new THREE.Color('#d32f2f'), A: new THREE.Color('#f4f4f0') };
  const NOME_VOTO = { F: 'A favor', C: 'Contra', A: 'Abstenção' };
  let token = 0; // cancela animações quando se muda de atividade
  const parar = () => { token++; };
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const vistaGeral = () => voar(V3(0, 54, 4), V3(0, 0, -8.5));
  let atual = 'menu';

  // ---------------- menu ----------------
  const ATV = [
    ['votacao', '🗳️', 'Simular uma votação', 'Decide como vota cada grupo e vê os lugares acenderem até se saber se há maioria.'],
    ['coligacao', '🤝', 'Formar uma coligação', 'Junta grupos políticos até chegares aos 361 deputados da maioria absoluta.'],
    ['lei', '📜', 'Percurso de uma lei', 'Segue uma proposta da Comissão até ser lei, passando pelo Parlamento e pelo Conselho.'],
    ['deputado', '🎧', 'Sê deputado', 'Senta-te no lugar de um deputado português e escolhe a língua da interpretação.'],
    ['quiz', '❓', 'Quiz final', '10 perguntas sobre o que viste nesta visita.'],
  ];
  function menu() {
    parar(); atual = 'menu';
    pConteudo.innerHTML = `<p>Escolhe uma atividade:</p>` + ATV.map(([k, ic, t, d]) =>
      `<button class="cartaoAtv" data-atv="${k}"><span class="ic">${ic}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('');
    pConteudo.querySelectorAll('[data-atv]').forEach(b => b.onclick = () => abrir(b.dataset.atv));
    pintar(l => ({ cor: GRUPOS[l.g] || OUTROS[l.g] ? corDe(l.g) : cVazio }));
    vistaGeral();
  }
  const voltar = `<button class="bt sec voltar" data-voltar>‹ Atividades</button>`;
  function ligarVoltar() { pConteudo.querySelector('[data-voltar]').onclick = menu; }
  function abrir(k) { parar(); atual = k; ({ votacao, coligacao, lei, deputado, quiz })[k](); }

  // ---------------- 1. votação simulada ----------------
  const PROPOSTAS = [
    'Reforçar o programa Erasmus+ para estudantes do ensino secundário',
    'Criar um passe ferroviário europeu com desconto para jovens',
    'Reduzir o plástico de utilização única nas cantinas escolares',
  ];
  const votos = Object.fromEntries(ORDEM.map(k => [k, 'F']));
  let tipoMaioria = 'simples', proposta = 0;
  function votacao() {
    pConteudo.innerHTML = `${voltar}
    <h3>Simular uma votação</h3>
    <p class="nota"><b>Simulação:</b> a proposta é fictícia e és tu que decides o voto de cada grupo. Na realidade, cada deputado vota individualmente e nem sempre segue o seu grupo. Os números de deputados são os reais (${D_PLANTA}) e considera-se que todos estão presentes.</p>
    <label style="font-size:.82rem;font-weight:700">Proposta (fictícia)</label>
    <select id="selProp" style="width:100%;font:inherit;padding:7px;border-radius:9px;border:1px solid #c9d4f2;margin:4px 0 8px">${PROPOSTAS.map((p, i) => `<option value="${i}" ${i === proposta ? 'selected' : ''}>${p}</option>`).join('')}</select>
    <div class="grelhaBt"><button class="bt sec" data-maioria="simples" aria-pressed="${tipoMaioria === 'simples'}">Maioria simples</button><button class="bt sec" data-maioria="absoluta" aria-pressed="${tipoMaioria === 'absoluta'}">Maioria absoluta (361)</button></div>
    <p style="font-size:.78rem;color:var(--suave);margin-top:-4px">${tipoMaioria === 'simples' ? 'Maioria simples: a proposta passa se houver mais votos a favor do que contra (é a regra mais comum).' : `Maioria absoluta dos membros: são precisos pelo menos ${MAIORIA} votos a favor, seja qual for o número de presentes (usada, por exemplo, na eleição da Presidente da Comissão).`}</p>
    <table class="tabVoto">${ORDEM.map(k => `<tr><td><span class="cor" style="background:${GRUPOS[k].cor}"></span><b>${GRUPOS[k].sig}</b> <small>${GRUPOS[k].n}</small></td><td>${['F', 'C', 'A'].map(v => `<button class="v v${v}" data-g="${k}" data-v="${v}" aria-pressed="${votos[k] === v}" title="${NOME_VOTO[v]}">${v === 'F' ? '✔' : v === 'C' ? '✖' : '○'}</button>`).join('')}</td></tr>`).join('')}</table>
    <button class="bt claro" id="bVotar" style="width:100%;margin-top:8px">Votar</button>
    <div id="placar"></div>`;
    ligarVoltar();
    pConteudo.querySelector('#selProp').onchange = e => { proposta = +e.target.value; };
    pConteudo.querySelectorAll('[data-maioria]').forEach(b => b.onclick = () => { tipoMaioria = b.dataset.maioria; votacao(); });
    pConteudo.querySelectorAll('.v').forEach(b => b.onclick = () => { votos[b.dataset.g] = b.dataset.v; pConteudo.querySelectorAll(`.v[data-g="${b.dataset.g}"]`).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    pConteudo.querySelector('#bVotar').onclick = animarVotacao;
    pintar(l => ({ cor: GRUPOS[l.g] ? cApagado : (OUTROS[l.g] ? corDe(l.g) : cVazio) }));
    vistaGeral();
  }
  async function animarVotacao() {
    const meu = ++token;
    const estado = {}; const cont = { F: 0, C: 0, A: 0 };
    const placar = pConteudo.querySelector('#placar');
    const desenhaPlacar = (fim) => {
      const passa = tipoMaioria === 'simples' ? cont.F > cont.C : cont.F >= MAIORIA;
      placar.innerHTML = `<div class="placar">
        <div><span class="n" style="color:#1e9e3a">${cont.F}</span>A favor</div>
        <div><span class="n" style="color:#d32f2f">${cont.C}</span>Contra</div>
        <div><span class="n" style="color:#6b7280">${cont.A}</span>Abstenções</div></div>
        <div class="trilhoMaioria"><span style="width:${cont.F / TOTAL * 100}%;background:#1e9e3a"></span><span style="width:${cont.C / TOTAL * 100}%;background:#d32f2f"></span><i style="left:${MAIORIA / TOTAL * 100}%"></i></div>
        ${fim ? `<div class="resultado ${passa ? 'ok' : 'nao'}">${passa ? '✔ Proposta APROVADA' : '✖ Proposta REJEITADA'}<small>${tipoMaioria === 'simples' ? `${cont.F} a favor contra ${cont.C} contra (as abstenções não contam para a maioria simples).` : `${cont.F} votos a favor; eram precisos ${MAIORIA}.`}</small></div>` : ''}`;
    };
    pintar(l => ({ cor: GRUPOS[l.g] ? cApagado : (OUTROS[l.g] ? corDe(l.g) : cVazio) }));
    desenhaPlacar(false);
    for (const k of ORDEM) {
      await esperar(650); if (meu !== token) return;
      estado[k] = votos[k]; cont[votos[k]] += GRUPOS[k].n;
      pintar(l => GRUPOS[l.g] ? (estado[l.g] ? { cor: COR_VOTO[estado[l.g]], luz: l.g === k } : { cor: cApagado }) : { cor: OUTROS[l.g] ? corDe(l.g) : cVazio });
      desenhaPlacar(false);
    }
    await esperar(400); if (meu !== token) return;
    desenhaPlacar(true);
  }

  // ---------------- 2. coligações ----------------
  const naColigacao = new Set();
  function coligacao() {
    const soma = [...naColigacao].reduce((s, k) => s + GRUPOS[k].n, 0);
    pConteudo.innerHTML = `${voltar}
    <h3>Formar uma coligação</h3>
    <p>Nenhum grupo tem a maioria sozinho. Para eleger a Presidente da Comissão Europeia, o Parlamento precisa da <b>maioria absoluta dos seus membros</b>: com 720 deputados, são ${MAIORIA} votos. Clica nos grupos para os juntares.</p>
    <div class="chips">${ORDEM.filter(k => k !== 'I').map(k => `<button class="chip" data-g="${k}" aria-pressed="${naColigacao.has(k)}" style="--c:${GRUPOS[k].cor}">${GRUPOS[k].sig} <b>${GRUPOS[k].n}</b></button>`).join('')}</div>
    <div class="destaque" style="background:${soma >= MAIORIA ? '#167a2c' : '#0b2a7a'}"><span class="grande">${soma}</span> deputados na coligação<br><small>${soma >= MAIORIA ? `✔ Têm maioria absoluta (${soma - MAIORIA} acima dos ${MAIORIA})` : `Faltam ${MAIORIA - soma} para os ${MAIORIA}`}</small></div>
    <div class="trilhoMaioria"><span style="width:${soma / TOTAL * 100}%;background:#167a2c"></span><i style="left:${MAIORIA / TOTAL * 100}%"></i></div>
    <p class="nota"><b>Na realidade:</b> a 18 de julho de 2024, Ursula von der Leyen foi reeleita Presidente da Comissão com <b>401 votos a favor</b>, 284 contra e 22 votos brancos ou nulos. Como o Parlamento tinha então 719 deputados, eram precisos 360 votos. A votação foi secreta, por isso não se sabe exatamente quem votou em quê.</p>
    <p style="font-size:.76rem;color:var(--suave)">Fonte: comunicado de imprensa do Parlamento Europeu de 18/07/2024. Os números dos grupos são os de ${D_PLANTA}. Os deputados Não Inscritos (NI) não formam um grupo e por isso não aparecem aqui.</p>
    ${naColigacao.size ? '<button class="bt sec" id="bLimpar">Recomeçar</button>' : ''}`;
    ligarVoltar();
    pConteudo.querySelectorAll('.chip').forEach(b => b.onclick = () => { const k = b.dataset.g; naColigacao.has(k) ? naColigacao.delete(k) : naColigacao.add(k); coligacao(); });
    const bl = pConteudo.querySelector('#bLimpar'); if (bl) bl.onclick = () => { naColigacao.clear(); coligacao(); };
    pintar(l => naColigacao.has(l.g) ? { cor: corDe(l.g), luz: true } : { cor: GRUPOS[l.g] ? cApagado : (OUTROS[l.g] ? cApagado : cVazio) });
    vistaGeral();
  }

  // ---------------- 3. percurso de uma lei ----------------
  const cM = lugares.filter(l => l.g === 'M'), cK = lugares.filter(l => l.g === 'K');
  const centro = ls => ls.reduce((v, l) => v.add(l.pos), V3(0, 0, 0)).divideScalar(ls.length);
  const PASSOS = [
    { t: '1. A Comissão Europeia propõe', x: 'A Comissão Europeia tem o direito de iniciativa: é ela que apresenta a proposta de lei (regulamento ou diretiva) ao Parlamento e ao Conselho.', v: () => { const c = centro(cM); return [V3(c.x * 0.3, 13, c.z - 12), c]; }, p: l => l.g === 'M' ? { cor: corDe('M'), marca: corDe('M'), luz: true } : { cor: cApagado } },
    { t: '2. O Parlamento estuda a proposta', x: 'Uma comissão parlamentar especializada analisa a proposta e um deputado relator prepara um relatório com alterações. Os grupos políticos negoceiam o texto.', v: () => [V3(-14, 16, 2), V3(-2, 2, -10)], p: l => GRUPOS[l.g] ? { cor: corDe(l.g) } : { cor: cApagado } },
    { t: '3. Votação em plenário (1.ª leitura)', x: 'No hemiciclo, os deputados debatem e votam a posição do Parlamento em primeira leitura. Basta a maioria simples dos votos expressos.', v: () => [V3(0, 54, 4), V3(0, 0, -8.5)], p: l => GRUPOS[l.g] ? { cor: COR_VOTO.F, luz: true } : { cor: cApagado }, anima: true },
    { t: '4. O Conselho da UE decide', x: 'O Conselho (ministros dos 27 Estados-Membros) analisa a posição do Parlamento. Se a aprovar, o ato é adotado. Se não, aprova a sua própria posição e o texto volta ao Parlamento. O Conselho vota nas suas próprias reuniões; no hemiciclo, os seus lugares servem para participar nos debates.', v: () => { const c = centro(cK); return [V3(c.x * 0.3, 13, c.z - 12), c]; }, p: l => l.g === 'K' ? { cor: corDe('K'), marca: corDe('K'), luz: true } : { cor: cApagado } },
    { t: '5. Segunda leitura e conciliação', x: 'Em segunda leitura, o Parlamento pode aprovar, rejeitar ou alterar a posição do Conselho (para rejeitar ou alterar, é precisa a maioria absoluta dos membros, 361). Se continuar a não haver acordo, um comité de conciliação, com representantes das duas instituições em número igual, procura um texto comum, que depois tem de ser aprovado por ambas (terceira leitura).', v: () => [V3(0, 14, -24), V3(0, 3.5, 5)], p: l => GRUPOS[l.g] ? { cor: corDe(l.g) } : (l.g === 'K' ? { cor: corDe('K'), luz: true } : { cor: cApagado }) },
    { t: '6. A lei é publicada', x: 'Depois de adotado pelo Parlamento e pelo Conselho, o ato legislativo é assinado pelos presidentes das duas instituições e publicado no Jornal Oficial da União Europeia. Este caminho chama-se processo legislativo ordinário (artigo 294.º do Tratado sobre o Funcionamento da UE) e é o mais usado para fazer leis europeias.', v: () => [V3(0, 3.3, 9.9), V3(0, 3, -18)], p: l => GRUPOS[l.g] ? { cor: COR_VOTO.F } : (l.g === 'K' ? { cor: corDe('K') } : (l.g === 'M' ? { cor: corDe('M') } : { cor: cVazio })) },
  ];
  let passoLei = 0;
  function lei() {
    parar();
    const P = PASSOS[passoLei];
    pConteudo.innerHTML = `${voltar}
    <h3>Percurso de uma lei</h3>
    <div class="etapas">${PASSOS.map((_, i) => `<span class="${i < passoLei ? 'feita' : i === passoLei ? 'atual' : ''}"></span>`).join('')}</div>
    <div class="destaque"><b>${P.t}</b></div>
    <p>${P.x}</p>
    <div style="display:flex;gap:6px"><button class="bt sec" id="bAntL" ${passoLei === 0 ? 'disabled' : ''}>‹ Anterior</button><button class="bt claro" id="bSegL">${passoLei === PASSOS.length - 1 ? 'Recomeçar' : 'Seguinte ›'}</button></div>
    <p style="font-size:.76rem;color:var(--suave);margin-top:10px">Explicação simplificada do processo legislativo ordinário (artigo 294.º do TFUE).</p>`;
    ligarVoltar();
    pConteudo.querySelector('#bSegL').onclick = () => { passoLei = (passoLei + 1) % PASSOS.length; lei(); };
    pConteudo.querySelector('#bAntL').onclick = () => { if (passoLei > 0) { passoLei--; lei(); } };
    const [pos, alvo] = P.v(); voar(pos, alvo, 1800);
    if (P.anima) animarPlenario(); else pintar(P.p);
  }
  async function animarPlenario() {
    const meu = ++token, feitos = new Set();
    pintar(l => ({ cor: GRUPOS[l.g] ? cApagado : cApagado }));
    for (const k of ORDEM) {
      await esperar(380); if (meu !== token) return;
      feitos.add(k);
      pintar(l => feitos.has(l.g) ? { cor: COR_VOTO.F, luz: l.g === k } : { cor: cApagado });
    }
  }

  // ---------------- 4. sê deputado ----------------
  const LINGUAS = [['bg', 'български', 'búlgaro'], ['cs', 'čeština', 'checo'], ['da', 'dansk', 'dinamarquês'], ['de', 'Deutsch', 'alemão'], ['et', 'eesti', 'estónio'], ['el', 'ελληνικά', 'grego'], ['en', 'English', 'inglês'], ['es', 'español', 'espanhol'], ['fr', 'français', 'francês'], ['ga', 'Gaeilge', 'irlandês'], ['hr', 'hrvatski', 'croata'], ['it', 'italiano', 'italiano'], ['lv', 'latviešu', 'letão'], ['lt', 'lietuvių', 'lituano'], ['hu', 'magyar', 'húngaro'], ['mt', 'Malti', 'maltês'], ['nl', 'Nederlands', 'neerlandês'], ['pl', 'polski', 'polaco'], ['pt', 'português', 'português'], ['ro', 'română', 'romeno'], ['sk', 'slovenčina', 'eslovaco'], ['sl', 'slovenščina', 'esloveno'], ['fi', 'suomi', 'finlandês'], ['sv', 'svenska', 'sueco']];
  const portugueses = lugares.filter(l => l.cc === 'pt' && GRUPOS[l.g]).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  let meuLugar = null, lingua = 'pt', palavra = false;
  function deputado() {
    pConteudo.innerHTML = `${voltar}
    <h3>Sê deputado</h3>
    <p>Escolhe um dos ${portugueses.length} deputados eleitos por Portugal e senta-te no seu lugar (posição da planta oficial).</p>
    <div class="paises">${portugueses.map(l => `<button data-id="${l.id}" aria-pressed="${meuLugar === l}" title="${GRUPOS[l.g].sig}"><span class="cor" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${GRUPOS[l.g].cor}"></span> ${l.nome}</button>`).join('')}</div>
    ${meuLugar ? `
    <div class="destaque">Estás no lugar n.º ${meuLugar.id}<br><small>${meuLugar.nome} · ${GRUPOS[meuLugar.g].sig}</small></div>
    <button class="bt ${palavra ? 'claro' : 'sec'}" id="bPalavra" style="width:100%">${palavra ? '🔴 Microfone ligado — tens a palavra' : '🎤 Pedir a palavra'}</button>
    <h3>🎧 Interpretação: escolhe o canal</h3>
    <p style="font-size:.8rem">Cada deputado pode falar na sua língua. Nos auscultadores, ouve-se a interpretação simultânea numa das <b>24 línguas oficiais</b> da UE.</p>
    <div class="linguas">${LINGUAS.map(([c, n, pt]) => `<button data-l="${c}" aria-pressed="${lingua === c}" title="${pt}">${n}</button>`).join('')}</div>
    <p class="nota" id="canal">A ouvir em <b>${LINGUAS.find(x => x[0] === lingua)[2]}</b> (${LINGUAS.find(x => x[0] === lingua)[1]}).</p>` : ''}`;
    ligarVoltar();
    pConteudo.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { meuLugar = lugares.find(l => l.id === +b.dataset.id); palavra = false; sentar(); deputado(); });
    pConteudo.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { lingua = b.dataset.l; deputado(); });
    const bp = pConteudo.querySelector('#bPalavra'); if (bp) bp.onclick = () => { palavra = !palavra; deputado(); };
    if (meuLugar) pintar(l => l === meuLugar ? { cor: corDe(l.g), luz: palavra } : { cor: GRUPOS[l.g] ? new THREE.Color(0x2f4fa8) : (OUTROS[l.g] ? new THREE.Color(0x2f4fa8) : cVazio) });
    else { pintar(l => l.cc === 'pt' ? { cor: corDe(l.g), marca: corDe(l.g), luz: true } : { cor: cApagado }); vistaGeral(); }
  }
  function sentar() {
    const l = meuLugar, dir = V3(Math.sin(l.rot), 0, Math.cos(l.rot));
    voar(l.pos.clone().add(V3(0, 1.25, 0)).addScaledVector(dir, -0.35), V3(0, 3, H.zP), 2000);
  }

  // ---------------- 5. quiz ----------------
  const maior = ORDEM.reduce((a, b) => GRUPOS[a].n >= GRUPOS[b].n ? a : b);
  const PERGUNTAS = [
    ['Quantos deputados tem o Parlamento Europeu na legislatura 2024-2029?', ['705', '720', '751', '627'], 1],
    ['Em que cidade se realizam as 12 sessões plenárias anuais do Parlamento Europeu?', ['Bruxelas', 'Luxemburgo', 'Estrasburgo', 'Frankfurt'], 2],
    ['Quantos deputados elege Portugal?', ['17', '21', '24', '96'], 1],
    ['No hemiciclo, os deputados sentam-se agrupados por…', ['país', 'ordem alfabética', 'idade', 'grupo político'], 3],
    [`Qual é atualmente o maior grupo político?`, [GRUPOS[maior].sig, 'S&D', 'Renew', 'PfE'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4), 0],
    ['Quantos votos são precisos para a maioria absoluta dos 720 membros?', ['360', '361', '400', '480'], 1],
    ['Em quantas línguas oficiais são interpretados os debates?', ['12', '20', '24', '27'], 2],
    ['Qual é o Estado-Membro com mais deputados?', ['França', 'Itália', 'Alemanha', 'Espanha'], 2],
    ['Qual é o número mínimo de deputados que um Estado-Membro pode ter?', ['1', '3', '6', '10'], 2],
    ['No processo legislativo ordinário, quem apresenta a proposta de lei?', ['O Parlamento Europeu', 'A Comissão Europeia', 'O Tribunal de Justiça', 'O Banco Central Europeu'], 1],
  ];
  let qi = 0, pontos = 0, respondida = -1;
  function quiz() {
    if (qi >= PERGUNTAS.length) {
      pConteudo.innerHTML = `${voltar}<h3>Quiz final</h3>
      <div class="destaque" style="text-align:center"><span class="grande">${pontos}/${PERGUNTAS.length}</span><br><small>${pontos === PERGUNTAS.length ? 'Excelente! Sabes tudo sobre o Parlamento Europeu.' : pontos >= 7 ? 'Muito bem! Já conheces bem o Parlamento Europeu.' : pontos >= 5 ? 'Bom trabalho! Revê a visita para melhorar.' : 'Explora outra vez a visita e tenta de novo.'}</small></div>
      <button class="bt claro" id="bRep" style="width:100%">Repetir o quiz</button>`;
      ligarVoltar();
      pConteudo.querySelector('#bRep').onclick = () => { qi = 0; pontos = 0; respondida = -1; quiz(); };
      return;
    }
    const [q, ops, cert] = PERGUNTAS[qi];
    pConteudo.innerHTML = `${voltar}<h3>Quiz final · pergunta ${qi + 1} de ${PERGUNTAS.length}</h3>
    <div class="etapas">${PERGUNTAS.map((_, i) => `<span class="${i < qi ? 'feita' : i === qi ? 'atual' : ''}"></span>`).join('')}</div>
    <p style="font-size:1rem;font-weight:700">${q}</p>
    <div class="opcoes">${ops.map((o, i) => `<button data-i="${i}" class="${respondida < 0 ? '' : i === cert ? 'certa' : i === respondida ? 'errada' : ''}" ${respondida >= 0 ? 'disabled' : ''}>${o}</button>`).join('')}</div>
    ${respondida >= 0 ? `<p class="nota">${respondida === cert ? '✔ Certo!' : `✖ A resposta certa é: <b>${ops[cert]}</b>.`}</p><button class="bt claro" id="bProx" style="width:100%">${qi === PERGUNTAS.length - 1 ? 'Ver resultado' : 'Próxima pergunta ›'}</button>` : ''}
    <p style="font-size:.78rem;color:var(--suave)">Pontuação: ${pontos}</p>`;
    ligarVoltar();
    pConteudo.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { respondida = +b.dataset.i; if (respondida === cert) pontos++; quiz(); });
    const bp = pConteudo.querySelector('#bProx'); if (bp) bp.onclick = () => { qi++; respondida = -1; quiz(); };
  }

  return { menu, parar, abrir, get atual() { return atual; } };
}

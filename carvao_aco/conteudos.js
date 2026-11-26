/* Carvão e Aço: a Missão Schuman · Conteúdos (PT-PT)
   As citações da Declaração seguem a tradução portuguesa oficial publicada no portal da União Europeia:
   https://european-union.europa.eu/principles-countries-history/history-eu/1945-59/schuman-declaration-may-1950_pt */
var C = window.CONTEUDOS = {};

C.historia = [
  'Paris, Quai d\'Orsay. Sala do Relógio.',
  'Foi nesta sala que, a 9 de maio de 1950, às 18h00, o ministro francês dos Negócios Estrangeiros, Robert Schuman, leu aos jornalistas a declaração que deu origem às Comunidades Europeias.',
  'Hoje, às 18h00 em ponto, abre aqui uma exposição sobre esse dia. A cópia da declaração que vai ser lida na abertura está fechada num cofre antigo.',
  'O conservador ficou preso no trânsito. Ao telefone, disse apenas: «A combinação e a chave estão escondidas nas peças da exposição.»',
  'São 17h20. Têm 40 minutos.'
];

C.estacoes = [
  { id: 'maquina', n: '1', nome: 'Máquina de escrever', titulo: 'O nono rascunho', premio: 'ordem' },
  { id: 'relogio', n: '2', nome: 'Relógio', titulo: 'O dia mais longo', premio: 'hora' },
  { id: 'mapa', n: '3', nome: 'Mapa de 1950', titulo: 'Os Seis', premio: 'paises' },
  { id: 'tratado', n: '4', nome: 'Vitrina do Tratado', titulo: 'O Tratado de Paris', premio: 'anos' },
  { id: 'telegrama', n: '5', nome: 'Telegrama', titulo: 'Mensagem cifrada', premio: 'argola' },
  { id: 'retratos', n: '6', nome: 'Retratos', titulo: 'Os pais fundadores', premio: 'haste' },
  { id: 'jornais', n: '7', nome: 'Jornais', titulo: 'Verdade ou mentira?', premio: 'palhetao' },
  { id: 'cofre', n: '★', nome: 'Cofre', titulo: 'O cofre A. Dubois & Cie', premio: null }
];

/* ---------- Enigma 1 · O nono rascunho ---------- */
C.lacunas = [
  { antes: '«A paz mundial não poderá ser salvaguardada sem esforços', depois: 'que estejam à altura dos perigos que a ameaçam.»', opcoes: ['criativos', 'militares', 'isolados'], certa: 'criativos',
    porque: 'Schuman abre com a paz: depois de duas guerras mundiais, era preciso inventar uma solução nova, não mais armas.' },
  { antes: '«A Europa não se construirá de uma só vez, nem de acordo com um plano único. Construir-se-á através de realizações concretas que criarão, antes de mais, uma solidariedade de', depois: '.»', opcoes: ['facto', 'palavras', 'fronteiras'], certa: 'facto',
    porque: 'É a frase mais famosa: a Europa faz-se passo a passo, com projetos concretos que criam laços reais entre os países.' },
  { antes: '«A união das nações europeias exige que se ponha cobro ao secular antagonismo entre a França e a', depois: '.»', opcoes: ['Alemanha', 'Inglaterra', 'Itália'], certa: 'Alemanha',
    porque: 'França e Alemanha tinham combatido em 1870, 1914 e 1939. A reconciliação dos dois países era o ponto de partida.' },
  { antes: '«O Governo francês propõe subordinar o conjunto da produção franco-alemã de', depois: 'e de aço a uma Alta Autoridade comum, numa organização aberta à participação dos outros países da Europa.»', opcoes: ['carvão', 'petróleo', 'trigo'], certa: 'carvão',
    porque: 'Carvão e aço eram a base da indústria e das armas. Pô-los em comum tirava a cada país os meios de preparar sozinho uma guerra.' },
  { antes: '«A solidariedade de produção assim alcançada mostrará claramente que qualquer guerra entre a França e a Alemanha se tornará não só impensável mas materialmente', depois: '.»', opcoes: ['impossível', 'provável', 'adiada'], certa: 'impossível',
    porque: 'Não bastava prometer a paz: a ideia era tornar a guerra impossível na prática.' }
];
C.notaOrdem = 'Debaixo da máquina estava um cartão do conservador: «A combinação tem três números. 1.º a HORA a que Schuman leu a declaração. 2.º quantos PAÍSES assinaram o Tratado de Paris. 3.º quantos ANOS o Tratado esteve em vigor.»';

/* ---------- Enigma 2 · O dia mais longo ---------- */
C.cronologia = [
  { id: 'a', data: '8 de maio de 1945', txt: 'A Alemanha capitula. Termina a Segunda Guerra Mundial na Europa.' },
  { id: 'b', data: '9 de maio de 1950, de manhã · Bona', txt: 'Um enviado de Schuman entrega ao chanceler Konrad Adenauer a proposta francesa. Adenauer aceita.' },
  { id: 'c', data: '9 de maio de 1950, fim da manhã · Paris', txt: 'Já com o «sim» de Bona, o Conselho de Ministros francês aprova a proposta de Schuman.' },
  { id: 'd', data: '9 de maio de 1950, 18h00 · Sala do Relógio', txt: 'Schuman lê a declaração aos jornalistas, nesta mesma sala.' },
  { id: 'e', data: '18 de abril de 1951 · Paris', txt: 'Seis países assinam o Tratado que institui a Comunidade Europeia do Carvão e do Aço (CECA).' },
  { id: 'f', data: '10 de agosto de 1952 · Luxemburgo', txt: 'A Alta Autoridade, presidida por Jean Monnet, reúne-se pela primeira vez.' },
  { id: 'g', data: '1985 · Milão', txt: 'Os líderes europeus decidem celebrar o 9 de maio como Dia da Europa.' }
];

/* ---------- Enigma 3 · Os Seis ---------- */
C.paises = {
  FR: { nome: 'França', ok: true, porque: 'Foi a França que fez a proposta.' },
  DE: { nome: 'Alemanha (RFA)', ok: true, porque: 'A República Federal da Alemanha, criada em 1949, aceitou logo no dia 9 de maio.' },
  IT: { nome: 'Itália', ok: true, porque: 'A Itália de De Gasperi e Sforza assinou o Tratado.' },
  BE: { nome: 'Bélgica', ok: true, porque: 'Um dos três países do Benelux.' },
  NL: { nome: 'Países Baixos', ok: true, porque: 'Um dos três países do Benelux.' },
  LU: { nome: 'Luxemburgo', ok: true, porque: 'Um dos três países do Benelux. A Alta Autoridade ficou sediada na cidade do Luxemburgo.' },
  UK: { nome: 'Reino Unido', ok: false, porque: 'Londres recusou: não aceitava entregar o carvão e o aço a uma Alta Autoridade acima dos governos. Só entrou nas Comunidades em 1973.' },
  PT: { nome: 'Portugal', ok: false, porque: 'Em 1950 Portugal vivia em ditadura (Estado Novo). Só entrou nas Comunidades Europeias em 1986.' },
  ES: { nome: 'Espanha', ok: false, porque: 'Em 1950 a Espanha vivia na ditadura de Franco. Só entrou em 1986, tal como Portugal.' },
  CH: { nome: 'Suíça', ok: false, porque: 'A Suíça é neutral e nunca entrou nas Comunidades nem na UE.' },
  AT: { nome: 'Áustria', ok: false, porque: 'Em 1950 a Áustria estava ocupada pelas quatro potências vencedoras. Só entrou na UE em 1995.' },
  DK: { nome: 'Dinamarca', ok: false, porque: 'A Dinamarca não participou. Entrou em 1973, com o Reino Unido e a Irlanda.' }
};
C.notasMapa = [
  'O plano começa pela França e pela Alemanha Ocidental, a República Federal da Alemanha (RFA), criada em 1949. A linha tracejada vermelha é a fronteira com a RDA, a Alemanha de Leste, que estava do lado soviético.',
  'Os três países do Benelux, que já tinham uma união aduaneira, disseram que sim.',
  'O sexto país é o do ministro Carlo Sforza e do chefe do governo Alcide De Gasperi.',
  'Londres respondeu que não aceitava uma Alta Autoridade acima dos governos.',
  'Portugal e Espanha viviam em ditadura e ficaram de fora.',
  'Os triângulos pretos são as bacias de carvão e aço: repara como estão quase todas junto às fronteiras dos Seis.'
];

/* ---------- Enigma 4 · O Tratado de Paris ---------- */
C.signatarios = [
  { nome: 'Konrad Adenauer', cargo: 'Bundeskanzler und Bundesminister des Auswärtigen', cidade: 'Bonn', pais: 'DE' },
  { nome: 'Paul van Zeeland', cargo: 'Ministre des Affaires étrangères · Minister van Buitenlandse Zaken', cidade: 'Bruxelles · Brussel', pais: 'BE' },
  { nome: 'Robert Schuman', cargo: 'Ministre des Affaires étrangères', cidade: 'Paris', pais: 'FR' },
  { nome: 'Carlo Sforza', cargo: 'Ministro degli Affari Esteri', cidade: 'Roma', pais: 'IT' },
  { nome: 'Joseph Bech', cargo: 'Ministre des Affaires étrangères', cidade: 'Luxembourg', pais: 'LU' },
  { nome: 'Dirk Stikker', cargo: 'Minister van Buitenlandse Zaken', cidade: '\'s-Gravenhage', pais: 'NL' }
];
C.selos = { FR: 'França', DE: 'República Federal da Alemanha', IT: 'Itália', BE: 'Bélgica', NL: 'Países Baixos', LU: 'Luxemburgo' };
C.artigo97 = '«Le présent Traité est conclu pour une durée de cinquante ans à dater de son entrée en vigueur.»';

/* ---------- Enigma 5 · Telegrama cifrado ---------- */
C.telegrama = { chave: 9, linhas: ['ADENAUER ACEITA O PLANO', 'RESPOSTA SEGUE POR CARTA', 'MISCHLICH'] };

/* ---------- Enigma 6 · Os pais fundadores ---------- */
C.pais = [
  { id: 'schuman', nome: 'Robert Schuman', bio: 'Nasceu em 1886 no Luxemburgo e viveu na Lorena, que nessa altura pertencia à Alemanha. Só se tornou cidadão francês em 1919. Como ministro dos Negócios Estrangeiros, leu a declaração de 9 de maio.' },
  { id: 'monnet', nome: 'Jean Monnet', bio: 'Começou por vender pelo mundo o conhaque da empresa da família. Em 1950 dirigia o Plano de modernização da França. Inspirou a declaração e foi o primeiro presidente da Alta Autoridade.' },
  { id: 'adenauer', nome: 'Konrad Adenauer', bio: 'Foi presidente da câmara de Colónia até os nazis o afastarem, em 1933. Em 1949 tornou-se o primeiro chanceler da República Federal da Alemanha.' },
  { id: 'degasperi', nome: 'Alcide De Gasperi', bio: 'Nasceu em 1881 no Trentino, então parte da Áustria-Hungria, e foi deputado no parlamento de Viena. Chefiou o governo italiano de 1945 a 1953.' }
];

/* ---------- Enigma 7 · Verdade ou mentira? ---------- */
C.manchetes = [
  { t: 'Schuman propõe pôr o carvão e o aço da França e da Alemanha sob uma Alta Autoridade comum.', v: true, porque: 'É o centro da proposta.' },
  { t: 'A proposta é só para a França e a Alemanha: mais nenhum país pode entrar.', v: false, porque: 'A declaração fala de uma organização «aberta à participação dos outros países da Europa».' },
  { t: 'A Declaração Schuman cria a União Europeia.', v: false, porque: 'Abriu caminho à CECA (1951–1952). A União Europeia só nasceu com o Tratado de Maastricht, em 1993.' },
  { t: 'O objetivo é tornar a guerra entre a França e a Alemanha «não só impensável mas materialmente impossível».', v: true, porque: 'É uma citação da declaração.' },
  { t: 'Schuman garante que a Europa se fará de uma só vez, com um plano único.', v: false, porque: 'Diz o contrário: «A Europa não se construirá de uma só vez, nem de acordo com um plano único.»' },
  { t: 'O Reino Unido assina o Tratado de Paris em 1951.', v: false, porque: 'O Reino Unido recusou participar. Só entrou em 1973.' },
  { t: 'As decisões da Alta Autoridade serão obrigatórias para os países aderentes.', v: true, porque: 'A declaração diz que as decisões «serão de execução obrigatória» na França, na Alemanha e nos restantes países aderentes.' }
];

/* ---------- Pistas (2 por enigma) ---------- */
C.pistas = {
  maquina: ['Pensem no que Schuman queria evitar: a guerra. Que tipo de esforço ajuda a paz?', 'Carvão e aço eram a base das armas em 1950. A rivalidade de séculos era com a Alemanha.'],
  relogio: ['Comecem pelo fim da guerra (1945) e acabem no Dia da Europa (1985).', 'No dia 9 de maio, primeiro Bona disse «sim», depois o Governo francês aprovou e só às 18h00 Schuman falou.'],
  mapa: ['Benelux = Bélgica, Países Baixos (Nederland) e Luxemburgo.', 'A França e a Alemanha começam. O sexto país é a Itália.'],
  tratado: ['Olhem para a língua do cargo e para a cidade. Bruxelas tem duas línguas, francês e neerlandês.', '«Cinquante ans» quer dizer cinquenta anos: de 1952 a 2002.'],
  telegrama: ['A chave é o dia do mês em que tudo começou.', 'Rodem o disco interior até a chave ser 9.'],
  retratos: ['Quem leu a declaração nasceu no Luxemburgo. O primeiro chanceler da RFA foi presidente da câmara de Colónia.', 'O italiano nasceu quando o Trentino era austríaco. Quem vendia conhaque era Monnet.'],
  jornais: ['Três manchetes são verdadeiras. Comparem com as frases que completaram na máquina de escrever.', 'A UE só nasceu em 1993 e o Reino Unido só entrou em 1973.'],
  cofre: ['A hora: 18. Os países: 6. Os anos: 50.', 'A chave só entra quando tiverem as três partes: argola, haste e palhetão.']
};

/* ---------- O que aprenderam (aparece ao resolver) ---------- */
C.sabiam = {
  maquina: 'A declaração foi preparada em segredo pela equipa de Jean Monnet, com Paul Reuter, Pierre Uri, Étienne Hirsch e Bernard Clappier, e teve nove versões.',
  relogio: 'Quase não havia jornalistas nem fotógrafos na sala. Por isso, Schuman teve de repetir a leitura mais tarde, para ficar gravada.',
  mapa: 'A França, a RFA, a Itália, a Bélgica, os Países Baixos e o Luxemburgo ficaram conhecidos como «os Seis».',
  tratado: 'O Tratado entrou em vigor a 23 de julho de 1952 e terminou a 23 de julho de 2002. O carvão e o aço passaram então para as regras gerais da Comunidade Europeia.',
  telegrama: 'A proposta foi mostrada a Adenauer na manhã de 9 de maio, antes de ser anunciada. Sem o «sim» alemão, Schuman não teria avançado.',
  retratos: 'Schuman, Monnet, Adenauer e De Gasperi estão entre os chamados «pais fundadores» da Europa unida.',
  jornais: 'O 9 de maio é o Dia da Europa desde 1985. A UE nasceu mais tarde, em 1993, com o Tratado de Maastricht.'
};

/* ---------- Final: resumo e texto integral ---------- */
C.resumo = [
  ['A paz primeiro', 'Cinco anos depois da Segunda Guerra Mundial, Schuman diz que a paz só se salva com ideias novas e corajosas.'],
  ['Passo a passo', 'A Europa não se faz de uma vez. Faz-se com realizações concretas que criam uma «solidariedade de facto».'],
  ['França e Alemanha', 'É preciso acabar com a rivalidade de séculos entre os dois países. Tudo começa por aí.'],
  ['Carvão e aço em comum', 'A produção de carvão e de aço da França e da Alemanha passa para uma Alta Autoridade comum, aberta a outros países.'],
  ['Guerra impossível', 'Com as indústrias de base ligadas, uma guerra entre os dois países torna-se «não só impensável mas materialmente impossível».'],
  ['Regras comuns', 'As decisões da Alta Autoridade são obrigatórias, há direito de recurso e tudo é fixado num tratado aprovado pelos parlamentos. É a «primeira etapa da federação europeia».']
];
C.declaracao = [
  'A paz mundial não poderá ser salvaguardada sem esforços criativos que estejam à altura dos perigos que a ameaçam.',
  'A contribuição que uma Europa organizada e dinâmica pode dar à civilização é indispensável para a manutenção de relações pacíficas. Ao assumir-se há mais de 20 anos como defensora de uma Europa unida, a França teve sempre por objetivo essencial servir a paz. Por a Europa não se ter unido, tivemos a guerra.',
  'A Europa não se construirá de uma só vez, nem de acordo com um plano único. Construir-se-á através de realizações concretas que criarão, antes de mais, uma solidariedade de facto. A união das nações europeias exige que se ponha cobro ao secular antagonismo entre a França e a Alemanha. Qualquer ação deve envolver principalmente estes dois países.',
  'Com esse objetivo, o Governo francês propõe-se atuar imediatamente num plano limitado mas decisivo.',
  'O Governo francês propõe subordinar o conjunto da produção franco-alemã de carvão e de aço a uma Alta Autoridade comum, numa organização aberta à participação dos outros países da Europa. A congregação das produções de carvão e de aço garantirá imediatamente o estabelecimento de bases comuns de desenvolvimento económico, primeira etapa da federação europeia, e mudará o destino de regiões que há muito se dedicam ao fabrico de armas de guerra e delas têm sido as principais vítimas.',
  'A solidariedade de produção assim alcançada mostrará claramente que qualquer guerra entre a França e a Alemanha se tornará não só impensável mas materialmente impossível. A criação desta poderosa unidade de produção, aberta a todos os países que nela queiram participar, que proporcionará, por fim, a todos os países que a compõem os elementos fundamentais da produção industrial em condições idênticas, lançará os fundamentos reais da sua unificação económica.',
  'Esta produção será oferecida a todos os países do mundo, sem distinção nem exclusão, a fim de contribuir para a melhoria do nível de vida e para o desenvolvimento das obras de paz. Com meios acrescidos, a Europa poderá prosseguir a realização de uma das suas funções essenciais: o desenvolvimento do continente africano. Assim se realizará, simples e rapidamente, a fusão de interesses indispensável à criação de uma comunidade económica e introduzirá o fermento de uma comunidade mais vasta e mais profunda entre países durante muito tempo opostos por divisões sangrentas.',
  'Esta proposta, por intermédio da congregação de produções de base e da instituição de uma nova Alta Autoridade cujas decisões vincularão a França, a Alemanha e os países aderentes, lançará as primeiras bases concretas de uma federação europeia indispensável à preservação da paz.',
  'A fim de prosseguir a realização dos objetivos assim definidos, o Governo francês está disposto a iniciar negociações nas seguintes bases.',
  'A missão atribuída à Alta Autoridade comum consistirá em assegurar, a breve trecho: a modernização da produção e a melhoria da sua qualidade; o fornecimento, em condições idênticas, de carvão e de aço nos mercados francês, alemão e dos países aderentes; o desenvolvimento da exportação comum para outros países; a harmonização no progresso das condições de vida da mão-de-obra dessas indústrias.',
  'Para atingir estes objetivos a partir das condições muito díspares em que atualmente se encontram as produções dos países aderentes, deverão ser tomadas, a titulo provisório, determinadas disposições, incluindo a aplicação de um plano de produção e de investimentos, a instituição de mecanismos de perequação dos preços e a criação de um fundo de reconversão destinado a facilitar a racionalização da produção. A circulação do carvão e do aço entre os países aderentes ficará imediatamente isenta de qualquer direito aduaneiro, não podendo ser afetada por tarifas de transportes distintas. Progressivamente, criar-se-ão condições para assegurar espontaneamente a repartição mais racional da produção ao mais elevado nível de produtividade.',
  'Ao contrário de um cartel internacional que tende a repartir e a explorar os mercados nacionais com base em práticas restritivas e na manutenção de elevados lucros, a organização projetada assegurará a fusão dos mercados e a expansão da produção.',
  'Os princípios e compromissos essenciais acima definidos serão objeto de um tratado assinado entre os Estados e submetidos a ratificação pelos parlamentos. As negociações indispensáveis para precisar as medidas de aplicação serão realizadas com a assistência de um mediador designado por comum acordo; este terá a missão de velar por que os acordos respeitem os princípios e, em caso de oposição irredutível, fixará a solução a adotar.',
  'A Alta Autoridade comum, responsável pelo funcionamento de todo o regime, será composta por personalidades independentes designadas numa base paritária pelos governos; o presidente será escolhido de comum acordo entre os governos; as suas decisões serão de execução obrigatória na França, na Alemanha e nos restantes países aderentes. As necessárias vias de recurso contra as decisões da Alta Autoridade serão asseguradas por disposições adequadas.',
  'Um representante das Nações Unidas junto da referida Alta Autoridade elaborará semestralmente um relatório público destinado à ONU, dando conta do funcionamento do novo organismo, nomeadamente no que diz respeito à salvaguarda dos seus fins pacíficos.',
  'A instituição da Alta Autoridade em nada prejudica o regime de propriedade das empresas. No exercício da sua missão, a Alta Autoridade comum terá em conta os poderes conferidos à autoridade internacional da região do Ruhr e quaisquer outras obrigações impostas à Alemanha, enquanto estas subsistirem.'
];
C.conversar = [
  'Porque é que Schuman escolheu o carvão e o aço, e não outra coisa?',
  'O que quer dizer «solidariedade de facto»? Deem um exemplo da vossa escola ou da vossa terra.',
  'A declaração fala do «desenvolvimento do continente africano». Em 1950, a França e a Bélgica ainda tinham colónias em África. Como leríamos hoje essa frase?',
  'A proposta estava aberta a todos os países europeus. Porque é que Portugal só entrou em 1986?',
  'O 9 de maio é o Dia da Europa. Que «realização concreta» europeia conhecem no vosso dia a dia?'
];
C.fontes = [
  ['Declaração Schuman, texto integral em português · Portal da União Europeia', 'https://european-union.europa.eu/principles-countries-history/history-eu/1945-59/schuman-declaration-may-1950_pt'],
  ['A Declaração Schuman · Conselho da União Europeia', 'https://www.consilium.europa.eu/pt/schuman-declaration/'],
  ['A conferência de imprensa (Sala do Relógio, 18h00, nove rascunhos) · Europeana', 'https://europeana.eu/exhibitions/70th-anniversary-of-the-schuman-declaration/the-press-conference'],
  ['Declaração de 9 de maio · Fondation Robert Schuman', 'https://robert-schuman.eu/en/declaration-du-9-mai-1950'],
  ['O Tratado CECA (assinatura, Alta Autoridade, 50 anos) · Arquivos diplomáticos de França', 'https://www.diplomatie.gouv.fr/en/the-ministry-and-its-network/the-diplomatic-archives/documents-from-the-diplomatic-archives/the-birth-of-europe-the-treaty-establishing-the-european-coal-and-steel/ii-european-coal-and-steel-community'],
  ['Robert Mischlich, a missão secreta a Bona · CVCE (Universidade do Luxemburgo)', 'https://www.cvce.eu/en/obj/robert_mischlich_a_secret_mission_to_bonn_extract_on_how_the_plan_was_disclosed_to_konrad_adenauer-en-ef6127b8-0859-4f94-ae42-2a7ebab7a011.html'],
  ['Tratado de Paris · Parlamento Europeu', 'https://www.europarl.europa.eu/about-parliament/da/in-the-past/the-parliament-and-the-treaties/treaty-of-paris']
];

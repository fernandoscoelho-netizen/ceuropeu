# Carvão e Aço: a Missão Schuman

2.ª versão do escape room «O Cofre de Schuman». A versão original continua na pasta `Cofre_de_Schuman`.

## O jogo

Paris, Quai d'Orsay, Sala do Relógio (Salon de l'Horloge), a sala onde Robert Schuman leu a declaração a 9 de maio de 1950, às 18h00. Hoje abre ali uma exposição às 18h00 e a cópia da declaração está fechada num cofre. As equipas têm 40 minutos (das 17h20 às 18h00, no relógio da lareira) para resolver 7 enigmas, por qualquer ordem, e abrir o cofre.

| N.º | Peça da sala | Enigma | Dá |
|---|---|---|---|
| 1 | Máquina de escrever | Completar 5 extratos da Declaração (tradução oficial) | Ordem da combinação |
| 2 | Relógio da lareira | Cronologia de 1945 a 1985 | 18 (hora) |
| 3 | Mapa de 1950 | Escolher os seis países fundadores | 6 (países) |
| 4 | Vitrina do Tratado | Ligar os signatários aos países e ler o artigo 97 | 50 (anos) |
| 5 | Telegrama de Bona | Decifrar com um disco de cifra (chave 9) | Argola da chave |
| 6 | Painel dos retratos | Schuman, Monnet, Adenauer, De Gasperi | Haste da chave |
| 7 | Jornais de 10 de maio | Manchetes verdadeiras ou falsas | Palhetão da chave |
| ★ | Cofre | Combinação 18 · 6 · 50 e a chave | Fim |

No fim aparecem: certificado da equipa (para imprimir), a Declaração em seis ideias, o **texto integral** em português, o que aprenderam, perguntas para debate e as fontes. O botão «Guia do professor» tem as soluções e o botão para recomeçar entre turmas.

## Técnica

- Sala 3D em three.js r160, incluída em `vendor/` (funciona sem Internet e no GitHub Pages).
- Toda a modelação é feita em código (geometrias e texturas desenhadas em canvas): parquet em espinha, boiserie dourada, lareira de mármore, relógio de bronze, lustres de cristal, janelas com cortinas de veludo e sol da tarde, cadeiras Luís XVI, máquina de escrever, telefone de disco, vitrina, cofre com marcador 0–99 e porta que abre.
- Reflexos reais: a sala é fotografada uma vez num cubo e usada no espelho e nos metais.
- Se o computador não tiver WebGL, o jogo funciona com a barra de baixo.
- O progresso fica guardado no browser.
- Mapa: Eurostat / GISCO 2024, © EuroGeographics (uso educativo não comercial), com a fronteira RFA/RDA de 1950 traçada à parte (aproximada).

## Problemas encontrados na versão 1 (`Cofre_de_Schuman`)

1. **Os enigmas não são sobre a Declaração.** Os quatro guardiões (votos, ecoponto, fraude, lema da UE) trabalham as fichas de Cidadania, mas nenhum fala de Schuman, de Monnet, do carvão e do aço, da CECA ou do Tratado de Paris. A Declaração é só o cenário.
2. **«É aqui que começa a construção da União Europeia»** simplifica demasiado: a Declaração leva à CECA (1951–1952). A UE só nasce em 1993, com Maastricht.
3. **Anacronismo no cofre de 1950:** tem as 12 estrelas da bandeira europeia, que só foi adotada em 1955 (Conselho da Europa) e em 1985 pelas Comunidades.
4. **Citação diferente da tradução oficial:** o jogo escreve «A Europa não se fará de uma só vez… Far-se-á…»; a tradução portuguesa do portal da UE diz «não se construirá… Construir-se-á…».
5. **Lógica do 4.º guardião:** a ordem do código (Planeta, Democracia, Economia) é dada sem razão nenhuma; não se deduz da palavra UNIDA nem de outra pista.
6. **«O texto desta declaração foi fechado num cofre»** é ficção, mas não está assinalado como tal.
7. Precisa de Internet: o three.js r128 vem de um CDN.

## Fontes

- Declaração Schuman, texto integral em português, portal da União Europeia: https://european-union.europa.eu/principles-countries-history/history-eu/1945-59/schuman-declaration-may-1950_pt
- Conselho da UE: https://www.consilium.europa.eu/pt/schuman-declaration/
- Europeana, a conferência de imprensa: https://europeana.eu/exhibitions/70th-anniversary-of-the-schuman-declaration/the-press-conference
- Fondation Robert Schuman: https://robert-schuman.eu/en/declaration-du-9-mai-1950
- Arquivos diplomáticos de França, o Tratado CECA: https://www.diplomatie.gouv.fr/en/the-ministry-and-its-network/the-diplomatic-archives/documents-from-the-diplomatic-archives/the-birth-of-europe-the-treaty-establishing-the-european-coal-and-steel/ii-european-coal-and-steel-community
- CVCE, Robert Mischlich e a missão a Bona: https://www.cvce.eu/en/obj/robert_mischlich_a_secret_mission_to_bonn_extract_on_how_the_plan_was_disclosed_to_konrad_adenauer-en-ef6127b8-0859-4f94-ae42-2a7ebab7a011.html

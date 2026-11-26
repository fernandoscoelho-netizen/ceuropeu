// Gera js/recursos.js com as bandeiras (SVG) e os logótipos em data URI,
// para que as texturas 3D funcionem também ao abrir o jogo com duplo clique (file://).
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const band = {};
for (const f of fs.readdirSync(path.join(raiz, 'img/bandeiras'))) {
  if (!f.endsWith('.svg')) continue;
  band[f.slice(0, -4)] = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(raiz, 'img/bandeiras', f)).toString('base64');
}
const logos = {};
for (const f of ['clube-europeu.png', 'agrupamento-spc.png'])
  logos[f.replace('.png', '')] = 'data:image/png;base64,' + fs.readFileSync(path.join(raiz, 'img/logos', f)).toString('base64');
fs.writeFileSync(path.join(raiz, 'js/recursos.js'),
  '/* Gerado por ferramentas/gerar-recursos.cjs — bandeiras (flag-icons, MIT) e logótipos em data URI */\n' +
  'window.BANDEIRAS_DATA=' + JSON.stringify(band) + ';\nwindow.LOGOS_DATA=' + JSON.stringify(logos) + ';\n');
console.log('recursos.js', Object.keys(band).length, 'bandeiras');

// Junta o jogo num só ficheiro HTML (missao-europa-ficheiro-unico.html),
// com CSS, bibliotecas, dados e imagens incluídos. Funciona offline com duplo clique.
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const ler = f => fs.readFileSync(path.join(raiz, f), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, f) => `<style>\n${ler(f)}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => `<script>\n${ler(f).replace(/<\/script/gi, '<\\/script')}\n</script>`);
html = html.replace(/(src|href)="(img\/logos\/[^"]+\.png)"/g, (m, a, f) => `${a}="data:image/png;base64,${fs.readFileSync(path.join(raiz, f)).toString('base64')}"`);
fs.writeFileSync(path.join(raiz, 'missao-europa-ficheiro-unico.html'), html);
console.log('missao-europa-ficheiro-unico.html', (html.length / 1024 / 1024).toFixed(2), 'MB');

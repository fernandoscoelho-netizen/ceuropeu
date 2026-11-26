import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'inline' });
let js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const tpl = fs.readFileSync('src/template.html', 'utf8');
const out = tpl.replace('<script>/*__APP__*/</script>', () => '<script>\n/* Visita virtual ao Parlamento Europeu. Motor 3D: three.js (MIT, © 2010-2024 three.js authors). */\n' + js + '\n</script>');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', out);
console.log('ok', (out.length / 1024).toFixed(0) + ' KB');

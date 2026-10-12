// Empaqueta AuditOS en UN solo archivo HTML (código, estilos y logos incluidos) para abrirlo con doble clic.
// Uso: node scripts/build-single.mjs   →  dist/auditos.html  y  dist/auditos.artifact.html (fragmento para publicar)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root));
const dataUri = (p, mime) => `data:${mime};base64,${read(p).toString('base64')}`;

const js = (await build({ entryPoints: [new URL('js/app.js', root).pathname], bundle: true, external: ['./config.local.js'], format: 'iife', minify: true, write: false, target: 'es2020' })).outputFiles[0].text
  .replaceAll('assets/logo.webp', dataUri('assets/logo.webp', 'image/webp')).replaceAll('</script', '<\\/script');

const mono = dataUri('assets/monograma.png', 'image/png');
const css = (read('css/tokens.css').toString() + '\n' + read('css/app.css').toString()).replaceAll('url(../assets/monograma.png)', `url(${mono})`);

// cuerpo de la aplicación = lo que hay dentro de <body> de index.html, sin el <script>
const indexHtml = read('index.html').toString();
const body = indexHtml.slice(indexHtml.indexOf('<body>') + 6, indexHtml.indexOf('</body>')).replace(/\s*<script[^>]*><\/script>\s*/g, '\n').trim();
const favicon = dataUri('assets/favicon.png', 'image/png');

mkdirSync(new URL('dist/', root), { recursive: true });

const full = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#121214">
<title>AuditOS · Auditoría externa</title>
<link rel="icon" type="image/png" href="${favicon}">
<style>${css}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;
writeFileSync(new URL('dist/auditos.html', root), full);

// versión para publicar como Artifact (el publicador agrega doctype/head/body)
const fragment = `<title>AuditOS Monterroso</title>\n<style>${css}</style>\n${body}\n<script>${js}</script>\n`;
writeFileSync(new URL('dist/auditos.artifact.html', root), fragment);
console.log(`dist/auditos.html ${(full.length / 1024).toFixed(0)} KB · artifact ${(fragment.length / 1024).toFixed(0)} KB`);

// Accesibilidad: contraste WCAG AA de todos los pares de colores en ambos temas, leyendo css/tokens.css.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

function block(startRe) {
  const m = startRe.exec(css);
  if (!m) throw new Error(`bloque no encontrado: ${startRe}`);
  let i = css.indexOf('{', m.index); const from = i + 1; let depth = 1;
  while (depth && ++i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; }
  return css.slice(from, i);
}
const vars = (txt) => Object.fromEntries([...txt.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

const light = vars(block(/^:root \{/m));
const dark = { ...vars(block(/^:root\[data-theme="dark"\] \{/m)) };
const darkMedia = vars(block(/^\s*:root:not\(\[data-theme="light"\]\) \{/m));

function rgba(c) {
  c = c.trim();
  let m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = c.match(/^rgba?\(([^)]+)\)$/i);
  if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error(`color no soportado: ${c}`);
}
const over = (fg, bg) => { const [r, g, b, a] = rgba(fg); const B = rgba(bg); return [0, 1, 2].map((i) => [r, g, b][i] * a + B[i] * (1 - a)).concat(1); };
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function pairs(T, name) {
  const bg = T.bg;
  const solid = (k) => over(T[k], bg);
  const list = [];
  for (const fg of ['text', 'text-2', 'text-3', 'accent-text']) for (const on of ['bg', 'surface-solid', 'surface-2']) list.push([`${name}: ${fg} sobre ${on}`, rgba(T[fg]), on === 'bg' ? rgba(bg) : solid(on), 4.5]);
  list.push([`${name}: texto sobre tarjeta de vidrio`, rgba(T.text), over(T.surface, bg), 4.5]);
  list.push([`${name}: texto-2 sobre tarjeta de vidrio`, rgba(T['text-2']), over(T.surface, bg), 4.5]);
  list.push([`${name}: tinta del oro sobre fondo suave`, rgba(T['accent-soft-ink']), over(T['accent-soft'], T['surface-solid']), 4.5]);
  list.push([`${name}: texto de botón sobre oro (inicio)`, rgba(T['btn-ink']), rgba(T['btn-from']), 4.5]);
  list.push([`${name}: texto de botón sobre oro (fin)`, rgba(T['btn-ink']), rgba(T['btn-to']), 4.5]);
  for (const c of ['lav', 'mint', 'peach', 'sky', 'rose', 'sun']) list.push([`${name}: chip ${c}`, rgba(T[`${c}-ink`]), rgba(T[c]), 4.5]);
  list.push([`${name}: acento (anillo de foco) sobre fondo`, rgba(T.accent), rgba(bg), 3]);
  return list;
}

for (const [name, T] of [['claro', light], ['oscuro', dark]]) {
  test(`contraste AA · ${name}`, () => {
    const fails = pairs(T, name).map(([n, f, b, min]) => [n, ratio(f, b), min]).filter(([, r, min]) => r < min);
    assert.deepEqual(fails.map(([n, r, min]) => `${n}: ${r.toFixed(2)} < ${min}`), []);
  });
}

test('contraste AA · barra lateral (siempre carbón)', () => {
  const sb = rgba(light['sidebar-bg']);
  const items = [['texto', '#f2efe8', 4.5], ['texto-2', '#bdb8ac', 4.5], ['texto-3', '#9b968b', 4.5], ['oro', '#d4b072', 4.5]];
  const fails = items.filter(([, c, min]) => ratio(rgba(c), sb) < min).map(([n]) => n);
  assert.deepEqual(fails, []);
  const cur = over('rgba(212, 176, 114, 0.20)', light['sidebar-bg']);
  assert.ok(ratio(rgba('#f0d9a8'), cur) >= 4.5, 'elemento activo del menú');
});

test('el bloque oscuro automático es idéntico al manual', () => {
  assert.deepEqual(darkMedia, Object.fromEntries(Object.entries(dark)));
});

test('los dos temas definen los mismos tokens de color', () => {
  const need = ['bg', 'surface', 'surface-2', 'text', 'text-2', 'text-3', 'accent', 'accent-text', 'accent-soft', 'btn-from', 'btn-to', 'btn-ink', 'lav', 'lav-ink', 'mint', 'mint-ink', 'peach', 'peach-ink', 'sky', 'sky-ink', 'rose', 'rose-ink', 'sun', 'sun-ink'];
  for (const k of need) { assert.ok(k in light, `claro sin ${k}`); assert.ok(k in dark, `oscuro sin ${k}`); }
});

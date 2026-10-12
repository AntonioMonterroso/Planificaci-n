// Reglas de seguridad del proyecto (CLAUDE.md) convertidas en pruebas: si alguien las rompe, `npm test` falla.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', 'assets'].includes(n)) continue;
    const p = join(dir, n); const st = statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const files = walk(root);
const src = (exts) => files.filter((f) => exts.includes(extname(f)));
const read = (f) => readFileSync(f, 'utf-8');
const rel = (f) => f.slice(root.length);

test('el código del navegador no usa eval, new Function, innerHTML ni document.write', () => {
  const bad = [];
  for (const f of src(['.js']).filter((f) => rel(f).startsWith('js/') && !rel(f).endsWith('config.example.js'))) {
    const t = read(f).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const re of [/\beval\s*\(/, /new\s+Function\s*\(/, /\.innerHTML\b/, /\.outerHTML\s*=/, /insertAdjacentHTML/, /document\.write\s*\(/]) if (re.test(t)) bad.push(`${rel(f)}: ${re}`);
  }
  assert.deepEqual(bad, []);
});

test('la CSP es estricta: sin unsafe-inline ni unsafe-eval y conexión solo a self y a un dominio de Supabase', () => {
  const html = read(join(root, 'index.html'));
  const csp = html.match(/Content-Security-Policy"\s+content="([^"]+)"/)[1];
  assert.ok(!/unsafe-inline|unsafe-eval|\*\s*;|\*$/.test(csp), csp);
  for (const d of ['default-src', 'script-src', 'style-src', 'object-src', 'base-uri', 'form-action']) assert.match(csp, new RegExp(d));
  assert.match(csp, /object-src 'none'/); assert.match(csp, /base-uri 'none'/); assert.match(csp, /form-action 'none'/);
  const conn = csp.match(/connect-src ([^;]+)/)[1].split(/\s+/);
  assert.ok(conn.every((c) => c === "'self'" || /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(c)), conn.join(' '));
  assert.ok(!/<script(?![^>]*src=)[^>]*>[^<]/i.test(html), 'sin scripts en línea');
  assert.ok(!/\sstyle=|<style/i.test(html), 'sin estilos en línea');
});

test('no hay secretos ni claves en el repositorio', () => {
  const patterns = [
    [/eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
    [/sbp_[a-f0-9]{30,}/, 'token personal de Supabase'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'llave privada'],
    [/service_role['"]?\s*[:=]\s*['"]eyJ/, 'clave service_role'],
    [/(AKIA|ASIA)[A-Z0-9]{16}/, 'clave AWS'],
    [/(password|passwd|contrase[nñ]a)\s*[:=]\s*['"][^'"\s]{6,}['"]/i, 'contraseña literal'],
  ];
  const hits = [];
  for (const f of files.filter((f) => !/\.(png|webp|ico|lock)$/.test(f) && !rel(f).startsWith('package-lock'))) {
    const t = read(f);
    for (const [re, name] of patterns) if (re.test(t)) hits.push(`${rel(f)}: ${name}`);
  }
  assert.deepEqual(hits, []);
});

test('no se versionan datos de clientes ni archivos de oficina', () => {
  const bad = files.filter((f) => /\.(xlsx|xlsm|xls|docx|doc|pdf|zip)$/i.test(f)).map(rel);
  assert.deepEqual(bad, []);
  assert.ok(!existsConfig(), 'js/config.local.js no debe estar en el repo');
});
function existsConfig() { try { statSync(join(root, 'js/config.local.js')); return true; } catch { return false; } }

test('toda tabla de las migraciones tiene RLS activa y forzada', () => {
  const sql = readdirSync(join(root, 'supabase/migrations')).map((n) => read(join(root, 'supabase/migrations', n))).join('\n');
  const tables = [...sql.matchAll(/create table (\w+)/g)].map((m) => m[1]);
  assert.ok(tables.length >= 8);
  for (const t of tables) {
    assert.match(sql, new RegExp(`alter table ${t} enable row level security`), `${t}: RLS`);
    assert.match(sql, new RegExp(`alter table ${t} force row level security`), `${t}: FORCE RLS`);
  }
});

test('el código del navegador no usa la clave service_role', () => {
  for (const f of src(['.js', '.html']).filter((f) => rel(f).startsWith('js/') || rel(f) === 'index.html')) assert.ok(!/service_role/i.test(read(f).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), rel(f));
});

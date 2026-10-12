import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const py = (args, input) => spawnSync('python3', args, { encoding: 'utf-8', input });
const hasOpenpyxl = py(['-c', 'import openpyxl']).status === 0;

test('el extractor toma solo el texto de las preguntas y nunca las respuestas', { skip: !hasOpenpyxl }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'extraer-'));
  const xlsx = join(dir, 'Cuestionario de prueba.xlsx');
  const make = py(['-c', `
import openpyxl
wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Cuestionario'
ws.append(['CUESTIONARIO DE PRUEBA'])
ws.append(['Factores', 'Hechos o condiciones', None, 'Aplica SI/NO', 'Ref. PT'])
ws.append(['Alfa', '¿La entidad tiene operaciones de prueba complejas?', None, 'SI', 'B-12'])
ws.append([None, '¿Existen cambios de prueba en el sector?', None, 'NO', None])
ws.append(['Beta', '¿Hay transacciones de prueba con partes vinculadas?', None, 'SI', None])
wb.save(${JSON.stringify(xlsx)})`]);
  assert.equal(make.status, 0, make.stderr);
  const out = join(dir, 'borrador.json');
  const run = py(['-I', join(root, 'scripts/extraer_formato.py'), xlsx, out]);
  assert.equal(run.status, 0, run.stderr);
  const d = JSON.parse(readFileSync(out, 'utf-8'));
  assert.equal(d.borrador, true);
  assert.equal(d.id, 'cuestionario-de-prueba');
  const items = d.hojas[0].items;
  assert.equal(items.length, 3);
  assert.equal(items[0].seccion, 'Alfa'); assert.equal(items[2].seccion, 'Beta');
  const raw = readFileSync(out, 'utf-8');
  assert.ok(!raw.includes('B-12'), 'no se copian las respuestas ni referencias');
});

test('rechaza archivos con macros (.xlsm) y avisa de vbaProject.bin', { skip: !hasOpenpyxl }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'extraer-'));
  const xlsm = join(dir, 'x.xlsm'); writeFileSync(xlsm, 'no importa');
  const r = py(['-I', join(root, 'scripts/extraer_formato.py'), xlsm]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /xlsx/);
  const ok = join(dir, 'm.xlsx');
  const make = py(['-c', `
import openpyxl, zipfile
wb = openpyxl.Workbook(); wb.active.append(['¿Pregunta de prueba con texto suficiente?']); wb.save(${JSON.stringify(ok)})
with zipfile.ZipFile(${JSON.stringify(ok)}, 'a') as z: z.writestr('xl/vbaProject.bin', b'x')`]);
  assert.equal(make.status, 0, make.stderr);
  const res = py(['-I', join(root, 'scripts/extraer_formato.py'), ok]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(JSON.parse(res.stdout).advertencias.join(), /macros VBA/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../js/core/ledger.js';
import { demoData } from '../js/demo/data.js';
import { RUBROS, buildPackage, pendingRubros, withPackage } from '../js/core/paquetes.js';

const base = () => new Ledger(demoData());
const errors = (L) => L.issues.filter((i) => i.severity === 'error');

test('los rubros pendientes son las líneas de la centralizadora sin enlace', () => {
  assert.deepEqual(pendingRubros(base()), ['B', 'C', 'D', 'AA', 'BB']);
});

test('cada rubro del catálogo genera una jerarquía enlazada y sin errores estructurales', () => {
  for (const code of Object.keys(RUBROS)) {
    const papers = buildPackage(code);
    const L = new Ledger({ papers: [{ ref: 'BG', kind: 'centralizadora', title: 'BG', lines: [{ key: code, code, label: RUBROS[code].title, link: code, section: RUBROS[code].section }] }, ...papers] });
    assert.deepEqual(errors(L), [], code);
    assert.equal(L.issues.filter((i) => i.code === 'hijo_sin_enlace' || i.code === 'enlace_roto').length, 0, code);
    assert.equal(L.get(code).totals.contab, 0);
  }
});

test('generar el paquete traslada el saldo y la centralizadora sigue cuadrando', () => {
  const L0 = base();
  const before = L0.get('BG').sections;
  const L1 = withPackage(L0, 'B');
  assert.equal(L1.get('B').totals.contab, 80000);
  assert.deepEqual(L1.get('BG').sections, before);
  assert.deepEqual(errors(L1), errors(L0));
  assert.equal(L1.paper('BG').lines.find((l) => l.key === 'B').link, 'B');
  assert.equal(L1.paper('B1').parent, 'B');
});

test('conserva el origen del saldo trasladado y reubica los ajustes de la línea', () => {
  const L1 = withPackage(base(), 'B');
  const leaf = L1.paper('B1').lines[0];
  assert.equal(leaf.source, 'Balanza de comprobación');
  const entry = L1.adjustments[0].entries.find((e) => e.side === 'debe');
  assert.deepEqual([entry.ref, entry.key], ['B1', 'saldo']);
  assert.equal(L1.get('BG').lines.find((l) => l.key === 'B').audit, 80300);
  assert.deepEqual(errors(L1), []);
});

test('no se genera dos veces ni un rubro inexistente', () => {
  const L1 = withPackage(base(), 'C');
  assert.throws(() => withPackage(L1, 'C'), /Ya existe|ya tiene/);
  assert.throws(() => withPackage(base(), 'ZZ'), /desconocido/);
  assert.throws(() => withPackage(base(), 'A'), /ya tiene paquete|Ya existe/);
});

test('se pueden generar todos los rubros en secuencia', () => {
  let L = base();
  for (const c of pendingRubros(L)) L = withPackage(L, c);
  assert.deepEqual(pendingRubros(L), []);
  assert.deepEqual(errors(L), []);
});

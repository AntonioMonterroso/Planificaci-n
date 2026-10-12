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

import { addChild, addLine, removeChild } from '../js/core/paquetes.js';

test('agregar analítica a una sumaria la enlaza y numera sin chocar', () => {
  let L = withPackage(base(), 'B');             // B tiene B1..B3
  const r = addChild(L, 'B', 'Documentos por cobrar');
  assert.equal(r.ref, 'B4');
  L = r.ledger;
  assert.equal(L.paper('B4').parent, 'B'); assert.equal(L.paper('B4').kind, 'analitica');
  assert.ok(L.paper('B').lines.some((l) => l.link === 'B4' && l.label === 'Documentos por cobrar'));
  assert.deepEqual(errors(L), errors(base()));
  assert.equal(L.get('BG').sections.activo.contab, base().get('BG').sections.activo.contab, 'sin cifras nuevas no cambia nada');
});

test('agregar subanalítica a una analítica y líneas de detalle con saldo propio', () => {
  let L = withPackage(base(), 'B');
  L = addChild(L, 'B1', 'Cliente Uno').ledger;
  assert.equal(L.paper('B1-1').kind, 'subanalitica');
  L = addLine(L, 'B1-1', 'Factura 001').ledger;
  assert.equal(L.paper('B1-1').lines.length, 2);
  L.papers.get('B1-1').lines.find((l) => l.key === 'l1').contab = '=100+50';
  L.compute();
  assert.equal(L.get('B1-1').totals.contab, 150);
  assert.equal(L.get('BG').sections.activo.contab, base().get('BG').sections.activo.contab + 150);
});

test('reglas de estructura: sin hijas bajo subanalítica ni sobre la centralizadora, y nombre obligatorio', () => {
  const L = withPackage(base(), 'B');
  assert.throws(() => addChild(L, 'BG', 'X'), /por rubro/);
  assert.throws(() => addChild(L, 'A1-1', 'X'), /subanalítica/);
  assert.throws(() => addChild(L, 'B', '  '), /nombre/);
  assert.throws(() => addLine(L, 'B', 'X'), /analíticas y subanalíticas/);
  assert.throws(() => addChild(L, 'ZZ', 'X'), /No existe/);
});

test('solo se borra una cédula vacía; con cifras, ajustes, hijas o firmas se rechaza', () => {
  let L = withPackage(base(), 'B');
  const nuevo = addChild(L, 'B', 'Temporal'); L = nuevo.ledger;
  const ref = nuevo.ref;
  const sinHijas = removeChild(L, ref).ledger;
  assert.equal(sinHijas.paper(ref), null);
  assert.ok(!sinHijas.paper('B').lines.some((l) => l.link === ref));
  assert.throws(() => removeChild(L, 'B1'), /cifras/);           // B1 trae el saldo trasladado
  L.papers.get(ref).signoffs = { elaboro: 'u1' };
  assert.throws(() => removeChild(L, ref), /firmas/);
  L.papers.get(ref).signoffs = {};
  L = addChild(L, ref, 'Hija').ledger;
  assert.throws(() => removeChild(L, ref), /hijas/);
  assert.throws(() => removeChild(L, 'BG'), /no se puede borrar/);
  assert.throws(() => removeChild(L, 'A1-1'), /cifras/);
});

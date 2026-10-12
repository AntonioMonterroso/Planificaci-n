import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../js/core/ledger.js';
import { demoData } from '../js/demo/data.js';

const codes = (l, ref) => l.issuesFor(ref).map((i) => i.code);

test('los totales suben de subanalítica a centralizadora', () => {
  const l = new Ledger(demoData());
  // A1-1: 12450 + 2050.5 + 300
  assert.equal(l.get('A1-1').totals.contab, 14800.5);
  assert.equal(l.get('A1').totals.contab, 19800.5);
  assert.equal(l.get('A2-1').totals.contab, 142500);
  assert.equal(l.get('A2').totals.contab, 178700);
  assert.equal(l.get('A').totals.contab, 198500.5);
  const bg = l.get('BG');
  assert.equal(bg.sections.activo.contab, 798500.5);
  assert.equal(bg.sections.patrimonio.contab, 703500.5);
});

test('la partida de ajuste llega a todos los niveles y la centralizadora sigue cuadrando', () => {
  const l = new Ledger(demoData());
  assert.equal(l.get('A1-1').totals.haber, 300);
  assert.equal(l.get('A').totals.haber, 300);
  assert.equal(l.get('A').totals.audit, 198200.5);
  assert.equal(l.get('A').totals.diff, -300);
  assert.equal(l.get('BG').sections.activo.audit, 798500.5); // +300 en CxC, −300 en caja
  assert.deepEqual(l.issues.filter((i) => i.severity === 'error'), []);
});

test('navegación: ruta, hijos y quién usa cada cédula', () => {
  const l = new Ledger(demoData());
  assert.deepEqual(l.path('A1-1'), ['BG', 'A', 'A1', 'A1-1']);
  assert.deepEqual(l.children('A1').map((p) => p.ref), ['A1-1', 'A1-2']);
  assert.deepEqual(l.dependents('A2'), [{ ref: 'A', key: 'bancos' }]);
});

test('expresión dentro de la celda conserva sus componentes', () => {
  const l = new Ledger(demoData());
  const row = l.get('A2-1').lines.find((x) => x.key === 'transito');
  assert.equal(row.contab, 4500);
  assert.deepEqual(row.components.map((c) => c.value), [3000, 1500]);
  assert.equal(row.isExpression, true);
});

test('no se puede forzar a mano una línea que se alimenta de otra cédula', () => {
  const d = demoData();
  d.papers.find((p) => p.ref === 'A').lines[1].contab = 458364.43; // el error clásico del Excel
  const l = new Ledger(d);
  assert.ok(codes(l, 'A').includes('cifra_manual_en_enlace'));
  assert.equal(l.get('A').lines[1].contab, 178700); // el valor tecleado se ignora
});

test('partida descuadrada o en línea con enlace no se aplica', () => {
  const d = demoData();
  d.adjustments.push({ id: 'AJ-2', entries: [{ ref: 'A1-1', key: 'efectivo', side: 'haber', amount: 100 }, { ref: 'BG', key: 'B', side: 'debe', amount: 90 }] });
  d.adjustments.push({ id: 'AJ-3', entries: [{ ref: 'A', key: 'caja', side: 'haber', amount: 5 }, { ref: 'BG', key: 'B', side: 'debe', amount: 5 }] });
  const l = new Ledger(d);
  assert.ok(l.issues.some((i) => i.code === 'partida_descuadrada'));
  assert.ok(l.issues.some((i) => i.code === 'ajuste_en_nodo_con_enlace'));
  assert.equal(l.get('A1-1').totals.haber, 300); // solo AJ-1 aplicó
});

test('centralizadora que no cuadra se detecta (patrimonio mal)', () => {
  const d = demoData();
  d.papers[0].lines.find((x) => x.key === 'BB').contab = 0; // como el patrimonio en 0 del Excel
  const l = new Ledger(d);
  assert.ok(codes(l, 'BG').includes('no_cuadra_activo_pasivo'));
});

test('cifra manual sin documento de origen genera alerta', () => {
  const d = demoData();
  delete d.papers.find((p) => p.ref === 'A1-2').lines[0].source;
  const l = new Ledger(d);
  assert.ok(l.issues.some((i) => i.code === 'sin_origen' && i.ref === 'A1-2'));
});

test('cuatro ojos: elaborador = revisor es error', () => {
  const d = demoData();
  d.papers.find((p) => p.ref === 'A1-2').signoffs = { elaboro: 'u-x', reviso: 'u-x' };
  const l = new Ledger(d);
  assert.ok(codes(l, 'A1-2').includes('cuatro_ojos'));
  assert.equal(l.get('A1-1').attributes.D, true);
});

test('enlace roto, hijo sin enlace y referencias circulares', () => {
  const d = demoData();
  d.papers.find((p) => p.ref === 'A').lines.push({ key: 'x', label: 'x', link: 'NOEXISTE' });
  d.papers.push({ ref: 'Z9', kind: 'detalle', parent: 'A1', title: 'Huérfana', lines: [{ key: 'a', label: 'a', contab: 1, source: 's' }] });
  d.papers.push({ ref: 'C1', kind: 'detalle', title: 'Ciclo', lines: [{ key: 'a', label: 'a', contab: '=C1!b' }, { key: 'b', label: 'b', contab: '=C1!a' }] });
  const l = new Ledger(d);
  assert.ok(l.issues.some((i) => i.code === 'enlace_roto'));
  assert.ok(l.issues.some((i) => i.code === 'hijo_sin_enlace' && i.ref === 'Z9'));
  assert.ok(l.issues.some((i) => i.code === 'referencia_circular'));
});

test('editar una cifra recalcula toda la cadena', () => {
  const l = new Ledger(demoData());
  l.setLineAmount('A1-2', 'fondo', '=2500*2+500');
  assert.equal(l.get('A1-2').totals.contab, 5500);
  assert.equal(l.get('A').totals.contab, 199000.5);
});

test('referencias entre cédulas con columna', () => {
  const d = demoData();
  d.papers.push({ ref: 'X1', kind: 'detalle', title: 'Ref', lines: [{ key: 'v', label: 'v', contab: "=A!TOTAL.haber+A1-2!fondo", computed: true }] });
  const l = new Ledger(d);
  assert.equal(l.get('X1').lines[0].contab, 5300);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { demoEngagement } from '../js/demo/engagement.js';
import { addObligation, validateObligation, buildEvents, summarize, byMonth } from '../js/core/calendario.js';

const TODAY = '2026-03-10';

test('reúne hitos, informe, archivo, documentos pendientes y tareas, ordenados por fecha', () => {
  const ev = buildEvents(demoEngagement(TODAY), TODAY);
  const kinds = new Set(ev.map((e) => e.kind));
  for (const k of ['hito', 'informe', 'archivo', 'documento', 'tarea']) assert.ok(kinds.has(k), k);
  assert.deepEqual(ev.map((e) => e.date), [...ev.map((e) => e.date)].sort());
  assert.ok(!ev.some((e) => e.kind === 'obligacion'), 'no hay fechas legales de fábrica');
});

test('estados: vencido, próximo, futuro y hecho', () => {
  const ev = buildEvents(demoEngagement(TODAY), TODAY);
  const s = (id) => ev.find((e) => e.id === id).status;
  assert.equal(s('m1'), 'hecho');
  assert.equal(s('m2'), 'vencido');
  assert.equal(s('d6'), 'proximo');
  assert.equal(s('m4') === 'futuro' || s('m4') === 'proximo', true);
});

test('una obligación exige título, fecha válida y fuente oficial', () => {
  const l = [];
  assert.throws(() => addObligation(l, { title: '', date: '2026-04-01', source: 'x' }), /qué obligación/);
  assert.throws(() => addObligation(l, { title: 'X', date: '2026-13-45', source: 'x' }), /fecha/);
  assert.throws(() => addObligation(l, { title: 'X', date: '2026-04-01', source: '  ' }), /fuente oficial/);
  const o = addObligation(l, { title: 'Presentar X', date: '2026-04-01', source: 'Fuente indicada por el auditor' });
  assert.equal(o.validatedBy, null);
  const ev = buildEvents(demoEngagement(TODAY), TODAY, l);
  assert.equal(summarize(ev).sinValidar, 1);
});

test('la validación la hace una persona distinta de quien registró y nunca Claude', () => {
  const o = { createdBy: 'u-aux', validatedBy: null };
  assert.throws(() => validateObligation(o, 'claude'), /auditor decide/);
  assert.throws(() => validateObligation(o, 'u-aux'), /Cuatro ojos/);
  assert.equal(validateObligation(o, 'u-soc').validatedBy, 'u-soc');
});

test('agrupa por mes', () => {
  const g = byMonth(buildEvents(demoEngagement(TODAY), TODAY));
  assert.ok(g.length >= 2); assert.ok(g.every(([k, l]) => /^\d{4}-\d{2}$/.test(k) && l.length));
});

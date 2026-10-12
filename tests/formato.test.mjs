import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFormato, newResponse, setAnswer, summarize, proposedFactors, closeBlockers, itemsOf } from '../js/core/formato.js';
import { FORMATOS } from '../js/formatos/index.js';
import { FRIR } from '../js/formatos/frir.js';

test('todos los formatos registrados son válidos', () => {
  for (const f of FORMATOS) assert.deepEqual(validateFormato(f), [], f.id);
});

test('FRIR: 6 factores y 33 preguntas', () => {
  assert.equal(FRIR.secciones.length, 6);
  assert.equal(itemsOf(FRIR).length, 33);
  assert.deepEqual(FRIR.secciones.map((s) => s.items.length), [5, 2, 17, 2, 4, 3]);
});

test('detecta definiciones inválidas', () => {
  assert.ok(validateFormato({}).length >= 3);
  const dup = { id: 'x', titulo: 't', secciones: [{ id: 's', nombre: 'S', items: [{ id: 'a', texto: 't' }, { id: 'a', texto: 'u' }] }] };
  assert.match(validateFormato(dup).join(), /duplicado/);
});

test('respuestas: solo valores permitidos y un ítem inexistente falla', () => {
  const r = newResponse(FRIR);
  assert.throws(() => setAnswer(FRIR, r, 'c1', { valor: 'TAL VEZ' }), /no permitida/);
  assert.throws(() => setAnswer(FRIR, r, 'zz', { valor: 'SI' }), /No existe/);
  setAnswer(FRIR, r, 'c1', { valor: 'NO' });
  setAnswer(FRIR, r, 'c1', { valor: '' });
  assert.deepEqual(r.answers, {});
});

test('un SI sin referencia ni comentario es alerta; con origen deja de serlo', () => {
  const r = newResponse(FRIR);
  setAnswer(FRIR, r, 'c4', { valor: 'SI' });
  assert.equal(summarize(FRIR, r).issues.length, 1);
  setAnswer(FRIR, r, 'c4', { valor: 'SI', ref: 'B-12' });
  assert.equal(summarize(FRIR, r).issues.length, 0);
});

test('resumen por sección y factores propuestos', () => {
  const r = newResponse(FRIR);
  setAnswer(FRIR, r, 'c1', { valor: 'SI', comentario: 'Regulada' });
  setAnswer(FRIR, r, 'c2', { valor: 'NO' });
  setAnswer(FRIR, r, 'b2', { valor: 'SI', ref: 'PV-1' });
  const s = summarize(FRIR, r);
  assert.equal(s.respondidos, 3); assert.equal(s.pendientes, 30);
  assert.equal(s.secciones[0].conteo.SI, 1);
  assert.deepEqual(proposedFactors(FRIR, r).map((x) => x.id), ['complejidad', 'sesgos']);
});

test('no cierra con pendientes, sin firmas o con firmas repetidas', () => {
  const r = newResponse(FRIR);
  assert.ok(closeBlockers(FRIR, r).some((m) => /Faltan 33/.test(m)));
  for (const it of itemsOf(FRIR)) setAnswer(FRIR, r, it.id, { valor: 'NO' });
  assert.deepEqual(closeBlockers(FRIR, r), ['Faltan firmas: elaboró, revisó y autorizó']);
  r.signoffs = { elaboro: 'a', reviso: 'a', autorizo: 'b' };
  assert.match(closeBlockers(FRIR, r)[0], /Cuatro ojos/);
  r.signoffs = { elaboro: 'a', reviso: 'b', autorizo: 'c' };
  assert.deepEqual(closeBlockers(FRIR, r), []);
});

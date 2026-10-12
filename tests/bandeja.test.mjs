import test from 'node:test';
import assert from 'node:assert/strict';
import { Inbox } from '../js/core/bandeja.js';

const ask = (ib) => ib.ask({ by: 'u-campo', kind: 'revisar', targetRef: 'A1', question: '¿Cuadra la analítica?' });

test('la solicitud exige tipo válido y pregunta', () => {
  const ib = new Inbox();
  assert.throws(() => ib.ask({ by: 'u', kind: 'x', question: 'a' }), /desconocido/);
  assert.throws(() => ib.ask({ by: 'u', kind: 'revisar', question: '  ' }), /vacía/);
  assert.equal(ask(ib).status, 'pendiente');
});

test('no hay entrega sin evidencia ni declaración del dato faltante', () => {
  const ib = new Inbox(); const r = ask(ib);
  assert.throws(() => ib.deliver(r.id, { author: 'claude', body: 'Todo bien' }), /evidencia/);
  assert.throws(() => ib.deliver(r.id, { author: 'claude', body: 'x', evidence: [{ tipo: 'celda', ref: '' }] }), /inválida/);
  ib.deliver(r.id, { author: 'claude', body: 'No puedo concluir', missing: 'Falta el estado de cuenta de diciembre' });
  assert.equal(r.status, 'entregado');
});

test('flujo completo: pedir → tomar → entregar → aceptar aplica el borrador', () => {
  const ib = new Inbox(); const r = ask(ib); ib.take(r.id);
  assert.equal(r.status, 'en_proceso');
  let aplicado = null;
  ib.deliver(r.id, { author: 'claude', body: 'Cuadra', evidence: [{ tipo: 'celda', ref: 'A1!F10' }], draft: { op: 'nota', ref: 'A1' } });
  assert.equal(aplicado, null, 'el borrador no se aplica al entregar');
  ib.decide(r.id, { by: 'u-super', accept: true, apply: (d) => { aplicado = d; } });
  assert.deepEqual(aplicado, { op: 'nota', ref: 'A1' });
  assert.equal(r.status, 'aceptado');
  assert.equal(ib.deliveryOf(r.id).decidedBy, 'u-super');
});

test('Claude no decide su propia entrega y rechazar pide cambios sin aplicar', () => {
  const ib = new Inbox(); const r = ask(ib);
  ib.deliver(r.id, { author: 'claude', body: 'x', evidence: [{ tipo: 'norma', ref: 'NIA 500' }], draft: { a: 1 } });
  assert.throws(() => ib.decide(r.id, { by: 'claude', accept: true }), /auditor decide/);
  let n = 0;
  ib.decide(r.id, { by: 'u-super', accept: false, apply: () => n++ });
  assert.equal(n, 0); assert.equal(r.status, 'cambios');
  assert.throws(() => ib.decide(r.id, { by: 'u-super', accept: true }), /No hay entrega/);
});

test('conteos por estado', () => {
  const ib = new Inbox(); ask(ib); const b = ask(ib); ib.take(b.id);
  assert.deepEqual(ib.counts(), { pendiente: 1, en_proceso: 1, entregado: 0, aceptado: 0, cambios: 0 });
});

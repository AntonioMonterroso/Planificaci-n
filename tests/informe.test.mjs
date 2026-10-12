import test from 'node:test';
import assert from 'node:assert/strict';
import { newDocument, setSection, setNoAplica, setOpinion, unresolved, fill, variablesOf, blockers, sign, unlock, render, toText, toHtml, precheck } from '../js/core/informe.js';

const vars = variablesOf({ header: { entity: 'Entidad Demo, S.A.', period: 'ejercicio 2025', currency: 'Quetzales' }, contract: { reportDate: '2026-03-31', periodEnd: '2025-12-31' } }, (x) => x);
const ok = precheck({});
const ready = () => {
  const d = newDocument('carta_gerencia');
  setSection(d, 'hallazgos', 'Hallazgo 1: situación, criterio, causa, efecto y recomendación.');
  setSection(d, 'cierre', 'Agradecemos la colaboración.');
  d.signoffs = { elaboro: 'a', reviso: 'b', autorizo: 'c' };
  return d;
};

test('variables: se resuelven y las no resueltas se detectan', () => {
  assert.equal(fill('Para {{entidad}} ({{moneda}})', vars), 'Para Entidad Demo, S.A. (quetzales)');
  assert.deepEqual(unresolved('{{entidad}} {{fecha_cierre}} {{inventada}}', vars), ['inventada']);
  assert.deepEqual(unresolved('{{entidad}}', { entidad: undefined }), ['entidad']);
});

test('el informe parte con esqueleto, tipo de opinión y no se firma con texto por completar', () => {
  const d = newDocument('informe');
  assert.equal(d.opinion, 'no_modificada');
  setOpinion(d, 'con_salvedades');
  assert.throws(() => setOpinion(d, 'otra'), /desconocido/);
  assert.throws(() => setOpinion(newDocument('carta_gerencia'), 'adversa'), /Solo el informe/);
  const b = blockers(d, vars, ok);
  assert.ok(b.some((m) => /Sección vacía: Fundamento/.test(m)));
  assert.ok(b.some((m) => /texto por completar/.test(m)));
});

test('una sección marcada "no aplica" no bloquea ni se imprime', () => {
  const d = newDocument('informe');
  setNoAplica(d, 'cuestiones', true);
  assert.ok(!blockers(d, vars, ok).some((m) => /Cuestiones/.test(m)));
  assert.ok(!render(d, vars).some((s) => /Cuestiones/.test(s.titulo)));
});

test('no firma con verificaciones fallidas, firmas repetidas ni a nombre de Claude', () => {
  const d = ready();
  assert.throws(() => sign(d, vars, precheck({ ledgerErrors: 2 }), 'u'), /Verificación previa: Las cédulas/);
  d.signoffs = { elaboro: 'a', reviso: 'a', autorizo: 'c' };
  assert.throws(() => sign(d, vars, ok, 'u'), /Cuatro ojos/);
  d.signoffs = { elaboro: 'a', reviso: 'b', autorizo: 'c' };
  assert.throws(() => sign(d, vars, ok, 'claude'), /auditor decide/);
  sign(d, vars, ok, 'c');
  assert.equal(d.status, 'firmado');
});

test('firmado es inmutable; el desbloqueo exige motivo y abre versión nueva con historial', () => {
  const d = ready(); sign(d, vars, ok, 'c');
  assert.throws(() => setSection(d, 'cierre', 'x'), /inmutable/);
  assert.throws(() => unlock(d, { by: 'c', motivo: '  ' }), /motivo/);
  assert.throws(() => unlock(d, { by: 'claude', motivo: 'x' }), /auditor decide/);
  unlock(d, { by: 'c', motivo: 'Corrección solicitada por el socio' });
  assert.equal(d.version, 2); assert.equal(d.status, 'borrador'); assert.deepEqual(d.signoffs, {});
  assert.equal(d.historial.length, 1); assert.equal(d.historial[0].version, 1);
  setSection(d, 'cierre', 'Texto corregido');
  assert.equal(d.historial[0].secciones.find((s) => s.id === 'cierre').texto, 'Agradecemos la colaboración.');
});

test('exportación a texto y HTML: escapa y marca borrador', () => {
  const d = newDocument('carta_gerencia'); setSection(d, 'hallazgos', 'a < b & <script>x</script>');
  const html = toHtml(d, vars);
  assert.ok(html.includes('BORRADOR') && html.includes('&lt;script&gt;') && !html.includes('<script>'));
  assert.match(toText(d, vars), /^CARTA DE GERENCIA/);
});

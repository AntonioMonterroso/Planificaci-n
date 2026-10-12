import test from 'node:test';
import assert from 'node:assert/strict';
import { AREAS } from '../js/legal/catalogo.js';
import { applicableAreas, newLegalState, setStatus, confirmNorms, summarizeArea, summarizeAll } from '../js/core/legal.js';

const area = (id) => AREAS.find((a) => a.id === id);

test('el catálogo no trae fechas ni artículos y toda referencia tiene fuente oficial y fecha de consulta', () => {
  const json = JSON.stringify(AREAS.map((a) => ({ n: a.nombre, r: a.requisitos, ref: a.referencias.map((x) => x.titulo) })));
  assert.ok(!/art[ií]culo\s*\d|art\.\s*\d|\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(json), 'sin artículos ni fechas legales');
  for (const a of AREAS) for (const r of a.referencias) {
    assert.match(r.fuente, /^https:\/\/(portal\.sat\.gob\.gt|www\.congreso\.gob\.gt|portal\.mineco\.gob\.gt|www\.sib\.gob\.gt)\//, r.titulo);
    assert.match(r.consultadoEl, /^\d{4}-\d{2}-\d{2}$/); assert.ok(r.alcance, 'dice qué se verificó');
  }
  const ids = AREAS.flatMap((a) => a.requisitos.map((r) => r.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('el perfil decide qué áreas aplican', () => {
  const base = applicableAreas({}).map((a) => a.id);
  assert.deepEqual(base, ['sat_iva', 'sat_isr', 'marco', 'cruces']);
  const full = applicableAreas({ comerciante: true, tieneEmpleados: true, sujetoObligadoLD: true, sinFinesLucro: true }).map((a) => a.id);
  for (const id of ['sat_libros', 'nomina', 'comercio', 'lavado', 'sector']) assert.ok(full.includes(id), id);
});

test('lavado muestra la alerta de la ley nueva y las áreas sin fuente lo declaran', () => {
  const l = summarizeArea(area('lavado'), newLegalState());
  assert.equal(l.alertas, 1); assert.equal(l.verificadas, 1);
  assert.equal(summarizeArea(area('nomina'), newLegalState()).sinNorma, true);
});

test('cumple exige evidencia, incumple exige comentario; estados inválidos fallan', () => {
  const s = newLegalState();
  assert.throws(() => setStatus(s, 'iva1', { estado: 'tal vez', by: 'u1' }), /no permitido/);
  assert.throws(() => setStatus(s, 'zzz', { estado: 'cumple', by: 'u1' }), /No existe/);
  setStatus(s, 'iva1', { estado: 'cumple', by: 'u1' });
  setStatus(s, 'iva2', { estado: 'incumple', by: 'u1' });
  const r = summarizeArea(area('sat_iva'), s);
  assert.equal(r.issues.length, 2); assert.equal(r.semaforo, 'rojo');
  setStatus(s, 'iva1', { estado: 'cumple', ref: 'DEC-IVA-01', by: 'u1' });
  setStatus(s, 'iva2', { estado: 'incumple', comentario: 'Diferencia sin explicar', by: 'u1' });
  assert.equal(summarizeArea(area('sat_iva'), s).issues.length, 0);
});

test('un área no queda en verde sin confirmar la vigencia de la norma por otra persona', () => {
  const s = newLegalState();
  for (const r of area('marco').requisitos) setStatus(s, r.id, { estado: 'cumple', ref: 'P/T-1', by: 'u-aux' });
  assert.equal(summarizeArea(area('marco'), s).semaforo, 'ambar');
  assert.throws(() => confirmNorms(s, 'marco', 'claude'), /auditor decide/);
  assert.throws(() => confirmNorms(s, 'marco', 'u-aux'), /Cuatro ojos/);
  confirmNorms(s, 'marco', 'u-soc');
  assert.equal(summarizeArea(area('marco'), s).semaforo, 'verde');
});

test('en conjunto: el peor semáforo manda', () => {
  const s = newLegalState();
  assert.equal(summarizeAll({}, s).semaforo, 'ambar');
  setStatus(s, 'iva2', { estado: 'incumple', comentario: 'x', by: 'u1' });
  const all = summarizeAll({}, s);
  assert.equal(all.semaforo, 'rojo'); assert.equal(all.rojas, 1);
});

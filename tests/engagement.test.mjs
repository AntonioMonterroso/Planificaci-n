import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/core/engagement.js';

const TODAY = '2026-03-01';
const contract = () => ({
  signedOn: '2026-01-05', validFrom: '2026-01-10', validTo: '2026-06-30',
  periodStart: '2025-01-01', periodEnd: '2025-12-31', reportDate: '2026-03-31',
  milestones: [
    { id: 'm1', label: 'Planeación aprobada', due: '2026-02-01', doneOn: '2026-01-30' },
    { id: 'm2', label: 'Trabajo de campo', due: '2026-02-20' },
    { id: 'm3', label: 'Borrador de informe', due: '2026-03-05' },
    { id: 'm4', label: 'Informe final', due: '2026-03-31' },
  ],
});
const staff = () => ([
  { id: 'u-soc', name: 'Socio', role: 'socio' }, { id: 'u-ger', name: 'Gerente', role: 'gerente' },
  { id: 'u-sup', name: 'Supervisor', role: 'supervisor' }, { id: 'u-enc', name: 'Encargado', role: 'encargado' },
  { id: 'u-cam', name: 'Campo', role: 'campo' }, { id: 'u-aux', name: 'Auxiliar', role: 'auxiliar' },
]);
const occ = (list, id) => list.find((r) => r.id === id);

test('fechas: sumar días y diferencia', () => {
  assert.equal(E.addDays('2026-03-31', 60), '2026-05-30');
  assert.equal(E.diffDays('2026-03-31', '2026-03-01'), 30);
  assert.equal(E.parseDate('2026-13-40'), null);
});

test('contrato: plazo de armado, hitos y avance', () => {
  const a = E.analyzeContract(contract(), TODAY);
  assert.equal(a.archiveDeadline, '2026-05-30');
  assert.equal(a.daysToReport, 30);
  const st = Object.fromEntries(a.milestones.map((m) => [m.id, m.status]));
  assert.deepEqual(st, { m1: 'hecho', m2: 'vencido', m3: 'proximo', m4: 'pendiente' });
  assert.ok(a.issues.some((i) => i.code === 'hito_vencido'));
  assert.ok(a.progress > 0 && a.progress < 1);
});

test('contrato: prórroga suma días al plazo y detecta incoherencias', () => {
  const c = contract(); c.extensions = [{ days: 15, reason: 'Información tardía' }];
  assert.equal(E.analyzeContract(c, TODAY).archiveDeadline, '2026-06-14');
  const bad = contract(); bad.reportDate = '2025-11-30'; bad.validTo = '2026-02-01'; bad.periodEnd = '2025-12-31';
  const codes = E.analyzeContract(bad, TODAY).issues.map((i) => i.code);
  assert.ok(codes.includes('informe_antes_cierre'));
  const late = contract(); late.reportDate = '2026-08-01';
  assert.ok(E.analyzeContract(late, TODAY).issues.some((i) => i.code === 'informe_fuera_vigencia'));
  assert.ok(E.analyzeContract({}, TODAY).issues.some((i) => i.code === 'fecha_invalida'));
});

test('PBC: flujo completo con verificación formal y cuatro ojos', () => {
  let d = { id: 'd1', title: 'Estados de cuenta', status: 'pendiente' };
  assert.equal(E.transitionDoc(d, 'aceptado').ok, false);
  let r = E.transitionDoc(d, 'recibido', { by: 'u-aux', on: '2026-02-10' }); assert.ok(r.ok); d = r.doc;
  r = E.transitionDoc(d, 'en_verificacion', { by: 'u-aux' }); assert.ok(r.ok); d = r.doc;
  assert.match(E.transitionDoc(d, 'aceptado').error, /verificaciones/);
  for (const [k] of E.PBC_CHECKS) d = E.setCheck(d, k, 'ok');
  assert.match(E.transitionDoc(d, 'aceptado').error, /Cuatro ojos/); // recibió y verificó la misma persona
  d = { ...d, verifiedBy: 'u-cam' };
  r = E.transitionDoc(d, 'aceptado', { on: '2026-02-12' });
  assert.ok(r.ok); assert.equal(r.doc.status, 'aceptado'); assert.equal(r.doc.verifiedOn, '2026-02-12');
});

test('PBC: observado exige motivo y vuelve a recibido; setCheck valida', () => {
  let d = { id: 'd', title: 't', status: 'en_verificacion', receivedBy: 'a', verifiedBy: 'b' };
  assert.equal(E.transitionDoc(d, 'observado').ok, false);
  const o = E.transitionDoc(d, 'observado', { reason: 'Falta sello' }); assert.ok(o.ok);
  const re = E.transitionDoc(o.doc, 'recibido', { by: 'a', on: '2026-02-20' }); assert.ok(re.ok);
  assert.deepEqual(re.doc.checks, {});
  assert.throws(() => E.setCheck(d, 'xx', 'ok'));
  assert.throws(() => E.setCheck(d, 'legible', 'tal vez'));
});

test('ocupaciones: titular, suplente y vacante', () => {
  const r = E.resolveOccupations(staff(), TODAY);
  assert.equal(occ(r, 'plan_global').status, 'cubierta');
  assert.equal(occ(r, 'independencia').status, 'suplente'); // sin oficial de ética: gerente
  assert.equal(occ(r, 'independencia').by.id, 'u-ger');
  assert.equal(occ(r, 'solicitar_pbc').by.id, 'u-aux'); // sin coordinador: auxiliar
  assert.equal(occ(r, 'eqcr').status, 'no_aplica');
  const hi = E.resolveOccupations(staff(), TODAY, { highRisk: true });
  assert.equal(occ(hi, 'eqcr').status, 'vacante');
  const noCampo = E.resolveOccupations(staff().filter((p) => p.role !== 'campo'), TODAY);
  assert.equal(occ(noCampo, 'arqueo').by.id, 'u-enc'); // cae al encargado
  const none = E.resolveOccupations([{ id: 'x', name: 'x', role: 'auxiliar' }], TODAY);
  assert.equal(occ(none, 'aceptar_cliente').status, 'vacante');
  assert.equal(E.occupationSummary(none).vacante > 5, true);
});

test('ocupaciones: ausencia temporal pasa la función al suplente', () => {
  const s = staff(); s.find((p) => p.id === 'u-enc').absent = { from: '2026-02-25', to: '2026-03-10' };
  const r = E.resolveOccupations(s, TODAY);
  assert.equal(occ(r, 'plan_global').by.id, 'u-sup');
  assert.equal(occ(r, 'plan_global').status, 'suplente');
  assert.equal(occ(r, 'revision_1').status, 'vacante'); // solo el encargado puede hacerla
  const after = E.resolveOccupations(s, '2026-03-11');
  assert.equal(occ(after, 'plan_global').status, 'cubierta');
});

test('incompatibilidades: preparador ≠ revisor, revisor 1 ≠ revisor 2, EQCR fuera del equipo', () => {
  assert.deepEqual(E.occupationConflicts(E.resolveOccupations(staff(), TODAY)), []);
  const forced = E.resolveOccupations(staff(), TODAY, { overrides: { revision_2: 'u-enc' } });
  assert.ok(E.occupationConflicts(forced).some((c) => c.code === 'revisor_repetido'));
  const prep = E.resolveOccupations(staff(), TODAY, { overrides: { cedulas: 'u-sup' } });
  assert.ok(E.occupationConflicts(prep).some((c) => c.code === 'preparador_revisor'));
  const s = [...staff(), { id: 'u-eq', name: 'Revisor', role: 'eqcr' }];
  const eq = E.resolveOccupations(s, TODAY, { highRisk: true, overrides: { ajustes: 'u-eq' } });
  assert.ok(E.occupationConflicts(eq).some((c) => c.code === 'eqcr_en_equipo'));
});

test('avance de fase: bloquea con vacantes, PBC sin aceptar, tareas vencidas y falta de independencia', () => {
  const base = {
    today: TODAY, contract: contract(), staff: staff(), highRisk: false,
    docs: [{ id: 'd', title: 'Balanza', status: 'recibido', requiredPhase: 2 }],
    tasks: [{ id: 't', label: 'Entendimiento', phase: 1, due: '2026-02-15', done: false }],
    declarations: ['u-sup'],
  };
  const g = E.phaseGate(2, base);
  assert.equal(g.ok, false);
  const codes = g.blockers.map((b) => b.code);
  assert.ok(codes.includes('pbc_sin_verificar') && codes.includes('tarea_vencida') && codes.includes('sin_independencia') && codes.includes('hito_vencido'));
  const clean = {
    ...base, docs: [{ id: 'd', title: 'Balanza', status: 'aceptado', requiredPhase: 2 }],
    tasks: [], declarations: ['u-sup', 'u-enc', 'u-cam', 'u-aux'],
    contract: { ...contract(), milestones: [] },
  };
  const ok = E.phaseGate(2, clean);
  assert.deepEqual(ok.blockers, []); assert.equal(ok.ok, true);
  const vac = E.phaseGate(0, { ...clean, staff: staff().filter((p) => p.role !== 'socio') });
  assert.ok(vac.blockers.some((b) => b.code === 'vacante'));
});

test('horas: estimadas vs reales', () => {
  const h = E.hoursSummary([{ id: 'a', est: 100, real: 50 }, { id: 'b', est: 100, real: 95 }, { id: 'c', est: 100, real: 130 }, { id: 'd', est: 0, real: 5 }]);
  assert.deepEqual(h.map((x) => x.status), ['normal', 'al_limite', 'excedido', 'sin_estimado']);
});

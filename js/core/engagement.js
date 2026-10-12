// Perfil del encargo: contrato y temporalidad, documentos del cliente (PBC) con verificación formal,
// matriz de ocupaciones con suplentes y regla de avance de fase. Funciones puras: sin DOM ni red.
// Las fechas son texto ISO "AAAA-MM-DD"; "hoy" siempre se inyecta (pruebas deterministas).

// ---------------------------------------------------------------- fechas
const MS = 86400000;
export const parseDate = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
export const fmtDate = (d) => d.toISOString().slice(0, 10);
export const addDays = (iso, n) => { const d = parseDate(iso); return d ? fmtDate(new Date(d.getTime() + n * MS)) : null; };
export const diffDays = (a, b) => { const x = parseDate(a); const y = parseDate(b); return x && y ? Math.round((x - y) / MS) : null; };
export const todayISO = () => fmtDate(new Date());

// ---------------------------------------------------------------- contrato y temporalidad
export const ARCHIVE_DAYS_DEFAULT = 60; // referencia NIA 230 para el armado del archivo; configurable por la firma

/**
 * contract: {signedOn, validFrom, validTo, periodStart, periodEnd, reportDate, archiveDays?, extensions?:[{days,reason}],
 *            milestones?:[{id,label,due,doneOn?}]}
 */
export function analyzeContract(contract, today) {
  const issues = [];
  const add = (code, severity, message) => issues.push({ code, severity, message });
  const c = contract ?? {};
  for (const k of ['signedOn', 'validFrom', 'validTo', 'periodStart', 'periodEnd', 'reportDate']) {
    if (!parseDate(c[k])) add('fecha_invalida', 'error', `Falta o es inválida la fecha "${k}"`);
  }
  if (issues.length) return { issues, archiveDeadline: null, milestones: [], daysToReport: null, daysToArchive: null, progress: 0 };

  if (diffDays(c.periodEnd, c.periodStart) < 0) add('periodo_invertido', 'error', 'El periodo auditado termina antes de empezar');
  if (diffDays(c.validTo, c.validFrom) < 0) add('vigencia_invertida', 'error', 'La vigencia del contrato termina antes de empezar');
  if (diffDays(c.signedOn, c.validFrom) > 0) add('firma_posterior', 'warn', 'La carta de encargo se firmó después del inicio de la vigencia');
  if (diffDays(c.reportDate, c.periodEnd) < 0) add('informe_antes_cierre', 'error', 'La fecha del informe es anterior al cierre del periodo auditado');
  if (diffDays(c.reportDate, c.validTo) > 0) add('informe_fuera_vigencia', 'warn', 'El informe se emitiría después de que venza el contrato: prorrogar o renovar');

  const extra = (c.extensions ?? []).reduce((s, e) => s + (Number(e.days) || 0), 0);
  const archiveDays = (c.archiveDays ?? ARCHIVE_DAYS_DEFAULT) + extra;
  const archiveDeadline = addDays(c.reportDate, archiveDays);

  const milestones = (c.milestones ?? []).map((m) => {
    const left = diffDays(m.due, today);
    let status = 'pendiente';
    if (m.doneOn) status = 'hecho';
    else if (left < 0) status = 'vencido';
    else if (left <= 7) status = 'proximo';
    return { ...m, daysLeft: left, status };
  }).sort((a, b) => (a.due < b.due ? -1 : 1));
  for (const m of milestones) if (m.status === 'vencido') add('hito_vencido', 'error', `Hito vencido: ${m.label} (hace ${-m.daysLeft} días)`);

  const total = diffDays(c.validTo, c.validFrom) || 1;
  const progress = Math.max(0, Math.min(1, diffDays(today, c.validFrom) / total));
  return {
    issues, archiveDeadline, archiveDays, milestones, progress,
    daysToReport: diffDays(c.reportDate, today),
    daysToArchive: diffDays(archiveDeadline, today),
    daysToExpiry: diffDays(c.validTo, today),
  };
}

// ---------------------------------------------------------------- documentos del cliente (PBC)
export const PBC_STATES = ['pendiente', 'recibido', 'en_verificacion', 'aceptado', 'observado', 'rechazado'];
const PBC_NEXT = {
  pendiente: ['recibido'],
  recibido: ['en_verificacion'],
  en_verificacion: ['aceptado', 'observado', 'rechazado'],
  observado: ['recibido'],
  rechazado: ['pendiente'],
  aceptado: [],
};
export const PBC_CHECKS = [
  ['legible', 'Legible y completo'],
  ['firmas_sellos', 'Firmas y sellos'],
  ['periodo', 'Corresponde al periodo auditado'],
  ['autenticidad', 'Autenticidad (contra confirmación o fuente)'],
  ['cuadra', 'Cuadra contra contabilidad'],
];

/** doc: {id,title,requestedOn,receivedOn?,receivedBy?,status,checks?:{k:'ok'|'fail'|'na'|null},verifiedBy?,verifiedOn?,supports?:[refs],requiredPhase?} */
export function transitionDoc(doc, to, ctx = {}) {
  if (!PBC_NEXT[doc.status]?.includes(to)) return { ok: false, error: `No se puede pasar de ${doc.status} a ${to}` };
  const next = { ...doc, status: to };
  if (to === 'recibido') {
    if (!ctx.by || !ctx.on) return { ok: false, error: 'Falta quién y cuándo se recibió' };
    next.receivedBy = ctx.by; next.receivedOn = ctx.on; next.checks = {}; delete next.verifiedBy; delete next.verifiedOn;
  }
  if (to === 'en_verificacion' && !ctx.by) return { ok: false, error: 'Indica quién verifica' };
  if (to === 'en_verificacion') next.verifiedBy = ctx.by;
  if (to === 'aceptado') {
    const miss = missingChecks(doc);
    if (miss.length) return { ok: false, error: `Faltan o fallan verificaciones: ${miss.join(', ')}` };
    if (!doc.verifiedBy) return { ok: false, error: 'Falta quién verificó' };
    if (doc.verifiedBy === doc.receivedBy) return { ok: false, error: 'Cuatro ojos: quien recibe no puede ser quien verifica' };
    next.verifiedOn = ctx.on ?? doc.verifiedOn;
  }
  if ((to === 'observado' || to === 'rechazado') && !ctx.reason) return { ok: false, error: 'Indica el motivo' };
  if (ctx.reason) next.reason = ctx.reason;
  return { ok: true, doc: next };
}

/** Verificaciones pendientes o fallidas (ignora las "na"). */
export function missingChecks(doc) {
  const out = [];
  for (const [k, label] of PBC_CHECKS) {
    const v = doc.checks?.[k] ?? null;
    if (v !== 'ok' && v !== 'na') out.push(label);
  }
  return out;
}

export function pbcSummary(docs, today) {
  const by = Object.fromEntries(PBC_STATES.map((s) => [s, 0]));
  let overdue = 0;
  for (const d of docs) {
    by[d.status] += 1;
    if (d.status === 'pendiente' && d.dueOn && diffDays(d.dueOn, today) < 0) overdue += 1;
  }
  const total = docs.length || 1;
  return { by, overdue, total: docs.length, accepted: by.aceptado, pct: by.aceptado / total };
}

// ---------------------------------------------------------------- roles, funciones y ocupaciones
export const ROLES = {
  socio: { label: 'Socio', group: 'gerencia' },
  gerente: { label: 'Gerente', group: 'gerencia' },
  supervisor: { label: 'Auditor supervisor', group: 'equipo' },
  encargado: { label: 'Auditor encargado', group: 'equipo' },
  campo: { label: 'Auditor de campo', group: 'equipo' },
  auxiliar: { label: 'Auxiliar de auditoría', group: 'equipo' },
  eqcr: { label: 'Revisor de calidad del encargo', group: 'apoyo' },
  oficial_etica: { label: 'Oficial de ética e independencia', group: 'apoyo' },
  coordinador: { label: 'Coordinador de encargos', group: 'apoyo' },
  experto: { label: 'Experto o especialista', group: 'apoyo' },
};

/** Funciones obligatorias del encargo. chain = quién la cubre, en orden (primero el titular, luego suplentes). */
export const FUNCTIONS = [
  { id: 'aceptar_cliente', phase: 0, label: 'Aceptación y continuidad del cliente', chain: ['socio'] },
  { id: 'independencia', phase: 0, label: 'Independencia y conflictos', chain: ['oficial_etica', 'gerente', 'socio'] },
  { id: 'carta_encargo', phase: 0, label: 'Carta de encargo', chain: ['socio', 'gerente'] },
  { id: 'plan_global', phase: 0, label: 'Plan global de auditoría', chain: ['encargado', 'supervisor', 'gerente'] },
  { id: 'entendimiento', phase: 1, label: 'Entendimiento de la entidad', chain: ['campo', 'encargado'] },
  { id: 'riesgos', phase: 1, label: 'Evaluación de riesgos y fraude', chain: ['encargado', 'supervisor'] },
  { id: 'materialidad', phase: 1, label: 'Materialidad', chain: ['encargado', 'supervisor'] },
  { id: 'programa', phase: 2, label: 'Programa de auditoría', chain: ['encargado', 'supervisor'] },
  { id: 'solicitar_pbc', phase: 2, label: 'Solicitud de documentos al cliente', chain: ['coordinador', 'auxiliar', 'campo', 'encargado'] },
  { id: 'verificar_pbc', phase: 2, label: 'Verificación formal de documentos', chain: ['auxiliar', 'campo', 'encargado'] },
  { id: 'arqueo', phase: 3, label: 'Arqueos y cortes de formas', chain: ['campo', 'encargado'] },
  { id: 'conciliaciones', phase: 3, label: 'Conciliaciones bancarias', chain: ['auxiliar', 'campo'] },
  { id: 'confirmaciones', phase: 3, label: 'Confirmaciones externas', chain: ['campo', 'encargado'] },
  { id: 'cedulas', phase: 3, label: 'Elaboración de sumarias y analíticas', chain: ['campo', 'auxiliar', 'encargado'] },
  { id: 'ajustes', phase: 3, label: 'Propuesta de ajustes', chain: ['campo', 'encargado'] },
  { id: 'revision_1', phase: 3, label: 'Primera revisión (encargado)', chain: ['encargado'] },
  { id: 'revision_2', phase: 3, label: 'Segunda revisión (supervisor)', chain: ['supervisor', 'gerente'] },
  { id: 'hechos_posteriores', phase: 4, label: 'Hechos posteriores y empresa en funcionamiento', chain: ['encargado', 'supervisor'] },
  { id: 'representacion', phase: 4, label: 'Carta de representación', chain: ['encargado', 'supervisor'] },
  { id: 'hallazgos', phase: 4, label: 'Hallazgos y carta de gerencia', chain: ['encargado', 'supervisor'] },
  { id: 'eqcr', phase: 4, label: 'Revisión de calidad del encargo', chain: ['eqcr'], when: (ctx) => !!ctx.highRisk },
  { id: 'informe', phase: 5, label: 'Informe y opinión (borrador)', chain: ['gerente', 'socio'] },
  { id: 'firma_informe', phase: 5, label: 'Firma del informe', chain: ['socio'] },
  { id: 'archivo_final', phase: 5, label: 'Armado del archivo final', chain: ['encargado', 'coordinador'] },
];

export const PHASES = ['Aceptación y planeación', 'Entendimiento y riesgos', 'Respuesta a riesgos', 'Ejecución por rubro', 'Finalización', 'Informe y archivo'];

const isAway = (p, today) => !!p.absent && diffDays(p.absent.from, today) <= 0 && diffDays(p.absent.to, today) >= 0;

/**
 * staff: [{id,name,role,absent?:{from,to}}]; overrides: {functionId: userId}
 * Devuelve por función: {status:'cubierta'|'suplente'|'vacante'|'no_aplica', by, role, titularRole}
 */
export function resolveOccupations(staff, today, { highRisk = false, overrides = {} } = {}) {
  const out = [];
  for (const f of FUNCTIONS) {
    if (f.when && !f.when({ highRisk })) { out.push({ ...f, status: 'no_aplica', by: null }); continue; }
    const forced = overrides[f.id] ? staff.find((p) => p.id === overrides[f.id]) : null;
    if (forced && !isAway(forced, today)) { out.push({ ...f, status: 'cubierta', by: forced, via: forced.role, titularRole: f.chain[0], manual: true }); continue; }
    let found = null; let idx = -1;
    for (let i = 0; i < f.chain.length && !found; i++) {
      const cand = staff.find((p) => p.role === f.chain[i] && !isAway(p, today));
      if (cand) { found = cand; idx = i; }
    }
    out.push({ ...f, status: !found ? 'vacante' : idx === 0 ? 'cubierta' : 'suplente', by: found, via: found?.role ?? null, titularRole: f.chain[0] });
  }
  return out;
}

/** Reglas de incompatibilidad entre quien prepara, revisa y firma. */
export function occupationConflicts(resolved) {
  const by = Object.fromEntries(resolved.map((r) => [r.id, r.by?.id ?? null]));
  const issues = [];
  const same = (a, b, msg, code) => { if (by[a] && by[a] === by[b]) issues.push({ code, severity: 'error', message: msg, functions: [a, b] }); };
  same('revision_1', 'revision_2', 'Quien hace la primera revisión no puede hacer la segunda', 'revisor_repetido');
  same('cedulas', 'revision_2', 'Quien elabora las cédulas no puede hacer la segunda revisión', 'preparador_revisor');
  same('cedulas', 'revision_1', 'Quien elabora las cédulas no puede hacer la primera revisión', 'preparador_revisor');
  same('plan_global', 'revision_2', 'Quien hace el plan no puede aprobarlo en la segunda revisión', 'preparador_revisor');
  same('informe', 'firma_informe', 'Quien redacta el informe no debería firmarlo sin revisión independiente', 'informe_firma');
  const eq = by.eqcr;
  if (eq) for (const r of resolved) if (r.id !== 'eqcr' && r.status !== 'no_aplica' && r.by?.id === eq) issues.push({ code: 'eqcr_en_equipo', severity: 'error', message: 'El revisor de calidad del encargo no puede participar en el equipo', functions: ['eqcr', r.id] });
  // un mismo problema de revisor repetido por varias funciones se muestra una sola vez por par
  return issues.filter((x, i, a) => a.findIndex((y) => y.code === x.code && y.functions.join() === x.functions.join()) === i);
}

export function occupationSummary(resolved) {
  const s = { cubierta: 0, suplente: 0, vacante: 0, no_aplica: 0 };
  for (const r of resolved) s[r.status] += 1;
  return s;
}

// ---------------------------------------------------------------- horas
export function hoursSummary(rows) {
  return rows.map((r) => {
    const pct = r.est ? r.real / r.est : 0;
    return { ...r, pct, status: !r.est ? 'sin_estimado' : pct > 1.1 ? 'excedido' : pct > 0.9 ? 'al_limite' : 'normal' };
  });
}

// ---------------------------------------------------------------- avance de fase
/**
 * state: {today, contract, staff, docs, tasks:[{id,label,phase,due,done}], declarations:[userId], highRisk, overrides}
 * Devuelve {ok, blockers:[{code,message}]} para poder CERRAR la fase `phase` (0-5).
 */
export function phaseGate(phase, state) {
  const blockers = [];
  const resolved = resolveOccupations(state.staff, state.today, { highRisk: state.highRisk, overrides: state.overrides });
  for (const r of resolved) if (r.phase <= phase && r.status === 'vacante') blockers.push({ code: 'vacante', message: `Sin responsable: ${r.label}` });
  for (const c of occupationConflicts(resolved)) {
    const phases = c.functions.map((id) => FUNCTIONS.find((f) => f.id === id)?.phase ?? 9);
    if (Math.max(...phases) <= phase) blockers.push({ code: c.code, message: c.message });
  }
  for (const d of state.docs ?? []) {
    if ((d.requiredPhase ?? 9) <= phase && d.status !== 'aceptado') blockers.push({ code: 'pbc_sin_verificar', message: `Documento sin aceptar: ${d.title} (${d.status.replace('_', ' ')})` });
  }
  for (const t of state.tasks ?? []) {
    if (t.phase <= phase && !t.done && diffDays(t.due, state.today) < 0) blockers.push({ code: 'tarea_vencida', message: `Tarea vencida: ${t.label}` });
  }
  if (phase >= 0) {
    for (const p of state.staff) if (!(state.declarations ?? []).includes(p.id) && ROLES[p.role]?.group !== 'gerencia') blockers.push({ code: 'sin_independencia', message: `Falta declaración de independencia: ${p.name}` });
  }
  const contract = analyzeContract(state.contract, state.today);
  for (const i of contract.issues) if (i.severity === 'error') blockers.push({ code: i.code, message: i.message });
  return { ok: blockers.length === 0, blockers };
}

/** Registra el resultado de una verificación (ok | fail | na) sin mutar el documento. */
export function setCheck(doc, key, value) {
  if (!PBC_CHECKS.some(([k]) => k === key)) throw new Error(`Verificación desconocida: ${key}`);
  if (!['ok', 'fail', 'na', null].includes(value)) throw new Error(`Valor no válido: ${value}`);
  return { ...doc, checks: { ...(doc.checks ?? {}), [key]: value } };
}

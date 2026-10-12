// Calendario del encargo: reúne los plazos propios (hitos, informe, armado del archivo, documentos del cliente, tareas)
// y las obligaciones legales que el auditor registra. NO trae fechas legales de fábrica: cada obligación exige su fuente
// oficial y queda "sin validar" hasta que el auditor o su asesor la validen.
import { analyzeContract, diffDays, parseDate } from './engagement.js';

export const KIND_LABEL = { hito: 'Hito', informe: 'Informe', archivo: 'Archivo (NIA 230)', documento: 'Documento del cliente', tarea: 'Tarea', obligacion: 'Obligación legal' };

function status(date, today, done) {
  if (done) return 'hecho';
  const left = diffDays(date, today);
  return left < 0 ? 'vencido' : left <= 7 ? 'proximo' : 'futuro';
}

/** Valida y agrega una obligación. Exige título, fecha válida y fuente oficial. */
export function addObligation(list, { title, date, source, by = null }) {
  if (!String(title ?? '').trim()) throw new Error('Indica qué obligación es');
  if (!parseDate(date)) throw new Error('La fecha no es válida');
  if (!String(source ?? '').trim()) throw new Error('Toda obligación legal lleva su fuente oficial (ley, artículo o enlace)');
  const o = { id: `ob-${list.length + 1}`, title: title.trim(), date, source: source.trim(), createdBy: by, validatedBy: null, done: false };
  list.push(o); return o;
}

/** Solo una persona distinta de quien la registró valida (cuatro ojos); Claude no valida. */
export function validateObligation(o, by) {
  if (!by) throw new Error('Falta quién valida');
  if (by === 'claude') throw new Error('Claude propone, el auditor decide');
  if (o.createdBy && o.createdBy === by) throw new Error('Cuatro ojos: la valida otra persona');
  o.validatedBy = by; return o;
}

export function buildEvents(eng, today, obligations = []) {
  const ev = [];
  const a = analyzeContract(eng.contract, today);
  const push = (e) => ev.push({ ...e, status: status(e.date, today, e.done), daysLeft: diffDays(e.date, today) });
  for (const m of a.milestones ?? []) push({ id: m.id, kind: 'hito', title: m.label, date: m.due, done: !!m.doneOn });
  if (eng.contract?.reportDate) push({ id: 'informe', kind: 'informe', title: 'Informe comprometido', date: eng.contract.reportDate, done: false });
  if (a.archiveDeadline) push({ id: 'archivo', kind: 'archivo', title: `Armado del archivo (${a.archiveDays} días)`, date: a.archiveDeadline, done: false });
  for (const d of eng.docs ?? []) if (d.dueOn && ['pendiente'].includes(d.status)) push({ id: d.id, kind: 'documento', title: `Recibir: ${d.title}`, date: d.dueOn, done: false });
  for (const t of eng.tasks ?? []) push({ id: t.id, kind: 'tarea', title: t.label, date: t.due, done: !!t.done });
  for (const o of obligations) push({ id: o.id, kind: 'obligacion', title: o.title, date: o.date, done: !!o.done, source: o.source, validatedBy: o.validatedBy });
  return ev.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

export function summarize(events) {
  const open = events.filter((e) => e.status !== 'hecho');
  return {
    vencidos: open.filter((e) => e.status === 'vencido').length,
    proximos: open.filter((e) => e.status === 'proximo').length,
    sinValidar: events.filter((e) => e.kind === 'obligacion' && !e.validatedBy).length,
  };
}

export function byMonth(events) {
  const m = new Map();
  for (const e of events) { const k = e.date.slice(0, 7); if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
  return [...m.entries()];
}

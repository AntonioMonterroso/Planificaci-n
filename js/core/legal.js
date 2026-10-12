// Motor de cumplimiento legal: perfil por cliente → áreas que aplican → estado por requisito, por área y en conjunto.
// Reglas: "cumple" exige referencia a evidencia; "incumple" exige comentario; el área no se da por buena hasta que otra
// persona (distinta de quien evaluó) confirme que la norma consultada está vigente. Claude no confirma.
import { AREAS } from '../legal/catalogo.js';

export const STATES = ['cumple', 'incumple', 'no_aplica'];

export const applicableAreas = (perfil) => AREAS.filter((a) => a.aplica(perfil ?? {}));
export const newLegalState = () => ({ answers: {}, confirmations: {} });

export function setStatus(state, reqId, { estado, ref = '', comentario = '', by }) {
  const exists = AREAS.some((a) => a.requisitos.some((r) => r.id === reqId));
  if (!exists) throw new Error(`No existe el requisito ${reqId}`);
  if (!estado) { delete state.answers[reqId]; return state; }
  if (!STATES.includes(estado)) throw new Error(`Estado no permitido: ${estado}`);
  if (!by) throw new Error('Falta quién evalúa');
  state.answers[reqId] = { estado, ref: String(ref).trim(), comentario: String(comentario).trim(), by };
  return state;
}

/** Confirma que la norma consultada para el área está vigente. Otra persona distinta de quienes evaluaron; nunca Claude. */
export function confirmNorms(state, areaId, by) {
  const area = AREAS.find((a) => a.id === areaId);
  if (!area) throw new Error(`No existe el área ${areaId}`);
  if (!by) throw new Error('Falta quién confirma');
  if (by === 'claude') throw new Error('Claude propone, el auditor decide');
  const evaluators = new Set(area.requisitos.map((r) => state.answers[r.id]?.by).filter(Boolean));
  if (evaluators.has(by)) throw new Error('Cuatro ojos: la vigencia de la norma la confirma otra persona distinta de quien evaluó');
  state.confirmations[areaId] = { by, on: new Date().toISOString().slice(0, 10) };
  return state;
}

export function summarizeArea(area, state) {
  const c = { cumple: 0, incumple: 0, no_aplica: 0, pendiente: 0 };
  const issues = [];
  for (const r of area.requisitos) {
    const a = state.answers[r.id];
    if (!a) { c.pendiente++; continue; }
    c[a.estado]++;
    if (a.estado === 'cumple' && !a.ref) issues.push(`${r.id}: "cumple" necesita referencia a la evidencia`);
    if (a.estado === 'incumple' && !a.comentario) issues.push(`${r.id}: "incumple" necesita comentario`);
  }
  const verificadas = area.referencias.filter((x) => !x.alerta).length; // con fuente oficial citada, aún por confirmar vigencia
  const alertas = area.referencias.filter((x) => x.alerta).length;
  const confirmed = !!state.confirmations[area.id];
  let semaforo;
  if (c.incumple || issues.length) semaforo = 'rojo';
  else if (c.pendiente || !confirmed) semaforo = 'ambar';
  else semaforo = 'verde';
  return { id: area.id, nombre: area.nombre, total: area.requisitos.length, conteo: c, issues, verificadas, alertas, sinNorma: area.referencias.length === 0, confirmed, semaforo };
}

/** "Por sí sola" = summarizeArea; "en conjunto" = todas las que aplican. */
export function summarizeAll(perfil, state) {
  const areas = applicableAreas(perfil).map((a) => summarizeArea(a, state));
  const worst = areas.some((a) => a.semaforo === 'rojo') ? 'rojo' : areas.some((a) => a.semaforo === 'ambar') ? 'ambar' : 'verde';
  return { areas, semaforo: areas.length ? worst : 'ambar', rojas: areas.filter((a) => a.semaforo === 'rojo').length, ambar: areas.filter((a) => a.semaforo === 'ambar').length, verdes: areas.filter((a) => a.semaforo === 'verde').length };
}

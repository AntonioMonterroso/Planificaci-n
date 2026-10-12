// Formatos (cuestionarios y checklists) como datos: definición JSON + respuestas + reglas de cierre.
// La definición vive en js/formatos/*.js; las respuestas pertenecen a un encargo y se guardan cifradas como cualquier papel.
//
// Reglas: cada ítem se responde con un valor permitido; un "SI" exige referencia a papel de trabajo o comentario
// (ninguna conclusión sin origen); el formato no se cierra con ítems pendientes y exige tres personas distintas.

export const DEFAULT_ANSWERS = ['SI', 'NO', 'NA'];

export function validateFormato(f) {
  const errors = [];
  const need = (ok, msg) => { if (!ok) errors.push(msg); };
  need(f && typeof f.id === 'string' && f.id, 'Falta el id');
  need(f && typeof f.titulo === 'string' && f.titulo, 'Falta el título');
  need(Array.isArray(f?.secciones) && f.secciones.length, 'Faltan las secciones');
  const ids = new Set();
  for (const s of f?.secciones ?? []) {
    need(s.id && s.nombre, `Sección sin id o nombre: ${s.id ?? '?'}`);
    need(Array.isArray(s.items) && s.items.length, `Sección vacía: ${s.id}`);
    for (const it of s.items ?? []) {
      need(it.id && it.texto, `Ítem sin id o texto en ${s.id}`);
      need(!ids.has(it.id), `Ítem duplicado: ${it.id}`);
      ids.add(it.id);
    }
  }
  return errors;
}

export function newResponse(f, base = {}) {
  return { formatoId: f.id, answers: {}, signoffs: {}, ...base };
}

export function itemsOf(f) { return f.secciones.flatMap((s) => s.items.map((it) => ({ ...it, seccion: s.id }))); }

export function setAnswer(f, resp, itemId, { valor, ref = '', comentario = '' }) {
  const it = itemsOf(f).find((x) => x.id === itemId);
  if (!it) throw new Error(`No existe el ítem ${itemId}`);
  const allowed = f.respuestas ?? DEFAULT_ANSWERS;
  if (valor === null || valor === undefined || valor === '') { delete resp.answers[itemId]; return resp; }
  if (!allowed.includes(valor)) throw new Error(`Respuesta no permitida: ${valor}`);
  resp.answers[itemId] = { valor, ref: String(ref).trim(), comentario: String(comentario).trim() };
  return resp;
}

/** Por sección: respondidos, conteo por valor y pendientes; más alertas del formato. */
export function summarize(f, resp) {
  const allowed = f.respuestas ?? DEFAULT_ANSWERS;
  const issues = [];
  const secciones = f.secciones.map((s) => {
    const c = Object.fromEntries(allowed.map((a) => [a, 0])); let pend = 0;
    for (const it of s.items) {
      const a = resp.answers[it.id];
      if (!a) { pend++; continue; }
      c[a.valor]++;
      if (a.valor === (f.valorQueExigeOrigen ?? 'SI') && !a.ref && !a.comentario) issues.push({ code: 'sin_origen', itemId: it.id, message: `${it.id}: la respuesta ${a.valor} necesita referencia a papel de trabajo o comentario` });
    }
    return { id: s.id, nombre: s.nombre, total: s.items.length, pendientes: pend, conteo: c };
  });
  const pendientes = secciones.reduce((n, s) => n + s.pendientes, 0);
  const total = secciones.reduce((n, s) => n + s.total, 0);
  return { secciones, total, pendientes, respondidos: total - pendientes, issues };
}

/** Propuesta (no conclusión): secciones con al menos un SI. El auditor concluye. */
export function proposedFactors(f, resp) {
  const key = f.valorQueExigeOrigen ?? 'SI';
  return summarize(f, resp).secciones.filter((s) => s.conteo[key] > 0).map((s) => ({ id: s.id, nombre: s.nombre, cantidad: s.conteo[key] }));
}

export function closeBlockers(f, resp) {
  const s = summarize(f, resp);
  const out = [];
  if (s.pendientes) out.push(`Faltan ${s.pendientes} ítem${s.pendientes > 1 ? 's' : ''} por responder`);
  for (const i of s.issues) out.push(i.message);
  const who = ['elaboro', 'reviso', 'autorizo'].map((k) => resp.signoffs?.[k]);
  if (who.some((x) => !x)) out.push('Faltan firmas: elaboró, revisó y autorizó');
  else if (new Set(who).size < 3) out.push('Cuatro ojos: elaborador, revisor y autorizador deben ser personas distintas');
  return out;
}

// Documentos de cierre (informe, cartas): secciones editables con variables, versiones y bloqueo al firmar.
// Reglas: variables sin resolver o secciones vacías impiden firmar; firmar exige tres personas distintas y verificaciones
// previas en orden; firmado = inmutable (se desbloquea con motivo y crea versión nueva); Claude no firma.
import { PLANTILLAS, OPINIONES } from '../informe/plantillas.js';

const VAR = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function newDocument(type, { opinion = 'no_modificada' } = {}) {
  const t = PLANTILLAS[type];
  if (!t) throw new Error(`Plantilla desconocida: ${type}`);
  return { type, titulo: t.titulo, opinion: type === 'informe' ? opinion : null, version: 1, status: 'borrador', historial: [],
    sections: t.secciones.map((s) => ({ id: s.id, titulo: s.titulo, guia: s.guia, texto: s.texto, noAplica: false })), signoffs: {} };
}

const assertEditable = (doc) => { if (doc.status === 'firmado') throw new Error('Documento firmado e inmutable: desbloquéalo con confirmación formal para crear una versión nueva'); };

export function setSection(doc, id, texto) {
  assertEditable(doc);
  const s = doc.sections.find((x) => x.id === id);
  if (!s) throw new Error(`No existe la sección ${id}`);
  s.texto = String(texto); return doc;
}
export function setNoAplica(doc, id, value) {
  assertEditable(doc);
  const s = doc.sections.find((x) => x.id === id); if (!s) throw new Error(`No existe la sección ${id}`);
  s.noAplica = !!value; return doc;
}
export function setOpinion(doc, opinion) {
  assertEditable(doc);
  if (doc.type !== 'informe') throw new Error('Solo el informe lleva tipo de opinión');
  if (!OPINIONES[opinion]) throw new Error(`Tipo de opinión desconocido: ${opinion}`);
  doc.opinion = opinion; return doc;
}

export const unresolved = (text, vars) => [...String(text).matchAll(VAR)].map((m) => m[1]).filter((k) => !vars[k]);
export const fill = (text, vars) => String(text).replace(VAR, (m, k) => (vars[k] ? vars[k] : m));

export function variablesOf({ header = {}, contract = {} }, fmtDate = (x) => x) {
  return {
    entidad: header.entity, periodo: header.period, moneda: (header.currency ?? '').toLowerCase(),
    fecha_informe: contract.reportDate ? fmtDate(contract.reportDate) : undefined, fecha_cierre: contract.periodEnd ? fmtDate(contract.periodEnd) : undefined,
  };
}

/** Texto final de cada sección con variables resueltas (las no resueltas se dejan visibles). */
export function render(doc, vars) {
  return doc.sections.filter((s) => !s.noAplica).map((s) => ({ titulo: s.titulo, texto: fill(s.texto, vars) }));
}

export function blockers(doc, vars, checks = []) {
  const out = [];
  for (const s of doc.sections) {
    if (s.noAplica) continue;
    if (!String(s.texto).trim()) out.push(`Sección vacía: ${s.titulo}`);
    const u = unresolved(s.texto, vars); if (u.length) out.push(`${s.titulo}: faltan datos ({{${u.join('}}, {{')}}})`);
    if (/\[[^\]]*completar[^\]]*\]/i.test(s.texto)) out.push(`${s.titulo}: queda texto por completar`);
  }
  for (const c of checks) if (!c.ok) out.push(`Verificación previa: ${c.label}`);
  const who = ['elaboro', 'reviso', 'autorizo'].map((k) => doc.signoffs[k]);
  if (who.some((x) => !x)) out.push('Faltan firmas: elaboró, revisó y autorizó');
  else if (new Set(who).size < 3) out.push('Cuatro ojos: elaborador, revisor y autorizador deben ser personas distintas');
  return out;
}

export function sign(doc, vars, checks, by) {
  assertEditable(doc);
  if (by === 'claude') throw new Error('Claude propone, el auditor decide');
  const b = blockers(doc, vars, checks);
  if (b.length) throw new Error(`No se puede firmar: ${b[0]}${b.length > 1 ? ` (y ${b.length - 1} más)` : ''}`);
  doc.status = 'firmado'; doc.firmadoPor = by; return doc;
}

/** Desbloqueo: motivo obligatorio; conserva la versión firmada en el historial y abre una versión nueva en borrador. */
export function unlock(doc, { by, motivo }) {
  if (doc.status !== 'firmado') throw new Error('El documento no está firmado');
  if (!by || by === 'claude') throw new Error('Claude propone, el auditor decide');
  if (!String(motivo ?? '').trim()) throw new Error('El desbloqueo exige un motivo formal');
  doc.historial.push({ version: doc.version, firmadoPor: doc.firmadoPor, signoffs: { ...doc.signoffs }, secciones: doc.sections.map((s) => ({ ...s })), desbloqueadoPor: by, motivo: motivo.trim() });
  doc.version += 1; doc.status = 'borrador'; doc.signoffs = {}; delete doc.firmadoPor; return doc;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const toText = (doc, vars) => `${doc.titulo.toUpperCase()}\n\n${render(doc, vars).map((s) => `${s.titulo}\n${s.texto}`).join('\n\n')}\n`;
/** HTML autocontenido (Word lo abre y se imprime a PDF). Sin scripts. */
export function toHtml(doc, vars) {
  const body = render(doc, vars).map((s) => `<h2>${esc(s.titulo)}</h2>${s.texto.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(doc.titulo)}</title></head><body><h1>${esc(doc.titulo)}</h1>${doc.status === 'borrador' ? '<p><i>BORRADOR · versión ' + doc.version + '</i></p>' : ''}${body}</body></html>`;
}

/** Verificaciones previas a emitir, armadas con datos de los demás módulos (el llamador los calcula). */
export function precheck({ ledgerErrors = 0, pbcSinVerificar = 0, legalRojas = 0, formatosPendientes = 0, vacantes = 0 }) {
  return [
    { label: 'Las cédulas cuadran (sin errores del motor)', ok: ledgerErrors === 0 },
    { label: 'Documentos del cliente verificados', ok: pbcSinVerificar === 0 },
    { label: 'Sin hallazgos en cumplimiento legal', ok: legalRojas === 0 },
    { label: 'Formatos de trabajo respondidos', ok: formatosPendientes === 0 },
    { label: 'Ninguna función de ocupación vacante', ok: vacantes === 0 },
  ];
}

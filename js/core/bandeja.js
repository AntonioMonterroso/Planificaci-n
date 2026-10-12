// Bandeja de Claude: solicitudes y entregas. Las mismas reglas que impone la base (0002_bandeja.sql).
// Claude propone (entrega con evidencia o declara el dato faltante); el auditor decide.

export const KINDS = {
  revisar: 'Revisar',
  explicar: 'Explicar una diferencia',
  borrador: 'Preparar borrador',
  resumir: 'Resumir',
  comparar: 'Comparar con el periodo anterior',
  hallazgo: 'Redactar hallazgo',
  verificar_doc: 'Verificar un documento',
  norma: 'Duda de norma o ley',
};
export const EVIDENCE_TYPES = ['celda', 'norma', 'ley', 'documento'];
export const STATUS_LABEL = { pendiente: 'Pendiente', en_proceso: 'En proceso', entregado: 'Entregado', aceptado: 'Aceptado', cambios: 'Cambios pedidos' };

export class Inbox {
  constructor({ requests = [], deliveries = [] } = {}, { now = () => new Date().toISOString() } = {}) {
    this.requests = requests; this.deliveries = deliveries; this.now = now; this.seq = requests.length + deliveries.length;
  }
  #id(p) { return `${p}-${++this.seq}`; }
  request(id) { const r = this.requests.find((x) => x.id === id); if (!r) throw new Error('Solicitud inexistente'); return r; }
  deliveryOf(requestId) { return this.deliveries.filter((d) => d.requestId === requestId).at(-1) ?? null; }

  ask({ by, kind, targetRef = null, question }) {
    if (!by) throw new Error('Falta quién pide');
    if (!KINDS[kind]) throw new Error(`Tipo de solicitud desconocido: ${kind}`);
    if (!String(question ?? '').trim()) throw new Error('La pregunta no puede estar vacía');
    const r = { id: this.#id('sol'), by, kind, targetRef, question: question.trim(), status: 'pendiente', at: this.now() };
    this.requests.push(r); return r;
  }
  take(id) {
    const r = this.request(id);
    if (r.status !== 'pendiente') throw new Error('Solo se toma una solicitud pendiente');
    r.status = 'en_proceso'; return r;
  }
  deliver(id, { author, body, evidence = [], missing = '', draft = null }) {
    const r = this.request(id);
    if (!['pendiente', 'en_proceso'].includes(r.status)) throw new Error('La solicitud ya fue entregada');
    if (!String(body ?? '').trim()) throw new Error('La entrega no puede estar vacía');
    for (const e of evidence) if (!EVIDENCE_TYPES.includes(e.tipo) || !String(e.ref ?? '').trim()) throw new Error('Evidencia inválida: indica tipo y referencia');
    if (!evidence.length && !String(missing).trim()) throw new Error('Toda entrega cita evidencia (cédula/celda, norma o ley) o declara qué dato falta');
    const d = { id: this.#id('ent'), requestId: id, author, body: body.trim(), evidence, missing: String(missing).trim(), draft, status: 'entregado', at: this.now() };
    this.deliveries.push(d); r.status = 'entregado'; return d;
  }
  // Decide un humano distinto de quien entregó. `apply` ejecuta el borrador solo al aceptar.
  decide(id, { by, accept, apply = null }) {
    const r = this.request(id); const d = this.deliveryOf(id);
    if (r.status !== 'entregado' || !d) throw new Error('No hay entrega por decidir');
    if (!by || by === d.author) throw new Error('Claude propone, el auditor decide');
    if (accept) { if (d.draft && apply) apply(d.draft); d.status = 'aceptado'; r.status = 'aceptado'; }
    else { d.status = 'rechazado'; r.status = 'cambios'; }
    d.decidedBy = by; d.decidedAt = this.now();
    return d;
  }
  counts() {
    const c = { pendiente: 0, en_proceso: 0, entregado: 0, aceptado: 0, cambios: 0 };
    for (const r of this.requests) c[r.status]++;
    return c;
  }
}

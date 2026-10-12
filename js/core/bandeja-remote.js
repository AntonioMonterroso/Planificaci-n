// Bandeja respaldada por Supabase. Pregunta, entrega, faltante y borrador viajan CIFRADOS (la frase nunca sale del navegador);
// en la base solo quedan tipo, referencia de cédula, estado y fechas. Misma interfaz asíncrona que la versión de demostración.
import { Inbox } from './bandeja.js';
import { isCipher } from './crypto.js';

const LOCK = '🔒 Contenido cifrado: desbloquéalo con tu frase';
const toRequest = (r, question) => ({ id: r.id, by: r.requested_by, kind: r.kind, targetRef: r.target_ref, question, status: r.status, at: r.created_at });
const toDelivery = (d, c) => ({ id: d.id, requestId: d.request_id, author: d.author, body: c.body, evidence: d.evidence ?? [], missing: c.missing,
  draft: c.draft, status: d.status, decidedBy: d.decided_by, decidedAt: d.decided_at, at: d.created_at });

export async function remoteBandeja(sb) {
  const [eng] = await sb.rest('engagements?select=id,org_id,title&order=period_start.desc&limit=1');
  if (!eng) throw new Error('Tu usuario no tiene encargos asignados');
  let cipher = null;
  // Texto legible si hay llave; marcador si está cifrado y no hay llave; texto tal cual si no venía cifrado.
  const read = async (t) => {
    if (t === null || t === undefined || t === '') return t ?? '';
    if (!isCipher(t)) return t;
    if (!cipher) return LOCK;
    return cipher.dec(t);
  };
  const api = {
    inbox: new Inbox(), engagement: eng,
    get unlocked() { return !!cipher; },
    async unlock(c) { cipher = c; await api.reload(); },
    async reload() {
      const [reqs, dels] = await Promise.all([
        sb.rest(`claude_requests?select=*&engagement_id=eq.${eng.id}&order=created_at.asc`),
        sb.rest('claude_deliveries?select=*&order=created_at.asc')]);
      const requests = await Promise.all(reqs.map(async (r) => toRequest(r, await read(r.question))));
      const deliveries = await Promise.all(dels.map(async (d) => toDelivery(d, {
        body: await read(d.body), missing: await read(d.missing_data), draft: d.draft && isCipher(d.draft.c) ? (cipher ? await cipher.dec(d.draft.c) : null) : d.draft })));
      api.inbox = new Inbox({ requests, deliveries });
    },
    async ask({ kind, targetRef, question }) {
      if (!String(question ?? '').trim()) throw new Error('La pregunta no puede estar vacía');
      if (!cipher) throw new Error('Desbloquea el contenido con tu frase antes de enviar: la pregunta se guarda cifrada');
      await sb.rest('claude_requests', { method: 'POST', prefer: 'return=minimal',
        body: { org_id: eng.org_id, engagement_id: eng.id, kind, target_ref: targetRef, question: await cipher.enc(question.trim()) } });
      await api.reload();
    },
    // La base impone quién puede decidir (distinto de quien entregó); aquí solo se envía la decisión.
    async decide(requestId, accept) {
      const d = api.inbox.deliveryOf(requestId);
      if (!d) throw new Error('No hay entrega por decidir');
      await sb.rest(`claude_deliveries?id=eq.${d.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: accept ? 'aceptado' : 'rechazado' } });
      await sb.rest(`claude_requests?id=eq.${requestId}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: accept ? 'aceptado' : 'cambios' } });
      await api.reload();
    },
  };
  await api.reload();
  return api;
}

// Misma interfaz sobre la bandeja en memoria (modo demostración, sin conexión).
export function localBandeja(inbox, me) {
  return {
    get inbox() { return inbox; }, engagement: null, unlocked: true,
    async unlock() {}, async reload() {},
    async ask({ kind, targetRef, question }) { inbox.ask({ by: me, kind, targetRef, question }); },
    async decide(requestId, accept) { inbox.decide(requestId, { by: me, accept }); },
  };
}

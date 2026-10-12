// Bandeja respaldada por Supabase. Misma interfaz asíncrona que la versión de demostración.
import { Inbox } from './bandeja.js';

const toRequest = (r) => ({ id: r.id, by: r.requested_by, kind: r.kind, targetRef: r.target_ref, question: r.question, status: r.status, at: r.created_at });
const toDelivery = (d) => ({ id: d.id, requestId: d.request_id, author: d.author, body: d.body, evidence: d.evidence ?? [], missing: d.missing_data ?? '',
  draft: d.draft, status: d.status, decidedBy: d.decided_by, decidedAt: d.decided_at, at: d.created_at });

export async function remoteBandeja(sb) {
  const [eng] = await sb.rest('engagements?select=id,org_id,title&order=period_start.desc&limit=1');
  if (!eng) throw new Error('Tu usuario no tiene encargos asignados');
  const api = {
    inbox: new Inbox(), engagement: eng,
    async reload() {
      const [reqs, dels] = await Promise.all([
        sb.rest(`claude_requests?select=*&engagement_id=eq.${eng.id}&order=created_at.asc`),
        sb.rest('claude_deliveries?select=*&order=created_at.asc')]);
      api.inbox = new Inbox({ requests: reqs.map(toRequest), deliveries: dels.map(toDelivery) });
    },
    async ask({ kind, targetRef, question }) {
      if (!String(question ?? '').trim()) throw new Error('La pregunta no puede estar vacía');
      await sb.rest('claude_requests', { method: 'POST', prefer: 'return=minimal',
        body: { org_id: eng.org_id, engagement_id: eng.id, kind, target_ref: targetRef, question: question.trim() } });
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
  const api = {
    get inbox() { return inbox; }, engagement: null,
    async reload() {},
    async ask({ kind, targetRef, question }) { inbox.ask({ by: me, kind, targetRef, question }); },
    async decide(requestId, accept) { inbox.decide(requestId, { by: me, accept }); },
  };
  return api;
}

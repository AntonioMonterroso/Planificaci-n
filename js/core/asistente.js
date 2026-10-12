// Acceso de Claude a la bandeja como usuario `asistente` (nunca service_role). Lee solicitudes, toma, entrega con
// evidencia y descifra/cifra con la frase del entorno. La base impone sus límites: no acepta, no firma, no crea solicitudes.
import { isCipher } from './crypto.js';

export async function pendientes(sb, cipher) {
  const reqs = await sb.rest('claude_requests?select=*&status=in.(pendiente,en_proceso)&order=created_at.asc');
  return Promise.all(reqs.map(async (r) => ({ id: r.id, tipo: r.kind, ref: r.target_ref, estado: r.status, engagement_id: r.engagement_id, org_id: r.org_id,
    pregunta: isCipher(r.question) ? await cipher.dec(r.question) : r.question })));
}

export async function tomar(sb, id) {
  await sb.rest(`claude_requests?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'en_proceso' } });
}

/** Entrega con evidencia o con declaración del dato faltante (la base también lo exige). El texto viaja cifrado. */
export async function entregar(sb, cipher, { org_id, request_id, body, evidence = [], missing = '', draft = null }) {
  if (!String(body ?? '').trim()) throw new Error('La entrega no puede estar vacía');
  if (!evidence.length && !String(missing).trim()) throw new Error('Toda entrega cita evidencia (cédula/celda, norma o ley) o declara qué dato falta');
  await sb.rest('claude_deliveries', { method: 'POST', prefer: 'return=minimal', body: {
    org_id, request_id, body: await cipher.enc(body.trim()), evidence,
    missing_data: missing ? await cipher.enc(String(missing).trim()) : null,
    draft: draft ? { c: await cipher.enc(draft) } : null } });
  await sb.rest(`claude_requests?id=eq.${request_id}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'entregado' } });
}

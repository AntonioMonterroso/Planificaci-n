// Solicitud de ejemplo SINTÉTICA con su entrega, para ver el flujo sin conexión.
import { Inbox } from '../core/bandeja.js';

export function demoInbox() {
  const ib = new Inbox();
  const r = ib.ask({ by: 'u-campo', kind: 'revisar', targetRef: 'A1-1', question: '¿La subanalítica de Caja general cuadra con la analítica A1?' });
  ib.take(r.id);
  ib.deliver(r.id, {
    author: 'claude', body: 'La suma de A1-1 coincide con la línea 111001 de A1. Los cheques por depositar se componen de 1,200.00 + 850.50.',
    evidence: [{ tipo: 'celda', ref: 'A1-1!total' }, { tipo: 'celda', ref: 'A1!111001' }, { tipo: 'norma', ref: 'NIA 500 · evidencia de auditoría' }],
  });
  return ib;
}

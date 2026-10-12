// Encargo SINTÉTICO para demostración (nombres y datos inventados). Las fechas son relativas a "hoy"
// para que el tablero siempre muestre plazos realistas.
import { addDays, parseDate } from '../core/engagement.js';

export function demoEngagement(today) {
  const t = (n) => addDays(today, n);
  const y = parseDate(today).getUTCFullYear();
  const periodEnd = `${y - 1}-12-31`;
  const reportDate = (t(28) > addDays(periodEnd, 30)) ? t(28) : addDays(periodEnd, 30);

  return {
    client: { name: 'Cliente Demo, S.A.', code: 'CLI-001' },
    title: 'Auditoría de estados financieros',
    highRisk: false,
    overrides: {},
    contract: {
      signedOn: t(-44), validFrom: t(-40), validTo: addDays(reportDate, 75),
      periodStart: `${y - 1}-01-01`, periodEnd, reportDate,
      fee: 'Q85,000.00', feeTerms: '40 % al inicio, 30 % al borrador, 30 % a la entrega',
      extensions: [],
      milestones: [
        { id: 'm1', label: 'Planeación aprobada', due: t(-30), doneOn: t(-31) },
        { id: 'm2', label: 'Trabajo de campo concluido', due: t(-4) },
        { id: 'm3', label: 'Borrador de informe', due: t(12) },
        { id: 'm4', label: 'Informe final', due: reportDate },
      ],
    },
    staff: [
      { id: 'u-soc', name: 'Socio (demo)', role: 'socio' },
      { id: 'u-ger', name: 'Gerente (demo)', role: 'gerente' },
      { id: 'u-sup', name: 'Supervisor (demo)', role: 'supervisor' },
      { id: 'u-enc', name: 'Encargado (demo)', role: 'encargado' },
      { id: 'u-cam', name: 'Auditor de campo (demo)', role: 'campo' },
      { id: 'u-aux', name: 'Auxiliar (demo)', role: 'auxiliar' },
    ],
    declarations: ['u-sup', 'u-enc', 'u-cam'],
    hours: [
      { id: 'u-enc', name: 'Encargado (demo)', est: 120, real: 96 },
      { id: 'u-sup', name: 'Supervisor (demo)', est: 40, real: 22 },
      { id: 'u-cam', name: 'Auditor de campo (demo)', est: 160, real: 171 },
      { id: 'u-aux', name: 'Auxiliar (demo)', est: 140, real: 118 },
    ],
    tasks: [
      { id: 't1', label: 'Entendimiento de la entidad', phase: 1, due: t(-25), done: true },
      { id: 't2', label: 'Arqueo de caja general', phase: 3, due: t(-6), done: false },
      { id: 't3', label: 'Conciliaciones bancarias', phase: 3, due: t(4), done: false },
    ],
    docs: [
      { id: 'd1', title: 'Balanza de comprobación', requestedOn: t(-38), dueOn: t(-30), receivedOn: t(-33), receivedBy: 'u-aux', status: 'aceptado', verifiedBy: 'u-cam', verifiedOn: t(-31), requiredPhase: 2, supports: ['BG'], checks: { legible: 'ok', firmas_sellos: 'ok', periodo: 'ok', autenticidad: 'na', cuadra: 'ok' } },
      { id: 'd2', title: 'Estados de cuenta bancarios (12 meses)', requestedOn: t(-36), dueOn: t(-20), receivedOn: t(-18), receivedBy: 'u-aux', status: 'en_verificacion', verifiedBy: 'u-cam', requiredPhase: 3, supports: ['A2', 'A2-1'], checks: { legible: 'ok', firmas_sellos: 'ok', periodo: 'ok', autenticidad: null, cuadra: null } },
      { id: 'd3', title: 'Relación de cheques en circulación', requestedOn: t(-30), dueOn: t(-12), receivedOn: t(-10), receivedBy: 'u-aux', status: 'recibido', requiredPhase: 3, supports: ['A2-1'], checks: {} },
      { id: 'd4', title: 'Actas de apertura de fondos de caja', requestedOn: t(-30), dueOn: t(-14), receivedOn: t(-12), receivedBy: 'u-aux', status: 'observado', verifiedBy: 'u-cam', reason: 'Falta firma del encargado del fondo', requiredPhase: 3, supports: ['A1-1', 'A1-2'], checks: { legible: 'ok', firmas_sellos: 'fail', periodo: 'ok', autenticidad: 'na', cuadra: 'ok' } },
      { id: 'd5', title: 'Libro mayor del ejercicio', requestedOn: t(-30), dueOn: t(-9), status: 'pendiente', requiredPhase: 3, supports: ['BG'], checks: {} },
      { id: 'd6', title: 'Planilla IGSS y declaraciones de ISR', requestedOn: t(-20), dueOn: t(6), status: 'pendiente', requiredPhase: 4, supports: [], checks: {} },
      { id: 'd7', title: 'Políticas contables firmadas', requestedOn: t(-20), dueOn: t(8), status: 'pendiente', requiredPhase: 4, supports: [], checks: {} },
    ],
  };
}

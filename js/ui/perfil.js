// Perfil del encargo: contrato y temporalidad, línea de tiempo, hitos y estado de las fases.
import { h } from './dom.js';
import { icon } from './icons.js';
import { analyzeContract, phaseGate, PHASES, diffDays, parseDate } from '../core/engagement.js';
import { pageHead, card, banner, chip, fold, fmtDateEs, btn } from './kit.js';
import { copyText } from './copy.js';

export function currentPhase(eng, today) {
  for (let i = 0; i <= 5; i++) if (!phaseGate(i, gateState(eng, today)).ok) return i;
  return 5;
}
export const gateState = (eng, today) => ({ today, contract: eng.contract, staff: eng.staff, docs: eng.docs, tasks: eng.tasks, declarations: eng.declarations, highRisk: eng.highRisk, overrides: eng.overrides });

const MS_STATUS = { hecho: ['mint', 'Hecho', 'check'], vencido: ['rose', 'Vencido', 'alert'], proximo: ['sun', 'Próximo', 'clock'], pendiente: ['plain', 'Pendiente', 'clock'] };

function timeline(a, c, today) {
  const start = c.validFrom; const end = a.archiveDeadline;
  const span = Math.max(1, diffDays(end, start));
  const pos = (iso) => `${Math.max(0, Math.min(100, (diffDays(iso, start) / span) * 100))}%`;
  const pins = [
    ...a.milestones.map((m, i) => ({ iso: m.due, label: m.label, status: m.status, dn: i % 2 === 1 })),
    { iso: c.reportDate, label: 'Informe', status: 'pendiente', dn: false, strong: true },
    { iso: a.archiveDeadline, label: 'Archivo final', status: 'pendiente', dn: true, strong: true },
  ];
  const track = h('div', { class: 'tl-track' }, h('div', { class: 'tl-fill' }));
  track.firstChild.style.width = pos(today);
  for (const p of pins) {
    const pin = h('span', { class: `tl-pin ${p.status}`, title: `${p.label}: ${fmtDateEs(p.iso)}` }); pin.style.left = pos(p.iso);
    const lab = h('span', { class: `tl-lab ${p.dn ? 'dn' : 'up'}` }, h('b', {}, p.label), fmtDateEs(p.iso)); lab.style.left = pos(p.iso);
    track.append(pin, lab);
  }
  const now = h('span', { class: 'tl-pin hoy', title: `Hoy: ${fmtDateEs(today)}` }); now.style.left = pos(today);
  track.append(now);
  return h('div', { class: 'table-wrap' }, h('div', { class: 'tl' }, track));
}

export function perfilView(ctx) {
  const eng = ctx.eng; const c = eng.contract; const today = ctx.today;
  const a = analyzeContract(c, today);
  const cur = currentPhase(eng, today);
  const gates = PHASES.map((_, i) => phaseGate(i, gateState(eng, today)));
  const gate = gates[cur];

  const summary = () => `${eng.client.name} · ${eng.title}\nPeriodo: ${fmtDateEs(c.periodStart)} – ${fmtDateEs(c.periodEnd)}\nInforme: ${fmtDateEs(c.reportDate)} (${a.daysToReport} días)\nArchivo final: ${fmtDateEs(a.archiveDeadline)}\nFase actual: ${PHASES[cur]}`;

  const issues = a.issues.map((i) => banner(i.severity === 'error' ? 'error' : 'warn', i.message));

  const contractCard = card({ title: 'Contrato y temporalidad' },
    h('div', { class: 'kv' },
      kv('Carta de encargo firmada', fmtDateEs(c.signedOn)),
      kv('Vigencia', `${fmtDateEs(c.validFrom)} → ${fmtDateEs(c.validTo)}`),
      kv('Periodo auditado', `${fmtDateEs(c.periodStart)} → ${fmtDateEs(c.periodEnd)}`),
      kv('Informe comprometido', `${fmtDateEs(c.reportDate)} · ${a.daysToReport >= 0 ? `faltan ${a.daysToReport} d` : `pasó hace ${-a.daysToReport} d`}`),
      kv(`Armado del archivo (${a.archiveDays} d)`, `${fmtDateEs(a.archiveDeadline)} · ${a.daysToArchive >= 0 ? `faltan ${a.daysToArchive} d` : `venció hace ${-a.daysToArchive} d`}`),
      kv('Honorarios', c.fee ?? '—'), kv('Forma de pago', c.feeTerms ?? '—'),
      kv('Prórrogas', c.extensions?.length ? c.extensions.map((e) => `+${e.days} d`).join(', ') : 'Ninguna')),
    h('div', { class: 'stack' },
      h('div', { class: 'row' }, h('span', { class: 'tiny' }, 'Avance de la vigencia'), h('span', { class: 'grow' }), h('span', { class: 'tiny' }, `${Math.round(a.progress * 100)} % · vence en ${a.daysToExpiry} d`)),
      barOf(a.progress)));

  const msCard = card({ title: 'Hitos y entregables' },
    h('div', {}, a.milestones.map((m) => {
      const [tone, label, ic] = MS_STATUS[m.status];
      return h('div', { class: 'ms' }, chip(tone, label, ic), h('b', {}, m.label),
        h('span', { class: 'when' }, m.doneOn ? `Hecho el ${fmtDateEs(m.doneOn)}` : `${fmtDateEs(m.due)} · ${m.daysLeft >= 0 ? `en ${m.daysLeft} d` : `hace ${-m.daysLeft} d`}`));
    })));

  const phaseCard = card({ title: 'Fases del encargo' },
    h('div', { class: 'phase-list' }, PHASES.map((p, i) => h('div', { class: `ph${i === cur ? ' cur' : ''}` },
      h('span', { class: 'n' }, String(i)), h('div', { class: 'grow' }, h('b', {}, p)),
      gates[i].ok ? chip('mint', 'Lista para cerrar', 'check') : chip(i === cur ? 'rose' : 'plain', `${gates[i].blockers.length} bloqueo${gates[i].blockers.length > 1 ? 's' : ''}`)))),
    h('p', { class: 'tiny' }, 'Una fase no se cierra con puestos vacíos, documentos sin aceptar, tareas vencidas, hitos vencidos ni declaraciones de independencia pendientes.'));

  const blockers = fold(`Qué bloquea cerrar la fase ${cur} · ${PHASES[cur]}`, gate.ok
    ? banner('ok', 'Nada bloquea el cierre de esta fase.')
    : h('div', { class: 'banners' }, gate.blockers.map((b) => banner('warn', b.message))), { open: !gate.ok, badge: gate.ok ? chip('mint', 'Lista') : chip('rose', String(gate.blockers.length)) });

  return h('div', { class: 'view' },
    pageHead({
      eyebrow: `${eng.client.code} · ${eng.client.name}`, title: 'Perfil del encargo', sub: `${eng.title}. Todo lo del contrato, los plazos y la fase en que va el trabajo.`,
      actions: [btn('Copiar resumen', { iconName: 'copy', onClick: () => copyText(summary(), 'Resumen copiado') }), btn('Documentos del cliente', { iconName: 'upload', cls: 'primary', href: '#/pbc' })],
    }),
    issues.length ? h('div', { class: 'banners' }, issues) : null,
    contractCard,
    card({ title: 'Línea de tiempo' }, timeline(a, c, today), h('p', { class: 'tiny' }, 'La barra dorada es el avance hasta hoy. Cada punto es un hito; el último es la fecha límite para armar el archivo final.')),
    h('div', { class: 'grid cols-2' }, msCard, phaseCard),
    blockers);
}

const kv = (k, v) => h('div', {}, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
export function barOf(frac, tone = '') {
  const i = h('i', {}); i.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
  return h('div', { class: `bar ${tone}`.trim(), role: 'progressbar', 'aria-valuenow': String(Math.round(frac * 100)), 'aria-valuemin': '0', 'aria-valuemax': '100' }, i);
}
export { icon, parseDate };

// Documentos del cliente (PBC): estado, verificación formal y custodia.
import { h } from './dom.js';
import { icon } from './icons.js';
import { transitionDoc, setCheck, missingChecks, pbcSummary, PBC_CHECKS, diffDays } from '../core/engagement.js';
import { pageHead, card, banner, chip, fmtDateEs, btn } from './kit.js';
import { toast } from './copy.js';

const STATE = {
  pendiente: ['plain', 'Pendiente', 'clock'], recibido: ['sky', 'Recibido', 'download'], en_verificacion: ['lav', 'En verificación', 'clipboard'],
  aceptado: ['mint', 'Aceptado', 'check'], observado: ['sun', 'Observado', 'alert'], rechazado: ['rose', 'Rechazado', 'x'],
};
const CYCLE = [null, 'ok', 'fail', 'na'];

export function pbcView(ctx) {
  const eng = ctx.eng; const today = ctx.today;
  const nameOf = (id) => eng.staff.find((p) => p.id === id)?.name ?? '—';
  const sum = pbcSummary(eng.docs, today);
  const sel = eng.docs.find((d) => d.id === ctx.selDoc) ?? null;

  const update = (id, fn) => { eng.docs = eng.docs.map((d) => (d.id === id ? fn(d) : d)); ctx.rerender(); };
  const apply = (doc, to, extra = {}) => {
    const r = transitionDoc(doc, to, extra);
    if (!r.ok) { toast(r.error); return; }
    update(doc.id, () => r.doc);
  };

  const kpi = (tone, ic, n, label) => h('div', { class: 'card stat hover' }, h('div', { class: 'top' }, h('div', { class: `dot chip ${tone}` }, icon(ic, 20))), h('div', { class: 'num' }, String(n)), h('div', { class: 'lbl' }, label));

  const rows = eng.docs.map((d) => {
    const [tone, label, ic] = STATE[d.status];
    const late = d.status === 'pendiente' && d.dueOn && diffDays(d.dueOn, today) < 0;
    const tr = h('tr', { class: ctx.selDoc === d.id ? 'is-sel' : '', tabindex: '0', role: 'button', 'aria-label': `Abrir ${d.title}` },
      h('td', {}, h('b', {}, d.title), h('div', { class: 'tiny' }, d.supports?.length ? `Respalda: ${d.supports.join(', ')}` : 'Sin cédula asignada')),
      h('td', {}, h('div', {}, fmtDateEs(d.requestedOn)), h('div', { class: 'tiny' }, d.dueOn ? `Vence ${fmtDateEs(d.dueOn)}` : '')),
      h('td', {}, chip(tone, label, ic), late ? h('div', { class: 'tiny' }, 'Vencido') : null),
      h('td', { class: 'hide-sm' }, d.receivedBy ? [h('div', {}, nameOf(d.receivedBy)), h('div', { class: 'tiny' }, fmtDateEs(d.receivedOn))] : '—'),
      h('td', { class: 'hide-sm' }, d.status === 'aceptado' ? [h('div', {}, nameOf(d.verifiedBy)), h('div', { class: 'tiny' }, fmtDateEs(d.verifiedOn))] : (d.status === 'en_verificacion' ? `${5 - missingChecks(d).length}/5 verificaciones` : '—')));
    const open = () => { ctx.selDoc = d.id; ctx.rerender(); };
    tr.addEventListener('click', open);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return tr;
  });

  const table = card({ title: 'Solicitudes y recepción', flush: true },
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl rows-click' },
      h('thead', {}, h('tr', {}, ['Documento', 'Solicitado', 'Estado', 'Recibido por', 'Verificación'].map((t, i) => h('th', { class: i > 2 ? 'hide-sm' : '' }, t)))),
      h('tbody', {}, rows))));

  return h('div', { class: 'view' },
    pageHead({ eyebrow: `${eng.client.code} · ${eng.client.name}`, title: 'Documentos del cliente', sub: 'Cada documento pasa por recepción y verificación formal. Un papel no se cierra con documentos sin aceptar.', actions: [btn('Perfil del encargo', { iconName: 'clipboard', href: '#/perfil' })] }),
    h('div', { class: 'grid cols-4' },
      kpi('mint', 'check', `${sum.accepted}/${sum.total}`, 'Documentos aceptados'),
      kpi('lav', 'clipboard', sum.by.en_verificacion, 'En verificación'),
      kpi('sun', 'alert', sum.by.observado + sum.by.rechazado, 'Observados o rechazados'),
      kpi(sum.overdue ? 'rose' : 'mint', 'clock', sum.overdue, 'Pendientes vencidos')),
    table,
    sel ? panel(ctx, sel, { nameOf, apply, update }) : card({}, h('p', { class: 'muted' }, 'Elige un documento para registrar su recepción o verificarlo.')));
}

function panel(ctx, d, { nameOf, apply, update }) {
  const eng = ctx.eng; const today = ctx.today;
  const [tone, label, ic] = STATE[d.status];
  const people = h('select', { id: 'who', 'aria-label': 'Persona' }, eng.staff.filter((p) => ['auxiliar', 'campo', 'encargado', 'supervisor', 'coordinador'].includes(p.role)).map((p) => h('option', { value: p.id }, p.name)));
  const reason = h('input', { id: 'reason', type: 'text', placeholder: 'Motivo (obligatorio al observar o rechazar)', autocomplete: 'off' });
  const actions = [];
  if (d.status === 'pendiente') actions.push(h('div', { class: 'field' }, h('label', { for: 'who' }, 'Recibido por'), people), btn('Registrar recepción', { cls: 'primary', iconName: 'check', onClick: () => apply(d, 'recibido', { by: people.value, on: today }) }));
  if (d.status === 'recibido') actions.push(h('div', { class: 'field' }, h('label', { for: 'who' }, 'Verifica'), people), btn('Iniciar verificación', { cls: 'primary', iconName: 'clipboard', onClick: () => apply(d, 'en_verificacion', { by: people.value }) }));
  if (d.status === 'en_verificacion') {
    actions.push(btn('Aceptar documento', { cls: 'primary', iconName: 'check', onClick: () => apply(d, 'aceptado', { on: today }) }),
      h('div', { class: 'field grow' }, h('label', { for: 'reason' }, 'Motivo'), reason),
      btn('Observar', { iconName: 'alert', onClick: () => apply(d, 'observado', { reason: reason.value.trim() }) }),
      btn('Rechazar', { iconName: 'x', onClick: () => apply(d, 'rechazado', { reason: reason.value.trim() }) }));
  }
  if (d.status === 'observado') actions.push(h('div', { class: 'field' }, h('label', { for: 'who' }, 'Vuelve a recibirse por'), people), btn('Registrar nueva entrega', { cls: 'primary', onClick: () => apply(d, 'recibido', { by: people.value, on: today }) }));
  if (d.status === 'rechazado') actions.push(btn('Reabrir solicitud', { cls: 'primary', onClick: () => apply(d, 'pendiente') }));

  const checks = h('div', { class: 'checks' }, PBC_CHECKS.map(([k, text]) => {
    const v = d.checks?.[k] ?? null;
    const editable = d.status === 'en_verificacion';
    const box = h('span', { class: 'box' }, v === 'ok' ? icon('check', 14) : v === 'fail' ? icon('x', 14) : v === 'na' ? 'N/A' : '');
    const b = h('button', { type: 'button', class: `check ${v ?? ''}`.trim(), disabled: !editable, 'aria-label': `${text}: ${v ?? 'sin verificar'}`,
      onClick: () => update(d.id, (x) => setCheck(x, k, CYCLE[(CYCLE.indexOf(v) + 1) % CYCLE.length])) }, box, text);
    return b;
  }));

  return card({ title: d.title, actions: chip(tone, label, ic) },
    h('div', { class: 'stack' },
      d.reason ? banner('warn', `Motivo: ${d.reason}`) : null,
      h('div', { class: 'kv' },
        h('div', {}, h('div', { class: 'k' }, 'Recibido'), h('div', { class: 'v' }, d.receivedBy ? `${nameOf(d.receivedBy)} · ${fmtDateEs(d.receivedOn)}` : 'Aún no')),
        h('div', {}, h('div', { class: 'k' }, 'Verifica'), h('div', { class: 'v' }, d.verifiedBy ? nameOf(d.verifiedBy) : '—')),
        h('div', {}, h('div', { class: 'k' }, 'Respalda cédulas'), h('div', { class: 'v' }, d.supports?.join(', ') || '—'))),
      h('div', {}, h('div', { class: 'section-title' }, 'Verificación formal'), checks,
        d.status === 'en_verificacion' ? h('p', { class: 'tiny' }, 'Toca cada punto para alternar: pendiente → cumple → no cumple → no aplica. Quien recibe no puede ser quien verifica (cuatro ojos).') : null),
      actions.length ? h('div', { class: 'row' }, actions) : null));
}

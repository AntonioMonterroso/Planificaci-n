// Equipo y ocupaciones: quién cubre cada función obligatoria, suplentes, vacantes, incompatibilidades y horas.
import { h } from './dom.js';
import { icon } from './icons.js';
import { resolveOccupations, occupationConflicts, occupationSummary, hoursSummary, ROLES, PHASES, addDays } from '../core/engagement.js';
import { pageHead, card, banner, chip, fmtDateEs, btn } from './kit.js';
import { barOf } from './perfil.js';
import { toast } from './copy.js';

const STATUS = { cubierta: ['mint', 'Cubierta', 'check'], suplente: ['sun', 'Suplente', 'user'], vacante: ['rose', 'Vacante', 'alert'], no_aplica: ['plain', 'No aplica', 'info'] };
const HOURS_TONE = { normal: '', al_limite: '', excedido: 'bad', sin_estimado: '' };

export function equipoView(ctx) {
  const eng = ctx.eng; const today = ctx.today;
  const resolved = resolveOccupations(eng.staff, today, { highRisk: eng.highRisk, overrides: eng.overrides });
  const conflicts = occupationConflicts(resolved);
  const sum = occupationSummary(resolved);
  const hours = hoursSummary(eng.hours);
  const away = (p) => !!p.absent && p.absent.from <= today && p.absent.to >= today;

  const kpi = (tone, ic, n, label) => h('div', { class: 'card stat hover' }, h('div', { class: 'top' }, h('div', { class: `dot chip ${tone}` }, icon(ic, 20))), h('div', { class: 'num' }, String(n)), h('div', { class: 'lbl' }, label));

  // ---- equipo ----
  const roleSel = h('select', { id: 'new-role', 'aria-label': 'Rol a agregar' }, Object.entries(ROLES).map(([k, r]) => h('option', { value: k }, r.label)));
  const addPerson = () => {
    const role = roleSel.value; const n = eng.staff.filter((p) => p.role === role).length + 1;
    eng.staff.push({ id: `u-${role}-${Date.now() % 100000}`, name: `${ROLES[role].label} (demo ${n})`, role });
    toast(`Se agregó ${ROLES[role].label}`); ctx.rerender();
  };
  const staffRows = eng.staff.map((p) => {
    const hrs = hours.find((x) => x.id === p.id);
    return h('tr', {},
      h('td', {}, h('b', {}, p.name), h('div', { class: 'tiny' }, ROLES[p.role].label)),
      h('td', { class: 'hide-sm' }, chip(ROLES[p.role].group === 'gerencia' ? 'gold' : ROLES[p.role].group === 'equipo' ? 'sky' : 'lav', ROLES[p.role].group === 'gerencia' ? 'Gerencia' : ROLES[p.role].group === 'equipo' ? 'Equipo' : 'Apoyo')),
      h('td', {}, hrs ? [h('div', { class: 'tiny' }, `${hrs.real} de ${hrs.est} h`), barOf(Math.min(hrs.pct, 1), HOURS_TONE[hrs.status])] : h('span', { class: 'tiny' }, '—')),
      h('td', {}, away(p) ? chip('sun', `Ausente hasta ${fmtDateEs(p.absent.to)}`, 'clock') : chip('mint', 'Disponible')),
      h('td', { class: 'r' }, h('div', { class: 'row', style: undefined },
        away(p) ? btn('Regresó', { cls: 'sm', onClick: () => { delete p.absent; ctx.rerender(); } }) : btn('Ausente 14 d', { cls: 'sm', onClick: () => { p.absent = { from: today, to: addDays(today, 14) }; ctx.rerender(); } }),
        btn('', { cls: 'sm ghost icon-btn', iconName: 'x', title: `Quitar a ${p.name}`, onClick: () => { eng.staff = eng.staff.filter((x) => x.id !== p.id); ctx.rerender(); } }))));
  });
  const team = card({ title: 'Equipo del encargo', flush: true, actions: h('div', { class: 'row' }, roleSel, btn('Agregar', { iconName: 'plus', cls: 'sm', onClick: addPerson })) },
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, ['Persona', 'Grupo', 'Horas', 'Estado', ''].map((t, i) => h('th', { class: i === 1 ? 'hide-sm' : '' }, t)))), h('tbody', {}, staffRows))));

  // ---- matriz ----
  const byPhase = PHASES.map((name, i) => ({ name, i, items: resolved.filter((r) => r.phase === i) }));
  const matrix = h('div', { class: 'grid cols-2' }, byPhase.map((g) => card({ title: `Fase ${g.i} · ${g.name}` },
    h('div', {}, g.items.map((r) => {
      const [tone, label, ic] = STATUS[r.status];
      const who = r.status === 'vacante' ? `Sin persona. Cadena: ${r.chain.map((c) => ROLES[c].label).join(' → ')}`
        : r.status === 'no_aplica' ? 'Solo si el encargo es de riesgo alto'
          : `${r.by.name}${r.status === 'suplente' ? ` · cubre por ${ROLES[r.titularRole].label}` : ''}`;
      return h('div', { class: 'occ' }, h('div', {}, h('b', {}, r.label), h('div', { class: 'who' }, who)), chip(tone, label, ic));
    })))));

  return h('div', { class: 'view' },
    pageHead({
      eyebrow: `${eng.client.code} · ${eng.client.name}`, title: 'Equipo y ocupaciones',
      sub: 'Cada función obligatoria tiene un titular y suplentes en cadena. Si falta alguien, la función pasa al siguiente rol disponible y se avisa; nada queda sin responsable en silencio.',
      actions: [btn(eng.highRisk ? 'Riesgo alto: sí' : 'Riesgo alto: no', { cls: eng.highRisk ? 'on' : '', iconName: 'flag', title: 'El riesgo alto exige revisor de calidad del encargo', onClick: () => { eng.highRisk = !eng.highRisk; ctx.rerender(); } })],
    }),
    sum.vacante ? banner('error', `${sum.vacante} función${sum.vacante > 1 ? 'es' : ''} sin responsable. No se puede cerrar la fase correspondiente.`) : null,
    ...conflicts.map((c) => banner('error', c.message)),
    h('div', { class: 'grid cols-3' },
      kpi('mint', 'check', sum.cubierta, 'Cubiertas por su titular'),
      kpi('sun', 'user', sum.suplente, 'Cubiertas por suplente'),
      kpi(sum.vacante ? 'rose' : 'mint', 'alert', sum.vacante, 'Vacantes')),
    team,
    h('div', {}, h('div', { class: 'section-title' }, 'Matriz de ocupaciones'), matrix));
}

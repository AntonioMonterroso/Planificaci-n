// Tablero: bienvenida con el logo, indicadores del encargo, siguientes pasos y mapa de paneles.
import { h } from './dom.js';
import { icon } from './icons.js';
import { formatMoney } from '../core/money.js';
import { analyzeContract, phaseGate, resolveOccupations, occupationSummary, pbcSummary, PHASES } from '../core/engagement.js';
import { NAV, FLAT } from './nav.js';
import { pageHead, card, chip, btn, sectionTitle } from './kit.js';
import { gateState, currentPhase } from './perfil.js';

function countUp(el, to, fmt) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !Number.isFinite(to)) { el.textContent = fmt(to); return; }
  const t0 = performance.now(); const dur = 800;
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / dur); const e = 1 - (1 - p) ** 3;
    el.textContent = fmt(to * e);
    if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(to);
  };
  requestAnimationFrame(tick);
}

function stat(tone, ic, label, value, fmt, hint = null) {
  const num = h('div', { class: 'num' }, fmt(0));
  queueMicrotask(() => countUp(num, value, fmt));
  return h('div', { class: 'card stat hover' },
    h('div', { class: 'top' }, h('div', { class: `dot chip ${tone}`, 'aria-hidden': 'true' }, icon(ic, 20)), hint ? h('span', { class: 'tiny' }, hint) : null),
    num, h('div', { class: 'lbl' }, label));
}

export function tableroView(ctx) {
  const L = ctx.ledger; const eng = ctx.eng; const today = ctx.today;
  const bg = L.get('BG');
  const errs = L.issues.filter((i) => i.severity === 'error').length;
  const a = analyzeContract(eng.contract, today);
  const pbc = pbcSummary(eng.docs, today);
  const occ = occupationSummary(resolveOccupations(eng.staff, today, { highRisk: eng.highRisk, overrides: eng.overrides }));
  const cur = currentPhase(eng, today);
  const gate = phaseGate(cur, gateState(eng, today));
  const int = (n) => String(Math.round(n));

  const steps = gate.ok
    ? [h('div', { class: 'step done' }, h('span', { class: 'n' }, icon('check', 16)), h('span', {}, `La fase ${cur} está lista para cerrarse.`))]
    : gate.blockers.slice(0, 5).map((b, i) => h('div', { class: 'step' }, h('span', { class: 'n' }, String(i + 1)), h('span', {}, b.message)));

  const groups = NAV.filter((g) => g.group !== 'General').map((g) => h('div', { class: 'map-group' },
    sectionTitle(g.group),
    h('div', { class: 'map' }, g.items.map((i) => h('a', { href: `#/${i.id}`, class: i.ready ? '' : 'off' },
      h('span', { class: 'mi' }, icon(i.icon, 18)),
      h('span', {}, h('span', { class: 't', style: undefined }, i.label), h('div', { class: 's' }, i.ready ? 'Disponible' : 'Próximamente')))))));

  return h('div', { class: 'view' },
    h('section', { class: 'card hero' },
      h('div', {},
        h('div', { class: 'eyebrow' }, 'Firma de auditoría'),
        h('h2', {}, 'Todo el encargo, ordenado en un solo lugar'),
        h('p', {}, 'Perfil y plazos del encargo, documentos del cliente, cédulas que cuadran solas, equipo sin puestos vacíos y cumplimiento legal.'),
        h('div', { class: 'row', style: undefined }, btn('Perfil del encargo', { cls: 'primary', iconName: 'clipboard', href: '#/perfil' }), btn('Abrir cédulas', { iconName: 'grid', href: '#/cedulas/BG' }), chip('sun', 'Datos de demostración'))),
      h('div', { class: 'logo-plate' }, h('img', { src: 'assets/logo.webp', alt: 'Monterroso · Firma de Auditoría, Auditores y Consultores', width: '900', height: '358' }))),
    h('div', { class: 'grid cols-4' },
      stat(a.daysToReport < 0 ? 'rose' : a.daysToReport < 15 ? 'sun' : 'mint', 'calendar', 'Días para el informe', a.daysToReport ?? 0, int),
      stat('lav', 'upload', 'Documentos aceptados', pbc.accepted, (n) => `${Math.round(n)} de ${pbc.total}`),
      stat(occ.vacante ? 'rose' : 'mint', 'idcard', 'Funciones sin responsable', occ.vacante, int),
      stat(errs ? 'rose' : 'mint', 'grid', 'Errores de cuadre', errs, int, bg.sections?.activo ? `Activo ${formatMoney(bg.sections.activo.audit, { zero: 'Q0.00' })}` : null)),
    h('div', { class: 'grid cols-2' },
      card({ title: `Siguiente paso · fase ${cur}`, actions: chip(gate.ok ? 'mint' : 'sun', PHASES[cur]) }, h('div', { class: 'steps' }, steps)),
      card({ title: 'Cumplimiento y plazos' },
        h('div', { class: 'stack' },
          h('div', { class: 'row' }, chip('gold', 'Informe', 'file'), h('span', { class: 'grow' }), h('b', {}, `${a.daysToReport} d`)),
          h('div', { class: 'row' }, chip('gold', 'Armado del archivo', 'clock'), h('span', { class: 'grow' }), h('b', {}, `${a.daysToArchive} d`)),
          h('div', { class: 'row' }, chip('gold', 'Vigencia del contrato', 'calendar'), h('span', { class: 'grow' }), h('b', {}, `${a.daysToExpiry} d`)),
          h('p', { class: 'tiny' }, 'Plazos del contrato, del informe y del armado del archivo final (NIA 230).')))),
    card({ title: 'Mapa de paneles', cls: 'mapcard' }, h('div', {}, groups),
      h('p', { class: 'tiny' }, `${FLAT.filter((i) => i.ready).length} de ${FLAT.length} paneles disponibles; el resto muestra su alcance.`)));
}

export function soonView(item) {
  return h('div', { class: 'view' },
    h('div', { class: 'card empty' },
      h('div', { class: 'big', 'aria-hidden': 'true' }, icon(item.icon, 30)),
      h('h2', { class: 'page-title' }, item.label),
      h('p', { class: 'muted', style: undefined }, item.desc),
      chip('gold', 'Próximamente'),
      btn('Volver al tablero', { iconName: 'home', href: '#/tablero' })));
}

// Tablero general y hoja de ruta de paneles pendientes.
import { h } from './dom.js';
import { formatMoney } from '../core/money.js';
import { NAV, FLAT } from './nav.js';

function countUp(el, to, fmt) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !Number.isFinite(to)) { el.textContent = fmt(to); return; }
  const t0 = performance.now(); const dur = 900;
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - (1 - p) ** 3;
    el.textContent = fmt(to * e);
    if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(to);
  };
  requestAnimationFrame(tick);
}

function stat(color, icon, label, value, fmt) {
  const num = h('div', { class: 'num' }, fmt(0));
  const card = h('div', { class: 'card hover stat' },
    h('div', { class: `dot chip ${color}`, 'aria-hidden': 'true' }, icon), num, h('div', { class: 'lbl' }, label));
  queueMicrotask(() => countUp(num, value, fmt));
  return card;
}

export function tableroView(ctx) {
  const L = ctx.ledger;
  const bg = L.get('BG');
  const errs = L.issues.filter((i) => i.severity === 'error').length;
  const warns = L.issues.filter((i) => i.severity === 'warn').length;
  const int = (n) => String(Math.round(n));
  const q = (n) => formatMoney(n, { zero: 'Q0.00' });
  const ready = FLAT.filter((i) => i.ready).length;

  return h('div', { class: 'view' },
    h('div', { class: 'card' },
      h('h2', {}, 'Bienvenido a AuditOS'),
      h('p', { class: 'muted' }, 'Plataforma de auditoría externa: perfil del encargo, cédulas con cuadre automático, analíticos, hallazgos, cumplimiento legal y colaboración con Claude, todo en un solo lugar.'),
      h('div', { class: 'row' },
        h('a', { class: 'btn primary', href: '#/cedulas/BG' }, '▦ Abrir cédulas de demostración'),
        h('span', { class: 'chip sun' }, 'Datos sintéticos: aún sin conexión a la base de datos'))),
    h('div', { class: 'grid cols-4' },
      stat('lav', '▦', 'Cédulas en el encargo', L.papers.size, int),
      stat('mint', '◔', 'Activo según auditoría', bg.sections?.activo?.audit ?? 0, q),
      stat(errs ? 'rose' : 'mint', errs ? '✕' : '✓', 'Errores de cuadre', errs, int),
      stat(warns ? 'sun' : 'mint', '!', 'Alertas por revisar', warns, int)),
    h('div', { class: 'card' },
      h('h2', {}, 'Mapa de paneles'),
      h('p', { class: 'tiny' }, `${ready} de ${FLAT.length} paneles disponibles en esta versión. Los demás muestran su alcance.`),
      h('div', { class: 'roadmap' }, NAV.flatMap((g) => g.items).map((i) => h('a', {
        class: 'card hover', href: `#/${i.id}`, style: undefined,
      }, h('div', { class: 'row' }, h('span', { class: `chip ${i.ready ? 'mint' : 'lav'}`, 'aria-hidden': 'true' }, i.icon), h('b', {}, i.label)),
      h('div', { class: 'tiny' }, i.ready ? 'Disponible' : 'Próximamente'))))));
}

export function soonView(item) {
  return h('div', { class: 'view' },
    h('div', { class: 'card empty' },
      h('div', { class: 'big', 'aria-hidden': 'true' }, item.icon),
      h('h2', {}, item.label),
      h('p', { class: 'muted' }, item.desc),
      h('span', { class: 'chip lav' }, 'Próximamente'),
      h('p', {}, h('a', { class: 'btn', href: '#/cedulas/BG' }, '← Volver a las cédulas'))));
}

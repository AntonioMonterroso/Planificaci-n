// Piezas de interfaz compartidas: cabecera de página, chips, avisos y formato de fechas.
import { h } from './dom.js';
import { icon } from './icons.js';
import { parseDate } from '../core/engagement.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-03-31" → "31 mar 2026" */
export function fmtDateEs(iso) {
  const d = parseDate(iso);
  return d ? `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}` : '—';
}

export const chip = (tone, text, iconName = null) => h('span', { class: `chip ${tone}` }, iconName ? icon(iconName, 14) : null, text);

export const banner = (tone, text, iconName = null) => h('div', { class: `banner ${tone}`, role: tone === 'error' ? 'alert' : null },
  icon(iconName ?? (tone === 'ok' ? 'check' : tone === 'info' ? 'info' : 'alert'), 18), h('span', {}, text));

export function pageHead({ eyebrow, title, sub, actions = [] }) {
  return h('header', { class: 'page-head' },
    h('div', { class: 'titles' },
      eyebrow ? h('div', { class: 'eyebrow' }, eyebrow) : null,
      h('h1', { class: 'page-title' }, title),
      sub ? h('p', { class: 'page-sub' }, sub) : null),
    actions.length ? h('div', { class: 'actions' }, actions) : null);
}

export const sectionTitle = (text) => h('div', { class: 'section-title' }, text);

/** Tarjeta con cabecera: card({title, actions, flush}, ...hijos) */
export function card({ title = null, actions = null, flush = false, cls = '' } = {}, ...kids) {
  return h('section', { class: `card${flush ? ' flush' : ''} ${cls}`.trim() },
    title ? h('div', { class: 'card-head' }, h('h2', {}, title), actions) : null,
    flush && title ? kids : (title ? h('div', { class: 'card-body' }, kids) : kids));
}

/** Sección plegable (details). */
export function fold(title, body, { open = false, badge = null } = {}) {
  return h('details', { class: 'fold', ...(open ? { open: '' } : {}) },
    h('summary', {}, title, badge, h('span', { class: 'chev' }, icon('down', 18))),
    h('div', { class: 'fold-body' }, body));
}

export function btn(label, { iconName = null, cls = '', onClick = null, href = null, title = null, disabled = false } = {}) {
  const props = { class: `btn ${cls}`.trim(), title, 'aria-label': title };
  const kids = [iconName ? icon(iconName, 16) : null, label];
  if (href) return h('a', { ...props, href }, kids);
  return h('button', { ...props, type: 'button', onClick, disabled }, kids);
}

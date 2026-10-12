// Arranque de la aplicación: tema, navegación, enrutador por hash y barra de selección.
import { h, mount } from './ui/dom.js';
import { NAV, FLAT } from './ui/nav.js';
import { Ledger } from './core/ledger.js';
import { demoData } from './demo/data.js';
import { cedulasView } from './ui/cedulas.js';
import { tableroView, soonView } from './ui/tablero.js';
import { copyText } from './ui/copy.js';
import { formatMoney, plainNumber, round2 } from './core/money.js';

const root = document.documentElement;
const view = document.getElementById('main');
const side = document.getElementById('sidebar');
const scrim = document.getElementById('scrim');
const status = document.getElementById('statusbar');
const title = document.getElementById('page-title');

// ---------- tema (claro / oscuro / auto) ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};
function applyTheme(t) {
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const btn = document.getElementById('theme-btn');
  btn.textContent = dark ? '☀' : '☾';
  btn.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  btn.title = btn.getAttribute('aria-label');
}
let theme = store.get('auditos-theme') ?? 'auto';
applyTheme(theme);
document.getElementById('theme-btn').addEventListener('click', () => {
  const dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  theme = dark ? 'light' : 'dark';
  store.set('auditos-theme', theme);
  applyTheme(theme);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (theme === 'auto') applyTheme('auto'); });

// ---------- contexto ----------
const ctx = {
  ledger: new Ledger(demoData()),
  selMode: false,
  selection: new Map(),
  flash: null,
  rerender(flash = null) { ctx.flash = flash; render(); ctx.flash = null; },
  updateSelection,
};

// ---------- barra de selección (suma de celdas) ----------
function updateSelection() {
  const vals = [...ctx.selection.values()].filter((v) => typeof v === 'number');
  if (!vals.length) { status.hidden = true; return; }
  const sum = round2(vals.reduce((a, b) => a + b, 0));
  const avg = round2(sum / vals.length);
  status.hidden = false;
  mount(status,
    h('span', {}, 'Celdas: ', h('b', {}, String(vals.length))),
    h('span', {}, 'Suma: ', h('b', {}, formatMoney(sum, { zero: 'Q0.00' }))),
    h('span', {}, 'Promedio: ', h('b', {}, formatMoney(avg, { zero: 'Q0.00' }))),
    h('button', { type: 'button', class: 'btn sm', onClick: () => copyText(plainNumber(sum), 'Suma copiada') }, '⧉ Copiar suma'),
    h('button', { type: 'button', class: 'btn sm', onClick: () => copyText(vals.map((v) => plainNumber(v)).join('+').replace(/\+-/g, '-'), 'Fórmula copiada') }, '⧉ Copiar como suma'),
    h('button', { type: 'button', class: 'btn sm ghost', onClick: () => { ctx.selection.clear(); updateSelection(); render(); } }, 'Limpiar'));
}

// ---------- navegación lateral ----------
function buildNav(current) {
  const nav = h('nav', { class: 'nav', 'aria-label': 'Paneles' });
  for (const g of NAV) {
    nav.append(h('div', { class: 'nav-group' }, g.group));
    for (const i of g.items) {
      nav.append(h('a', { href: `#/${i.id}`, ...(i.id === current ? { 'aria-current': 'page' } : {}) },
        h('span', { class: 'ico', 'aria-hidden': 'true' }, i.icon), i.label, i.ready ? null : h('span', { class: 'soon' }, 'pronto')));
    }
  }
  return nav;
}
function renderSide(current) {
  mount(side,
    h('div', { class: 'brand' },
      h('a', { class: 'brand-plate', href: '#/tablero', 'aria-label': 'Monterroso, Firma de Auditoría: ir al tablero' },
        h('img', { src: 'assets/logo.webp', alt: 'Monterroso · Firma de Auditoría, Auditores y Consultores', width: '900', height: '358' })),
      h('div', { class: 'brand-sub' }, 'AuditOS')),
    buildNav(current),
    h('div', { class: 'tiny' }, 'v0.1 · demostración'));
}
function closeMenu() { side.classList.remove('open'); scrim.classList.remove('show'); document.getElementById('menu-btn').setAttribute('aria-expanded', 'false'); }
document.getElementById('menu-btn').addEventListener('click', () => {
  const open = side.classList.toggle('open');
  scrim.classList.toggle('show', open);
  document.getElementById('menu-btn').setAttribute('aria-expanded', String(open));
});
scrim.addEventListener('click', closeMenu);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// ---------- enrutador ----------
function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { id: parts[0] ?? 'tablero', arg: parts[1] };
}
function render() {
  const { id, arg } = parseHash();
  const item = FLAT.find((i) => i.id === id) ?? FLAT[0];
  renderSide(item.id);
  title.textContent = item.label;
  document.title = `${item.label} · AuditOS`;
  let el;
  if (item.id === 'tablero') el = tableroView(ctx);
  else if (item.id === 'cedulas') el = cedulasView(ctx, arg ?? 'BG');
  else el = soonView(item);
  const y = scrollY;
  mount(view, el);
  if (ctx.flash) scrollTo(0, y);
  updateSelection();
}
addEventListener('hashchange', () => { closeMenu(); ctx.selection.clear(); render(); scrollTo(0, 0); view.focus({ preventScroll: true }); });
render();

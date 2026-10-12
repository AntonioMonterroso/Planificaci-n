// Arranque de la aplicación: tema, navegación, enrutador por hash y barra de selección.
import { h, mount } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { NAV, FLAT } from './ui/nav.js';
import { Ledger } from './core/ledger.js';
import { demoData } from './demo/data.js';
import { demoEngagement } from './demo/engagement.js';
import { todayISO } from './core/engagement.js';
import { cedulasView } from './ui/cedulas.js';
import { tableroView, soonView } from './ui/tablero.js';
import { perfilView } from './ui/perfil.js';
import { pbcView } from './ui/pbc.js';
import { equipoView } from './ui/equipo.js';
import { bandejaView } from './ui/bandeja.js';
import { demoInbox } from './demo/bandeja.js';
import { Supabase } from './core/supabase.js';
import { remoteBandeja, localBandeja } from './core/bandeja-remote.js';
import { loginView } from './ui/login.js';
import { analiticosView } from './ui/analiticos.js';
import { calendarioView } from './ui/calendario.js';
import { bibliotecaView } from './ui/biblioteca.js';
import { legalView } from './ui/legal.js';
import { informeView } from './ui/informe.js';
import { savePapers, loadPapers } from './core/papers-remote.js';
import { demoInputs } from './demo/havad.js';
import { withPackage, RUBROS } from './core/paquetes.js';
import { copyText, toast } from './ui/copy.js';
import { formatMoney, plainNumber, round2 } from './core/money.js';

const root = document.documentElement;
const view = document.getElementById('main');
const side = document.getElementById('sidebar');
const scrim = document.getElementById('scrim');
const status = document.getElementById('statusbar');
const title = document.getElementById('page-title');
const themeBtn = document.getElementById('theme-btn');

// ---------- tema (claro / oscuro / auto) ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};
const prefersDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = () => (root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : prefersDark());
function applyTheme(t) {
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
  mount(themeBtn, icon(isDark() ? 'sun' : 'moon', 18));
  const label = isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  themeBtn.setAttribute('aria-label', label); themeBtn.title = label;
}
let theme = store.get('auditos-theme') ?? 'auto';
applyTheme(theme);
themeBtn.addEventListener('click', () => { theme = isDark() ? 'light' : 'dark'; store.set('auditos-theme', theme); applyTheme(theme); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (theme === 'auto') applyTheme('auto'); });
mount(document.getElementById('menu-btn'), icon('menu', 20));

// ---------- contexto ----------
const today = todayISO();
const ctx = {
  today,
  ledger: new Ledger(demoData()),
  eng: demoEngagement(today),
  bandeja: localBandeja(demoInbox(), 'u-campo'),
  sb: null,
  savePapers: (pass) => savePapers(ctx.sb, ctx.bandeja.engagement, ctx.ledger, pass),
  async loadPapers(pass) { ctx.ledger = await loadPapers(ctx.sb, ctx.bandeja.engagement, pass); ctx.selection.clear(); },
  havad: demoInputs(),
  generatePackage(code) {
    try { ctx.ledger = withPackage(ctx.ledger, code); ctx.selection.clear(); toast(`Paquete de ${RUBROS[code].title} generado`); render(); }
    catch (e) { toast(e.message); }
  },
  loginError: null,
  async signIn(email, password) {
    await ctx.sb.signIn(email, password);
    try { ctx.bandeja = await remoteBandeja(ctx.sb); } catch (e) { ctx.sb.signOut(); throw e; }
    ctx.loginError = null; render();
  },
  signOut() { ctx.sb.signOut(); ctx.bandeja = null; render(); },
  selMode: false,
  selection: new Map(),
  selDoc: null,
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
    h('button', { type: 'button', class: 'btn sm', onClick: () => copyText(plainNumber(sum), 'Suma copiada') }, icon('copy', 15), 'Copiar suma'),
    h('button', { type: 'button', class: 'btn sm', onClick: () => copyText(vals.map((v) => plainNumber(v)).join('+').replace(/\+-/g, '-'), 'Fórmula copiada') }, icon('copy', 15), 'Copiar como suma'),
    h('button', { type: 'button', class: 'btn sm ghost', onClick: () => { ctx.selection.clear(); updateSelection(); render(); } }, 'Limpiar'));
}

// ---------- navegación lateral ----------
function buildNav(current) {
  const nav = h('nav', { class: 'nav', 'aria-label': 'Paneles' });
  for (const g of NAV) {
    nav.append(h('div', { class: 'nav-group' }, g.group));
    for (const i of g.items) {
      nav.append(h('a', { href: `#/${i.id}`, class: i.ready ? '' : 'off', ...(i.id === current ? { 'aria-current': 'page' } : {}) }, icon(i.icon, 19), i.label));
    }
  }
  return nav;
}
function renderSide(current) {
  mount(side,
    h('a', { class: 'brand', href: '#/tablero', 'aria-label': 'Monterroso, Firma de Auditoría: ir al tablero' },
      h('span', { class: 'brand-mono', 'aria-hidden': 'true' }),
      h('span', { class: 'brand-text' }, h('span', { class: 'brand-name' }, 'Monterroso'), h('span', { class: 'brand-tag' }, 'Auditores & Consultores'))),
    buildNav(current),
    h('div', { class: 'sb-foot' }, ctx.sb?.user ? [h('div', { class: 'tiny' }, ctx.sb.user.email), h('button', { type: 'button', class: 'btn sm ghost', onClick: () => ctx.signOut() }, 'Salir')] : 'AuditOS · v0.3 demostración'));
}
const menuBtn = document.getElementById('menu-btn');
function closeMenu() { side.classList.remove('open'); scrim.classList.remove('show'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => {
  const open = side.classList.toggle('open');
  scrim.classList.toggle('show', open);
  menuBtn.setAttribute('aria-expanded', String(open));
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
  if (ctx.sb && !ctx.sb.user) el = loginView(ctx, ctx.loginError);
  else if (item.id === 'tablero') el = tableroView(ctx);
  else if (item.id === 'cedulas') el = cedulasView(ctx, arg ?? 'BG');
  else if (item.id === 'perfil') el = perfilView(ctx);
  else if (item.id === 'pbc') el = pbcView(ctx);
  else if (item.id === 'equipo') el = equipoView(ctx);
  else if (item.id === 'claude') el = bandejaView(ctx);
  else if (item.id === 'analiticos') el = analiticosView(ctx);
  else if (item.id === 'calendario') el = calendarioView(ctx);
  else if (item.id === 'biblioteca') el = bibliotecaView(ctx, arg);
  else if (item.id === 'legal') el = legalView(ctx, arg);
  else if (item.id === 'informe') el = informeView(ctx, arg);
  else el = soonView(item);
  const y = scrollY;
  mount(view, el);
  if (ctx.flash || ctx.keepScroll) scrollTo(0, y);
  updateSelection();
}
addEventListener('hashchange', () => { closeMenu(); ctx.selection.clear(); render(); scrollTo(0, 0); view.focus({ preventScroll: true }); });
// Configuración opcional (js/config.local.js, fuera del repo). Sin ella la app corre en modo demostración.
async function boot() {
  try {
    const { SUPABASE } = await import('./config.local.js');
    ctx.sb = new Supabase(SUPABASE, { storage: sessionStorage });
    if (ctx.sb.user) ctx.bandeja = await remoteBandeja(ctx.sb).catch((e) => { ctx.sb.signOut(); ctx.loginError = e.message; return null; });
  } catch { /* modo demostración */ }
  render();
}
boot();

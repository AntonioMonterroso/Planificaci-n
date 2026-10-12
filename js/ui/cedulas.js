// Panel de cédulas v2: cabecera compacta, tabla primero, alertas solo si existen,
// árbol en riel lateral, y marcas / ajustes en secciones plegables.
import { h } from './dom.js';
import { icon } from './icons.js';
import { formatMoney, plainNumber, round2, parseMoney } from '../core/money.js';
import { copyButton, copyText, tableToTSV, toast } from './copy.js';
import { pageHead, card, banner, chip, fold, btn } from './kit.js';
import { RUBROS, pendingRubros } from '../core/paquetes.js';

export const MARKS = [
  ['≤', 'Sumado horizontal (verificado por el motor)'],
  ['^', 'Sumado vertical (verificado por el motor)'],
  ['Ə', 'Operación verificada'],
  ['√', 'Cantidad verificada'],
  ['≈', 'Cheques pendientes de entrega a proveedores'],
  ['©', 'Cheques pendientes de depósito'],
  ['┐', 'Vales pendientes de comprobar'],
  ['±', 'Dato verificado con existencia física'],
  ['Ï', 'Pendiente de verificar'],
  ['¥', 'Documento verificado'],
];

const KIND = {
  centralizadora: ['Centralizadora', 'gold'], sumaria: ['Sumaria', 'sky'], analitica: ['Analítica', 'mint'],
  subanalitica: ['Subanalítica', 'peach'], detalle: ['Detalle', 'lav'],
};
const money = (n) => formatMoney(n, { symbol: 'Q' });

export function cedulasView(ctx, wanted) {
  const L = ctx.ledger;
  const ref = L.paper(wanted) ? wanted : (L.roots()[0]?.ref ?? 'BG');
  const paper = L.paper(ref);
  const res = L.get(ref);
  const issues = L.issuesFor(ref);
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warns = issues.length - errors;
  const [kindLabel, kindTone] = KIND[paper.kind] ?? ['Cédula', 'gold'];
  const path = L.path(ref);
  const go = (r) => { location.hash = `#/cedulas/${encodeURIComponent(r)}`; };

  const crumbs = h('nav', { class: 'crumbs', 'aria-label': 'Ruta de la cédula' },
    h('a', { href: '#/tablero' }, 'Índice'),
    path.map((r, i) => [
      h('span', { class: 'sep', 'aria-hidden': 'true' }, icon('chevron', 14)),
      i === path.length - 1 ? h('span', { class: 'cur', 'aria-current': 'page' }, r) : h('a', { href: `#/cedulas/${encodeURIComponent(r)}` }, r),
    ]));

  const status = errors ? chip('rose', `${errors} error${errors > 1 ? 'es' : ''}`, 'alert') : warns ? chip('sun', `${warns} alerta${warns > 1 ? 's' : ''}`, 'alert') : chip('mint', 'Cuadra', 'check');

  const head = h('div', { class: 'stack' }, crumbs,
    pageHead({
      eyebrow: `${L.header.entity ?? ''} · ${L.header.period ?? ''}`,
      title: `${paper.ref} · ${paper.title}`,
      sub: `Expresado en ${(L.header.currency ?? 'quetzales').toLowerCase()}.`,
      actions: [
        chip(kindTone, kindLabel), status,
        btn('Subir', { iconName: 'up', cls: 'sm', disabled: !paper.parent, onClick: () => paper.parent && go(paper.parent), title: 'Subir a la cédula superior' }),
        btn('Centralizadora', { iconName: 'home', cls: 'sm', disabled: ref === path[0], onClick: () => go(path[0]), title: 'Ir a la centralizadora' }),
        copyButton(() => tableToTSV(tsvRows(res)), { label: 'Tabla copiada', title: 'Copiar tabla (pega en Excel)', text: 'Copiar tabla', cls: 'btn sm' }),
        h('button', { type: 'button', class: `btn sm${ctx.selMode ? ' on' : ''}`, 'aria-pressed': String(ctx.selMode), title: 'Seleccionar celdas para sumarlas', onClick: () => { ctx.selMode = !ctx.selMode; ctx.rerender(); } }, icon('sigma', 16), ctx.selMode ? 'Seleccionando' : 'Sumar celdas'),
      ],
    }));

  // ---- tabla ----
  const thead = h('thead', {}, h('tr', {}, ['Cód.', 'Concepto', 'Ref.', 'Saldo contabilidad', 'Debe', 'Haber', 'Saldo auditoría', 'Diferencia', ''].map((t) => h('th', { scope: 'col' }, t))));
  const tbody = h('tbody', {}, res.lines.map((l) => lineRow(ctx, ref, l)));
  const tfoot = h('tfoot', {});
  if (res.sections) {
    const names = { activo: 'Total activo', pasivo: 'Total pasivo', patrimonio: 'Total patrimonio' };
    for (const [s, t] of Object.entries(res.sections)) tfoot.append(totalRow(names[s] ?? s, t));
    const pp = ['contab', 'audit'].map((c) => round2((res.sections.pasivo?.[c] ?? 0) + (res.sections.patrimonio?.[c] ?? 0)));
    tfoot.append(h('tr', {}, h('td', { colspan: 3 }, 'Total pasivo + patrimonio'), h('td', { class: 'num' }, money(pp[0])), h('td'), h('td'), h('td', { class: 'num' }, money(pp[1])), h('td'), h('td', {}, h('span', { class: 'mark', title: 'Sumado vertical (verificado por el motor)' }, '^'))));
  } else tfoot.append(totalRow('Totales', res.totals));

  const table = h('section', { class: `card flush${ctx.selMode ? ' sel-mode' : ''}` },
    h('div', { class: 'table-wrap' }, h('table', { class: 'ledger' }, thead, tbody, tfoot)),
    h('div', { class: 'card-body' },
      h('p', { class: 'tiny' }, 'Escribe cifras o fórmulas en el saldo de contabilidad: ', h('code', {}, '=15773+6955'), ' ', h('code', {}, '=(1200*3)-45.5'), ' ', h('code', {}, '=A1-2!fondo+100'), '. Con Ctrl/⌘ + clic sumas celdas.'),
      paper.signoffs ? attrRow(res.attributes) : null));

  const banners = issues.length ? h('div', { class: 'banners' }, issues.map((i) => banner(i.severity === 'error' ? 'error' : 'warn', i.message))) : null;

  // ---- subcédulas (acceso rápido) y árbol plegable ----
  const kids = L.children(ref);
  const quick = kids.length ? h('div', { class: 'row' }, h('span', { class: 'tiny' }, 'Detalle en:'),
    kids.map((k) => h('a', { class: 'link-btn', href: `#/cedulas/${encodeURIComponent(k.ref)}`, title: k.title }, k.ref, icon('chevron', 12)))) : null;
  const tree = h('div', { class: 'tree' }, treeList(ctx, L.roots(), ref));
  const pending = paper.kind === 'centralizadora' ? pendingRubros(L) : [];
  const generator = pending.length ? card({ title: 'Generar paquetes por rubro' },
    h('p', { class: 'tiny' }, 'Crea la sumaria, las analíticas y las subanalíticas del rubro, enlazadas a la centralizadora. El saldo que ya tiene la línea pasa a la primera cédula hoja con su documento de origen, y la centralizadora sigue cuadrando.'),
    h('div', { class: 'row' }, pending.map((c) => btn(`${c} · ${RUBROS[c].title}`, { iconName: 'plus', cls: 'sm', onClick: () => ctx.generatePackage(c) })))) : null;

  return h('div', { class: 'view' },
    head,
    quick,
    banners,
    table,
    generator,
    fold('Ajustes y reclasificaciones', adjustmentsBody(ctx, ref), { badge: adjCount(L, ref) }),
    fold('Marcas de auditoría', marksBody()),
    fold('Árbol de cédulas', tree));
}

function adjCount(L, ref) {
  const fam = family(L, ref);
  const n = L.adjustments.filter((a) => (a.entries ?? []).some((e) => fam.has(e.ref))).length;
  return n ? chip('gold', `${n} partida${n > 1 ? 's' : ''}`) : null;
}
function family(L, ref) {
  const set = new Set([ref]);
  for (let grew = true; grew;) { grew = false; for (const p of L.papers.values()) if (p.parent && set.has(p.parent) && !set.has(p.ref)) { set.add(p.ref); grew = true; } }
  return set;
}

function marksBody() {
  return h('div', { class: 'stack' }, h('p', { class: 'tiny' }, 'Un clic en copiar deja la marca lista para pegarla donde la necesites.'),
    h('div', { class: 'marks' }, MARKS.map(([sym, desc]) => h('div', { class: 'mark-item' }, h('div', { class: 'mark-sym', 'aria-hidden': 'true' }, sym), h('span', { class: 'd' }, desc),
      copyButton(sym, { label: `Marca ${desc.split(' (')[0]} copiada`, title: `Copiar ${sym}`, text: '', cls: 'btn sm ghost icon-btn' })))));
}

function tsvRows(res) {
  const rows = [['Código', 'Concepto', 'Saldo contabilidad', 'Debe', 'Haber', 'Saldo auditoría', 'Diferencia']];
  for (const l of res.lines) rows.push([l.code ?? '', l.label, plainNumber(l.contab), plainNumber(l.debe), plainNumber(l.haber), plainNumber(l.audit), plainNumber(l.diff)]);
  const t = res.totals;
  rows.push(['', 'Totales', plainNumber(t.contab), plainNumber(t.debe), plainNumber(t.haber), plainNumber(t.audit), plainNumber(t.diff)]);
  return rows;
}

function totalRow(label, t) {
  return h('tr', {}, h('td', { colspan: 3 }, label),
    ['contab', 'debe', 'haber', 'audit', 'diff'].map((c) => h('td', { class: 'num' }, money(t[c]))),
    h('td', {}, h('span', { class: 'mark', title: 'Sumado vertical (verificado por el motor)' }, '^')));
}

function lineRow(ctx, ref, line) {
  const id = `${ref}|${line.key}`;
  const tr = h('tr', { dataset: { key: line.key } });
  tr.append(
    h('td', { class: 'code' }, line.code ?? ''),
    h('td', {}, line.label, line.source ? h('span', { class: 'sub', title: `Origen: ${line.source}` }, `Origen: ${line.source}`) : (line.derived ? null : h('span', { class: 'sub' }, 'Sin documento de origen'))),
    h('td', {}, line.link ? h('a', { class: 'link-btn', href: `#/cedulas/${encodeURIComponent(line.link)}`, title: `Ir a la cédula ${line.link}` }, `${line.link}`, icon('chevron', 12)) : null),
  );

  const tdC = h('td', { class: 'num cell-pick', dataset: { sel: `${id}|contab` } });
  if (line.derived) {
    tdC.append(h('span', { class: 'cell-ro', title: `Se alimenta de ${line.link}` }, money(line.contab)));
  } else {
    const input = h('input', { class: 'cell-in', type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': `Saldo contabilidad de ${line.label}`, value: money(line.contab) });
    const raw = () => (line.expr ?? (line.contab ? String(line.contab) : ''));
    input.addEventListener('focus', () => { if (!ctx.selMode) { input.value = raw(); input.select(); } });
    const commit = () => {
      const text = input.value.trim();
      if (text === money(line.contab) || text === raw()) { input.value = money(line.contab); input.classList.remove('err'); return; }
      const r = ctx.ledger.preview(ref, text);
      if (!r.ok) { input.classList.add('err'); input.title = r.error; toast(`No se pudo calcular: ${r.error}`); return; }
      ctx.ledger.setLineAmount(ref, line.key, r.isExpression || text.startsWith('=') ? (text.startsWith('=') ? text : `=${text}`) : r.value);
      ctx.rerender(`${id}|contab`);
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { input.value = money(line.contab); input.blur(); } });
    if (line.isExpression && line.components?.length > 1) tdC.append(h('span', { class: 'fx', title: `Componentes: ${line.components.map((c) => c.text).join('  ')}` }, 'ƒ'));
    tdC.append(input);
  }
  tr.append(tdC);

  for (const col of ['debe', 'haber', 'audit', 'diff']) {
    const v = line[col];
    const td = h('td', { class: `num cell-pick${v < 0 ? ' neg' : ''}`, dataset: { sel: `${id}|${col}` } });
    const title = (col === 'debe' || col === 'haber') && line.adjustments?.length ? (line.adjustments.filter((a) => a.side === col).map((a) => `${a.id}: ${money(a.amount)}`).join(' · ') || null) : null;
    td.append(h('span', { class: 'cell-ro', title }, money(v)));
    tr.append(td);
  }
  tr.append(h('td', {}, h('span', { class: 'mark', title: 'Sumado horizontal (verificado por el motor)' }, '≤')));

  for (const td of tr.querySelectorAll('td.cell-pick')) {
    const [, key, col] = td.dataset.sel.split('|');
    td.addEventListener('click', (e) => {
      if (!(ctx.selMode || e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const k = td.dataset.sel;
      if (ctx.selection.has(k)) ctx.selection.delete(k); else ctx.selection.set(k, ctx.ledger.get(ref).lines.find((l) => l.key === key)[col]);
      td.firstElementChild?.blur?.();
      ctx.updateSelection();
      td.querySelectorAll('.cell-ro, .cell-in').forEach((el) => el.classList.toggle('cell-sel', ctx.selection.has(k)));
    }, true);
    if (ctx.selection.has(td.dataset.sel)) td.querySelectorAll('.cell-ro, .cell-in').forEach((el) => el.classList.add('cell-sel'));
  }
  if (ctx.flash === `${id}|contab`) tr.classList.add('flash');
  return tr;
}

function attrRow(a) {
  const c = (ok, t, d) => h('span', { class: `chip ${ok ? 'mint' : 'plain'}`, title: d }, icon(ok ? 'check' : 'clock', 14), t);
  return h('div', { class: 'row' }, h('span', { class: 'tiny' }, 'Atributos:'),
    c(a.A, 'A · Elaboró', 'Firma de quien elaboró'), c(a.B, 'B · Revisó', 'Firma de quien revisó'),
    c(a.C, 'C · Autorizó', 'Firma de quien autorizó'), c(a.D, 'D · Elabora ≠ revisa', 'Cuatro ojos: elaborador distinto al revisor'));
}

function treeList(ctx, nodes, current) {
  return h('ul', {}, nodes.map((p) => {
    const kids = ctx.ledger.children(p.ref);
    const errs = ctx.ledger.issuesFor(p.ref);
    const bad = errs.some((i) => i.severity === 'error');
    return h('li', {},
      h('a', { href: `#/cedulas/${encodeURIComponent(p.ref)}`, title: p.title, ...(p.ref === current ? { 'aria-current': 'page' } : {}) },
        h('b', {}, p.ref), h('span', { class: 'tt' }, p.title.replace(/^(Subanalítica|Analítica|Sumaria) de /, '')),
        errs.length ? h('span', { class: `chip badge ${bad ? 'rose' : 'sun'}` }, String(errs.length)) : null),
      kids.length ? treeList(ctx, kids, current) : null);
  }));
}

function adjustmentsBody(ctx, ref) {
  const L = ctx.ledger;
  const fam = family(L, ref);
  const mine = L.adjustments.filter((a) => (a.entries ?? []).some((e) => fam.has(e.ref)));
  const leaves = L.leafLines();
  const opt = (l) => h('option', { value: `${l.ref}|${l.key}` }, `${l.ref} · ${l.label}`);
  const selD = h('select', { id: 'adj-debe' }, leaves.map(opt));
  const selH = h('select', { id: 'adj-haber' }, leaves.map(opt));
  const amount = h('input', { id: 'adj-amt', type: 'text', inputmode: 'decimal', placeholder: 'Q0.00 o =100+50', autocomplete: 'off' });
  const memo = h('input', { id: 'adj-memo', type: 'text', placeholder: 'Para contabilizar…', autocomplete: 'off' });
  const add = () => {
    const r = L.preview(ref, amount.value);
    if (!r.ok || r.value <= 0) { toast(r.ok ? 'El importe debe ser mayor que cero' : `Importe no válido: ${r.error}`); return; }
    const [dr, dk] = selD.value.split('|'); const [hr, hk] = selH.value.split('|');
    if (dr === hr && dk === hk) { toast('El cargo y el abono deben ser líneas distintas'); return; }
    const id = `AJ-${L.adjustments.length + 1}`;
    L.addAdjustment({ id, date: new Date().toISOString().slice(0, 10), memo: memo.value || 'Sin descripción', entries: [{ ref: dr, key: dk, side: 'debe', amount: r.value }, { ref: hr, key: hk, side: 'haber', amount: r.value }] });
    toast(`Partida ${id} registrada`);
    ctx.rerender();
  };
  return h('div', { class: 'stack' },
    h('p', { class: 'tiny' }, 'Debe y Haber solo se llenan con partidas: no se pueden teclear en la cédula.'),
    mine.length ? h('div', { class: 'banners' }, mine.map((a) => h('div', { class: 'banner ok' }, icon('check', 18), h('span', {}, h('b', {}, `${a.id} `), `${a.memo} — `, (a.entries ?? []).map((e) => `${e.side === 'debe' ? 'Dr' : 'Cr'} ${e.ref}!${e.key} ${money(typeof e.amount === 'number' ? e.amount : parseMoney(e.amount))}`).join(' · ')),
      copyButton(a.id, { label: 'Partida copiada', title: 'Copiar número de partida', text: '', cls: 'btn sm ghost icon-btn' }))))
      : h('p', { class: 'muted' }, 'Esta cédula y sus cédulas hijas no tienen partidas.'),
    h('div', { class: 'form-grid' },
      h('div', { class: 'field' }, h('label', { for: 'adj-debe' }, 'Cargo (debe) a'), selD),
      h('div', { class: 'field' }, h('label', { for: 'adj-haber' }, 'Abono (haber) a'), selH),
      h('div', { class: 'field' }, h('label', { for: 'adj-amt' }, 'Importe'), amount),
      h('div', { class: 'field' }, h('label', { for: 'adj-memo' }, 'Descripción'), memo),
      btn('Registrar partida', { cls: 'primary', iconName: 'plus', onClick: add })));
}

export { copyText };

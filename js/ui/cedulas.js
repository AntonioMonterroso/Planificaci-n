// Panel de cédulas: navegación jerárquica, celdas con expresiones, marcas con copiar, ajustes y alertas.
import { h } from './dom.js';
import { formatMoney, plainNumber, round2, parseMoney } from '../core/money.js';
import { copyButton, copyText, tableToTSV, toast } from './copy.js';

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
  centralizadora: ['Centralizadora', 'lav'], sumaria: ['Sumaria', 'sky'], analitica: ['Analítica', 'mint'],
  subanalitica: ['Subanalítica', 'peach'], detalle: ['Detalle', 'rose'],
};

const money = (n) => formatMoney(n, { symbol: 'Q' });

export function cedulasView(ctx, wanted) {
  const L = ctx.ledger;
  const ref = L.paper(wanted) ? wanted : (L.roots()[0]?.ref ?? 'BG');
  const paper = L.paper(ref);
  const res = L.get(ref);
  const issues = L.issuesFor(ref);
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warns = issues.filter((i) => i.severity === 'warn').length;
  const [kindLabel, kindColor] = KIND[paper.kind] ?? ['Cédula', 'lav'];
  const path = L.path(ref);

  const go = (r) => { location.hash = `#/cedulas/${encodeURIComponent(r)}`; };

  // ---- encabezado ----
  const crumbs = h('nav', { class: 'crumbs', 'aria-label': 'Ruta de la cédula' },
    h('a', { href: '#/tablero' }, 'Índice'),
    path.map((r, i) => [
      h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'),
      i === path.length - 1 ? h('span', { class: 'cur', 'aria-current': 'page' }, r) : h('a', { href: `#/cedulas/${encodeURIComponent(r)}` }, r),
    ]));

  const status = errors ? h('span', { class: 'chip rose' }, `✕ ${errors} error${errors > 1 ? 'es' : ''}`)
    : warns ? h('span', { class: 'chip sun' }, `! ${warns} alerta${warns > 1 ? 's' : ''}`)
      : h('span', { class: 'chip mint' }, '✓ Cuadra');

  const parentRef = paper.parent;
  const header = h('div', { class: 'card' },
    crumbs,
    h('div', { class: 'row' },
      h('div', { style: undefined },
        h('div', { class: 'row' }, h('span', { class: `chip ${kindColor}` }, kindLabel), status),
        h('h2', { style: undefined, text: `${paper.ref} · ${paper.title}` })),
      h('span', { class: 'grow' }),
      h('button', { type: 'button', class: 'btn sm', disabled: !parentRef, onClick: () => parentRef && go(parentRef), title: 'Subir a la cédula superior' }, '↑ Subir'),
      h('button', { type: 'button', class: 'btn sm', disabled: ref === path[0], onClick: () => go(path[0]), title: 'Ir a la centralizadora' }, '⌂ Centralizadora'),
      copyButton(() => tableToTSV(tsvRows(res)), { label: 'Tabla copiada', title: 'Copiar tabla (pega en Excel)', text: '⧉ Copiar tabla', cls: 'btn sm' }),
    ),
    ctx.ledger.header.entity ? h('p', { class: 'tiny' }, `${L.header.entity} · ${L.header.period} · Expresado en ${L.header.currency}`) : null,
  );
  header.querySelector('.grow')?.setAttribute('class', 'grow');

  // ---- tabla ----
  const thead = h('thead', {}, h('tr', {},
    ['Cód.', 'Concepto', 'Ref.', 'Saldo contabilidad', 'Debe', 'Haber', 'Saldo auditoría', 'Diferencia', ''].map((t) => h('th', { scope: 'col' }, t))));
  const tbody = h('tbody', {});
  for (const line of res.lines) tbody.append(lineRow(ctx, ref, line));
  const tfoot = h('tfoot', {});
  if (res.sections) {
    const names = { activo: 'Total activo', pasivo: 'Total pasivo', patrimonio: 'Total patrimonio' };
    for (const [s, t] of Object.entries(res.sections)) tfoot.append(totalRow(names[s] ?? s, t, true));
    const pp = ['contab', 'audit'].map((c) => round2((res.sections.pasivo?.[c] ?? 0) + (res.sections.patrimonio?.[c] ?? 0)));
    tfoot.append(h('tr', {}, h('td', { colspan: 3 }, 'Total pasivo + patrimonio'), h('td', { class: 'num' }, money(pp[0])), h('td'), h('td'), h('td', { class: 'num' }, money(pp[1])), h('td'), h('td', {}, h('span', { class: 'mark', title: 'Sumado vertical (verificado por el motor)' }, '^'))));
  } else {
    tfoot.append(totalRow('Totales', res.totals, true));
  }
  const table = h('table', { class: 'ledger' }, thead, tbody, tfoot);
  const tableCard = h('div', { class: 'card' },
    h('div', { class: 'row' },
      h('h3', {}, 'Cifras'),
      h('span', { class: 'grow' }),
      h('button', { type: 'button', class: `btn sm${ctx.selMode ? ' primary' : ''}`, 'aria-pressed': String(ctx.selMode), onClick: () => { ctx.selMode = !ctx.selMode; ctx.rerender(); }, title: 'Seleccionar celdas para sumarlas' }, ctx.selMode ? '✓ Seleccionando celdas' : '∑ Seleccionar celdas')),
    h('p', { class: 'tiny' }, 'Escribe cifras o expresiones en la columna de saldo contabilidad: ', h('code', {}, '=15773+6955'), ' · ', h('code', {}, '=(1200*3)-45.5'), ' · ', h('code', {}, '=A1-2!fondo+100'), '. Ctrl/⌘ + clic suma celdas.'),
    h('div', { class: `table-wrap${ctx.selMode ? ' sel-mode' : ''}` }, table));

  // ---- alertas ----
  const alerts = h('div', { class: 'card' }, h('h3', {}, 'Revisión automática'),
    h('div', { class: 'alerts' }, issues.length
      ? issues.map((i) => h('div', { class: `alert ${i.severity}` }, h('b', {}, i.severity === 'error' ? '✕' : '!'), h('span', {}, i.message)))
      : h('div', { class: 'alert ok' }, h('b', {}, '✓'), h('span', {}, 'Sin diferencias: la cédula cuadra con sus niveles superior e inferior.'))),
    paper.signoffs ? attrRow(res.attributes) : null);

  // ---- marcas ----
  const marks = h('div', { class: 'card' }, h('h3', {}, 'Marcas de auditoría'),
    h('p', { class: 'tiny' }, 'Un clic en ⧉ copia la marca para pegarla donde la necesites.'),
    h('div', { class: 'marks' }, MARKS.map(([sym, desc]) => h('div', { class: 'mark-item' },
      h('div', { class: 'mark-sym', 'aria-hidden': 'true' }, sym), h('span', { class: 'd' }, desc),
      copyButton(sym, { label: `Marca ${desc.split(' (')[0]} copiada`, title: `Copiar ${sym}` })))));

  // ---- ajustes ----
  const adjCard = adjustmentsCard(ctx, ref);

  // ---- árbol ----
  const tree = h('aside', { class: 'card tree', 'aria-label': 'Árbol de cédulas' }, h('h3', {}, 'Cédulas'), treeList(ctx, L.roots(), ref));

  return h('div', { class: 'view' },
    header,
    h('div', { class: 'split' }, tree, h('div', { class: 'grid' }, tableCard, alerts, adjCard, marks)));
}

function tsvRows(res) {
  const rows = [['Código', 'Concepto', 'Saldo contabilidad', 'Debe', 'Haber', 'Saldo auditoría', 'Diferencia']];
  for (const l of res.lines) rows.push([l.code ?? '', l.label, plainNumber(l.contab), plainNumber(l.debe), plainNumber(l.haber), plainNumber(l.audit), plainNumber(l.diff)]);
  const t = res.totals;
  rows.push(['', 'Totales', plainNumber(t.contab), plainNumber(t.debe), plainNumber(t.haber), plainNumber(t.audit), plainNumber(t.diff)]);
  return rows;
}

function totalRow(label, t, withMark) {
  return h('tr', {}, h('td', { colspan: 3 }, label),
    ['contab', 'debe', 'haber', 'audit', 'diff'].map((c) => h('td', { class: 'num' }, money(t[c]))),
    h('td', {}, withMark ? h('span', { class: 'mark', title: 'Sumado vertical (verificado por el motor)' }, '^') : null));
}

function lineRow(ctx, ref, line) {
  const id = `${ref}|${line.key}`;
  const tr = h('tr', { dataset: { key: line.key } });
  tr.append(
    h('td', { class: 'code' }, line.code ?? ''),
    h('td', {}, line.label, line.source ? h('span', { class: 'src', title: `Origen: ${line.source}` }, `Origen: ${line.source}`) : (line.derived ? null : h('span', { class: 'src', style: undefined }, 'Sin origen'))),
    h('td', {}, line.link ? h('a', { class: 'link-btn', href: `#/cedulas/${encodeURIComponent(line.link)}`, title: `Ir a la cédula ${line.link}` }, `${line.link} →`) : null),
  );

  // saldo contabilidad: editable (con expresiones) o derivado
  const tdC = h('td', { class: 'num cell-pick', dataset: { sel: `${id}|contab` } });
  if (line.derived) {
    tdC.append(h('span', { class: 'cell-ro', title: `Se alimenta de ${line.link}` }, money(line.contab)));
  } else {
    const input = h('input', {
      class: 'cell-in', type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false',
      'aria-label': `Saldo contabilidad de ${line.label}`, value: money(line.contab),
    });
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
    if (line.isExpression && line.components?.length > 1) {
      tdC.append(h('span', { class: 'fx', title: `Componentes: ${line.components.map((c) => c.text).join('  ')}` }, 'ƒ'));
    }
    tdC.append(input);
  }
  tr.append(tdC);

  for (const col of ['debe', 'haber', 'audit', 'diff']) {
    const v = line[col];
    const td = h('td', { class: `num cell-pick${v < 0 ? ' neg' : ''}`, dataset: { sel: `${id}|${col}` } });
    const title = col === 'debe' || col === 'haber'
      ? (line.adjustments?.length ? line.adjustments.filter((a) => a.side === col).map((a) => `${a.id}: ${money(a.amount)}`).join(' · ') || null : null)
      : null;
    td.append(h('span', { class: 'cell-ro', title }, money(v)));
    tr.append(td);
  }
  tr.append(h('td', {}, h('span', { class: 'mark', title: 'Sumado horizontal (verificado por el motor)' }, '≤')));

  // selección de celdas
  const pick = (td, value) => {
    td.addEventListener('click', (e) => {
      if (!(ctx.selMode || e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const k = td.dataset.sel;
      if (ctx.selection.has(k)) ctx.selection.delete(k); else ctx.selection.set(k, value());
      td.firstElementChild?.blur?.();
      ctx.updateSelection();
      td.querySelectorAll('.cell-ro, .cell-in').forEach((el) => el.classList.toggle('cell-sel', ctx.selection.has(k)));
    }, true);
    if (ctx.selection.has(td.dataset.sel)) td.querySelectorAll('.cell-ro, .cell-in').forEach((el) => el.classList.add('cell-sel'));
  };
  [...tr.querySelectorAll('td.cell-pick')].forEach((td) => {
    const [, key, col] = td.dataset.sel.split('|');
    pick(td, () => ctx.ledger.get(ref).lines.find((l) => l.key === key)[col]);
  });
  if (ctx.flash === `${id}|contab`) tr.classList.add('flash');
  return tr;
}

function attrRow(a) {
  const chip = (ok, t, d) => h('span', { class: `chip ${ok ? 'mint' : 'peach'}`, title: d }, `${ok ? '✓' : '○'} ${t}`);
  return h('div', { class: 'row', style: undefined },
    chip(a.A, 'A · Elaboró', 'Firma de quien elaboró'), chip(a.B, 'B · Revisó', 'Firma de quien revisó'),
    chip(a.C, 'C · Autorizó', 'Firma de quien autorizó'), chip(a.D, 'D · Elabora ≠ revisa', 'Cuatro ojos: elaborador distinto al revisor'));
}

function treeList(ctx, nodes, current) {
  return h('ul', {}, nodes.map((p) => {
    const kids = ctx.ledger.children(p.ref);
    const errs = ctx.ledger.issuesFor(p.ref);
    const bad = errs.some((i) => i.severity === 'error');
    return h('li', {},
      h('a', { href: `#/cedulas/${encodeURIComponent(p.ref)}`, ...(p.ref === current ? { 'aria-current': 'page' } : {}) },
        h('b', {}, p.ref), h('span', { class: 'hide-sm' }, p.title.length > 26 ? p.title.slice(0, 25) + '…' : p.title),
        errs.length ? h('span', { class: `chip badge ${bad ? 'rose' : 'sun'}` }, String(errs.length)) : null),
      kids.length ? treeList(ctx, kids, current) : null);
  }));
}

function adjustmentsCard(ctx, ref) {
  const L = ctx.ledger;
  const family = new Set([ref]);
  for (let grew = true; grew;) { grew = false; for (const p of L.papers.values()) if (p.parent && family.has(p.parent) && !family.has(p.ref)) { family.add(p.ref); grew = true; } }
  const mine = L.adjustments.filter((a) => (a.entries ?? []).some((e) => family.has(e.ref)));
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
  return h('div', { class: 'card' }, h('h3', {}, 'Ajustes y reclasificaciones'),
    h('p', { class: 'tiny' }, 'Las columnas Debe y Haber solo se llenan con partidas: no se pueden teclear en la cédula.'),
    mine.length ? h('div', { class: 'alerts' }, mine.map((a) => h('div', { class: 'alert ok' }, h('b', {}, a.id), h('span', {}, `${a.memo} — `, (a.entries ?? []).map((e) => `${e.side === 'debe' ? 'Dr' : 'Cr'} ${e.ref}!${e.key} ${money(typeof e.amount === 'number' ? e.amount : parseMoney(e.amount))}`).join(' · ')), copyButton(a.id, { label: 'Partida copiada', title: 'Copiar número de partida' }))))
      : h('p', { class: 'muted' }, 'Esta cédula y sus cédulas hijas no tienen partidas.'),
    h('div', { class: 'form-grid' },
      h('div', { class: 'field' }, h('label', { for: 'adj-debe' }, 'Cargo (debe) a'), selD),
      h('div', { class: 'field' }, h('label', { for: 'adj-haber' }, 'Abono (haber) a'), selH),
      h('div', { class: 'field' }, h('label', { for: 'adj-amt' }, 'Importe'), amount),
      h('div', { class: 'field' }, h('label', { for: 'adj-memo' }, 'Descripción'), memo),
      h('button', { type: 'button', class: 'btn primary', onClick: add }, '+ Registrar partida')));
}

export { copyText };

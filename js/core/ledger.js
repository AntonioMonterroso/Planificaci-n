// Motor de cédulas: centralizadora > sumaria > analítica > subanalítica > detalle.
//
// Reglas que el motor hace cumplir (mejoras sobre el Excel de origen):
//  - Una línea con `link` NO admite cifras manuales: toma sus totales del hijo.
//  - Debe/Haber de una línea salen SOLO de partidas de ajuste (no se teclean).
//  - Cada partida debe cuadrar (debe = haber) y apuntar a líneas hoja.
//  - Toda cifra manual debe tener origen (documento); si no, queda alerta.
//  - Cuatro ojos: quien elabora no revisa (atributos A-D).
//  - La centralizadora debe cuadrar: activo = pasivo + patrimonio.
//
// Nada aquí toca el DOM ni la red: se puede probar y reutilizar en el servidor.

import { evaluate } from './expr.js';
import { round2, nearlyEqual } from './money.js';

export const COLS = ['contab', 'debe', 'haber', 'audit', 'diff'];

/** Naturaleza por sección de la centralizadora. */
const NATURE_BY_SECTION = { activo: 'deudora', pasivo: 'acreedora', patrimonio: 'acreedora' };

export class Ledger {
  /**
   * @param {{header?:object, papers:Array, adjustments?:Array}} data
   * paper: {ref, kind, title, nature?, parent?, lines:[{key,label,code?,contab?,link?,section?,source?,nature?}], signoffs?}
   * adjustment: {id, date?, memo?, entries:[{ref,key,side:'debe'|'haber',amount:number|string}]}
   */
  constructor(data) {
    this.header = data.header ?? {};
    this.papers = new Map();
    for (const p of data.papers) {
      if (this.papers.has(p.ref)) throw new Error(`Referencia duplicada: ${p.ref}`);
      this.papers.set(p.ref, p);
    }
    this.adjustments = data.adjustments ?? [];
    this.compute();
  }

  // ---------- estructura / navegación ----------
  paper(ref) { return this.papers.get(ref) ?? null; }
  roots() { return [...this.papers.values()].filter((p) => !p.parent); }
  children(ref) { return [...this.papers.values()].filter((p) => p.parent === ref); }
  /** ['BG','A','A1','A1-4'] */
  path(ref) {
    const out = [];
    let cur = this.paper(ref);
    const seen = new Set();
    while (cur && !seen.has(cur.ref)) {
      seen.add(cur.ref);
      out.unshift(cur.ref);
      cur = cur.parent ? this.paper(cur.parent) : null;
    }
    return out;
  }
  /** Líneas (de otros papeles) cuyo `link` apunta a este papel: "quién la usa". */
  dependents(ref) {
    const out = [];
    for (const p of this.papers.values()) for (const l of p.lines) if (l.link === ref) out.push({ ref: p.ref, key: l.key });
    return out;
  }

  // ---------- cálculo ----------
  compute() {
    this.issues = [];
    this._memo = new Map();
    this._stack = [];
    this._adjIndex = this._indexAdjustments();
    this.result = new Map();
    for (const p of this.papers.values()) this.result.set(p.ref, this._computePaper(p));
    this._structuralChecks();
    return this.result;
  }

  _issue(code, severity, ref, message, key = null) {
    this.issues.push({ code, severity, ref, key, message });
  }

  _indexAdjustments() {
    const idx = new Map(); // "ref|key" -> {debe, haber, items:[]}
    const get = (k) => { if (!idx.has(k)) idx.set(k, { debe: 0, haber: 0, items: [] }); return idx.get(k); };
    for (const adj of this.adjustments) {
      let sumD = 0; let sumH = 0; let valid = true;
      const evald = [];
      for (const e of adj.entries ?? []) {
        const paper = this.paper(e.ref);
        const line = paper?.lines.find((l) => l.key === e.key);
        const r = evaluate(e.amount, { resolve: null });
        if (!paper || !line) { this._issue('ajuste_linea_inexistente', 'error', e.ref ?? '?', `Partida ${adj.id}: la línea ${e.ref}!${e.key} no existe`, e.key); valid = false; continue; }
        if (line.link) { this._issue('ajuste_en_nodo_con_enlace', 'error', e.ref, `Partida ${adj.id}: ${e.ref}!${e.key} se alimenta de ${line.link}; el ajuste debe registrarse en la línea hoja`, e.key); valid = false; continue; }
        if (!r.ok) { this._issue('ajuste_importe_invalido', 'error', e.ref, `Partida ${adj.id}: importe no válido (${r.error})`, e.key); valid = false; continue; }
        if (e.side !== 'debe' && e.side !== 'haber') { this._issue('ajuste_lado_invalido', 'error', e.ref, `Partida ${adj.id}: el lado debe ser debe o haber`, e.key); valid = false; continue; }
        if (e.side === 'debe') sumD += r.value; else sumH += r.value;
        evald.push({ e, v: r.value });
      }
      if (!nearlyEqual(sumD, sumH)) {
        this._issue('partida_descuadrada', 'error', adj.entries?.[0]?.ref ?? '?', `Partida ${adj.id} descuadrada: debe ${round2(sumD)} ≠ haber ${round2(sumH)}`);
        valid = false;
      }
      if (!valid) continue; // una partida inválida no se aplica
      for (const { e, v } of evald) {
        const slot = get(`${e.ref}|${e.key}`);
        slot[e.side] = round2(slot[e.side] + v);
        slot.items.push({ id: adj.id, side: e.side, amount: v, memo: adj.memo ?? '' });
      }
    }
    return idx;
  }

  _lineNature(paper, line) {
    return line.nature ?? NATURE_BY_SECTION[line.section] ?? paper.nature ?? 'deudora';
  }

  /** Valor de una columna de una línea (con memo y detección de ciclos). */
  _line(ref, key) {
    const id = `${ref}|${key}`;
    if (this._memo.has(id)) return this._memo.get(id);
    if (this._stack.includes(id)) {
      this._issue('referencia_circular', 'error', ref, `Referencia circular en ${ref}!${key}`, key);
      return { contab: 0, debe: 0, haber: 0, audit: 0, diff: 0, error: 'circular' };
    }
    this._stack.push(id);
    const paper = this.paper(ref);
    const line = paper?.lines.find((l) => l.key === key);
    let out;
    if (!line) {
      out = { contab: 0, debe: 0, haber: 0, audit: 0, diff: 0, error: 'inexistente' };
    } else {
      out = this._computeLine(paper, line);
    }
    this._stack.pop();
    this._memo.set(id, out);
    return out;
  }

  _computeLine(paper, line) {
    const nature = this._lineNature(paper, line);
    let contab = 0; let debe = 0; let haber = 0;
    let components = []; let expr = null; let error = null; let derived = false; let isExpression = false;
    if (line.link) {
      derived = true;
      const child = this.paper(line.link);
      if (!child) {
        error = `No existe la cédula enlazada ${line.link}`;
        this._issue('enlace_roto', 'error', paper.ref, error, line.key);
      } else {
        if (child.parent !== paper.ref) this._issue('enlace_jerarquia', 'warn', paper.ref, `${line.link} está enlazada desde ${paper.ref} pero su padre declarado es ${child.parent ?? 'ninguno'}`, line.key);
        const t = this._totals(child);
        contab = t.contab; debe = t.debe; haber = t.haber;
      }
      if (line.contab !== undefined && line.contab !== null && line.contab !== '') {
        this._issue('cifra_manual_en_enlace', 'error', paper.ref, `${paper.ref}!${line.key} tiene cifra tecleada pero se alimenta de ${line.link}: no se puede forzar`, line.key);
      }
    } else {
      const r = evaluate(line.contab ?? 0, { resolve: (sheet, k, col) => this._resolveRef(paper, sheet, k, col) });
      if (!r.ok) { error = r.error; this._issue('formula_invalida', 'error', paper.ref, `${paper.ref}!${line.key}: ${r.error}`, line.key); }
      else { contab = r.value; components = r.components; isExpression = r.isExpression; expr = typeof line.contab === 'string' ? line.contab : null; }
      const adj = this._adjIndex.get(`${paper.ref}|${line.key}`);
      if (adj) { debe = adj.debe; haber = adj.haber; }
      if (!line.source && contab !== 0 && !line.computed) {
        this._issue('sin_origen', 'warn', paper.ref, `${paper.ref}!${line.key}: cifra sin documento de origen`, line.key);
      }
    }
    const audit = round2(nature === 'deudora' ? contab + debe - haber : contab - debe + haber);
    return { contab: round2(contab), debe: round2(debe), haber: round2(haber), audit, diff: round2(audit - contab), nature, derived, components, expr, isExpression, error, adjustments: this._adjIndex.get(`${paper.ref}|${line.key}`)?.items ?? [] };
  }

  _resolveRef(paper, sheet, key, col) {
    const ref = sheet ?? paper.ref;
    const target = this.paper(ref);
    if (!target) throw new Error(`No existe la cédula ${ref}`);
    const column = col ?? 'contab';
    if (!COLS.includes(column)) throw new Error(`Columna desconocida .${column}`);
    if (key.toUpperCase() === 'TOTAL') return this._totals(target)[column];
    if (!target.lines.some((l) => l.key === key)) throw new Error(`No existe ${ref}!${key}`);
    return this._line(ref, key)[column];
  }

  /** Totales de un papel (por sección si es centralizadora). */
  _totals(paper) {
    const cached = this._memo.get(`TOTALS|${paper.ref}`);
    if (cached) return cached;
    const t = { contab: 0, debe: 0, haber: 0, audit: 0, diff: 0 };
    for (const l of paper.lines) {
      const v = this._line(paper.ref, l.key);
      // En una centralizadora el total "general" suma solo el activo.
      if (paper.kind === 'centralizadora' && l.section && l.section !== 'activo') continue;
      for (const c of COLS) t[c] = round2(t[c] + v[c]);
    }
    this._memo.set(`TOTALS|${paper.ref}`, t);
    return t;
  }

  _computePaper(paper) {
    const lines = paper.lines.map((l) => ({ ...l, ...this._line(paper.ref, l.key) }));
    const totals = this._totals(paper);
    let sections = null;
    if (paper.kind === 'centralizadora') {
      sections = {};
      for (const l of lines) {
        const s = l.section ?? 'otros';
        sections[s] ??= { contab: 0, debe: 0, haber: 0, audit: 0, diff: 0 };
        for (const c of COLS) sections[s][c] = round2(sections[s][c] + l[c]);
      }
    }
    return { ref: paper.ref, kind: paper.kind, title: paper.title, lines, totals, sections, attributes: this.attributes(paper) };
  }

  _structuralChecks() {
    for (const p of this.papers.values()) {
      if (p.parent) {
        const parent = this.paper(p.parent);
        if (!parent) this._issue('padre_inexistente', 'error', p.ref, `El padre ${p.parent} de ${p.ref} no existe`);
        else if (!parent.lines.some((l) => l.link === p.ref)) this._issue('hijo_sin_enlace', 'warn', p.ref, `${p.ref} no está enlazada desde ${p.parent}: sus cifras no llegan a la cédula superior`);
      }
      const r = this.result.get(p.ref);
      if (p.kind === 'centralizadora' && r.sections?.activo) {
        const s = r.sections;
        for (const col of ['contab', 'audit']) {
          const left = s.activo?.[col] ?? 0;
          const right = round2((s.pasivo?.[col] ?? 0) + (s.patrimonio?.[col] ?? 0));
          if (!nearlyEqual(left, right)) {
            this._issue('no_cuadra_activo_pasivo', 'error', p.ref, `${p.ref}: el activo (${col === 'audit' ? 'según auditoría' : 'contabilidad'}) ${left} no es igual a pasivo + patrimonio ${right} (dif. ${round2(left - right)})`);
          }
        }
      }
      const a = r.attributes;
      if (p.signoffs?.elaboro && p.signoffs?.reviso && p.signoffs.elaboro === p.signoffs.reviso) {
        this._issue('cuatro_ojos', 'error', p.ref, `${p.ref}: quien elabora y quien revisa es la misma persona`);
      }
      if (a.A && a.B && a.C && !a.D) this._issue('cuatro_ojos', 'error', p.ref, `${p.ref}: falta que elaborador y revisor sean distintos (atributo D)`);
    }
  }

  /** Atributos A-D del Excel original, ahora calculados. */
  attributes(paper) {
    const s = paper.signoffs ?? {};
    return { A: !!s.elaboro, B: !!s.reviso, C: !!s.autorizo, D: !!(s.elaboro && s.reviso && s.elaboro !== s.reviso) };
  }

  // ---------- consultas ----------
  issuesFor(ref) { return this.issues.filter((i) => i.ref === ref); }
  get(ref) { return this.result.get(ref); }

  /** Evalúa un texto de celda en el contexto de un papel SIN modificar nada (para validar antes de guardar). */
  preview(ref, raw) {
    const paper = this.paper(ref);
    if (!paper) return { ok: false, error: `No existe ${ref}` };
    this._stack = [];
    return evaluate(raw, { resolve: (sheet, k, col) => this._resolveRef(paper, sheet, k, col) });
  }

  /** Líneas hoja (sin enlace) donde se puede registrar un ajuste. */
  leafLines() {
    const out = [];
    for (const p of this.papers.values()) for (const l of p.lines) if (!l.link) out.push({ ref: p.ref, key: l.key, label: l.label, paper: p.title });
    return out;
  }

  /** Cambia la cifra de una línea y recalcula. */
  setLineAmount(ref, key, value) {
    const line = this.paper(ref)?.lines.find((l) => l.key === key);
    if (!line) throw new Error(`No existe ${ref}!${key}`);
    line.contab = value;
    this.compute();
  }

  addAdjustment(adj) {
    this.adjustments.push(adj);
    this.compute();
  }
}

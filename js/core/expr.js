// Evaluador seguro de expresiones para celdas numéricas. SIN eval ni Function.
//
//   =15773+6955              -> 22728, componentes [15773, 6955]
//   =(1200*3)-45.5           -> 3554.5
//   =Q18,130.13+29,219.75    -> formato guatemalteco
//   =A1-4!F28+100            -> referencia a otra cédula (resuelta por el llamador)
//   =SUMA(10;20;30)          -> funciones, argumentos separados por ;
//   (47,349.88)              -> importe contable negativo (si es todo el texto)
//
// Devuelve siempre un objeto: { ok, value, components, refs, error }.
// "components" conserva cada sumando del nivel superior (rastro de auditoría).

import { round2, parseMoney } from './money.js';

const FUNCS = {
  SUMA: (a) => a.reduce((s, x) => s + x, 0),
  SUM: (a) => a.reduce((s, x) => s + x, 0),
  PROM: (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0),
  PROMEDIO: (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0),
  AVERAGE: (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0),
  MIN: (a) => Math.min(...a),
  MAX: (a) => Math.max(...a),
  ABS: (a) => Math.abs(a[0]),
  REDONDEAR: (a) => roundTo(a[0], a[1] ?? 0),
  ROUND: (a) => roundTo(a[0], a[1] ?? 0),
};

function roundTo(x, d) {
  const f = 10 ** d;
  return Math.round((x + Math.sign(x) * 1e-9) * f) / f;
}

const MAX_LEN = 500;
const MAX_DEPTH = 40;

const RE_REF_SHEET = /^(?:'([^']+)'|([A-Za-z][\w.-]*))!(\$?[A-Za-z][A-Za-z0-9_]*)(?:\.([a-z]+))?/;
const RE_REF_BARE = /^\$?([A-Z]{1,3})\$?(\d+)(?![A-Za-z0-9_(])/;
const RE_FUNC = /^([A-Za-z]+)(?=\()/;
const RE_NUM = /^(?:[Q$]\s*)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)/i;

function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const ws = rest.match(/^\s+/);
    if (ws) { i += ws[0].length; continue; }
    let m;
    if ((m = rest.match(RE_REF_SHEET))) {
      toks.push({ t: 'ref', sheet: m[1] ?? m[2], key: m[3].replace('$', ''), col: m[4] ?? null, pos: i, end: i + m[0].length });
      i += m[0].length; continue;
    }
    if ((m = rest.match(RE_FUNC))) {
      toks.push({ t: 'func', name: m[1].toUpperCase(), pos: i, end: i + m[0].length });
      i += m[0].length; continue;
    }
    if ((m = rest.match(RE_NUM))) {
      toks.push({ t: 'num', v: Number(m[1].replace(/,/g, '')), pos: i, end: i + m[0].length });
      i += m[0].length; continue;
    }
    if ((m = rest.match(RE_REF_BARE))) {
      toks.push({ t: 'ref', sheet: null, key: m[1] + m[2], col: null, pos: i, end: i + m[0].length });
      i += m[0].length; continue;
    }
    const c = rest[0];
    if ('+-*/^%();×÷'.includes(c)) {
      const op = c === '×' ? '*' : c === '÷' ? '/' : c;
      toks.push({ t: op, pos: i, end: i + 1 });
      i += 1; continue;
    }
    throw new Error(`Carácter no válido "${c}" en la posición ${i + 1}`);
  }
  return toks;
}

class Parser {
  constructor(tokens) { this.toks = tokens; this.i = 0; this.depth = 0; }
  peek() { return this.toks[this.i]; }
  next() { return this.toks[this.i++]; }
  expect(t) {
    const k = this.next();
    if (!k || k.t !== t) throw new Error(`Se esperaba "${t}"`);
    return k;
  }
  parse() {
    if (!this.toks.length) throw new Error('Expresión vacía');
    const n = this.expr();
    if (this.i < this.toks.length) throw new Error(`Sobra "${this.peek().t === 'num' ? this.peek().v : this.peek().t}"`);
    return n;
  }
  expr() {
    let l = this.term();
    while (this.peek() && (this.peek().t === '+' || this.peek().t === '-')) {
      const op = this.next().t;
      const r = this.term();
      l = { type: 'bin', op, l, r, start: l.start, end: r.end };
    }
    return l;
  }
  term() {
    let l = this.unary();
    while (this.peek() && (this.peek().t === '*' || this.peek().t === '/')) {
      const op = this.next().t;
      const r = this.unary();
      l = { type: 'bin', op, l, r, start: l.start, end: r.end };
    }
    return l;
  }
  unary() {
    const k = this.peek();
    if (k && (k.t === '-' || k.t === '+')) {
      this.next();
      const a = this.unary();
      return k.t === '-' ? { type: 'neg', a, start: k.pos, end: a.end } : a;
    }
    return this.power();
  }
  power() {
    const base = this.postfix();
    if (this.peek() && this.peek().t === '^') {
      this.next();
      const exp = this.unary();
      return { type: 'bin', op: '^', l: base, r: exp, start: base.start, end: exp.end };
    }
    return base;
  }
  postfix() {
    let n = this.primary();
    while (this.peek() && this.peek().t === '%') {
      const p = this.next();
      n = { type: 'pct', a: n, start: n.start, end: p.end };
    }
    return n;
  }
  primary() {
    if (++this.depth > MAX_DEPTH) throw new Error('Expresión demasiado anidada');
    const k = this.next();
    if (!k) throw new Error('La expresión termina de forma inesperada');
    let n;
    if (k.t === 'num') n = { type: 'num', v: k.v, start: k.pos, end: k.end };
    else if (k.t === 'ref') n = { type: 'ref', sheet: k.sheet, key: k.key, col: k.col, start: k.pos, end: k.end };
    else if (k.t === 'func') {
      this.expect('(');
      const args = [];
      if (this.peek() && this.peek().t !== ')') {
        args.push(this.expr());
        while (this.peek() && this.peek().t === ';') { this.next(); args.push(this.expr()); }
      }
      const close = this.expect(')');
      if (!FUNCS[k.name]) throw new Error(`Función desconocida ${k.name}`);
      n = { type: 'func', name: k.name, args, start: k.pos, end: close.end };
    } else if (k.t === '(') {
      const e = this.expr();
      const close = this.expect(')');
      n = { ...e, start: k.pos, end: close.end, paren: true };
    } else throw new Error(`No se esperaba "${k.t}"`);
    this.depth--;
    return n;
  }
}

function evalNode(n, ctx) {
  switch (n.type) {
    case 'num': return n.v;
    case 'neg': return -evalNode(n.a, ctx);
    case 'pct': return evalNode(n.a, ctx) / 100;
    case 'ref': {
      ctx.refs.push({ sheet: n.sheet, key: n.key, col: n.col });
      if (!ctx.resolve) throw new Error(`No se puede resolver ${n.sheet ? n.sheet + '!' : ''}${n.key}`);
      const v = ctx.resolve(n.sheet, n.key, n.col);
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`La referencia ${n.sheet ? n.sheet + '!' : ''}${n.key} no es un número`);
      return v;
    }
    case 'func': {
      const args = n.args.map((a) => evalNode(a, ctx));
      if (!args.length && n.name !== 'SUMA' && n.name !== 'SUM') throw new Error(`${n.name} necesita argumentos`);
      return FUNCS[n.name](args);
    }
    case 'bin': {
      const a = evalNode(n.l, ctx);
      const b = evalNode(n.r, ctx);
      switch (n.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': if (b === 0) throw new Error('División entre cero'); return a / b;
        case '^': return a ** b;
        default: throw new Error('Operador desconocido');
      }
    }
    default: throw new Error('Nodo desconocido');
  }
}

function collectTerms(n, sign, out, ctx, src) {
  if (n.type === 'bin' && (n.op === '+' || n.op === '-') && !n.paren) {
    collectTerms(n.l, sign, out, ctx, src);
    collectTerms(n.r, n.op === '-' ? -sign : sign, out, ctx, src);
  } else {
    out.push({ text: src.slice(n.start, n.end).trim(), value: sign * evalNode(n, { ...ctx, refs: [] }) });
  }
}

/**
 * Evalúa un texto de celda. `resolve(sheet, key, col)` devuelve el número de una referencia.
 * Un texto sin "=" y sin operadores se interpreta como importe simple.
 */
export function evaluate(input, { resolve = null } = {}) {
  if (typeof input === 'number') {
    return Number.isFinite(input)
      ? { ok: true, value: round2(input), components: [{ text: String(input), value: input }], refs: [], isExpression: false }
      : { ok: false, error: 'Número no válido' };
  }
  let src = String(input ?? '').trim();
  if (src === '') return { ok: true, value: 0, components: [], refs: [], isExpression: false, empty: true };
  if (src.length > MAX_LEN) return { ok: false, error: 'Expresión demasiado larga' };

  const explicit = src.startsWith('=');
  if (explicit) src = src.slice(1).trim();

  if (!explicit) {
    const simple = parseMoney(src);
    if (!Number.isNaN(simple)) {
      return { ok: true, value: round2(simple), components: [{ text: src, value: simple }], refs: [], isExpression: false };
    }
  }
  // "(1,200.00)" = importe negativo, no agrupación
  const acct = src.match(/^\(\s*[Q$]?\s*(\d[\d,]*(?:\.\d+)?)\s*\)$/i);
  if (acct) {
    const v = -Number(acct[1].replace(/,/g, ''));
    return { ok: true, value: round2(v), components: [{ text: src, value: v }], refs: [], isExpression: explicit };
  }

  try {
    const ast = new Parser(tokenize(src)).parse();
    const ctx = { resolve, refs: [] };
    const raw = evalNode(ast, ctx);
    if (!Number.isFinite(raw)) throw new Error('El resultado no es un número');
    const components = [];
    collectTerms(ast, 1, components, { resolve }, src);
    return { ok: true, value: round2(raw), components, refs: ctx.refs, isExpression: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

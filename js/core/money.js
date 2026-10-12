// Lectura y formato de importes (quetzales). Sin dependencias.

const EPS = 0.005;

/** Redondea a centavos evitando errores binarios (1.005 -> 1.01). */
export function round2(x) {
  if (!Number.isFinite(x)) return x;
  return Math.round((x + Math.sign(x) * 1e-9) * 100) / 100;
}

export function nearlyEqual(a, b, eps = EPS) {
  return Math.abs(a - b) < eps;
}

/**
 * Convierte texto como "Q1,654,923.68", " (47,349.88) ", "-1200", "Q 3,100.00"
 * en número. Paréntesis = negativo. Devuelve NaN si no es un importe válido.
 */
export function parseMoney(input) {
  if (typeof input === 'number') return input;
  if (input == null) return NaN;
  let s = String(input).trim();
  if (s === '') return NaN;
  let neg = false;
  const paren = s.match(/^\(\s*(.+?)\s*\)$/);
  if (paren) { neg = true; s = paren[1]; }
  s = s.replace(/^[Q$]\s*/i, '').replace(/\s+/g, '');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  s = s.replace(/^[Q$]/i, '');
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$|^\.\d+$/.test(s)) return NaN;
  const n = Number(s.replace(/,/g, ''));
  return neg ? -n : n;
}

/** 1654923.68 -> "Q1,654,923.68". Con parens=true los negativos salen "(47,349.88)". */
export function formatMoney(n, { symbol = 'Q', parens = true, zero = '-' } = {}) {
  if (n == null || Number.isNaN(n)) return '';
  const v = round2(n);
  if (v === 0 && zero !== null) return zero;
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const body = `${symbol}${abs}`;
  if (v < 0) return parens ? `(${body})` : `-${body}`;
  return body;
}

/** Número plano para copiar a Excel: 1654923.68 */
export function plainNumber(n) {
  return round2(n).toFixed(2);
}

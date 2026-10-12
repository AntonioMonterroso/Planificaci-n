// Generador de paquetes por rubro: centralizadora › sumaria › analíticas › subanalíticas, con enlaces y cuadre.
// Es estructura de trabajo (nombres y jerarquía), sin cifras ni criterios legales. Las cifras las pone el auditor
// con su documento de origen; el saldo que ya tenía la línea en la centralizadora se traslada, no se pierde.

import { Ledger } from './ledger.js';

/** Catálogo de rubros. `subs` vacío = la analítica lleva su propia línea de saldo. */
export const RUBROS = {
  A: { title: 'Caja y bancos', section: 'activo', analytics: [{ label: 'Caja', subs: ['Caja general', 'Caja chica'] }, { label: 'Bancos moneda local', subs: [] }] },
  B: { title: 'Cuentas por cobrar', section: 'activo', analytics: [{ label: 'Clientes', subs: [] }, { label: 'Otras cuentas por cobrar', subs: [] }, { label: 'Estimación para cuentas incobrables', subs: [] }] },
  C: { title: 'Inventarios', section: 'activo', analytics: [{ label: 'Mercaderías', subs: [] }, { label: 'Materias primas y suministros', subs: [] }, { label: 'Estimación por obsolescencia', subs: [] }] },
  D: { title: 'Propiedad, planta y equipo', section: 'activo', analytics: [{ label: 'Terrenos', subs: [] }, { label: 'Edificios', subs: [] }, { label: 'Mobiliario y equipo', subs: [] }, { label: 'Vehículos', subs: [] }, { label: 'Depreciación acumulada', subs: [] }] },
  AA: { title: 'Cuentas por pagar', section: 'pasivo', analytics: [{ label: 'Proveedores', subs: [] }, { label: 'Acreedores diversos', subs: [] }, { label: 'Impuestos por pagar', subs: [] }, { label: 'Prestaciones laborales', subs: [] }] },
  BB: { title: 'Patrimonio', section: 'patrimonio', analytics: [{ label: 'Capital social', subs: [] }, { label: 'Reservas', subs: [] }, { label: 'Resultados acumulados', subs: [] }, { label: 'Resultado del ejercicio', subs: [] }] },
};

const NATURE = { activo: 'deudora', pasivo: 'acreedora', patrimonio: 'acreedora' };

/** Papeles del rubro. `seed` = {amount, source} se coloca en la primera línea hoja. */
export function buildPackage(code, spec = RUBROS[code], seed = null) {
  if (!spec) throw new Error(`Rubro desconocido: ${code}`);
  const nature = NATURE[spec.section] ?? 'deudora';
  const papers = []; let seeded = false;
  const leaf = (key, code_, label) => {
    const l = { key, code: code_, label, contab: 0 };
    if (seed && !seeded) { l.contab = seed.amount; if (seed.source) l.source = seed.source; seeded = true; }
    return l;
  };
  const sumaria = { ref: code, kind: 'sumaria', parent: 'BG', title: `Sumaria de ${spec.title}`, nature, signoffs: {}, lines: [] };
  papers.push(sumaria);
  spec.analytics.forEach((a, i) => {
    const aRef = `${code}${i + 1}`;
    sumaria.lines.push({ key: `r${i + 1}`, code: String(i + 1), label: a.label, link: aRef });
    const an = { ref: aRef, kind: 'analitica', parent: code, title: `Analítica de ${a.label}`, nature, signoffs: {}, lines: [] };
    papers.push(an);
    if (!a.subs.length) { an.lines.push(leaf('saldo', '1', 'Saldo según contabilidad')); return; }
    a.subs.forEach((s, j) => {
      const sRef = `${aRef}-${j + 1}`;
      an.lines.push({ key: `s${j + 1}`, code: String(j + 1), label: s, link: sRef });
      papers.push({ ref: sRef, kind: 'subanalitica', parent: aRef, title: `Subanalítica de ${s}`, nature, signoffs: {}, lines: [leaf('saldo', '1', 'Saldo según contabilidad')] });
    });
  });
  return papers;
}

const firstLeaf = (papers) => { const p = papers.find((x) => x.lines.some((l) => !l.link) && x.kind !== 'sumaria'); return { ref: p.ref, key: p.lines.find((l) => !l.link).key }; };

/** Rubros de la centralizadora que aún no tienen paquete (línea sin enlace). */
export function pendingRubros(ledger) {
  const bg = ledger.roots().find((p) => p.kind === 'centralizadora');
  if (!bg) return [];
  return bg.lines.filter((l) => !l.link && RUBROS[l.key]).map((l) => l.key);
}

/**
 * Devuelve un Ledger nuevo con el paquete del rubro y la línea de la centralizadora enlazada.
 * El saldo anterior de la línea pasa a la primera línea hoja y los ajustes que la tocaban se reubican allí.
 */
export function withPackage(ledger, code) {
  const spec = RUBROS[code];
  if (!spec) throw new Error(`Rubro desconocido: ${code}`);
  const bg = ledger.roots().find((p) => p.kind === 'centralizadora');
  if (!bg) throw new Error('No hay centralizadora');
  if (ledger.paper(code)) throw new Error(`Ya existe la cédula ${code}`);
  const line = bg.lines.find((l) => l.key === code);
  if (!line) throw new Error(`La centralizadora no tiene la línea ${code}`);
  if (line.link) throw new Error(`El rubro ${code} ya tiene paquete`);
  const prev = ledger.get(bg.ref).lines.find((l) => l.key === code).contab;
  const papers = buildPackage(code, spec, prev !== 0 ? { amount: line.contab, source: line.source } : null);
  const target = firstLeaf(papers);
  const nextBg = { ...bg, lines: bg.lines.map((l) => (l.key === code ? { key: l.key, code: l.code, label: l.label, section: l.section, link: code } : l)) };
  const adjustments = ledger.adjustments.map((a) => ({ ...a, entries: a.entries.map((e) => (e.ref === bg.ref && e.key === code ? { ...e, ...target } : e)) }));
  const all = [...ledger.papers.values()].map((p) => (p.ref === bg.ref ? nextBg : p));
  return new Ledger({ header: ledger.header, papers: [...all, ...papers], adjustments });
}

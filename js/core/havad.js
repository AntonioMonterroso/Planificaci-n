// Analíticos financieros: 15 ratios estándar con DuPont. Calculados en el navegador, sin dependencias.
// Convenciones (a confirmar contra el HAVAD de la firma): saldos finales del periodo, 365 días, importes en quetzales.
// Si falta un dato o el divisor es cero, el ratio no se inventa: queda sin valor y dice qué falta.

export const INPUTS = [
  ['efectivo', 'Efectivo y equivalentes'], ['cuentasPorCobrar', 'Cuentas por cobrar'], ['inventarios', 'Inventarios'],
  ['activoCorriente', 'Activo corriente'], ['activoTotal', 'Activo total'],
  ['pasivoCorriente', 'Pasivo corriente'], ['cuentasPorPagar', 'Cuentas por pagar (proveedores)'], ['pasivoTotal', 'Pasivo total'], ['patrimonio', 'Patrimonio'],
  ['ventas', 'Ventas netas'], ['costoVentas', 'Costo de ventas'], ['utilidadOperativa', 'Utilidad operativa'], ['gastoIntereses', 'Gasto por intereses'], ['utilidadNeta', 'Utilidad neta'],
];

const DAYS = 365;
const has = (v) => typeof v === 'number' && Number.isFinite(v);

// [id, grupo, nombre, unidad, fórmula legible, datos necesarios, función]
const DEFS = [
  ['razon_corriente', 'Liquidez', 'Razón corriente', 'x', 'Activo corriente ÷ Pasivo corriente', ['activoCorriente', 'pasivoCorriente'], (i) => i.activoCorriente / i.pasivoCorriente],
  ['prueba_acida', 'Liquidez', 'Prueba ácida', 'x', '(Activo corriente − Inventarios) ÷ Pasivo corriente', ['activoCorriente', 'inventarios', 'pasivoCorriente'], (i) => (i.activoCorriente - i.inventarios) / i.pasivoCorriente],
  ['razon_efectivo', 'Liquidez', 'Razón de efectivo', 'x', 'Efectivo ÷ Pasivo corriente', ['efectivo', 'pasivoCorriente'], (i) => i.efectivo / i.pasivoCorriente],
  ['dias_cartera', 'Actividad', 'Días de cartera', 'dias', `Cuentas por cobrar ÷ Ventas × ${DAYS}`, ['cuentasPorCobrar', 'ventas'], (i) => (i.cuentasPorCobrar / i.ventas) * DAYS],
  ['dias_inventario', 'Actividad', 'Días de inventario', 'dias', `Inventarios ÷ Costo de ventas × ${DAYS}`, ['inventarios', 'costoVentas'], (i) => (i.inventarios / i.costoVentas) * DAYS],
  ['dias_proveedores', 'Actividad', 'Días de proveedores', 'dias', `Cuentas por pagar ÷ Costo de ventas × ${DAYS}`, ['cuentasPorPagar', 'costoVentas'], (i) => (i.cuentasPorPagar / i.costoVentas) * DAYS],
  ['rotacion_activos', 'Actividad', 'Rotación de activos', 'x', 'Ventas ÷ Activo total', ['ventas', 'activoTotal'], (i) => i.ventas / i.activoTotal],
  ['endeudamiento', 'Endeudamiento', 'Razón de endeudamiento', 'pct', 'Pasivo total ÷ Activo total', ['pasivoTotal', 'activoTotal'], (i) => i.pasivoTotal / i.activoTotal],
  ['apalancamiento', 'Endeudamiento', 'Apalancamiento', 'x', 'Pasivo total ÷ Patrimonio', ['pasivoTotal', 'patrimonio'], (i) => i.pasivoTotal / i.patrimonio],
  ['cobertura_intereses', 'Endeudamiento', 'Cobertura de intereses', 'x', 'Utilidad operativa ÷ Gasto por intereses', ['utilidadOperativa', 'gastoIntereses'], (i) => i.utilidadOperativa / i.gastoIntereses],
  ['margen_bruto', 'Rentabilidad', 'Margen bruto', 'pct', '(Ventas − Costo de ventas) ÷ Ventas', ['ventas', 'costoVentas'], (i) => (i.ventas - i.costoVentas) / i.ventas],
  ['margen_operativo', 'Rentabilidad', 'Margen operativo', 'pct', 'Utilidad operativa ÷ Ventas', ['utilidadOperativa', 'ventas'], (i) => i.utilidadOperativa / i.ventas],
  ['margen_neto', 'Rentabilidad', 'Margen neto', 'pct', 'Utilidad neta ÷ Ventas', ['utilidadNeta', 'ventas'], (i) => i.utilidadNeta / i.ventas],
  ['roa', 'Rentabilidad', 'Rentabilidad del activo (ROA)', 'pct', 'Utilidad neta ÷ Activo total', ['utilidadNeta', 'activoTotal'], (i) => i.utilidadNeta / i.activoTotal],
  ['roe', 'Rentabilidad', 'Rentabilidad del patrimonio (ROE)', 'pct', 'Utilidad neta ÷ Patrimonio', ['utilidadNeta', 'patrimonio'], (i) => i.utilidadNeta / i.patrimonio],
];

function evalDef([id, group, label, unit, formula, needs, fn], inputs) {
  const missing = needs.filter((k) => !has(inputs[k]));
  let value = null; let reason = null;
  if (missing.length) reason = `Falta: ${missing.map((k) => INPUTS.find(([x]) => x === k)[1]).join(', ')}`;
  else {
    const v = fn(inputs);
    if (Number.isFinite(v)) value = v; else reason = 'El divisor es cero';
  }
  return { id, group, label, unit, formula, value, reason };
}

export function computeRatios(inputs) { return DEFS.map((d) => evalDef(d, inputs)); }

/** DuPont: ROE = margen neto × rotación de activos × multiplicador de capital (activo ÷ patrimonio). */
export function dupont(inputs) {
  const r = Object.fromEntries(computeRatios(inputs).map((x) => [x.id, x]));
  const mult = has(inputs.activoTotal) && has(inputs.patrimonio) && inputs.patrimonio !== 0 ? inputs.activoTotal / inputs.patrimonio : null;
  const parts = { margenNeto: r.margen_neto.value, rotacionActivos: r.rotacion_activos.value, multiplicador: mult };
  const ok = Object.values(parts).every((v) => v !== null);
  return { ...parts, roe: ok ? parts.margenNeto * parts.rotacionActivos * parts.multiplicador : null };
}

export function formatRatio(r) {
  if (r.value === null) return '—';
  if (r.unit === 'pct') return `${(r.value * 100).toFixed(1)} %`;
  if (r.unit === 'dias') return `${Math.round(r.value)} días`;
  return `${r.value.toFixed(2)} veces`;
}

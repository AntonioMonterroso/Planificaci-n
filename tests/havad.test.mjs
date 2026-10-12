import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRatios, dupont, formatRatio } from '../js/core/havad.js';
import { demoInputs } from '../js/demo/havad.js';

const by = (inp) => Object.fromEntries(computeRatios(inp).map((r) => [r.id, r]));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test('son 15 ratios con fórmula visible', () => {
  const rs = computeRatios(demoInputs());
  assert.equal(rs.length, 15);
  assert.ok(rs.every((r) => r.formula && r.value !== null));
});

test('valores a mano con cifras sintéticas', () => {
  const r = by(demoInputs());
  near(r.razon_corriente.value, 760000 / 520000);
  near(r.prueba_acida.value, (760000 - 250000) / 520000);
  near(r.dias_cartera.value, (310000 / 2200000) * 365);
  near(r.margen_bruto.value, 0.3181818181818182);
  near(r.roe.value, 165000 / 750000);
  near(r.cobertura_intereses.value, 6.5);
});

test('DuPont reproduce el ROE', () => {
  const i = demoInputs(); const d = dupont(i);
  near(d.roe, 165000 / 750000);
  near(d.margenNeto * d.rotacionActivos * d.multiplicador, by(i).roe.value);
});

test('sin dato o con divisor cero no se inventa el ratio', () => {
  const i = demoInputs(); delete i.inventarios; i.gastoIntereses = 0;
  const r = by(i);
  assert.equal(r.prueba_acida.value, null); assert.match(r.prueba_acida.reason, /Inventarios/);
  assert.equal(r.cobertura_intereses.value, null); assert.match(r.cobertura_intereses.reason, /cero/);
  assert.equal(r.razon_corriente.value > 0, true);
  assert.equal(formatRatio(r.prueba_acida), '—');
  const bad = demoInputs(); delete bad.ventas;
  assert.equal(dupont(bad).roe, null);
});

test('formato de unidades', () => {
  const r = by(demoInputs());
  assert.equal(formatRatio(r.margen_neto), '7.5 %');
  assert.equal(formatRatio(r.dias_cartera), '51 días');
  assert.equal(formatRatio(r.razon_corriente), '1.46 veces');
});

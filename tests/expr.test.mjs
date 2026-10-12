import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../js/core/expr.js';
import { parseMoney, formatMoney, round2 } from '../js/core/money.js';

test('suma simple dentro de la celda y conserva componentes', () => {
  const r = evaluate('=15773+6955');
  assert.equal(r.ok, true);
  assert.equal(r.value, 22728);
  assert.deepEqual(r.components.map((c) => c.value), [15773, 6955]);
  assert.equal(r.isExpression, true);
});

test('suma de varias partidas con centavos', () => {
  const r = evaluate('=18130.13+29219.75+15375');
  assert.equal(r.value, 62724.88);
  assert.equal(r.components.length, 3);
});

test('formato guatemalteco: Q, comas y paréntesis negativos', () => {
  assert.equal(evaluate('=Q1,654,923.68-47,349.88').value, 1607573.8);
  assert.equal(evaluate('(47,349.88)').value, -47349.88);
  assert.equal(evaluate('Q 3,100.00').value, 3100);
  assert.equal(evaluate('-1200').value, -1200);
});

test('operadores, precedencia, paréntesis y porcentaje', () => {
  assert.equal(evaluate('=2+3*4').value, 14);
  assert.equal(evaluate('=(1200*3)-45.5').value, 3554.5);
  assert.equal(evaluate('=1000*12%').value, 120);
  assert.equal(evaluate('=-(5+5)').value, -10);
  assert.equal(evaluate('=2^3').value, 8);
});

test('componentes respetan el signo de la resta', () => {
  const r = evaluate('=100-30+5');
  assert.deepEqual(r.components.map((c) => c.value), [100, -30, 5]);
});

test('funciones con ; como separador', () => {
  assert.equal(evaluate('=SUMA(10;20;30)').value, 60);
  assert.equal(evaluate('=PROMEDIO(10;20)').value, 15);
  assert.equal(evaluate('=REDONDEAR(2.345;2)').value, 2.35);
  assert.equal(evaluate('=MAX(1;5;3)').value, 5);
});

test('referencias a otras cédulas mediante resolutor', () => {
  const resolve = (sheet, key, col) => {
    assert.equal(sheet, 'A1-4');
    assert.equal(key, 'F28');
    assert.equal(col, null);
    return 250.5;
  };
  const r = evaluate("=A1-4!F28+100", { resolve });
  assert.equal(r.value, 350.5);
  assert.deepEqual(r.refs, [{ sheet: 'A1-4', key: 'F28', col: null }]);
  const q = evaluate("='A1'!TOTAL.audit*2", { resolve: (s, k, c) => { assert.equal(c, 'audit'); return 10; } });
  assert.equal(q.value, 20);
});

test('errores claros y sin ejecutar código', () => {
  assert.equal(evaluate('=1/0').ok, false);
  assert.equal(evaluate('=1+').ok, false);
  assert.equal(evaluate('=alert(1)').ok, false);
  assert.equal(evaluate('=constructor.constructor("return 1")()').ok, false);
  assert.equal(evaluate('=process.exit()').ok, false);
  assert.equal(evaluate('=A1+1').ok, false); // sin resolutor
  assert.equal(evaluate('=' + '('.repeat(100) + '1' + ')'.repeat(100)).ok, false);
});

test('vacío vale cero', () => {
  const r = evaluate('');
  assert.equal(r.ok, true);
  assert.equal(r.value, 0);
});

test('money: parseo, formato y redondeo', () => {
  assert.equal(parseMoney('Q1,654,923.68'), 1654923.68);
  assert.ok(Number.isNaN(parseMoney('12,34')));
  assert.equal(formatMoney(-47349.88), '(Q47,349.88)');
  assert.equal(formatMoney(1654923.68), 'Q1,654,923.68');
  assert.equal(formatMoney(0), '-');
  assert.equal(round2(1.005), 1.01);
});

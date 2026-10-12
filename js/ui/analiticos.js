// Analíticos: 15 ratios con fórmula visible y DuPont. Las cifras se teclean o se pegan; si falta un dato, el ratio lo dice.
import { h } from './dom.js';
import { pageHead, card, banner, chip, btn } from './kit.js';
import { copyButton, tableToTSV } from './copy.js';
import { barOf } from './perfil.js';
import { INPUTS, computeRatios, dupont, formatRatio } from '../core/havad.js';
import { parseMoney } from '../core/money.js';

const GROUP_TONE = { Liquidez: 'sky', Actividad: 'lav', Endeudamiento: 'sun', Rentabilidad: 'mint' };

export function analiticosView(ctx) {
  const inp = ctx.havad;
  const ratios = computeRatios(inp);
  const dp = dupont(inp);
  const missing = ratios.filter((r) => r.value === null);

  const fields = INPUTS.map(([key, label]) => {
    const input = h('input', { id: `hv-${key}`, type: 'text', inputmode: 'decimal', value: Number.isFinite(inp[key]) ? String(inp[key]) : '' });
    input.addEventListener('change', () => {
      const raw = input.value.trim();
      if (raw === '') delete inp[key];
      else { const n = parseMoney(raw); if (Number.isFinite(n)) inp[key] = n; }
      ctx.rerender();
    });
    return h('div', { class: 'field' }, h('label', { for: `hv-${key}` }, label), input);
  });

  const groups = [...new Set(ratios.map((r) => r.group))];
  const table = h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, ['Ratio', 'Resultado', 'Fórmula'].map((t, i) => h('th', { scope: 'col', class: i === 2 ? 'hide-sm' : '' }, t)))),
    h('tbody', {}, groups.flatMap((g) => [
      h('tr', {}, h('td', { colspan: 3 }, chip(GROUP_TONE[g], g))),
      ...ratios.filter((r) => r.group === g).map((r) => h('tr', {},
        h('td', {}, h('b', {}, r.label), r.reason ? h('div', { class: 'tiny' }, r.reason) : null),
        h('td', { class: 'num' }, formatRatio(r)),
        h('td', { class: 'hide-sm tiny' }, r.formula))),
    ]))));

  const dpRow = (label, v, fmt) => h('div', { class: 'occ' }, h('div', {}, h('b', {}, label)), h('span', {}, v === null ? '—' : fmt(v)));
  const dupontCard = card({ title: 'DuPont · de dónde viene la rentabilidad' },
    dpRow('Margen neto', dp.margenNeto, (v) => `${(v * 100).toFixed(1)} %`),
    dpRow('× Rotación de activos', dp.rotacionActivos, (v) => `${v.toFixed(2)} veces`),
    dpRow('× Multiplicador de capital (Activo ÷ Patrimonio)', dp.multiplicador, (v) => `${v.toFixed(2)} veces`),
    dpRow('= ROE', dp.roe, (v) => `${(v * 100).toFixed(1)} %`),
    dp.roe !== null ? h('div', {}, h('div', { class: 'tiny' }, 'ROE frente a 40 %'), barOf(Math.min(dp.roe / 0.4, 1))) : null);

  const tsv = () => tableToTSV([['Ratio', 'Resultado', 'Fórmula'], ...ratios.map((r) => [r.label, formatRatio(r), r.formula])]);

  return h('div', { class: 'view' },
    pageHead({ eyebrow: `${ctx.eng.client.code} · ${ctx.eng.client.name}`, title: 'Analíticos',
      sub: 'Quince ratios estándar con su fórmula a la vista. Saldos finales del periodo y 365 días. Compáralos con el HAVAD de la firma antes de usarlos en un papel de trabajo.',
      actions: [copyButton(tsv, { label: 'Tabla copiada', text: 'Copiar tabla', cls: 'btn sm' })] }),
    missing.length ? banner('warn', `${missing.length} ratio${missing.length > 1 ? 's' : ''} sin calcular por falta de datos o divisor en cero. No se inventan cifras.`) : null,
    card({ title: 'Cifras de partida (sintéticas en la demostración)' }, h('div', { class: 'grid cols-3' }, fields)),
    card({ title: 'Ratios', flush: true }, table),
    dupontCard);
}

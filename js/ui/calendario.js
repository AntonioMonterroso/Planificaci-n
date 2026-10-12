// Calendario: plazos del encargo y obligaciones legales registradas con su fuente oficial.
import { h } from './dom.js';
import { pageHead, card, banner, chip, btn, fmtDateEs } from './kit.js';
import { toast } from './copy.js';
import { KIND_LABEL, buildEvents, summarize, byMonth, addObligation, validateObligation } from '../core/calendario.js';

const ST = { hecho: ['mint', 'Hecho', 'check'], vencido: ['rose', 'Vencido', 'alert'], proximo: ['sun', 'Próximo', 'clock'], futuro: ['plain', 'Pendiente', 'clock'] };
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const monthName = (k) => `${MONTHS[Number(k.slice(5)) - 1]} de ${k.slice(0, 4)}`;

export function calendarioView(ctx) {
  const eng = ctx.eng; eng.obligations ??= [];
  const events = buildEvents(eng, ctx.today, eng.obligations);
  const sum = summarize(events);
  const me = ctx.sb?.user?.id ?? 'u-demo';

  const title = h('input', { id: 'ob-title', type: 'text', placeholder: 'Ej. Presentación de una declaración' });
  const date = h('input', { id: 'ob-date', type: 'date' });
  const source = h('input', { id: 'ob-source', type: 'text', placeholder: 'Ley, artículo o enlace oficial (obligatorio)' });
  const add = () => {
    try { addObligation(eng.obligations, { title: title.value, date: date.value, source: source.value, by: me }); toast('Obligación registrada: queda sin validar'); ctx.rerender(); }
    catch (e) { toast(e.message); }
  };
  const form = card({ title: 'Registrar una obligación legal' },
    h('p', { class: 'tiny' }, 'El sistema no trae fechas legales de fábrica. Registra la obligación con su fuente oficial; otra persona del equipo la valida. La parte legal la confirman el auditor y su asesor.'),
    h('div', { class: 'grid cols-3' },
      h('div', { class: 'field' }, h('label', { for: 'ob-title' }, 'Obligación'), title),
      h('div', { class: 'field' }, h('label', { for: 'ob-date' }, 'Fecha límite'), date),
      h('div', { class: 'field' }, h('label', { for: 'ob-source' }, 'Fuente oficial'), source)),
    h('div', { class: 'row' }, btn('Registrar', { iconName: 'plus', onClick: add })));

  const validate = (id) => {
    const o = eng.obligations.find((x) => x.id === id);
    try { validateObligation(o, me === o.createdBy ? 'Validador (demo)' : me); toast('Obligación validada'); ctx.rerender(); } catch (e) { toast(e.message); }
  };
  const row = (e) => {
    const [tone, label, ic] = ST[e.status];
    return h('div', { class: 'occ' },
      h('div', {}, h('b', {}, e.title),
        h('div', { class: 'who' }, `${KIND_LABEL[e.kind]} · ${fmtDateEs(e.date)} · ${e.status === 'hecho' ? 'cumplido' : e.daysLeft >= 0 ? `en ${e.daysLeft} d` : `hace ${-e.daysLeft} d`}`),
        e.source ? h('div', { class: 'tiny' }, `Fuente: ${e.source}`) : null),
      h('div', { class: 'row' },
        e.kind === 'obligacion' ? (e.validatedBy ? chip('mint', 'Validada', 'check') : [chip('sun', 'Sin validar', 'alert'), btn('Validar', { cls: 'sm', onClick: () => validate(e.id) })]) : null,
        chip(tone, label, ic)));
  };

  const months = byMonth(events).map(([k, list]) => card({ title: monthName(k) }, h('div', {}, list.map(row))));

  return h('div', { class: 'view' },
    pageHead({ eyebrow: `${eng.client.code} · ${eng.client.name}`, title: 'Calendario',
      sub: 'Plazos del encargo (hitos, informe, armado del archivo, documentos del cliente, tareas) y obligaciones legales con su fuente.' }),
    sum.vencidos ? banner('error', `${sum.vencidos} plazo${sum.vencidos > 1 ? 's' : ''} vencido${sum.vencidos > 1 ? 's' : ''}.`) : null,
    sum.sinValidar ? banner('warn', `${sum.sinValidar} obligación${sum.sinValidar > 1 ? 'es' : ''} legal${sum.sinValidar > 1 ? 'es' : ''} sin validar.`) : null,
    h('div', { class: 'row' }, chip('rose', `${sum.vencidos} vencidos`), chip('sun', `${sum.proximos} en los próximos 7 días`)),
    form, ...months);
}

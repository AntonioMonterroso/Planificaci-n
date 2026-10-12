// Biblioteca de formatos: cuestionarios y checklists como datos, con respuestas, avance, alertas y firmas (cuatro ojos).
import { h } from './dom.js';
import { pageHead, card, banner, chip, btn } from './kit.js';
import { toast } from './copy.js';
import { barOf } from './perfil.js';
import { FORMATOS, formatoById } from '../formatos/index.js';
import { newResponse, setAnswer, summarize, proposedFactors, closeBlockers, itemsOf } from '../core/formato.js';
import { ROLES } from '../core/engagement.js';

const SIGN = [['elaboro', 'Elaboró'], ['reviso', 'Revisó'], ['autorizo', 'Autorizó']];

export function bibliotecaView(ctx, id) {
  const f = id ? formatoById(id) : null;
  return f ? formatoView(ctx, f) : listaView(ctx);
}

function listaView(ctx) {
  const q = h('input', { id: 'bib-q', type: 'search', placeholder: 'Buscar por nombre o norma…', 'aria-label': 'Buscar formatos', value: ctx.bibQuery ?? '' });
  q.addEventListener('input', () => { ctx.bibQuery = q.value; ctx.keepScroll = true; ctx.rerender(); ctx.keepScroll = false; document.getElementById('bib-q')?.focus(); });
  const term = (ctx.bibQuery ?? '').toLowerCase().trim();
  const shown = FORMATOS.filter((f) => !term || `${f.titulo} ${f.norma}`.toLowerCase().includes(term));
  return h('div', { class: 'view' },
    pageHead({ eyebrow: 'Biblioteca', title: 'Formatos de trabajo',
      sub: 'Cuestionarios y checklists de la firma como datos: se responden en pantalla, no se cierran con pendientes y exigen tres personas distintas. Los demás se agregan con scripts/extraer_formato.py.' }),
    card({}, h('div', { class: 'field' }, h('label', { for: 'bib-q' }, 'Buscar'), q)),
    h('div', { class: 'grid cols-2' }, shown.length ? shown.map((f) => {
      const resp = ctx.formatos?.[f.id]; const s = resp ? summarize(f, resp) : null;
      return card({ title: f.titulo }, h('div', { class: 'stack' },
        h('div', { class: 'row' }, chip('gold', f.norma), chip('plain', `${itemsOf(f).length} preguntas`), s ? chip(s.pendientes ? 'sun' : 'mint', `${s.respondidos} de ${s.total}`) : null),
        h('p', { class: 'tiny' }, f.objetivo),
        h('div', { class: 'row' }, h('a', { class: 'btn sm', href: `#/biblioteca/${f.id}` }, s ? 'Continuar' : 'Abrir'))));
    }) : [h('p', { class: 'muted' }, 'Ningún formato coincide con la búsqueda.')]));
}

function formatoView(ctx, f) {
  ctx.formatos ??= {};
  const resp = (ctx.formatos[f.id] ??= newResponse(f));
  const sum = summarize(f, resp);
  const blockers = closeBlockers(f, resp);
  const factors = proposedFactors(f, resp);
  const redraw = () => { ctx.keepScroll = true; ctx.rerender(); ctx.keepScroll = false; };
  const put = (itemId, patch) => {
    const cur = resp.answers[itemId] ?? {};
    try { setAnswer(f, resp, itemId, { valor: cur.valor, ref: cur.ref ?? '', comentario: cur.comentario ?? '', ...patch }); } catch (e) { toast(e.message); }
    redraw();
  };

  const allowed = f.respuestas ?? ['SI', 'NO', 'NA'];
  const itemRow = (it) => {
    const a = resp.answers[it.id];
    const needsOrigin = a && a.valor === (f.valorQueExigeOrigen ?? 'SI') && !a.ref && !a.comentario;
    const ref = h('input', { type: 'text', value: a?.ref ?? '', placeholder: 'Ref. P/T', 'aria-label': `Referencia de papel de trabajo para ${it.id}`, disabled: !a });
    ref.addEventListener('change', () => put(it.id, { ref: ref.value }));
    const com = h('input', { type: 'text', value: a?.comentario ?? '', placeholder: 'Comentario', 'aria-label': `Comentario para ${it.id}`, disabled: !a });
    com.addEventListener('change', () => put(it.id, { comentario: com.value }));
    return h('div', { class: 'occ' },
      h('div', {},
        h('div', {}, it.texto),
        h('div', { class: 'row' }, ref, com),
        needsOrigin ? h('div', { class: 'tiny' }, 'Falta la referencia a papel de trabajo o un comentario.') : null),
      h('div', { class: 'row', role: 'group', 'aria-label': `Respuesta a ${it.id}` }, allowed.map((v) =>
        h('button', { type: 'button', class: `btn sm${a?.valor === v ? ' on' : ''}`, 'aria-pressed': String(a?.valor === v), onClick: () => put(it.id, { valor: a?.valor === v ? '' : v }) }, v))));
  };

  const sections = f.secciones.map((s, i) => {
    const r = sum.secciones[i];
    return card({ title: s.nombre, actions: chip(r.pendientes ? 'sun' : 'mint', `${r.total - r.pendientes} de ${r.total}`) },
      s.descripcion ? h('p', { class: 'tiny' }, s.descripcion) : null, h('div', {}, s.items.map(itemRow)));
  });

  const staff = ctx.eng.staff;
  const signs = card({ title: 'Firmas (cuatro ojos)' }, h('div', { class: 'grid cols-3' }, SIGN.map(([k, label]) => {
    const sel = h('select', { id: `sg-${k}`, 'aria-label': label }, [h('option', { value: '' }, 'Sin firmar'),
      ...staff.map((p) => h('option', { value: p.id, selected: resp.signoffs[k] === p.id }, `${p.name} · ${ROLES[p.role].label}`))]);
    sel.addEventListener('change', () => { if (sel.value) resp.signoffs[k] = sel.value; else delete resp.signoffs[k]; redraw(); });
    return h('div', { class: 'field' }, h('label', { for: `sg-${k}` }, label), sel);
  })));

  const pct = sum.total ? sum.respondidos / sum.total : 0;
  return h('div', { class: 'view' },
    pageHead({ eyebrow: f.norma, title: f.titulo, sub: f.objetivo, actions: [h('a', { class: 'btn sm', href: '#/biblioteca' }, 'Todos los formatos')] }),
    card({}, h('div', { class: 'stack' },
      h('div', { class: 'row' }, h('b', {}, `${sum.respondidos} de ${sum.total} respondidas`), h('span', { class: 'grow' }), blockers.length ? chip('sun', 'No se puede cerrar', 'alert') : chip('mint', 'Listo para cerrar', 'check')),
      barOf(pct, blockers.length ? '' : 'ok'))),
    blockers.length ? banner('warn', blockers.slice(0, 4).join(' · ') + (blockers.length > 4 ? ` · y ${blockers.length - 4} más` : '')) : null,
    ...sections,
    factors.length ? card({ title: 'Propuesta para la conclusión' },
      h('p', { class: 'tiny' }, 'Claude propone, el auditor decide. Factores con al menos una respuesta SI:'),
      h('div', { class: 'row' }, factors.map((x) => chip('lav', `${x.nombre} (${x.cantidad})`)))) : null,
    signs);
}

// Cumplimiento legal: perfil del cliente → áreas que aplican, cada una por sí sola o todas en conjunto.
// Las referencias dicen qué se consultó y qué falta verificar; la vigencia de la norma la confirma otra persona.
import { h } from './dom.js';
import { pageHead, card, banner, chip, btn, fmtDateEs } from './kit.js';
import { toast } from './copy.js';
import { AREAS, PERFIL_CAMPOS } from '../legal/catalogo.js';
import { applicableAreas, newLegalState, setStatus, confirmNorms, summarizeArea, summarizeAll } from '../core/legal.js';

const SEM = { verde: ['mint', 'En orden', 'check'], ambar: ['sun', 'En proceso', 'clock'], rojo: ['rose', 'Con hallazgos', 'alert'] };
const EST = [['cumple', 'Cumple'], ['incumple', 'Incumple'], ['no_aplica', 'No aplica']];

export function legalView(ctx, areaId) {
  ctx.legalPerfil ??= { comerciante: true, tieneEmpleados: true };
  const state = (ctx.legal ??= newLegalState());
  const me = ctx.sb?.user?.id ?? 'u-demo';
  const redraw = () => { ctx.keepScroll = true; ctx.rerender(); ctx.keepScroll = false; };
  const areas = applicableAreas(ctx.legalPerfil);
  const all = summarizeAll(ctx.legalPerfil, state);
  const area = areaId ? areas.find((a) => a.id === areaId) : null;

  const perfil = card({ title: 'Perfil legal del cliente' },
    h('p', { class: 'tiny' }, 'Según el perfil se activan las áreas que aplican. Puedes revisar una sola o todas en conjunto.'),
    h('div', { class: 'row' }, PERFIL_CAMPOS.map(([k, label]) =>
      h('button', { type: 'button', class: `btn sm${ctx.legalPerfil[k] ? ' on' : ''}`, 'aria-pressed': String(!!ctx.legalPerfil[k]), onClick: () => { ctx.legalPerfil[k] = !ctx.legalPerfil[k]; redraw(); } }, label))));

  const tabs = h('div', { class: 'row' },
    h('a', { class: `btn sm${area ? '' : ' on'}`, href: '#/legal' }, 'En conjunto'),
    areas.map((a) => h('a', { class: `btn sm${area?.id === a.id ? ' on' : ''}`, href: `#/legal/${a.id}` }, a.nombre)));

  const head = pageHead({ eyebrow: `${ctx.eng.client.code} · ${ctx.eng.client.name}`, title: 'Cumplimiento legal',
    sub: 'Cada área por separado y todas en conjunto. El sistema no trae fechas legales ni artículos de memoria: cita instrumentos con su fuente y dice qué falta verificar. La validación final es del auditor y su asesor legal.' });

  if (!area) {
    const [tone, label, ic] = SEM[all.semaforo];
    const cards = all.areas.map((s) => {
      const [t, l, i] = SEM[s.semaforo];
      return card({ title: s.nombre }, h('div', { class: 'stack' },
        h('div', { class: 'row' }, chip(t, l, i), chip('plain', `${s.total - s.conteo.pendiente} de ${s.total}`), s.alertas ? chip('rose', 'Alerta de norma', 'alert') : s.sinNorma ? chip('sun', 'Norma por citar') : null),
        h('div', { class: 'row' }, h('a', { class: 'btn sm', href: `#/legal/${s.id}` }, 'Abrir'))));
    });
    return h('div', { class: 'view' }, head, perfil, tabs,
      card({}, h('div', { class: 'row' }, chip(tone, `En conjunto: ${label}`, ic), chip('rose', `${all.rojas} con hallazgos`), chip('sun', `${all.ambar} en proceso`), chip('mint', `${all.verdes} en orden`))),
      h('div', { class: 'grid cols-2' }, cards));
  }

  const sum = summarizeArea(area, state);
  const refs = area.referencias.length
    ? area.referencias.map((r) => h('div', { class: `occ${r.alerta ? ' alerta' : ''}` },
      h('div', {}, h('b', {}, r.titulo), h('div', { class: 'tiny' }, `${r.alcance} · consultado el ${fmtDateEs(r.consultadoEl)}`),
        h('a', { href: r.fuente, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir la fuente oficial')),
      r.alerta ? chip('rose', 'Alerta', 'alert') : chip('sun', 'Por confirmar vigencia')))
    : [banner('warn', 'Norma por citar: no hay referencia con fuente oficial para esta área. Cítala antes de concluir.')];

  const reqRow = (r) => {
    const a = state.answers[r.id];
    const put = (patch) => { try { setStatus(state, r.id, { estado: a?.estado, ref: a?.ref, comentario: a?.comentario, by: me, ...patch }); } catch (e) { toast(e.message); } redraw(); };
    const ref = h('input', { type: 'text', value: a?.ref ?? '', placeholder: 'Ref. evidencia', 'aria-label': `Referencia de evidencia de ${r.id}`, disabled: !a });
    ref.addEventListener('change', () => put({ ref: ref.value }));
    const com = h('input', { type: 'text', value: a?.comentario ?? '', placeholder: 'Comentario', 'aria-label': `Comentario de ${r.id}`, disabled: !a });
    com.addEventListener('change', () => put({ comentario: com.value }));
    return h('div', { class: 'occ' },
      h('div', {}, h('div', {}, r.texto), h('div', { class: 'row' }, ref, com)),
      h('div', { class: 'row', role: 'group', 'aria-label': `Estado de ${r.id}` }, EST.map(([v, l]) =>
        h('button', { type: 'button', class: `btn sm${a?.estado === v ? ' on' : ''}`, 'aria-pressed': String(a?.estado === v), onClick: () => put({ estado: a?.estado === v ? '' : v }) }, l))));
  };

  const confirm = () => {
    const evaluo = area.requisitos.some((r) => state.answers[r.id]?.by === me); // en la demostración hay un solo usuario
    try { confirmNorms(state, area.id, evaluo ? 'Validador (demo)' : me); toast('Vigencia de la norma confirmada'); redraw(); } catch (e) { toast(e.message); }
  };
  const [tone, label, ic] = SEM[sum.semaforo];
  return h('div', { class: 'view' }, head, perfil, tabs,
    card({ title: area.nombre }, h('div', { class: 'row' }, chip(tone, label, ic), chip('plain', `${sum.total - sum.conteo.pendiente} de ${sum.total} revisados`)),
      sum.issues.length ? banner('warn', sum.issues.join(' · ')) : null),
    card({ title: 'Normas consultadas' }, h('div', {}, refs)),
    card({ title: 'Revisión' }, h('div', {}, area.requisitos.map(reqRow)),
      h('p', { class: 'tiny' }, 'Preguntas guía propuestas por Claude: no son texto de ley. El asesor las ajusta.')),
    card({ title: 'Vigencia de la norma' },
      sum.confirmed ? chip('mint', `Confirmada por ${state.confirmations[area.id].by} el ${fmtDateEs(state.confirmations[area.id].on)}`, 'check')
        : h('div', { class: 'row' }, chip('sun', 'Sin confirmar', 'alert'), btn('Confirmar vigencia', { cls: 'sm', onClick: confirm }),
          h('span', { class: 'tiny' }, 'La confirma otra persona distinta de quien evaluó (cuatro ojos). En la demostración, un validador ficticio simula a la segunda.'))));
}

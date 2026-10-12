// Bandeja de Claude: pedir, ver entregas con su evidencia y aceptar o pedir cambios. Claude propone; tú decides.
import { h } from './dom.js';
import { pageHead, card, banner, chip, btn } from './kit.js';
import { toast } from './copy.js';
import { KINDS, STATUS_LABEL } from '../core/bandeja.js';
import { makeCipher } from '../core/crypto.js';

const TONE = { pendiente: 'sun', en_proceso: 'sky', entregado: 'gold', aceptado: 'mint', cambios: 'rose' };
const EV_LABEL = { celda: 'Cédula/celda', norma: 'Norma', ley: 'Ley', documento: 'Documento' };

export function bandejaView(ctx) {
  const api = ctx.bandeja; const ib = api.inbox;
  const counts = ib.counts();

  const kind = h('select', { id: 'b-kind' }, Object.entries(KINDS).map(([k, l]) => h('option', { value: k }, l)));
  const ref = h('input', { id: 'b-ref', type: 'text', placeholder: 'Ej. A1-4!F28 (opcional)' });
  const q = h('textarea', { id: 'b-q', rows: 3, placeholder: 'Escribe la pregunta o lo que necesitas…' });
  const send = async () => {
    try { await api.ask({ kind: kind.value, targetRef: ref.value.trim() || null, question: q.value }); toast('Solicitud enviada a Claude'); ctx.rerender(); }
    catch (e) { toast(e.message); }
  };
  const form = card({ title: 'Pedir a Claude' },
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'field' }, h('label', { for: 'b-kind' }, 'Qué necesitas'), kind),
      h('div', { class: 'field' }, h('label', { for: 'b-ref' }, 'Cédula, celda o documento'), ref)),
    h('div', { class: 'field' }, h('label', { for: 'b-q' }, 'Pregunta'), q),
    h('div', { class: 'row' }, btn('Enviar', { iconName: 'sparkle', onClick: send }),
      h('span', { class: 'tiny' }, 'Claude trabaja cuando abres una sesión; la bandeja no es en tiempo real.')));

  const decide = async (r, accept) => {
    try { await api.decide(r.id, accept); toast(accept ? 'Entrega aceptada' : 'Cambios solicitados'); ctx.rerender(); }
    catch (e) { toast(e.message); }
  };
  const item = (r) => {
    const d = ib.deliveryOf(r.id);
    return h('div', { class: 'occ bandeja-item' },
      h('div', {},
        h('b', {}, KINDS[r.kind]), r.targetRef ? h('span', { class: 'tiny' }, ` · ${r.targetRef}`) : null,
        h('div', { class: 'who' }, r.question),
        d ? h('div', { class: 'entrega' },
          h('p', {}, d.body),
          d.evidence.length ? h('div', { class: 'row' }, d.evidence.map((e) => chip('lav', `${EV_LABEL[e.tipo]}: ${e.ref}`))) : null,
          d.missing ? banner('warn', `Falta el dato: ${d.missing}`) : null,
          d.draft ? h('div', { class: 'tiny' }, 'Incluye un borrador que se aplica solo si aceptas.') : null,
          r.status === 'entregado' ? h('div', { class: 'row' },
            btn('Aceptar', { iconName: 'check', cls: 'sm', onClick: () => decide(r, true) }),
            btn('Pedir cambios', { cls: 'sm ghost', onClick: () => decide(r, false) })) : null) : null),
      chip(TONE[r.status], STATUS_LABEL[r.status]));
  };

  const pass = h('input', { id: 'b-pass', type: 'password', autocomplete: 'off', placeholder: 'Mínimo 12 caracteres' });
  const unlockCard = !api.unlocked ? card({ title: 'Desbloquear contenido' },
    h('p', { class: 'tiny' }, 'Las preguntas y entregas se guardan cifradas. Escribe tu frase de cifrado (la misma de Cédulas); no se guarda en ninguna parte y se pide de nuevo al recargar.'),
    h('div', { class: 'field' }, h('label', { for: 'b-pass' }, 'Frase de cifrado'), pass),
    h('div', { class: 'row' }, btn('Desbloquear', { iconName: 'shield', onClick: async () => {
      try { if (pass.value.length < 12) throw new Error('La frase debe tener al menos 12 caracteres'); await api.unlock(makeCipher(pass.value)); toast('Contenido desbloqueado'); ctx.rerender(); }
      catch (e) { toast(e.message); }
    } }))) : null;

  const list = ib.requests.length
    ? [...ib.requests].reverse().map(item)
    : [h('p', { class: 'muted' }, 'Aún no hay solicitudes.')];

  return h('div', { class: 'view' },
    pageHead({ eyebrow: api.engagement ? `Conectado · ${api.engagement.title}` : `${ctx.eng.client.code} · ${ctx.eng.client.name} (demostración)`, title: 'Bandeja de Claude',
      sub: 'Pide revisiones, explicaciones y borradores. Cada entrega cita su evidencia (cédula/celda, norma o ley) o dice qué dato falta. Claude no firma, no cierra fases ni aprueba ajustes.' }),
    counts.entregado ? banner('info', `${counts.entregado} entrega${counts.entregado > 1 ? 's' : ''} esperan tu decisión.`) : null,
    unlockCard,
    form,
    card({ title: 'Solicitudes y entregas', flush: true }, h("div", { class: "grid" }, list)));
}

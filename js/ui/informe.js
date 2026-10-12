// Informe y cartas: secciones editables con variables, verificaciones previas, firmas (cuatro ojos), versiones y exportación.
import { h } from './dom.js';
import { pageHead, card, banner, chip, btn, fmtDateEs } from './kit.js';
import { toast, copyText } from './copy.js';
import { PLANTILLAS, OPINIONES } from '../informe/plantillas.js';
import { newDocument, setSection, setNoAplica, setOpinion, variablesOf, blockers, sign, unlock, render, toText, toHtml, precheck, unresolved } from '../core/informe.js';
import { resolveOccupations, occupationSummary } from '../core/engagement.js';
import { summarizeAll, newLegalState } from '../core/legal.js';
import { closeBlockers, newResponse } from '../core/formato.js';
import { FORMATOS } from '../formatos/index.js';
import { ROLES } from '../core/engagement.js';

const SIGN = [['elaboro', 'Elaboró'], ['reviso', 'Revisó'], ['autorizo', 'Autorizó']];

function checksOf(ctx) {
  const eng = ctx.eng;
  const occ = occupationSummary(resolveOccupations(eng.staff, ctx.today, { highRisk: eng.highRisk, overrides: eng.overrides }));
  return precheck({
    ledgerErrors: ctx.ledger.issues.filter((i) => i.severity === 'error').length,
    pbcSinVerificar: eng.docs.filter((d) => d.status !== 'aceptado').length,
    legalRojas: summarizeAll(ctx.legalPerfil ?? { comerciante: true, tieneEmpleados: true }, ctx.legal ?? newLegalState()).rojas,
    formatosPendientes: FORMATOS.filter((f) => closeBlockers(f, ctx.formatos?.[f.id] ?? newResponse(f)).length).length,
    vacantes: occ.vacante,
  });
}

function download(name, mime, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name });
  document.body.append(a); a.click(); a.remove();
}

export function informeView(ctx, type) {
  ctx.docs ??= {};
  const t = PLANTILLAS[type] ? type : 'informe';
  const doc = (ctx.docs[t] ??= newDocument(t));
  const locked = doc.status === 'firmado';
  const vars = variablesOf({ header: ctx.ledger.header, contract: ctx.eng.contract }, fmtDateEs);
  const checks = checksOf(ctx);
  const bl = blockers(doc, vars, checks);
  const me = ctx.sb?.user?.id ?? 'u-demo';
  const redraw = () => { ctx.keepScroll = true; ctx.rerender(); ctx.keepScroll = false; };
  const act = (fn, msg) => () => { try { fn(); if (msg) toast(msg); } catch (e) { toast(e.message); } redraw(); };

  const tabs = h('div', { class: 'row' }, Object.entries(PLANTILLAS).map(([k, p]) => h('a', { class: `btn sm${k === t ? ' on' : ''}`, href: `#/informe/${k}` }, p.titulo)));

  const opinion = doc.type === 'informe' ? card({ title: 'Tipo de opinión' },
    h('div', { class: 'row', role: 'group', 'aria-label': 'Tipo de opinión' }, Object.entries(OPINIONES).map(([k, l]) =>
      h('button', { type: 'button', class: `btn sm${doc.opinion === k ? ' on' : ''}`, 'aria-pressed': String(doc.opinion === k), disabled: locked, onClick: act(() => setOpinion(doc, k)) }, l))),
    h('p', { class: 'tiny' }, 'El tipo de opinión lo decide el auditor con base en la evidencia; aquí solo orienta la redacción.')) : null;

  const sections = doc.sections.map((s) => {
    const ta = h('textarea', { rows: 4, 'aria-label': s.titulo, disabled: locked || s.noAplica }, s.texto);
    ta.addEventListener('change', act(() => setSection(doc, s.id, ta.value)));
    const miss = unresolved(s.texto, vars);
    return card({ title: s.titulo, actions: h('button', { type: 'button', class: `btn sm${s.noAplica ? ' on' : ''}`, 'aria-pressed': String(s.noAplica), disabled: locked, onClick: act(() => setNoAplica(doc, s.id, !s.noAplica)) }, 'No aplica') },
      h('p', { class: 'tiny' }, s.guia), h('div', { class: 'field' }, ta),
      miss.length ? h('div', { class: 'tiny' }, `Faltan datos para: ${miss.join(', ')}`) : null);
  });

  const staff = ctx.eng.staff;
  const signs = card({ title: 'Firmas (cuatro ojos)' }, h('div', { class: 'grid cols-3' }, SIGN.map(([k, label]) => {
    const sel = h('select', { id: `ds-${k}`, 'aria-label': label, disabled: locked }, [h('option', { value: '' }, 'Sin firmar'),
      ...staff.map((p) => h('option', { value: p.id, selected: doc.signoffs[k] === p.id }, `${p.name} · ${ROLES[p.role].label}`))]);
    sel.addEventListener('change', () => { if (sel.value) doc.signoffs[k] = sel.value; else delete doc.signoffs[k]; redraw(); });
    return h('div', { class: 'field' }, h('label', { for: `ds-${k}` }, label), sel);
  })));

  const motivo = h('input', { id: 'unlock-motivo', type: 'text', placeholder: 'Motivo formal del desbloqueo' });
  const status = locked
    ? card({ title: 'Documento firmado' }, h('div', { class: 'row' }, chip('mint', `Firmado · versión ${doc.version}`, 'check'),
      motivo, btn('Desbloquear (crea versión nueva)', { cls: 'sm', onClick: act(() => unlock(doc, { by: me, motivo: motivo.value }), 'Versión nueva abierta en borrador') })))
    : card({ title: 'Antes de firmar' },
      h('div', {}, checks.map((c) => h('div', { class: 'occ' }, h('div', {}, c.label), c.ok ? chip('mint', 'En orden', 'check') : chip('rose', 'Pendiente', 'alert')))),
      bl.length ? banner('warn', `${bl.length} pendiente${bl.length > 1 ? 's' : ''}: ${bl.slice(0, 3).join(' · ')}${bl.length > 3 ? ' · …' : ''}`) : null,
      h('div', { class: 'row' }, btn('Firmar', { iconName: 'check', onClick: act(() => sign(doc, vars, checks, me), 'Documento firmado') }),
        h('span', { class: 'tiny' }, 'Claude no firma: la firma es de una persona del equipo.')));

  const safe = t;
  const exports = card({ title: 'Exportar' }, h('div', { class: 'row' },
    btn('Copiar texto', { iconName: 'copy', cls: 'sm', onClick: () => copyText(toText(doc, vars), 'Texto copiado') }),
    btn('Descargar para Word (.html)', { iconName: 'file', cls: 'sm', onClick: () => download(`${safe}-v${doc.version}.html`, 'text/html', toHtml(doc, vars)) }),
    btn('Imprimir o guardar PDF', { iconName: 'file', cls: 'sm', onClick: () => window.print() })),
    doc.status === 'borrador' ? h('p', { class: 'tiny' }, 'Mientras no esté firmado, el documento se exporta marcado como borrador.') : null);

  const hist = doc.historial.length ? card({ title: 'Historial de versiones' }, h('div', {}, doc.historial.map((v) =>
    h('div', { class: 'occ' }, h('div', {}, h('b', {}, `Versión ${v.version}`), h('div', { class: 'tiny' }, `Desbloqueada: ${v.motivo}`)), chip('plain', 'Firmada'))))) : null;

  return h('div', { class: 'view' },
    pageHead({ eyebrow: `${ctx.eng.client.code} · ${ctx.eng.client.name}`, title: 'Informe y cartas',
      sub: 'Plantillas con estructura y guía; el texto lo redacta y firma el auditor y lo contrasta con la norma aplicable. Variables entre llaves se completan con los datos del encargo.' }),
    tabs, banner('info', `Borrador de trabajo · versión ${doc.version} · ${locked ? 'firmado' : 'sin firmar'}`),
    opinion, ...sections, signs, status, exports, hist);
}

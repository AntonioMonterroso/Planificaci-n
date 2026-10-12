// Botón de copiar universal + avisos (toasts).
import { h } from './dom.js';
import { icon } from './icons.js';

export function toast(msg) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = h('div', { class: 'toast', role: 'status', text: msg });
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 1600);
}

export async function copyText(text, label = 'Copiado') {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else throw new Error('sin clipboard');
  } catch {
    const ta = h('textarea', { 'aria-hidden': 'true' });
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* sin permiso */ }
    ta.remove();
  }
  toast(`${label}: ${text.length > 40 ? text.slice(0, 40) + '…' : text}`);
}

/** Botón de copiar con icono. `text` = rótulo opcional junto al icono. */
export function copyButton(getText, { label = 'Copiado', title = 'Copiar', text = '', cls = 'btn sm ghost' } = {}) {
  return h('button', {
    type: 'button', class: cls, title, 'aria-label': title,
    onClick: (e) => { e.stopPropagation(); copyText(typeof getText === 'function' ? getText() : getText, label); },
  }, icon('copy', 16), text);
}

/** Tabla -> texto tabulado (pega bien en Excel y Word). */
export function tableToTSV(rows) {
  return rows.map((r) => r.map((c) => String(c ?? '').replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
}

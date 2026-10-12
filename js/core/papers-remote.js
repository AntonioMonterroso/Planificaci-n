// Guardar y cargar las cédulas en Supabase. El contenido viaja cifrado desde el navegador (AES-GCM); la base solo ve
// referencia, versión, estado y texto cifrado. Los ajustes y el encabezado van en un papel reservado.
import { makeKey, encryptJSON, decryptJSON } from './crypto.js';
import { Ledger } from './ledger.js';

const META = '__ajustes';
const WORK = '__trabajo'; // respuestas de formatos, legal, informe, calendario y analíticos

export async function savePapers(sb, eng, ledger, passphrase, workspace = null) {
  const keyInfo = await makeKey(passphrase);
  const rows = [];
  for (const p of ledger.papers.values()) rows.push({ ref: p.ref, ciphertext: await encryptJSON(p, keyInfo) });
  rows.push({ ref: META, ciphertext: await encryptJSON({ header: ledger.header, adjustments: ledger.adjustments }, keyInfo) });
  if (workspace) rows.push({ ref: WORK, ciphertext: await encryptJSON(workspace, keyInfo) });
  const body = rows.map((r) => ({ org_id: eng.org_id, engagement_id: eng.id, ref: r.ref, version: 1, status: 'borrador', ciphertext: r.ciphertext }));
  await sb.rest('papers?on_conflict=engagement_id,ref,version', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body });
  await sb.rest('audit_log', { method: 'POST', prefer: 'return=minimal',
    body: { org_id: eng.org_id, actor: sb.user.id, actor_name: sb.user.email, action: 'guardar papeles', detail: { papeles: ledger.papers.size, trabajo: !!workspace } } });
  return ledger.papers.size;
}

export async function loadPapers(sb, eng, passphrase) {
  const rows = await sb.rest(`papers?select=ref,ciphertext&engagement_id=eq.${eng.id}&version=eq.1`);
  if (!rows.length) throw new Error('No hay papeles guardados para este encargo');
  const cache = new Map(); const papers = []; let meta = { header: {}, adjustments: [] }; let workspace = null;
  for (const r of rows) {
    const v = await decryptJSON(r.ciphertext, passphrase, cache);
    if (r.ref === META) meta = v; else if (r.ref === WORK) workspace = v; else papers.push(v);
  }
  if (!papers.length) throw new Error('El encargo no tiene cédulas guardadas');
  return { ledger: new Ledger({ header: meta.header, papers, adjustments: meta.adjustments }), workspace };
}

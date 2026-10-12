#!/usr/bin/env node
// CLI del usuario `asistente` (Claude). Variables de entorno (nunca en el chat ni en el repo):
//   SUPABASE_URL, SUPABASE_ANON_KEY, ASISTENTE_EMAIL, ASISTENTE_PASSWORD, AUDITOS_FRASE
// Uso:  node scripts/asistente.mjs pendientes
//       node scripts/asistente.mjs tomar <idSolicitud>
//       node scripts/asistente.mjs entregar <archivo.json>   ({org_id, request_id, body, evidence:[{tipo,ref}], missing?, draft?})
//       node scripts/asistente.mjs leer                      (descifra y muestra las cédulas del encargo)
import { readFileSync } from 'node:fs';
import { Supabase } from '../js/core/supabase.js';
import { makeCipher } from '../js/core/crypto.js';
import { pendientes, tomar, entregar } from '../js/core/asistente.js';
import { loadPapers } from '../js/core/papers-remote.js';

const need = (k) => { const v = process.env[k]; if (!v) { console.error(`Falta la variable de entorno ${k}`); process.exit(2); } return v; };
const sb = new Supabase({ url: need('SUPABASE_URL'), anonKey: need('SUPABASE_ANON_KEY') });
await sb.signIn(need('ASISTENTE_EMAIL'), need('ASISTENTE_PASSWORD'));
const frase = need('AUDITOS_FRASE'); const cipher = makeCipher(frase);
const [cmd, arg] = process.argv.slice(2);
if (cmd === 'pendientes') console.log(JSON.stringify(await pendientes(sb, cipher), null, 2));
else if (cmd === 'tomar' && arg) { await tomar(sb, arg); console.log('Solicitud tomada'); }
else if (cmd === 'entregar' && arg) { await entregar(sb, cipher, JSON.parse(readFileSync(arg, 'utf-8'))); console.log('Entrega registrada'); }
else if (cmd === 'leer') {
  const [eng] = await sb.rest('engagements?select=id,org_id,title&limit=1');
  const { ledger, workspace } = await loadPapers(sb, eng, frase);
  console.log(JSON.stringify({ encargo: eng.title, papeles: [...ledger.papers.keys()], problemas: ledger.issues, trabajo: workspace ? Object.keys(workspace) : [] }, null, 2));
} else { console.error('Comandos: pendientes | tomar <id> | entregar <archivo.json> | leer'); process.exit(2); }

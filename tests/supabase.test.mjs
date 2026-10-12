import test from 'node:test';
import assert from 'node:assert/strict';
import { Supabase } from '../js/core/supabase.js';
import { remoteBandeja } from '../js/core/bandeja-remote.js';

const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => (body === null ? '' : JSON.stringify(body)) });
const cfg = { url: 'https://x.supabase.co/', anonKey: 'anon' };
const login = { access_token: 'a1', refresh_token: 'r1', user: { id: 'u1', email: 'e@x.com' } };

test('inicia sesión con la clave pública y envía el token en cada consulta', async () => {
  const calls = [];
  const sb = new Supabase(cfg, { fetchFn: async (u, o) => { calls.push([u, o]); return u.includes('/auth/') ? json(200, login) : json(200, []); } });
  await sb.signIn('e@x.com', 'pw');
  await sb.rest('engagements?select=id');
  assert.match(calls[0][0], /^https:\/\/x\.supabase\.co\/auth\/v1\/token\?grant_type=password$/);
  assert.equal(calls[1][1].headers.Authorization, 'Bearer a1');
  assert.equal(calls[1][1].headers.apikey, 'anon');
});

test('credenciales inválidas lanzan error y no dejan sesión', async () => {
  const sb = new Supabase(cfg, { fetchFn: async () => json(400, { error_description: 'Invalid login credentials' }) });
  await assert.rejects(sb.signIn('e', 'x'), /Invalid login/);
  assert.equal(sb.user, null);
});

test('si el token venció se refresca una vez y se reintenta', async () => {
  let n = 0;
  const sb = new Supabase(cfg, { fetchFn: async (u) => {
    if (u.includes('/auth/')) return json(200, { ...login, access_token: 'a2' });
    return ++n === 1 ? json(401, { message: 'JWT expired' }) : json(200, [{ id: 1 }]);
  } });
  sb.session = { ...login };
  assert.deepEqual(await sb.rest('t'), [{ id: 1 }]);
  assert.equal(sb.session.access_token, 'a2');
});

test('sin configuración o sin sesión no hay acceso', async () => {
  assert.throws(() => new Supabase({}), /configuración/);
  await assert.rejects(new Supabase(cfg).rest('t'), /Sin sesión/);
});

// Base simulada compartida por el auditor y el asistente: guarda exactamente lo que recibe (como Supabase).
function fakeDb() {
  const db = { requests: [], deliveries: [] };
  const rest = async (p, o = {}) => {
    const m = o.method ?? 'GET';
    if (p.startsWith('engagements')) return [{ id: 'e1', org_id: 'o1', title: 'T' }];
    if (p.startsWith('claude_requests') && m === 'POST') { db.requests.push({ id: `r${db.requests.length + 1}`, requested_by: 'u1', status: 'pendiente', created_at: 't', ...o.body }); return null; }
    if (p.startsWith('claude_requests?id=eq.') && m === 'PATCH') { Object.assign(db.requests.find((r) => r.id === p.split('eq.')[1]), o.body); return null; }
    if (p.startsWith('claude_requests?select') && p.includes('status=in')) return db.requests.filter((r) => ['pendiente', 'en_proceso'].includes(r.status));
    if (p.startsWith('claude_requests?select')) return db.requests;
    if (p.startsWith('claude_deliveries') && m === 'POST') { db.deliveries.push({ id: `d${db.deliveries.length + 1}`, author: 'asistente', status: 'entregado', created_at: 't', ...o.body }); return null; }
    if (p.startsWith('claude_deliveries?id=eq.') && m === 'PATCH') { Object.assign(db.deliveries.find((d) => d.id === p.split('eq.')[1]), o.body); return null; }
    if (p.startsWith('claude_deliveries?select')) return db.deliveries;
    return null;
  };
  return { db, sb: { rest } };
}

test('bandeja remota: la pregunta y la entrega viajan cifradas y solo se leen con la frase', async () => {
  const { makeCipher } = await import('../js/core/crypto.js');
  const { pendientes, tomar, entregar } = await import('../js/core/asistente.js');
  const { db, sb } = fakeDb();
  const FRASE = 'frase-de-prueba-larga-1';
  const api = await remoteBandeja(sb);
  await assert.rejects(api.ask({ kind: 'revisar', question: 'x' }), /Desbloquea/);
  await api.unlock(makeCipher(FRASE));
  await assert.rejects(api.ask({ kind: 'revisar', question: ' ' }), /vacía/);
  await api.ask({ kind: 'revisar', targetRef: 'A1', question: 'Saldo confidencial de Cliente X' });
  assert.ok(!JSON.stringify(db.requests).includes('confidencial'), 'la pregunta no llega legible a la base');
  assert.equal(api.inbox.requests[0].question, 'Saldo confidencial de Cliente X');

  // Claude (asistente) lee, toma y entrega con la misma frase del entorno
  const claude = makeCipher(FRASE);
  const [p] = await pendientes(sb, claude);
  assert.equal(p.pregunta, 'Saldo confidencial de Cliente X');
  await tomar(sb, p.id);
  await assert.rejects(entregar(sb, claude, { org_id: 'o1', request_id: p.id, body: 'Todo bien' }), /evidencia/);
  await entregar(sb, claude, { org_id: 'o1', request_id: p.id, body: 'Cuadra con la cédula', evidence: [{ tipo: 'celda', ref: 'A1!F10' }], draft: 'Nota borrador secreta' });
  assert.ok(!JSON.stringify(db.deliveries).includes('Cuadra') && !JSON.stringify(db.deliveries).includes('secreta'), 'la entrega no llega legible');
  assert.equal(db.deliveries[0].evidence[0].ref, 'A1!F10', 'la referencia a la evidencia sí queda visible');

  await api.reload();
  assert.equal(api.inbox.deliveryOf(p.id).body, 'Cuadra con la cédula');
  assert.equal(api.inbox.deliveryOf(p.id).draft, 'Nota borrador secreta');
  await api.decide(p.id, true);
  assert.equal(db.requests[0].status, 'aceptado');
});

test('sin la frase se ve el marcador de contenido cifrado y con otra frase falla', async () => {
  const { makeCipher } = await import('../js/core/crypto.js');
  const { db, sb } = fakeDb();
  const api = await remoteBandeja(sb);
  await api.unlock(makeCipher('frase-de-prueba-larga-1'));
  await api.ask({ kind: 'norma', question: 'Pregunta privada' });
  const locked = await remoteBandeja(sb);
  assert.match(locked.inbox.requests[0].question, /cifrado/);
  await assert.rejects(locked.unlock(makeCipher('otra-frase-distinta-99')), /No se pudo descifrar/);
});

test('guardar y cargar papeles: la base solo recibe texto cifrado y el contenido regresa íntegro', async () => {
  const { savePapers, loadPapers } = await import('../js/core/papers-remote.js');
  const { Ledger } = await import('../js/core/ledger.js');
  const { demoData } = await import('../js/demo/data.js');
  const stored = []; const calls = [];
  const sb = { user: { id: 'u1', email: 'e@x.com' }, rest: async (p, o = {}) => {
    calls.push(`${o.method ?? 'GET'} ${p.split('?')[0]}`);
    if (p.startsWith('papers?on_conflict')) { stored.push(...o.body); return null; }
    if (p.startsWith('papers?select')) return stored.map((r) => ({ ref: r.ref, ciphertext: r.ciphertext }));
    return null;
  } };
  const eng = { id: 'e1', org_id: 'o1' };
  const L = new Ledger(demoData());
  const trabajo = { formatos: { frir: { answers: { c1: { valor: 'SI', ref: 'B-1', comentario: '' } } } }, legal: { answers: {}, confirmations: {} }, docs: { informe: { titulo: 'Texto confidencial del informe' } }, obligations: [], havad: { ventas: 123456 } };
  const n = await savePapers(sb, eng, L, 'frase-de-prueba-larga-1', trabajo);
  assert.equal(n, L.papers.size);
  assert.ok(stored.every((r) => r.status === 'borrador' && r.version === 1 && r.ciphertext.startsWith('v1.')));
  assert.ok(!JSON.stringify(stored).includes('Caja general'), 'nada legible llega a la base');
  assert.ok(calls.includes('POST audit_log'));
  assert.ok(!JSON.stringify(stored).includes('Texto confidencial'), 'el trabajo también viaja cifrado');
  const { ledger: back, workspace } = await loadPapers(sb, eng, 'frase-de-prueba-larga-1');
  assert.equal(back.papers.size, L.papers.size);
  assert.equal(back.get('BG').totals.contab, L.get('BG').totals.contab);
  assert.equal(back.adjustments.length, L.adjustments.length);
  assert.deepEqual(workspace, trabajo);
  await assert.rejects(loadPapers(sb, eng, 'frase-incorrecta-123'), /No se pudo descifrar/);
});

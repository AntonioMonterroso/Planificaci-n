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

test('la bandeja remota carga, pide y decide a través de la API', async () => {
  const log = [];
  const sb = { rest: async (p, o = {}) => {
    log.push(`${o.method ?? 'GET'} ${p.split('?')[0]}`);
    if (p.startsWith('engagements')) return [{ id: 'e1', org_id: 'o1', title: 'T' }];
    if (p.startsWith('claude_requests?')) return [{ id: 'r1', requested_by: 'u1', kind: 'revisar', target_ref: 'A1', question: 'q', status: 'entregado', created_at: 't' }];
    if (p.startsWith('claude_deliveries?select')) return [{ id: 'd1', request_id: 'r1', author: 'claude', body: 'b', evidence: [{ tipo: 'norma', ref: 'NIA 500' }], status: 'entregado', created_at: 't' }];
    return null;
  } };
  const api = await remoteBandeja(sb);
  assert.equal(api.inbox.requests.length, 1);
  assert.equal(api.inbox.deliveryOf('r1').evidence[0].ref, 'NIA 500');
  await assert.rejects(api.ask({ kind: 'revisar', question: ' ' }), /vacía/);
  await api.ask({ kind: 'revisar', targetRef: null, question: 'hola' });
  await api.decide('r1', true);
  assert.ok(log.includes('POST claude_requests') && log.includes('PATCH claude_deliveries') && log.includes('PATCH claude_requests'));
});

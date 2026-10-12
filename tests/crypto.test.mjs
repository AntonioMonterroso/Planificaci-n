import test from 'node:test';
import assert from 'node:assert/strict';
import { makeKey, encryptJSON, decryptJSON } from '../js/core/crypto.js';

const PASS = 'frase-de-prueba-larga-1';
const doc = { ref: 'A1', lines: [{ key: 'x', contab: '=15773+6955' }] };

test('cifra y descifra; el texto cifrado no contiene el contenido', async () => {
  const k = await makeKey(PASS);
  const ct = await encryptJSON(doc, k);
  assert.match(ct, /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.ok(!ct.includes('15773') && !ct.includes('A1'));
  assert.deepEqual(await decryptJSON(ct, PASS), doc);
});

test('frase incorrecta o contenido alterado no descifran', async () => {
  const k = await makeKey(PASS);
  const ct = await encryptJSON(doc, k);
  await assert.rejects(decryptJSON(ct, 'otra-frase-distinta-9'), /No se pudo descifrar/);
  const parts = ct.split('.'); parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);
  await assert.rejects(decryptJSON(parts.join('.'), PASS), /No se pudo descifrar/);
});

test('cada cifrado usa un IV distinto y comparte llave por sal', async () => {
  const k = await makeKey(PASS);
  const a = await encryptJSON(doc, k); const b = await encryptJSON(doc, k);
  assert.notEqual(a, b);
  const cache = new Map();
  await decryptJSON(a, PASS, cache); await decryptJSON(b, PASS, cache);
  assert.equal(cache.size, 1);
});

test('exige una frase de al menos 12 caracteres y formato válido', async () => {
  await assert.rejects(makeKey('corta'), /12 caracteres/);
  await assert.rejects(decryptJSON('texto-plano', PASS), /Formato/);
});

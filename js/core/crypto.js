// Cifrado de contenido en el navegador (Web Crypto): AES-GCM con llave derivada de una frase (PBKDF2-SHA256).
// La frase NUNCA se guarda ni se envía; sin ella el contenido en la base es irrecuperable.
// Formato: v1.<sal>.<iv>.<cifrado> (base64url). Cada cifrado lleva su IV; la sal identifica la llave derivada.

const ITER = 210000;
const enc = new TextEncoder(); const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;

const b64 = (buf) => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); };
const unb64 = (str) => { const s = atob(str.replaceAll('-', '+').replaceAll('_', '/')); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; };

export function newSalt() { return globalThis.crypto.getRandomValues(new Uint8Array(16)); }

export async function deriveKey(passphrase, salt, iterations = ITER) {
  if (typeof passphrase !== 'string' || passphrase.length < 12) throw new Error('La frase de cifrado debe tener al menos 12 caracteres');
  const base = await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Cifra un objeto JSON. `keyInfo` = { key, salt } devuelto por makeKey. */
export async function encryptJSON(value, { key, salt }) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return `v1.${b64(salt)}.${b64(iv)}.${b64(ct)}`;
}

export async function makeKey(passphrase) { const salt = newSalt(); return { salt, key: await deriveKey(passphrase, salt) }; }

/** Descifra; guarda en `cache` (Map) las llaves por sal para no repetir PBKDF2 en cada papel. */
export async function decryptJSON(text, passphrase, cache = new Map()) {
  const [v, s, i, c] = String(text).split('.');
  if (v !== 'v1' || !s || !i || !c) throw new Error('Formato de cifrado desconocido');
  let key = cache.get(s);
  if (!key) { key = await deriveKey(passphrase, unb64(s)); cache.set(s, key); }
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(i) }, key, unb64(c));
    return JSON.parse(dec.decode(pt));
  } catch { throw new Error('No se pudo descifrar: frase incorrecta o contenido alterado'); }
}

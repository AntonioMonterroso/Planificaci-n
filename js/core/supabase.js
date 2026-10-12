// Cliente mínimo de Supabase (Auth por contraseña + REST) sin dependencias. Solo usa la clave pública (anon);
// la seguridad la imponen la RLS y los triggers de la base, no este código.
export class Supabase {
  constructor({ url, anonKey }, { fetchFn = (...a) => fetch(...a), storage = null } = {}) {
    if (!url || !anonKey) throw new Error('Falta la configuración de Supabase');
    this.url = url.replace(/\/+$/, ''); this.anonKey = anonKey; this.f = fetchFn; this.storage = storage; this.session = null;
    this.#restore();
  }
  #restore() {
    try { const raw = this.storage?.getItem('auditos-session'); if (raw) this.session = JSON.parse(raw); } catch { this.session = null; }
  }
  #save() {
    try { if (this.session) this.storage?.setItem('auditos-session', JSON.stringify(this.session)); else this.storage?.removeItem('auditos-session'); } catch { /* sin almacenamiento */ }
  }
  get user() { return this.session?.user ?? null; }

  async #auth(grant, body) {
    const res = await this.f(`${this.url}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST', headers: { apikey: this.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || 'No se pudo iniciar sesión');
    this.session = { access_token: data.access_token, refresh_token: data.refresh_token, user: { id: data.user.id, email: data.user.email } };
    this.#save(); return this.user;
  }
  signIn(email, password) { return this.#auth('password', { email, password }); }
  signOut() { this.session = null; this.#save(); }

  async rest(path, { method = 'GET', body = null, prefer = null } = {}, retry = true) {
    if (!this.session) throw new Error('Sin sesión');
    const headers = { apikey: this.anonKey, Authorization: `Bearer ${this.session.access_token}`, 'Content-Type': 'application/json' };
    if (prefer) headers.Prefer = prefer;
    const res = await this.f(`${this.url}/rest/v1/${path}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
    if (res.status === 401 && retry && this.session.refresh_token) {
      try { await this.#auth('refresh_token', { refresh_token: this.session.refresh_token }); } catch { this.signOut(); throw new Error('La sesión venció'); }
      return this.rest(path, { method, body, prefer }, false);
    }
    const text = await res.text(); const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
    return data;
  }
}

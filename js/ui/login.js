// Inicio de sesión (Supabase Auth, usuario y contraseña). La contraseña nunca se guarda en el navegador.
import { h } from './dom.js';
import { pageHead, card, banner, btn } from './kit.js';

export function loginView(ctx, error = null) {
  const email = h('input', { id: 'l-email', type: 'email', autocomplete: 'username', required: true });
  const pass = h('input', { id: 'l-pass', type: 'password', autocomplete: 'current-password', required: true });
  const go = async () => {
    try { await ctx.signIn(email.value.trim(), pass.value); } catch (e) { ctx.loginError = e.message; ctx.rerender(); }
  };
  pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  return h('div', { class: 'view' },
    pageHead({ eyebrow: 'Acceso', title: 'Iniciar sesión', sub: 'Entra con tu usuario de la firma. Lo que ves depende de tu rol y de los encargos a los que perteneces.' }),
    error ? banner('error', error) : null,
    card({ title: 'Usuario y contraseña' },
      h('div', { class: 'field' }, h('label', { for: 'l-email' }, 'Correo'), email),
      h('div', { class: 'field' }, h('label', { for: 'l-pass' }, 'Contraseña'), pass),
      h('div', { class: 'row' }, btn('Entrar', { iconName: 'shield', onClick: go }))));
}

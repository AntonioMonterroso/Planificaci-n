-- AuditOS · esquema base. RLS activa y forzada en TODAS las tablas; sin políticas permisivas.
-- Contenido de papeles viaja cifrado desde el navegador (ciphertext); aquí solo hay metadatos mínimos.
create extension if not exists pgcrypto;

create type app_role as enum ('socio','gerente','encargado','supervisor','campo','auxiliar','eqcr','coordinador','experto','cliente','admin','lectura','asistente');

create table orgs (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table members (
  org_id uuid not null references orgs on delete cascade,
  user_id uuid not null,
  role app_role not null,
  primary key (org_id, user_id));
create table clients (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs on delete cascade, code text not null, name_enc text not null, unique (org_id, code));
create table engagements (id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs on delete cascade, client_id uuid not null references clients, title text not null, period_start date not null, period_end date not null, report_date date, archive_days int not null default 60);
create table engagement_team (engagement_id uuid not null references engagements on delete cascade, user_id uuid not null, role app_role not null, primary key (engagement_id, user_id));

create table papers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  engagement_id uuid not null references engagements on delete cascade,
  ref text not null,
  version int not null default 1,
  status text not null default 'borrador' check (status in ('borrador','firmado')),
  prepared_by uuid, reviewed_by uuid, authorized_by uuid,
  ciphertext text not null,
  unique (engagement_id, ref, version));

create table audit_log (
  seq bigserial primary key,
  org_id uuid not null,
  actor uuid,
  actor_name text not null,
  action text not null,
  detail jsonb not null default '{}',
  prev_hash text not null,
  hash text not null,
  at timestamptz not null default now());

-- ---------- ayudantes (security definer: evitan recursión de RLS) ----------
create function auth_uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid $$;
create function my_role(p_org uuid) returns app_role language sql stable security definer set search_path = public as $$
  select role from members where org_id = p_org and user_id = auth_uid() $$;
create function on_team(p_eng uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from engagement_team where engagement_id = p_eng and user_id = auth_uid()) $$;
create function can_see_engagement(p_org uuid, p_eng uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role(p_org) in ('socio','gerente'), false) or on_team(p_eng) $$;

-- ---------- RLS ----------
alter table orgs enable row level security; alter table orgs force row level security;
alter table members enable row level security; alter table members force row level security;
alter table clients enable row level security; alter table clients force row level security;
alter table engagements enable row level security; alter table engagements force row level security;
alter table engagement_team enable row level security; alter table engagement_team force row level security;
alter table papers enable row level security; alter table papers force row level security;
alter table audit_log enable row level security; alter table audit_log force row level security;

create policy orgs_sel on orgs for select using (my_role(id) is not null);
create policy members_sel on members for select using (user_id = auth_uid() or my_role(org_id) in ('socio','gerente','admin'));
create policy members_adm on members for all using (my_role(org_id) = 'admin') with check (my_role(org_id) = 'admin');
create policy clients_sel on clients for select using (my_role(org_id) in ('socio','gerente','encargado','supervisor','coordinador')
  or exists (select 1 from engagements e where e.client_id = clients.id and on_team(e.id)));
create policy clients_ins on clients for insert with check (my_role(org_id) in ('socio','gerente'));
create policy eng_sel on engagements for select using (can_see_engagement(org_id, id));
create policy eng_ins on engagements for insert with check (my_role(org_id) in ('socio','gerente'));
create policy team_sel on engagement_team for select using (user_id = auth_uid() or exists (select 1 from engagements e where e.id = engagement_id and can_see_engagement(e.org_id, e.id)));
create policy team_ins on engagement_team for insert with check (exists (select 1 from engagements e where e.id = engagement_id and my_role(e.org_id) in ('socio','gerente')));
create policy papers_sel on papers for select using (can_see_engagement(org_id, engagement_id) and my_role(org_id) not in ('admin','coordinador','cliente'));
create policy papers_ins on papers for insert with check (can_see_engagement(org_id, engagement_id) and my_role(org_id) in ('encargado','supervisor','campo','auxiliar') and status = 'borrador');
create policy papers_upd on papers for update using (can_see_engagement(org_id, engagement_id) and my_role(org_id) in ('encargado','supervisor','campo','auxiliar','socio','gerente')) with check (true);
create policy log_sel on audit_log for select using (my_role(org_id) in ('socio','gerente','admin'));
create policy log_ins on audit_log for insert with check (my_role(org_id) is not null and actor = auth_uid());

-- ---------- cuatro ojos + firmado = inmutable ----------
create function papers_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'firmado' then raise exception 'Papel firmado: no se elimina'; end if;
    return old;
  end if;
  if old.status = 'firmado' then
    raise exception 'Papel firmado e inmutable: el desbloqueo crea una versión nueva con confirmación formal';
  end if;
  if new.status = 'firmado' then
    if new.prepared_by is null or new.reviewed_by is null or new.authorized_by is null then
      raise exception 'Cuatro ojos: faltan elaborador, revisor o autorizador'; end if;
    if new.prepared_by = new.reviewed_by or new.reviewed_by = new.authorized_by or new.prepared_by = new.authorized_by then
      raise exception 'Cuatro ojos: elaborador, revisor y autorizador deben ser personas distintas'; end if;
  end if;
  return new;
end $$;
create trigger papers_guard_t before update or delete on papers for each row execute function papers_guard();

-- ---------- bitácora: solo inserción, hashes encadenados ----------
create function log_chain() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare prev text;
begin
  perform pg_advisory_xact_lock(hashtext(new.org_id::text));
  select hash into prev from audit_log where org_id = new.org_id order by seq desc limit 1;
  new.prev_hash := coalesce(prev, repeat('0', 64));
  new.at := now();
  new.hash := encode(digest(new.prev_hash || new.org_id::text || coalesce(new.actor::text,'') || new.actor_name || new.action || new.detail::text || new.at::text, 'sha256'), 'hex');
  return new;
end $$;
create trigger log_chain_t before insert on audit_log for each row execute function log_chain();
create function log_immutable() returns trigger language plpgsql as $$ begin raise exception 'La bitácora es de solo inserción'; end $$;
create trigger log_immutable_t before update or delete on audit_log for each row execute function log_immutable();

create function verify_log(p_org uuid) returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare r audit_log; prev text := repeat('0', 64);
begin
  if my_role(p_org) not in ('socio','gerente','admin') then raise exception 'Sin permiso'; end if;
  for r in select * from audit_log where org_id = p_org order by seq loop
    if r.prev_hash <> prev or r.hash <> encode(digest(r.prev_hash || r.org_id::text || coalesce(r.actor::text,'') || r.actor_name || r.action || r.detail::text || r.at::text, 'sha256'), 'hex') then return false; end if;
    prev := r.hash;
  end loop;
  return true;
end $$;

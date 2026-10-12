-- AuditOS · Bandeja de Claude. El asistente escribe SOLO entregas (borradores y evidencia); nunca firma ni aprueba.
create table claude_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  engagement_id uuid not null references engagements on delete cascade,
  requested_by uuid not null default auth_uid(),
  kind text not null check (kind in ('revisar','explicar','borrador','resumir','comparar','hallazgo','verificar_doc','norma')),
  target_ref text,                       -- cédula/celda/documento al que se refiere (p. ej. A1-4!F28)
  question text not null check (length(trim(question)) > 0),
  status text not null default 'pendiente' check (status in ('pendiente','en_proceso','entregado','aceptado','cambios')),
  created_at timestamptz not null default now());

create table claude_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  request_id uuid not null references claude_requests on delete cascade,
  author uuid not null default auth_uid(),
  body text not null check (length(trim(body)) > 0),
  evidence jsonb not null default '[]',  -- [{tipo:'celda'|'norma'|'ley'|'documento', ref:'A1-4!F28'}]
  missing_data text,                     -- si falta el dato, lo dice (no se inventa)
  draft jsonb,                           -- borrador de versión: se aplica solo al aceptar
  status text not null default 'entregado' check (status in ('entregado','aceptado','rechazado')),
  decided_by uuid, decided_at timestamptz,
  created_at timestamptz not null default now());

alter table claude_requests enable row level security; alter table claude_requests force row level security;
alter table claude_deliveries enable row level security; alter table claude_deliveries force row level security;

create function is_assistant(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role(p_org) = 'asistente', false) $$;
create function can_ask(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role(p_org) in ('socio','gerente','encargado','supervisor','campo','auxiliar','eqcr'), false) $$;

create policy creq_sel on claude_requests for select using (
  (can_ask(org_id) or is_assistant(org_id)) and can_see_engagement(org_id, engagement_id));
create policy creq_ins on claude_requests for insert with check (
  can_ask(org_id) and can_see_engagement(org_id, engagement_id) and requested_by = auth_uid() and status = 'pendiente');
create policy creq_upd on claude_requests for update using (
  (can_ask(org_id) or is_assistant(org_id)) and can_see_engagement(org_id, engagement_id)) with check (true);

create policy cdel_sel on claude_deliveries for select using (exists (
  select 1 from claude_requests r where r.id = request_id and (can_ask(r.org_id) or is_assistant(r.org_id)) and can_see_engagement(r.org_id, r.engagement_id)));
create policy cdel_ins on claude_deliveries for insert with check (
  is_assistant(org_id) and author = auth_uid() and status = 'entregado' and exists (
    select 1 from claude_requests r where r.id = request_id and r.org_id = claude_deliveries.org_id and can_see_engagement(r.org_id, r.engagement_id)));
create policy cdel_upd on claude_deliveries for update using (exists (
  select 1 from claude_requests r where r.id = request_id and can_ask(r.org_id) and can_see_engagement(r.org_id, r.engagement_id))) with check (true);

-- Reglas de transición de las solicitudes
create function creq_guard() returns trigger language plpgsql as $$
begin
  if new.org_id <> old.org_id or new.engagement_id <> old.engagement_id or new.requested_by <> old.requested_by
     or new.kind <> old.kind or new.question <> old.question or new.target_ref is distinct from old.target_ref then
    raise exception 'La solicitud no se edita; crea una nueva'; end if;
  if new.status = old.status then return new; end if;
  if is_assistant(old.org_id) then
    if not ((old.status = 'pendiente' and new.status = 'en_proceso') or (old.status in ('pendiente','en_proceso') and new.status = 'entregado')) then
      raise exception 'El asistente solo puede tomar o entregar solicitudes'; end if;
    if new.status = 'entregado' and not exists (select 1 from claude_deliveries d where d.request_id = old.id) then
      raise exception 'No hay entrega registrada'; end if;
  else
    if not (old.status = 'entregado' and new.status in ('aceptado','cambios')) then
      raise exception 'Transición no permitida: % → %', old.status, new.status; end if;
  end if;
  return new;
end $$;
create trigger creq_guard_t before update on claude_requests for each row execute function creq_guard();

-- Entregas: sin evidencia ni "falta el dato" no hay entrega; decidir es humano y distinto de quien entregó
create function cdel_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if jsonb_typeof(new.evidence) <> 'array' then raise exception 'La evidencia debe ser una lista'; end if;
    if jsonb_array_length(new.evidence) = 0 and coalesce(trim(new.missing_data), '') = '' then
      raise exception 'Toda entrega cita evidencia (cédula/celda, norma o ley) o declara qué dato falta'; end if;
    return new;
  end if;
  if new.body <> old.body or new.evidence <> old.evidence or new.draft is distinct from old.draft
     or new.author <> old.author or new.missing_data is distinct from old.missing_data or new.request_id <> old.request_id then
    raise exception 'La entrega es inmutable; solo se acepta o se rechaza'; end if;
  if old.status <> 'entregado' then raise exception 'La entrega ya fue decidida'; end if;
  if new.status not in ('aceptado','rechazado') then raise exception 'Estado no permitido'; end if;
  if is_assistant(old.org_id) or auth_uid() = old.author then raise exception 'Claude propone, el auditor decide'; end if;
  new.decided_by := auth_uid(); new.decided_at := now();
  return new;
end $$;
create trigger cdel_guard_t before insert or update on claude_deliveries for each row execute function cdel_guard();
create function cdel_nodelete() returns trigger language plpgsql as $$ begin raise exception 'Las entregas no se eliminan'; end $$;
create trigger cdel_nodelete_t before delete on claude_deliveries for each row execute function cdel_nodelete();

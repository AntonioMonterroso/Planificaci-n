-- AuditOS · endurecimiento (revisión de seguridad). Cierra tres huecos:
--  1. Cuatro ojos falsificable: quien actualizaba un papel podía poner a cualquiera como elaborador/revisor/autorizador,
--     mover el papel a otra firma o cambiar su referencia. Ahora cada rol solo se registra a sí mismo.
--  2. Decidir las entregas de Claude: cualquier persona del equipo (incluido el auxiliar) podía aceptar. Ahora solo
--     socio, gerente, encargado y supervisor.
--  3. El administrador podía asignarse roles a sí mismo (escalada de privilegios). Ya no puede tocar su propia membresía.

-- ---------- 1. papeles ----------
create or replace function papers_guard() returns trigger language plpgsql as $$
declare r app_role;
begin
  if tg_op = 'DELETE' then
    if old.status = 'firmado' then raise exception 'Papel firmado: no se elimina'; end if;
    return old;
  end if;
  if old.status = 'firmado' then
    raise exception 'Papel firmado e inmutable: el desbloqueo crea una versión nueva con confirmación formal';
  end if;
  if new.org_id <> old.org_id or new.engagement_id <> old.engagement_id or new.ref <> old.ref or new.version <> old.version then
    raise exception 'La identidad del papel (firma, encargo, referencia y versión) no se modifica';
  end if;
  r := my_role(old.org_id);
  if new.prepared_by is distinct from old.prepared_by then
    if old.prepared_by is not null or new.prepared_by is distinct from auth_uid() then
      raise exception 'Solo puedes registrarte tú como elaborador (y una sola vez)'; end if;
  end if;
  if new.reviewed_by is distinct from old.reviewed_by then
    if old.reviewed_by is not null or new.reviewed_by is distinct from auth_uid() or r is null or r not in ('encargado','supervisor','gerente','socio') then
      raise exception 'Solo el encargado, supervisor, gerente o socio se registra como revisor, él mismo y una sola vez'; end if;
  end if;
  if new.authorized_by is distinct from old.authorized_by then
    if old.authorized_by is not null or new.authorized_by is distinct from auth_uid() or r is null or r not in ('gerente','socio') then
      raise exception 'Solo el gerente o el socio se registra como autorizador, él mismo y una sola vez'; end if;
  end if;
  if new.status = 'firmado' then
    if new.prepared_by is null or new.reviewed_by is null or new.authorized_by is null then
      raise exception 'Cuatro ojos: faltan elaborador, revisor o autorizador'; end if;
    if new.prepared_by = new.reviewed_by or new.reviewed_by = new.authorized_by or new.prepared_by = new.authorized_by then
      raise exception 'Cuatro ojos: elaborador, revisor y autorizador deben ser personas distintas'; end if;
    if auth_uid() is distinct from new.authorized_by then
      raise exception 'La firma final la pone quien autoriza'; end if;
  end if;
  return new;
end $$;

drop policy papers_ins on papers;
create policy papers_ins on papers for insert with check (
  can_see_engagement(org_id, engagement_id) and my_role(org_id) in ('encargado','supervisor','campo','auxiliar')
  and status = 'borrador' and reviewed_by is null and authorized_by is null and (prepared_by is null or prepared_by = auth_uid()));

-- ---------- 2. quién decide las entregas de Claude ----------
create function can_decide(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role(p_org) in ('socio','gerente','encargado','supervisor'), false) $$;

create or replace function creq_guard() returns trigger language plpgsql as $$
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
    if not can_decide(old.org_id) then
      raise exception 'Solo el socio, gerente, encargado o supervisor decide sobre las entregas'; end if;
  end if;
  return new;
end $$;

create or replace function cdel_guard() returns trigger language plpgsql as $$
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
  if not can_decide(old.org_id) then raise exception 'Solo el socio, gerente, encargado o supervisor decide sobre las entregas'; end if;
  new.decided_by := auth_uid(); new.decided_at := now();
  return new;
end $$;

-- ---------- 3. administrador sin autoprivilegios ----------
drop policy members_adm on members;
create policy members_adm on members for all
  using (my_role(org_id) = 'admin' and user_id <> auth_uid())
  with check (my_role(org_id) = 'admin' and user_id <> auth_uid());

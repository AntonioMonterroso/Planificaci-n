create schema t; grant usage on schema t to public;
-- Datos sintéticos. Usuarios: 1 socio A, 2 encargado, 3 supervisor, 4 auxiliar (fuera del equipo), 5 socio B, 6 admin A, 7 campo
create function t.uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-00000000000' || n)::uuid $$;
insert into orgs(id,name) values ('a0000000-0000-0000-0000-000000000001','Firma A'),('b0000000-0000-0000-0000-000000000002','Firma B');
insert into members values
 ('a0000000-0000-0000-0000-000000000001',t.uid(1),'socio'),('a0000000-0000-0000-0000-000000000001',t.uid(2),'encargado'),
 ('a0000000-0000-0000-0000-000000000001',t.uid(3),'supervisor'),('a0000000-0000-0000-0000-000000000001',t.uid(4),'auxiliar'),
 ('a0000000-0000-0000-0000-000000000001',t.uid(6),'admin'),('a0000000-0000-0000-0000-000000000001',t.uid(7),'campo'),
 ('b0000000-0000-0000-0000-000000000002',t.uid(5),'socio');
insert into clients(id,org_id,code,name_enc) values
 ('c0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000001','CL-A','xx'),
 ('c0000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-000000000002','CL-B','yy');
insert into engagements(id,org_id,client_id,title,period_start,period_end) values
 ('e0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000a','Auditoría A','2025-01-01','2025-12-31'),
 ('e0000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-00000000000b','Auditoría B','2025-01-01','2025-12-31');
insert into engagement_team values
 ('e0000000-0000-0000-0000-00000000000a',t.uid(2),'encargado'),('e0000000-0000-0000-0000-00000000000a',t.uid(3),'supervisor'),('e0000000-0000-0000-0000-00000000000a',t.uid(7),'campo');
insert into papers(id,org_id,engagement_id,ref,ciphertext) values
 ('f0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-00000000000a','A1','cifrado'),
 ('f0000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-00000000000b','A1','cifrado');

create function t.as_user(n int) returns void language plpgsql as $$ begin
  reset role; perform set_config('request.jwt.claim.sub', t.uid(n)::text, false); set role authenticated; end $$;
create function t.expect(label text, cond boolean) returns void language plpgsql as $$ begin
  if not cond then raise exception 'FALLA: %', label; end if; raise notice 'OK   %', label; end $$;
create function t.fails(label text, stmt text) returns void language plpgsql as $$ begin
  begin execute stmt; exception when others then raise notice 'OK   % (%)', label, sqlerrm; return; end;
  raise exception 'FALLA (debía fallar): %', label; end $$;
grant execute on all functions in schema t to public;

-- aislamiento entre organizaciones
select t.as_user(5);
select t.expect('socio B no ve la firma A', (select count(*) from clients where code='CL-A')=0 and (select count(*) from papers where ref='A1' and org_id::text like 'a%')=0);
select t.expect('socio B ve lo suyo', (select count(*) from clients)=1);
select t.fails('socio B no inserta en la firma A', $q$insert into clients(org_id,code,name_enc) values ('a0000000-0000-0000-0000-000000000001','X','z')$q$);

-- visibilidad por rol y equipo
select t.as_user(1); select t.expect('socio A ve cliente y encargo', (select count(*) from clients)=1 and (select count(*) from engagements)=1);
select t.as_user(2); select t.expect('encargado (en equipo) ve papeles', (select count(*) from papers)=1);
select t.as_user(4); select t.expect('auxiliar fuera del equipo no ve papeles ni encargo', (select count(*) from papers)=0 and (select count(*) from engagements)=0);
select t.as_user(6); select t.expect('admin no lee papeles ni clientes', (select count(*) from papers)=0 and (select count(*) from clients)=0);
select t.as_user(6); select t.expect('admin ve miembros', (select count(*) from members)=6);
select t.as_user(4); update members set role='socio' where user_id=t.uid(4);
select t.expect('auxiliar no cambió de rol (0 filas)', (select role from members where user_id=t.uid(4))='auxiliar');

-- cuatro ojos
select t.as_user(2);
select t.fails('no se firma sin revisor', $q$update papers set status='firmado', prepared_by=t.uid(7) where ref='A1' and org_id::text like 'a%'$q$);
select t.fails('elaborador = revisor no firma', $q$update papers set status='firmado', prepared_by=t.uid(7), reviewed_by=t.uid(7), authorized_by=t.uid(1) where ref='A1' and org_id::text like 'a%'$q$);
update papers set status='firmado', prepared_by=t.uid(7), reviewed_by=t.uid(2), authorized_by=t.uid(3) where ref='A1' and org_id::text like 'a%';
select t.expect('tres personas distintas pueden firmar', (select status from papers)='firmado');

-- firmado = inmutable
select t.fails('papel firmado no se edita', $q$update papers set ciphertext='otro' where ref='A1'$q$);
delete from papers where ref='A1';
select t.expect('papel firmado no se elimina', (select count(*) from papers)=1);

-- bitácora
select t.as_user(2);
insert into audit_log(org_id,actor,actor_name,action,detail) values ('a0000000-0000-0000-0000-000000000001', t.uid(2), 'encargado.demo', 'firma A1', '{"ref":"A1"}');
insert into audit_log(org_id,actor,actor_name,action) values ('a0000000-0000-0000-0000-000000000001', t.uid(2), 'encargado.demo', 'segunda');
select t.fails('no se registra a nombre de otro', $q$insert into audit_log(org_id,actor,actor_name,action) values ('a0000000-0000-0000-0000-000000000001', t.uid(1), 'socio', 'x')$q$);
update audit_log set action='x'; delete from audit_log;
select t.expect('la bitácora no se edita ni se borra (sin política)', (select count(*) from audit_log where action='x')=0);
select t.fails('encargado no verifica la cadena (sin permiso)', $q$select verify_log('a0000000-0000-0000-0000-000000000001')$q$);
select t.as_user(1);
select t.expect('cadena íntegra', verify_log('a0000000-0000-0000-0000-000000000001'));
reset role;
alter table audit_log disable trigger log_immutable_t;
update audit_log set action='manipulado' where seq=1;
alter table audit_log enable trigger log_immutable_t;
select t.as_user(1);
select t.expect('manipular una fila rompe la cadena', not verify_log('a0000000-0000-0000-0000-000000000001'));

-- ---------- Bandeja de Claude ----------
reset role;
insert into members values ('a0000000-0000-0000-0000-000000000001', t.uid(8), 'asistente');
insert into engagement_team values ('e0000000-0000-0000-0000-00000000000a', t.uid(8), 'asistente');
select t.as_user(2);
insert into claude_requests(id,org_id,engagement_id,kind,target_ref,question) values
 ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-00000000000a','revisar','A1','¿Cuadra la analítica?');
select t.as_user(4);
select t.fails('auxiliar fuera del equipo no crea solicitudes', $q$insert into claude_requests(org_id,engagement_id,kind,question) values ('a0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-00000000000a','revisar','x')$q$);
select t.expect('auxiliar fuera del equipo no ve solicitudes', (select count(*) from claude_requests)=0);
select t.as_user(5);
select t.expect('otra firma no ve solicitudes', (select count(*) from claude_requests)=0);
select t.as_user(8);
select t.expect('asistente (en equipo) ve la solicitud', (select count(*) from claude_requests)=1);
select t.fails('asistente no crea solicitudes', $q$insert into claude_requests(org_id,engagement_id,kind,question) values ('a0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-00000000000a','revisar','x')$q$);
select t.fails('no se entrega sin entrega registrada', $q$update claude_requests set status='entregado'$q$);
update claude_requests set status='en_proceso';
select t.expect('asistente toma la solicitud', (select status from claude_requests)='en_proceso');
select t.fails('entrega sin evidencia ni faltante', $q$insert into claude_deliveries(org_id,request_id,body) values ('a0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Todo bien')$q$);
insert into claude_deliveries(id,org_id,request_id,body,evidence) values
 ('d1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Cuadra','[{"tipo":"celda","ref":"A1!F10"}]');
update claude_requests set status='entregado';
select t.expect('asistente entrega con evidencia', (select status from claude_requests)='entregado');
update claude_deliveries set status='aceptado';
select t.expect('asistente no puede aceptar su entrega (0 filas)', (select status from claude_deliveries)='entregado');
select t.fails('asistente no puede marcar aceptada la solicitud', $q$update claude_requests set status='aceptado'$q$);
update claude_deliveries set body='otro'; delete from claude_deliveries;
select t.expect('la entrega no se edita ni se borra', (select body from claude_deliveries)='Cuadra');
select t.as_user(2);
select t.expect('encargado ve la entrega', (select count(*) from claude_deliveries)=1);
update claude_deliveries set status='aceptado'; update claude_requests set status='aceptado';
select t.expect('el auditor acepta y queda su nombre', (select decided_by from claude_deliveries)=t.uid(2));
select t.fails('una entrega decidida no se vuelve a decidir', $q$update claude_deliveries set status='rechazado'$q$);

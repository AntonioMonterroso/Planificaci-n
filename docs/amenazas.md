# AuditOS · Modelo de amenazas y estado de seguridad

Revisión del paso 12. Qué protegemos, de quién, con qué, cómo se prueba y qué **sigue abierto**.

## Qué protegemos
1. **Contenido de los papeles de trabajo y del trabajo del auditor** (cédulas, formatos, legal, informe, bandeja): cifrado en el navegador (AES-GCM, llave derivada de una frase con PBKDF2). La base solo ve texto cifrado.
2. **Integridad del proceso de auditoría**: cuatro ojos, firmado inmutable, bitácora encadenada, decisiones humanas sobre lo que Claude propone.
3. **Aislamiento entre firmas, encargos y roles** (RLS forzada en todas las tablas).
4. **Secretos**: ninguno en el repositorio; la clave `anon` es pública por diseño; `service_role` nunca se usa.

## Quién podría atacar
| Actor | Qué intentaría | Defensa |
|---|---|---|
| Usuario de otra firma | Leer o escribir datos ajenos | RLS forzada; prueba de aislamiento entre firmas |
| Miembro con rol bajo (auxiliar, campo) | Firmar a nombre de otros, mover papeles, aceptar entregas de Claude | Migración 0003: cada rol se registra solo a sí mismo; identidad del papel inmutable; solo socio/gerente/encargado/supervisor deciden sobre entregas |
| Administrador | Darse rol de socio | 0003: no puede tocar su propia membresía |
| Claude (asistente) | Aceptar su propia entrega, firmar, crear solicitudes, desbloquear | Triggers y RLS en la base, no solo instrucciones |
| Quien robe la base o un respaldo | Leer contenido de clientes | Contenido cifrado con frase que nunca llega a la base |
| Página/enlace malicioso, XSS | Ejecutar código en la sesión | CSP estricta (sin scripts ni estilos en línea, conexión solo a self y al proyecto), DOM con `h()`, prueba que prohíbe `innerHTML`/`eval` |
| Archivo de formato malicioso (.xlsx con macros) | Ejecutar código al convertirlo | El extractor solo lee valores, rechaza `.xlsm`, avisa de macros/vínculos; jamás se ejecutan |

## Qué se prueba automáticamente (`npm test`, `bash supabase/tests/run-rls.sh`, `node tests/e2e/smoke.mjs`)
- Aislamiento entre firmas, visibilidad por rol y equipo, admin sin acceso a papeles.
- Cuatro ojos: no se pueden fabricar firmas ajenas ni firmar sin las tres personas reales; firmado no se edita ni se borra.
- Bitácora: solo inserción; alterar una fila rompe la cadena y se detecta.
- Bandeja: Claude no acepta, no firma, no crea; entrega sin evidencia se rechaza; campo/auxiliar no deciden.
- Cifrado: lo que llega a la base no contiene texto legible; frase incorrecta o contenido alterado no se descifra.
- Reglas de código: sin `eval`/`innerHTML`, CSP estricta, sin secretos ni JWT, sin archivos de oficina, RLS activa y forzada en toda tabla, sin `service_role` en el navegador.
- Historial de git revisado: sin claves (solo aparece la URL pública del proyecto).

## Hallazgos de esta revisión (corregidos en `0003_endurecimiento.sql`)
1. **Alto:** el esquema base permitía que quien actualizaba un papel pusiera a cualquier persona como elaborador, revisor y autorizador y lo firmara solo (cuatro ojos falsificable), y moviera el papel a otra firma. *Corregido y probado.*
2. **Medio:** cualquier miembro del equipo (incluido el auxiliar) podía aceptar entregas de Claude. *Corregido y probado.*
3. **Medio:** el administrador podía asignarse rol de socio. *Corregido y probado.*

## Riesgos que siguen abiertos (decisiones tuyas)
- **Frase compartida:** todo el equipo usa la misma frase; no hay llaves por persona, ni "romper el cristal", ni recuperación con dos personas. **Perderla es irrecuperable.**
- **MFA no activado** en Supabase Auth. Recomendado para todos los usuarios, en especial socio y administrador.
- **Registro público de usuarios:** desactiva "Allow new users to sign up" en Supabase Auth. Sin rol no ven nada, pero no hay razón para dejarlo abierto.
- **Administrador + cómplice:** un administrador puede dar roles a *otra* persona; falta un segundo aprobador para altas sensibles.
- **Bitácora:** `actor_name` lo escribe el cliente (el `actor` sí se fuerza al usuario autenticado); no se puede usar para identificar a la persona sin cruzarlo con `actor`.
- **Tokens de sesión** en `sessionStorage` (se borran al cerrar la pestaña); una vulnerabilidad XSS podría leerlos. La CSP estricta reduce ese riesgo.
- **Frase en memoria** mientras la pestaña está abierta; se pide de nuevo al recargar.
- **Metadatos visibles** en la base: referencias de cédula, tipo de solicitud, estados y fechas.
- **Escaneo dinámico (HawkScan) y gitleaks en CI:** no se ejecutaron (sin clave / sin la herramienta en el entorno). El archivo `.gitleaks.toml` está listo; la prueba `seguridad.test.mjs` cubre los patrones principales.
- **Aplicar 0003:** la migración debe correrse en tu proyecto de Supabase (la 0001 y 0002 ya están).
- **Parte legal:** la valida el auditor con su asesor; las referencias del catálogo vienen de resultados de búsqueda y no de las páginas oficiales.

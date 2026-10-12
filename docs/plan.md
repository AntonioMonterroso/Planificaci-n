# AuditOS: plataforma HTML tipo ERP para auditoría externa (multi-cliente, NIA + NIIF PYMES, Guatemala)

## Contexto

Antonio audita estados financieros de **varios clientes reales** y quiere un sistema que lo acompañe de punta a punta, use **TODO** lo de su carpeta "Formatos para AUDITORÍA Externa" (y lo que se agregue después), y sea:
- **HTML + JavaScript**, paneles tipo ERP, estética Apple, pastel, animaciones suaves, claro/oscuro, **responsivo en todo**.
- **Seguro**: datos en **Supabase** con RLS activa en todo, login con usuario y contraseña, nada de datos ni secretos en el repo.
- **Multi-cliente**: El papel de trabajo de ejemplo (sumarias con cobertura 40 %) es solo un ejemplo.
- El Excel **`1BG Cédulas Caja y Bancos`** es "el sistema completo" en Excel: hay que **adaptarlo y mejorarlo**. Su lógica es la base del producto.

El repositorio contiene solo la aplicación: ningún dato de clientes ni secretos.

## Qué es realmente el Excel 1BG (análisis hecho sobre el archivo)

Archivo `.xlsx` de 30 hojas. **No tiene macros** (no existe `vbaProject`); lo que parece "macro" son **imágenes-botón con hipervínculo** (3 por hoja) más **fórmulas entre hojas**. Hay 3 vínculos externos rotos y nombres definidos con `#REF!`.

**Jerarquía y navegación (lo que hacen los botones):**

```
Índice ──► Estado de Situación Financiera  [BG = CENTRALIZADORA]
              │  (rubros: A caja y bancos · B CxC · C inventarios · D PPE · E diferidos · AA CxP · BB patrimonio)
              ▼
           A  SUMARIA de Caja y Bancos
           ├─ A1 ANALÍTICA de Caja ──► A1-1 … A1-5 SUBANALÍTICAS (cada fondo) ──► A1-x.1 detalle de liquidaciones
           └─ A2 ANALÍTICA/SUMARIA de Bancos ──► A2-1 conciliación consolidada mensual (≈490 filas, 861 fórmulas) ──► A2-1.1 / A2-1.2 por banco
           Hojas de apoyo: Evaluación de CI · Asignación de tareas · Marcas · Equipo · Programa · ProgramaA · CuestionarioA ·
                           Hallazgos y recomendaciones · Divulgaciones obligatorias · Ajustes y reclasificaciones
```

Botones de cada hoja: **Índice**, **BG** (subir a la centralizadora), **Marcas**, y además **hoja padre** (A1-x → A1) y **par sub↔detalle** (A1-4 ↔ A1-4.1). El índice enlaza a cada hoja de control y a las sumarias.

**Flujo de cifras:** subanalítica → analítica (columnas saldo contable, debe, haber) → sumaria (saldo contabilidad, ajustes debe/haber, saldo auditoría, diferencia) → BG. La hoja de **Ajustes y reclasificaciones** toma sus importes de las subanalíticas (ej. A1-4) y alimenta las columnas de ajustes. Un único encabezado (entidad) viene de una celda y las demás hojas lo heredan.

**Control del encargo ya presente:** equipo con iniciales y función; asignación de tareas por cédula (PT, HP = hecho por, RP = revisado por, fechas, horas); programa con horas estimadas/reales y CPA responsable; **atributos A–D** en las analíticas (firmó quien elaboró, firmó quien revisó, firmó quien autorizó, elaborador ≠ revisor → v/x = el "cuatro ojos" de Excel); evaluación de control interno SI/NO/N/A con porcentajes y nivel ALTO/MEDIO/BAJO; marcas de auditoría (≤ suma horizontal, ^ suma vertical, ¥, etc.).

**Debilidades reales detectadas (el sistema debe impedirlas):**
- La centralizadora no cuadra: patrimonio hardcodeado en 0 en la columna de auditoría; activo ≠ pasivo + capital.
- La sumaria de efectivo y la analítica de bancos difieren en **219.94** por valores forzados a mano en dos filas; la analítica de caja difiere de la sumaria en **10,000.00** por una celda que no usa la fórmula estándar.
- Periodo inconsistente entre hojas (una dice 2025, otras 2020); importes escritos dentro de fórmulas (`=15773+6955`); referencias por texto sin enlace real; ruta local y nombre del cliente en celdas sueltas; el índice no lista las hojas de arqueo, estados de cuenta y ajustes que cita la asignación de tareas; el nivel ALTO/MEDIO/BAJO no es fórmula.

Las marcas de Excel pasan a ser **validaciones reales**: ≤ y ^ las aplica el motor cuando verifica que suma, no las dibuja una persona. La barra de marcas tiene **botón de copiar en cada marca** (≤ ^ ¥ √ ≈ © ┐ ± Ï Ə …): un clic copia el símbolo para pegarlo en cualquier campo, y las marcas manuales también se pueden insertar desde ahí.

**Botón de copiar universal** (misma lógica en todo el sistema): copiar una cifra, una referencia (`A1-4!F28`), una fila o una tabla completa (como texto tabulado que pega bien en Excel y Word), el texto de un hallazgo, una partida de ajuste. Con aviso visual de "copiado".

**Sumas dentro de la celda (sin calculadora)**: cualquier celda numérica acepta expresiones como `=15773+6955`, `=(1200*3)-45.5`, `=18130.13+29219.75+15375` o referencias a otras celdas (`=A1-4!F28+100`). Un analizador propio y seguro (sin `eval`) calcula, muestra el resultado y **conserva la expresión y sus componentes** como rastro de auditoría (cada componente puede enlazarse a su documento). Acepta formato guatemalteco (`Q1,654,923.68`, negativos entre paréntesis, porcentajes). Además: pegar una columna desde Excel y obtener la suma, y **seleccionar celdas y ver al instante suma, promedio y conteo** en la barra inferior, con botón para insertar o copiar el total.

## Perfil del encargo (lo nuevo que pides)

Cada cliente tiene **expedientes de encargo**; cada encargo se configura antes de tocar una cifra:
1. **Contrato y temporalidad**: carta de encargo, fecha de firma, vigencia, periodo auditado (inicio/fin), cierre fiscal, renovaciones, honorarios y forma de pago, hitos y entregables, fecha comprometida del informe, **fecha límite de armado del archivo** (NIA 230), prórrogas con motivo.
2. **Documentos recibidos del cliente (PBC)**: por documento, quién lo pidió, fecha de solicitud, fecha y persona que lo recibió, versión y huella digital, estado (pendiente → recibido → en verificación → aceptado / observado / rechazado), custodia y devolución, a qué cédulas respalda.
3. **Verificación formal del documento**: legible y completo, firmas y sellos, periodo correcto, autenticidad (ej. estado de cuenta contra confirmación bancaria), cuadra contra contabilidad, quién verificó y cuándo. Un papel no se cierra con documentos pendientes o sin verificar.
4. Equipo con rol por encargo, horas estimadas vs reales, riesgos de independencia, calendario de visitas y fechas legales.

## Cómo se traduce Excel → HTML (mejora)

- **Navegación automática**: breadcrumb y botones Subir / Bajar / Índice / Centralizadora generados desde el árbol de referencias (`BG › A › A1 › A1-4`), sin hipervínculos manuales. Cada cifra tiene **"ir al origen"** y **"quién la usa"** (precedentes y dependientes).
- **Motor de cédulas** (JS): cada nodo `centralizadora | sumaria | analítica | subanalítica | detalle`, con líneas y totales; suma de abajo hacia arriba; **semáforo de cuadre en cada nivel** (sub = analítica = sumaria = centralizadora; activo = pasivo + patrimonio). Imposible forzar un total a mano: un ajuste solo entra por la hoja de ajustes con partida y referencia.
- **Un solo encabezado** por encargo (entidad, periodo, moneda) heredado por todo; periodos comparativos.
- **Paquete por rubro generado**: Caja y Bancos es el piloto (es el sistema completo); la misma estructura (centralizadora → sumaria → analíticas → subanalíticas + programa + cuestionario + CI + hallazgos + divulgaciones + ajustes) se genera para cada rubro usando los kits de Metodología (DA–DU, DX, FIN, FA, D-0x).
- **Conciliaciones** (A2-1): módulo mensual por banco con saldo anterior, ingresos, egresos, cheques en circulación y diferencias.
- **Control interno**: cuestionario SI/NO/N/A con porcentaje y nivel calculado por umbrales configurables.
- **Todo editable en el navegador** (programa, cuestionarios, hallazgos, divulgaciones, cartas, informe) con versiones y exportación a Word/PDF.
- **Formatos futuros**: registro de formatos extensible; un formato nuevo se importa y se integra sin tocar el código.

## Inventario de Drive y cómo se usa

Carpeta raíz de Drive: raíz (papel de trabajo de ejemplo = modelo de sumarias con cobertura 40 %; 1BG = sistema base); `AuditX/` (5 HAVAD, Planificación BA-08 ×7, Metodología ≈130 con guías de fase, NIA 220-810, DA–DU, DX, FIN, FA, D-0x, informes y cartas; Herramientas 300+ con duplicados). **Archivos descomprimidos** (`descomp/`) contiene una carpeta por kit con el `.xlsx` de trabajo y el `.pdf` guía; los `.zip` quedan como respaldo y **se ignoran**. Todo se cataloga por ID de Drive. Los HAVAD son `.xlsx`, así que no pueden contener macros VBA (se comprobará en la inspección); sus 15 ratios y gráficos se reimplementan en JS y se prueban contra los valores en caché.

## Roles (dos grupos) y cómo no se omite ninguna función

**Grupo 1: equipo de auditoría (por encargo)**

| Rol | Qué hace | Qué no puede hacer |
|---|---|---|
| **Auditor encargado** | Responsable de completar el encargo: perfil, plan global, riesgos, materialidad propuesta, programa, asigna tareas, primera revisión del trabajo de campo, consolida hallazgos, borrador de informe y cartas, controla PBC y plazos, cierra cada fase pidiendo revisión | Aprobar su propio trabajo, firmar el informe |
| **Auditor supervisor** | Segunda revisión: aprueba plan, programa y materialidad, conclusiones por rubro, ajustes propuestos, resuelve diferencias, verifica completitud (lista NIA 230), escala a gerencia | Revisar papeles que él preparó |
| **Auditor de campo** (profesional, pensum cerrado y graduado) | Ejecuta pruebas por rubro asignado: arqueos, confirmaciones, muestreo, conciliaciones; prepara sumarias y analíticas; guía a auxiliares; propone ajustes y hallazgos | Cerrar fase, revisar, aceptar ajustes |
| **Auxiliar de auditoría** (contador a pensum cerrado y más) | Captura y cuadra subanalíticas, aplica verificaciones simples, recibe y verifica formalmente documentos, escanea y referencia | Ver rubros no asignados, firmar como revisor |

**Grupo 2: gerencia de la firma (permisos concedibles desde el panel)**

| Rol | Qué hace |
|---|---|
| **Socio** | Aceptación y continuidad del cliente, firma carta de encargo e informe, aprueba honorarios, autoriza desbloqueos, designa revisor de calidad |
| **Gerente** | Asigna equipos y cargas, revisa planeación e informe antes del socio, aprueba cartas de gerencia, controla horas, honorarios y plazos; segunda aprobación en acciones sensibles; puede actuar por delegación del socio |

**Roles que propongo agregar:**
- **Revisor de calidad del encargo (EQCR)**: independiente del equipo; obligatorio en riesgo alto o interés público.
- **Oficial de ética, independencia y cumplimiento** (socio o gerente con permiso): declaraciones, conflictos, prevención de lavado, calendario legal, retención.
- **Coordinador de encargos / administración**: calendario, PBC, confirmaciones, tiempos y facturación; ve metadatos, no cifras.
- **Experto o especialista** (TI, fiscal, valuación, laboral): acceso temporal por rubro (NIA 620).
- **Cliente**: portal limitado para subir documentos, responder solicitudes y ver estado; nunca ve papeles internos.
- **Administrador del sistema**: usuarios, roles, copias y llaves; no lee contenido sin autorización de dos personas.
- **Invitado de solo lectura** con vencimiento (comité del cliente, revisión de pares, inspección).

**Garantía anti-omisión (delegación):**
1. Catálogo de **funciones obligatorias** (≈30: aceptar cliente, independencia, carta de encargo, plan, riesgos, materialidad, solicitar y verificar PBC, arqueo, confirmaciones, conciliaciones, ajustes, hallazgos, cartas, revisión, EQCR, informe, archivo final...). Cada una tiene responsable primario y **suplentes en cadena** (auxiliar → campo → encargado → supervisor → gerente → socio).
2. **Matriz de ocupaciones** por encargo: si una función no tiene persona, el sistema la **asigna al siguiente rol disponible**, la marca "vacante cubierta por…" y alerta.
3. **No se avanza de fase** con funciones sin responsable, tareas vencidas o PBC sin verificar.
4. **Incompatibilidades forzadas en la base** (preparador ≠ revisor, encargado ≠ supervisor, EQCR fuera del equipo) y **alertas de sobrecarga** por horas.
5. Ausencias: delegación temporal con fechas y bitácora.

**Permisos concedibles** (catálogo granular, por persona, con vencimiento y bitácora): aprobar aceptación, firmar informe, desbloquear papel, ver honorarios, administrar usuarios, exportar, gestionar llaves, ver cliente completo, etc.

## Seguridad

- **Supabase con RLS activa y forzada en todas las tablas** (`org_id` en cada una); sin políticas permisivas; pruebas SQL que demuestran el aislamiento por organización, rol y encargo. La clave `service_role` jamás va en el navegador.
- **Login con usuario y contraseña** (Supabase Auth): el "usuario" se mapea a un correo interno, **sin registro público** (solo por invitación del administrador), contraseña larga (≥12) con verificación de contraseñas filtradas, límite de intentos y bloqueo, cierre de sesión por inactividad, lista de sesiones; **TOTP obligatorio para gerencia y administración**, activado por defecto para el resto.
- **Cifrado de contenido en el navegador (AES-256-GCM)**: Supabase solo guarda texto cifrado y metadatos mínimos. Llave de la firma envuelta por usuario; **el administrador puede restablecer llaves** mediante "romper el cristal": exige dos personas (socio + gerente), contraseña y TOTP, y queda en bitácora. Compromiso asumido: el proveedor no puede leer, pero la firma sí puede recuperar.
- **Firmados e inmutables**: un papel firmado se bloquea; cambiarlo exige **confirmación formal** (motivo escrito, solicitante, aprobador de gerencia, reautenticación) y crea una versión nueva; el anterior se conserva.
- **Bitácora a prueba de manipulación**: solo-inserción con hashes encadenados; verificación de integridad desde el panel. Los borradores que prepare Claude llevan su nombre de usuario en la bitácora; **no se marcan dentro del documento**.
- Frontend: CSP estricta, SRI en CDN con versión exacta, saneo de texto importado, sin `eval`. Archivos adjuntos en buckets privados con URL firmada de vida corta.
- Hosting: **Cloudflare Pages** (elegido: más seguro y sencillo; CSP por archivo de cabeceras, HTTPS, y opcionalmente Cloudflare Access como segunda puerta). El código puede estar en repo privado; incluso visible no expone datos.
- Copias: PITR de Supabase + exportación cifrada.
- Secretos: nunca en el repo ni en el chat; escaneo con gitleaks.

## Cómo participa Claude (y si hace falta un token)

- **No hace falta un token de la API de Claude.** Claude trabaja en esta sesión/chat con acceso al repo: `CLAUDE.md` (reglas) y **skills** (`/planear`, `/perfil-encargo`, `/cedula`, `/cuadres`, `/riesgos`, `/hallazgos`, `/cierre`, `/informe`).
- **Durante la construcción**: tú me das el **token de Supabase**, lo agregas en la configuración del entorno (Network secrets o variable de entorno que acordemos), **no en el chat**; creas un usuario de pruebas en Supabase Auth para que pruebe el sistema real. Recomendación: un **proyecto Supabase de desarrollo** para construir y probar; al pasar a producción se revoca el token y yo ya no tengo acceso permanente.
- **Después**: Claude entra como un usuario más del sistema (rol de asistente, limitado por RLS, sin `service_role`), con nombre propio en la bitácora. Qué añade: verificador automático de cuadres (encuentra errores como los 3 del Excel), borradores de programa/hallazgos/divulgaciones/cartas/informe, triage y verificación de PBC, revisión previa a firma (lista NIA 230), análisis de riesgos desde HAVAD, generación de paquetes por rubro, calendario de cumplimiento y explicaciones. Decide el auditor.
- Un asistente incrustado en el HTML requeriría clave de API propia y enviar datos de clientes a la API; queda fuera de la v1.

### Trabajo conjunto con Claude (al estilo skill): pides, Claude entrega

Claude no es solo quien construye: es parte del equipo de trabajo. Dos formas de colaborar, ambas dentro del sistema y con nombre propio en la bitácora:

**1. Bandeja de Claude (desde el HTML).** Botón **"Pedir a Claude"** en cualquier cédula, celda, hallazgo, documento o encargo. Se elige el tipo (revisar, explicar una diferencia, preparar borrador, resumir, comparar con el periodo anterior, redactar hallazgo, verificar un documento, responder una duda de norma/ley) y se escribe la pregunta; el contexto (cédula, rango, encargo) viaja con la solicitud. Estados: **pendiente → en proceso → entregado → aceptado / pedir cambios**. Panel **"Entregas de Claude"** con la respuesta, la evidencia citada (cédula y celda, norma o ley) y, si aplica, un **borrador de versión** que tú aceptas con un clic (aplica el cambio) o rechazas. Si falta un dato, Claude lo dice y no lo inventa.

**2. Conversación directa en la sesión.** Abres el chat con el repo y escribes en lenguaje natural o con skills; Claude lee la base con su usuario limitado y te entrega en la conversación y en el panel.

**Skills de trabajo** (en `.claude/skills/`, cada una con entradas, salidas, límites y qué escribe):

| Skill | Qué hace | Entrega |
|---|---|---|
| `/bandeja` | Procesa las solicitudes pendientes en orden de prioridad | Respuestas y borradores en "Entregas" |
| `/preguntar` | Responde dudas sobre un encargo, cédula, NIA o norma legal, citando origen | Respuesta con fuentes |
| `/revisar` | Revisión previa a firma de una cédula, rubro o fase: cuadres sub→sumaria→centralizadora, atributos A–D, PBC verificados, cobertura riesgo→respuesta→evidencia, lista NIA 230 | Informe de revisión con semáforos y lista de pendientes |
| `/explicar-diferencia` | Rastrea el origen de una diferencia (como los 219.94 y 10,000.00 del Excel) hasta la celda causante | Explicación y propuesta de corrección |
| `/preparar` | Borradores: programa, cuestionario, hallazgos y recomendaciones, divulgaciones, cartas, informe | Borrador de versión para aceptar |
| `/riesgos` | Analíticos HAVAD, señales de fraude, riesgos por ciclo y materialidad propuesta (decisión tuya) | Matriz de riesgos y respuestas |
| `/perfil-encargo` | Verifica contrato, fechas, plazos, PBC pendientes y vacantes de ocupación | Tablero de estado y alertas |
| `/resumen` | Estado del encargo o de toda la cartera, qué falta y quién | Resumen listo para reunión |
| `/legal` | Consulta de cumplimiento (por obligación o en conjunto) con fuente | Respuesta y recordatorios al calendario |
| `/entregable` | Arma el paquete de entrega (cédulas exportadas, informe, cartas) | Archivos en Word/PDF/Excel |
| `/formato-nuevo` | Integra un formato nuevo al registro (conversión, inspección de seguridad, pruebas de oro) | Formato disponible en el sistema |

**Límites de Claude** (aplican en la base, no solo en las instrucciones): puede leer lo que su rol permita y **escribir solo borradores, comentarios y entregas**; no firma, no cierra fases, no aprueba ajustes, no desbloquea papeles, no toca llaves ni usuarios, no usa `service_role`. Todo lo que escribe queda con su nombre de usuario.

**Cuándo responde**: Claude trabaja cuando abres una sesión o lo invocas; la bandeja no es en tiempo real. Opcional: una **rutina programada** (por ejemplo cada mañana) que procese lo pendiente y deje las entregas listas; requiere que las credenciales estén en el entorno.

## Reglas de oro mejoradas (irán en `CLAUDE.md` y cada una dice cómo se hace cumplir)

| Regla | Cumplimiento |
|---|---|
| Claude propone, el auditor decide | Claude no firma, no cierra fases, no aprueba ajustes (permisos) |
| Cuatro ojos | Trigger en base: preparador ≠ revisor ≠ autorizador (atributos A–D) |
| Ninguna cifra sin origen | Campo de origen obligatorio (documento, fila, celda); si falta, semáforo rojo |
| Cuadre en todos los niveles | Motor bloquea firma si sub ≠ analítica ≠ sumaria ≠ centralizadora |
| Cobertura trazable | Riesgo → respuesta → evidencia, enlaces obligatorios |
| Firmado = inmutable | Desbloqueo con confirmación formal y versión nueva |
| Ningún puesto vacío | Matriz de ocupaciones y suplentes; sin avance de fase si hay vacantes |
| Mínimo privilegio y dos personas para lo sensible | Desbloqueos, llaves y exportaciones masivas piden dos aprobaciones |
| Documentos verificados | PBC sin verificar impide cerrar el papel |
| Plazos | Alertas de entrega y de armado del archivo final |
| Independencia antes de aceptar | Declaración obligatoria por persona y encargo |
| Originales intactos | Drive guarda formatos; se trabaja con copias versionadas |
| Excepciones visibles | Alcance limitado, supuestos y lo no probado en un panel único |
| Todo queda registrado | Bitácora encadenada con nombre de quien actuó |
| Claude entrega con evidencia | Cada respuesta cita cédula/celda, norma o ley; sin dato, lo declara; solo escribe borradores y entregas (permisos de base) |
| Sumas con rastro | Toda expresión (`=a+b`) conserva sus componentes; no hay totales pegados a mano |

## Cumplimiento legal ("todo lo de la ley y más")

Módulo con **perfil legal por cliente** (tipo de entidad, régimen tributario, sector, empleados, sujeto obligado, financiamiento) y un **motor de reglas**: cada obligación se puede consultar **por sí sola** (ej. solo SAT) y a la vez el sistema evalúa **todas las que aplican en conjunto** y sus cruces (ISR ↔ IVA ↔ nómina/IGSS ↔ libros contables ↔ lavado de activos ↔ marco contable). Cada punto: norma, quién, qué, cuándo, evidencia, estado.

Cobertura inicial: SAT completo (IVA, ISR y retenciones, facturación electrónica, libros y registros), IGSS/IRTRA/INTECAP y prestaciones, Código de Comercio, marco contable (NIIF PYMES/NIIF), NIA adoptadas por el Colegio de Contadores Públicos y Auditores, prevención de lavado de activos y financiamiento del terrorismo, FATCA/intercambio si aplica, y regulaciones sectoriales (por ejemplo entidades sin fines de lucro). **Se verificará contra fuentes oficiales antes de darlo por válido; la validación final es de Antonio y su asesor legal.**

"Más", mejorado: política de **retención y destrucción** por tipo de documento con bloqueo legal; **consentimiento y confidencialidad** firmados por cliente y por personal; **declaraciones de independencia anuales y por encargo**; control de **colegiado activo, educación continua y seguro de responsabilidad** del personal; **gestión de calidad de la firma** (ISQM 1/NICC 1) con monitoreo y revisiones; **plan de continuidad y recuperación** con pruebas; **plan de respuesta a incidentes**; gestión de proveedores (Supabase, hosting) con contratos y revisión; canal de denuncias; calendario de cumplimiento propio de la firma.

## Zips, formatos y macros

Los zips ya están descomprimidos y sirven solo `.xlsx/.pdf/.docx` útiles. Antes de usar cualquier archivo: inspección de solo lectura en directorio aislado (`python -I`): tipo real por firma, SHA-256, `vbaProject.bin`, vínculos externos, DDE, `WEBSERVICE`/`HYPERLINK`, objetos incrustados. Las macros (si aparece alguna) **se leen como texto y se reimplementan en JS**, jamás se ejecutan. Para cada formato: cuestionarios → JSON + renderizador; hojas con fórmulas → JS validado contra los **valores en caché del propio Excel (pruebas de oro)**; Word/PDF → biblioteca con búsqueda y plantillas editables con campos. Con 1BG ya sabemos las pruebas de oro: BG caja y bancos saldo contable 507,073.22 y saldo auditoría 566,443.69; sumaria de bancos 400,130.88; ratios HAVAD ya verificados (razón corriente 1.07, días cartera 80, ROE 38 %).

## Pasos de implementación (tras aprobar)

0. **Prerrequisitos de Antonio**: crear proyecto Supabase de desarrollo; poner el token en el entorno (secretos/variable) y permitir el dominio de Supabase en el acceso de red del entorno; crear el usuario de pruebas en Auth.
1. Borrar la copia local temporal del 1BG (contiene datos reales) y catalogar `descomp/` + toda la carpeta por ID.
2. Inspección de seguridad y clasificación; matriz de cobertura (0 archivos sin módulo).
3. Base de datos: esquema (org, cliente, encargo, perfil/contrato, PBC y verificación, equipo y roles, funciones y suplentes, permisos, nodos de papeles y líneas, enlaces, ajustes, hallazgos, divulgaciones, legal, bitácora), RLS forzada, triggers de cuatro ojos, inmutabilidad y cadena de hashes, pruebas SQL.
4. Sistema de diseño responsivo (tokens, claro/oscuro, animaciones) y app shell con buscador global.
5. Núcleo: login por usuario, MFA, clientes, encargos, perfil y contrato, PBC con verificación, equipo y matriz de ocupaciones, cifrado de contenido, llaves y "romper el cristal".
6. Motor de cédulas con navegación y cuadres; piloto **Caja y Bancos** reproduciendo 1BG con datos sintéticos y pruebas de oro; control interno, programa, cuestionario, hallazgos, divulgaciones, ajustes.
7. Generador de paquetes para los demás rubros y módulo HAVAD en JS.
8. Extracción de checklists/cuestionarios a JSON, biblioteca y registro de formatos.
9. Cumplimiento legal y calendario.
10. Cierre, informe y cartas editables con exportación.
11. Bandeja de Claude y panel de Entregas (tablas, permisos del usuario asistente, botón "Pedir a Claude"), skills de trabajo y `CLAUDE.md`; prueba de ida y vuelta real: solicitud → entrega → aceptar.
12. Seguridad final (pruebas RLS, gitleaks, CSP, escaneo dinámico si hay clave) y documento de amenazas.
13. Despliegue en Cloudflare Pages y paso a producción (revocar token de construcción).

## Verificación

- Pruebas de oro: el motor reproduce las cifras en caché de 1BG, HAVAD y las sumarias; además **detecta** las inconsistencias señaladas arriba.
- RLS: otro cliente/organización, cliente externo y asistente no leen ni escriben lo ajeno; preparador no revisa lo suyo; papel firmado no se modifica sin confirmación formal; sin puesto vacante no avanza la fase.
- Navegación: desde cualquier cifra se llega al origen y de vuelta a la centralizadora.
- Cifrado: la tabla en Supabase solo muestra texto cifrado; restablecimiento de llave requiere dos personas.
- Bitácora: alterar una fila rompe la cadena y el panel lo detecta.
- Navegador real con el usuario de pruebas: todos los paneles en claro/oscuro, móvil y escritorio, sin errores de consola.
- gitleaks sin hallazgos; ningún dato de cliente en el repo.

## Riesgos y decisiones abiertas

- Si el entorno no permite el dominio de Supabase, no se podrá probar contra la base real hasta ampliarlo.
- Perder todas las llaves es irrecuperable; mitigado por el procedimiento de dos personas y exportación de recuperación.
- La parte legal debe ser validada por Antonio y su asesor.
- Se entrega por hitos usables: base+seguridad → núcleo → piloto Caja y Bancos → resto de rubros → legal → informe.

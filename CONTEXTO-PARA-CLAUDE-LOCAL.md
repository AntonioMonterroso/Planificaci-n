# Contexto para Claude Code local · AuditOS (replanificación)

Este documento te pone al día. No es un plan ni un manual: es la memoria de una primera ronda de trabajo hecha en una sesión en la nube (octubre de 2026), contada con honestidad, para que puedas ayudar a **replantear el proyecto desde cero** con quien lo dirige. Lo construido es material de referencia, no una obligación. Descubre tú cómo trabajar y qué conservar.

## 1. Quién es el usuario y qué quiere

- **Antonio Monterroso**, auditor externo en Guatemala (firma "Monterroso, Auditores & Consultores"). Audita estados financieros de **varios clientes reales** con NIA y NIIF para PYMES.
- Quiere un sistema que lo **acompañe de punta a punta** en una auditoría: planeación, papeles de trabajo, documentos del cliente, equipo, riesgos, cumplimiento legal, cierre e informe. Y que **Claude sea parte del equipo de trabajo**, no el auditor.
- Parte de una carpeta de Google Drive llamada **"Formatos para AUDITORÍA Externa"** con la metodología de la firma: más de 130 formatos (cuestionarios, checklists, programas de trabajo, kits por rubro), herramientas de más de 300 archivos con duplicados, un papel de trabajo de ejemplo, un sistema base de Caja y Bancos, y cinco hojas de análisis financiero (HAVAD). Los `.zip` son respaldo de archivos ya descomprimidos. **Esa carpeta es la fuente de verdad de cómo trabaja la firma**, y en la primera ronda apenas se tocó.
- Preferencias visibles: español en todo, quetzales (`Q1,654,923.68`, negativos entre paréntesis), identidad visual de la firma (carbón + oro champaña, claro/oscuro), nada de fuentes externas.
- **Dijo con franqueza que no le gustó lo que se hizo** y quiere volver a planificar. No precisó qué parte. Es lo primero que hay que averiguar, sin suponerlo.

## 2. Los principios del usuario (vienen de su propio planteamiento)

Se convirtieron en reglas de oro en el `CLAUDE.md` del repo. Son lo más estable de todo el proyecto:

- Claude propone, el auditor decide: Claude no firma, no cierra fases, no aprueba ajustes ni desbloquea papeles.
- Cuatro ojos: quien elabora no revisa ni autoriza.
- Ninguna cifra sin documento de origen.
- Cuadre en todos los niveles (subanalítica, analítica, sumaria, centralizadora).
- Cobertura trazable: riesgo → respuesta → evidencia.
- Firmado es inmutable; se desbloquea con confirmación formal y versión nueva.
- Ningún puesto vacío en el equipo (matriz de ocupaciones con suplentes).
- Mínimo privilegio; dos personas para lo sensible.
- Documentos del cliente verificados antes de cerrar un papel.
- Claude entrega con evidencia: cita cédula/celda, norma o ley; si falta el dato, lo dice. **Nunca inventa cifras, normas ni fechas legales.**
- Sumas con rastro y todo registrado en una bitácora.
- Confidencialidad estricta: jamás datos reales de clientes, nombres, NIT, cuentas, claves ni archivos de oficina en el repo ni en el chat; datos de prueba solo sintéticos; secretos en el entorno.

## 3. Qué se construyó en la primera ronda (a grandes rasgos)

Una aplicación web sin dependencias (HTML + JavaScript), con paneles tipo ERP, responsiva, con modo claro y oscuro, que corre sola en el navegador y opcionalmente contra Supabase. Con datos **sintéticos**. En conceptos:

- **Motor de cédulas**: jerarquía centralizadora › sumaria › analítica › subanalítica; totales que suben de nivel; ajustes solo mediante partidas; fórmulas en celdas con rastro de componentes; alertas de cifras sin origen y de cuadre; atributos de firma A–D.
- **Perfil del encargo**: contrato, vigencia, hitos, plazo de armado del archivo, fases.
- **Documentos del cliente (PBC)**: flujo de estados y verificación formal por documento.
- **Equipo y ocupaciones**: funciones obligatorias con titular y suplentes, vacantes, incompatibilidades, horas.
- **Generador de paquetes por rubro** y estructura a mano (agregar analíticas, subanalíticas y líneas; borrar cédulas vacías).
- **Analíticos**: 15 ratios con DuPont.
- **Calendario** de plazos del encargo y obligaciones legales registradas con fuente.
- **Biblioteca de formatos**: cuestionarios como datos, con un solo piloto convertido (factores de riesgo inherentes, NIA 315) y una herramienta para convertir los demás desde Excel con cuidado de seguridad (sin ejecutar macros).
- **Cumplimiento legal**: perfil legal del cliente que activa áreas, por separado y en conjunto, con semáforo y citas de fuentes.
- **Informe y cartas** editables (informe del auditor, carta de gerencia, carta de representación), con verificaciones previas, firma con cuatro ojos y versiones.
- **Supabase**: esquema con seguridad por filas forzada, cuatro ojos y firmado inmutable en la base, bitácora encadenada, inicio de sesión, y **cifrado del contenido en el navegador** con una frase del equipo; la base solo ve texto cifrado.
- **Claude como miembro del equipo**: una bandeja de solicitudes y entregas (con evidencia obligatoria) donde Claude entra como usuario limitado, y unas skills de trabajo para él. También una revisión de seguridad que encontró y corrigió huecos reales.

Estado al cierre: todo está fusionado en `main` salvo la última función (estructura a mano), que quedó en una rama aparte; la tercera migración de la base estaba escrita pero **no aplicada** en el proyecto de Supabase de desarrollo (que ya tiene cuatro usuarios de prueba: socio, encargado, auxiliar y asistente).

## 4. Qué no se hizo, o se hizo a medias (importante)

- **Nunca se hizo el inventario de la carpeta de Drive** ni la inspección de seguridad de todos sus archivos. Solo se leyó un formato (el de factores de riesgo) y se convirtió a mano.
- **No se validó el motor contra los valores reales** de los archivos de la firma (el sistema base de Caja y Bancos y las hojas HAVAD tenían cifras de referencia conocidas). Los ratios y las cédulas se hicieron "por estándar", no por lo que la firma realmente usa.
- Los **rubros del generador** (nombres de analíticas) y los **ratios** los propuso Claude, no salieron de los formatos de la firma.
- La **parte legal** se armó con resultados de búsqueda web, no leyendo las páginas oficiales (no hubo acceso desde ese entorno). Apareció una alerta real: una ley antilavado nueva que derogaría la vigente, sin poder confirmar su publicación. Eso mostró que no se puede dar nada por vigente sin verificación humana.
- Casi todo el trabajo del usuario (respuestas, informe, legal, calendario) vive en memoria del navegador y solo se guarda si se usa un botón de guardado cifrado, que **no se probó con la base real** por falta de contraseñas.
- Sin recuperación de la frase de cifrado, sin llaves por persona, sin MFA, sin despliegue, sin escaneo dinámico de seguridad.
- Las plantillas del informe son un esqueleto mínimo; el texto real lo debe redactar el auditor.
- No hay módulo de hallazgos, riesgos y materialidad, ajustes con aprobación, ni cierre, aunque aparecen en el menú.

## 5. Lecciones y errores de proceso (para no repetirlos)

- Se construyó **ancho antes que profundo**: muchos paneles de demostración con datos inventados, sin validar con el flujo real del auditor ni con sus formatos. Es probable que ahí esté parte de lo que no gustó.
- Se tomaron decisiones de producto **por suposición** (qué rubros, qué ratios, qué campos) en lugar de preguntarlas o leerlas de la carpeta de la firma.
- Se dieron por buenos hallazgos que luego hubo que corregir: la bandeja de Claude guardaba preguntas y entregas en texto plano; el esquema permitía fabricar las firmas de cuatro ojos; una afirmación sobre los datos de demostración resultó errónea. La revisión de seguridad llegó tarde. La seguridad y la confidencialidad merecen estar en el diseño desde el principio, no al final.
- La mezcla de "sesión en la nube + usuario en su Mac + repo en GitHub" generó fricción (rutas, ramas, claves, permisos de red). Trabajar localmente debería simplificarlo, pero las credenciales siguen sin poder pasar por el chat.

## 6. Preguntas abiertas para el usuario (empieza por aquí)

1. ¿Qué fue exactamente lo que no te gustó: el enfoque, el diseño, el alcance, el orden, la tecnología, la forma de trabajar conmigo?
2. ¿Qué dolor concreto quieres resolver primero en una auditoría real? ¿Por dónde empezarías si fuera mañana?
3. ¿Quiénes usarán esto: solo él, su equipo, clientes? ¿Cuántos encargos a la vez?
4. ¿Qué papel quiere que tenga Claude día a día, y cuánta autonomía?
5. ¿Se conserva la tecnología (aplicación web sin dependencias + Supabase) o se replantea todo, incluyendo si debe ser una aplicación y no, por ejemplo, un flujo de trabajo sobre sus propios archivos?
6. ¿Qué de lo construido vale la pena rescatar y qué se descarta?
7. ¿Qué quiere que su carpeta de formatos pase a ser dentro del sistema, y con qué criterio se eligen los primeros formatos?
8. Seguridad y recuperación: ¿una frase compartida basta, o llaves por persona? ¿Quién guarda qué?
9. ¿Cómo quiere validar la parte legal con su asesor, y qué fuentes oficiales son las que acepta?

## 7. Qué hay en el repositorio

`CLAUDE.md` (reglas del usuario, léelo primero), `docs/plan.md` (el plan original, largo y ambicioso: trátalo como insumo de la conversación, no como mandato), `docs/amenazas.md` (modelo de amenazas y riesgos abiertos), `README.md`, el código de la aplicación, las migraciones de la base, las pruebas y las skills de Claude para esta aplicación.

## 8. Cómo te pide el usuario que te formes

Él quiere **replanificar juntos antes de tocar código**. Descubre tú cómo hacerlo bien: pregunta, lee su carpeta de formatos con cuidado, propón, y no asumas. Sé directo y honesto, también cuando algo no se puede verificar. Respeta sus reglas de oro como si fueran tuyas.

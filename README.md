# AuditOS

Plataforma HTML tipo ERP para **auditoría externa** (NIA + NIIF para PYMES, Guatemala): perfil del encargo, cédulas con cuadre automático (centralizadora → sumaria → analíticas → subanalíticas), analíticos, hallazgos, cumplimiento legal y trabajo conjunto con Claude. Multi-cliente, responsiva, con modo claro y oscuro.

> Estado: **v0.2 (demostración)**. Núcleo de cálculo, panel de Cédulas y fase de **Perfil del encargo** (contrato y plazos, documentos del cliente con verificación formal, equipo y ocupaciones), con datos sintéticos. Aún sin conexión a Supabase. El plan completo está en [`docs/plan.md`](docs/plan.md).

## Probar

```bash
npm test            # pruebas unitarias del motor (sin dependencias)
npm run serve       # http://localhost:8080
node tests/e2e/smoke.mjs   # prueba en navegador (requiere Playwright)
```

## Qué incluye hoy

- **Evaluador de expresiones seguro** (`js/core/expr.js`): escribe `=15773+6955` dentro de cualquier celda; conserva los componentes como rastro. Sin `eval`.
- **Motor de cédulas** (`js/core/ledger.js`): totales que suben de nivel, ajustes solo por partida (no se teclean), cuadre de la centralizadora, cuatro ojos, cifras sin origen, referencias circulares.
- **Panel de Cédulas**: navegación por jerarquía, celdas con expresiones, selección y suma de celdas, marcas de auditoría con botón de copiar, copiar tabla, ajustes.
- **Diseño**: identidad Monterroso (carbón + oro champaña, pasteles apagados para estados), claro/oscuro, títulos en serif, animaciones que respetan "reducir movimiento" y contraste AA verificado por prueba.

- **Perfil del encargo** (`js/core/engagement.js`): plazo de armado del archivo, hitos, flujo de documentos del cliente con verificación formal y cuatro ojos, matriz de ocupaciones con suplentes y vacantes, e incompatibilidades; la fase no se cierra con bloqueos.

- **Bandeja de Claude** (`js/core/bandeja.js`, `supabase/migrations/0002_bandeja.sql`): solicitudes con contexto (cédula/celda), entregas que **citan evidencia o declaran el dato faltante**, borrador que solo se aplica al aceptar. Claude no decide su propia entrega; en la base lo imponen RLS y triggers (probado en PostgreSQL local).

- **Generador de paquetes por rubro** (`js/core/paquetes.js`): desde la centralizadora, un clic crea sumaria › analíticas › subanalíticas enlazadas del rubro (cuentas por cobrar, inventarios, PPE, cuentas por pagar, patrimonio). El saldo que ya tenía la línea se traslada con su documento de origen y los ajustes se reubican; la centralizadora sigue cuadrando. Es estructura, sin cifras ni criterios legales.

- **Analíticos** (`js/core/havad.js`): 15 ratios estándar (liquidez, actividad, endeudamiento, rentabilidad) con fórmula visible y DuPont. Si falta un dato o el divisor es cero, el ratio queda sin valor y lo dice. Convenciones a confirmar contra el HAVAD de la firma: saldos finales y 365 días.

- **Cifrado de contenido** (`js/core/crypto.js`, `js/core/papers-remote.js`): al guardar en Supabase, cada cédula se cifra en el navegador (AES-GCM, llave derivada con PBKDF2 de una frase de al menos 12 caracteres). La base solo guarda referencia, versión, estado y texto cifrado; el guardado queda en la bitácora. La frase no se guarda en ningún lado: **si se pierde, el contenido es irrecuperable** (el plan prevé un procedimiento de recuperación con dos personas, aún no implementado).

- **Calendario** (`js/core/calendario.js`): reúne hitos, informe, armado del archivo, documentos pendientes y tareas. No trae fechas legales: cada obligación se registra con su **fuente oficial** obligatoria, queda *sin validar* y la valida otra persona (en la demostración hay un solo usuario, así que un validador ficticio simula la segunda). La parte legal la validan el auditor y su asesor.

- **Biblioteca de formatos** (`js/core/formato.js`, `js/formatos/`, `scripts/extraer_formato.py`): cuestionarios y checklists como datos. Un SI exige referencia a papel de trabajo o comentario; no se cierra con pendientes y exige tres personas distintas. Piloto: cuestionario de factores de riesgo inherentes (NIA 315). Para convertir más formatos, descarga los `.xlsx` a una carpeta aislada y ejecuta `python3 -I scripts/extraer_formato.py archivo.xlsx borrador.json`: toma solo el texto (nunca respuestas), no ejecuta macros y avisa de vínculos externos. El borrador se revisa a mano antes de registrarlo.

- **Cumplimiento legal** (`js/core/legal.js`, `js/legal/catalogo.js`): perfil legal del cliente → áreas que aplican (IVA, ISR, libros, seguridad social, comercio, marco contable, lavado, sectorial, cruces), cada una por sí sola o en conjunto, con semáforo. **No trae fechas ni artículos de memoria**: cita instrumentos con su fuente oficial y dice qué se consultó y qué falta verificar (las páginas oficiales no se pudieron abrir desde el entorno de desarrollo; solo se vieron citadas en resultados de búsqueda). Incluye una alerta: el Congreso comunicó la aprobación del Decreto 15-2026 (ley antilavado) que derogaría el 67-2001; su publicación y vigencia están sin confirmar. "Cumple" exige evidencia; la vigencia de la norma la confirma otra persona. Validación final: auditor y asesor legal.

## Conectar a Supabase (opcional)

Sin configuración la app corre en modo demostración. Para conectarla: copia `js/config.example.js` como `js/config.local.js` (ignorado por git) con la URL y la clave **anon** del proyecto, aplica `supabase/migrations/*.sql` y crea los usuarios en Auth. Entra con usuario y contraseña; la bandeja lee y escribe en la base y es la RLS quien decide qué ves y qué puedes hacer. Nunca uses aquí la clave `service_role`. La CSP de `index.html` solo permite conectar al dominio del proyecto.

## Seguridad (resumen)

El repositorio contiene **solo código**. Los datos de clientes vivirán en Supabase (RLS forzada, login por usuario y contraseña, cifrado de contenido en el navegador, bitácora encadenada). Nunca se versionan datos, claves ni archivos de clientes (`.gitignore`, `.gitleaks.toml`). Detalle en `docs/plan.md`.

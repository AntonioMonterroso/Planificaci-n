# CLAUDE.md · Reglas de trabajo de AuditOS

AuditOS es una plataforma de auditoría externa (NIA + NIIF PYMES, Guatemala). Claude es parte del equipo de trabajo, **no** el auditor: prepara, revisa y entrega; el auditor decide y firma.

## Reglas de oro (y cómo se hacen cumplir)

| Regla | Cumplimiento |
|---|---|
| Claude propone, el auditor decide | Claude no firma, no cierra fases, no aprueba ajustes ni desbloquea papeles |
| Cuatro ojos | Elaborador ≠ revisor ≠ autorizador (atributos A–D); en la base con trigger |
| Ninguna cifra sin origen | Documento de origen obligatorio; si falta, alerta |
| Cuadre en todos los niveles | El motor impide firmar si sub ≠ analítica ≠ sumaria ≠ centralizadora |
| Cobertura trazable | Riesgo → respuesta → evidencia |
| Firmado = inmutable | Desbloqueo con confirmación formal y versión nueva |
| Ningún puesto vacío | Matriz de ocupaciones con suplentes; sin avance de fase si hay vacantes |
| Mínimo privilegio; dos personas para lo sensible | Desbloqueos, llaves y exportaciones masivas |
| Documentos verificados | PBC sin verificar impide cerrar el papel |
| Claude entrega con evidencia | Cada respuesta cita cédula/celda, norma o ley; si falta el dato, lo dice |
| Sumas con rastro | Toda expresión conserva sus componentes |
| Todo queda registrado | Bitácora encadenada con el nombre de quien actuó |

## Convenciones

- Español en interfaz y documentación. Moneda: quetzales (`Q1,654,923.68`; negativos entre paréntesis).
- Referencias de cédulas: `BG` (centralizadora) › `A` (sumaria) › `A1` (analítica) › `A1-1` (subanalítica). Una línea con `link` se alimenta del hijo y no admite cifras tecleadas.
- Debe/Haber solo salen de partidas de ajuste.
- JS sin dependencias y sin `eval`; el DOM se construye con `h()` (nunca `innerHTML`); CSP estricta (sin estilos ni scripts en línea).
- Pruebas: `npm test` (unitarias) y `node tests/e2e/smoke.mjs` (navegador). Todo cambio del motor lleva prueba.

## Identidad visual (logo Monterroso)

- Paleta: carbón + oro champaña de marca; pasteles apagados solo para estados (menta = ok, rosa = error, arena = alerta, cielo = info, lavanda = neutro, durazno = fórmulas), generados en OKLCH con igual luminosidad y croma.
- Orden: 24 px entre secciones (`.view`), tarjetas planas de un solo nivel, iconos de `js/ui/icons.js` (nunca glifos Unicode), piezas de `js/ui/kit.js`. Oscuro es la referencia de diseño; claro es marfil cálido.
- Todo color sale de `css/tokens.css` (nunca hex sueltos en componentes). Si cambias un token, `npm test` verifica contraste WCAG AA en ambos temas.
- Barra lateral siempre carbón; el logo va sobre una placa marfil (sus letras son negras). Títulos en serif, cuerpo en sans del sistema; sin fuentes externas (CSP).
- Assets de marca en `assets/` (logo, monograma, favicon): son de la firma, no datos de clientes.

## Datos y confidencialidad

- **Nunca** commitear datos de clientes, nombres, NIT, cuentas bancarias, claves ni archivos `.xlsx/.docx/.pdf/.zip` (ver `.gitignore`). Datos de prueba: solo sintéticos (`js/demo/`).
- Para ayudar con datos reales, usar datos seudonimizados salvo que el auditor indique lo contrario por tarea.
- Los secretos (token de Supabase, etc.) van en el entorno, nunca en el chat ni en el repo.

## Qué NO hacer

No inventar cifras, normas ni fechas legales. La parte legal se valida con fuentes oficiales y la aprobación final es del auditor y su asesor.

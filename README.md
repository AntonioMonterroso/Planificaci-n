# AuditOS

Plataforma HTML tipo ERP para **auditoría externa** (NIA + NIIF para PYMES, Guatemala): perfil del encargo, cédulas con cuadre automático (centralizadora → sumaria → analíticas → subanalíticas), analíticos, hallazgos, cumplimiento legal y trabajo conjunto con Claude. Multi-cliente, responsiva, con modo claro y oscuro.

> Estado: **v0.1 (demostración)**. Núcleo de cálculo y primer panel de cédulas con datos sintéticos. Aún sin conexión a Supabase. El plan completo está en [`docs/plan.md`](docs/plan.md).

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

## Seguridad (resumen)

El repositorio contiene **solo código**. Los datos de clientes vivirán en Supabase (RLS forzada, login por usuario y contraseña, cifrado de contenido en el navegador, bitácora encadenada). Nunca se versionan datos, claves ni archivos de clientes (`.gitignore`, `.gitleaks.toml`). Detalle en `docs/plan.md`.

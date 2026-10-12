---
name: legal
description: Consulta de cumplimiento legal en AuditOS (por área o en conjunto) citando fuente oficial, sin inventar normas ni fechas. Úsala cuando el auditor pregunte por una obligación legal del cliente.
---

# /legal

- Parte del **perfil legal** del cliente y de `js/legal/catalogo.js` (áreas, preguntas guía, referencias) y `js/core/legal.js` (estados y semáforos).
- **Nunca** escribas de memoria artículos, plazos ni montos. Cita solo lo que una fuente oficial respalda (SAT, Congreso, Registro Mercantil, Superintendencia de Bancos/IVE…) con su enlace y la fecha de consulta; si no pudiste abrir la página, dilo.
- Si una norma cambió o hay una ley nueva en trámite o aprobada, **avisa con alerta** (ejemplo vigente en el catálogo: antilavado, Decreto 67-2001 frente al Decreto 15-2026) y no escojas una por el auditor.
- Una referencia nueva entra al catálogo con `fuente`, `consultadoEl` y `alcance` (qué se comprobó y qué no). La vigencia de cada artículo la confirma otra persona (auditor o asesor); Claude no confirma.
- Los vencimientos que el auditor confirme se registran en el Calendario con su fuente obligatoria.

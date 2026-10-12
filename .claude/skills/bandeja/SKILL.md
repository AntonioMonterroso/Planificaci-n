---
name: bandeja
description: Procesa las solicitudes pendientes de la Bandeja de Claude de AuditOS (revisar, explicar una diferencia, borrador, hallazgo, duda de norma) y deja entregas con evidencia para que el auditor decida. Úsala cuando el auditor pida "procesa la bandeja" o "revisa lo pendiente".
---

# /bandeja

Claude propone, el auditor decide. Esta skill lee las solicitudes pendientes como el usuario `asistente` y deja **entregas**; no acepta, no firma, no crea solicitudes ni desbloquea nada.

## Requisitos (variables de entorno, nunca en el chat ni en el repo)
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ASISTENTE_EMAIL`, `ASISTENTE_PASSWORD`, `AUDITOS_FRASE` (frase de cifrado). Si falta alguna, dilo y detente.

## Pasos
1. `node scripts/asistente.mjs pendientes` → lista (pregunta descifrada, tipo, referencia, encargo).
2. Para cada solicitud, en orden: `node scripts/asistente.mjs tomar <id>`.
3. Reúne el contexto: `node scripts/asistente.mjs leer` (cédulas descifradas, problemas del motor, trabajo guardado). Usa el motor (`js/core/ledger.js`) para calcular, no estimes cifras.
4. Escribe la entrega en un archivo **fuera del repo** (scratchpad) con: `{org_id, request_id, body, evidence:[{tipo:'celda'|'norma'|'ley'|'documento', ref}], missing?, draft?}` y envíala con `node scripts/asistente.mjs entregar <archivo.json>`.

## Reglas de la entrega
- Toda afirmación cita su origen: cédula/celda (`A1-4!F28`), norma o ley. Sin evidencia, declara en `missing` qué dato falta; **nunca inventes** cifras, normas ni fechas legales.
- Un `draft` es una propuesta que solo se aplica si el auditor acepta.
- Datos de clientes: no los copies al repo, a logs ni a mensajes fuera de la entrega cifrada. Borra los archivos temporales al terminar.
- Al final, resume en el chat qué entregaste y qué quedó sin poder responder.

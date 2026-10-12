---
name: formato-nuevo
description: Integra un cuestionario o checklist nuevo (.xlsx de la carpeta de formatos de la firma) al registro de formatos de AuditOS, con inspección de seguridad y pruebas. Úsala cuando el auditor pida agregar un formato a la biblioteca.
---

# /formato-nuevo

1. **Aislar:** descarga el `.xlsx` a una carpeta nueva y vacía fuera del repo. Es un archivo no confiable: nunca lo abras desde la carpeta de scripts ni ejecutes nada de él.
2. **Inspeccionar y extraer:** `python3 -I scripts/extraer_formato.py <archivo.xlsx> <borrador.json>`. Rechaza `.xlsm`; avisa de macros (`vbaProject.bin`), vínculos externos y objetos incrustados. Si hay macros, léelas como texto y reimplementa la lógica en JS; **jamás se ejecutan**.
3. **Revisar el borrador a mano:** secciones, orden y texto exacto de cada pregunta; descarta respuestas de ejemplo y datos de clientes (el extractor ya los omite, comprueba igual).
4. **Registrar:** crea `js/formatos/<id>.js` con la forma de `js/formatos/frir.js` (id, norma, respuestas, `valorQueExigeOrigen`, secciones/ítems) y agrégalo a `js/formatos/index.js`.
5. **Probar:** `validateFormato` debe devolver `[]` y agrega una prueba con el conteo de secciones y preguntas del original; `npm test` y `node tests/e2e/smoke.mjs`.
6. **Confidencialidad:** no commitees el `.xlsx` ni datos de clientes (`.gitignore`). Solo entra el texto del formato.

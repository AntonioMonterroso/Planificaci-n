---
name: revisar
description: Revisión previa a firma de una cédula, rubro o fase de AuditOS: cuadres sub→sumaria→centralizadora, atributos A–D, cifras sin origen, documentos del cliente, formatos y legal. Úsala antes de que el auditor firme o cierre una fase.
---

# /revisar

Entrega un **informe de revisión** con semáforo (verde/ámbar/rojo) y lista de pendientes. No firma ni cierra nada.

## Qué comprobar (con el motor, no a ojo)
1. **Cuadres:** `new Ledger(datos)` de `js/core/ledger.js` y revisar `ledger.issues` (errores y alertas) en la cédula, su sumaria y la centralizadora (activo = pasivo + patrimonio, contabilidad y auditoría).
2. **Cifras sin origen** (`sin_origen`) y **cifras tecleadas en líneas enlazadas**.
3. **Cuatro ojos:** elaborador ≠ revisor ≠ autorizador (atributos A–D).
4. **Documentos del cliente:** los que respaldan la cédula deben estar aceptados (`js/core/engagement.js`, `pbcSummary`).
5. **Formatos** del rubro (`js/core/formato.js`, `closeBlockers`) y **cumplimiento legal** del área (`js/core/legal.js`).
6. **Ocupaciones:** sin vacantes en la fase (`resolveOccupations`, `phaseGate`).

## Entrega
Semáforo por punto, cada hallazgo con su referencia (`ref!clave`) y lo que falta para pasar a verde. Si un dato no está disponible, dilo; no lo supongas. La decisión de firmar es del auditor.

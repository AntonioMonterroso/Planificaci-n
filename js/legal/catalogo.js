// Catálogo de cumplimiento legal: ÁREAS, preguntas guía y REFERENCIAS verificadas.
//
// Reglas de este archivo:
//  - No contiene fechas legales ni artículos de memoria. Una referencia solo se cita si una fuente oficial la menciona
//    (campo `fuente` + `consultadoEl`). `alcance` dice QUÉ se hizo: se vio el instrumento citado en resultados de búsqueda
//    que apuntan a la fuente; la página oficial NO se pudo abrir desde este entorno y la vigencia de cada artículo NO está
//    verificada. Debe abrirla y confirmarla el auditor o su asesor.
//  - Las preguntas guía son revisiones propuestas por Claude (no son texto de ley); el asesor las ajusta.
//  - Áreas sin referencia verificada lo dicen: "Norma por citar".

const V = '2026-10-12';
const SOLO_TITULO = 'Citado por la fuente oficial en resultados de búsqueda; la página no se pudo abrir desde este entorno y la vigencia de cada artículo no está verificada';

export const PERFIL_CAMPOS = [
  ['comerciante', 'Comerciante obligado a llevar contabilidad'],
  ['tieneEmpleados', 'Tiene empleados en relación de dependencia'],
  ['sujetoObligadoLD', 'Sujeto obligado en prevención de lavado de activos'],
  ['sinFinesLucro', 'Entidad sin fines de lucro'],
  ['financiamiento', 'Tiene financiamiento externo'],
];

export const AREAS = [
  { id: 'sat_iva', nombre: 'SAT · IVA', aplica: () => true,
    referencias: [
      { titulo: 'Ley del Impuesto al Valor Agregado (Decreto 27-92)', fuente: 'https://portal.sat.gob.gt/portal/leyes-reglamentos-los-impuestos/', consultadoEl: V, alcance: SOLO_TITULO },
      { titulo: 'Reglamento de la Ley del IVA (Acuerdo Gubernativo 5-2013)', fuente: 'https://portal.sat.gob.gt/portal/leyes-reglamentos-los-impuestos/', consultadoEl: V, alcance: SOLO_TITULO }],
    requisitos: [
      { id: 'iva1', texto: '¿Las declaraciones del impuesto del periodo auditado están presentadas, pagadas y con soporte?' },
      { id: 'iva2', texto: '¿Los débitos y créditos fiscales declarados concilian con los libros auxiliares de ventas y compras?' },
      { id: 'iva3', texto: '¿La facturación emitida y recibida cumple el régimen de facturación electrónica que corresponde a la entidad?' }] },
  { id: 'sat_isr', nombre: 'SAT · ISR y retenciones', aplica: () => true,
    referencias: [
      { titulo: 'Ley de Actualización Tributaria (Decreto 10-2012), Libro I: Impuesto sobre la Renta', fuente: 'https://portal.sat.gob.gt/portal/biblioteca-en-linea-sat/legislacion-tributaria/', consultadoEl: V, alcance: SOLO_TITULO },
      { titulo: 'Reglamento del Libro I de la Ley de Actualización Tributaria (Acuerdo Gubernativo 213-2013)', fuente: 'https://portal.sat.gob.gt/portal/biblioteca-en-linea-sat/legislacion-tributaria/', consultadoEl: V, alcance: SOLO_TITULO }],
    requisitos: [
      { id: 'isr1', texto: '¿El régimen del impuesto sobre la renta aplicado por la entidad es el que le corresponde y está documentado?' },
      { id: 'isr2', texto: '¿Las declaraciones y pagos del impuesto del periodo están presentados y respaldados?' },
      { id: 'isr3', texto: '¿Las retenciones practicadas y enteradas concilian con los registros contables?' }] },
  { id: 'sat_libros', nombre: 'Libros y registros contables', aplica: (p) => !!p.comerciante,
    referencias: [
      { titulo: 'Código de Comercio (Decreto 2-70)', fuente: 'https://portal.mineco.gob.gt/sites/default/files/Mineco/ley_-_codigo_de_comercio_decreto_2-70_-_02-11-1970.pdf', consultadoEl: V, alcance: SOLO_TITULO }],
    requisitos: [
      { id: 'lib1', texto: '¿Los libros y registros que exige la ley a la entidad están autorizados, habilitados y al día?' },
      { id: 'lib2', texto: '¿Las cuentas bancarias que usa la entidad están registradas en su contabilidad?' }] },
  { id: 'nomina', nombre: 'Seguridad social y prestaciones laborales', aplica: (p) => !!p.tieneEmpleados, referencias: [],
    requisitos: [
      { id: 'nom1', texto: '¿Las cuotas y planillas de seguridad social del periodo están presentadas y pagadas, y concilian con la nómina contable?' },
      { id: 'nom2', texto: '¿Las provisiones de prestaciones laborales están calculadas y registradas con su soporte?' }] },
  { id: 'comercio', nombre: 'Código de Comercio y sociedades', aplica: (p) => !!p.comerciante,
    referencias: [
      { titulo: 'Código de Comercio (Decreto 2-70)', fuente: 'https://portal.mineco.gob.gt/sites/default/files/Mineco/ley_-_codigo_de_comercio_decreto_2-70_-_02-11-1970.pdf', consultadoEl: V, alcance: SOLO_TITULO }],
    requisitos: [
      { id: 'com1', texto: '¿Las actas de asamblea y los registros de la sociedad están al día y respaldan lo registrado (dividendos, aumentos de capital, aprobaciones)?' }] },
  { id: 'marco', nombre: 'Marco contable y de auditoría', aplica: () => true, referencias: [],
    requisitos: [
      { id: 'mar1', texto: '¿El marco de información financiera aplicado está identificado y es el que corresponde a la entidad?' },
      { id: 'mar2', texto: '¿Las normas de auditoría aplicadas están identificadas y son las adoptadas por el órgano que rige la profesión?' }] },
  { id: 'lavado', nombre: 'Prevención de lavado de activos y financiamiento del terrorismo', aplica: (p) => !!p.sujetoObligadoLD,
    referencias: [
      { titulo: 'Ley contra el Lavado de Dinero u Otros Activos (Decreto 67-2001), citada por la Superintendencia de Bancos / IVE', fuente: 'https://www.sib.gob.gt/ive/sistema-de-prevencion-de-ld-ft/delito-de-lavado-de-dinero-y-financiamiento-del-terrorismo/', consultadoEl: V, alcance: SOLO_TITULO },
      { titulo: 'ALERTA: el Congreso comunicó la aprobación del Decreto 15-2026 (Ley Integral para la Prevención y Represión del Lavado de Dinero u Otros Activos y del Financiamiento del Terrorismo), que derogaría el Decreto 67-2001', fuente: 'https://www.congreso.gob.gt/noticias_congreso/16188/2026/4', consultadoEl: V, alcance: 'Solo se vio el comunicado en resultados de búsqueda: no se confirmó su publicación ni su entrada en vigor. Verificar en el Diario de Centro América antes de usar cualquiera de las dos leyes', alerta: true }],
    requisitos: [
      { id: 'ld1', texto: '¿La entidad está registrada como persona obligada y tiene designado a su responsable de cumplimiento?' },
      { id: 'ld2', texto: '¿Existe un programa de prevención aprobado, con debida diligencia del cliente y reporte de operaciones sospechosas, aplicado en el periodo?' }] },
  { id: 'sector', nombre: 'Regulación sectorial (entidades sin fines de lucro y otras)', aplica: (p) => !!p.sinFinesLucro, referencias: [],
    requisitos: [
      { id: 'sec1', texto: '¿La entidad cumple las obligaciones propias de su sector y régimen, con la norma que corresponda identificada?' }] },
  { id: 'cruces', nombre: 'Cruces entre áreas', aplica: () => true, referencias: [],
    requisitos: [
      { id: 'cr1', texto: 'Ventas según declaraciones de IVA frente a ventas en los estados financieros: ¿concilian o la diferencia está explicada?' },
      { id: 'cr2', texto: 'Renta declarada frente a resultado contable: ¿la conciliación fiscal está documentada?' },
      { id: 'cr3', texto: 'Planillas de seguridad social frente a gasto de nómina contable: ¿concilian?' },
      { id: 'cr4', texto: 'Operaciones con personas o entidades de riesgo frente a lo registrado en contabilidad: ¿se evaluó y documentó?' }] },
];

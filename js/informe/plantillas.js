// Plantillas de documentos de cierre. SON ESTRUCTURA Y GUÍA: el texto definitivo lo redacta el auditor y lo contrasta con la
// norma aplicable (NIA 700/705/706 para el informe). Variables entre {{llaves}} se completan con los datos del encargo.
// Los párrafos propuestos son un esqueleto mínimo y se marcan como borrador de Claude hasta que el auditor los haga suyos.

export const OPINIONES = {
  no_modificada: 'Opinión no modificada (sin salvedades)',
  con_salvedades: 'Opinión con salvedades',
  adversa: 'Opinión adversa',
  denegada: 'Denegación de opinión',
};

export const PLANTILLAS = {
  informe: {
    titulo: 'Informe del auditor independiente',
    secciones: [
      { id: 'destinatario', titulo: 'Destinatario', guia: 'A quién se dirige el informe según los términos del encargo.', texto: 'A los accionistas o a quien corresponda de {{entidad}}' },
      { id: 'opinion', titulo: 'Opinión', guia: 'Redacta según el tipo de opinión elegido. Identifica los estados financieros, el periodo y el marco de información aplicado.', texto: 'Hemos auditado los estados financieros de {{entidad}} correspondientes al periodo {{periodo}}, expresados en {{moneda}}. [Completar la opinión según el tipo elegido y el marco de información financiera aplicable.]' },
      { id: 'fundamento', titulo: 'Fundamento de la opinión', guia: 'Indica las normas de auditoría aplicadas, la independencia y la suficiencia de la evidencia. Si la opinión es modificada, describe aquí el fundamento de la modificación.', texto: '' },
      { id: 'cuestiones', titulo: 'Cuestiones clave de la auditoría (si aplica)', guia: 'Solo si corresponde según la norma y el tipo de entidad. Si no aplica, déjalo en blanco y márcalo como no aplica.', texto: '' },
      { id: 'dir', titulo: 'Responsabilidades de la dirección', guia: 'Responsabilidad sobre la preparación de los estados financieros y el control interno.', texto: '' },
      { id: 'auditor', titulo: 'Responsabilidades del auditor', guia: 'Objetivo de la auditoría y alcance de la seguridad razonable.', texto: '' },
      { id: 'firma', titulo: 'Firma, fecha y lugar', guia: 'La firma y fecha las pone el auditor. La fecha no puede ser anterior a la obtención de la evidencia suficiente.', texto: 'Fecha del informe: {{fecha_informe}}' },
    ],
  },
  carta_gerencia: {
    titulo: 'Carta de gerencia',
    secciones: [
      { id: 'intro', titulo: 'Introducción', guia: 'Alcance y propósito de la carta; recuerda que no es una opinión.', texto: 'A la administración de {{entidad}}. Como parte de nuestra auditoría del periodo {{periodo}}, comunicamos las observaciones y recomendaciones siguientes.' },
      { id: 'hallazgos', titulo: 'Hallazgos y recomendaciones', guia: 'Por cada hallazgo: situación, criterio, causa, efecto y recomendación, con referencia a la cédula de origen.', texto: '' },
      { id: 'cierre', titulo: 'Cierre', guia: 'Agradecimiento y respuesta esperada de la administración.', texto: '' },
    ],
  },
  carta_representacion: {
    titulo: 'Carta de representación',
    secciones: [
      { id: 'encabezado', titulo: 'Encabezado', guia: 'Dirigida al auditor, con la fecha cercana a la del informe.', texto: 'Fecha: {{fecha_informe}}. Entidad: {{entidad}}. Periodo: {{periodo}}.' },
      { id: 'declaraciones', titulo: 'Declaraciones de la dirección', guia: 'Declaraciones sobre responsabilidad, información proporcionada, partes vinculadas, hechos posteriores y fraude, ajustadas al encargo.', texto: '' },
      { id: 'firmas', titulo: 'Firmas de la administración', guia: 'Firman quienes tienen la responsabilidad según el encargo. No las firma el auditor.', texto: '' },
    ],
  },
};

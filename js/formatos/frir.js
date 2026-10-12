// Cuestionario de identificación de factores de riesgo inherentes relevantes (adaptado de la NIA 315 revisada 2019).
// Fuente: formato de la firma "Cuestionario para la identificación de factores de riesgos inherentes relevantes.xlsx"
// (carpeta Formatos para AUDITORÍA Externa). Solo el texto del formato: sin respuestas ni datos de clientes.
const q = (n, texto) => ({ id: `${n}`, texto });

export const FRIR = {
  id: 'frir', version: 1, titulo: 'Cuestionario de identificación de factores de riesgo inherentes relevantes', norma: 'NIA 315 (Revisada 2019)',
  objetivo: 'Posterior al conocimiento de la entidad, su entorno y el marco de información financiera, identificar los factores de riesgo que pueden impactar los estados financieros, para documentarlos, valorarlos y diseñar una respuesta de auditoría adecuada.',
  respuestas: ['SI', 'NO'], valorQueExigeOrigen: 'SI',
  secciones: [
    { id: 'complejidad', nombre: 'Complejidad', descripcion: 'Naturaleza de la información y forma en la que se prepara.', items: [
      q('c1', '¿La entidad cuenta con operaciones sujetas a un grado de regulación compleja?'),
      q('c2', '¿La entidad cuenta con alianzas y negocios conjuntos complejos?'),
      q('c3', '¿Existen mediciones contables que conllevan procesos complejos?'),
      q('c4', '¿La entidad utiliza métodos de financiación con entidades de cometido especial?'),
      q('c5', '¿La entidad utiliza otros acuerdos de financiación complejos?')] },
    { id: 'subjetividad', nombre: 'Subjetividad', descripcion: 'Limitaciones inherentes para preparar la información y juicio subjetivo de la dirección.', items: [
      q('s1', '¿Se cuenta con un amplio rango de posibles criterios de medición de una estimación contable? Por ejemplo: reconocimiento de la dirección de ingresos y gastos por depreciación.'),
      q('s2', '¿Se cuenta con técnicas o modelos de valuación para un activo no corriente? Por ejemplo: propiedades de inversión.')] },
    { id: 'cambios', nombre: 'Cambios', descripcion: 'Hechos que con el tiempo afectan el negocio; pueden ocurrir durante o entre periodos.', items: [
      q('k1', '¿Se cuenta con operaciones en regiones económicamente inestables, como por ejemplo con devaluación de la moneda?'),
      q('k2', '¿La entidad cuenta con operaciones expuestas a mercados volátiles?'),
      q('k3', '¿La entidad cuenta con problemas de empresa en funcionamiento?'),
      q('k4', '¿La entidad cuenta con problema de liquidez?'),
      q('k5', '¿Existen cambios en el sector en el que opera la entidad?'),
      q('k6', '¿Existen cambios en la cadena de suministros?'),
      q('k7', '¿Cuentan con una oferta de nuevos productos o servicios o cambios a nuevas líneas de negocio?'),
      q('k8', '¿La entidad tiene una posible expansión a nuevas ubicaciones?'),
      q('k9', '¿Existen importantes adquisiciones o reorganizaciones, u otros hechos inusuales?'),
      q('k10', '¿Existe la probabilidad de venta de segmentos de negocio?'),
      q('k11', '¿La entidad tiene prevista la modificación de personal clave, incluidos ejecutivos?'),
      q('k12', '¿Existen cambios en el entorno de TI?'),
      q('k13', '¿La entidad cuenta con instalación de nuevos y significativos sistemas de TI enfocados en la información financiera?'),
      q('k14', '¿Existen nuevos procedimientos contables?'),
      q('k15', '¿Existen nuevas restricciones en la disponibilidad de capital y de créditos?'),
      q('k16', '¿La entidad cuenta con investigaciones sobre las operaciones y resultados financieros realizados por organismos reguladores o gubernamentales?'),
      q('k17', '¿La entidad tiene un impacto debido a nueva legislación relacionada con la protección del medio ambiente?')] },
    { id: 'incertidumbre', nombre: 'Incertidumbre', descripcion: 'Información que no puede basarse en datos suficientemente precisos y verificables por observación directa.', items: [
      q('i1', '¿Existen hechos o transacciones que implican incertidumbre significativa de medición, estimaciones contables e información a revelar relacionada?'),
      q('i2', '¿La entidad cuenta con litigios y pasivos contingentes pendientes? Por ejemplo: garantías financieras, reparación medioambiental.')] },
    { id: 'sesgos', nombre: 'Susceptibilidad a sesgos', descripcion: 'Susceptibilidad a fallas intencionales o no intencionales de la dirección para mantener neutralidad; incentivos o presiones.', items: [
      q('b1', '¿Existen oportunidades para que la dirección y empleados participen en informes financieros fraudulentos, incluida la omisión de información importante a revelar?'),
      q('b2', '¿La entidad tiene transacciones significativas con partes vinculadas?'),
      q('b3', '¿La entidad cuenta con un número significativo de transacciones no rutinarias o no sistemáticas?'),
      q('b4', '¿Existen transacciones registradas sobre la base de las intenciones de la dirección?')] },
    { id: 'otros', nombre: 'Otros factores de riesgo', items: [
      q('o1', '¿El personal de la entidad no cuenta con las habilidades necesarias en el área contable y de información financiera?'),
      q('o2', '¿La entidad tiene deficiencias de control, como por ejemplo en el proceso de valoración de riesgos y de seguimiento?'),
      q('o3', '¿Existen incorrecciones anteriores, historial de errores o un elevado número de ajustes al cierre de periodo?')] },
  ],
};

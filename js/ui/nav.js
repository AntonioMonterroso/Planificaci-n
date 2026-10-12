// Mapa de paneles del ERP. `ready` indica si ya existe; el resto muestra su alcance como hoja de ruta.
export const NAV = [
  { group: 'Panel', items: [
    { id: 'tablero', icon: '◐', label: 'Tablero general', ready: true },
  ] },
  { group: 'Gestión', items: [
    { id: 'clientes', icon: '☷', label: 'Clientes', desc: 'Expedientes de clientes, datos legales, representantes y contactos.' },
    { id: 'encargos', icon: '▤', label: 'Encargos', desc: 'Carta de encargo, vigencia, periodo auditado, honorarios, hitos y fecha límite de armado del archivo (NIA 230).' },
    { id: 'perfil', icon: '☰', label: 'Perfil del encargo', desc: 'Contrato y temporalidad, equipo, independencia, documentos recibidos del cliente y su verificación formal.' },
    { id: 'pbc', icon: '⇪', label: 'Documentos del cliente', desc: 'Solicitudes (PBC), recepción, versión y huella, verificación (firmas, sellos, periodo, cuadre) y custodia.' },
    { id: 'equipo', icon: '☺', label: 'Equipo y tiempo', desc: 'Roles, ocupaciones y suplentes, horas estimadas vs reales, permisos concedibles.' },
  ] },
  { group: 'Auditoría', items: [
    { id: 'cedulas', icon: '▦', label: 'Cédulas', ready: true },
    { id: 'riesgos', icon: '⚑', label: 'Riesgos y materialidad', desc: 'Evaluación de riesgos, fraude (NIA 240), materialidad y respuestas (NIA 315/320/330).' },
    { id: 'analiticos', icon: '∿', label: 'Analíticos HAVAD', desc: '15 ratios con DuPont y gráficos, calculados en el navegador.' },
    { id: 'ajustes', icon: '±', label: 'Ajustes y reclasificaciones', desc: 'Libro de partidas con control de cuadre y aprobación.' },
    { id: 'hallazgos', icon: '✎', label: 'Hallazgos y cartas', desc: 'Hallazgos, recomendaciones, divulgaciones y carta de gerencia, editables.' },
    { id: 'cierre', icon: '✓', label: 'Cierre', desc: 'Hechos posteriores, empresa en funcionamiento, representación y lista de verificación.' },
    { id: 'informe', icon: '❖', label: 'Informe y opinión', desc: 'Informe y opinión (NIA 700/705/706) con plantillas editables y exportación.' },
  ] },
  { group: 'Cumplimiento', items: [
    { id: 'legal', icon: '⚖', label: 'Cumplimiento legal', desc: 'SAT, IGSS, Código de Comercio, lavado de activos y más: por separado y en conjunto.' },
    { id: 'calendario', icon: '▣', label: 'Calendario', desc: 'Vencimientos fiscales, laborales y plazos del encargo.' },
    { id: 'biblioteca', icon: '❏', label: 'Biblioteca', desc: 'Guías, políticas y buenas prácticas con búsqueda.' },
  ] },
  { group: 'Sistema', items: [
    { id: 'claude', icon: '✦', label: 'Bandeja de Claude', desc: 'Pide revisiones, preguntas y borradores; recibe entregas con evidencia.' },
    { id: 'bitacora', icon: '⛓', label: 'Bitácora', desc: 'Registro inalterable con hashes encadenados.' },
    { id: 'seguridad', icon: '⚿', label: 'Seguridad', desc: 'Usuarios, roles, permisos, MFA, llaves y respaldos.' },
  ] },
];

export const FLAT = NAV.flatMap((g) => g.items);

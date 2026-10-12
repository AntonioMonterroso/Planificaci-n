// Mapa de paneles del ERP. `ready` = ya existe; el resto se muestra atenuado y abre su hoja de alcance.
export const NAV = [
  { group: 'General', items: [
    { id: 'tablero', icon: 'dashboard', label: 'Tablero', ready: true },
  ] },
  { group: 'Gestión', items: [
    { id: 'clientes', icon: 'users', label: 'Clientes', desc: 'Expedientes de clientes, datos legales, representantes y contactos.' },
    { id: 'encargos', icon: 'briefcase', label: 'Encargos', desc: 'Carta de encargo, vigencia, periodo auditado, honorarios, hitos y fecha límite de armado del archivo (NIA 230).' },
    { id: 'perfil', icon: 'clipboard', label: 'Perfil del encargo', ready: true },
    { id: 'pbc', icon: 'upload', label: 'Documentos del cliente', ready: true },
    { id: 'equipo', icon: 'idcard', label: 'Equipo y ocupaciones', ready: true },
  ] },
  { group: 'Auditoría', items: [
    { id: 'cedulas', icon: 'grid', label: 'Cédulas', ready: true },
    { id: 'riesgos', icon: 'flag', label: 'Riesgos y materialidad', desc: 'Evaluación de riesgos, fraude (NIA 240), materialidad y respuestas (NIA 315/320/330).' },
    { id: 'analiticos', icon: 'chart', label: 'Analíticos HAVAD', desc: '15 ratios con DuPont y gráficos, calculados en el navegador.' },
    { id: 'ajustes', icon: 'plusminus', label: 'Ajustes', desc: 'Libro de partidas con control de cuadre y aprobación.' },
    { id: 'hallazgos', icon: 'edit', label: 'Hallazgos y cartas', desc: 'Hallazgos, recomendaciones, divulgaciones y carta de gerencia, editables.' },
    { id: 'cierre', icon: 'check', label: 'Cierre', desc: 'Hechos posteriores, empresa en funcionamiento, representación y lista de verificación.' },
    { id: 'informe', icon: 'file', label: 'Informe y opinión', desc: 'Informe y opinión (NIA 700/705/706) con plantillas editables y exportación.' },
  ] },
  { group: 'Cumplimiento', items: [
    { id: 'legal', icon: 'scale', label: 'Cumplimiento legal', desc: 'SAT, IGSS, Código de Comercio, lavado de activos y más: por separado y en conjunto.' },
    { id: 'calendario', icon: 'calendar', label: 'Calendario', desc: 'Vencimientos fiscales, laborales y plazos del encargo.' },
    { id: 'biblioteca', icon: 'book', label: 'Biblioteca', desc: 'Guías, políticas y buenas prácticas con búsqueda.' },
  ] },
  { group: 'Sistema', items: [
    { id: 'claude', icon: 'sparkle', label: 'Bandeja de Claude', desc: 'Pide revisiones, preguntas y borradores; recibe entregas con evidencia.' },
    { id: 'bitacora', icon: 'chain', label: 'Bitácora', desc: 'Registro inalterable con hashes encadenados.' },
    { id: 'seguridad', icon: 'shield', label: 'Seguridad', desc: 'Usuarios, roles, permisos, MFA, llaves y respaldos.' },
  ] },
];

export const FLAT = NAV.flatMap((g) => g.items);

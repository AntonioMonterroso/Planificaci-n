// Iconos de trazo coherentes (24×24, trazo 1.75). Se construyen con createElementNS: compatible con la CSP.
const NS = 'http://www.w3.org/2000/svg';

const P = (d) => ['path', { d }];
const R = (x, y, w, h, rx = 0) => ['rect', { x, y, width: w, height: h, rx }];
const C = (cx, cy, r) => ['circle', { cx, cy, r }];

const SHAPES = {
  dashboard: [R(3, 3, 7, 9, 2), R(14, 3, 7, 5, 2), R(14, 12, 7, 9, 2), R(3, 16, 7, 5, 2)],
  users: [C(9, 8, 3), P('M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6'), C(17, 9, 2.5), P('M16 14.2c2.9.3 5 2.6 5 5.8')],
  briefcase: [R(3, 7, 18, 13, 2), P('M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2'), P('M3 13h18')],
  clipboard: [R(5, 4, 14, 17, 2), R(9, 2, 6, 4, 1), P('M9 12h6M9 16h4')],
  upload: [P('M12 16V4M7 9l5-5 5 5'), P('M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3')],
  idcard: [R(3, 5, 18, 14, 2), C(9, 11, 2), P('M6 16c.5-1.5 1.7-2.3 3-2.3s2.5.8 3 2.3M15 10h3M15 14h3')],
  download: [P('M12 4v12M7 11l5 5 5-5'), P('M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3')],
  grid: [R(3, 3, 18, 18, 2), P('M3 9h18M3 15h18M9 3v18')],
  flag: [P('M5 21V4'), P('M5 4h11l-2 4 2 4H5')],
  chart: [P('M4 20V4M4 20h16'), P('M8 15l4-5 3 3 5-6')],
  plusminus: [P('M12 4v8M8 8h8M8 19h8')],
  edit: [P('M4 20h4L19 9l-4-4L4 16z'), P('M13.5 6.5l4 4')],
  check: [C(12, 12, 9), P('M8 12.5l3 3 5-6')],
  file: [P('M7 3h7l5 5v13H7z'), P('M14 3v5h5M10 13h6M10 17h6')],
  scale: [P('M12 4v16M7 20h10M5 7h14'), P('M5 7l-3 6a3 3 0 0 0 6 0z'), P('M19 7l-3 6a3 3 0 0 0 6 0z')],
  calendar: [R(3, 5, 18, 16, 2), P('M3 10h18M8 3v4M16 3v4')],
  book: [P('M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z'), P('M5 17a3 3 0 0 1 3-3h10')],
  sparkle: [P('M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z'), P('M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z')],
  chain: [P('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1'), P('M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1')],
  shield: [P('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'), P('M9 12l2 2 4-4')],
  up: [P('M12 19V5M6 11l6-6 6 6')],
  home: [P('M4 11l8-7 8 7'), P('M6 10v10h12V10')],
  copy: [R(9, 9, 11, 11, 2), P('M5 15V6a2 2 0 0 1 2-2h9')],
  sigma: [P('M18 5H7l6 7-6 7h11')],
  chevron: [P('M9 6l6 6-6 6')],
  down: [P('M6 9l6 6 6-6')],
  sun: [C(12, 12, 4), P('M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5')],
  moon: [P('M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z')],
  menu: [P('M4 7h16M4 12h16M4 17h16')],
  plus: [P('M12 5v14M5 12h14')],
  x: [P('M6 6l12 12M18 6L6 18')],
  alert: [P('M12 4l9 16H3z'), P('M12 10v4M12 17.2v.1')],
  info: [C(12, 12, 9), P('M12 11v5M12 8v.1')],
  lock: [R(5, 11, 14, 10, 2), P('M8 11V8a4 4 0 0 1 8 0v3')],
  clock: [C(12, 12, 9), P('M12 7v5l3 2')],
  user: [C(12, 8, 4), P('M4 21c0-4 3.6-7 8-7s8 3 8 7')],
  paperclip: [P('M20 11l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 17a2 2 0 0 1-3-3l7-7')],
};

/** icon('grid') → <svg> de 20 px que hereda el color del texto. */
export function icon(name, size = 20, extra = '') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `ico-svg ${extra}`.trim());
  for (const [tag, attrs] of SHAPES[name] ?? SHAPES.info) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}

export const ICON_NAMES = Object.keys(SHAPES);

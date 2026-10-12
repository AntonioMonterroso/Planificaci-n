// Prueba de humo en navegador real. Uso: node tests/e2e/smoke.mjs [urlBase] [dirCapturas]
// Requiere Playwright (PLAYWRIGHT_PATH para indicar su ruta) y el sitio sirviéndose (npm run serve).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');

const base = process.argv[2] ?? 'http://localhost:8080';
const PAGE = process.env.PAGE ?? 'index.html';
const out = process.argv[3] ?? '/tmp';
const problems = [];
const check = (ok, msg) => { console.log(`${ok ? 'OK ' : 'FALLA'}  ${msg}`); if (!ok) problems.push(msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], colorScheme: 'dark' });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
const gaps = (p) => p.evaluate(() => { const k = [...document.querySelectorAll('.view > *')]; return k.slice(1).map((el, i) => Math.round(el.getBoundingClientRect().top - k[i].getBoundingClientRect().bottom)); });

// ---- Tablero ----
await page.goto(`${base}/${PAGE}#/tablero`);
await page.waitForSelector('.stat .num');
await page.waitForTimeout(1100);
await page.screenshot({ path: `${out}/01-tablero-oscuro.png`, fullPage: true });
check((await page.locator('.nav a').count()) >= 18, 'navegación con todos los paneles');
check(/^(assets\/logo\.webp|data:image\/webp)/.test(await page.locator('.logo-plate img').getAttribute('src')), 'el tablero muestra el logo completo');
check((await page.locator('.brand-name').textContent()) === 'Monterroso', 'lockup de marca en la barra lateral');
check((await gaps(page)).every((g) => g >= 20), `secciones separadas por ≥ 20 px (${(await gaps(page)).join(', ')})`);

// ---- Cédulas ----
await page.goto(`${base}/${PAGE}#/cedulas/A1-1`);
await page.waitForSelector('table.ledger');
check((await page.locator('.crumbs .cur').textContent()) === 'A1-1', 'breadcrumb muestra A1-1');
check((await page.locator('.crumbs a').allTextContents()).join(',').includes('BG'), 'breadcrumb ofrece subir a BG');
check((await gaps(page)).every((g) => g >= 20), 'cédulas: secciones separadas');

const row = page.locator('tr[data-key="efectivo"]');
const input = row.locator('input.cell-in');
await input.click(); await input.fill('=1000+2500+250.5'); await input.press('Enter');
await page.waitForTimeout(300);
check((await page.locator('tr[data-key="efectivo"] input').inputValue()) === 'Q3,750.50', 'la celda calcula =1000+2500+250.5 -> Q3,750.50');
check((await page.locator('tr[data-key="efectivo"] .fx').count()) === 1, 'aparece el indicador ƒ con componentes');
const tot = await page.locator('table.ledger tfoot tr td').nth(1).textContent();
check(tot.includes('6,101.00'), `el total sube (${tot})`);

const inp2 = page.locator('tr[data-key="efectivo"] input.cell-in');
await inp2.click(); await inp2.fill('=alert(1)'); await inp2.press('Enter');
await page.waitForTimeout(200);
check((await inp2.getAttribute('class')).includes('err'), 'expresión maliciosa se rechaza');
await inp2.fill('Q3,750.50'); await inp2.press('Enter');

await page.locator('summary', { hasText: 'Marcas de auditoría' }).click();
await page.locator('.mark-item', { hasText: 'Documento verificado' }).locator('button').click();
check((await page.evaluate(() => navigator.clipboard.readText())) === '¥', 'copiar marca ¥');
await page.locator('button', { hasText: 'Copiar tabla' }).click();
const tsv = await page.evaluate(() => navigator.clipboard.readText());
check(tsv.split('\n').length >= 5 && tsv.includes('\t'), 'copiar tabla produce texto tabulado');

await page.locator('tr[data-key="efectivo"] td.cell-pick').first().click({ modifiers: ['Control'] });
await page.locator('tr[data-key="cheques"] td.cell-pick').first().click({ modifiers: ['Control'] });
await page.waitForSelector('#statusbar:not([hidden])');
check((await page.locator('#statusbar').textContent()).includes('Q5,801.00'), 'barra de suma de celdas');
await page.screenshot({ path: `${out}/02-cedula-oscuro.png`, fullPage: true });

await page.goto(`${base}/${PAGE}#/cedulas/A`);
await page.waitForSelector('table.ledger');
await page.locator('summary', { hasText: 'Ajustes y reclasificaciones' }).click();
await page.selectOption('#adj-debe', 'A1-2|fondo');
await page.selectOption('#adj-haber', 'A1-1|efectivo');
await page.fill('#adj-amt', '=100+50'); await page.fill('#adj-memo', 'Prueba');
await page.locator('button', { hasText: 'Registrar partida' }).click();
await page.waitForTimeout(300);
await page.locator('summary', { hasText: 'Ajustes y reclasificaciones' }).click();
check((await page.locator('.banner.ok b', { hasText: 'AJ-2' }).count()) > 0, 'se registra la partida AJ-2');

// ---- Perfil del encargo ----
await page.goto(`${base}/${PAGE}#/perfil`);
await page.waitForSelector('.tl-track');
await page.waitForTimeout(800);
check((await page.locator('.tl-pin').count()) >= 6, 'línea de tiempo con hitos');
check((await page.locator('.ph').count()) === 6, 'seis fases');
check((await page.locator('.kv .k', { hasText: 'Armado del archivo' }).count()) === 1, 'plazo de armado del archivo');
check((await gaps(page)).every((g) => g >= 20), 'perfil: secciones separadas');
await page.screenshot({ path: `${out}/03-perfil-oscuro.png`, fullPage: true });

// ---- Documentos del cliente ----
await page.goto(`${base}/${PAGE}#/pbc`);
await page.waitForSelector('table.tbl');
await page.waitForTimeout(600);
await page.locator('tr', { hasText: 'Libro mayor del ejercicio' }).click();
await page.locator('button', { hasText: 'Registrar recepción' }).click();
await page.waitForTimeout(200);
check((await page.locator('.card-head .chip', { hasText: 'Recibido' }).count()) === 1, 'PBC: recepción registrada');
await page.locator('button', { hasText: 'Iniciar verificación' }).click();
await page.waitForTimeout(200);
await page.locator('button', { hasText: 'Aceptar documento' }).click();
await page.waitForTimeout(200);
check((await page.locator('.toast').count()) > 0, 'PBC: no se acepta sin verificaciones');
await page.screenshot({ path: `${out}/04-pbc-oscuro.png`, fullPage: true });

// ---- Equipo ----
await page.goto(`${base}/${PAGE}#/equipo`);
await page.waitForSelector('.occ');
const before = await page.locator('.banner.error').count();
await page.locator('tr', { hasText: 'Encargado (demo)' }).locator('button', { hasText: 'Ausente 14 d' }).click();
await page.waitForTimeout(300);
check((await page.locator('.banner.error').count()) > before, 'Equipo: la ausencia del encargado deja funciones sin responsable');
await page.screenshot({ path: `${out}/05-equipo-oscuro.png`, fullPage: true });

// ---- Bandeja de Claude ----
await page.goto(`${base}/${PAGE}#/claude`);
await page.waitForSelector('.bandeja-item');
const items0 = await page.locator('.bandeja-item').count();
await page.fill('#b-q', '¿Qué documentos faltan para cerrar Bancos?');
await page.locator('button', { hasText: 'Enviar' }).click();
await page.waitForTimeout(300);
check((await page.locator('.bandeja-item').count()) === items0 + 1, 'Bandeja: la solicitud nueva aparece como pendiente');
await page.locator('button', { hasText: 'Aceptar' }).first().click();
await page.waitForTimeout(300);
check((await page.locator('.chip', { hasText: 'Aceptado' }).count()) >= 1, 'Bandeja: el auditor acepta la entrega');
await page.screenshot({ path: `${out}/05b-bandeja-oscuro.png`, fullPage: true });

// ---- Claro ----
await page.click('#theme-btn');
await page.waitForTimeout(300);
check((await page.getAttribute('html', 'data-theme')) === 'light', 'modo claro activo');
await page.goto(`${base}/${PAGE}#/tablero`);
await page.waitForTimeout(1100);
await page.screenshot({ path: `${out}/06-tablero-claro.png`, fullPage: true });
await page.goto(`${base}/${PAGE}#/cedulas/A1`);
await page.waitForSelector('table.ledger');
await page.screenshot({ path: `${out}/07-cedula-claro.png`, fullPage: true });

// ---- Móvil ----
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2, colorScheme: 'dark' });
const mp = await m.newPage();
mp.on('pageerror', (e) => logs.push(`pageerror(m): ${e.message}`));
mp.on('console', (msg) => { if (['error', 'warning'].includes(msg.type())) logs.push(`m ${msg.type()}: ${msg.text()}`); });
for (const [name, hash] of [['08-movil-tablero', 'tablero'], ['09-movil-cedula', 'cedulas/A1'], ['10-movil-perfil', 'perfil'], ['11-movil-pbc', 'pbc'], ['12-movil-equipo', 'equipo']]) {
  await mp.goto(`${base}/${PAGE}#/${hash}`);
  await mp.waitForSelector('#main > *');
  await mp.waitForTimeout(900);
  const over = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(over <= 1, `móvil ${hash}: sin scroll horizontal (${over}px)`);
  await mp.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
await mp.click('#menu-btn'); await mp.waitForTimeout(500);
await mp.screenshot({ path: `${out}/13-movil-menu.png` });

const csp = logs.filter((l) => /Content Security Policy|Refused/i.test(l));
check(csp.length === 0, `sin violaciones de CSP (${csp.length})`);
check(logs.length === 0, `sin errores de consola (${logs.length}) ${logs.slice(0, 3).join(' | ')}`);
await browser.close();
if (problems.length) { console.error(`\n${problems.length} problema(s)`); process.exit(1); }
console.log('\nTodo bien');

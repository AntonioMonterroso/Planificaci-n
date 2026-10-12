// Prueba de humo en navegador real. Uso: NODE_PATH no aplica a ESM; se importa Playwright por ruta.
// node tests/e2e/smoke.mjs [urlBase] [dirCapturas]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');

const base = process.argv[2] ?? 'http://localhost:8080';
const out = process.argv[3] ?? '/tmp';
const problems = [];
const check = (ok, msg) => { console.log(`${ok ? 'OK ' : 'FALLA'}  ${msg}`); if (!ok) problems.push(msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

await page.goto(`${base}/index.html#/tablero`);
await page.waitForSelector('.stat .num');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/01-tablero-claro.png` });
check((await page.locator('.nav a').count()) >= 18, 'navegación con todos los paneles');

// Cédulas
await page.goto(`${base}/index.html#/cedulas/A1-1`);
await page.waitForSelector('table.ledger');
check((await page.locator('.crumbs .cur').textContent()) === 'A1-1', 'breadcrumb muestra A1-1');
check((await page.locator('.crumbs a').allTextContents()).join(',').includes('BG'), 'breadcrumb ofrece subir a BG');

// Expresión en la celda: =1500+250.5 en "Efectivo contado"
const row = page.locator('tr[data-key="efectivo"]');
const input = row.locator('input.cell-in');
await input.click();
await input.fill('=1000+2500+250.5');
await input.press('Enter');
await page.waitForTimeout(300);
check((await page.locator('tr[data-key="efectivo"] input').inputValue()) === 'Q3,750.50', 'la celda calcula =1000+2500+250.5 -> Q3,750.50');
check((await page.locator('tr[data-key="efectivo"] .fx').count()) === 1, 'aparece el indicador ƒ con componentes');
const tot = await page.locator('table.ledger tfoot tr td').nth(1).textContent();
check(tot.includes('6,101.00'), `el total sube (${tot})`);

// Error de expresión no rompe
const inp2 = page.locator('tr[data-key="efectivo"] input.cell-in');
await inp2.click(); await inp2.fill('=alert(1)'); await inp2.press('Enter');
await page.waitForTimeout(200);
check((await inp2.getAttribute('class')).includes('err'), 'expresión maliciosa se rechaza');
await inp2.fill('Q3,750.50'); await inp2.press('Enter');

// Copiar una marca
await page.locator('.mark-item', { hasText: 'Documento verificado' }).locator('button').click();
const clip = await page.evaluate(() => navigator.clipboard.readText());
check(clip === '¥', `copiar marca ¥ (portapapeles: "${clip}")`);

// Copiar tabla
await page.locator('button', { hasText: 'Copiar tabla' }).click();
const tsv = await page.evaluate(() => navigator.clipboard.readText());
check(tsv.split('\n').length >= 5 && tsv.includes('\t'), 'copiar tabla produce texto tabulado');

// Selección de celdas con Ctrl+clic
await page.locator('tr[data-key="efectivo"] td.cell-pick').first().click({ modifiers: ['Control'] });
await page.locator('tr[data-key="cheques"] td.cell-pick').first().click({ modifiers: ['Control'] });
await page.waitForSelector('#statusbar:not([hidden])');
const sb = await page.locator('#statusbar').textContent();
check(sb.includes('Q5,801.00'), `barra de suma: ${sb.replace(/\s+/g, ' ').slice(0, 80)}`);
await page.screenshot({ path: `${out}/02-cedula-claro.png`, fullPage: true });

// Ajuste
await page.goto(`${base}/index.html#/cedulas/A`);
await page.waitForSelector('table.ledger');
await page.selectOption('#adj-debe', 'A1-2|fondo');
await page.selectOption('#adj-haber', 'A1-1|efectivo');
await page.fill('#adj-amt', '=100+50');
await page.fill('#adj-memo', 'Prueba');
await page.locator('button', { hasText: 'Registrar partida' }).click();
await page.waitForTimeout(300);
const adjTxt = await page.locator('.alerts').first().textContent();
check(await page.locator('.alert.ok b', { hasText: 'AJ-2' }).count() > 0, 'se registra la partida AJ-2');

// Oscuro + móvil
await page.goto(`${base}/index.html#/cedulas/BG`);
await page.waitForSelector('table.ledger');
await page.click('#theme-btn');
await page.waitForTimeout(400);
check((await page.getAttribute('html', 'data-theme')) === 'dark', 'modo oscuro activo');
await page.screenshot({ path: `${out}/03-bg-oscuro.png`, fullPage: true });

const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
const mp = await m.newPage();
mp.on('pageerror', (e) => logs.push(`pageerror(m): ${e.message}`));
mp.on('console', (msg) => { if (['error', 'warning'].includes(msg.type())) logs.push(`m ${msg.type()}: ${msg.text()}`); });
await mp.goto(`${base}/index.html#/cedulas/A1`);
await mp.waitForSelector('table.ledger');
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check(overflow <= 1, `móvil sin scroll horizontal de página (desborde ${overflow}px)`);
await mp.screenshot({ path: `${out}/04-cedula-movil.png` });
await mp.click('#menu-btn');
await mp.waitForTimeout(500);
await mp.screenshot({ path: `${out}/05-menu-movil.png` });
await mp.goto(`${base}/index.html#/tablero`);
await mp.waitForTimeout(1200);
await mp.screenshot({ path: `${out}/06-tablero-movil.png`, fullPage: true });

const csp = logs.filter((l) => /Content Security Policy|Refused/i.test(l));
check(csp.length === 0, `sin violaciones de CSP (${csp.length})`);
check(logs.length === 0, `sin errores de consola (${logs.length}) ${logs.slice(0, 3).join(' | ')}`);
await browser.close();
if (problems.length) { console.error(`\n${problems.length} problema(s)`); process.exit(1); }
console.log('\nTodo bien');

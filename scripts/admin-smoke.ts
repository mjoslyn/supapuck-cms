// Sign in to the admin and screenshot the editor for a path, collecting console errors.
//   npx tsx --env-file=.env scripts/admin-smoke.ts /admin/edit/12/ out.png
import { chromium } from 'playwright';

const [target = '/admin/', out = 'reference/admin.png'] = process.argv.slice(2);
const origin = process.env.ASTRO_ORIGIN ?? 'http://localhost:4321';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`${origin}/admin/login/`);
await page.fill('input[name=email]', process.env.LOCAL_ADMIN_EMAIL!);
await page.fill('input[name=password]', process.env.LOCAL_ADMIN_PASSWORD!);
await Promise.all([page.waitForURL(/\/admin\/(?!login)/), page.click('button:has-text("Sign in")')]);
let requests = 0;
page.on('request', () => requests++);
await page.goto(origin + target, { waitUntil: 'load' });
await page.waitForTimeout(10000);
const before = requests;
await page.waitForTimeout(5000);
console.log(`requests in last 5s: ${requests - before}`);
await page.screenshot({ path: out });
console.log(errors.length ? errors.slice(0, 15).join('\n') : 'no console errors');
await browser.close();

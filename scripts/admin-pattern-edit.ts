// Editor check: a heading that comes from a pattern on the homepage can be selected and edited.
//   npx tsx --env-file=.env scripts/admin-pattern-edit.ts
import { chromium } from 'playwright';
const origin = 'http://localhost:4321';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(`${origin}/admin/login/`);
await page.fill('input[name=email]', process.env.LOCAL_ADMIN_EMAIL!);
await page.fill('input[name=password]', process.env.LOCAL_ADMIN_PASSWORD!);
await Promise.all([page.waitForURL(/\/admin\/(?!login)/), page.click('button:has-text("Sign in")')]);
await page.goto(`${origin}/admin/edit/514/`, { waitUntil: 'load' });
await page.waitForTimeout(6000);
const canvas = page.frameLocator('iframe').first();
const h = canvas.locator('h2:has-text("Every Season Tells a Story")').first();
await h.scrollIntoViewIfNeeded();
await h.click();
await page.waitForTimeout(1200);
const editor = page.locator('[contenteditable=true]:visible').first();
console.log('field text:', await editor.innerText());
await editor.fill('Every Season Tells Its Story');
await page.waitForTimeout(1500);
console.log('canvas updated:', await canvas.locator('h2:has-text("Every Season Tells Its Story")').count());
await page.screenshot({ path: 'reference/pattern-edit.png' });
await browser.close();

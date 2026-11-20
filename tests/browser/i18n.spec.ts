import { test, expect } from '@playwright/test';
import { catalogs } from '../../src/i18n';
import { languages } from '../../src/locale';

const uri = 'otpauth://totp/Example:alice%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example';
test('all languages translate UI, errors and dialogs while preserving accounts and input', async ({page}, info) => {
  await page.goto('./'); await expect(page.locator('html')).toHaveAttribute('lang','ru');
  await page.locator('#tab-text').click();
  await page.locator('#uri-input').fill(uri);
  await page.locator('#parse-text').click();
  await expect(page.locator('#count')).toHaveText('1');
  await page.locator('#uri-input').fill('https://example.com');
  await page.locator('#parse-text').click();
  for (const {code} of languages) {
    const c = catalogs[code];
    await page.locator('#language').selectOption(code);
    await expect(page.locator('html')).toHaveAttribute('lang',code);
    await expect(page.locator('html')).toHaveAttribute('dir',code === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('h1')).toHaveText(c.title);
    await expect(page.locator('#choose-files')).toHaveText(c.choose);
    await expect(page.locator('#import-status')).toContainText(c.notOtp);
    if (code === 'ar') { await page.locator('#tab-text').focus(); await page.keyboard.press('ArrowRight'); await expect(page.locator('#tab-camera')).toBeFocused(); await page.locator('#tab-text').click(); await page.locator('#parse-text').click(); }
    await expect(page.locator('#uri-input')).toHaveValue('https://example.com');
    await expect(page.locator('.account-name')).toHaveText('alice@example.com');
    await expect(page.locator('#count')).toHaveText('1');
    await page.locator('[data-action=reveal]').click();
    await expect(page.locator('.secret-value')).toHaveText('JBSWY3DPEHPK3PXP');
    await page.locator('[data-action=reveal]').click();
    await page.locator('[data-action=qr]').click();
    await expect(page.locator('#save-qr')).toHaveText(c.savePng);
    await expect(page.locator('.export-qr')).toHaveAttribute('alt',c.qrAlt);
    await page.locator('#close-dialog').click();
    await page.locator('#help').click();
    await expect(page.locator('#dialog-content h2')).toHaveText(c.how);
    await expect(page.locator('#dialog-content')).toContainText(c.helpPrivacy);
    await page.locator('#close-dialog').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),code).toBe(true);
    if (code === 'ar' || code === 'de') await page.screenshot({path:`test-results/${info.project.name}-${code}.png`,fullPage:true});
  }
  expect(await page.evaluate(()=>({...localStorage}))).toEqual({language:'id'});
});

test('browser language preferences select the default; saved choice and explicit URLs take priority', async ({browser,baseURL}) => {
  const context = await browser.newContext({locale:'en-US', extraHTTPHeaders:{'Accept-Language':'de-DE'}});
  try {
    await context.addInitScript(() => Object.defineProperty(navigator,'languages',{value:['xx-XX','fr-CA','en-US']}));
    const page = await context.newPage(); await page.goto(baseURL!);
    expect(await page.evaluate(()=>navigator.language)).toBe('en-US');
    await expect(page.locator('html')).toHaveAttribute('lang','fr');
    expect(await page.evaluate(()=>({...localStorage}))).toEqual({});
    await page.locator('#language').selectOption('ja');
    await page.goto(baseURL!); await expect(page.locator('html')).toHaveAttribute('lang','ja');
    await expect(page.locator('h1')).toHaveText(catalogs.ja.title);
    await page.goto(new URL('de/',baseURL!).href);
    await expect(page.locator('html')).toHaveAttribute('lang','de');
  } finally { await context.close(); }
});

test('language selection and imports work with all external requests blocked', async ({page,baseURL}) => {
  const external:string[] = [];
  const origin = new URL(baseURL!).origin;
  await page.route('**/*',async route => {
    if (new URL(route.request().url()).origin === origin) await route.continue();
    else { external.push(route.request().url()); await route.abort(); }
  });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang','ru');
  await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  await page.locator('#tab-text').click();
  await page.locator('#uri-input').fill(uri);
  await page.locator('#parse-text').click();
  await expect(page.locator('#count')).toHaveText('1');
  await page.locator('#language').selectOption('de');
  await expect(page.locator('html')).toHaveAttribute('lang','de');
  await expect(page.locator('#count')).toHaveText('1');
  await expect(page.locator('.account-name')).toHaveText('alice@example.com');
  expect(external).toEqual([]);
});

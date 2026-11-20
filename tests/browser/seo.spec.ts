import { test,expect } from '@playwright/test';
import { catalogs } from '../../src/i18n';
import { seoTitles } from '../../src/seo';

test('localized pages contain complete SEO and actual application markup before JavaScript', async ({request,baseURL}) => {
  for (const code of ['en','ru','ar'] as const) {
    const response=await request.get(new URL(`${code}/`,baseURL!).href);
    expect(response.status()).toBe(200);
    const html=await response.text();
    expect(html).toContain(`<html lang="${code}"`);
    expect(html).toContain(catalogs[code].title);
    expect(html).toContain('id="file-input"');
    expect(html).toContain('name="robots" content="index,follow');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('hreflang="x-default"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
    expect(data).toMatchObject({'@type':'WebApplication',name:'2FA Key Extractor',inLanguage:code});
    expect(data).not.toHaveProperty('aggregateRating');
  }
  for (const resource of ['robots.txt','sitemap.xml','social-card.png']) expect((await request.get(new URL(resource,baseURL!).href)).status()).toBe(200);
});
test('explicit language URLs override browser preference and switching keeps the active import', async ({page,baseURL}) => {
  const violations:string[]=[];
  await page.addInitScript(() => { (window as any).violations=[]; addEventListener('securitypolicyviolation',e=>(window as any).violations.push(e.violatedDirective)); });
  await page.goto(new URL('en/',baseURL!).href);
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page).toHaveTitle(`2FA Key Extractor — ${seoTitles.en}`);
  await page.locator('#tab-text').click();
  await page.locator('#uri-input').fill('otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP');
  await page.locator('#parse-text').click();
  await expect(page.locator('#count')).toHaveText('1');
  await page.locator('#language').selectOption('ru');
  await expect(page).toHaveURL(/\/ru\/$/);
  await expect(page.locator('#count')).toHaveText('1');
  await expect(page).toHaveTitle(`2FA Key Extractor — ${seoTitles.ru}`);
  expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(new URL('ru/',baseURL!.startsWith('http://127.0.0.1') ? 'https://totp.frolkin.top/' : baseURL!).href);
  expect(await page.evaluate(() => (window as any).violations)).toEqual([]);
  expect(await page.title()).not.toContain('alice');
});

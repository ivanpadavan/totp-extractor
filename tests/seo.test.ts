import test from 'node:test';
import assert from 'node:assert/strict';
import { pageMetadata,alternates,seoTitles } from '../src/seo.ts';
import { localeFromPath } from '../src/i18n.ts';
import { languages } from '../src/locale.ts';
import { renderShell } from '../src/shell.ts';

test('universal naming and localized metadata describe only supported features', () => {
  for (const {code} of languages) {
    const m = pageMetadata(code,'https://example.com/tool/');
    assert.ok(m.title.startsWith('2FA Key Extractor — '));
    assert.ok(seoTitles[code].includes('TOTP'));
    assert.ok(m.description.includes('TOTP'));
    assert.equal(m.canonical,`https://example.com/tool/${code}/`);
    assert.equal(m.image,'https://example.com/tool/social-card.png');
    assert.ok(renderShell(code,'/tool/').includes('href="/tool/"'));
  }
  assert.equal(alternates('https://example.com/tool/').length,17);
});
test('localized paths work under a GitHub project subpath', () => {
  assert.equal(localeFromPath('/totp-extractor/ru/','/totp-extractor/'),'ru');
  assert.equal(localeFromPath('/totp-extractor/ar/','/totp-extractor/'),'ar');
  assert.equal(localeFromPath('/totp-extractor/','/totp-extractor/'),undefined);
  assert.equal(localeFromPath('/other/ru/','/totp-extractor/'),undefined);
});

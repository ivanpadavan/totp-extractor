import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogs, setLocale, t, type MessageKey } from '../src/i18n.ts';
import { negotiateLocale, languages } from '../src/locale.ts';
import { parseOtp } from '../src/otp.ts';
import { LocalizedError } from '../src/errors.ts';

test('all 16 catalogs have the same keys and interpolation parameters', () => {
  const keys = Object.keys(catalogs.en) as MessageKey[];
  const placeholders = (s: string) => [...s.matchAll(/\{\w+\}/g)].map(m => m[0]).sort();
  assert.equal(languages.length,16);
  for (const {code} of languages) {
    assert.deepEqual(Object.keys(catalogs[code]).sort(), [...keys].sort(),code);
    for (const key of keys) {
      assert.ok(catalogs[code][key].trim(),`${code}.${key}`);
      assert.deepEqual(placeholders(catalogs[code][key]),placeholders(catalogs.en[key]),`${code}.${key}`);
    }
  }
});
test('Accept-Language uses weights, region fallback and unsupported language fallback', () => {
  for (const [header,expected] of [
    ['ru-RU,ru;q=0.9,en;q=0.8','ru'], ['en-US,en;q=0.9','en'],
    ['pt-BR,pt;q=0.9','pt'], ['zh-Hant-TW,zh;q=0.8','zh'],
    ['en;q=0.4,fr-CA;q=0.9,de;q=0.8','fr'], ['xx,ja-JP;q=0.7','ja'],
    ['ar;q=0,en;q=0.9','en'], ['de;q=0,*;q=0.5,en;q=0.8','en'],
    ['ru;q=broken,uk;q=0.7','uk'], ['xx-XX','en'], ['','en'],
    ['ko;q=0.8,ja;q=0.8','ko'], ['*','ru'],
  ]) assert.equal(negotiateLocale(header),expected,header);
});
test('error codes and account data do not depend on interface language', () => {
  const uri = 'otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP&issuer=Example';
  const original = parseOtp(uri);
  for (const {code} of languages) {
    setLocale(code);
    assert.deepEqual(parseOtp(uri),original);
    assert.throws(() => parseOtp('https://example.com'), (e: unknown) => e instanceof LocalizedError && e.key === 'notOtp');
    assert.ok(!t('recognized',{count:2,added:3}).includes('{'));
  }
});

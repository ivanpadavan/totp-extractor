import test from 'node:test';
import assert from 'node:assert/strict';
import { migration } from './fixtures.ts';
import { base32, parseOtp, otpUri, accountId, toCsv } from '../src/otp.ts';

const uri = 'otpauth://totp/Example:alice%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example';
test('RFC 4648 base32 vectors', () => {
  for (const [input, expected] of [['f','MY'],['fo','MZXQ'],['foo','MZXW6'],['foob','MZXW6YQ'],['fooba','MZXW6YTB'],['foobar','MZXW6YTBOI']]) assert.equal(base32(new TextEncoder().encode(input)), expected);
});
test('standard TOTP preserves defaults, label and issuer', () => {
  const a = parseOtp(uri).accounts[0];
  assert.deepEqual(a, { name:'alice@example.com', issuer:'Example', secret:'JBSWY3DPEHPK3PXP', type:'totp', algorithm:'SHA1', digits:6, period:30, counter:'0' });
});
test('URI roundtrip preserves SHA512, 8 digits and custom period', () => {
  const a = parseOtp(uri + '&algorithm=SHA512&digits=8&period=60').accounts[0];
  assert.deepEqual(parseOtp(otpUri(a)).accounts[0], a);
});
test('HOTP preserves uint64 counter without number precision loss', () => {
  const a = parseOtp(uri.replace('/totp/','/hotp/') + '&counter=18446744073709551615').accounts[0];
  assert.equal(a.counter, '18446744073709551615');
  assert.deepEqual(parseOtp(otpUri(a)).accounts[0], a);
});
test('migration reads multiple accounts and multipart metadata', () => {
  const p = parseOtp(migration(1, 3));
  assert.equal(p.accounts.length, 2);
  assert.equal(p.accounts[0].secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.deepEqual(p.batch, { id:42, size:3, index:1 });
});
test('migration respects SHA256/SHA512, HOTP and eight digits', () => {
  for (const [algo, expected] of [[2,'SHA256'],[3,'SHA512']] as const) {
    const a = parseOtp(migration(0,1,{algorithm:algo,digits:2,type:1,counter:'9007199254740993'})).accounts[0];
    assert.equal(a.algorithm, expected); assert.equal(a.digits,8); assert.equal(a.type,'hotp'); assert.equal(a.counter,'9007199254740993');
  }
});
test('rejects invalid standard OTP parameters', () => {
  for (const invalid of ['https://example.com','not a url',uri+'&algorithm=MD5',uri+'&digits=7',uri+'&period=0',uri+'&secret=AAA',uri.replace('JBSWY3DPEHPK3PXP','AB'),uri.replace('JBSWY3DPEHPK3PXP','A'),uri.replace('/totp/','/hotp/'),uri.replace('/totp/','/hotp/')+'&counter=-1',uri.replace('/totp/','/hotp/')+'&counter=18446744073709551616']) assert.throws(() => parseOtp(invalid));
});
test('rejects broken protobuf and invalid migration parameters', () => {
  for (const invalid of ['otpauth-migration://offline?data=!!!','otpauth-migration://offline?data=Cv8=',migration(2,2),migration(0,1,{algorithm:4}),migration(0,1,{digits:0}),migration(0,1,{type:0})]) assert.throws(() => parseOtp(invalid));
});
test('deduplication distinguishes identity and OTP parameters', () => {
  const a = parseOtp(uri).accounts[0];
  assert.equal(accountId(a), accountId({...a}));
  assert.notEqual(accountId(a), accountId({...a,period:60}));
  assert.notEqual(accountId(a), accountId({...a,name:'other'}));
});
test('CSV quotes newlines and neutralizes spreadsheet formulas', () => {
  const a = parseOtp(uri).accounts[0]; a.name = '=HYPERLINK("bad")'; a.issuer = 'one,\ntwo';
  const csv = toCsv([a]);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"')); assert.ok(csv.includes('"one,\ntwo"'));
});

// Single-account Google exports need not carry multipart metadata.
test('single-account migration accepts absent and zero batch size', () => {
  for (const url of [migration(0, 0, {single:true}), migration(0, 1, {single:true,omitGroup:true})]) {
    const parsed = parseOtp(url);
    assert.equal(parsed.accounts.length, 1);
    assert.equal(parsed.accounts[0].name, 'alice@example.com');
    assert.equal(parsed.batch, undefined);
  }
});
test('single-account migration accepts absent version and version 2', () => {
  for (const version of [null, 0, 2]) {
    const parsed = parseOtp(migration(0, 1, {single:true,version}));
    assert.equal(parsed.accounts.length, 1);
    assert.equal(parsed.accounts[0].secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  }
});
test('invalid migration metadata has a specific error and is not mistaken for a missing QR', () => {
  assert.throws(() => parseOtp(migration(0, 1, {version:-1})), /версия экспорта/);
  for (const size of [-1, 1001]) assert.throws(() => parseOtp(migration(0, size)), /количество частей/);
  for (const [index, size] of [[-1, 1], [1, 0], [2, 2]]) assert.throws(() => parseOtp(migration(index, size)), /номер части/);
});
test('multi-account exports preserve accounts and multipart tracking with version 2', () => {
  const singleQr = parseOtp(migration(0, 0, {version:2}));
  assert.deepEqual(singleQr.accounts.map(a => a.name), ['alice@example.com', 'bob@example.com']);
  assert.equal(singleQr.batch, undefined);
  const multipart = parseOtp(migration(1, 3, {version:2}));
  assert.equal(multipart.accounts.length, 2);
  assert.deepEqual(multipart.batch, {id:42,size:3,index:1});
});

import { LocalizedError } from './errors';
import { Reader } from 'protobufjs/minimal';

export interface Account {
  name: string;
  issuer: string;
  secret: string;
  type: 'totp' | 'hotp';
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
  counter: string;
}
export interface Parsed {
  accounts: Account[];
  batch?: { id: number; size: number; index: number };
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes: Uint8Array): string {
  let bits = 0, value = 0, output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += alphabet[(value >>> (bits -= 5)) & 31]; }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
function secret(value: string): string {
  const normalized = value.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z2-7]+={0,6}$/.test(normalized)) throw new LocalizedError('invalidSecret');
  const unpadded = normalized.replace(/=+$/, '');
  if (![0, 2, 4, 5, 7].includes(unpadded.length % 8)) throw new LocalizedError('invalidSecret');
  const remainder = (unpadded.length * 5) % 8;
  if (remainder && (alphabet.indexOf(unpadded.at(-1)!) & ((1 << remainder) - 1))) throw new LocalizedError('invalidSecret');
  return unpadded;
}
function integer(value: string | null, fallback: number, max: number): number {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new LocalizedError('invalidOtp');
  return Number(value);
}
function parseAccount(reader: Reader, end: number): Account {
  let raw = new Uint8Array(), name = '', issuer = '', algorithm = 0, digits = 0, type = 0, counter = '0';
  while (reader.pos < end) {
    const tag = reader.uint32();
    switch (tag >>> 3) {
      case 1: raw = Uint8Array.from(reader.bytes()); break;
      case 2: name = reader.string(); break;
      case 3: issuer = reader.string(); break;
      case 4: algorithm = reader.int32(); break;
      case 5: digits = reader.int32(); break;
      case 6: type = reader.int32(); break;
      case 7: counter = reader.uint64().toString(); break;
      default: reader.skipType(tag & 7);
    }
  }
  if (reader.pos !== end || !raw.length) throw new LocalizedError('missingSecret');
  if (![1, 2, 3].includes(algorithm) || ![1, 2].includes(digits) || ![1, 2].includes(type)) throw new LocalizedError('unsupportedGoogle');
  if (BigInt(counter) > 9223372036854775807n) throw new LocalizedError('invalidCounter');
  return { name: name || issuer, issuer, secret: base32(raw), algorithm: (['SHA1', 'SHA256', 'SHA512'] as const)[algorithm - 1], digits: digits === 1 ? 6 : 8, type: type === 1 ? 'hotp' : 'totp', period: 30, counter };
}
export function parseOtp(input: string): Parsed {
  if (input.length > 100000) throw new LocalizedError('qrTooLarge');
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new LocalizedError('invalidUri'); }
  if (url.protocol === 'otpauth:') {
    if (!['totp', 'hotp'].includes(url.hostname)) throw new LocalizedError('unsupportedType');
    const p = url.searchParams;
    for (const key of ['secret', 'issuer', 'algorithm', 'digits', 'period', 'counter']) if (p.getAll(key).length > 1) throw new LocalizedError('duplicateParams');
    const key = secret(p.get('secret') || '');
    let label: string;
    try { label = decodeURIComponent(url.pathname.slice(1)); } catch { throw new LocalizedError('invalidName'); }
    const divider = label.indexOf(':');
    const issuer = p.get('issuer') || (divider >= 0 ? label.slice(0, divider) : '');
    const algorithm = (p.get('algorithm') || 'SHA1').toUpperCase();
    if (!['SHA1', 'SHA256', 'SHA512'].includes(algorithm)) throw new LocalizedError('unsupportedAlgorithm');
    const digits = integer(p.get('digits'), 6, 8);
    if (![6, 8].includes(digits)) throw new LocalizedError('unsupportedDigits');
    const counter = p.get('counter') || '0';
    if (!/^\d{1,20}$/.test(counter) || BigInt(counter) > 18446744073709551615n || (url.hostname === 'hotp' && !p.has('counter'))) throw new LocalizedError('invalidCounter');
    return { accounts: [{ name: (divider >= 0 ? label.slice(divider + 1).trim() : label) || '', issuer, secret: key, type: url.hostname as Account['type'], algorithm: algorithm as Account['algorithm'], digits, period: integer(p.get('period'), 30, 86400), counter: BigInt(counter).toString() }] };
  }
  if (url.protocol !== 'otpauth-migration:' || url.hostname !== 'offline') throw new LocalizedError('notOtp');
  try {
    if (url.searchParams.getAll('data').length !== 1) throw new LocalizedError('invalidGoogle');
    const encoded = (url.searchParams.get('data') || '').replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    const reader = Reader.create(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)));
    const accounts: Account[] = [];
    let version = 0, size = 0, index = 0, id = 0;
    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: { const length = reader.uint32(); const end = reader.pos + length; if (end > reader.len) throw new LocalizedError('corruptExport'); accounts.push(parseAccount(reader, end)); break; }
        case 2: version = reader.int32(); break;
        case 3: size = reader.int32(); break;
        case 4: index = reader.int32(); break;
        case 5: id = reader.int32(); break;
        default: reader.skipType(tag & 7);
      }
    }
    if (!accounts.length) throw new LocalizedError('emptyExport');
    // Envelope metadata is not required to decode the account fields. Some
    // exporters omit the version/batch fields or write a zero batch size for
    // a single QR. Validate account parameters above, independently of the
    // envelope version, as compatible Google migration importers do.
    if (version < 0) throw new LocalizedError('invalidVersion');
    if (size < 0 || size > 1000) throw new LocalizedError('invalidBatchSize');
    if (index < 0 || (size === 0 ? index !== 0 : index >= size)) throw new LocalizedError('invalidBatchIndex');
    return size > 1 ? { accounts, batch: { id, size, index } } : { accounts };
  } catch (error) {
    if (error instanceof LocalizedError) throw error;
    throw new LocalizedError('googleDecodeFailed');
  }
}
export function accountId(a: Account): string {
  return JSON.stringify([a.secret, a.name, a.issuer, a.type, a.algorithm, a.digits, a.period, a.counter]);
}
export function otpUri(a: Account): string {
  const label = a.issuer && !a.name.startsWith(`${a.issuer}:`) ? `${a.issuer}:${a.name}` : a.name;
  const p = new URLSearchParams({ secret: a.secret, issuer: a.issuer, algorithm: a.algorithm, digits: String(a.digits) });
  p.set(a.type === 'hotp' ? 'counter' : 'period', a.type === 'hotp' ? a.counter : String(a.period));
  return `otpauth://${a.type}/${encodeURIComponent(label)}?${p}`;
}
export function toCsv(accounts: Account[]): string {
  const fields: (keyof Account)[] = ['name', 'issuer', 'secret', 'type', 'algorithm', 'digits', 'period', 'counter'];
  const cell = (value: unknown) => { let s = String(value); if (/^[\s]*[=+@-]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  return '\uFEFF' + [fields.join(','), ...accounts.map(a => fields.map(f => cell(a[f])).join(','))].join('\r\n');
}

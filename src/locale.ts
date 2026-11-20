export const languages = [
  { code: 'ru', name: 'Русский' }, { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' }, { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' }, { code: 'tr', name: 'Türkçe' },
  { code: 'uk', name: 'Українська' }, { code: 'pl', name: 'Polski' },
  { code: 'zh', name: '中文' }, { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' }, { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' }, { code: 'id', name: 'Bahasa Indonesia' },
] as const;
export type Locale = typeof languages[number]['code'];
export function isLocale(value: unknown): value is Locale {
  return languages.some(language => language.code === value);
}
/** Resolve the HTTP preference list, including region tags, q weights and q=0. */
export function negotiateLocale(header = ''): Locale {
  const ranges = header.slice(0, 8192).split(',').map((item, order) => {
    const [range, ...params] = item.trim().toLowerCase().split(';');
    const quality = params.find(p => p.trim().startsWith('q='));
    const raw = quality?.trim().slice(2);
    const q = raw === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(raw) ? Number(raw) : 0;
    return { range, base: range.split('-')[0], q, order };
  });
  const ranked = languages.map(({ code }, order) => {
    const exact = ranges.filter(r => r.range === code || r.base === code);
    const matches = exact.length ? exact : ranges.filter(r => r.range === '*');
    const match = matches.sort((a, b) => b.q - a.q || a.order - b.order)[0];
    return { code, q: match?.q ?? 0, order: match?.order ?? order };
  }).filter(r => r.q > 0).sort((a, b) => b.q - a.q || a.order - b.order);
  // English is the fallback when no supported language is acceptable.
  return ranked[0]?.code ?? 'en';
}

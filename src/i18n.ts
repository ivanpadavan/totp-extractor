import en from './locales/en';
import ru from './locales/ru';
import es from './locales/es';
import pt from './locales/pt';
import fr from './locales/fr';
import de from './locales/de';
import it from './locales/it';
import tr from './locales/tr';
import uk from './locales/uk';
import pl from './locales/pl';
import zh from './locales/zh';
import ja from './locales/ja';
import ko from './locales/ko';
import ar from './locales/ar';
import hi from './locales/hi';
import id from './locales/id';
import { isLocale, type Locale } from './locale';

export type MessageKey = keyof typeof en;
export type Values = Record<string, string | number>;
export const catalogs: Record<Locale, Record<MessageKey, string>> = { en, ru, es, pt, fr, de, it, tr, uk, pl, zh, ja, ko, ar, hi, id };
let locale: Locale = 'en';
export function getLocale() { return locale; }
export function setLocale(next: Locale) { locale = next; }
export function t(key: MessageKey, values: Values = {}): string {
  return catalogs[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
export async function initialLocale(): Promise<Locale> {
  try { const saved = localStorage.getItem('language'); if (isLocale(saved)) return saved; } catch { /* Storage may be disabled. */ }
  // The endpoint negotiates the actual HTTP Accept-Language header. It does
  // not use navigator.language, which can differ from request preferences.
  try {
    const response = await fetch('/api/locale', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (response.ok) { const data = await response.json(); if (isLocale(data.locale)) return data.locale; }
  } catch { /* Keep the app usable if locale negotiation is unavailable. */ }
  return 'en';
}

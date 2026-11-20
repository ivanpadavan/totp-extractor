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
import { isLocale, negotiateLocale, type Locale } from './locale';

export function localeFromPath(path: string, base: string): Locale | undefined {
  if (!path.startsWith(base)) return;
  const segment = path.slice(base.length).split('/')[0];
  return isLocale(segment) ? segment : undefined;
}

export type MessageKey = keyof typeof en;
export type Values = Record<string, string | number>;
export const catalogs: Record<Locale, Record<MessageKey, string>> = { en, ru, es, pt, fr, de, it, tr, uk, pl, zh, ja, ko, ar, hi, id };
let locale: Locale = 'en';
export function getLocale() { return locale; }
export function setLocale(next: Locale) { locale = next; }
export function t(key: MessageKey, values: Values = {}): string {
  return catalogs[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
export function initialLocale(): Locale {
  const explicit = localeFromPath(location.pathname, import.meta.env.BASE_URL);
  if (explicit) return explicit;
  try { const saved = localStorage.getItem('language'); if (isLocale(saved)) return saved; } catch { /* Storage may be disabled. */ }
  return negotiateLocale((navigator.languages?.length ? navigator.languages : [navigator.language]).join(','));
}

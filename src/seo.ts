import { catalogs } from './i18n';
import { languages, type Locale } from './locale';
import { siteName, defaultSiteUrl } from './site';

export const seoTitles: Record<Locale, string> = {
  en:'TOTP & HOTP QR Decoder', ru:'Ключи TOTP/HOTP из QR-кодов',
  es:'Claves TOTP y HOTP desde QR', pt:'Chaves TOTP e HOTP de QR',
  fr:'Clés TOTP et HOTP depuis un QR', de:'TOTP- und HOTP-Schlüssel aus QR-Codes',
  it:'Chiavi TOTP e HOTP da QR', tr:'QR kodlarından TOTP ve HOTP anahtarları',
  uk:'Ключі TOTP/HOTP із QR-кодів', pl:'Klucze TOTP i HOTP z kodów QR',
  zh:'从二维码提取 TOTP 和 HOTP 密钥', ja:'QR から TOTP・HOTP キーを抽出',
  ko:'QR에서 TOTP·HOTP 키 추출', ar:'مفاتيح TOTP وHOTP من QR',
  hi:'QR से TOTP और HOTP कुंजियाँ', id:'Kunci TOTP dan HOTP dari QR',
};
export const ogLocales: Record<Locale,string> = {en:'en_US',ru:'ru_RU',es:'es_ES',pt:'pt_BR',fr:'fr_FR',de:'de_DE',it:'it_IT',tr:'tr_TR',uk:'uk_UA',pl:'pl_PL',zh:'zh_CN',ja:'ja_JP',ko:'ko_KR',ar:'ar_SA',hi:'hi_IN',id:'id_ID'};
export function pageMetadata(locale: Locale, siteUrl = defaultSiteUrl, root = false) {
  const base = new URL(siteUrl.endsWith('/') ? siteUrl : siteUrl + '/');
  const canonical = new URL(root ? '' : `${locale}/`,base).href;
  return { title:`${siteName} — ${seoTitles[locale]}`, description:catalogs[locale].description, canonical, image:new URL('social-card.png',base).href, base:base.href };
}
/** User-entered data never enters titles, URLs, metadata or structured data. */
export function updateSeo(locale: Locale) {
  const base = import.meta.env.VITE_SITE_URL || defaultSiteUrl;
  const root = location.pathname === new URL(base).pathname;
  const meta = pageMetadata(locale,base,root);
  document.title = meta.title;
  for (const [selector,content] of [
    ['meta[name="description"]',meta.description], ['meta[property="og:title"]',meta.title],
    ['meta[property="og:description"]',meta.description], ['meta[property="og:url"]',meta.canonical],
    ['meta[name="twitter:title"]',meta.title], ['meta[name="twitter:description"]',meta.description],
  ]) document.querySelector(selector)?.setAttribute('content',content);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href',meta.canonical);
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content',ogLocales[locale]);
  const script = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
  if (script) {
    const data = JSON.parse(script.textContent || '{}');
    script.textContent = JSON.stringify({...data,url:meta.canonical,description:meta.description,inLanguage:locale});
  }
}
export function alternates(siteUrl: string) {
  return [...languages.map(l => ({ lang:l.code,href:new URL(`${l.code}/`,siteUrl).href })), {lang:'x-default',href:siteUrl}];
}

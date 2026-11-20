import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { renderShell } from '../src/shell.ts';
import { languages, type Locale } from '../src/locale.ts';
import { pageMetadata, alternates, ogLocales } from '../src/seo.ts';
import { siteName, defaultSiteUrl } from '../src/site.ts';

const siteUrl = new URL(process.env.VITE_SITE_URL || defaultSiteUrl).href;
const base = new URL(siteUrl).pathname;
const source = await readFile('dist/index.html','utf8');
const escape = (s: string) => s.replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const hashes = new Set<string>();
function page(locale: Locale, root = false) {
  const meta = pageMetadata(locale,siteUrl,root);
  const data = JSON.stringify({
    '@context':'https://schema.org','@type':'WebApplication',name:siteName,
    url:meta.canonical,description:meta.description,inLanguage:locale,
    applicationCategory:'UtilitiesApplication',operatingSystem:'Any',
    browserRequirements:'Requires JavaScript and WebAssembly',isAccessibleForFree:true,
    featureList:['TOTP and HOTP QR decoding','Camera and image import','Google Authenticator export decoding','JSON and CSV export','Local browser processing'],
  }).replace(/</g,'\\u003c');
  const hash = `'sha256-${createHash('sha256').update(data).digest('base64')}'`;
  hashes.add(hash);
  const csp = `default-src 'none'; script-src 'self' 'wasm-unsafe-eval' ${hash}; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'none'`;
  const extra = `
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta name="referrer" content="no-referrer">
    <meta http-equiv="Content-Security-Policy" content="${escape(csp)}">
    <link rel="canonical" href="${meta.canonical}">
    ${alternates(siteUrl).map(l => `<link rel="alternate" hreflang="${l.lang}" href="${l.href}">`).join('\n    ')}
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${siteName}">
    <meta property="og:title" content="${escape(meta.title)}">
    <meta property="og:description" content="${escape(meta.description)}">
    <meta property="og:url" content="${meta.canonical}">
    <meta property="og:locale" content="${ogLocales[locale]}">
    <meta property="og:image" content="${meta.image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${siteName} — TOTP and HOTP keys from QR codes">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escape(meta.title)}">
    <meta name="twitter:description" content="${escape(meta.description)}">
    <meta name="twitter:image" content="${meta.image}">
    <script type="application/ld+json">${data}</script>`;
  return source.replace(/<html[^>]*>/,`<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">`)
    .replace(/<title>.*?<\/title>/s,`<title>${escape(meta.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(meta.description)}">`)
    .replace('</head>',extra+'\n  </head>')
    .replace('<div id="app"></div>',`<div id="app">${renderShell(locale,base)}</div>`);
}
await writeFile('dist/index.html',page('en',true));
for (const {code} of languages) {
  await mkdir(`dist/${code}`,{recursive:true});
  await writeFile(`dist/${code}/index.html`,page(code));
}
await writeFile('dist/.nojekyll','');
await writeFile('dist/robots.txt',`User-agent: *\nAllow: ${base}\nDisallow: ${base}api/\nSitemap: ${new URL('sitemap.xml',siteUrl).href}\n`);
const urls = [siteUrl,...languages.map(l => new URL(`${l.code}/`,siteUrl).href)];
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>\n`);
await writeFile('dist/seo-security.json',JSON.stringify({hashes:[...hashes]}));
console.log(`Prerendered ${languages.length + 1} application pages for ${siteUrl}`);

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { negotiateLocale } from './src/locale.ts';

const headers = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
};
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ttf':'font/ttf', '.wasm':'application/wasm', '.txt':'text/plain; charset=utf-8' };

export function createApp(root = resolve('dist')) {
  return createServer(async (req, res) => {
    for (const [name,value] of Object.entries(headers)) res.setHeader(name,value);
    const send = (code, type, text) => { res.writeHead(code, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : text); };
    if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); send(405,'text/plain','Method not allowed'); return; }
    // No body parsing, uploads, analytics or access logging.
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
    catch { send(400,'text/plain','Bad request'); return; }
    if (pathname === '/health') { send(200,'text/plain','ok'); return; }
    if (pathname === '/api/locale') {
      const locale = negotiateLocale(req.headers['accept-language']);
      res.setHeader('Vary','Accept-Language');
      res.setHeader('Content-Language',locale);
      send(200,'application/json; charset=utf-8',JSON.stringify({locale}));
      return;
    }
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep) || pathname.includes('\0') || pathname.split('/').some(p => p.startsWith('.'))) { send(404,'text/plain','Not found'); return; }
    try {
      const info = await stat(path);
      if (!info.isFile()) { send(404,'text/plain','Not found'); return; }
      res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Content-Length':info.size });
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(path).on('error', () => res.destroy()).pipe(res);
    } catch { send(404,'text/plain','Not found'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp();
  app.listen(Number(process.env.PORT || 8080), '0.0.0.0');
}

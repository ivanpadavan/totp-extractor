import { createServer } from 'node:http';
import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const headers = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
};
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ttf':'font/ttf', '.wasm':'application/wasm', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.json':'application/json; charset=utf-8' };

export function createApp(root = resolve('dist'), basePath = '/') {
  let policy = headers['Content-Security-Policy'];
  try {
    const security = JSON.parse(readFileSync(resolve(root,'seo-security.json'),'utf8'));
    const hashes = security.hashes.filter(value => /^'sha256-[A-Za-z0-9+/=]+'$/.test(value));
    policy = policy.replace("'wasm-unsafe-eval'",`'wasm-unsafe-eval' ${hashes.join(' ')}`);
  } catch { /* Development and tests may start before the static build. */ }
  return createServer(async (req, res) => {
    for (const [name,value] of Object.entries(headers)) res.setHeader(name,value);
    res.setHeader('Content-Security-Policy',policy);
    const send = (code, type, text) => { res.writeHead(code, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : text); };
    if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); send(405,'text/plain','Method not allowed'); return; }
    // No body parsing, uploads, analytics or access logging.
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
    catch { send(400,'text/plain','Bad request'); return; }
    if (basePath !== '/') {
      if (pathname === basePath.slice(0,-1)) { res.writeHead(308,{Location:basePath}); res.end(); return; }
      if (!pathname.startsWith(basePath)) { send(404,'text/plain','Not found'); return; }
      pathname = '/' + pathname.slice(basePath.length);
    }
    if (pathname === '/health') { send(200,'text/plain','ok'); return; }
    let path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep) || pathname.includes('\0') || pathname.split('/').some(p => p.startsWith('.'))) { send(404,'text/plain','Not found'); return; }
    try {
      let info = await stat(path);
      if (info.isDirectory()) {
        if (!pathname.endsWith('/')) { res.writeHead(308,{Location:pathname+'/'}); res.end(); return; }
        path = resolve(path,'index.html'); info = await stat(path);
      }
      if (!info.isFile()) { send(404,'text/plain','Not found'); return; }
      res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Content-Length':info.size });
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(path).on('error', () => res.destroy()).pipe(res);
    } catch { send(404,'text/plain','Not found'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp(resolve('dist'),process.env.BASE_PATH || '/');
  app.listen(Number(process.env.PORT || 8080), '0.0.0.0');
}

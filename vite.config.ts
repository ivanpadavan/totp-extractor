import { defineConfig } from 'vite';
import { negotiateLocale } from './src/locale.ts';

export default defineConfig({
  plugins: [{ name:'locale-endpoint', configureServer(server) {
    server.middlewares.use('/api/locale',(req,res) => {
      res.setHeader('Content-Type','application/json');
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Vary','Accept-Language');
      res.end(JSON.stringify({locale:negotiateLocale(req.headers['accept-language'])}));
    });
  } }],
});

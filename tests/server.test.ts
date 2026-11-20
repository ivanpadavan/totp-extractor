import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

test('locale endpoint negotiates actual headers without caching or accepting uploads', async () => {
  const server = createApp();
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const address = server.address() as {port:number};
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const [header,expected] of [['de-DE,de;q=0.9','de'],['en;q=0.2,ar;q=1','ar'],['pt-BR','pt']]) {
      const r = await fetch(base+'/api/locale',{headers:{'Accept-Language':header}});
      assert.equal(r.status,200); assert.deepEqual(await r.json(),{locale:expected});
      assert.equal(r.headers.get('Content-Language'),expected);
      assert.equal(r.headers.get('Cache-Control'),'no-store');
      assert.equal(r.headers.get('Vary'),'Accept-Language');
    }
    for (const origin of ['https://totp-extractor.github.io','https://ivanpadavan.github.io','https://example.com']) {
      const response = await fetch(base+'/api/locale',{headers:{Origin:origin,'Accept-Language':'ru'}});
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin === 'https://example.com' ? null : origin);
    }
    assert.equal((await fetch(base+'/health')).status,200);
    assert.equal((await fetch(base+'/api/locale',{method:'POST',body:'test'})).status,405);
    assert.equal((await fetch(base+'/%2e%2e/server.mjs')).status,404);
    const head = await fetch(base+'/api/locale',{method:'HEAD'});
    assert.equal(head.status,200); assert.equal(await head.text(),'');
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

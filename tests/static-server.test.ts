import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.mjs';

test('optional static server serves files and rejects uploads and private paths', async () => {
  const root = await mkdtemp(join(tmpdir(),'totp-static-'));
  await writeFile(join(root,'index.html'),'<h1>TOTP Extractor</h1>');
  const server = createApp(root);
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  try {
    const response = await fetch(base+'/');
    assert.equal(response.status,200);
    assert.equal(await response.text(),'<h1>TOTP Extractor</h1>');
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.equal((await fetch(base+'/health')).status,200);
    assert.equal((await fetch(base+'/',{method:'POST',body:'test'})).status,405);
    for (const path of ['/api/locale','/%2e%2e/server.mjs','/.git/config','/missing']) {
      assert.equal((await fetch(base+path)).status,404,path);
    }
    const head = await fetch(base+'/',{method:'HEAD'});
    assert.equal(head.status,200); assert.equal(await head.text(),'');
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root,{recursive:true,force:true});
  }
});

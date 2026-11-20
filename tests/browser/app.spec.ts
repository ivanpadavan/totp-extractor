import { test, expect } from '@playwright/test';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { migration } from '../fixtures';
const uri = 'otpauth://totp/Example:alice%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example';
const secret = 'JBSWY3DPEHPK3PXP';
const png = (data: string) => QRCode.toBuffer(data, { width: 600, margin: 4, errorCorrectionLevel: 'M' });

test('image extraction, reveal, copy, QR roundtrip, export and clear', async ({ page, context }) => {
  const requests: { url: string; method: string }[] = [];
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', req => requests.push({url:req.url(),method:req.method()}));
  await page.goto('/');
  await page.locator('#file-input').setInputFiles({name:'account.png',mimeType:'image/png',buffer:await png(uri)});
  await expect(page.locator('#count')).toHaveText('1');
  await expect(page.locator('.secret-value')).not.toContainText(secret);
  await page.getByRole('button', {name:'Показать ключ',exact:true}).click();
  await expect(page.locator('.secret-value')).toHaveText(secret);
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', {value:{writeText:async (text:string) => { (window as any).copied=text; }},configurable:true}); });
  await page.getByRole('button',{name:'Скопировать ключ'}).click();
  await expect.poll(() => page.evaluate(() => (window as any).copied)).toBe(secret);
  const jsonDownload = page.waitForEvent('download');
  await page.locator('#export-json').click();
  const jsonFile = await jsonDownload;
  const jsonStream = await jsonFile.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of jsonStream!) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString())[0]).toMatchObject({name:'alice@example.com',secret});
  const csvDownload = page.waitForEvent('download'); await page.locator('#export-csv').click();
  expect((await csvDownload).suggestedFilename()).toBe('otp-export.csv');
  await page.getByRole('button',{name:'QR-код',exact:true}).click();
  await expect(page.locator('dialog')).toBeVisible();
  const qr = await page.locator('.export-qr').getAttribute('src');
  await page.getByRole('button',{name:'Закрыть',exact:true}).click();
  await page.getByRole('button',{name:'Очистить все данные'}).click();
  await expect(page.locator('#count')).toHaveText('0');
  await page.locator('#file-input').setInputFiles({name:'roundtrip.png',mimeType:'image/png',buffer:Buffer.from(qr!.split(',')[1],'base64')});
  await expect(page.locator('#count')).toHaveText('1');
  expect(await page.evaluate(() => ({local:{...localStorage},session:{...sessionStorage},cookie:document.cookie}))).toEqual({local:{},session:{},cookie:''});
  await page.reload(); await expect(page.locator('#count')).toHaveText('0');
  const origin = new URL(page.url()).origin;
  expect(requests.every(r => r.method === 'GET' && r.url.startsWith(origin))).toBe(true);
  expect(errors).toEqual([]);
});

test('multiple QR in one image and multipart migration deduplication', async ({page}) => {
  await page.goto('/');
  const first=PNG.sync.read(await png(migration(0,2)));
  const second=PNG.sync.read(await png(migration(1,2,{name:'charlie@example.com'})));
  const combined=new PNG({width:1220,height:600,colorType:6}); combined.data.fill(255);
  PNG.bitblt(first,combined,0,0,600,600,0,0); PNG.bitblt(second,combined,0,0,600,600,620,0);
  await page.locator('#file-input').setInputFiles({name:'multi.png',mimeType:'image/png',buffer:PNG.sync.write(combined)});
  await expect(page.locator('#count')).toHaveText('3');
  await expect(page.locator('#batch-status')).toBeHidden();
  await page.locator('#file-input').setInputFiles({name:'same.png',mimeType:'image/png',buffer:PNG.sync.write(combined)});
  await expect(page.locator('#import-status')).toContainText('Новых аккаунтов: 0');
  await expect(page.locator('#count')).toHaveText('3');
});

test('multipart status, malicious labels, invalid inputs and keyboard tabs', async ({page}) => {
  await page.goto('/');
  await page.getByRole('tab',{name:'Ссылка'}).click();
  await page.locator('#uri-input').fill(migration(0,2,{name:'<img src=x onerror=alert(1)>'}));
  await page.locator('#parse-text').click();
  await expect(page.locator('#batch-status')).toContainText('1 из 2');
  expect(await page.locator('.account img').count()).toBe(0);
  await page.locator('#uri-input').fill('https://example.com'); await page.locator('#parse-text').click();
  await expect(page.locator('#import-status')).toHaveClass(/error/);
  await page.getByRole('tab',{name:'Ссылка'}).focus(); await page.keyboard.press('Home');
  await expect(page.getByRole('tab',{name:'Файл'})).toBeFocused();
  await expect(page.locator('#panel-image')).toBeVisible();
});

test('camera reads actual video frames and releases stream on tab switch', async ({page}) => {
  const dataUrl = await QRCode.toDataURL(uri,{width:800,margin:4});
  await page.addInitScript((data) => {
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async () => {
      const img=new Image(); img.src=data; await img.decode();
      const canvas=document.createElement('canvas'); canvas.width=800; canvas.height=800;
      const ctx=canvas.getContext('2d')!; ctx.drawImage(img,0,0);
      const stream=canvas.captureStream(10);
      (window as any).testStream=stream;
      const timer=setInterval(()=>ctx.drawImage(img,0,0),100);
      stream.getTracks()[0].addEventListener('ended',()=>clearInterval(timer));
      return stream;
    }});
  },dataUrl);
  await page.goto('/'); await page.getByRole('tab',{name:'Камера'}).click();
  await page.locator('#start-camera').click();
  await expect(page.locator('#count')).toHaveText('1');
  await page.getByRole('tab',{name:'Файл'}).click();
  expect(await page.evaluate(() => (window as any).testStream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
});

test('denied camera permission offers file fallback', async ({page}) => {
  await page.addInitScript(() => { Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{throw new DOMException('Denied','NotAllowedError');}}); });
  await page.goto('/'); await page.getByRole('tab',{name:'Камера'}).click(); await page.locator('#start-camera').click();
  await expect(page.locator('#import-status')).toContainText('Доступ к камере запрещён');
  await expect(page.locator('#take-photo')).toBeVisible();
  expect(await page.locator('#capture-input').getAttribute('capture')).toBe('environment');
});

test('light and dark themes, persistence, responsive layout and screenshots', async ({page},testInfo) => {
  await page.emulateMedia({colorScheme:'light'}); await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/${testInfo.project.name}-light.png`,fullPage:true});
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.screenshot({path:`test-results/${testInfo.project.name}-dark.png`,fullPage:true});
  expect(await page.evaluate(()=>({...localStorage}))).toEqual({theme:'dark'});
});

test('paste and drag-and-drop image input', async ({page}) => {
  await page.goto('/');
  const data = (await png(uri)).toString('base64');
  await page.evaluate(async b64 => {
    const blob=await fetch('data:image/png;base64,'+b64).then(r=>r.blob());
    const transfer=new DataTransfer(); transfer.items.add(new File([blob],'paste.png',{type:'image/png'}));
    document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer}));
  },data);
  await expect(page.locator('#count')).toHaveText('1');
  await page.getByRole('button',{name:'Очистить все данные'}).click();
  await page.evaluate(async b64=> {
    const blob=await fetch('data:image/png;base64,'+b64).then(r=>r.blob());
    const transfer=new DataTransfer(); transfer.items.add(new File([blob],'drop.png',{type:'image/png'}));
    document.querySelector('#dropzone')!.dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true}));
  },data);
  await expect(page.locator('#count')).toHaveText('1');
});

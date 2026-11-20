import './style.css';
import { t, initialLocale, setLocale, getLocale, type MessageKey } from './i18n';
import { languages, isLocale } from './locale';
import { LocalizedError } from './errors';
import { createIcons, KeyRound, ShieldCheck, ImagePlus, Camera, Link, Upload, Copy, Eye, EyeOff, QrCode, X, Download, Check, Trash2, LockKeyhole, ScanLine, FileJson, Info, CircleHelp, Aperture, CheckCheck, Sun, Moon, Languages } from 'lucide';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import QRCode from 'qrcode';
import { parseOtp, accountId, otpUri, toCsv, type Account } from './otp';

prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => path.endsWith('.wasm') ? wasmUrl : prefix + path } });
const icon = (name: string, cls = '') => `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
const icons = () => createIcons({ icons: { KeyRound, ShieldCheck, ImagePlus, Camera, Link, Upload, Copy, Eye, EyeOff, QrCode, X, Download, Check, Trash2, LockKeyhole, ScanLine, FileJson, Info, CircleHelp, Aperture, CheckCheck, Sun, Moon, Languages } });
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let accounts: Account[] = [];
const batches = new Map<string, { size: number; parts: Set<number> }>();
const seen = new Set<string>();
const revealed = new Set<string>();
let qrView: {account: Account; data: string} | null = null;
let generation = 0, busy = false, stream: MediaStream | null = null, cameraEpoch = 0;
let activeTab = 'image';
let toastTimer: ReturnType<typeof setTimeout>;

setLocale(await initialLocale());
const label = (key: MessageKey) => `<span data-i18n="${key}">${escape(t(key))}</span>`;
$('#app').innerHTML = `
  <header class="site-header"><a class="brand" href="/" data-i18n-attr="aria-label:home" aria-label="${t('home')}">${icon('key-round')}<span>totp-extractor</span></a><div class="header-actions"><span class="privacy-pill">${icon('lock-keyhole')} ${label('local')}</span><label class="language-control">${icon('languages')}<select id="language" aria-label="${t('language')}" data-i18n-attr="aria-label:language">${languages.map(l => `<option value="${l.code}" lang="${l.code}" dir="${l.code === 'ar' ? 'rtl' : 'ltr'}">${l.name}</option>`).join('')}</select><span class="select-chevron" aria-hidden="true"></span></label><button id="help" class="icon-button" data-i18n-attr="aria-label:help" aria-label="${t('help')}">${icon('circle-help')}</button><button id="theme-toggle" class="icon-button theme-toggle" aria-label="${t('lightTheme')}">${icon('sun')}</button></div></header>
  <main>
    <div class="page-heading"><div><h1>${label('title')}</h1><p>${label('subtitle')}</p></div></div>
    <div class="workspace">
      <section class="import-card" aria-labelledby="import-title"><div class="card-heading"><h2 id="import-title">${label('import')}</h2><span class="panel-hint">TOTP / HOTP</span></div>
        <div class="tabs" role="tablist" data-i18n-attr="aria-label:method" aria-label="${t('method')}"><button id="tab-image" role="tab" aria-selected="true" aria-controls="panel-image" data-tab="image">${icon('image-plus')} ${label('file')}</button><button id="tab-camera" role="tab" aria-selected="false" aria-controls="panel-camera" tabindex="-1" data-tab="camera">${icon('camera')} ${label('camera')}</button><button id="tab-text" role="tab" aria-selected="false" aria-controls="panel-text" tabindex="-1" data-tab="text">${icon('link')} ${label('link')}</button></div>
        <div id="panel-image" class="tab-panel" role="tabpanel" aria-labelledby="tab-image">
          <div id="dropzone" class="dropzone"><span class="upload-icon">${icon('image-plus')}</span><h3>${label('drop')}</h3><p>${label('paste')}</p><button id="choose-files" class="button primary">${icon('upload')} ${label('choose')}</button><p class="file-hint">${label('formats')}</p></div>
          <input id="file-input" type="file" accept="image/png,image/jpeg,image/webp,image/bmp" multiple hidden>
        </div>
        <div id="panel-camera" class="tab-panel" role="tabpanel" aria-labelledby="tab-camera" hidden><div class="camera-window"><video id="video" autoplay muted playsinline data-i18n-attr="aria-label:cameraPreview" aria-label="${t('cameraPreview')}"></video><div id="camera-placeholder">${icon('camera')}<h3>${label('aim')}</h3><p>${label('cameraPrompt')}</p></div><div class="viewfinder" hidden></div></div><div class="camera-actions"><button id="start-camera" class="button primary">${icon('camera')} ${label('start')}</button><button id="stop-camera" class="button secondary" hidden>${label('stop')}</button><button id="take-photo" class="text-button">${label('photo')}</button></div><input id="capture-input" type="file" accept="image/*" capture="environment" hidden><p id="camera-status" class="muted center" role="status">${label('cameraOff')}</p></div>
        <div id="panel-text" class="tab-panel" role="tabpanel" aria-labelledby="tab-text" hidden><label for="uri-input" class="field-label">${label('uriLabel')}</label><textarea id="uri-input" dir="ltr" rows="6" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="otpauth://totp/…&#10;otpauth-migration://offline?data=…"></textarea><p class="muted">${label('onePerLine')}</p><button id="parse-text" class="button primary">${icon('key-round')} ${label('extract')}</button></div>
        <div id="import-status" class="import-status" role="status" aria-live="polite" hidden></div>
        <div class="format-note">${icon('info')} ${label('formatNote')}</div>
      </section>
      <section id="results" class="results" aria-labelledby="results-title"><div class="results-heading"><h2 id="results-title">${label('accounts')} <span id="count">0</span></h2><div class="export-actions"><button id="export-json" class="button secondary" disabled>${icon('file-json')} JSON</button><button id="export-csv" class="button secondary" disabled>${icon('download')} CSV</button><button id="clear" class="icon-button danger" data-i18n-attr="aria-label:clear" aria-label="${t('clear')}" disabled>${icon('trash-2')}</button></div></div><div id="batch-status" class="batch-status" role="status" hidden></div><div id="account-list"></div></section>
    </div>
    <div class="session-note">${icon('shield-check')} ${label('sessionNote')}</div>
  </main>
  <div id="toast" class="toast" role="status" hidden></div>
  <dialog id="qr-dialog"><button id="close-dialog" class="icon-button dialog-close" data-i18n-attr="aria-label:close" aria-label="${t('close')}">${icon('x')}</button><div id="dialog-content"></div></dialog>
`;

icons();

const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
let preference: string | null = null;
try { preference = localStorage.getItem('theme'); } catch { /* Storage may be disabled. */ }
function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  $('#theme-toggle').setAttribute('aria-label', t(theme === 'dark' ? 'lightTheme' : 'darkTheme'));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101614' : '#f4f8f5');
  icons();
}
applyTheme(preference === 'light' || preference === 'dark' ? preference : systemTheme.matches ? 'light' : 'dark');
systemTheme.addEventListener('change', e => { if (!preference) applyTheme(e.matches ? 'light' : 'dark'); });
$('#theme-toggle').onclick = () => {
  preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', preference); } catch { /* The theme still works in memory. */ }
  applyTheme(preference as 'light' | 'dark');
};

type Message = string | (() => string);
const resolve = (m: Message) => typeof m === 'function' ? m() : m;
let statusMessage: Message = '', toastMessage: Message = '', cameraMessage: Message = () => t('cameraOff');
function cameraStatus(m: Message) { cameraMessage = m; $('#camera-status').textContent = resolve(m); }
function toast(message: Message) { toastMessage = message; $('#toast').textContent = resolve(message); $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
function status(message: Message, error = false) { statusMessage = message; const el = $('#import-status'); el.hidden = !resolve(message); el.textContent = resolve(message); el.classList.toggle('error', error); }
function render() {
  $('#count').textContent = String(accounts.length);
  for (const id of ['#export-json', '#export-csv', '#clear']) $(id).toggleAttribute('disabled', !accounts.length && !batches.size);
  if (!accounts.length) {
    $('#account-list').innerHTML = `<div class="empty-state"><span>${icon('key-round')}</span><h3>${t('emptyTitle')}</h3><p>${t('emptyText')}</p></div>`;
  } else $('#account-list').innerHTML = accounts.map((a, i) => `<article class="account" data-index="${i}"><span class="account-avatar tone-${i % 4}">${escape((a.issuer || a.name).slice(0, 2).toUpperCase())}</span><div class="account-main"><div class="account-title"><h3>${escape(a.issuer || t('account'))}</h3><span class="type-tag">${a.type.toUpperCase()}</span></div><p class="account-name">${escape(a.name || t('unnamed'))}</p><div class="secret-line"><code class="secret-value">${revealed.has(accountId(a)) ? a.secret : '•••• •••• •••• ••••'}</code><button class="icon-button" data-action="reveal" aria-label="${t(revealed.has(accountId(a)) ? 'hide' : 'reveal')}" aria-pressed="${revealed.has(accountId(a))}">${icon(revealed.has(accountId(a)) ? 'eye-off' : 'eye')}</button><button class="icon-button" data-action="copy" aria-label="${t('copy')}">${icon('copy')}</button></div><p class="account-meta">${a.algorithm} · ${t('digits', {count:a.digits})} · ${a.type === 'totp' ? t('seconds',{count:a.period}) : t('counter',{count:a.counter})}</p></div><button class="button secondary qr-button" data-action="qr">${icon('qr-code')}<span>${t('qr')}</span></button><button class="icon-button remove-account" data-action="remove" aria-label="${t('remove')}">${icon('x')}</button></article>`).join('');
  const incomplete = [...batches.values()].filter(b => b.parts.size < b.size);
  $('#batch-status').hidden = !incomplete.length;
  $('#batch-status').textContent = incomplete.map(b => t('incomplete', {received:b.parts.size,total:b.size})).join(' ');
  icons();
}
function ingest(value: string): number {
  const parsed = parseOtp(value);
  let added = 0;
  for (const a of parsed.accounts) {
    const id = accountId(a);
    if (!accounts.some(existing => accountId(existing) === id)) { accounts.push(a); added++; }
  }
  if (parsed.batch) {
    const b = parsed.batch;
    const key = `${b.id}:${b.size}`;
    const batch = batches.get(key) || { size: b.size, parts: new Set<number>() };
    batch.parts.add(b.index); batches.set(key, batch);
  }
  seen.add(value);
  render();
  return added;
}
function switchTab(tab: string) {
  activeTab = tab;
  stopCamera(); status('');
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => { const selected = button.dataset.tab === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
  document.querySelectorAll<HTMLElement>('.tab-panel').forEach(panel => panel.hidden = panel.id !== `panel-${tab}`);
}
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button, index, buttons) => {
  button.onclick = () => switchTab(button.dataset.tab!);
  button.onkeydown = e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === (document.documentElement.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight') ? 1 : -1) + buttons.length) % buttons.length; switchTab(buttons[next].dataset.tab!); buttons[next].focus(); } };
});

async function processFiles(files: File[]) {
  if (busy || !files.length) return;
  busy = true; const run = generation;
  $('#dropzone').classList.add('processing');
  let added = 0, successful = 0; const errors: (() => string)[] = [];
  try {
    for (const file of files) {
      if (run !== generation) return;
      status(() => t('processing', {file:file.name}));
      try {
        if (file.size > 20 * 1024 * 1024) throw new LocalizedError('fileTooLarge');
        if (!file.type.startsWith('image/')) throw new LocalizedError('chooseImage');
        const bitmap = await createImageBitmap(file);
        try { if (bitmap.width * bitmap.height > 40_000_000) throw new LocalizedError('imageTooLarge'); } finally { bitmap.close(); }
        const results = await readBarcodes(file, { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 64 });
        if (run !== generation) return;
        if (!results.length) throw new LocalizedError('qrMissing');
        for (const result of results) {
          try { added += ingest(result.text); successful++; } catch (e) { errors.push(() => `${file.name}: ${message(e)()}`); }
        }
      } catch (e) { errors.push(() => `${file.name}: ${message(e)()}`); }
    }
    if (run === generation) status(() => [successful ? t('recognized',{count:successful,added}) : '', ...errors.map(e => e())].filter(Boolean).join(' '), errors.length > 0);
  } finally { busy = false; $('#dropzone').classList.remove('processing'); $('#file-input').removeAttribute('aria-busy'); }
}
const message = (e: unknown): (() => string) => () => t(e instanceof LocalizedError ? e.key : 'processingFailed');
$('#choose-files').onclick = () => $('#file-input').click();
$('#take-photo').onclick = () => $('#capture-input').click();
for (const id of ['#file-input', '#capture-input']) $(id).onchange = (e) => { const input = e.target as HTMLInputElement; const files = [...(input.files || [])]; input.value = ''; void processFiles(files); };
const dropzone = $('#dropzone');
dropzone.ondragover = e => { e.preventDefault(); dropzone.classList.add('dragging'); };
dropzone.ondragleave = () => dropzone.classList.remove('dragging');
dropzone.ondrop = e => { e.preventDefault(); dropzone.classList.remove('dragging'); void processFiles([...(e.dataTransfer?.files || [])]); };
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
document.addEventListener('paste', e => { const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/')); if (files.length) { e.preventDefault(); switchTab('image'); void processFiles(files); } });
$('#parse-text').onclick = () => {
  const input = $('#uri-input') as HTMLTextAreaElement;
  const lines = input.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) { status(() => t('pasteUri'), true); return; }
  let added = 0; const errors: (() => string)[] = [];
  for (const [i, line] of lines.entries()) { try { added += ingest(line); } catch (e) { errors.push(() => `${t('line',{count:i+1})}: ${message(e)()}`); } }
  status(() => [t('added',{count:added}), ...errors.map(e => e())].join(' '), !!errors.length);
  if (!errors.length) input.value = '';
};

function stopCamera() {
  cameraEpoch++;
  stream?.getTracks().forEach(track => track.stop()); stream = null;
  $('#video').removeAttribute('src'); ($('#video') as HTMLVideoElement).srcObject = null;
  $('#camera-placeholder').hidden = false; $('.viewfinder').hidden = true;
  $('#start-camera').hidden = false; $('#stop-camera').hidden = true;
  cameraStatus(() => t('cameraOff'));
}
$('#stop-camera').onclick = stopCamera;
$('#start-camera').onclick = async () => {
  stopCamera(); const epoch = cameraEpoch;
  $('#start-camera').setAttribute('disabled', '');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new LocalizedError('cameraUnavailable');
    const acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    if (epoch !== cameraEpoch || activeTab !== 'camera') { acquired.getTracks().forEach(t => t.stop()); return; }
    stream = acquired;
    const video = $('#video') as HTMLVideoElement;
    video.srcObject = acquired; await video.play();
    if (epoch !== cameraEpoch) return;
    $('#camera-placeholder').hidden = true; $('.viewfinder').hidden = false;
    $('#start-camera').hidden = true; $('#stop-camera').hidden = false;
    cameraStatus(() => t('scanning'));
    const canvas = document.createElement('canvas');
    const scan = async () => {
      if (epoch !== cameraEpoch || !stream) return;
      try {
        if (video.videoWidth && video.readyState >= 2) {
          const scale = Math.min(1, 1600 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const results = await readBarcodes(ctx.getImageData(0, 0, canvas.width, canvas.height), { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 16 });
          if (epoch !== cameraEpoch) return;
          for (const result of results) if (!seen.has(result.text)) {
            try { const count = ingest(result.text); cameraStatus(() => t('cameraRecognized',{count})); }
            catch (e) { cameraStatus(message(e)); }
          }
        }
      } catch { if (epoch === cameraEpoch) cameraStatus(() => t('frameFailed')); }
      if (epoch === cameraEpoch) setTimeout(() => void scan(), 500);
    };
    void scan();
  } catch (e) {
    if (epoch !== cameraEpoch) return;
    stopCamera();
    const name = e instanceof DOMException ? e.name : '';
    status(name === 'NotAllowedError' ? () => t('cameraDenied') : name === 'NotFoundError' ? () => t('cameraMissing') : message(e), true);
  } finally { $('#start-camera').removeAttribute('disabled'); }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
window.addEventListener('pagehide', clearData);

async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); toast(() => t('copied')); } catch { toast(() => t('clipboardFailed')); }
}
const dialog = $('#qr-dialog') as HTMLDialogElement;
function closeDialog() { qrView = null; dialog.close(); $('#dialog-content').replaceChildren(); }
$('#close-dialog').onclick = closeDialog;
dialog.addEventListener('close', () => { qrView = null; $('#dialog-content').replaceChildren(); });
dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(); });
$('#account-list').onclick = async e => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
  if (!button) return;
  const card = button.closest<HTMLElement>('[data-index]')!;
  const a = accounts[Number(card.dataset.index)];
  if (!a) return;
  switch (button.dataset.action) {
    case 'copy': await copy(a.secret); break;
    case 'reveal': {
      const reveal = button.getAttribute('aria-pressed') !== 'true';
      if (reveal) revealed.add(accountId(a)); else revealed.delete(accountId(a));
      button.setAttribute('aria-pressed', String(reveal)); button.setAttribute('aria-label', reveal ? t('hide') : t('reveal'));
      card.querySelector('.secret-value')!.textContent = reveal ? a.secret : '•••• •••• •••• ••••';
      button.innerHTML = icon(reveal ? 'eye-off' : 'eye'); icons(); break;
    }
    case 'remove': revealed.delete(accountId(a)); accounts = accounts.filter(item => item !== a); render(); break;
    case 'qr': {
      const run = generation;
      try {
        const data = await QRCode.toDataURL(otpUri(a), { width: 320, margin: 3, errorCorrectionLevel: 'M' });
        if (run !== generation || !accounts.includes(a)) return;
        qrView = {account:a,data}; showQr();
        icons(); dialog.showModal();
      } catch { toast(() => t('qrFailed')); }
      break;
    }
  }
};
function download(content: string, extension: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = `otp-export.${extension}`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(() => t('downloaded'));
}
$('#export-json').onclick = () => download(JSON.stringify(accounts.map(a => ({ ...a, uri: otpUri(a) })), null, 2), 'json', 'application/json');
$('#export-csv').onclick = () => download(toCsv(accounts), 'csv', 'text/csv;charset=utf-8');
function clearData() {
  generation++; stopCamera(); accounts = []; batches.clear(); seen.clear(); revealed.clear();
  ($('#uri-input') as HTMLTextAreaElement).value = '';
  ($('#file-input') as HTMLInputElement).value = ''; ($('#capture-input') as HTMLInputElement).value = '';
  closeDialog(); status(''); render();
}
$('#clear').onclick = () => { clearData(); toast(() => t('cleared')); };
render();
$('#help').onclick = () => { showHelp(); dialog.showModal(); };
function showHelp() {
  $('#dialog-content').innerHTML = `<div class="dialog-eyebrow">${t('about')}</div><h2>${t('how')}</h2>${['helpSteps','helpScope','helpBatch','helpCodes','helpPrivacy'].map(key => `<p>${escape(t(key as MessageKey))}</p>`).join('')}`;
}

function showQr() {
  if (!qrView) return;
  const {account:a,data} = qrView;
  $('#dialog-content').innerHTML = `<div class="dialog-eyebrow">${t('ready')}</div><h2>${escape(a.issuer || a.name || t('unnamed'))}</h2><p class="muted">${escape(a.name || t('unnamed'))}</p><img class="export-qr" src="${data}" alt="${t('qrAlt')}"><p class="muted">${t('qrHint')}</p><button id="save-qr" class="button primary">${icon('download')} ${t('savePng')}</button>`;
  $('#save-qr').onclick = () => { const a = document.createElement('a'); a.href = data; a.download = 'otp-account.png'; a.click(); };
  icons();
}

function translatePage() {
  document.documentElement.lang = getLocale();
  document.documentElement.dir = getLocale() === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n as MessageKey));
  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach(el => { const [attr,key] = el.dataset.i18nAttr!.split(':'); el.setAttribute(attr,t(key as MessageKey)); });
  document.querySelector('meta[name="description"]')?.setAttribute('content',t('description'));
  ($('#language') as HTMLSelectElement).value = getLocale();
  applyTheme(document.documentElement.dataset.theme as 'light' | 'dark');
  $('#import-status').textContent = resolve(statusMessage);
  $('#toast').textContent = resolve(toastMessage);
  cameraStatus(cameraMessage);
  render();
  if (dialog.open) { if (qrView) showQr(); else showHelp(); }
}
$('#language').onchange = e => {
  const next = (e.target as HTMLSelectElement).value;
  if (!isLocale(next)) return;
  setLocale(next);
  try { localStorage.setItem('language',next); } catch { /* Preference is optional. */ }
  translatePage();
};
translatePage();

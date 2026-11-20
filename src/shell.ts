import { t, setLocale, type MessageKey } from './i18n';
import { languages, type Locale } from './locale';
import { siteName } from './site';

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!);
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`;

/** Shared, real application markup for initial HTML and browser hydration. */
export function renderShell(locale: Locale, base = '/') {
  setLocale(locale);
const label = (key: MessageKey) => `<span data-i18n="${key}">${escape(t(key))}</span>`;
return `
  <header class="site-header"><a class="brand" href="${base}" data-i18n-attr="aria-label:home" aria-label="${t('home')}">${icon('key-round')}<span>${siteName}</span></a><div class="header-actions"><span class="privacy-pill">${icon('lock-keyhole')} ${label('local')}</span><label class="language-control">${icon('languages')}<select id="language" aria-label="${t('language')}" data-i18n-attr="aria-label:language">${languages.map(l => `<option value="${l.code}" lang="${l.code}" dir="${l.code === 'ar' ? 'rtl' : 'ltr'}">${l.name}</option>`).join('')}</select><span class="select-chevron" aria-hidden="true"></span></label><button id="help" class="icon-button" data-i18n-attr="aria-label:help" aria-label="${t('help')}">${icon('circle-help')}</button><button id="theme-toggle" class="icon-button theme-toggle" aria-label="${t('lightTheme')}">${icon('sun')}</button></div></header>
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

}

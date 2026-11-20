# Development and deployment

## Local development

Node.js 24+ is required. Install with `npm ci`, then use `npm run dev`.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The production server (`npm run preview`, port 8080; configurable with `PORT`) serves the generated static application. It accepts GET/HEAD only, has no access log and requires no database or npm runtime dependencies. `/health` is the container health check.

Build and run with Docker:

```sh
docker build -t 2fa-key-extractor .
docker run --rm -p 8080:8080 2fa-key-extractor
```

The Docker build runs unit tests and produces the application before switching to the unprivileged `node` user. The server adds CSP, no-store, no-referrer and camera permissions headers. All OTP parsing, image decoding and QR generation happen in the browser.

## GitHub Pages

```sh
npm run build:pages
```

This emits a complete static site in `dist/`, including a `.nojekyll` marker. Asset URLs work beneath the deployment path. In GitHub Actions, `GITHUB_REPOSITORY` determines the URL: a project repository uses `/<repository>/`, while an organization site repository named `<owner>.github.io` uses `/`. The repository `totp-extractor/totp-extractor.github.io` publishes at the root of `https://totp-extractor.github.io/`.

GitHub Pages uses the workflow in [`.github/workflows/pages.yml`](../.github/workflows/pages.yml). It builds on every push to `main`, runs the unit tests and deploys the generated artifact. A manual run is also available in the Actions tab. Pages is configured to use GitHub Actions as its publishing source.

The public source repository is [totp-extractor/totp-extractor.github.io](https://github.com/totp-extractor/totp-extractor.github.io). The site is [totp-extractor.github.io](https://totp-extractor.github.io/). It runs entirely on GitHub Pages; no backend service is required.

## Language selection

Explicit `/ru/`, `/en/`, etc. URLs select their own language. On the root URL, a saved manual choice takes priority; otherwise the app uses `navigator.languages`, matching supported languages and region tags in preference order. English is the fallback. Only manual language and theme choices are persisted in localStorage.

GitHub Pages cannot read an HTTP `Accept-Language` header at runtime. Browser language detection runs locally when JavaScript starts, without API calls or an external locale service. The build already includes complete HTML and localized metadata for every language URL.

## Search and sharing metadata

`npm run build` prerenders the real application shell in English plus 16 localized routes. Every page has a localized title, description, canonical URL, `hreflang` alternates, Open Graph/Twitter metadata and WebApplication structured data. The build emits `robots.txt`, `sitemap.xml` and a social preview image. It uses no invented ratings or reviews and adds no keyword stuffing.

`VITE_SITE_URL` controls canonical URLs and the deployment subpath; it defaults to `https://totp-extractor.github.io/`. `npm run build:pages` configures the GitHub Pages URL instead. GitHub Pages uses the organization domain without a repository path.

Titles and structured data never contain imported account data or keys. The application keeps the work interface compact; the README explains the wider use case. Metadata helps describe the site; indexing and search rankings are not guaranteed.

## Compatibility and limits

Input supports standard TOTP/HOTP `otpauth://` links and Google Authenticator migration exports. SHA-1/256/512, six/eight digits and exact 64-bit HOTP counters are preserved. Google exports do not include a TOTP period; those entries use 30 seconds.

Image imports are limited to 20 MiB and 40 megapixels, with up to 64 QR codes per image. Multiple migration parts are tracked and duplicate entries are skipped. JSON and CSV are outputs only.

Browser tests cover screenshots, camera frames, denial of camera permission, multipart exports, copied keys, JSON/CSV, QR roundtrips, both themes, language switches, RTL, browser language preferences and operation without external requests. Camera tests use a synthetic MediaStream; real camera hardware needs device testing.

## Privacy and third-party notices

Secrets stay in tab memory until cleared or closed. JavaScript does not provide guaranteed cryptographic erasure. Downloads and clipboard contents are managed by the user. Hosting providers can log requests for site resources; local secret processing does not prevent ordinary hosting access logs.

Dependencies and their versions are pinned in `package-lock.json`. Distribution includes `public/third-party-licenses.txt` and the [Manrope font license](../public/manrope-OFL.txt). Python code from `scito/extract_otp_secrets` has not been copied.

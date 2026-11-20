# Development and deployment

## Local development

Node.js 24+ is required. Install with `npm ci`, then use `npm run dev`.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The production server (`npm run preview`, port 8080; configurable with `PORT`) serves the generated application and a language endpoint. It accepts GET/HEAD only, has no access log and requires no database or npm runtime dependencies. `/health` is the container health check.

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

This emits a complete static site in `dist/`, including a `.nojekyll` marker. Asset URLs work beneath `/totp-extractor/`. In GitHub Actions, `GITHUB_REPOSITORY` determines the project path, so a later repository rename only needs the public URL settings reviewed.

GitHub Pages uses the workflow in [`.github/workflows/pages.yml`](../.github/workflows/pages.yml). It builds on every push to `main`, runs the unit tests and deploys the generated artifact. A manual run is also available in the Actions tab. Pages is configured to use GitHub Actions as its publishing source.

The source repository is public by the owner’s explicit decision. The current site is [ivanpadavan.github.io/totp-extractor](https://ivanpadavan.github.io/totp-extractor/). The repository name remains `totp-extractor`; a later rename is a separate decision.

## HTTP language negotiation on static hosting

The root page chooses its language from the actual `Accept-Language` header via `/api/locale`, respecting `q` weights and region tags. English is the fallback. A manual language choice is stored in `language`; the theme is stored in `theme`. Explicit `/ru/`, `/en/`, etc. URLs select their own language.

GitHub Pages cannot run a header-processing server. The Pages build therefore uses the existing `https://totp.frolkin.top/api/locale` endpoint with omitted credentials and no referrer. That endpoint returns only a locale and allows the `https://ivanpadavan.github.io` origin. Images, keys, account names and OTP links are never included. Localized URLs do not need that request. If the endpoint is unavailable, the root page remains usable in English and the language selector still works.

Configure `VITE_LOCALE_ENDPOINT` to change the endpoint. The root-domain Dokploy build uses its own same-origin endpoint. No automatic choice is persisted; a manual selection takes priority on the root URL.

## Search and sharing metadata

`npm run build` prerenders the real application shell in English plus 16 localized routes. Every page has a localized title, description, canonical URL, `hreflang` alternates, Open Graph/Twitter metadata and WebApplication structured data. The build emits `robots.txt`, `sitemap.xml` and a social preview image. It uses no invented ratings or reviews and adds no keyword stuffing.

`VITE_SITE_URL` controls canonical URLs and the deployment subpath; it defaults to `https://totp.frolkin.top/`. `npm run build:pages` configures the GitHub Pages URL instead. The current repository name and production domain remain unchanged pending review.

Titles and structured data never contain imported account data or keys. The application keeps the work interface compact; the README explains the wider use case. Metadata helps describe the site; indexing and search rankings are not guaranteed.

## Compatibility and limits

Input supports standard TOTP/HOTP `otpauth://` links and Google Authenticator migration exports. SHA-1/256/512, six/eight digits and exact 64-bit HOTP counters are preserved. Google exports do not include a TOTP period; those entries use 30 seconds.

Image imports are limited to 20 MiB and 40 megapixels, with up to 64 QR codes per image. Multiple migration parts are tracked and duplicate entries are skipped. JSON and CSV are outputs only.

Browser tests cover screenshots, camera frames, denial of camera permission, multipart exports, copied keys, JSON/CSV, QR roundtrips, both themes, language switches, RTL and HTTP negotiation. Camera tests use a synthetic MediaStream; real camera hardware needs device testing.

## Privacy and third-party notices

Secrets stay in tab memory until cleared or closed. JavaScript does not provide guaranteed cryptographic erasure. Downloads and clipboard contents are managed by the user. Hosting providers can log requests for site resources; local secret processing does not prevent ordinary hosting access logs.

Dependencies and their versions are pinned in `package-lock.json`. Distribution includes `public/third-party-licenses.txt` and the [Manrope font license](../public/manrope-OFL.txt). Python code from `scito/extract_otp_secrets` has not been copied.

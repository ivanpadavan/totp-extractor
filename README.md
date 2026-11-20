# 2FA Key Extractor

Extract authenticator secret keys from QR codes — directly in your browser.

Read **TOTP and HOTP setup QR codes**, decode **Google Authenticator exports**, and save portable keys as JSON, CSV or individual QR codes. Use an image, a screenshot, a camera or an `otpauth://` link.

**[Open the app](https://totp.frolkin.top/)** · [Русский](docs/README.ru.md) · [Development and deployment](docs/DEVELOPMENT.md)

## One QR code. Portable keys.

1. Add a QR image, paste a screenshot or scan with your camera.
2. Review each account and reveal or copy its secret key.
3. Download JSON, CSV or a QR code to use with another authenticator.

**TOTP** (time-based codes) and **HOTP** (counter-based codes) are open standards used by many authenticator apps. This tool reads their standard `otpauth://` setup links and QR codes. Google Authenticator’s `otpauth-migration://` export is supported as an additional input format.

## What you can do

- Read multiple images and multiple QR codes in one image.
- Scan with a phone or computer camera; paste screenshots or drag and drop files.
- Track missing parts of a Google Authenticator export and skip duplicate accounts.
- Copy Base32 secrets, download individual QR images, or export all accounts as JSON or CSV.
- Preserve SHA-1, SHA-256 or SHA-512 settings, 6- or 8-digit codes and HOTP counters.
- Work in 16 languages, with light/dark themes and an Arabic RTL layout.

Images and keys are processed locally. No account, database or secret upload is required. Only your language and theme preferences are saved in browser storage. Exported files contain unencrypted secrets, so keep them somewhere you trust.

## Supported formats

| Input | Support |
| --- | --- |
| Standard TOTP/HOTP setup QR or `otpauth://` link | Yes |
| Google Authenticator export QR or `otpauth-migration://` link | Yes, including multiple parts |
| PNG, JPEG, WebP or BMP images | Up to 20 MB and 40 megapixels per image |
| Several links | One link per line |

**Outputs:** JSON, CSV, standard account QR codes and PNG images. Saved JSON/CSV files are export formats; importing them back is not implemented yet. A screenshot of a six-digit code cannot reveal its secret key — use the setup or export QR.

## Run it yourself

Node.js 24 or later:

```sh
npm ci
npm run dev
```

Docker:

```sh
docker build -t 2fa-key-extractor .
docker run --rm -p 8080:8080 2fa-key-extractor
```

See [development and deployment](docs/DEVELOPMENT.md) for tests, GitHub Pages, language negotiation and SEO build settings.

## Built with

ZXing WASM, protobufjs, qrcode, Lucide, TypeScript and Vite. The interface and parser are independently implemented; the Google migration format follows the public Protobuf schema. Thanks to [extract_otp_secrets](https://github.com/scito/extract_otp_secrets) and [Aegis](https://github.com/beemdevelopment/Aegis) for documenting the format and migration use case.

Third-party notices are included with the deployed app. This project is not affiliated with Google or any authenticator vendor.

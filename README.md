# 2FA Key Extractor — TOTP & HOTP QR decoder

Extract 2FA secret keys from authenticator QR codes in your browser. Decode TOTP/HOTP setup codes and Google Authenticator exports, then save the keys to move your accounts to another authenticator app.

**[Open the app](https://ivanpadavan.github.io/totp-extractor/)** · [Русский](docs/README.ru.md) · [Python CLI](https://github.com/scito/extract_otp_secrets)

## How to use

1. Upload a QR image, paste a screenshot, scan with your camera or paste an OTP link.
2. Review the accounts and copy their Base32 secret keys.
3. Export JSON, CSV or individual QR codes / PNG images.

Use a **setup or export QR code**: a screenshot of a rotating six-digit code cannot reveal the secret key.

## Features

- Standard TOTP and HOTP QR codes and `otpauth://` links.
- Google Authenticator `otpauth-migration://` exports, including multiple parts.
- Multiple images or QR codes at once, with duplicate detection.
- SHA-1/256/512, 6- or 8-digit codes and HOTP counters preserved.
- 16 languages, light and dark themes, mobile layout and Arabic RTL.

PNG, JPEG, WebP and BMP images are supported, up to 20 MiB and 40 megapixels each. JSON and CSV are export formats; importing them is not supported yet.

## Privacy

Images and secret keys are processed locally in your browser and are never uploaded. Only language and theme preferences are saved in browser storage. Export files contain unencrypted secrets; store them securely.

## Run locally

Requires Node.js 24+:

```sh
npm ci
npm run dev
```

See [development and deployment](docs/DEVELOPMENT.md) for tests, Docker, GitHub Pages and language settings.

## Python alternative and credits

Prefer Python or the command line? Use [scito/extract_otp_secrets](https://github.com/scito/extract_otp_secrets), the project that inspired this web app. This is an independent implementation in TypeScript; Python source code was not copied.

Built with ZXing WASM, protobufjs, qrcode, Lucide and Vite. Thanks to [Aegis](https://github.com/beemdevelopment/Aegis) for format documentation. Third-party notices ship with the app. Not affiliated with Google or other authenticator vendors.

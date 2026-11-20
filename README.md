[![TOTP Extractor — authenticator keys from QR codes. Open source · MIT.](docs/assets/readme-banner.svg)](https://totp-extractor.github.io/)

# TOTP Extractor — extract 2FA secret keys from QR codes

Turn an authenticator QR code into a secret key you can copy, back up or use in another 2FA app. **TOTP Extractor** decodes TOTP/HOTP setup QR codes and Google Authenticator exports directly in your browser.

**[Open TOTP Extractor](https://totp-extractor.github.io/)** · [Русский](docs/README.ru.md)

## Move your 2FA accounts to another authenticator

1. **Add your QR code.** Upload an image, paste a screenshot, scan with your camera or paste an `otpauth://` link.
2. **Get the secret keys.** Review the accounts and copy the key you need.
3. **Save or transfer.** Download JSON or CSV for backup, or scan an individual account QR code with your new authenticator.

No installation or sign-up required. Works on phones and computers.

## Supported QR codes and exports

- **TOTP and HOTP setup codes** — extract the Base32 secret key and account settings from a standard authenticator QR code.
- **Google Authenticator exports** — decode one account or several, including exports split across multiple QR codes.
- **Images and screenshots** — read PNG, JPEG, WebP and BMP files, with multiple QR codes per image and duplicate detection.

Export accounts as **JSON, CSV or individual QR/PNG images**. JSON and CSV imports are not supported.

You need the **setup or export QR code**. A screenshot of a six-digit login code does not contain the secret key.

## Your keys stay in your browser

Images and secret keys are processed locally and are never uploaded to a server. Keep downloaded exports private: they contain your unencrypted 2FA secret keys.

## Prefer a Python tool?

See [scito/extract_otp_secrets](https://github.com/scito/extract_otp_secrets) for a Python command-line alternative. It is the project that inspired TOTP Extractor.

Open source · [MIT license](LICENSE) · [Self-hosting and development](docs/DEVELOPMENT.md) · [Third-party notices](public/third-party-licenses.txt)

import { spawnSync } from 'node:child_process';

// A GitHub Actions job can derive this URL after a future repository rename.
const repository = process.env.GITHUB_REPOSITORY || 'ivanpadavan/totp-extractor';
const [owner,name] = repository.split('/');
const siteUrl = process.env.VITE_SITE_URL || `https://${owner.toLowerCase()}.github.io/${name}/`;
const result = spawnSync('npm',['run','build'], {
  stdio:'inherit',
  env:{...process.env,VITE_SITE_URL:siteUrl,VITE_LOCALE_ENDPOINT:process.env.VITE_LOCALE_ENDPOINT || 'https://totp.frolkin.top/api/locale'},
});
process.exit(result.status ?? 1);

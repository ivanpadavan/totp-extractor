import { spawnSync } from 'node:child_process';

// Organization/user sites live at the origin; project sites use the repository path.
const repository = process.env.GITHUB_REPOSITORY || 'totp-extractor/totp-extractor.github.io';
const [owner,name] = repository.split('/');
const host = `${owner.toLowerCase()}.github.io`;
const path = name.toLowerCase() === host ? '/' : `/${name}/`;
const siteUrl = process.env.VITE_SITE_URL || `https://${host}${path}`;
const result = spawnSync('npm',['run','build'], {
  stdio:'inherit',
  env:{...process.env,VITE_SITE_URL:siteUrl},
});
process.exit(result.status ?? 1);

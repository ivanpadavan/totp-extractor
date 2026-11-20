import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_SITE_URL ? new URL(process.env.VITE_SITE_URL).pathname : '/',
});

import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://homeclaw.omarknows.app',
  base: '/',
  output: 'static',
  integrations: [tailwind()],
});

import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://extracurricular.ai',
  integrations: [
    preact(),
  ],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh', 'es', 'fr'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});

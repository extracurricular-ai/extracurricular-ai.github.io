import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://extracurricular.ai',
  devToolbar: { enabled: false },
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
      // The default locale is served at / rather than redirected to /en/.
      // A static host can only express that redirect as a meta refresh, which
      // shows a visible "Redirecting..." flash before anything paints.
      prefixDefaultLocale: false,
    },
  },
});

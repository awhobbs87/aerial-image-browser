import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',

  adapter: cloudflare({
    imageService: 'compile',
  }),

  integrations: [react()],

  fonts: [
    {
      name: 'Inter',
      cssVariable: '--font-inter',
      provider: fontProviders.fontsource(),
    },
  ],

  vite: {
    build: {
      minify: false,
    },
    ssr: {
      // @cloudflare/unenv-preset polyfills are virtual modules injected by workerd
      // and should not be processed by Vite's SSR dep optimizer.
      external: ['@cloudflare/unenv-preset'],
    },
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },

  experimental: {
    rustCompiler: true,
  },
});

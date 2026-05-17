import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  devToolbar: {
    enabled: false,
  },

  adapter: cloudflare({
    imageService: 'compile',
    // Disable remote proxy session during build — CI environments lack wrangler auth.
    // Bindings are only needed at runtime, not at build time.
    remoteBindings: false,
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
    plugins: [tailwindcss()],
    build: {
      minify: false,
    },
    worker: {
      // Must be 'es' for code-splitting compatibility; geotiff-tilesource's
      // worker files are pre-built and served from public/assets/ instead.
      format: 'es',
    },
    optimizeDeps: {
      // Exclude geotiff-tilesource from dep optimization so Vite doesn't
      // try to process its `new Worker(new URL(...))` patterns.
      exclude: ['geotiff-tilesource'],
    },
    ssr: {
      // @cloudflare/unenv-preset polyfills are virtual modules injected by workerd.
      // geotiff-tilesource is client-only; its bundled Web Worker breaks SSR builds.
      external: ['@cloudflare/unenv-preset', 'geotiff-tilesource'],
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

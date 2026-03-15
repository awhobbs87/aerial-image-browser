import { defineConfig, fontProviders } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

export default defineConfig({
  output: "server",

  adapter: cloudflare({
    imageService: "compile",
    prerenderEnvironment: "node",
    persistState: true,
  }),

  integrations: [react()],

  fonts: [
    {
      name: "Inter",
      cssVariable: "--font-inter",
      provider: fontProviders.fontsource(),
    },
  ],

  vite: {
    build: {
      minify: false,
    },
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },

  experimental: {
    rustCompiler: true,
  },
});

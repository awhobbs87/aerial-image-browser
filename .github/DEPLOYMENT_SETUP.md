# Deployment Setup Guide

This project deploys as a **Cloudflare Worker** using the Astro 6 Cloudflare adapter. There is no separate frontend build or Cloudflare Pages project.

## Architecture

- **Runtime**: Cloudflare Workers (`workerd`)
- **Adapter**: `@astrojs/cloudflare` v13 (Workers mode)
- **Entry point**: `@astrojs/cloudflare/entrypoints/server` (set in `wrangler.jsonc`)
- **Custom domain**: `aerial-explorer.awhq.uk` (zone: `awhq.uk`)

## Auto-Deploy (GitHub Actions)

The workflow at `.github/workflows/deploy-workers.yml` runs on every push to `main`:

1. Checkout repo
2. Install Node 22
3. `npm ci`
4. `npx astro build`
5. `npx wrangler deploy`

### Required GitHub Secret

Add one secret in **Settings → Secrets and variables → Actions**:

| Name                   | Value                                                            |
| ---------------------- | ---------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | A Cloudflare API token with **Workers Scripts: Edit** permission |

### Creating the API Token

1. Go to [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Use the **"Edit Cloudflare Workers"** template, or create a custom token with:
   - **Account → Workers Scripts → Edit**
   - **Account → Workers KV Storage → Edit** (for KV bindings)
   - **Zone → Workers Routes → Edit** (for custom domain route)

## Manual Deploy

```bash
npm run deploy
```

This runs `astro build && wrangler deploy` in one step.

## Local Development

```bash
npm run dev
```

Starts the Astro dev server backed by `workerd`. All Cloudflare bindings (KV, D1, R2, AI) work locally via the values in `.dev.vars` and `wrangler.jsonc`.

Copy `.dev.vars.example` to `.dev.vars` and fill in any local secrets before running.

## D1 Migrations

```bash
# Local
npm run db:migrate:local

# Production
npm run db:migrate
```

## Wrangler Secrets

Secrets that cannot go in `wrangler.jsonc` must be set via the CLI:

```bash
npx wrangler secret put TIFF_CONVERSION_SERVICE_URL
```

## Bindings Summary

| Binding                       | Type             | Resource                                  |
| ----------------------------- | ---------------- | ----------------------------------------- |
| `PHOTO_CACHE`                 | KV               | Layer metadata cache, search history      |
| `PHOTOS_DB`                   | D1               | `tas-browser` — users, favorites, history |
| `TIFF_STORAGE`                | R2               | `tas-aerial-browser-tiffs`                |
| `THUMBNAIL_STORAGE`           | R2               | `tas-aerial-browser-thumbnails`           |
| `AI`                          | Workers AI       | Llama 3 8B Instruct                       |
| `ANALYTICS`                   | Analytics Engine | `tas-aerial-browser` dataset              |
| `API_BASE_URL`                | Var              | ArcGIS MapServer URL                      |
| `TIFF_CONVERSION_SERVICE_URL` | Secret           | Set via `wrangler secret put`             |

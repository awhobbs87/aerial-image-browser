# Deployment Setup Guide

This repository has automated deployments configured for both Cloudflare Workers and Cloudflare Pages.

## Current Setup

### Cloudflare Workers (Backend)
- **Auto-deploy**: Enabled via Cloudflare Dashboard Git integration
- **Trigger**: Pushes to `main` branch
- **Status**: ✅ Configured and working

### Cloudflare Pages (Frontend)
- **Auto-deploy**: GitHub Actions workflow
- **Trigger**: Pushes to `main` branch (frontend changes only)
- **Status**: ⚠️ Requires GitHub secrets setup

## Required GitHub Secrets

To enable Pages auto-deployment, add these secrets in your GitHub repository:

1. Go to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

2. Add the following secret:
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Value**: Your Cloudflare API token with Pages edit permissions

### Creating a Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template or create custom token with:
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **Workers Scripts** → **Edit** (if needed)
4. Copy the token and add it to GitHub secrets

## How It Works

### Worker Auto-Deploy
- Configured in Cloudflare Dashboard
- Automatically deploys when you push to `main`
- No additional setup needed

### Pages Auto-Deploy
- GitHub Actions workflow (`.github/workflows/deploy-pages.yml`)
- Triggers on pushes to `main` that affect `frontend/` directory
- Builds the frontend and deploys to Cloudflare Pages
- Requires `CLOUDFLARE_API_TOKEN` secret

## Manual Deployment (Fallback)

If auto-deploy fails, you can deploy manually:

```bash
# Deploy Worker
npm run deploy

# Deploy Pages
npm run build:frontend
CLOUDFLARE_ACCOUNT_ID=7330403de4c2446fd5f3cc58548a9cd4 npx wrangler pages deploy frontend/dist --project-name=tas-aerial-explorer
```

## Testing Auto-Deploy

To test the auto-deploy setup:

1. Make a small change (e.g., update a comment)
2. Commit and push to `main`
3. Check:
   - **Worker**: Cloudflare Dashboard → Workers → Deployments
   - **Pages**: GitHub Actions tab → Latest workflow run


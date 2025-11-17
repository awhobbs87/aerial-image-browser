# Repository Guidelines

## Project Structure & Module Organization
Worker code lives in `src/` (`routes/api.ts`, `lib/` helpers, `types/` bindings). React 19 PWA files stay in `frontend/`: shared UI in `src/components/`, hooks in `src/hooks/`, and API helpers in `src/lib/`. PWA assets live in `frontend/public/`, migrations in `migrations/`, and `test.html` supports quick Worker smoke tests.

## Build, Test, and Development Commands
- `npm run dev` / `npm run dev:frontend` / `npm run dev:all`: spin up Wrangler (8787) and Vite (5173).
- `npm run build` then `npm run deploy` for the Worker; deploy Pages with `CLOUDFLARE_ACCOUNT_ID=… npx wrangler pages deploy dist`.
- `npm run db:migrate[:local]` keeps the D1 schema aligned; `npm run lint`, `npm run test`, and `npm run type-check` are the pre-PR checklist.

## Coding Style & Naming Conventions
TypeScript-only repo, Prettier two-space indentation, ESLint enforced via Husky + lint-staged. Components/hooks use PascalCase/`use*`, utilities/tests use kebab-case filenames. Worker handlers stay stateless and return `c.json(...)`; React state should live in hooks or context. Keep palette + typography edits inside `frontend/src/theme.ts` so new views inherit the Stage 13 styling.

## Testing Guidelines
Vitest drives both stacks. Backend specs go under `src/**/__tests__` (ArcGIS adapters, cache fallbacks, TIFF streaming). Frontend specs live beside components with React Testing Library + jsdom. Run `npm run test:backend`, `npm run test:frontend`, or `npm run test` before PRs and add coverage for map gestures, filter presets, timeline rendering, and comparison interactions.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat(frontend):`, `fix(backend):`, `chore:`) with one concern per commit. Bundle migrations, asset changes, or binding updates in the same PR that consumes them. PRs must summarize impact, cite test commands, and attach screenshots or GIFs for map, grid, timeline, or comparison changes.

## Security & Hosting Notes
Wrangler secrets store R2/KV/D1 credentials; never commit tokens. Update `wrangler.toml` when bindings or Pages projects change and document required env vars. Because Workers, R2, and the PWA cache responses aggressively, bump cache keys or version metadata when payloads change. Always run `npm run db:migrate` before deploying code that expects new columns.

## Timeline & Comparison Features
Next sprint adds a Grid/Timeline toggle plus a comparison modal. Extend the existing React Query hook to emit chronological buckets so the timeline reuses cache and respects filter presets + shortcuts. Comparison mode should allow multi-select, then open a modal with Slider (stacked canvases + range input), Side-by-Side (synced pan/zoom), and Then-vs-Now (historical TIFF vs live Leaflet map on shared bounds). Persist selections in context so TIFF fetches happen once, expose new Worker params via typed bindings, and cover the new flows with tests + screenshots before merging.

# Plan: free-tier performance fixes

Branch: `perf/free-tier-caching`. Everything stays on Vercel Hobby + Neon free. No database writes, no `prisma db push`, no secrets in the repo.

## 1. Edge cache headers for static repertory GETs

**Cause (confirmed on production 16 Nov 2026):**
`/api/symptoms` and `/api/remedies` already set `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` (route + `next.config.ts`), but live responses are only `cache-control: public`, with `vary: rsc, next-router-state-tree, ...` and repeated `x-vercel-cache: MISS` (age 0) even on immediate retries. Two things are going wrong:

1. `/api/symptoms` reads `request.nextUrl.searchParams`, so Next.js 15 treats the whole handler as dynamic and overwrites `Cache-Control` before Vercel’s CDN sees `s-maxage`. Runtime `fs` parsing of the 33 MB repertory file also keeps routes dynamic.
2. Even when `s-maxage` reaches Vercel, the CDN strips it from the client-facing header unless `CDN-Cache-Control` or `Vercel-CDN-Cache-Control` is also set.

**Fix:**
- Shared helper that sets `Cache-Control`, `CDN-Cache-Control`, and `Vercel-CDN-Cache-Control` to `public, s-maxage=3600, stale-while-revalidate=86400` (shorter TTL for search/query routes).
- Routes with no query params (`/api/symptoms` chapter list, `/api/remedies`, `/api/symptoms/[id]`, `/api/remedies/[id]`): `export const revalidate = 3600`, `export const dynamic = 'force-static'`, and do not read `NextRequest` search params.
- Move `?parent=` children lookups to `/api/symptoms/children/[id]` and update the client. Keep a small compat path if cheap; do not leave searchParams on the chapter-list route.
- Query-param search routes stay dynamic and set the CDN headers explicitly.

## 2. Precompute repertory artifacts at build time

Cold starts currently parse `src/data/oldRepertory.json` (33 MB) + `medicineDetails.json` (2.4 MB) in every data route via `neoLoader`.

**Fix:** a prebuild script writes compact JSON under `src/data/generated/`:
- chapter list (exact `/api/symptoms` payload)
- children map (exact children payloads)
- symptom meta + leaf/node rubrics + remedy map (enough to rebuild `/api/symptoms/[id]`, search, and rank identically)
- remedies list and per-remedy detail (including precomputed `relatedRemedies`)
- symptom and remedy search indexes (including precomputed `bnLower`)

Runtime loaders read only the files they need. `oldRepertory.json` / `medicineDetails.json` are not imported and are excluded from serverless tracing. Dataset is ~43 chapters, ~12.7k nodes, ~1,108 remedies.

**Compatibility:** snapshot current responses from a local server for chapters, several symptom ids (including parents), remedies list, one remedy detail, symptom search, remedy search, and rank-remedies. After the change, diff them (JSON-equal). The only intentional shape change is slimming `/api/remedies` (item 4).

## 3. Client localStorage stale-while-revalidate

Explorer chapter list (and symptom detail / children) should render instantly on repeat visits: show cached JSON immediately, refresh in the background. Version the storage key and cap total size (evict oldest when over budget). Hook this into `neoApi` GET helpers used by the sidebar and symptom tree.

## 4. Slim `/api/remedies` list

`neoApi.getRemedies()` is never called from live client code; no UI reads `description` from the list payload. Drop `description` from the list response only. Keep it on detail, search-index matching, and rank-remedies.

## 5. Neon keep-alive: skip; add a wake-up message instead

Neon Free is 100 CU-hours per project per month (~400 hours at the default 0.25 CU). Scale-to-zero after 5 minutes cannot be disabled. A ping every ~4 minutes, 24/7, would run the compute ~720 hours/month (180 CU-hours) and would exhaust the quota, after which compute stays suspended until the next billing period.

**Do not add a keep-alive cron.** Instead:
- Add a lightweight `GET /api/health/db` (`SELECT 1` only). Do not poll it from the client.
- On login and cloud history loading states, if a request takes more than 2 seconds, show “Waking up the database…”.
- Persist the Prisma client on `globalThis` in production too.

## 6. Build command

Replace `prisma db push` in `frontend` `npm run build` with `prisma generate && node scripts/precompute-repertory.mjs && next build`, so Vercel preview/production builds cannot rewrite the live schema. Local verification uses `npx prisma generate && npx next build` after precompute, never `npm run build` until that script is safe.

## Verification

- Before/after JSON equality on the snapshot suite (except the intentional slim of `/api/remedies`).
- One typecheck and one `npx prisma generate && npx next build` at the end.
- After push, if a Vercel preview URL exists, curl `/api/symptoms` and `/api/symptoms/<id>` and confirm `Cache-Control` / `CDN-Cache-Control` carry `s-maxage=3600`.
- Confirm `oldRepertory.json` is not in traced function files if measurable.

## Delivery

Sensible commits on this branch, push once, open a PR against `main` with `gh pr create`. Do not merge.

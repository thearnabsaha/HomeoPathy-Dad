# NeoAI Homeopathy (HomeoPathy-Dad)

Homeopathic repertory app for symptom exploration, remedy ranking, and AI consults. Built for a Vercel Hobby + Neon free-tier deployment.

## Stack

- **App**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui, in `frontend/`
- **Data**: Prisma + Neon Postgres (auth, consultations, repertory sessions)
- **AI**: Groq (chat, symptom analysis, doctor/consult flows)
- **Repertory**: Kent-style data in `frontend/src/data/`; compact artifacts are generated at build time from `oldRepertory.json` and `medicineDetails.json`
- **Languages**: English and Bengali

The `backend/` folder is the old Express API and is not used by the deployed app.

## Commands

All app commands run from `frontend/`. Copy `frontend/.env.example` to `frontend/.env` and fill in `DATABASE_URL`, `JWT_SECRET`, and `GROQ_API_KEY`. Never commit `.env`.

```bash
cd frontend
npm install
npm run precompute          # writes src/data/generated/* from the repertory JSON
npm run dev                 # http://localhost:3000
npx prisma generate && npx next build
npm start
```

`npm run build` is `prisma generate && npm run precompute && next build`. It must **not** run `prisma db push` (that would rewrite the live Neon schema on every deploy).

## Design rules

- Keep work on free tiers (Vercel Hobby, Neon free). Do not add a 24/7 database keep-alive; it would exceed Neon’s 100 CU-hour monthly quota.
- Static repertory GET routes should send `Cache-Control`, `CDN-Cache-Control`, and `Vercel-CDN-Cache-Control` with `public, s-maxage=3600, stale-while-revalidate=86400` (shorter TTL for search).
- Runtime routes must not import or parse the 33 MB `oldRepertory.json`. Use the precomputed files under `src/data/generated/`.
- Do not write to the database from build or from one-off scripts unless explicitly asked.
- Open only the files you need, edit in place, and prefer one typecheck plus one production build at the end of a change set.
- Auth tokens live in localStorage, not cookies, so public repertory GETs can be cached at the edge.

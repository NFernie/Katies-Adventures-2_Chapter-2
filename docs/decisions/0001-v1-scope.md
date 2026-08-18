# v1 is BodyPlan on a GitHub Pages project site

v1 is a **single-user** BodyPlan: metric, male/female, InBody/Tanita (BodyID) fields, gym equipment only, user-selected diet / kitchen / days per week / goal type / timeline, owned JSON catalogs, USDA write-time recipe macros, swaps on, no photos, disclaimer with **unsafe loss speed** as the only generator block. It ships as a **static** Next.js export on a GitHub **project** site (`username.github.io/Katies-Adventures-2_Chapter-2`) with Next.js **`basePath`**, talking to Supabase from the browser via `supabase-js`. Frozen in `InitialPlan180826.md` §3 (18 Aug 2026). Product brief: `PRODUCT.md`.

## Status

accepted

## Considered options

- **GitHub user site** (`username.github.io` with no `basePath`) — rejected; §3 locks a **project** site and `basePath`.
- **Netlify / Vercel** for v1 — not required. Enough for a personal planner is Pages + Supabase. An escape hatch only if a later ADR needs a server.
- **Public multi-user SaaS** — rejected; audience is one Owner.
- **Imperial toggle, home/bands/bodyweight tracks, progress photos** — rejected in §3; do not add them as “helpful” extras.

## Consequences

- `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`, and the project `basePath` are host constraints, not later niceties.
- NextAuth.js, Auth.js, Prisma-in-the-browser, and Server Actions are out of the running app (no Node server on Pages).
- Recipe macros follow `docs/domain/recipe-nutrition.md`: USDA at write/CI time, never on page view.
- Katie’s Adventures stays the repo name; in-app chrome says **BodyPlan**.

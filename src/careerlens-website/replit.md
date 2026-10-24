# CareerLens

AI-powered career intelligence for students, graduates, working adults, and career switchers: understand confirmed skills, explore future roles, and plan practical reskilling steps.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/careerlens/` — CareerLens React/Vite application and reference-matched interface
- `artifacts/api-server/src/routes/career.ts` — profile, CV analysis, recommendations, roadmaps, scenarios, source metadata, and trend import routes
- `artifacts/api-server/src/lib/career-engine.ts` — synthetic profiles, role requirements, match scoring, SDG associations, dated signal snapshot, and learning links
- `lib/api-spec/openapi.yaml` — API contract; regenerate clients with the codegen command above
- `lib/db/src/schema/career.ts` and `trends.ts` — persisted profile/roadmap data and imported market-signal observations
- `artifacts/careerlens/src/index.css` — reference-aligned interface theme

## Architecture decisions

- Match scores remain evidence-based: 60% role-specific skill alignment, 25% stated-interest alignment, and 15% directional trend alignment. RunPod Qwen3-8B prioritizes suitable roles from the existing catalog and creates personalized roadmaps; model calls stay on the API server.
- CV text is extracted in the API server, sent to RunPod Qwen3-8B for structured extraction, and discarded after analysis; users review and confirm before recommendations use the profile.
- Guest/demo profiles are synthetic. CV profiles use unguessable IDs; profile and roadmap data persist in PostgreSQL and can be cleared in Settings.
- Trend observations are dated and source-attributed. The included WEF 2025 values are a static qualitative snapshot with CareerLens-relative indices—not live vacancy counts, forecasts, or hiring probabilities. Imported snapshots are stored and feed updated role scores.
- The UI follows the supplied Manus reference. Match scores describe fit only; they are never represented as a probability of getting hired.

## Product

CareerLens is being built for SDC Hackathon 2026. It includes profile intake and confirmation, personalized role matches and skill gaps, dated skill trends, saved learning roadmaps, future-scenario comparison with a hypothetical skill builder, career-to-SDG explanations, and data sources/methodology. Manual skill entry and synthetic profiles remain available if AI analysis is unavailable.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

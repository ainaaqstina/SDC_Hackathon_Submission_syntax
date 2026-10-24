# CareerLens website source bundle

This ZIP contains the CareerLens workspace source: web app, API server, shared packages, project configuration, and tests.

## What is not included

- Installed dependencies or generated build output
- Uploaded CVs, screenshots, or other user attachments
- Raw external dataset downloads or database contents
- Secret values, API keys, or private environment files

CareerLens data stored in PostgreSQL is not exported in this ZIP. Use an authorized database and the app's supported data import workflow to restore data.

## Requirements

- Node.js 24 and pnpm
- Python 3.11 (used by occupation matching)
- PostgreSQL
- The required provider credentials for any features you enable

## Setup

1. Install dependencies from the workspace root:

   ```sh
   pnpm install
   ```

2. Configure environment variables from `.env.example` using your environment's secrets manager. Do not commit real credentials.

3. Point `DATABASE_URL` to a PostgreSQL database and apply the schema:

   ```sh
   pnpm --filter @workspace/db run push
   ```

4. Start the API and web app in separate terminals:

   ```sh
   PORT=8080 pnpm --filter @workspace/api-server run dev
   ```

   ```sh
   PORT=5173 BASE_PATH=/ pnpm --filter @workspace/careerlens run dev
   ```

   The web client calls the API at the same-origin `/api` path. Outside Replit, configure a local reverse proxy to forward `/api` to the API server on port 8080. In Replit, the artifact routing configuration provides this routing.

## Environment variables

See `.env.example` for variable names only. RunPod credentials are needed for AI CV analysis and career explanations. Adzuna credentials are optional and only needed if you enable its live job-data integration with the required provider authorization. `CAREER_DATA_ADMIN_TOKEN` protects administrative data-import endpoints.

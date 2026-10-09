# Vercel Services deployment

The root `vercel.json` deploys STAT as one Vercel project with two services:

| Service | Root | Public paths |
| --- | --- | --- |
| `client` | `client/` | `/` and all frontend routes/assets not matched earlier |
| `server` | `server/` | `/api/*` and legacy `/uploads/*` |

The frontend's `fetch("/api/...")` calls are browser requests to the same origin and are routed by the public rewrite. There are **no server-to-server calls between the services**, so no internal `bindings` are configured. The `client/vite.config.ts` localhost proxy is used only by the local Vite dev server.

## Required environment variables

Set on the Vercel project before deployment:

- `DATABASE_URL`: managed PostgreSQL connection string (never localhost or development credentials).
- `SESSION_SECRET`: securely generated secret; never commit it.
- `CLIENT_ORIGIN`: deployed origin, e.g. `https://your-project.vercel.app` (no trailing slash).
- `NODE_ENV=production`.

Run `npx prisma migrate deploy` against the production database as a separate, controlled step before accepting registrations. Do **not** run the seed or development reset in production. The API build invokes `prisma generate`.

## Important: deployment blockers remain

- **Uploads are not production-ready.** `server/src/routes/uploads.ts` saves media using `multer.diskStorage` and `server/src/index.ts` serves it with `express.static`. Vercel Functions are not persistent media storage, and Express static serving is not supported there. The `/uploads/*` rewrite preserves URL routing but **does not fix uploading or serving files**. Replace this with object storage (e.g. Vercel Blob or S3), with the appropriate credentials and access policy, before inviting users.
- In-memory rate limits and typing indicators will not be reliable across distinct function instances. Move them to a shared store before public use.
- Email sending needs a real production provider and settings; inspect `server/src/lib/mail.ts`.
- Check Vercel Function request size limits for media uploads; the current API permits files up to 16MB. A direct-to-object-store upload flow may be necessary.
- A deployment and an end-to-end smoke test (register/login, media, messaging, nested frontend routes) have **not** yet been performed.

## Validate locally

At repo root run `vercel dev` with Vercel CLI, or continue using the two local development servers described in README. For individual builds, run `npm ci && npm run build` in both `client/` and `server/`, using a test `DATABASE_URL` for Prisma generation.

Before merging, confirm that service names remain `client` and `server`, and that the public routing table is correct. There are no internal service bindings in this version.

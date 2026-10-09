# Deploy STAT with Vercel Services

Deploy both services from the repository root using the Vercel **Services** framework preset.

| Service | Root | Public routes |
| --- | --- | --- |
| `client` | `client/` | Frontend pages and assets under `/` |
| `server` | `server/` | `/api/*`, legacy `/uploads/*` |

STAT's frontend sends same-origin browser requests to `/api/*`; it does not call the server as an internal Vercel service. **No service bindings are required.**

## Production configuration

Configure these Vercel environment variables:

- `DATABASE_URL` — managed PostgreSQL URL; production database, not localhost.
- `SESSION_SECRET` — long random string.
- `CLIENT_ORIGIN` — deployed URL, such as `https://your-site.vercel.app`.
- `NODE_ENV=production`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary project credentials; keep the API secret on the server only.
- `RESEND_API_KEY`, `MAIL_FROM` — Resend API credential and a verified sender address (requires a verified sending domain).

Configure Cloudinary upload restrictions appropriate to STAT's accepted media types and 16 MB size policy, plus abuse monitoring. The API signs upload parameters for authenticated users; media goes browser-to-Cloudinary rather than through Vercel's request body size limit. Cloudinary URLs are persisted as the existing `mediaUrl` fields. Legacy `/uploads/*` URLs from local development are not migrated; those files must be copied to cloud storage if they exist.

Provision the database and then run `npx prisma migrate deploy` from `server/` against production before enabling registrations, after reviewing migrations. **Do not run dev seed or reset against production.** `npm run build` invokes Prisma generation followed by TypeScript compilation.

For verification locally run `npm ci && npm run build` from each service directory with `DATABASE_URL` configured. Vercel Services can be exercised using `vercel dev` after linking the project.

## Outstanding verification before public launch

- Run the production build and the live deployment; test nested SPA routes, authentication, post/story/voice uploads, messaging, typing, rate limiting, and email verification.
- Configure a hosted PostgreSQL database and perform/verify migrations.
- Configure Cloudinary storage, media-type and filesize restrictions, and Resend's verified sending identity.
- Plan periodic pruning of expired `rate_limit_buckets` and `typing_indicators` rows.
- Verify error handling and abuse controls on public signed uploads. Upload signing checks client-declared MIME and size, which are not authoritative; enforce file limits at the storage provider too.
- Existing local media files will not persist on Vercel; migrate media if retaining old data.

Do not merge the pull request or invite public registrations until these checks succeed.

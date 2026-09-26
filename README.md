# stat.

Open-source social network: customizable profiles, discovery, posts, stories, friends, DMs, and notifications. MIT licensed.

The backend is a real Node/TypeScript REST API on PostgreSQL. The frontend is React + Vite. Nothing is mocked.

## Architecture

```
/client   React + TypeScript + Vite
/server   Express + TypeScript + Prisma + PostgreSQL
```

- Sessions live in the `sessions` table. The browser stores an httpOnly cookie (`stat_sid`), not a JWT in localStorage.
- Passwords are hashed with bcrypt (12 rounds). They are never stored in plaintext.
- Uploads land in `server/uploads` and are referenced by URL. Swap this folder for S3 later without changing the rest of the app.
- Discovery is deterministic: newest public accounts, paginated, excluding you and anyone in a block pair. No recommendation model.
- Messaging is HTTP for now. Conversations already have membership + `pairKey`, so a WebSocket layer can attach later without a schema rewrite.
- Notifications are a typed row (`follow`, `post_like`, `profile_like`, `favorite`, `comment`, `message`). Add a type, don't add a table.

## Requirements

- Node.js 20+
- PostgreSQL 16 (Docker or a local install)

## Setup

### 1. Database

Pick one:

**No Docker (Windows-friendly):** from `server/`, run `npm run db:local` and leave that terminal open. It starts a real PostgreSQL cluster in `server/data/pg`.

**Docker:**

```bash
docker compose up -d
```

**Already have Postgres:** create a database that matches `server/.env`, or point `DATABASE_URL` at any Postgres instance.

```sql
CREATE USER ick WITH PASSWORD 'ick_dev_password';
CREATE DATABASE ick OWNER ick;
```

### 2. Environment

```bash
copy server\.env.example server\.env
```

On macOS/Linux: `cp server/.env.example server/.env`

Change `SESSION_SECRET` before you ever deploy. Do not commit `.env`.

### 3. Install and migrate

```bash
cd server
npm install
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

The seed is **development only**. It only cleans leftover demo accounts. Create your own user from `/join`.

### 4. Run

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` and `/uploads` to the API on port 4000.

## API shape

Responses are JSON. Errors look like:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "You need to be signed in." } }
```

Useful routes:

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | create account + session |
| POST | `/api/auth/login` | username or email |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | current user |
| POST | `/api/users/:id/friend` | send or accept a friend request |
| GET | `/api/users/me/friends` | friends list |
| GET | `/api/discover` | paginated profile stack |
| GET | `/api/users/search?q=` | username / display name |
| GET | `/api/users/:username` | public profile |
| PATCH | `/api/users/me/profile` | own profile only |
| PATCH | `/api/users/me/account` | username, email, privacy |
| POST/DELETE | `/api/users/:id/follow` | |
| POST/DELETE | `/api/users/:id/favorite` | private save |
| POST/DELETE | `/api/users/:id/like` | profile like |
| POST | `/api/posts` | image + caption (`type` can be `video` later) |
| POST | `/api/stories` | expires in 24h |
| GET/POST | `/api/conversations` | start or list DMs |
| GET | `/api/notifications` | |
| POST | `/api/users/:id/block` | also drops follows both ways |
| POST | `/api/reports` | |

Auth, writes, search, and messages are rate-limited.

## Profile customization

A profile stores:

- avatar, banner, bio, links
- `theme`: `default` | `compact` | `stacked`
- `layout`: `classic` | `wide` | `zine`
- `accentColor`
- `layoutConfig` JSON (`order`, `showStats`, `bannerStyle`) so more options can land without another migration

## Safety

- Ownership is checked on every mutation (your post, your story, your account).
- Blocks hide people from search, discover, profiles, and DMs.
- Private profiles stay out of discover; posts are followers-only.
- Account delete cascades through the relational graph.

## Production notes

- Use a managed Postgres. Run `npx prisma migrate deploy`.
- Set `NODE_ENV=production`, a long `SESSION_SECRET`, and a real `CLIENT_ORIGIN`.
- Put uploads on object storage.
- Do not run the seed against production.

## Project layout

```
server/src/index.ts          HTTP entry
server/src/routes/           one file per area
server/src/middleware/       session, rate limits, errors
server/prisma/schema.prisma  source of truth for the database
client/src/pages/            screens
client/src/api/client.ts     fetch wrapper
```

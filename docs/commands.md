# Commands

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm db:local        # start local embedded postgres (dev only)
pnpm setup           # validate env, migrate, seed defaults
pnpm create:admin you@example.com "Your Name" "a-strong-password"
pnpm dev             # start Next.js + worker concurrently
```

Open `http://localhost:3000`.

`pnpm setup` is the guided bootstrap for everything except the admin account —
it runs `db:migrate` + `db:seed`. Safe to re-run.

Creating the first admin is a deliberate, separate step (`pnpm create:admin`)
rather than automatic — that way you get immediate success/failure feedback
right in your terminal, instead of it happening silently inside a detached
background process (e.g. Docker's `migrate` service) where a failure could
easily go unnoticed.

To create or promote an account:

```bash
# Create a brand-new admin with a password — signs in immediately, no SMTP needed
pnpm create:admin you@example.com "Your Name" "a-strong-password"

# Create a magic-link-only admin (no password — requires SMTP to sign in)
pnpm create:admin you@example.com "Your Name"

# Promote an account that already signed in via magic link / Google
pnpm make:admin you@example.com
```

---

## Development

```bash
pnpm dev             # Next.js (turbopack) + pg-boss worker (concurrently)
pnpm dev:next        # Next.js only
pnpm worker          # pg-boss worker only (watch mode)
pnpm typecheck       # TypeScript type check
pnpm test            # run the Vitest suite once
pnpm test:watch      # re-run tests as you edit
pnpm lint            # biome lint check
pnpm lint:fix        # biome lint + auto-fix
pnpm format          # biome format
```

---

## Database

```bash
pnpm db:local        # start embedded postgres for local dev
pnpm db:generate     # generate migration from schema changes
pnpm db:migrate      # apply pending migrations
pnpm db:seed         # seed default ticket statuses & categories (idempotent)
pnpm db:push         # push schema directly (dev only — skips migration file)
pnpm db:reset        # drop all tables + re-migrate (destroys all data)
```

---

## Docker

The default file downloads a prebuilt image from GitHub Packages and includes
PostgreSQL. No `git clone` needed:

```bash
docker compose up -d           # start app + worker + postgres
docker compose pull            # get the newest image
docker compose down            # stop. Your data stays in the volumes.
docker compose logs -f app     # watch the app
docker compose logs -f worker  # watch the worker (this is what sends email)

IMAGE_TAG=1.0.0 docker compose up -d   # pin a version instead of latest
HOST_PORT=8080 docker compose up -d    # if port 3000 is taken. Never PORT.
```

Your own database instead, same commands plus `-f docker-compose.external-db.yml`:

```bash
docker compose -f docker-compose.external-db.yml up -d
docker compose -f docker-compose.external-db.yml down
docker compose -f docker-compose.external-db.yml logs -f app
```

Building from your local source, which you only need if you changed the code or
want the optional Pusher features:

```bash
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml up -d
```

There is one image for all three roles (app, worker, migrate) — they differ only by the
command each service runs, so there's nothing to build separately:

```bash
docker build -t docket:local .                     # build it by hand
docker run --rm docket:local pnpm worker:start     # run just the worker
```

Check a running instance:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","database":"ok","version":"1.0.0"}   → 503 if the DB is unreachable
```

---

## Migrating from Zammad

Two one-off, idempotent scripts (safe to re-run — already-migrated data is skipped,
never duplicated). Run `migrate:zammad:users` **first**, then `migrate:zammad` —
that order lets the ticket migration link each reply's author directly (by email)
as it writes it, instead of relying on a slower name-matching backfill afterward.
Each script's own header comment has the full details.

```bash
# 1) Agent/admin accounts — creates a Docket user (as a plain agent) for
#    every Zammad Agent/Admin, all sharing one default password.
#    See scripts/migrate-zammad-users.ts.
ZAMMAD_BASE_URL=... ZAMMAD_API_TOKEN=... pnpm migrate:zammad:users

# 2) Tickets, comments, attachments, tags — see scripts/migrate-zammad.ts.
#    Links each reply's author_id/uploaded_by_id AND the ticket's assignee
#    (Zammad's owner) to the user created in step 1, matched by email.
ZAMMAD_BASE_URL=... ZAMMAD_API_TOKEN=... pnpm migrate:zammad
```

Ran it in the other order, or migrated tickets before any users existed? Re-run
`migrate:zammad:users` afterward — it always re-sweeps already-migrated data and
connects what's still unlinked: comments/attachments by author name, and the
**assignee** of every still-unassigned migrated ticket from its recorded Zammad
owner (re-read from Zammad for tickets imported before that was stored). This is
the fix if migrated tickets show up as **Unassigned** in the tickets list.

Both accept `MIGRATION_DRY_RUN=1` to preview without writing.

`MIGRATION_USER_PASSWORD` is **required** for the user migration, with no default.
Every account the script creates shares it until each person changes it, so it has to
be something you generate rather than something published in a repository:

```bash
MIGRATION_USER_PASSWORD="$(openssl rand -base64 24)" \
ZAMMAD_BASE_URL=... ZAMMAD_API_TOKEN=... pnpm migrate:zammad:users
```

Tell the team to change it after their first sign-in.

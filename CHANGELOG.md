# Changelog

Notable changes to Docket. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Docket is below 1.0.0, so a minor version bump can still contain a breaking change.
Anything needing manual work on upgrade is called out under **Upgrade notes**.

## [Unreleased]

## [0.4.0] - 2026-08-20

### Added

- Zammad migration: a **sync mode** (`pnpm migrate:zammad:sync`, or
  `MIGRATION_SYNC=1`). A plain re-run of `migrate:zammad` only ever imported
  tickets that didn't exist yet and skipped already-imported ones whole, so
  anything that changed in Zammad afterwards — a ticket being closed, new
  replies, priority/assignee/subject/tag edits, files added to a thread —
  never arrived. Sync mode re-reads those tickets and updates them in place,
  appending only the articles it hasn't copied before. It is additive: nothing
  in Docket is deleted, and work done by agents inside Docket survives.
  See `docs/deployment-and-zammad-migration.md` §7.4.
- A per-agent **"Show SLA & Overdue" preference** on the Settings page. Off,
  the ticket list's SLA column collapses to just the waiting-time badge
  instead of the full SLA/overdue badges. Stored in
  `user_ticket_table_prefs.show_sla_and_overdue`.
- **Queue tabs** ("Awaiting Our Reply" / "All Open Tickets" / "All Tickets")
  and a **quick date-range filter** ("Today" / "7d" / "30d" / "90d" / "All
  time") above the ticket list, both writing the same `view`/`range` query
  params the Filters popover already used.

### Changed

- Ticket detail URLs now use the ticket number instead of the internal id
  (`/tickets/{ticketNumber}` instead of `/tickets/{id}`) — the internal id is
  no longer exposed in the URL. Old links using the internal id no longer
  resolve.

## [0.3.1] - 2026-08-19

### Added

- A new personal **Settings** page (`/settings`, agents/admins only) for
  per-agent preferences, starting with a **"Send reply on Enter"** toggle for
  the ticket reply composer. On (the default, matching prior behavior) Enter
  sends the reply and Shift+Enter inserts a newline; off, Enter always
  inserts a newline and only the Send button submits. Stored per agent in
  `user_ticket_table_prefs.send_reply_on_enter`.

## [0.3.0] - 2026-08-18

### Changed

- Replaced Radix UI/shadcn with Headless UI + daisyUI across every
  `components/ui/*` primitive and their call sites. daisyUI component classes
  now carry appearance (`btn`, `badge`, `card`, `modal-box`, `menu`, `input`,
  `table`, …) while Headless UI supplies behavior only (focus trap, roving
  tabindex, typeahead, ARIA) for `Dialog`, `Menu`, and `Listbox`. `Popover`
  and `Tooltip` are built on `@floating-ui/react` instead. Radix UI and
  shadcn are fully removed from the project.

## [0.2.0] - 2026-08-07

### Added

- SMTP, Google OAuth, Pusher (Beams + Channels) and file storage (S3/R2) can
  now be configured at runtime from **Admin → Integrations**, not just
  `.env`. A value saved there overrides the matching env var; an install that
  only ever used `.env` sees no change in behavior.

### Changed

- Finished the rename to Docket: the Postgres database and Docker volumes
  (`support_tool` → `docket`, `support_tool_pgdata` → `docket_pgdata`,
  `support_tool_uploads` → `docket_uploads`) and the `X-Support-Tool-*`
  webhook header aliases are gone. `X-Docket-*` headers are unaffected.
- New brand mark: favicons, PWA icons and the in-app logo are regenerated
  from the new navy-and-off-white logo.

### Fixed

- The `ghcr.io/stack256org/docket` package was private, so every
  `docker pull` in the README failed with 403 for anyone not signed in to
  GHCR. The release workflow now verifies anonymous pullability and fails
  the run if a customer couldn't actually pull what was just published. The
  README's version/tag references are also now generated from
  `package.json` instead of hand-written, so they can't drift again.

#### Upgrade notes

- No manual steps. Existing `.env`-based SMTP/OAuth/Pusher/storage
  configuration keeps working unchanged; Integrations settings are optional.

## [0.1.0] - 2026-07-31

First public release.

Docket is self-hosted customer support software. Customers send a request without
creating an account and follow it through a private link sent by email. Your team
answers from a shared queue with private notes, reply targets, assignment and saved
replies. Everything lives in your own PostgreSQL database.

### What is in it

- **Customer side.** A form and an emailed private link. No account, no password. Rich
  text and attachments up to 10 MB, five per request. Customers can see their own
  history, reply, and close a request themselves.
- **Team side.** A queue with search, filtering, sorting and bulk actions. Private notes
  in the conversation that the customer never receives. Saved replies, assignment, and
  stages, priorities, categories and tags you name yourself.
- **Reply targets** per priority, whose clock pauses while you are waiting on the
  customer.
- **Admin.** User management and roles, editable stages and categories, email templates,
  API keys, an audit log, six colour presets with light and dark modes, and a first-run
  setup wizard.
- **Reports** covering per-agent volume and response times, with breakdowns by category,
  priority and tag, and a spreadsheet export.
- **Public REST API** at `/api/v1`, with hashed bearer keys, an OpenAPI 3.1 description,
  a Postman collection and a browsable reference. Enough to build both a "send a request"
  and a "my requests" page on your own site.
- **Outgoing webhooks** on ticket events, signed with HMAC-SHA256, retried with backoff,
  with delivery history and one-click redelivery.
- **Durable email** through a background worker, so a failing mail provider is retried
  rather than dropping the message.
- **Attachments** on local disk, S3 or Cloudflare R2, chosen with one setting.
- **Zammad importer** for requests, people, replies and attachments. Safe to re-run.

### Running it

- Prebuilt images for `linux/amd64` and `linux/arm64`, published to GitHub Packages as
  `ghcr.io/stack256org/docket`, rebuilt on every change and tagged on every release.
- Three Compose files: prebuilt image with PostgreSQL included, build-from-source, or
  bring your own database.
- `GET /api/health` reports database reachability and the running version, and is wired
  in as the container's own health check.
- The container runs as an unprivileged user.
- Data lives on two named Docker volumes that survive `down`, `pull`, `build` and
  `up -d`. Only `down -v` removes them.

### Known deprecations

- Every webhook delivery carries both the current `X-Docket-Event`, `-Delivery`,
  `-Timestamp` and `-Signature` headers **and** the older `X-Support-Tool-*` names with
  identical values. The old names date from before the product was renamed and are sent
  only so existing endpoints keep working. Read the `X-Docket-*` set. The aliases will be
  removed in a later release, which will be a breaking change.
- API keys issued before the rename start `stk_live_`; new ones start `dk_live_`. Old
  keys stay valid, because verification matches a hash of the whole secret and never the
  prefix.

### Known gaps

Replying by email, satisfaction ratings after a request is closed, a spreadsheet export
of the request list itself, one-click deploy buttons, and attachments and webhooks in the
public API. See the Roadmap in the README.

[Unreleased]: https://github.com/stack256org/docket/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/stack256org/docket/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/stack256org/docket/releases/tag/v0.1.0

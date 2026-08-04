# Changelog

Notable changes to Docket. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Docket is below 1.0.0, so a minor version bump can still contain a breaking change.
Anything needing manual work on upgrade is called out under **Upgrade notes**.

## [Unreleased]

Nothing yet.

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

[Unreleased]: https://github.com/stack256org/docket/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/stack256org/docket/releases/tag/v0.1.0

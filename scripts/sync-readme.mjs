#!/usr/bin/env node
/**
 * Keeps every part of README.md that names a version in step with the single
 * source of truth: the `version` field in package.json.
 *
 * WHY THIS EXISTS: the README advertised a `1` / `1.4` / `1.4.2` tag ladder and
 * `IMAGE_TAG=1.0.0` while the only published release was 0.1.0. Nothing was
 * wrong with the release pipeline — the prose was simply written by hand once
 * and then never revisited, so it drifted the moment the first real version
 * shipped. A customer copying those lines gets "manifest unknown", which reads
 * like a broken registry rather than a stale sentence.
 *
 * WHY package.json RATHER THAN THE REGISTRY OR THE LATEST GIT TAG: release.yml
 * derives the published image tags from this exact field, so generating the
 * prose from it means the README and the images can only ever describe the same
 * version. Asking the registry instead would make the check network-dependent
 * and would fail on a fork that has published nothing; asking for the newest git
 * tag would be a release behind during the commit that bumps the version, which
 * is precisely the commit that has to be right.
 *
 * WHY A CHECK IN CI RATHER THAN A BOT COMMIT: the version bump and the README
 * land in the same commit, so by the time release.yml publishes anything the
 * prose is already correct. A workflow that pushed a fixup commit afterwards
 * would leave a window where main advertised a version that did not exist yet,
 * and would add a bot commit to every release for no gain.
 *
 *   node scripts/sync-readme.mjs           # rewrite the generated blocks
 *   node scripts/sync-readme.mjs --check   # exit 1 if they are out of date (CI)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = join(root, "README.md");

// Lowercase, and matching release.yml's `images:` — registries reject capitals,
// and that workflow lowercases github.repository for the same reason.
const IMAGE = "ghcr.io/stack256org/docket";

const { version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
);

// The same shape release.yml enforces before it will tag anything. Checking it
// here too means a malformed version is caught by a lint-speed local command
// rather than after CI has run the full build.
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`package.json version '${version}' is not X.Y.Z`);
  process.exit(1);
}

const major = version.split(".")[0];
const minor = version.split(".").slice(0, 2).join(".");

/**
 * One entry per generated region. The key is the name in the marker comment;
 * the value is the exact text that belongs between the markers.
 *
 * Keep the prose here rather than in README.md — the file is generated from
 * this, so editing the README between the markers is what gets overwritten.
 */
const blocks = {
  // The tag ladder and the pinned-version example. `latest`, `main` and
  // `sha-<short>` are fixed names, but the ladder is entirely version-derived,
  // which is what drifted.
  "image-tags": `Pin a version in production, because \`latest\` moves with every release:

\`\`\`bash
IMAGE_TAG=${version} docker compose up -d
\`\`\`

Available tags are \`latest\`, the \`${major}\` / \`${minor}\` / \`${version}\` ladder, \`main\` (rebuilt on
every change, expect rough edges), and a fixed \`sha-<short>\` per build. Each carries builds
for both Intel and ARM machines:

\`\`\`bash
docker pull ${IMAGE}:${version}
\`\`\``,
};

const original = readFileSync(readmePath, "utf8");
let updated = original;

for (const [name, body] of Object.entries(blocks)) {
  const begin = `<!-- BEGIN GENERATED: ${name} -->`;
  const end = `<!-- END GENERATED: ${name} -->`;

  // A missing marker means someone deleted it while editing the prose around
  // it. Failing loudly beats silently generating nothing and reporting success,
  // which would let the drift this script exists to prevent come straight back.
  if (!original.includes(begin) || !original.includes(end)) {
    console.error(`README.md is missing the ${begin} / ${end} markers.`);
    process.exit(1);
  }

  // Non-greedy, and anchored on the literal markers, so a second generated
  // block later in the file cannot be swallowed by this one's replacement.
  const region = new RegExp(
    `${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`
  );
  updated = updated.replace(region, `${begin}\n${body}\n${end}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const checkOnly = process.argv.includes("--check");

if (updated === original) {
  console.log(`README.md is in step with package.json (${version}).`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `::error file=README.md::README.md is out of date for version ${version}. Run 'pnpm docs:sync' and commit the result.`
  );
  process.exit(1);
}

writeFileSync(readmePath, updated);
console.log(`README.md updated for version ${version}.`);

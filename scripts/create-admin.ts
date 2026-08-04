import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

async function main() {
  const email = process.argv[2];
  const name = process.argv[3];
  const password = process.argv[4];

  if (!email || !name) {
    console.error("Usage: pnpm create:admin <email> <name> [password]");
    console.error(
      'Example: pnpm create:admin admin@example.com "Jane Smith" "a-strong-password"'
    );
    console.error(
      "Omitting the password creates a magic-link-only admin (requires SMTP to be configured to sign in)."
    );
    process.exit(1);
  }

  const { createAdminUser } = await import("@/lib/bootstrap-admin");
  const created = await createAdminUser({ email, name, password });

  console.log(`Created admin: ${created.name} <${created.email}>`);
  console.log(
    created.hasPassword
      ? "They can sign in at /login with their email and password."
      : "They can sign in at /login using a magic link."
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

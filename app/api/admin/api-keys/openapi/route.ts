import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/authz";
import { env } from "@/lib/env";
import { buildOpenApiSpec } from "@/lib/openapi-spec";

// GET /api/admin/api-keys/openapi — downloads the OpenAPI 3.1 spec for the
// public API (app/api/v1/*), pre-filled with this instance's own base URL.
// This is the canonical machine-readable contract: the Scalar reference at
// /admin/api-keys/docs renders it, and Postman (File → Import) and most
// other API tooling accept it directly. No secrets in the file.
export async function GET(request: NextRequest) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  return NextResponse.json(buildOpenApiSpec(env.NEXT_PUBLIC_APP_URL), {
    headers: {
      "Content-Disposition": 'attachment; filename="docket-api.openapi.json"',
    },
  });
}

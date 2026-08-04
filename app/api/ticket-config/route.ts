import { NextResponse } from "next/server";
import {
  getDefaultStatus,
  getTicketCategories,
  getTicketStatuses,
} from "@/lib/ticket-config";

// GET — no auth required (used by customer ticket creation form)
export async function GET() {
  const [statuses, categories, defaultStatus] = await Promise.all([
    getTicketStatuses(),
    getTicketCategories(),
    getDefaultStatus(),
  ]);

  return NextResponse.json({
    statuses,
    categories,
    defaultStatus: defaultStatus?.slug ?? null,
  });
}

import { eq } from "drizzle-orm";
import { userTicketTablePrefs } from "@/db/schema/user-preferences";
import { db } from "@/lib/db";
import {
  type ColumnPref,
  resolveColumnPrefs,
} from "@/lib/tickets-table-columns";

export async function getTicketTableColumnPrefs(
  userId: string
): Promise<ColumnPref[]> {
  const [row] = await db
    .select({ columns: userTicketTablePrefs.columns })
    .from(userTicketTablePrefs)
    .where(eq(userTicketTablePrefs.userId, userId))
    .limit(1);
  return resolveColumnPrefs(row?.columns);
}

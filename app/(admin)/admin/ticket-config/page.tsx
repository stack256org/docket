// import { getSlaPolicies } from "@/lib/sla-policies";
import {
  getTicketCategories,
  getTicketPriorities,
  getTicketStatuses,
} from "@/lib/ticket-config";
import { CategoriesManager } from "./_components/categories-manager";
import { PrioritiesManager } from "./_components/priorities-manager";
// import { SlaPoliciesManager } from "./_components/sla-policies-manager";
import { StatusesManager } from "./_components/statuses-manager";

export const metadata = { title: "Ticket Config" };

// SLA is hidden for now (see docs/tickets.md § SLA) — the fetch and the
// <SlaPoliciesManager> render below are commented out, not deleted, so the
// feature can be restored by uncommenting.
export default async function TicketConfigPage() {
  const [statuses, categories, priorities /* , slaPolicies */] =
    await Promise.all([
      getTicketStatuses(),
      getTicketCategories(),
      getTicketPriorities(),
      // getSlaPolicies(),
    ]);

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <StatusesManager initialStatuses={statuses} />
      <CategoriesManager initialCategories={categories} />
      <PrioritiesManager initialPriorities={priorities} />
      {/* <SlaPoliciesManager
        categories={categories}
        initialPolicies={slaPolicies}
        priorities={priorities}
      /> */}
    </div>
  );
}

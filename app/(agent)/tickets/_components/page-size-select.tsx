"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/common/searchable-select";
import { PAGE_SIZE_OPTIONS } from "./page-size-options";

// Plain numbers — the "per page" context comes from the label next to the
// select, so a "/ page" suffix on every option would just repeat it.
const OPTIONS = PAGE_SIZE_OPTIONS.map((n) => ({
  value: String(n),
  label: String(n),
}));

export function PageSizeSelect({ pageSize }: { pageSize: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", value);
    params.delete("page"); // reset pagination when the page size changes
    router.push(`/tickets?${params.toString()}`);
  }

  return (
    <SearchableSelect
      onValueChange={handleChange}
      options={OPTIONS}
      search={false}
      triggerClassName="h-8 w-20 text-xs"
      value={String(pageSize)}
    />
  );
}

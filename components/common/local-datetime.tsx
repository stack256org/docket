"use client";

import * as React from "react";

// Renders a timestamp in the VIEWER'S browser timezone. Use this instead of
// formatting dates inside server components — those format with the server's
// timezone (e.g. a US server showing US times to a customer in India).
//
// Hydration-safe by construction: the server render and the client's first
// (hydration) render both format in UTC — identical output, no mismatch —
// then an effect re-renders with the browser's real timezone. The one-frame
// UTC flash is invisible in practice and beats a hydration error or an empty
// cell. The <time dateTime> attribute always carries the exact ISO instant.

interface Props {
  className?: string;
  date: Date | string | null | undefined;
  /** Rendered when date is null/undefined (e.g. "Never"). */
  fallback?: string;
  /** "date" → "Jul 11, 2026" · "datetime" → "Jul 11, 2026, 7:30 PM" */
  mode?: "date" | "datetime";
}

const OPTIONS: Record<
  NonNullable<Props["mode"]>,
  Intl.DateTimeFormatOptions
> = {
  date: { month: "short", day: "numeric", year: "numeric" },
  datetime: {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
};

export function LocalDateTime({
  date,
  mode = "datetime",
  fallback = "—",
  className,
}: Props) {
  const [inBrowser, setInBrowser] = React.useState(false);
  React.useEffect(() => setInBrowser(true), []);

  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  const value = typeof date === "string" ? new Date(date) : date;
  const label = value.toLocaleString("en-US", {
    ...OPTIONS[mode],
    // Deterministic UTC until mounted, then the browser's own timezone.
    ...(inBrowser ? {} : { timeZone: "UTC" }),
  });

  return (
    <time className={className} dateTime={value.toISOString()}>
      {label}
    </time>
  );
}

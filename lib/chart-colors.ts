/** Validated 8-slot categorical palette (see `app/globals.css` --chart-1..8),
 * ordered for CVD-safe adjacency in both light and dark. A 9th+ series folds
 * into the neutral overflow color rather than generating a new hue. */
const CHART_SLOTS = 8;

export function categoricalChartColor(index: number): string {
  return index < CHART_SLOTS
    ? `var(--chart-${index + 1})`
    : "var(--chart-other)";
}

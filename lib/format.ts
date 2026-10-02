export function formatPrice(v: number | null): string {
  if (v === null) return "—";
  if (v >= 10) return `$${trimZeros(v.toFixed(v >= 100 ? 0 : 1))}`;
  if (v >= 1) return `$${trimZeros(v.toFixed(2))}`;
  return `$${v.toFixed(2)}`;
}

/** Axis tick label: `$0.10`, `$1`, `$20`. */
export function formatPriceTick(v: number): string {
  if (v >= 1) return `$${Number(v.toPrecision(3))}`;
  return `$${v.toFixed(2)}`;
}

export function formatContext(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1_000_000) return `${trimZeros((v / 1_000_000).toFixed(2))}M`;
  return `${trimZeros((v / 1000).toFixed(1))}K`;
}

export function formatInt(v: number): string {
  return v.toLocaleString("en-US");
}

export function formatCompact(v: number): string {
  if (v >= 1_000_000) return `${trimZeros((v / 1_000_000).toFixed(2))}M`;
  if (v >= 10_000) return `${trimZeros((v / 1000).toFixed(1))}K`;
  return formatInt(v);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

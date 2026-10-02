import { blendedPrice, isOpenLicense, type PriceMetric, type ScoreMetric } from "./pareto";
import type { Model } from "./types";

export type Range = [number, number];
export type LicenseFilter = "all" | "proprietary" | "open";
export type LabelMode = "frontier" | "all" | "none";

/** Numeric dimensions that can be narrowed with a range slider. */
export const RANGE_KEYS = ["score", "blended", "input", "output", "context", "votes"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export interface ViewState {
  query: string;
  license: LicenseFilter;
  /** Organizations hidden by the user; new organizations stay visible by default. */
  hiddenOrgs: string[];
  /** Narrowed ranges only; a missing key means the full data extent. */
  ranges: Partial<Record<RangeKey, Range>>;
  priceMetric: PriceMetric;
  scoreMetric: ScoreMetric;
  labels: LabelMode;
  showCi: boolean;
}

export const DEFAULT_VIEW: ViewState = {
  query: "",
  license: "all",
  hiddenOrgs: [],
  ranges: {},
  priceMetric: "blended",
  scoreMetric: "score",
  labels: "frontier",
  showCi: false,
};

export function rangeValue(m: Model, key: RangeKey): number | null {
  switch (key) {
    case "score":
      return m.score;
    case "blended":
      return blendedPrice(m);
    case "input":
      return m.inputPrice;
    case "output":
      return m.outputPrice;
    case "context":
      return m.context;
    case "votes":
      return m.votes;
  }
}

/** Min/max of every range dimension over `models`, ignoring missing values. */
export function computeExtents(models: Model[]): Record<RangeKey, Range> {
  const out = {} as Record<RangeKey, Range>;
  for (const key of RANGE_KEYS) {
    const values = models.map((m) => rangeValue(m, key)).filter((v): v is number => v !== null);
    out[key] = values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
  }
  return out;
}

/**
 * Applies every filter except organizations (used for per-org counts) when
 * `ignoreOrgs` is set. Models lacking a value for a narrowed range are dropped.
 */
export function applyFilters(models: Model[], view: ViewState, ignoreOrgs = false): Model[] {
  const q = view.query.trim().toLowerCase();
  const hidden = new Set(view.hiddenOrgs);
  return models.filter((m) => {
    if (q && !m.name.toLowerCase().includes(q) && !m.org.toLowerCase().includes(q)) return false;
    if (view.license === "open" && !isOpenLicense(m.license)) return false;
    if (view.license === "proprietary" && isOpenLicense(m.license)) return false;
    if (!ignoreOrgs && hidden.has(m.org)) return false;
    for (const key of RANGE_KEYS) {
      const range = view.ranges[key];
      if (!range) continue;
      const v = rangeValue(m, key);
      if (v === null || v < range[0] - 1e-9 || v > range[1] + 1e-9) return false;
    }
    return true;
  });
}

export function activeFilterCount(view: ViewState): number {
  return (
    (view.query.trim() ? 1 : 0) +
    (view.license !== "all" ? 1 : 0) +
    (view.hiddenOrgs.length ? 1 : 0) +
    Object.keys(view.ranges).length
  );
}

/* ---------- URL serialization ---------- */

const RANGE_PARAM: Record<RangeKey, string> = {
  score: "score",
  blended: "price",
  input: "in",
  output: "out",
  context: "ctx",
  votes: "votes",
};

export function viewToSearch(view: ViewState): string {
  const p = new URLSearchParams();
  if (view.query.trim()) p.set("q", view.query.trim());
  if (view.license !== "all") p.set("license", view.license);
  if (view.hiddenOrgs.length) p.set("hide", view.hiddenOrgs.join(","));
  for (const key of RANGE_KEYS) {
    const r = view.ranges[key];
    if (r) p.set(RANGE_PARAM[key], `${+r[0].toPrecision(6)}~${+r[1].toPrecision(6)}`);
  }
  if (view.priceMetric !== "blended") p.set("x", view.priceMetric);
  if (view.scoreMetric !== "score") p.set("y", view.scoreMetric);
  if (view.labels !== "frontier") p.set("labels", view.labels);
  if (view.showCi) p.set("ci", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function searchToView(search: string): ViewState {
  const p = new URLSearchParams(search);
  const ranges: ViewState["ranges"] = {};
  for (const key of RANGE_KEYS) {
    const raw = p.get(RANGE_PARAM[key]);
    const parts = raw?.split("~").map(Number);
    if (parts?.length === 2 && parts.every(Number.isFinite) && parts[0] <= parts[1]) ranges[key] = [parts[0], parts[1]];
  }
  const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  return {
    query: p.get("q") ?? "",
    license: pick(p.get("license"), ["all", "proprietary", "open"], "all"),
    hiddenOrgs: p.get("hide")?.split(",").filter(Boolean) ?? [],
    ranges,
    priceMetric: pick(p.get("x"), ["blended", "input", "output"], "blended"),
    scoreMetric: pick(p.get("y"), ["score", "lower"], "score"),
    labels: pick(p.get("labels"), ["frontier", "all", "none"], "frontier"),
    showCi: p.get("ci") === "1",
  };
}

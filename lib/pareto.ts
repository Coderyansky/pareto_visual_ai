import type { Model } from "./types";

export type PriceMetric = "blended" | "input" | "output";
export type ScoreMetric = "score" | "lower";

/** Arena's blended price: input and output weighted 1:3 (3 output tokens per input token). */
export function blendedPrice(m: Pick<Model, "inputPrice" | "outputPrice">): number | null {
  if (m.inputPrice === null || m.outputPrice === null) return null;
  return (m.inputPrice + 3 * m.outputPrice) / 4;
}

export function priceOf(m: Model, metric: PriceMetric): number | null {
  if (metric === "input") return m.inputPrice;
  if (metric === "output") return m.outputPrice;
  return blendedPrice(m);
}

export function scoreOf(m: Model, metric: ScoreMetric): number {
  return metric === "lower" ? m.scoreLower : m.score;
}

/**
 * Returns the Pareto-optimal models ordered from cheapest to most expensive.
 *
 * A model is optimal when no other model is at most as expensive and scores
 * strictly higher. Models are swept by ascending price (ties broken by higher
 * score first); a model joins the frontier only if it beats every cheaper one.
 * Only models with a positive price for `priceMetric` are considered.
 */
export function paretoFrontier(models: Model[], priceMetric: PriceMetric, scoreMetric: ScoreMetric): Model[] {
  const priced = models
    .map((m) => ({ m, price: priceOf(m, priceMetric), score: scoreOf(m, scoreMetric) }))
    .filter((p): p is { m: Model; price: number; score: number } => p.price !== null && p.price > 0)
    .sort((a, b) => a.price - b.price || b.score - a.score);

  const frontier: Model[] = [];
  let best = -Infinity;
  for (const p of priced) {
    if (p.score > best) {
      frontier.push(p.m);
      best = p.score;
    }
  }
  return frontier;
}

export const isOpenLicense = (license: string) => license !== "Proprietary";

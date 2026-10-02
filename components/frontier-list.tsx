"use client";

import clsx from "clsx";
import { formatPrice } from "@/lib/format";
import { OrgMark } from "@/lib/orgs";
import { priceOf, scoreOf, type PriceMetric, type ScoreMetric } from "@/lib/pareto";
import type { Model } from "@/lib/types";

/**
 * Pareto-optimal models from the best score down, with the marginal trade-off
 * between neighbours: how many score points the next pricier step buys and at
 * what price multiple.
 */
export function FrontierList({
  frontier,
  priceMetric,
  scoreMetric,
  activeKey,
  onHover,
  onPin,
}: {
  frontier: Model[];
  priceMetric: PriceMetric;
  scoreMetric: ScoreMetric;
  activeKey: string | null;
  onHover: (key: string | null) => void;
  onPin: (key: string) => void;
}) {
  const rows = [...frontier].reverse();
  if (!rows.length) return <p className="py-6 text-[13px] text-muted-foreground">No models on the frontier for these filters.</p>;

  return (
    <ol className="relative">
      <span aria-hidden className="absolute top-5 bottom-5 left-[17px] w-px bg-black/[0.08]" />
      {rows.map((m, i) => {
        const cheaper = rows[i + 1];
        const price = priceOf(m, priceMetric)!;
        const score = scoreOf(m, scoreMetric);
        const gain = cheaper ? score - scoreOf(cheaper, scoreMetric) : null;
        const mult = cheaper ? price / priceOf(cheaper, priceMetric)! : null;
        const active = m.key === activeKey;
        return (
          <li key={m.key}>
            <button
              type="button"
              onMouseEnter={() => onHover(m.key)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onPin(m.key)}
              className={clsx(
                "relative flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left transition-colors duration-150",
                active ? "bg-black/[0.04]" : "hover:bg-black/[0.025]",
              )}
            >
              <span
                className={clsx(
                  "relative z-10 flex size-[34px] shrink-0 items-center justify-center rounded-[10px] ring-1 ring-inset transition-colors",
                  active ? "bg-foreground text-white ring-foreground" : "bg-white text-foreground ring-black/[0.12]",
                )}
              >
                <OrgMark org={m.org} size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12.5px] font-semibold text-foreground">{m.name}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">
                  {m.org} · {m.license}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[15px] leading-tight font-semibold tracking-[-0.02em] text-foreground tabular-nums">
                  {Math.round(score)}
                </span>
                <span className="block font-mono text-[11px] text-muted-foreground tabular-nums">{formatPrice(price)}/M</span>
              </span>
            </button>
            {gain !== null && mult !== null && (
              <div className="py-0.5 pl-[50px] font-mono text-[10.5px] text-muted-foreground/80 tabular-nums">
                +{gain.toFixed(0)} pts for {mult >= 10 ? mult.toFixed(0) : mult.toFixed(1)}× the price
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

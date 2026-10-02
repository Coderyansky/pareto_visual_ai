"use client";

import clsx from "clsx";
import { SlidersHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activeFilterCount,
  applyFilters,
  computeExtents,
  DEFAULT_VIEW,
  searchToView,
  viewToSearch,
  type ViewState,
} from "@/lib/filters";
import { formatInt, formatPrice } from "@/lib/format";
import { paretoFrontier, priceOf } from "@/lib/pareto";
import type { Category, Leaderboard } from "@/lib/types";
import { CategoryNav, FilterPanel } from "./filter-panel";
import { FrontierList } from "./frontier-list";
import { ModelTable } from "./model-table";
import { ParetoChart } from "./pareto-chart";
import { PreviousSnapshotContext } from "./rank-delta";
import { Segmented, Switch } from "./ui";

/**
 * View state shared across client-side category navigations, so filters carry
 * over when switching leaderboards. A fresh page load reads the URL instead.
 */
let sharedView: ViewState | null = null;

export function Explorer({
  leaderboard,
  categories,
  current,
  homeSlug,
}: {
  leaderboard: Leaderboard;
  categories: Category[];
  current: string;
  homeSlug: string;
}) {
  const { models } = leaderboard;
  const pathname = usePathname();
  // null until the initial view is read on the client (URL on first load, shared state on later navigations).
  const [loadedView, setView] = useState<ViewState | null>(null);
  const view = loadedView ?? DEFAULT_VIEW;
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setView(sharedView ?? searchToView(window.location.search));
  }, []);
  const search = useMemo(() => viewToSearch(view), [view]);
  useEffect(() => {
    if (!loadedView) return;
    sharedView = loadedView;
    window.history.replaceState(window.history.state, "", `${pathname}${search}${window.location.hash}`);
  }, [loadedView, pathname, search]);

  const update = useCallback((patch: Partial<ViewState>) => setView((v) => ({ ...(v ?? DEFAULT_VIEW), ...patch })), []);
  const reset = useCallback(
    () =>
      setView((v) => {
        const cur = v ?? DEFAULT_VIEW;
        return { ...DEFAULT_VIEW, priceMetric: cur.priceMetric, scoreMetric: cur.scoreMetric, labels: cur.labels, showCi: cur.showCi };
      }),
    [],
  );

  const extents = useMemo(() => computeExtents(models), [models]);
  const filtered = useMemo(() => applyFilters(models, view), [models, view]);
  const frontier = useMemo(() => paretoFrontier(filtered, view.priceMetric, view.scoreMetric), [filtered, view.priceMetric, view.scoreMetric]);
  const frontierKeys = useMemo(() => new Set(frontier.map((m) => m.key)), [frontier]);
  const unpriced = filtered.filter((m) => priceOf(m, view.priceMetric) === null).length;

  const orgs = useMemo(() => {
    const matching = applyFilters(models, view, true);
    const counts = new Map<string, { total: number; matching: number }>();
    for (const m of models) {
      const c = counts.get(m.org) ?? { total: 0, matching: 0 };
      c.total++;
      counts.set(m.org, c);
    }
    for (const m of matching) counts.get(m.org)!.matching++;
    return [...counts].map(([org, c]) => ({ org, ...c })).sort((a, b) => b.total - a.total || a.org.localeCompare(b.org));
  }, [models, view]);

  const activeCount = activeFilterCount(view);
  const activeKey = hoverKey ?? pinnedKey;
  const pin = useCallback((key: string | null) => setPinnedKey((k) => (key === null || k === key ? null : key)), []);
  const best = frontier.at(-1);
  const cheapest = frontier[0];

  const panel = (
    <FilterPanel view={view} update={update} extents={extents} orgs={orgs} activeCount={activeCount} onReset={reset} />
  );

  return (
    <PreviousSnapshotContext.Provider value={leaderboard.previousVoteCutoff !== null}>
      <div className="grid gap-6 lg:grid-cols-[296px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div
            className="no-scrollbar sticky top-20 max-h-[calc(100vh-6rem)] space-y-7 overflow-y-auto rounded-[22px] bg-black/[0.018] p-5 ring-1 ring-black/[0.07] ring-inset"
            data-lenis-prevent
          >
            <CategoryNav categories={categories} current={current} homeSlug={homeSlug} search={search} variant="list" />
            <div className="hairline" />
            {panel}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="space-y-3 lg:hidden">
            <CategoryNav categories={categories} current={current} homeSlug={homeSlug} search={search} variant="scroller" />
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] text-foreground/90 ring-1 ring-black/15 ring-inset hover:bg-black/[0.04]"
            >
              <SlidersHorizontal className="size-3.5" />
              {filtersOpen ? "Hide filters" : "Filters"}
              {activeCount > 0 && (
                <span className="rounded-full bg-foreground px-1.5 text-[10.5px] font-semibold text-white">{activeCount}</span>
              )}
            </button>
            {filtersOpen && <div className="rounded-[22px] bg-black/[0.018] p-5 ring-1 ring-black/[0.07] ring-inset">{panel}</div>}
          </div>

          <section id="frontier" className="scroll-mt-20 overflow-hidden rounded-[24px] bg-white ring-1 ring-black/[0.09] ring-inset">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  label="Price axis"
                  size="xs"
                  value={view.priceMetric}
                  onChange={(priceMetric) => update({ priceMetric })}
                  options={[
                    { value: "blended", label: "Blended", title: "(input + 3 × output) / 4" },
                    { value: "input", label: "Input" },
                    { value: "output", label: "Output" },
                  ]}
                />
                <Segmented
                  label="Score axis"
                  size="xs"
                  value={view.scoreMetric}
                  onChange={(scoreMetric) => update({ scoreMetric })}
                  options={[
                    { value: "score", label: "Score" },
                    { value: "lower", label: "Lower CI", title: "Conservative: 95% CI lower bound" },
                  ]}
                />
                <Segmented
                  label="Labels"
                  size="xs"
                  value={view.labels}
                  onChange={(labels) => update({ labels })}
                  options={[
                    { value: "frontier", label: "Frontier" },
                    { value: "all", label: "All" },
                    { value: "none", label: "None" },
                  ]}
                />
              </div>
              <Switch checked={view.showCi} onChange={(showCi) => update({ showCi })} label="95% CI" />
            </div>

            <div className="grid grid-cols-2 border-b border-black/[0.06] sm:grid-cols-4">
              <Stat label="Models shown" value={formatInt(filtered.length - unpriced)} sub={`of ${models.length}`} />
              <Stat label="On frontier" value={String(frontier.length)} />
              <Stat label="Top score" value={best ? String(Math.round(best.score)) : "—"} sub={best?.name} />
              <Stat
                label="Cheapest optimal"
                value={cheapest ? formatPrice(priceOf(cheapest, view.priceMetric)) : "—"}
                sub={cheapest?.name}
              />
            </div>

            <ParetoChart
              models={filtered}
              frontier={frontier}
              priceMetric={view.priceMetric}
              scoreMetric={view.scoreMetric}
              labels={view.labels}
              showCi={view.showCi}
              hoverKey={hoverKey}
              pinnedKey={pinnedKey}
              onHover={setHoverKey}
              onPin={pin}
            />
            {unpriced > 0 && (
              <p className="border-t border-black/[0.06] px-5 py-2.5 text-[11.5px] text-muted-foreground">
                {unpriced} {unpriced === 1 ? "model has" : "models have"} no published pricing and {unpriced === 1 ? "is" : "are"} only listed in the table.
              </p>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <section className="rounded-[24px] p-5 ring-1 ring-black/[0.07] ring-inset">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">Pareto optimal models</h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">Nothing cheaper scores higher.</p>
              <div className="mt-4">
                <FrontierList
                  frontier={frontier}
                  priceMetric={view.priceMetric}
                  scoreMetric={view.scoreMetric}
                  activeKey={activeKey}
                  onHover={setHoverKey}
                  onPin={pin}
                />
              </div>
            </section>

            <section id="models" className="min-w-0 scroll-mt-20 rounded-[24px] p-5 ring-1 ring-black/[0.07] ring-inset">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">All models</h2>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {filtered.length} / {models.length}
                </span>
              </div>
              <ModelTable models={filtered} frontierKeys={frontierKeys} activeKey={activeKey} onHover={setHoverKey} onPin={pin} />
            </section>
          </div>
        </div>
      </div>
    </PreviousSnapshotContext.Provider>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={clsx("min-w-0 px-4 py-3.5 sm:px-5", "border-black/[0.06] [&:not(:last-child)]:border-r max-sm:[&:nth-child(2)]:border-r-0 max-sm:[&:nth-child(-n+2)]:border-b")}>
      <div className="text-[10.5px] tracking-[0.06em] text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[22px] leading-none font-semibold tracking-[-0.03em] text-foreground tabular-nums">{value}</span>
      </div>
      {sub && <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

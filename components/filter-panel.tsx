"use client";

import clsx from "clsx";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { formatCompact, formatContext, formatPriceTick } from "@/lib/format";
import type { Range, RangeKey, ViewState } from "@/lib/filters";
import { OrgMark } from "@/lib/orgs";
import type { Category } from "@/lib/types";
import { RangeSlider } from "./range-slider";
import { Overline, Segmented } from "./ui";

export function categoryHref(slug: string, homeSlug: string, search: string) {
  return `${slug === homeSlug ? "/" : `/${slug}`}${search}`;
}

/** Category links grouped like arena.ai (General / Technology / Domain). */
export function CategoryNav({
  categories,
  current,
  homeSlug,
  search,
  variant,
}: {
  categories: Category[];
  current: string;
  homeSlug: string;
  search: string;
  variant: "list" | "scroller";
}) {
  if (variant === "scroller") {
    return (
      <nav aria-label="Category" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" data-lenis-prevent-horizontal>
        {categories.map((c) => (
          <CategoryPill key={c.slug} category={c} active={c.slug === current} href={categoryHref(c.slug, homeSlug, search)} />
        ))}
      </nav>
    );
  }
  const groups = [...new Set(categories.map((c) => c.group))].map((g) => categories.filter((c) => c.group === g));
  return (
    <nav aria-label="Category" className="space-y-4">
      {groups.map((items) => (
        <div key={items[0].group} className="space-y-2">
          <Overline>{items[0].groupTitle}</Overline>
          <div className="flex flex-wrap gap-1.5">
            {items.map((c) => (
              <CategoryPill key={c.slug} category={c} active={c.slug === current} href={categoryHref(c.slug, homeSlug, search)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function CategoryPill({ category, active, href }: { category: Category; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[12px] whitespace-nowrap transition-colors duration-150",
        active
          ? "bg-foreground font-medium text-white"
          : "text-muted-foreground ring-1 ring-black/[0.08] ring-inset hover:bg-black/[0.04] hover:text-foreground",
      )}
    >
      {category.title}
    </Link>
  );
}

const RANGE_FIELDS: { key: RangeKey; label: string; log?: boolean; integer?: boolean; format: (v: number) => string }[] = [
  { key: "score", label: "Arena score", integer: true, format: (v) => String(Math.round(v)) },
  { key: "blended", label: "Blended price", log: true, format: formatPriceTick },
  { key: "input", label: "Input price", log: true, format: formatPriceTick },
  { key: "output", label: "Output price", log: true, format: formatPriceTick },
  { key: "context", label: "Context length", log: true, format: (v) => formatContext(v) },
  { key: "votes", label: "Votes", log: true, integer: true, format: formatCompact },
];

export function FilterPanel({
  view,
  update,
  extents,
  orgs,
  activeCount,
  onReset,
}: {
  view: ViewState;
  update: (patch: Partial<ViewState>) => void;
  extents: Record<RangeKey, Range>;
  orgs: { org: string; total: number; matching: number }[];
  activeCount: number;
  onReset: () => void;
}) {
  const hidden = new Set(view.hiddenOrgs);
  const toggleOrg = (org: string) =>
    update({ hiddenOrgs: hidden.has(org) ? view.hiddenOrgs.filter((o) => o !== org) : [...view.hiddenOrgs, org] });
  const setRange = (key: RangeKey, value: Range | null) => {
    const ranges = { ...view.ranges };
    if (value) ranges[key] = value;
    else delete ranges[key];
    update({ ranges });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium tracking-[0.02em] text-foreground">
          Filters
          {activeCount > 0 && (
            <span className="ml-1.5 rounded-full bg-foreground px-1.5 py-px text-[10.5px] font-semibold text-white tabular-nums">
              {activeCount}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
          className="text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
        >
          Reset
        </button>
      </div>

      <label className="relative block">
        <span className="sr-only">Search models</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={view.query}
          onChange={(e) => update({ query: e.target.value })}
          placeholder="Search model or org"
          className="h-9 w-full rounded-lg bg-black/[0.03] pr-8 pl-8 font-mono text-[12.5px] text-foreground ring-1 ring-black/[0.08] ring-inset outline-none placeholder:text-muted-foreground/80 focus-visible:bg-white focus-visible:ring-black/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {view.query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => update({ query: "" })}
            className="absolute top-1/2 right-2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-black/[0.06] hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </label>

      <div className="space-y-2">
        <Overline>License</Overline>
        <Segmented
          label="License"
          value={view.license}
          onChange={(license) => update({ license })}
          options={[
            { value: "all", label: "All" },
            { value: "proprietary", label: "Proprietary" },
            { value: "open", label: "Open" },
          ]}
        />
      </div>

      <div className="space-y-2.5">
        <Overline
          action={
            <span className="flex gap-2 text-[11px]">
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => update({ hiddenOrgs: [] })}>
                All
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => update({ hiddenOrgs: orgs.map((o) => o.org) })}
              >
                None
              </button>
            </span>
          }
        >
          Organization
        </Overline>
        <div className="flex flex-wrap gap-1.5">
          {orgs.map(({ org, matching }) => {
            const on = !hidden.has(org);
            return (
              <button
                key={org}
                type="button"
                aria-pressed={on}
                onClick={() => toggleOrg(org)}
                title={on ? `Hide ${org}` : `Show ${org}`}
                className={clsx(
                  "inline-flex h-7 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-[12px] ring-1 ring-inset transition-colors duration-150",
                  on
                    ? "bg-white text-foreground ring-black/[0.14] hover:bg-black/[0.03]"
                    : "text-muted-foreground/60 ring-black/[0.06] hover:text-muted-foreground",
                  on && matching === 0 && "opacity-50",
                )}
              >
                <OrgMark org={org} size={12} />
                {org}
                <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">{matching}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        {RANGE_FIELDS.map((f) => (
          <RangeSlider
            key={f.key}
            label={f.label}
            min={extents[f.key][0]}
            max={extents[f.key][1]}
            value={view.ranges[f.key] ?? null}
            onChange={(v) => setRange(f.key, v)}
            format={f.format}
            log={f.log}
            integer={f.integer}
          />
        ))}
      </div>
    </div>
  );
}

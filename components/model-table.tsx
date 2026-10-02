"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { formatContext, formatInt, formatPrice } from "@/lib/format";
import { OrgMark } from "@/lib/orgs";
import { blendedPrice } from "@/lib/pareto";
import type { Model } from "@/lib/types";
import { RankDelta } from "./rank-delta";

type SortKey = "rank" | "name" | "score" | "votes" | "blended" | "input" | "output" | "context";

/** `wide` columns only show on 2xl screens; the model card carries them elsewhere. */
const COLUMNS: { key: SortKey; label: string; align: "left" | "right"; wide?: boolean; get: (m: Model) => number | string | null }[] = [
  { key: "rank", label: "#", align: "left", get: (m) => m.rank },
  { key: "name", label: "Model", align: "left", get: (m) => m.name.toLowerCase() },
  { key: "score", label: "Score", align: "right", get: (m) => m.score },
  { key: "votes", label: "Votes", align: "right", get: (m) => m.votes },
  { key: "blended", label: "Blended", align: "right", get: blendedPrice },
  { key: "input", label: "Input", align: "right", wide: true, get: (m) => m.inputPrice },
  { key: "output", label: "Output", align: "right", wide: true, get: (m) => m.outputPrice },
  { key: "context", label: "Context", align: "right", get: (m) => m.context },
];

/** Descending by default for metrics where bigger is better; ascending for rank, name, prices. */
const ASC_FIRST = new Set<SortKey>(["rank", "name", "blended", "input", "output"]);
const PAGE = 25;

export function ModelTable({
  models,
  frontierKeys,
  activeKey,
  onHover,
  onPin,
}: {
  models: Model[];
  frontierKeys: Set<string>;
  activeKey: string | null;
  onHover: (key: string | null) => void;
  onPin: (key: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "rank", asc: true });
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key)!;
    // Missing values (unpriced models) always sink to the bottom.
    return [...models].sort((a, b) => {
      const va = col.get(a);
      const vb = col.get(b);
      if (va === null && vb === null) return a.rank - b.rank;
      if (va === null) return 1;
      if (vb === null) return -1;
      const d = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
      return (sort.asc ? d : -d) || a.rank - b.rank;
    });
  }, [models, sort]);

  const visible = expanded ? sorted : sorted.slice(0, PAGE);

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1" data-lenis-prevent-horizontal>
        <table className="w-full min-w-[600px] 2xl:min-w-[760px] border-separate border-spacing-0 text-[12.5px]">
          <thead>
            <tr>
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.asc ? "ascending" : "descending") : "none"}
                    className={clsx(
                      "border-b border-black/[0.07] pb-2.5 font-normal",
                      c.align === "right" ? "text-right" : "text-left",
                      c.key === "rank" && "w-12",
                      c.wide && "hidden 2xl:table-cell",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) => (s.key === c.key ? { key: c.key, asc: !s.asc } : { key: c.key, asc: ASC_FIRST.has(c.key) }))
                      }
                      className={clsx(
                        "inline-flex items-center gap-1 text-[10.5px] tracking-[0.06em] uppercase transition-colors",
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c.label}
                      {active && (sort.asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
              const onFrontier = frontierKeys.has(m.key);
              const active = m.key === activeKey;
              return (
                <tr
                  key={m.key}
                  onMouseEnter={() => onHover(m.key)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onPin(m.key)}
                  className={clsx("cursor-pointer transition-colors duration-150", active ? "bg-black/[0.04]" : "hover:bg-black/[0.02]")}
                >
                  <td className="border-b border-black/[0.05] py-2.5 pr-2 font-mono text-[12px] text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      {m.rank}
                      <RankDelta model={m} />
                    </span>
                  </td>
                  <td className="border-b border-black/[0.05] py-2.5 pr-4">
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-black/[0.045] text-foreground">
                        <OrgMark org={m.org} size={12} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-mono text-[12px] font-semibold text-foreground">{m.name}</span>
                          {onFrontier && (
                            <span className="shrink-0 rounded-full bg-foreground px-1.5 text-[9.5px] leading-[15px] font-semibold text-white">
                              Pareto
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {m.org} · {m.license}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="border-b border-black/[0.05] py-2.5 text-right whitespace-nowrap tabular-nums">
                    <span className="font-semibold text-foreground">{Math.round(m.score)}</span>
                    <span className="ml-1 text-[11px] text-muted-foreground">±{Math.round((m.scoreUpper - m.scoreLower) / 2)}</span>
                  </td>
                  <Num>{formatInt(m.votes)}</Num>
                  <Num strong>{formatPrice(blendedPrice(m))}</Num>
                  <Num wide>{formatPrice(m.inputPrice)}</Num>
                  <Num wide>{formatPrice(m.outputPrice)}</Num>
                  <Num>{formatContext(m.context)}</Num>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > PAGE && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex h-8 items-center rounded-full px-4 text-[12px] text-foreground/90 ring-1 ring-black/15 ring-inset transition-colors hover:bg-black/[0.04]"
          >
            {expanded ? "Show fewer" : `Show all ${sorted.length} models`}
          </button>
        </div>
      )}
    </div>
  );
}

function Num({ children, strong, wide }: { children: React.ReactNode; strong?: boolean; wide?: boolean }) {
  return (
    <td
      className={clsx(
        "border-b border-black/[0.05] py-2.5 pl-3 text-right font-mono text-[11.5px] whitespace-nowrap tabular-nums",
        strong ? "text-foreground" : "text-muted-foreground",
        wide && "hidden 2xl:table-cell",
      )}
    >
      {children}
    </td>
  );
}

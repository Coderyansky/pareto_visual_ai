"use client";

import { ArrowUpRight, X } from "lucide-react";
import { formatContext, formatInt, formatPrice } from "@/lib/format";
import { OrgMark } from "@/lib/orgs";
import { blendedPrice } from "@/lib/pareto";
import type { Model } from "@/lib/types";
import { RankDelta } from "./rank-delta";

/** Floating detail panel for one model (chart tooltip / pinned selection). */
export function ModelCard({ model: m, frontier, onClose }: { model: Model; frontier: boolean; onClose?: () => void }) {
  const ci = Math.round((m.scoreUpper - m.scoreLower) / 2);
  return (
    <div className="rounded-[18px] bg-white/95 p-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.1] ring-inset backdrop-blur">
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-black/[0.05] text-foreground">
          <OrgMark org={m.org} size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[12.5px] font-semibold text-foreground">{m.name}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {m.org} · {m.license}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-0.5 -mr-0.5 inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-black/[0.05] hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-black/[0.06] pt-3">
        <div>
          <div className="text-[28px] leading-none font-semibold tracking-[-0.04em] text-foreground tabular-nums">
            {Math.round(m.score)}
            <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">±{ci}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            Rank #{m.rank} <RankDelta model={m} />
          </div>
        </div>
        {frontier ? (
          <span className="rounded-full bg-foreground px-2 py-0.5 text-[10.5px] font-semibold text-white">Pareto optimal</span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground ring-1 ring-black/15 ring-inset">
            Dominated
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-black/[0.06] pt-3 text-[11.5px]">
        <Row label="Blended" value={formatPrice(blendedPrice(m))} />
        <Row label="Votes" value={formatInt(m.votes)} />
        <Row label="Input" value={formatPrice(m.inputPrice)} />
        <Row label="Output" value={formatPrice(m.outputPrice)} />
        <Row label="Context" value={formatContext(m.context)} />
        <Row label="Rank CI" value={`${m.rankUpper}–${m.rankLower}`} />
      </dl>

      {m.url && onClose && (
        <a
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="group mt-3 inline-flex items-center gap-1 text-[11.5px] text-foreground/90 underline decoration-black/25 underline-offset-4 hover:decoration-black/60"
        >
          Model page
          <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-[11px] text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

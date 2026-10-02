"use client";

import { createContext, useContext } from "react";
import type { Model } from "@/lib/types";

/** Whether the current leaderboard has a previous snapshot to compare ranks with. */
export const PreviousSnapshotContext = createContext(false);

/**
 * Rank movement since the previous arena.ai snapshot. Contrast, not hue:
 * gains are solid foreground, drops are muted. `NEW` marks models absent from
 * the previous snapshot; nothing renders when no previous snapshot exists.
 */
export function RankDelta({ model }: { model: Model }) {
  const hasPrevious = useContext(PreviousSnapshotContext);
  if (!hasPrevious) return null;
  if (model.prevRank === null) return <span className="font-mono text-[10px] text-muted-foreground">NEW</span>;
  const delta = model.prevRank - model.rank;
  if (delta === 0) return null;
  return (
    <span className={`font-mono text-[10.5px] tabular-nums ${delta > 0 ? "text-foreground" : "text-muted-foreground/80"}`}>
      {delta > 0 ? "↑" : "↓"}
      {Math.abs(delta)}
    </span>
  );
}

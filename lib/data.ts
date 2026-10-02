import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Category, Leaderboard } from "./types";

const DATA_DIR = join(process.cwd(), "data");

/** Category slug served at `/`; mirrors arena.ai's fullstack Pareto view. */
export const HOME_CATEGORY = "fullstack";

export function getCategories(): Category[] {
  return JSON.parse(readFileSync(join(DATA_DIR, "categories.json"), "utf8"));
}

export function getLeaderboard(slug: string): Leaderboard {
  return JSON.parse(readFileSync(join(DATA_DIR, "leaderboards", `${slug}.json`), "utf8"));
}

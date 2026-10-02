#!/usr/bin/env node
/**
 * Syncs the Code Arena WebDev leaderboards from arena.ai into `data/`.
 *
 * arena.ai renders its leaderboard pages with React Server Components, so the
 * full table (scores, CIs, votes, prices, context length) is embedded in the
 * HTML as `self.__next_f.push([1, "<chunk>"])` calls. This script reassembles
 * that RSC stream, resolves the category list from the arena config and the
 * `entries` array of each category leaderboard, and writes:
 *
 *   data/categories.json            ordered category metadata
 *   data/leaderboards/<slug>.json   one normalized leaderboard per category
 *
 * Files are rewritten only when their content changes, so a CI job can commit
 * (and trigger a redeploy) only when arena.ai actually published new numbers.
 * When a leaderboard snapshot changes, each model keeps its rank and score
 * from the previous snapshot (`prevRank` / `prevScore`) for delta display.
 *
 * Any parse/validation error aborts before writing, keeping the last good data.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");
const BASE_URL = "https://arena.ai/leaderboard/code/webdev";
const USER_AGENT =
  "Mozilla/5.0 (compatible; pareto-visual-ai/1.0; +https://github.com/Coderyansky/pareto_visual_ai)";
const DEFAULT_GROUP = "general";

async function fetchHtml(url, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "text/html" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastError;
}

/** Reassembles the RSC flight stream pushed via `self.__next_f.push([1, "..."])`. */
function extractFlightStream(html) {
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let stream = "";
  for (const match of html.matchAll(re)) stream += JSON.parse(`"${match[1]}"`);
  if (!stream) throw new Error("No RSC flight data found in page");
  return stream;
}

/** Parses `id:json` rows of the flight stream into a map of id -> value. */
function parseFlightRows(stream) {
  const rows = new Map();
  for (const line of stream.split("\n")) {
    const m = /^([0-9a-f]+):(.*)$/.exec(line);
    if (!m) continue;
    try {
      rows.set(m[1], JSON.parse(m[2]));
    } catch {
      // Non-JSON rows (text chunks, module refs) are irrelevant here.
    }
  }
  return rows;
}

/** Depth-first search for the first object that satisfies `predicate`. */
function findObject(value, predicate) {
  const stack = [value];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (!Array.isArray(node) && predicate(node)) return node;
    for (const child of Object.values(node)) stack.push(child);
  }
  return null;
}

function findInRows(rows, predicate) {
  for (const value of rows.values()) {
    const found = findObject(value, predicate);
    if (found) return found;
  }
  return null;
}

/** Resolves an RSC `$Q<id>` / `$<id>` reference into its row value. */
function resolveRef(rows, ref) {
  if (typeof ref !== "string") return ref;
  const m = /^\$Q?([0-9a-f]+)$/.exec(ref);
  return m ? rows.get(m[1]) : ref;
}

function parseCategories(rows) {
  const arena = findInRows(rows, (o) => o.slug === "code" && o.routeSlug === "code/webdev" && o.categories);
  if (!arena) throw new Error("Arena config with categories not found");
  const categories = resolveRef(rows, arena.categories);
  const groups = new Map(resolveRef(rows, arena.groups) ?? []);
  if (!Array.isArray(categories) || categories.length === 0) throw new Error("Empty category list");
  return categories.map(([slug, c]) => ({
    slug,
    title: c.title,
    icon: c.icon,
    group: c.group ?? DEFAULT_GROUP,
    groupTitle: c.group ? (groups.get(c.group)?.title ?? titleCase(c.group)) : "General",
    description: c.description ?? null,
    default: slug === arena.defaultCategorySlug,
  }));
}

function titleCase(s) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function parseLeaderboard(rows) {
  const board = findInRows(rows, (o) => Array.isArray(o.entries) && typeof o.id === "string" && o.id.startsWith("leaderboard-sets/"));
  if (!board) throw new Error("Leaderboard entries not found");
  const meta = findInRows(rows, (o) => typeof o.voteCutoffISOString === "string" && typeof o.totalVotes === "number");
  return { board, meta };
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function normalizeEntry(e) {
  if (typeof e.modelDisplayName !== "string" || num(e.rating) === null) {
    throw new Error(`Malformed entry: ${JSON.stringify(e).slice(0, 200)}`);
  }
  return {
    key: e.modelKey,
    name: e.modelDisplayName,
    org: e.modelOrganization || "Unknown",
    license: e.license || "Unknown",
    url: e.modelUrl || null,
    rank: e.rank,
    rankUpper: e.rankUpper,
    rankLower: e.rankLower,
    score: round(e.rating, 2),
    scoreUpper: round(e.ratingUpper, 2),
    scoreLower: round(e.ratingLower, 2),
    votes: e.votes,
    inputPrice: num(e.inputPricePerMillion),
    outputPrice: num(e.outputPricePerMillion),
    context: num(e.contextLength),
  };
}

function round(v, digits) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

/** Writes `value` as pretty JSON; returns true when the file content changed. */
async function writeJsonIfChanged(path, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const prev = await readFile(path, "utf8").catch(() => null);
  if (prev === next) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next);
  return true;
}

/** Carries previous-snapshot rank/score forward so the UI can show deltas. */
function attachPrevious(models, existing, voteCutoff) {
  if (!existing) {
    return { models: models.map((m) => ({ ...m, prevRank: null, prevScore: null })), previousVoteCutoff: null };
  }
  const sameSnapshot = existing.voteCutoff === voteCutoff;
  const byKey = new Map(existing.models.map((m) => [m.key, m]));
  const withPrev = models.map((m) => {
    const old = byKey.get(m.key);
    if (sameSnapshot) return { ...m, prevRank: old?.prevRank ?? null, prevScore: old?.prevScore ?? null };
    return { ...m, prevRank: old?.rank ?? null, prevScore: old?.score ?? null };
  });
  return {
    models: withPrev,
    previousVoteCutoff: sameSnapshot ? existing.previousVoteCutoff : existing.voteCutoff,
  };
}

async function loadCategory(category) {
  const url = `${BASE_URL}/${category.slug}`;
  const rows = parseFlightRows(extractFlightStream(await fetchHtml(url)));
  const { board, meta } = parseLeaderboard(rows);
  const models = board.entries.map(normalizeEntry);
  if (models.length === 0) throw new Error(`No models in ${category.slug}`);

  const voteCutoff = meta?.voteCutoffISOString ?? null;
  const path = join(DATA_DIR, "leaderboards", `${category.slug}.json`);
  const existing = await readJson(path);
  const prev = attachPrevious(models, existing, voteCutoff);

  return {
    path,
    value: {
      slug: category.slug,
      sourceUrl: url,
      leaderboardId: board.id,
      voteCutoff,
      previousVoteCutoff: prev.previousVoteCutoff,
      totalVotes: meta?.totalVotes ?? models.reduce((s, m) => s + m.votes, 0),
      totalModels: meta?.totalModels ?? models.length,
      models: prev.models,
    },
  };
}

async function main() {
  const overviewRows = parseFlightRows(extractFlightStream(await fetchHtml(`${BASE_URL}/overall`)));
  const categories = parseCategories(overviewRows);

  // Fetch every category before writing anything, so one failure leaves data untouched.
  const loaded = await Promise.all(categories.map(loadCategory));

  for (const { path, value } of loaded) {
    const changed = await writeJsonIfChanged(path, value);
    console.log(`${changed ? "updated" : "unchanged"}  ${value.slug} (${value.models.length} models)`);
  }
  const categoriesChanged = await writeJsonIfChanged(join(DATA_DIR, "categories.json"), categories);
  console.log(`${categoriesChanged ? "updated" : "unchanged"}  categories.json (${categories.length})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

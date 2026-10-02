/** Category metadata as written by `scripts/fetch-arena.mjs` to `data/categories.json`. */
export interface Category {
  slug: string;
  title: string;
  icon: string;
  group: string;
  groupTitle: string;
  description: string | null;
  default: boolean;
}

/** One model row of a leaderboard snapshot. Prices are USD per 1M tokens. */
export interface Model {
  key: string;
  name: string;
  org: string;
  license: string;
  url: string | null;
  rank: number;
  rankUpper: number;
  rankLower: number;
  score: number;
  scoreUpper: number;
  scoreLower: number;
  votes: number;
  inputPrice: number | null;
  outputPrice: number | null;
  context: number | null;
  /** Rank in the previous snapshot; null when unknown or the model is new. */
  prevRank: number | null;
  prevScore: number | null;
}

/** A leaderboard snapshot as written to `data/leaderboards/<slug>.json`. */
export interface Leaderboard {
  slug: string;
  sourceUrl: string;
  leaderboardId: string;
  voteCutoff: string | null;
  previousVoteCutoff: string | null;
  totalVotes: number;
  totalModels: number;
  models: Model[];
}

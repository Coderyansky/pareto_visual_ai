# pareto_visual_ai

Interactive price–performance Pareto frontier for the [Code Arena WebDev leaderboards](https://arena.ai/leaderboard/code/webdev/fullstack/pareto), with filters, zoom, confidence intervals and rank deltas.

- **Stack:** Next.js (App Router, fully static output), Tailwind CSS v4, custom SVG chart on `d3-scale` / `d3-zoom`.
- **Data:** `data/` is produced by `scripts/fetch-arena.mjs`, which reads the leaderboard tables embedded in arena.ai pages.
- **Auto-update:** `.github/workflows/sync-arena.yml` runs every 3 hours and commits `data/` only when arena.ai published new numbers; the push redeploys on Vercel.

## Develop

```bash
npm install
npm run fetch-data   # refresh data/ from arena.ai
npm run dev
```

## Deploy (Vercel Hobby)

1. Import the GitHub repo in Vercel — framework preset “Next.js”, no env vars.
2. Every page is prerendered, so there are no serverless function invocations; Vercel only serves static assets.

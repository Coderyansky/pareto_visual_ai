import { HOME_CATEGORY } from "@/lib/data";
import { formatDate, formatInt } from "@/lib/format";
import type { Category, Leaderboard } from "@/lib/types";
import { Explorer } from "./explorer";
import { SiteHeader } from "./site-header";

const METHOD = [
  {
    title: "Blended price",
    body: "Input and output prices per 1M tokens, weighted 1:3. Switch the axis to input or output price at any time.",
  },
  {
    title: "Pareto frontier",
    body: "A model is optimal when no model at the same or lower price scores higher. The step line is the best score money can buy at each price.",
  },
  {
    title: "Always up to date",
    body: "A scheduled job refreshes every leaderboard and redeploys only when the numbers change. Rank deltas compare with the previous snapshot.",
  },
];

export function LeaderboardPage({
  leaderboard,
  categories,
  category,
}: {
  leaderboard: Leaderboard;
  categories: Category[];
  category: Category;
}) {
  return (
    <>
      <SiteHeader />
      <div className="relative isolate">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,0,0,0.045),transparent_70%)]"
        />
        <main className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <section className="reveal mx-auto max-w-2xl pt-12 pb-10 text-center sm:pt-16 sm:pb-14">
            <span
              className="inline-flex h-7 items-center gap-2 rounded-full bg-black/[0.03] px-3 font-mono text-[11px] text-muted-foreground ring-1 ring-black/10 ring-inset"
            >
              webdev / {category.slug}
            </span>
            <h1 className="text-gradient mt-4 text-[38px] leading-[1.06] font-semibold tracking-[-0.035em] sm:text-[56px]">
              Score per dollar,
              <br />
              model by model.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-muted-foreground">
              The price–performance frontier of the <span className="text-foreground">{category.title}</span> leaderboard.
              Filter it, zoom into it, and see what each extra point costs.
            </p>
            <dl className="mx-auto mt-9 grid max-w-md grid-cols-3">
              {[
                [formatInt(leaderboard.totalVotes), "votes"],
                [String(leaderboard.totalModels), "models"],
                [formatDate(leaderboard.voteCutoff), "snapshot"],
              ].map(([value, label], i) => (
                <div key={label} className={i > 0 ? "border-l border-black/[0.08]" : undefined}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-[19px] font-semibold tracking-[-0.03em] text-foreground tabular-nums sm:text-[22px]">{value}</dd>
                  <dd className="mt-0.5 text-[12px] text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Explorer leaderboard={leaderboard} categories={categories} current={category.slug} homeSlug={HOME_CATEGORY} />

          <div className="hairline mx-auto mt-24 max-w-3xl sm:mt-32" />

          <section id="method" className="mx-auto max-w-4xl scroll-mt-20 pt-20 pb-20 sm:pt-28 sm:pb-28">
            <div className="text-center">
              <span className="text-[13px] font-medium tracking-[0.025em] text-muted-foreground">Method</span>
              <h2 className="text-gradient mt-3 text-[32px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[40px]">
                Same data,
                <br />
                clearer trade-offs.
              </h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {METHOD.map((f) => (
                <div key={f.title}>
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
      <footer className="border-t border-black/[0.06] py-8 text-center text-[12px] text-muted-foreground">
        Pareto · Price–performance frontier of AI coding models
      </footer>
    </>
  );
}

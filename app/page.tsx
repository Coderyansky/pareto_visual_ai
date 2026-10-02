import { LeaderboardPage } from "@/components/leaderboard-page";
import { getCategories, getLeaderboard, HOME_CATEGORY } from "@/lib/data";

export default function Home() {
  const categories = getCategories();
  const category = categories.find((c) => c.slug === HOME_CATEGORY)!;
  return <LeaderboardPage leaderboard={getLeaderboard(HOME_CATEGORY)} categories={categories} category={category} />;
}

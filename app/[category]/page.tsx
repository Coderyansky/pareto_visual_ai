import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeaderboardPage } from "@/components/leaderboard-page";
import { getCategories, getLeaderboard, HOME_CATEGORY } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = getCategories().find((x) => x.slug === category);
  return {
    title: c ? `${c.title} frontier` : undefined,
    alternates: { canonical: category === HOME_CATEGORY ? "/" : `/${category}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const categories = getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  return <LeaderboardPage leaderboard={getLeaderboard(slug)} categories={categories} category={category} />;
}

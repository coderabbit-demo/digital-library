import { redirect } from "next/navigation";
import { AchievementsSection } from "@/components/home/AchievementsSection";
import { DashboardHeader } from "@/components/home/DashboardHeader";
import { Feed } from "@/components/home/Feed";
import { FeedFilter } from "@/components/home/FeedFilter";
import { StatCards } from "@/components/home/StatCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import {
  countFinishedBetween,
  getActiveGoal,
  listActivityDatesForUser,
  listEntriesForUser,
  listFeed,
  listMedia,
  listUserAchievements,
} from "@/db/queries";
import { evaluateAchievements } from "@/lib/achievements";
import { getSessionUser } from "@/lib/auth/current-user";
import { computeGoalProgress, DEFAULT_GOAL_PERIOD } from "@/lib/goals";
import { distinctMediaTypes, mediaTypeOptions, resolveActiveType } from "@/lib/media-type";
import { computeStreaks } from "@/lib/streaks";
import { computeUserStats } from "@/lib/stats";

/**
 * Home dashboard (DL-48): a live goals/stats/achievements summary plus the
 * retained community feed (Req 7). All stats are computed from the signed-in
 * user's own data; the feed and its media-type filter are read server-side.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { type } = await searchParams;
  const db = getDb();
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

  const [media, entries, activityDates, persisted, goal, finishedThisYear] = await Promise.all([
    listMedia(db),
    listEntriesForUser(db, user.id),
    listActivityDatesForUser(db, user.id),
    listUserAchievements(db, user.id),
    getActiveGoal(db, user.id, DEFAULT_GOAL_PERIOD, year),
    countFinishedBetween(db, user.id, yearStart, yearEnd),
  ]);

  const stats = computeUserStats(entries);
  const streaks = computeStreaks(activityDates, now.toISOString());
  const goalProgress = computeGoalProgress(goal, finishedThisYear);
  const achievements = evaluateAchievements(
    { stats, streaks, goalProgress },
    new Map(persisted.map((a) => [a.achievementKey, a.achievedAt])),
  );

  const options = mediaTypeOptions(distinctMediaTypes(media));
  const activeType = resolveActiveType(type, options);
  const feed = await listFeed(db, activeType === "all" ? {} : { type: activeType });

  return (
    <>
      <DashboardHeader userName={user.name} />
      <StatCards stats={stats} goalProgress={goalProgress} streaks={streaks} />
      <AchievementsSection achievements={achievements} />
      <Card>
        <CardHeader>
          <CardTitle id="feed-title">Community feed</CardTitle>
        </CardHeader>
        <CardContent>
          <FeedFilter options={options} activeValue={activeType} />
          <Feed entries={feed} />
        </CardContent>
      </Card>
    </>
  );
}

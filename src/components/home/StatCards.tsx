/**
 * Home stat cards (DL-48): reading goal, pages read, current streak, and items
 * in progress — matching the reference composition, fed by live data (Req 7.1,
 * 7.3, 7.5). Cards with a target show a progress bar with a caption.
 */
import { BookOpen, Clock, Flame, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GoalProgress } from "@/lib/goals";
import type { UserStats } from "@/lib/stats";
import type { StreakInfo } from "@/lib/streaks";

export interface StatCardsProps {
  stats: UserStats;
  goalProgress: GoalProgress | null;
  streaks: StreakInfo;
}

function pct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function StatCard({
  icon,
  label,
  value,
  caption,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption?: string;
  progress?: number;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-medium">{value}</div>
        {typeof progress === "number" ? <Progress value={progress} /> : null}
        {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}

export function StatCards({ stats, goalProgress, streaks }: StatCardsProps): React.JSX.Element {
  // Pages read shows progress toward the next 1,000-page milestone.
  const pagesTarget = Math.max(1000, Math.ceil((stats.totalPagesRead + 1) / 1000) * 1000);

  return (
    <section aria-label="Reading stats" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {goalProgress ? (
        <StatCard
          icon={<Target className="size-4" aria-hidden="true" />}
          label={`${goalProgress.periodKey} Goal`}
          value={`${goalProgress.completed} / ${goalProgress.target}`}
          progress={pct(goalProgress.completed, goalProgress.target)}
          caption={
            goalProgress.remaining === 0
              ? "Goal reached — nicely done!"
              : `${goalProgress.remaining} to go`
          }
        />
      ) : (
        <StatCard
          icon={<Target className="size-4" aria-hidden="true" />}
          label="Reading Goal"
          value="—"
          caption="Set a yearly goal in your profile"
        />
      )}

      <StatCard
        icon={<BookOpen className="size-4" aria-hidden="true" />}
        label="Pages Read"
        value={String(stats.totalPagesRead)}
        progress={pct(stats.totalPagesRead, pagesTarget)}
        caption={`${pagesTarget - stats.totalPagesRead} to ${pagesTarget.toLocaleString()}`}
      />

      <StatCard
        icon={<Flame className="size-4" aria-hidden="true" />}
        label="Current Streak"
        value={`${streaks.current} ${streaks.current === 1 ? "day" : "days"}`}
        caption={`Longest: ${streaks.longest} ${streaks.longest === 1 ? "day" : "days"}`}
      />

      <StatCard
        icon={<Clock className="size-4" aria-hidden="true" />}
        label="In Progress"
        value={String(stats.inProgress)}
        caption="Currently reading or listening"
      />
    </section>
  );
}

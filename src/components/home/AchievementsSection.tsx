/**
 * Home achievements section (DL-48): unlocked and in-progress achievements with
 * the unlocked count, fed by live data (Req 7.2, 6.3). Conveys state by text +
 * icon, not color alone (Req 13.5).
 */
import { CircleDashed, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AchievementView } from "@/lib/achievements";

export interface AchievementsSectionProps {
  achievements: readonly AchievementView[];
}

function pct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function AchievementsSection({ achievements }: AchievementsSectionProps): React.JSX.Element {
  const unlocked = achievements.filter((a) => a.unlocked);
  const inProgress = achievements.filter((a) => !a.unlocked);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Achievements</CardTitle>
        <Badge variant="secondary">
          {unlocked.length} of {achievements.length}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {unlocked.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Unlocked</h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {unlocked.map((a) => (
                <li key={a.key} className="flex items-start gap-2 rounded-md border border-border p-3">
                  <Trophy className="mt-0.5 size-4 text-amber-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {inProgress.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">In progress</h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {inProgress.map((a) => (
                <li key={a.key} className="flex items-start gap-2 rounded-md border border-border p-3">
                  <CircleDashed className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    {a.progress ? (
                      <div className="mt-1.5">
                        <Progress value={pct(a.progress.current, a.progress.target)} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.progress.current} / {a.progress.target}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

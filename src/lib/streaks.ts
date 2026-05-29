/**
 * Activity streaks (media-platform-v2 Req 5.1, 5.3). Pure: derives current and
 * longest streaks from the user's own activity timestamps, with "today"
 * injected so the computation is deterministic and testable.
 */
export interface StreakInfo {
  current: number;
  longest: number;
}

const MS_PER_DAY = 86_400_000;

/** Map an ISO date/timestamp to a UTC day index, or null if unparseable. */
function toDayIndex(dateLike: string): number | null {
  const day = dateLike.slice(0, 10);
  const ms = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / MS_PER_DAY);
}

export function computeStreaks(activityDates: readonly string[], today: string): StreakInfo {
  const days = Array.from(
    new Set(activityDates.map(toDayIndex).filter((d): d is number => d !== null)),
  ).sort((a, b) => a - b);

  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = days[i]! === days[i - 1]! + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  let current = 0;
  const todayIdx = toDayIndex(today);
  if (todayIdx !== null) {
    const last = days[days.length - 1]!;
    // Count only if the most recent active day is today or yesterday.
    if (last === todayIdx || last === todayIdx - 1) {
      current = 1;
      for (let i = days.length - 1; i > 0; i -= 1) {
        if (days[i]! === days[i - 1]! + 1) current += 1;
        else break;
      }
    }
  }

  return { current, longest };
}

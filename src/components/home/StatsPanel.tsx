import type { HomeStats } from "@/lib/home-stats";

export interface StatsPanelProps {
  stats: HomeStats;
}

/** Reader counters + a Goals placeholder (DL-29; mock data this slice). */
export function StatsPanel({ stats }: StatsPanelProps): React.JSX.Element {
  const counters = [
    { label: "Wishlist", value: stats.wishlist },
    { label: "Reading", value: stats.current },
    { label: "Finished", value: stats.finished },
    { label: "Reviewed", value: stats.reviewed },
  ];
  return (
    <section className="stats-panel" aria-label="Reading stats">
      <ul className="stat-grid">
        {counters.map((c) => (
          <li key={c.label} className="stat">
            <strong>{c.value}</strong>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
      <p className="stat-goals">{stats.goals.label}</p>
    </section>
  );
}

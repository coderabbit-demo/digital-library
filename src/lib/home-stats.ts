/**
 * Home reading-stats model (DL-29). Mock values for this slice, shaped so the
 * counters and a future Goals section become live data without redesigning the
 * page (Req 3.7, 3.8).
 */
export interface HomeStats {
  wishlist: number;
  current: number;
  finished: number;
  reviewed: number;
  /** Reserved slot for the future Goals feature. */
  goals: { label: string; placeholder: true };
}

export function mockHomeStats(): HomeStats {
  return {
    wishlist: 3,
    current: 1,
    finished: 5,
    reviewed: 4,
    goals: { label: "Reading goals coming soon", placeholder: true },
  };
}

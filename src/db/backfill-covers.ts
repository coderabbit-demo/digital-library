/**
 * Cover backfill (cover-art DL-75). Warms `media_items` that still need a cover
 * (seeded/existing rows) by resolving art from the keyless sources and
 * persisting it, so the catalog looks complete without waiting for each item's
 * first detail view. Run with `npm run db:backfill-covers` against a database.
 *
 * Idempotent (skips rows already checked, via findMediaNeedingCover) so it is
 * safe to re-run, and throttled to stay well under the iTunes ~20/min limit.
 */
import "./load-env";
import { resolveAndPersistCover } from "@/lib/covers/service";
import { getDb } from "./client";
import { findMediaNeedingCover } from "./queries";

const BATCH = 25;
const DELAY_MS = 3500; // ≈17 req/min — under the iTunes ~20/min ceiling
const TIMEOUT_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const db = getDb();
  let resolved = 0;
  let none = 0;
  let processed = 0;
  // Rows we've already attempted this run. A successful attempt stamps
  // artwork_checked_at and leaves the "needs cover" set; this set additionally
  // guarantees termination if a row keeps throwing (it never clears its marker).
  const attempted = new Set<string>();

  for (;;) {
    // findMediaNeedingCover has no cursor and a failed row stays eligible
    // (unstamped). Widen the window by the number already attempted so stuck
    // leading rows can't crowd out fresh ones and cause premature termination.
    const batch = await findMediaNeedingCover(db, BATCH + attempted.size);
    const fresh = batch.filter((item) => !attempted.has(item.id));
    if (fresh.length === 0) break; // nothing left, or only stuck rows → stop

    for (const item of fresh) {
      attempted.add(item.id);
      processed += 1;
      try {
        const outcome = await resolveAndPersistCover(db, item.id, { coverDeps: { timeoutMs: TIMEOUT_MS } });
        const url = outcome.status === "resolved" ? outcome.artworkUrl : null;
        if (url) {
          resolved += 1;
          console.log(`✓ ${item.type} · ${item.title} → ${url}`);
        } else {
          none += 1;
          console.log(`· ${item.type} · ${item.title} (no cover)`);
        }
      } catch (error) {
        // Don't let one row (e.g. a transient DB error) abort the whole backfill.
        none += 1;
        console.error(`✗ ${item.type} · ${item.title} (error)`, error);
      }
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nBackfill complete: ${resolved} covers found, ${none} without, ${processed} processed.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("cover backfill failed:", error);
    process.exit(1);
  });

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

  for (;;) {
    const batch = await findMediaNeedingCover(db, BATCH);
    if (batch.length === 0) break;

    for (const item of batch) {
      const outcome = await resolveAndPersistCover(db, item.id, { coverDeps: { timeoutMs: TIMEOUT_MS } });
      processed += 1;
      const url = outcome.status === "resolved" ? outcome.artworkUrl : null;
      if (url) {
        resolved += 1;
        console.log(`✓ ${item.type} · ${item.title} → ${url}`);
      } else {
        none += 1;
        console.log(`· ${item.type} · ${item.title} (no cover)`);
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

/**
 * Load environment variables for the standalone db scripts (DL-38).
 *
 * Next.js auto-loads `.env.local`/`.env`, but `drizzle-kit` and `tsx` do not —
 * so `db:migrate`/`db:seed` need this. Loads `.env.local` first (higher
 * precedence) then `.env`; dotenv never overrides already-set vars, so values
 * injected by the platform (e.g. Vercel) win and a missing file is a no-op.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

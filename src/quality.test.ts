/**
 * Quality guardrails (DL-51, Req 15.4). Scans application source to enforce
 * security/typing invariants that are easy to regress silently.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("source quality guardrails (DL-51)", () => {
  const files = sourceFiles(SRC);

  it("finds application source to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("never renders unsanitized HTML (no dangerouslySetInnerHTML prop)", () => {
    // Match the JSX prop assignment shape so prose/comments don't trip the gate.
    const offenders = files.filter((f) => /dangerouslySetInnerHTML\s*=/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("does not cast away types with `as any`", () => {
    // Implicit `any` is already barred by strict tsc; this guards the explicit
    // escape hatch most likely to slip through review.
    const offenders = files.filter((f) => /\bas\s+any\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

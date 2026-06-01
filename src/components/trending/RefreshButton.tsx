"use client";

import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Re-fetches the current route's server data (DL-59) — the retry action for
 * trending error/empty states. */
export function RefreshButton({ label = "Try again" }: { label?: string }): React.JSX.Element {
  const router = useRouter();
  return (
    <Button variant="outline" size="sm" onClick={() => router.refresh()}>
      <RotateCw aria-hidden="true" />
      {label}
    </Button>
  );
}

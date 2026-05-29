import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppNav } from "@/components/nav/AppNav";
import { getSessionUser } from "@/lib/auth/current-user";

/**
 * Authenticated app shell (DL-27). Renders the persistent navigation and the
 * active route's page. Server-side it re-validates the session (defense in
 * depth beyond the edge middleware) and redirects unauthenticated users to
 * the auth surface.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <AppNav userName={user.name} avatarColor={user.avatarColor} />
      <main>{children}</main>
    </div>
  );
}

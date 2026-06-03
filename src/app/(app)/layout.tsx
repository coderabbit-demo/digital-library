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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#main-content" className="skip-link focus-visible:ring-2 focus-visible:ring-ring">
        Skip to content
      </a>
      <AppNav userName={user.name} avatarColor={user.avatarColor} avatarUrl={user.avatarUrl} />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6"
      >
        {children}
      </main>
    </div>
  );
}

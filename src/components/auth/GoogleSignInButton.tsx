/**
 * "Continue with Google" entry point (google-auth DL-80). A plain link to the
 * server-side start route (no client JS needed); rendered by the login/register
 * pages only when Google sign-in is configured.
 */
export function GoogleSignInButton(): React.JSX.Element {
  return (
    <a
      href="/auth/google/start"
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Continue with Google
    </a>
  );
}

/** Home greeting header (DL-48, Req 7.1). */
export interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps): React.JSX.Element {
  return (
    <div>
      <h1 className="text-2xl font-medium">Welcome back, {userName}!</h1>
      <p className="text-muted-foreground">Here’s your reading and listening at a glance.</p>
    </div>
  );
}

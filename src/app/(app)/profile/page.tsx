import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getDb } from "@/db/client";
import { findPreferences } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { emptyPreferences } from "@/lib/preferences";

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const preferences = (await findPreferences(getDb(), user.id)) ?? emptyPreferences();

  return (
    <section aria-labelledby="profile-title" className="flex flex-col gap-4">
      <h1 id="profile-title" className="text-2xl font-medium">
        Profile
      </h1>
      <ProfileForm user={user} preferences={preferences} />
    </section>
  );
}

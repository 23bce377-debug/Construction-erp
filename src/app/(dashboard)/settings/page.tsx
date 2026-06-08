import { db } from '@/lib/db/db';
import { organizations, profiles } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import { SettingsWrapper } from '@/components/SettingsWrapper';

export default async function SettingsPage() {
  const { orgId, userId } = await getOrgContext();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-slate-400 mt-1">Configure your organization profile, IAM credentials, and system settings</p>
      </div>

      <SettingsWrapper org={org || null} profile={profile || null} />
    </div>
  );
}

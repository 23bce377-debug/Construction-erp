import { db } from '@/lib/db/db';
import { sites, activities, workers, items } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import { DPRPageWrapper } from '@/components/DPRPageWrapper';

export default async function DPRPage() {
  const { orgId } = await getOrgContext();

  const allSites = await db
    .select()
    .from(sites)
    .where(eq(sites.orgId, orgId));

  const allActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.orgId, orgId));

  const allWorkers = await db
    .select()
    .from(workers)
    .where(eq(workers.orgId, orgId));

  const allItems = await db
    .select()
    .from(items)
    .where(eq(items.orgId, orgId));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Daily Progress Reports</h1>
        <p className="text-slate-400 mt-1">Track site activities, daily labor count, and inventory movement</p>
      </div>

      <DPRPageWrapper
        sites={allSites as unknown as { id: string; name: string }[]}
        activities={allActivities as unknown as { id: string; name: string; siteId: string; uom: string }[]}
        workers={allWorkers as unknown as { id: string; name: string; trade: string }[]}
        items={allItems as unknown as { id: string; name: string; uom: string }[]}
      />
    </div>
  );
}

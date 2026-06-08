import { db } from '@/lib/db/db';
import { sites, workfronts, activities, costCodes } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import { SiteWBSWrapper } from '@/components/SiteWBSWrapper';

export default async function SitesPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { orgId } = await getOrgContext();
  const { projectId } = await searchParams;

  const allSites = await db
    .select()
    .from(sites)
    .where(eq(sites.orgId, orgId));

  const allWorkfronts = await db
    .select()
    .from(workfronts)
    .where(eq(workfronts.orgId, orgId));

  const allActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.orgId, orgId));

  const allCostCodes = await db
    .select()
    .from(costCodes)
    .where(eq(costCodes.orgId, orgId));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Site & WBS Management</h1>
        <p className="text-slate-400 mt-1">Monitor site health, workfront execution, and activities</p>
      </div>

      <SiteWBSWrapper
        sites={allSites as unknown as { id: string; name: string; siteCode: string | null; projectId: string; status: string }[]}
        workfronts={allWorkfronts as unknown as { id: string; siteId: string; name: string; levelType: string; parentId: string | null; status: string }[]}
        activities={allActivities as unknown as { id: string; siteId: string; workfrontId: string; costCodeId: string | null; name: string; plannedQty: string | null; uom: string; status: string; completionPct: string }[]}
        costCodes={allCostCodes as unknown as { id: string; code: string; description: string }[]}
        initialProjectId={projectId}
      />
    </div>
  );
}

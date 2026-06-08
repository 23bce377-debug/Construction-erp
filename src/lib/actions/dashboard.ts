'use server';

import { db } from '@/lib/db/db';
import { projects, purchaseOrders, workerAttendance, sites } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getCachedData } from '@/lib/redis';

export async function getDashboardStats() {
  const { orgId } = await getOrgContext();

  return getCachedData(`org:${orgId}:dashboard:stats`, async () => {
    // 1. Fetch active projects count
    const activeProjectsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(and(eq(projects.orgId, orgId), eq(projects.status, 'active')));

    // 2. Fetch pending purchase orders count
    const pendingPOsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.orgId, orgId), eq(purchaseOrders.status, 'pending_approval')));

    // 3. Fetch today's workforce attendance count
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await db
      .select({ count: sql<number>`count(*)` })
      .from(workerAttendance)
      .where(and(eq(workerAttendance.orgId, orgId), eq(workerAttendance.attendanceDate, today)));

    // 4. Fetch total budget committed
    const totalBudget = await db
      .select({ total: sql<string>`sum(contract_value)` })
      .from(projects)
      .where(eq(projects.orgId, orgId));

    // 5. Fetch recent site events
    const recentSites = await db
      .select()
      .from(sites)
      .where(eq(sites.orgId, orgId))
      .orderBy(desc(sites.createdAt))
      .limit(5);

    const serializedRecentSites = recentSites.map(site => ({
      ...site,
      createdAt: site.createdAt.toISOString(),
      updatedAt: site.updatedAt.toISOString(),
    }));

    return {
      activeProjectsCount: activeProjectsCount[0]?.count || 0,
      pendingPOsCount: pendingPOsCount[0]?.count || 0,
      todayAttendance: todayAttendance[0]?.count || 0,
      totalBudget: totalBudget[0]?.total || '0',
      recentSites: serializedRecentSites,
    };
  }, 300); // 5-minute cache TTL
}

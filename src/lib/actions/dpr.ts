'use server';

import { db } from '@/lib/db/db';
import { dprs, dprProgressEntries, activities, workerAttendance, inventoryLedger, workers, items } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { dprSchema, attendanceSchema } from '@/lib/validations';
import { eq, sql, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCachedData, invalidateCache } from '@/lib/redis';

// Query Actions with Redis Caching
export async function getWorkers() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:workers`, async () => {
    return db
      .select()
      .from(workers)
      .where(eq(workers.orgId, orgId));
  });
}

// Write Actions with Cache Invalidation
export async function createDPR(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = dprSchema.parse(data);

  // 1. Insert DPR Header
  const [newDPR] = await db.insert(dprs).values({
    orgId,
    siteId: validated.siteId,
    dprDate: validated.dprDate,
    weather: validated.weather || 'clear',
    totalWorkers: validated.totalWorkers,
    remarks: validated.remarks,
    status: 'submitted',
  }).returning();

  // 2. Insert Progress Entries & Update Activities
  if (validated.progressEntries && validated.progressEntries.length > 0) {
    for (const entry of validated.progressEntries) {
      await db.insert(dprProgressEntries).values({
        orgId,
        dprId: newDPR.id,
        activityId: entry.activityId,
        qtyDoneToday: entry.qtyDoneToday,
        uom: entry.uom,
        remarks: entry.remarks,
      });

      // Fetch active activity to recalculate progress
      const [activity] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, entry.activityId));

      if (activity) {
        const planned = Number(activity.plannedQty || 0);
        if (planned > 0) {
          // Calculate cumulative quantity achieved
          const [totalAchieved] = await db
            .select({ total: sql<string>`sum(qty_done_today)` })
            .from(dprProgressEntries)
            .where(eq(dprProgressEntries.activityId, entry.activityId));

          const cumulative = Number(totalAchieved?.total || 0);
          const completionPct = Math.min(100, Math.round((cumulative / planned) * 100));

          await db
            .update(activities)
            .set({
              completionPct: completionPct.toString(),
              status: completionPct >= 100 ? 'completed' : 'in_progress',
              updatedAt: new Date(),
            })
            .where(eq(activities.id, entry.activityId));
        }
      }
    }
  }

  await invalidateCache(`org:${orgId}:activities`);
  await invalidateCache(`org:${orgId}:dashboard:stats`);
  await invalidateCache(`org:${orgId}:reports:gantt`);

  revalidatePath('/dpr');
  revalidatePath('/sites');
  return newDPR;
}

export async function recordAttendanceBatch(data: { siteId: string; attendanceDate: string; records: { workerId: string; shift: string; hoursWorked: string; attendanceType: string }[] }) {
  const { orgId } = await getOrgContext();

  const results = [];
  for (const record of data.records) {
    const validated = attendanceSchema.parse({
      siteId: data.siteId,
      workerId: record.workerId,
      attendanceDate: data.attendanceDate,
      shift: record.shift,
      hoursWorked: record.hoursWorked,
      attendanceType: record.attendanceType,
    });

    const [newAttendance] = await db.insert(workerAttendance).values({
      ...validated,
      orgId,
    }).returning();
    results.push(newAttendance);
  }

  await invalidateCache(`org:${orgId}:dashboard:stats`);

  revalidatePath('/dpr');
  return results;
}

const materialIssueSchema = z.object({
  siteId: z.string().uuid(),
  itemId: z.string().uuid(),
  qty: z.string(),
  uom: z.string(),
  activityId: z.string().uuid().optional(),
});

export async function recordMaterialIssue(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = materialIssueSchema.parse(data);

  const [issue] = await db.insert(inventoryLedger).values({
    orgId,
    siteId: validated.siteId,
    itemId: validated.itemId,
    transactionType: 'ISSUE',
    qty: validated.qty,
    uom: validated.uom,
    referenceId: validated.activityId, // link to activity if provided
  }).returning();

  await invalidateCache(`org:${orgId}:procurement:stock`);
  await invalidateCache(`org:${orgId}:reports:aging`);

  revalidatePath('/procurement');
  revalidatePath('/dpr');
  return issue;
}


'use server';

import { db } from '@/lib/db/db';
import { workers, workerAttendance } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { workerSchema, attendanceSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { invalidateCache } from '@/lib/redis';

export async function createWorker(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = workerSchema.parse(data);

  const [newWorker] = await db.insert(workers).values({
    ...validated,
    orgId,
  }).returning();

  await invalidateCache(`org:${orgId}:workers`);

  revalidatePath('/workforce');
  return newWorker;
}

export async function recordAttendance(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = attendanceSchema.parse(data);

  const [newAttendance] = await db.insert(workerAttendance).values({
    ...validated,
    orgId,
  }).returning();

  await invalidateCache(`org:${orgId}:dashboard:stats`);

  revalidatePath('/dpr'); // Daily Progress Report usually includes attendance
  return newAttendance;
}


'use server';

import { db } from '@/lib/db/db';
import { projects, sites, workfronts, activities, costCodes } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { projectSchema, updateProjectStatusSchema, siteSchema, workfrontSchema, activitySchema } from '@/lib/validations';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCachedData, invalidateCache } from '@/lib/redis';

// Query Actions with Redis Caching
export async function getProjects() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:projects`, async () => {
    return db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .orderBy(desc(projects.createdAt));
  });
}

export async function getSites() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:sites`, async () => {
    return db
      .select()
      .from(sites)
      .where(eq(sites.orgId, orgId))
      .orderBy(desc(sites.createdAt));
  });
}

export async function getWorkfronts() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:workfronts`, async () => {
    return db
      .select()
      .from(workfronts)
      .where(eq(workfronts.orgId, orgId));
  });
}

export async function getActivities() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:activities`, async () => {
    return db
      .select()
      .from(activities)
      .where(eq(activities.orgId, orgId));
  });
}

export async function getCostCodes() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:costCodes`, async () => {
    return db
      .select()
      .from(costCodes)
      .where(eq(costCodes.orgId, orgId));
  });
}

// Write Actions with Cache Invalidation
export async function createProject(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = projectSchema.parse(data);

  const [newProject] = await db.insert(projects).values({
    ...validated,
    orgId,
  }).returning();

  await invalidateCache(`org:${orgId}:projects`);
  await invalidateCache(`org:${orgId}:dashboard:stats`);
  await invalidateCache(`org:${orgId}:reports:bva`);

  revalidatePath('/projects');
  return newProject;
}

export async function updateProjectStatus(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = updateProjectStatusSchema.parse(data);

  const [updatedProject] = await db.update(projects)
    .set({ status: validated.status, updatedAt: new Date() })
    .where(and(eq(projects.id, validated.projectId), eq(projects.orgId, orgId)))
    .returning();

  await invalidateCache(`org:${orgId}:projects`);
  await invalidateCache(`org:${orgId}:dashboard:stats`);

  revalidatePath('/projects');
  return updatedProject;
}

export async function createSite(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = siteSchema.parse(data);

  const [newSite] = await db.insert(sites).values({
    ...validated,
    orgId,
  }).returning();

  await invalidateCache(`org:${orgId}:sites`);
  await invalidateCache(`org:${orgId}:dashboard:stats`);

  revalidatePath(`/projects/${validated.projectId}`);
  revalidatePath('/sites');
  return newSite;
}

export async function createWorkfront(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = workfrontSchema.parse(data);

  const [newWorkfront] = await db.insert(workfronts).values({
    ...validated,
    orgId,
  }).returning();

  await invalidateCache(`org:${orgId}:workfronts`);

  revalidatePath(`/sites/${validated.siteId}`);
  revalidatePath('/sites');
  return newWorkfront;
}

export async function createActivity(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = activitySchema.parse(data);

  const [newActivity] = await db.insert(activities).values({
    ...validated,
    orgId,
  }).returning();

  await invalidateCache(`org:${orgId}:activities`);
  await invalidateCache(`org:${orgId}:dashboard:stats`);
  await invalidateCache(`org:${orgId}:reports:gantt`);

  revalidatePath(`/sites/${validated.siteId}`);
  revalidatePath('/sites');
  return newActivity;
}


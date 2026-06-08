'use server';

import { db } from '@/lib/db/db';
import { organizations, profiles } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { organizationSchema, profileSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCachedData, invalidateCache } from '@/lib/redis';

// Query Actions with Redis Caching
export async function getOrganization() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:settings:org`, async () => {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));
    return org || null;
  });
}

export async function getProfile() {
  const { userId } = await getOrgContext();
  return getCachedData(`user:${userId}:settings:profile`, async () => {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId));
    return profile || null;
  });
}

// Write Actions with Cache Invalidation
export async function updateOrganization(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = organizationSchema.parse(data);

  const [updatedOrg] = await db
    .update(organizations)
    .set({
      name: validated.name,
      plan: validated.plan,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId))
    .returning();

  await invalidateCache(`org:${orgId}:settings:org`);

  revalidatePath('/settings');
  return updatedOrg;
}

export async function updateProfile(data: unknown) {
  const { userId } = await getOrgContext();
  const validated = profileSchema.parse(data);

  const [updatedProfile] = await db
    .update(profiles)
    .set({
      fullName: validated.fullName,
      designation: validated.designation,
      phone: validated.phone,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning();

  await invalidateCache(`user:${userId}:settings:profile`);

  revalidatePath('/settings');
  return updatedProfile;
}


'use server';

import { db } from '@/lib/db/db';
import { documents, documentVersions } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { documentSchema } from '@/lib/validations';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCachedData, invalidateCache } from '@/lib/redis';

// Query Actions with Redis Caching
export async function getDocuments() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:documents`, async () => {
    return db
      .select()
      .from(documents)
      .where(eq(documents.orgId, orgId))
      .orderBy(desc(documents.createdAt));
  });
}

// Write Actions with Cache Invalidation
export async function createDocument(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = documentSchema.parse(data);

  const [doc] = await db.insert(documents).values({
    orgId,
    projectId: validated.projectId,
    siteId: validated.siteId,
    title: validated.title,
    docType: validated.docType,
    latestFileUrl: validated.latestFileUrl || '',
    status: validated.status,
    currentVersion: 1,
  }).returning();

  // Insert initial version
  await db.insert(documentVersions).values({
    orgId,
    documentId: doc.id,
    versionNumber: 1,
    fileUrl: validated.latestFileUrl || '',
    changeDescription: 'Initial upload',
  });

  await invalidateCache(`org:${orgId}:documents`);

  revalidatePath('/documents');
  return doc;
}

export async function updateDocumentStatus(docId: string, status: 'draft' | 'under_review' | 'approved' | 'superseded' | 'archived') {
  const { orgId } = await getOrgContext();
  const [doc] = await db
    .update(documents)
    .set({ status })
    .where(eq(documents.id, docId))
    .returning();

  await invalidateCache(`org:${orgId}:documents`);

  revalidatePath('/documents');
  return doc;
}

export async function uploadDocumentVersion(docId: string, fileUrl: string, changeDescription: string) {
  const { orgId } = await getOrgContext();

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId));

  if (!doc) throw new Error('Document not found');

  const nextVer = doc.currentVersion + 1;

  // 1. Update document record
  const [updatedDoc] = await db
    .update(documents)
    .set({
      currentVersion: nextVer,
      latestFileUrl: fileUrl,
    })
    .where(eq(documents.id, docId))
    .returning();

  // 2. Insert into versions
  await db.insert(documentVersions).values({
    orgId,
    documentId: docId,
    versionNumber: nextVer,
    fileUrl,
    changeDescription,
  });

  await invalidateCache(`org:${orgId}:documents`);

  revalidatePath('/documents');
  return updatedDoc;
}


import { db } from '@/lib/db/db';
import { documents, vendors, items } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { eq, desc } from 'drizzle-orm';
import { DocumentsWrapper } from '@/components/DocumentsWrapper';

export default async function DocumentsPage() {
  const { orgId } = await getOrgContext();

  const allDocuments = await db
    .select()
    .from(documents)
    .where(eq(documents.orgId, orgId))
    .orderBy(desc(documents.createdAt));

  const allVendors = await db
    .select()
    .from(vendors)
    .where(eq(vendors.orgId, orgId));

  const allItems = await db
    .select()
    .from(items)
    .where(eq(items.orgId, orgId));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Document OS & drawings</h1>
        <p className="text-slate-400 mt-1">Manage drawing approval vaults, versioning, and AI-enabled OCR invoice indexing</p>
      </div>

      <DocumentsWrapper
        documentsList={allDocuments as unknown as { id: string; title: string; docType: string; currentVersion: number; latestFileUrl: string | null; status: string; createdAt: string }[]}
        vendors={allVendors as unknown as { id: string; name: string }[]}
        items={allItems as unknown as { id: string; name: string }[]}
      />
    </div>
  );
}

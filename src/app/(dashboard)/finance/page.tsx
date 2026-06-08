import { db } from '@/lib/db/db';
import { measurementBooks, invoices, subcontractWorkOrders, vendors, sites, activities } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { eq, desc } from 'drizzle-orm';
import { FinanceWrapper } from '@/components/FinanceWrapper';

export default async function FinancePage() {
  const { orgId } = await getOrgContext();

  const allVendors = await db
    .select()
    .from(vendors)
    .where(eq(vendors.orgId, orgId));

  const allSites = await db
    .select()
    .from(sites)
    .where(eq(sites.orgId, orgId));

  const allActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.orgId, orgId));

  const mbs = await db
    .select({
      id: measurementBooks.id,
      mbNumber: measurementBooks.mbNumber,
      periodStart: measurementBooks.periodStart,
      periodEnd: measurementBooks.periodEnd,
      status: measurementBooks.status,
      netPayable: measurementBooks.netPayable,
      siteName: sites.name,
      vendorName: vendors.name,
    })
    .from(measurementBooks)
    .innerJoin(sites, eq(measurementBooks.siteId, sites.id))
    .innerJoin(vendors, eq(measurementBooks.vendorId, vendors.id))
    .where(eq(measurementBooks.orgId, orgId))
    .orderBy(desc(measurementBooks.mbNumber));

  const invs = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      referenceType: invoices.referenceType,
      subtotal: invoices.subtotal,
      cgstAmount: invoices.cgstAmount,
      sgstAmount: invoices.sgstAmount,
      tdsAmount: invoices.tdsAmount,
      totalAmount: invoices.totalAmount,
      amountPaid: invoices.amountPaid,
      status: invoices.status,
      paymentStatus: invoices.paymentStatus,
      vendorName: vendors.name,
    })
    .from(invoices)
    .innerJoin(vendors, eq(invoices.vendorId, vendors.id))
    .where(eq(invoices.orgId, orgId))
    .orderBy(desc(invoices.invoiceNumber))
    .catch(() => []);

  const workOrders = await db
    .select({
      id: subcontractWorkOrders.id,
      woNumber: subcontractWorkOrders.woNumber,
      scopeOfWork: subcontractWorkOrders.scopeOfWork,
      contractValue: subcontractWorkOrders.contractValue,
      vendorName: vendors.name,
    })
    .from(subcontractWorkOrders)
    .innerJoin(vendors, eq(subcontractWorkOrders.vendorId, vendors.id))
    .where(eq(subcontractWorkOrders.orgId, orgId))
    .orderBy(desc(subcontractWorkOrders.woNumber))
    .catch(() => []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Finance & RA Billing</h1>
        <p className="text-slate-400 mt-1">Manage measurement books certification, running account bills, and subcontractor liabilities</p>
      </div>

      <FinanceWrapper
        mbs={mbs as unknown as { id: string; mbNumber: string; periodStart: string; periodEnd: string; status: string; netPayable: string; siteName: string; vendorName: string }[]}
        invoices={invs as unknown as { id: string; invoiceNumber: string; invoiceDate: string; referenceType: string; subtotal: string; cgstAmount: string; sgstAmount: string; tdsAmount: string; totalAmount: string; amountPaid: string; status: string; paymentStatus: string; vendorName: string }[]}
        workOrders={workOrders as unknown as { id: string; woNumber: string; scopeOfWork: string; contractValue: string; vendorName: string }[]}
        vendors={allVendors as unknown as { id: string; name: string }[]}
        sites={allSites as unknown as { id: string; name: string }[]}
        activities={allActivities as unknown as { id: string; name: string; siteId: string }[]}
      />
    </div>
  );
}

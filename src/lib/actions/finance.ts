'use server';

import { db } from '@/lib/db/db';
import { measurementBooks, mbEntries, subcontractWorkOrders, invoices, payments, retentionRegister, tdsEntries, sites, vendors } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { mbSchema, workOrderSchema, invoiceSchema, paymentSchema } from '@/lib/validations';
import { eq, sql, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCachedData, invalidateCache } from '@/lib/redis';

// Query Actions with Redis Caching
export async function getMeasurementBooks() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:finance:mbs`, async () => {
    return db
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
  });
}

export async function getInvoices() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:finance:invoices`, async () => {
    return db
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
      .orderBy(desc(invoices.invoiceNumber));
  });
}

export async function getSubcontractWorkOrders() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:finance:workOrders`, async () => {
    return db
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
      .orderBy(desc(subcontractWorkOrders.woNumber));
  });
}

// Write Actions with Cache Invalidation
export async function createMeasurementBook(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = mbSchema.parse(data);

  // 1. Insert MB Header
  const [newMB] = await db.insert(measurementBooks).values({
    orgId,
    siteId: validated.siteId,
    vendorId: validated.vendorId,
    workOrderId: validated.workOrderId,
    mbNumber: validated.mbNumber,
    periodStart: validated.periodStart,
    periodEnd: validated.periodEnd,
    status: validated.status || 'draft',
  }).returning();

  // 2. Insert MB Entries
  for (const entry of validated.entries) {
    await db.insert(mbEntries).values({
      orgId,
      mbId: newMB.id,
      activityId: entry.activityId,
      claimedQty: entry.claimedQty,
      certifiedQty: entry.certifiedQty || entry.claimedQty,
      rate: entry.rate,
      remarks: entry.remarks,
    });
  }

  // 3. Recalculate net payable
  const [totalMB] = await db
    .select({ total: sql<string>`sum(coalesce(certified_qty, claimed_qty::numeric) * rate::numeric)` })
    .from(mbEntries)
    .where(eq(mbEntries.mbId, newMB.id));

  const netPayable = totalMB?.total || '0';
  await db
    .update(measurementBooks)
    .set({ netPayable })
    .where(eq(measurementBooks.id, newMB.id));

  await invalidateCache(`org:${orgId}:finance:mbs`);

  revalidatePath('/finance');
  return newMB;
}

export async function createWorkOrder(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = workOrderSchema.parse(data);

  const [wo] = await db.insert(subcontractWorkOrders).values({
    orgId,
    siteId: validated.siteId,
    vendorId: validated.vendorId,
    woNumber: validated.woNumber,
    scopeOfWork: validated.scopeOfWork,
    contractValue: validated.contractValue,
    retentionPct: validated.retentionPct,
    status: 'active',
  }).returning();

  await invalidateCache(`org:${orgId}:finance:workOrders`);

  revalidatePath('/finance');
  return wo;
}

export async function certifyMeasurementBook(mbId: string, certifierId: string) {
  const { orgId } = await getOrgContext();
  const [mb] = await db
    .update(measurementBooks)
    .set({
      status: 'certified',
    })
    .where(eq(measurementBooks.id, mbId))
    .returning();

  await invalidateCache(`org:${orgId}:finance:mbs`);

  revalidatePath('/finance');
  return mb;
}

export async function generateRABill(mbId: string) {
  const { orgId } = await getOrgContext();

  // 1. Fetch MB
  const [mb] = await db
    .select()
    .from(measurementBooks)
    .where(eq(measurementBooks.id, mbId));

  if (!mb) throw new Error('MB not found');

  // Fetch subcontract work order to find retention %
  let retentionPct = 10;
  if (mb.workOrderId) {
    const [wo] = await db
      .select()
      .from(subcontractWorkOrders)
      .where(eq(subcontractWorkOrders.id, mb.workOrderId));
    if (wo) {
      retentionPct = Number(wo.retentionPct || 10);
    }
  }

  const subtotalVal = Number(mb.netPayable || 0);

  // 2. Perform RA Bill Deductions
  const retentionVal = subtotalVal * (retentionPct / 100);
  const tdsVal = subtotalVal * 0.02; // Standard 2% TDS on contract bills
  const gstVal = subtotalVal * 0.18; // Standard 18% GST addition

  const totalAmountVal = subtotalVal + gstVal - retentionVal - tdsVal;

  // 3. Create Invoice (RA Bill)
  const [invoice] = await db.insert(invoices).values({
    orgId,
    siteId: mb.siteId,
    vendorId: mb.vendorId,
    invoiceNumber: `RA-BILL-${mb.mbNumber}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    referenceType: 'MB',
    referenceId: mbId,
    subtotal: subtotalVal.toFixed(2),
    cgstAmount: (gstVal / 2).toFixed(2),
    sgstAmount: (gstVal / 2).toFixed(2),
    tdsAmount: tdsVal.toFixed(2),
    otherDeductions: '0.00',
    totalAmount: totalAmountVal.toFixed(2),
    status: 'approved',
    paymentStatus: 'pending',
  }).returning();

  // 4. Log to Retention Register
  await db.insert(retentionRegister).values({
    orgId,
    siteId: mb.siteId,
    vendorId: mb.vendorId,
    workOrderId: mb.workOrderId,
    mbId: mbId,
    amountWithheld: retentionVal.toFixed(2),
    status: 'withheld',
  });

  // 5. Update MB status to 'billed'
  await db
    .update(measurementBooks)
    .set({ status: 'billed' })
    .where(eq(measurementBooks.id, mbId));

  await invalidateCache(`org:${orgId}:finance:mbs`);
  await invalidateCache(`org:${orgId}:finance:invoices`);
  await invalidateCache(`org:${orgId}:reports:liability`);

  revalidatePath('/finance');
  return invoice;
}

export async function recordPayment(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = paymentSchema.parse(data);

  // 1. Insert Payment
  const [payment] = await db.insert(payments).values({
    orgId,
    vendorId: validated.vendorId,
    invoiceId: validated.invoiceId,
    amount: validated.amount,
    paymentMode: validated.paymentMode,
    referenceNumber: validated.referenceNumber,
    status: 'paid',
  }).returning();

  // 2. Update Invoice Paid Amount
  if (validated.invoiceId) {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, validated.invoiceId));

    if (invoice) {
      const newPaidVal = Number(invoice.amountPaid || 0) + Number(validated.amount);
      const isFullyPaid = newPaidVal >= Number(invoice.totalAmount);

      await db
        .update(invoices)
        .set({
          amountPaid: newPaidVal.toFixed(2),
          paymentStatus: isFullyPaid ? 'paid' : 'on_hold',
        })
        .where(eq(invoices.id, validated.invoiceId));
    }
  }

  await invalidateCache(`org:${orgId}:finance:invoices`);
  await invalidateCache(`org:${orgId}:dashboard:stats`);
  await invalidateCache(`org:${orgId}:reports:liability`);

  revalidatePath('/finance');
  return payment;
}


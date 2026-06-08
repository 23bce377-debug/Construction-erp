'use server';

import { db } from '@/lib/db/db';
import { vendors, purchaseOrders, poItems, purchaseRequisitions, prItems, grn, grnItems, inventoryLedger, inventoryStock, stores, items, sites } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { vendorSchema, poSchema, prSchema, grnSchema } from '@/lib/validations';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCachedData, invalidateCache } from '@/lib/redis';

// Query Actions with Redis Caching
export async function getVendors() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:vendors`, async () => {
    return db
      .select()
      .from(vendors)
      .where(eq(vendors.orgId, orgId));
  });
}

export async function getItems() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:items`, async () => {
    return db
      .select()
      .from(items)
      .where(eq(items.orgId, orgId));
  });
}

export async function getStores() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:stores`, async () => {
    return db
      .select()
      .from(stores)
      .where(eq(stores.orgId, orgId));
  });
}

export async function getPurchaseOrders() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:procurement:pos`, async () => {
    return db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        poDate: purchaseOrders.poDate,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        vendorName: vendors.name,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.orgId, orgId))
      .orderBy(desc(purchaseOrders.createdAt));
  });
}

export async function getPurchaseRequisitions() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:procurement:prs`, async () => {
    return db
      .select({
        id: purchaseRequisitions.id,
        prNumber: purchaseRequisitions.prNumber,
        siteName: sites.name,
        status: purchaseRequisitions.status,
        createdAt: purchaseRequisitions.createdAt,
      })
      .from(purchaseRequisitions)
      .innerJoin(sites, eq(purchaseRequisitions.siteId, sites.id))
      .where(eq(purchaseRequisitions.orgId, orgId))
      .orderBy(desc(purchaseRequisitions.createdAt));
  });
}

export async function getInventoryStock() {
  const { orgId } = await getOrgContext();
  return getCachedData(`org:${orgId}:procurement:stock`, async () => {
    return db
      .select({
        storeName: stores.name,
        itemName: items.name,
        itemCode: items.code,
        uom: items.uom,
        qtyOnHand: inventoryStock.qtyOnHand,
        reorderLevel: inventoryStock.reorderLevel,
      })
      .from(inventoryStock)
      .innerJoin(stores, eq(inventoryStock.storeId, stores.id))
      .innerJoin(items, eq(inventoryStock.itemId, items.id))
      .where(eq(stores.orgId, orgId));
  });
}

// Write Actions with Cache Invalidation
export async function createVendor(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = vendorSchema.parse(data);

  const [newVendor] = await db.insert(vendors).values({
    ...validated,
    orgId,
  }).returning();

  await invalidateCache(`org:${orgId}:vendors`);

  revalidatePath('/procurement');
  return newVendor;
}

export async function createPO(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = poSchema.parse(data);

  // 1. Insert PO Header
  const [newPO] = await db.insert(purchaseOrders).values({
    orgId,
    vendorId: validated.vendorId,
    siteId: validated.siteId,
    poNumber: validated.poNumber,
    poDate: validated.poDate ? new Date(validated.poDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: validated.status,
    totalAmount: validated.totalAmount,
  }).returning();

  // 2. Insert PO Items if any
  if (validated.items && validated.items.length > 0) {
    for (const item of validated.items) {
      await db.insert(poItems).values({
        orgId,
        poId: newPO.id,
        itemId: item.itemId,
        qty: item.qty,
        unitRate: item.unitRate,
        uom: item.uom,
      });
    }
  }

  await invalidateCache(`org:${orgId}:procurement:pos`);
  await invalidateCache(`org:${orgId}:dashboard:stats`);

  revalidatePath('/procurement');
  return newPO;
}

export async function createPR(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = prSchema.parse(data);

  // 1. Insert PR Header
  const [newPR] = await db.insert(purchaseRequisitions).values({
    orgId,
    siteId: validated.siteId,
    prNumber: validated.prNumber,
    notes: validated.notes,
    status: 'pending_approval',
  }).returning();

  // 2. Insert PR Items
  for (const item of validated.items) {
    await db.insert(prItems).values({
      orgId,
      prId: newPR.id,
      itemId: item.itemId,
      requestedQty: item.requestedQty,
      uom: item.uom,
    });
  }

  await invalidateCache(`org:${orgId}:procurement:prs`);

  revalidatePath('/procurement');
  return newPR;
}

export async function createGRN(data: unknown) {
  const { orgId } = await getOrgContext();
  const validated = grnSchema.parse(data);

  // 1. Insert GRN Header
  const [newGRN] = await db.insert(grn).values({
    orgId,
    siteId: validated.siteId,
    storeId: validated.storeId,
    poId: validated.poId,
    vendorId: validated.vendorId,
    grnNumber: validated.grnNumber,
    status: 'accepted',
  }).returning();

  // 2. Insert GRN Items & Update Stock & Log in Ledger
  for (const item of validated.items) {
    await db.insert(grnItems).values({
      orgId,
      grnId: newGRN.id,
      itemId: item.itemId,
      receivedQty: item.receivedQty,
      acceptedQty: item.acceptedQty,
      uom: item.uom,
      unitRate: item.unitRate,
    });

    // Write to Inventory Ledger
    await db.insert(inventoryLedger).values({
      orgId,
      siteId: validated.siteId,
      itemId: item.itemId,
      transactionType: 'RECEIPT',
      qty: item.acceptedQty,
      uom: item.uom,
      referenceId: newGRN.id,
    });

    // Update PO Received Quantities if PO is linked
    if (validated.poId) {
      const pItems = await db
        .select()
        .from(poItems)
        .where(and(eq(poItems.poId, validated.poId), eq(poItems.itemId, item.itemId)));

      if (pItems.length > 0) {
        const newReceivedQty = (Number(pItems[0].receivedQty || 0) + Number(item.acceptedQty)).toString();
        await db
          .update(poItems)
          .set({ receivedQty: newReceivedQty })
          .where(eq(poItems.id, pItems[0].id));
      }
    }
  }

  await invalidateCache(`org:${orgId}:procurement:stock`);
  await invalidateCache(`org:${orgId}:procurement:pos`);
  await invalidateCache(`org:${orgId}:reports:aging`);

  revalidatePath('/procurement');
  return newGRN;
}


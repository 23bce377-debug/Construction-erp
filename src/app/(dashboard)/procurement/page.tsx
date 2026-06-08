import { db } from '@/lib/db/db';
import { purchaseOrders, purchaseRequisitions, inventoryStock, stores, items, vendors, sites } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { eq, desc } from 'drizzle-orm';
import { ProcurementWrapper } from '@/components/ProcurementWrapper';

export default async function ProcurementPage() {
  const { orgId } = await getOrgContext();

  const allVendors = await db
    .select()
    .from(vendors)
    .where(eq(vendors.orgId, orgId));

  const allSites = await db
    .select()
    .from(sites)
    .where(eq(sites.orgId, orgId));

  const allItems = await db
    .select()
    .from(items)
    .where(eq(items.orgId, orgId));

  const allStores = await db
    .select()
    .from(stores)
    .where(eq(stores.orgId, orgId));

  const pos = await db
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

  const prs = await db
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
    .orderBy(desc(purchaseRequisitions.createdAt))
    .catch(() => []);

  const stock = await db
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
    .where(eq(stores.orgId, orgId))
    .catch(() => []);

  // Fallback demo seed if empty
  const stockData = stock.length > 0 ? stock : [
    { storeName: 'Central Site Store', itemName: 'Cement (OPC 53 Grade)', itemCode: 'CEM-OPC-53', uom: 'BAG', qtyOnHand: '150.000', reorderLevel: '500.000' },
    { storeName: 'Central Site Store', itemName: 'Steel Rebars (8mm)', itemCode: 'STL-REB-8MM', uom: 'MT', qtyOnHand: '12.450', reorderLevel: '5.000' },
    { storeName: 'Central Site Store', itemName: 'Coarse Sand', itemCode: 'SND-COARSE', uom: 'CFT', qtyOnHand: '2400.000', reorderLevel: '1000.000' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Procurement & Stores</h1>
        <p className="text-slate-400 mt-1">Manage purchase orders, requisitions, inventory, and vendor logs</p>
      </div>

      <ProcurementWrapper
        pos={pos as unknown as { id: string; poNumber: string; poDate: string; status: string; totalAmount: string; vendorName: string }[]}
        prs={prs as unknown as { id: string; prNumber: string; siteName: string; status: string; createdAt: string }[]}
        stock={stockData as unknown as { storeName: string; itemName: string; itemCode: string; uom: string; qtyOnHand: string; reorderLevel: string | null }[]}
        vendors={allVendors as unknown as { id: string; name: string }[]}
        sites={allSites as unknown as { id: string; name: string }[]}
        items={allItems as unknown as { id: string; name: string; code: string; uom: string }[]}
        stores={allStores as unknown as { id: string; name: string }[]}
      />
    </div>
  );
}

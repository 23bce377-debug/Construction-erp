import { db } from './db';
import { 
  organizations, 
  profiles, 
  projects, 
  sites, 
  workfronts, 
  costCodes, 
  activities, 
  vendors, 
  workers, 
  items, 
  stores,
  inventoryStock
} from './schema';
import { eq } from 'drizzle-orm';

const orgId = "00000000-0000-0000-0000-000000000001";
const userId = "00000000-0000-0000-0000-000000000001";

export async function seedDatabase() {
  try {
    // 1. Check/Insert Organization
    const existingOrg = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (existingOrg.length === 0) {
      await db.insert(organizations).values({
        id: orgId,
        name: "ConstOS Corp",
        slug: "constos-corp",
        plan: "enterprise",
        isActive: true,
      });
      console.log('Seeded Organization');
    }

    // 2. Check/Insert Profile
    const existingProfile = await db.select().from(profiles).where(eq(profiles.id, userId));
    if (existingProfile.length === 0) {
      await db.insert(profiles).values({
        id: userId,
        fullName: "Hrushikesh Manager",
        designation: "Project Director",
        phone: "9876543210",
        isActive: true,
      });
      console.log('Seeded Profile');
    }

    // 3. Check/Insert Project
    const existingProjects = await db.select().from(projects).where(eq(projects.orgId, orgId));
    let projId = "";
    if (existingProjects.length === 0) {
      const [newProj] = await db.insert(projects).values({
        orgId,
        name: "Apex Smart City Hub",
        code: "APX-SCH-01",
        clientName: "Smart City Development Authority",
        contractValue: "85000000.00",
        status: "active",
        startDate: "2026-01-01",
        endDate: "2027-12-31",
      }).returning();
      projId = newProj.id;
      console.log('Seeded Project');
    } else {
      projId = existingProjects[0].id;
    }

    // 4. Check/Insert Sites
    const existingSites = await db.select().from(sites).where(eq(sites.orgId, orgId));
    let siteId1 = "";
    let siteId2 = "";
    if (existingSites.length === 0) {
      const [site1] = await db.insert(sites).values({
        orgId,
        projectId: projId,
        name: "Basement Foundation Site",
        siteCode: "SITE-BASE-01",
        address: "Sector 15, Smart City Area",
        status: "active",
      }).returning();
      siteId1 = site1.id;

      const [site2] = await db.insert(sites).values({
        orgId,
        projectId: projId,
        name: "Tower A Structural Frame",
        siteCode: "SITE-TOWRA-02",
        address: "Sector 15, Block B Ground",
        status: "setup",
      }).returning();
      siteId2 = site2.id;
      console.log('Seeded Sites');
    } else {
      siteId1 = existingSites[0].id;
      siteId2 = existingSites[1]?.id || siteId1;
    }

    // 5. Check/Insert Cost Codes
    const existingCostCodes = await db.select().from(costCodes).where(eq(costCodes.orgId, orgId));
    let ccId1 = "";
    let ccId2 = "";
    if (existingCostCodes.length === 0) {
      const [cc1] = await db.insert(costCodes).values({
        orgId,
        code: "C10-EXCAV",
        description: "Excavation & Earthwork",
        uom: "CUM",
        costCategory: "civil",
      }).returning();
      ccId1 = cc1.id;

      const [cc2] = await db.insert(costCodes).values({
        orgId,
        code: "C30-CONCR",
        description: "Concrete Pouring M25",
        uom: "CUM",
        costCategory: "civil",
      }).returning();
      ccId2 = cc2.id;
      console.log('Seeded Cost Codes');
    } else {
      ccId1 = existingCostCodes[0].id;
      ccId2 = existingCostCodes[1]?.id || ccId1;
    }

    // 6. Check/Insert Workfronts
    const existingWorkfronts = await db.select().from(workfronts).where(eq(workfronts.orgId, orgId));
    let wfId1 = "";
    let wfId2 = "";
    if (existingWorkfronts.length === 0) {
      const [wf1] = await db.insert(workfronts).values({
        orgId,
        siteId: siteId1,
        name: "Block A Foundation Zone",
        levelType: "Block",
        status: "in_progress",
      }).returning();
      wfId1 = wf1.id;

      const [wf2] = await db.insert(workfronts).values({
        orgId,
        siteId: siteId2,
        name: "Tower B Column Grid",
        levelType: "Tower",
        status: "pending",
      }).returning();
      wfId2 = wf2.id;
      console.log('Seeded Workfronts');
    } else {
      wfId1 = existingWorkfronts[0].id;
      wfId2 = existingWorkfronts[1]?.id || wfId1;
    }

    // 7. Check/Insert Activities
    const existingActivities = await db.select().from(activities).where(eq(activities.orgId, orgId));
    if (existingActivities.length === 0) {
      await db.insert(activities).values({
        orgId,
        siteId: siteId1,
        workfrontId: wfId1,
        costCodeId: ccId1,
        name: "Excavation for Foundation Block A",
        plannedQty: "1200.000",
        uom: "CUM",
        status: "in_progress",
        completionPct: "45.00",
      });

      await db.insert(activities).values({
        orgId,
        siteId: siteId1,
        workfrontId: wfId1,
        costCodeId: ccId2,
        name: "Concrete footing pour",
        plannedQty: "450.000",
        uom: "CUM",
        status: "planned",
        completionPct: "0.00",
      });
      console.log('Seeded Activities');
    }

    // 8. Check/Insert Vendors
    const existingVendors = await db.select().from(vendors).where(eq(vendors.orgId, orgId));
    let vendorId = "";
    if (existingVendors.length === 0) {
      const [v] = await db.insert(vendors).values({
        orgId,
        name: "Apex Subcontractors Ltd",
        gstin: "27AAAAA1111A1Z1",
        vendorType: ["subcontractor", "supplier"],
        isActive: true,
      }).returning();
      vendorId = v.id;
      console.log('Seeded Vendors');
    } else {
      vendorId = existingVendors[0].id;
    }

    // 9. Check/Insert Workers
    const existingWorkers = await db.select().from(workers).where(eq(workers.orgId, orgId));
    if (existingWorkers.length === 0) {
      await db.insert(workers).values({
        orgId,
        subcontractorId: vendorId,
        name: "Ramesh Sharma",
        trade: "Carpentry",
        skillLevel: "skilled",
        isActive: true,
      });

      await db.insert(workers).values({
        orgId,
        subcontractorId: vendorId,
        name: "Suresh Kumar",
        trade: "Masonry",
        skillLevel: "semi_skilled",
        isActive: true,
      });
      console.log('Seeded Workers');
    }

    // 10. Check/Insert Items & Stores
    const existingItems = await db.select().from(items).where(eq(items.orgId, orgId));
    let itemId1 = "";
    if (existingItems.length === 0) {
      const [item1] = await db.insert(items).values({
        orgId,
        code: "CEM-OPC-53",
        name: "Cement (OPC 53 Grade)",
        uom: "BAG",
        itemType: "material",
        gstRate: "18.00",
      }).returning();
      itemId1 = item1.id;

      await db.insert(items).values({
        orgId,
        code: "STL-REB-8MM",
        name: "Steel Rebars (8mm)",
        uom: "MT",
        itemType: "material",
        gstRate: "18.00",
      });
      console.log('Seeded Items');
    } else {
      itemId1 = existingItems[0].id;
    }

    const existingStores = await db.select().from(stores).where(eq(stores.orgId, orgId));
    let storeId = "";
    if (existingStores.length === 0) {
      const [st] = await db.insert(stores).values({
        orgId,
        siteId: siteId1,
        name: "Central Site Store",
        storeType: "site_store",
      }).returning();
      storeId = st.id;
      console.log('Seeded Store');
    } else {
      storeId = existingStores[0].id;
    }

    // Insert inventory stock link
    const existingStock = await db.select().from(inventoryStock).where(eq(inventoryStock.storeId, storeId));
    if (existingStock.length === 0 && storeId && itemId1) {
      await db.insert(inventoryStock).values({
        storeId,
        itemId: itemId1,
        qtyOnHand: "450.000",
        reorderLevel: "500.000",
      });
      console.log('Seeded Stock Link');
    }

  } catch (err) {
    console.error('Seeding database failed:', err);
  }
}

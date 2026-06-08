import { pgTable, uuid, text, timestamp, boolean, pgEnum, numeric, integer, date, jsonb } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

// --- ENUMS ---
export const orgRoleEnum = pgEnum("org_role", ['owner','admin','project_director','site_engineer','purchase_head','store_keeper','finance','hr_admin','viewer','vendor_portal','client_portal']);
export const projectStatusEnum = pgEnum("project_status", ['planning','active','on_hold','completed','cancelled']);
export const siteStatusEnum = pgEnum("site_status", ['setup','active','suspended','completed','closed']);
export const workfrontStatusEnum = pgEnum("workfront_status", ['pending','in_progress','completed','blocked','on_hold']);
export const itemTypeEnum = pgEnum("item_type", ['material','labour','equipment','service','ppe']);
export const prStatusEnum = pgEnum("pr_status", ['draft','pending_approval','approved','po_created','cancelled']);
export const poStatusEnum = pgEnum("po_status", ['draft','pending_approval','approved','sent_to_vendor','partially_received','fully_received','cancelled','closed']);
export const grnStatusEnum = pgEnum("grn_status", ['draft','quality_check','accepted','partially_accepted','rejected']);
export const invoiceStatusEnum = pgEnum("invoice_status", ['draft','submitted','under_review','approved','rejected','paid','partially_paid']);
export const paymentStatusTypeEnum = pgEnum("payment_status_type", ['pending','processing','paid','failed','reversed','on_hold']);
export const inventoryTxnTypeEnum = pgEnum("inventory_txn_type", ['RECEIPT','ISSUE','RETURN','SCRAP','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','OPENING_STOCK']);
export const mbStatusEnum = pgEnum("mb_status", ['draft','submitted','under_certification','certified','billed','paid','disputed']);
export const blockerTypeEnum = pgEnum("blocker_type", ['material_shortage','labour_shortage','design_pending','payment_pending','approval_pending','weather_delay','equipment_breakdown','access_restriction','safety_hold','client_hold','statutory_hold','other']);
export const blockerStatusTypeEnum = pgEnum("blocker_status_type", ['open','escalated','in_progress','resolved','closed']);
export const complianceDocStatusEnum = pgEnum("compliance_doc_status", ['valid','expiring_soon','expired','pending','rejected']);
export const workflowStatusEnum = pgEnum("workflow_status", ['pending','approved','rejected','cancelled','escalated']);
export const documentStatusEnum = pgEnum("document_status", ['draft','under_review','approved','superseded','archived']);
export const skillLevelEnum = pgEnum("skill_level", ['unskilled','semi_skilled','skilled','highly_skilled']);
export const costStateEnum = pgEnum("cost_state", ['planned','committed','consumed','installed','billed']);

// --- TABLES ---

// Phase 1: Foundation
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("starter"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // Auth.users ref
  fullName: text("full_name").notNull(),
  designation: text("designation"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userOrgMemberships = pgTable("user_org_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  role: orgRoleEnum("role").notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Phase 2: Project Hierarchy
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("project_code"),
  clientName: text("client_name"),
  contractValue: numeric("contract_value", { precision: 18, scale: 2 }),
  status: projectStatusEnum("status").notNull().default("planning"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  siteCode: text("site_code"),
  address: text("address"),
  status: siteStatusEnum("status").notNull().default("setup"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workfronts = pgTable("workfronts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  parentId: uuid("parent_id"), // Self-reference
  levelType: text("level_type").notNull(), // Block|Tower|Floor|Zone
  name: text("name").notNull(),
  status: workfrontStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const costCodes = pgTable("cost_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  parent_id: uuid("parent_id"),
  code: text("code").notNull(),
  description: text("description").notNull(),
  uom: text("uom").notNull().default("NOS"),
  costCategory: text("cost_category"),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  workfrontId: uuid("workfront_id").notNull().references(() => workfronts.id),
  costCodeId: uuid("cost_code_id").references(() => costCodes.id),
  name: text("name").notNull(),
  plannedQty: numeric("planned_qty", { precision: 14, scale: 3 }),
  uom: text("uom").notNull().default("NOS"),
  status: text("status").notNull().default("planned"),
  completionPct: numeric("completion_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Phase 3: Workforce
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  gstin: text("gstin"),
  vendorType: text("vendor_type").array().notNull().default(['supplier']),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workers = pgTable("workers", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  subcontractorId: uuid("subcontractor_id").references(() => vendors.id),
  name: text("name").notNull(),
  trade: text("trade").notNull(),
  skillLevel: skillLevelEnum("skill_level").notNull().default("unskilled"),
  isActive: boolean("is_active").notNull().default(true),
});

export const workerAttendance = pgTable("worker_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  workerId: uuid("worker_id").notNull().references(() => workers.id),
  attendanceDate: date("attendance_date").notNull(),
  shift: text("shift").notNull().default("day"),
  hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }),
  attendanceType: text("attendance_type").notNull().default("present"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dprs = pgTable("dprs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  dprDate: date("dpr_date").notNull(),
  weather: text("weather"),
  totalWorkers: integer("total_workers").notNull().default(0),
  remarks: text("remarks"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dprProgressEntries = pgTable("dpr_progress_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  dprId: uuid("dpr_id").notNull().references(() => dprs.id),
  activityId: uuid("activity_id").notNull().references(() => activities.id),
  qtyDoneToday: numeric("qty_done_today", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Phase 4: Procurement & Inventory
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  uom: text("uom").notNull().default("NOS"),
  itemType: itemTypeEnum("item_type").notNull().default("material"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
});

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").references(() => sites.id),
  name: text("name").notNull(),
  storeType: text("store_type").notNull().default("site_store"),
});

export const inventoryStock = pgTable("inventory_stock", {
  storeId: uuid("store_id").notNull().references(() => stores.id),
  itemId: uuid("item_id").notNull().references(() => items.id),
  qtyOnHand: numeric("qty_on_hand", { precision: 14, scale: 3 }).notNull().default("0"),
  reservedQty: numeric("reserved_qty", { precision: 14, scale: 3 }).notNull().default("0"),
  reorderLevel: numeric("reorder_level", { precision: 14, scale: 3 }),
});

export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  prNumber: text("pr_number").notNull(),
  requestedBy: uuid("requested_by").notNull().references(() => profiles.id),
  requiredDate: date("required_date"),
  priority: text("priority").notNull().default("normal"),
  status: prStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const prItems = pgTable("pr_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  prId: uuid("pr_id").notNull().references(() => purchaseRequisitions.id),
  itemId: uuid("item_id").notNull().references(() => items.id),
  requestedQty: numeric("requested_qty", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  siteId: uuid("site_id").references(() => sites.id),
  poNumber: text("po_number").notNull(),
  poDate: date("po_date").notNull().defaultNow(),
  status: poStatusEnum("status").notNull().default("draft"),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const poItems = pgTable("po_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  poId: uuid("po_id").notNull().references(() => purchaseOrders.id),
  itemId: uuid("item_id").notNull().references(() => items.id),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  receivedQty: numeric("received_qty", { precision: 14, scale: 3 }).notNull().default("0"),
  uom: text("uom").notNull(),
  unitRate: numeric("unit_rate", { precision: 14, scale: 4 }).notNull(),
});

export const grn = pgTable("grn", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  poId: uuid("po_id").references(() => purchaseOrders.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  grnNumber: text("grn_number").notNull(),
  grnDate: date("grn_date").notNull().defaultNow(),
  status: grnStatusEnum("status").notNull().default("draft"),
});

export const grnItems = pgTable("grn_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  grnId: uuid("grn_id").notNull().references(() => grn.id),
  itemId: uuid("item_id").notNull().references(() => items.id),
  receivedQty: numeric("received_qty", { precision: 14, scale: 3 }).notNull(),
  acceptedQty: numeric("accepted_qty", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  unitRate: numeric("unit_rate", { precision: 14, scale: 4 }),
});

export const inventoryLedger = pgTable("inventory_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  itemId: uuid("item_id").notNull().references(() => items.id),
  transactionType: text("transaction_type").notNull(), // RECEIPT|ISSUE|RETURN
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  uom: text("uom").notNull(),
  referenceId: uuid("reference_id"), // GRN_ID etc
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Phase 5: Finance
export const subcontractWorkOrders = pgTable("subcontract_work_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  woNumber: text("wo_number").notNull(),
  woDate: date("wo_date").notNull().defaultNow(),
  scopeOfWork: text("scope_of_work").notNull(),
  contractValue: numeric("contract_value", { precision: 18, scale: 2 }).notNull(),
  retentionPct: numeric("retention_pct", { precision: 5, scale: 2 }).notNull().default("10"),
  status: text("status").notNull().default("active"),
});

export const measurementBooks = pgTable("measurement_books", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  workOrderId: uuid("work_order_id").references(() => subcontractWorkOrders.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  mbNumber: text("mb_number").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  status: text("status").notNull().default("draft"),
  netPayable: numeric("net_payable", { precision: 18, scale: 2 }).notNull().default("0"),
});

export const mbEntries = pgTable("mb_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  mbId: uuid("mb_id").notNull().references(() => measurementBooks.id),
  activityId: uuid("activity_id").notNull().references(() => activities.id),
  claimedQty: numeric("claimed_qty", { precision: 14, scale: 3 }).notNull(),
  certifiedQty: numeric("certified_qty", { precision: 14, scale: 3 }),
  rate: numeric("rate", { precision: 14, scale: 4 }).notNull(),
  remarks: text("remarks"),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").references(() => sites.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: date("invoice_date").notNull(),
  referenceType: text("reference_type").notNull(), // PO|MB|WO|DIRECT
  referenceId: uuid("reference_id"),
  subtotal: numeric("subtotal", { precision: 18, scale: 2 }).notNull(),
  cgstAmount: numeric("cgst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  sgstAmount: numeric("sgst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  igstAmount: numeric("igst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  tdsAmount: numeric("tds_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  otherDeductions: numeric("other_deductions", { precision: 14, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 18, scale: 2 }).notNull().default("0"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  paymentStatus: paymentStatusTypeEnum("payment_status").notNull().default("pending"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  paymentDate: date("payment_date").notNull().defaultNow(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull().default("bank_transfer"),
  referenceNumber: text("reference_number"),
  status: paymentStatusTypeEnum("status").notNull().default("pending"),
});

export const retentionRegister = pgTable("retention_register", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  workOrderId: uuid("work_order_id").references(() => subcontractWorkOrders.id),
  mbId: uuid("mb_id").references(() => measurementBooks.id),
  amountWithheld: numeric("amount_withheld", { precision: 18, scale: 2 }).notNull(),
  withheldDate: date("withheld_date").notNull().defaultNow(),
  amountReleased: numeric("amount_released", { precision: 18, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("withheld"), // withheld|released
});

export const tdsEntries = pgTable("tds_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  paymentId: uuid("payment_id").references(() => payments.id),
  section: text("section").notNull().default("194C"),
  baseAmount: numeric("base_amount", { precision: 18, scale: 2 }).notNull(),
  tdsRate: numeric("tds_rate", { precision: 5, scale: 2 }).notNull(),
  tdsAmount: numeric("tds_amount", { precision: 14, scale: 2 }).notNull(),
  deductionDate: date("deduction_date").notNull(),
});

// Phase 7: Documents & Attachments
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  projectId: uuid("project_id").references(() => projects.id),
  siteId: uuid("site_id").references(() => sites.id),
  title: text("title").notNull(),
  docType: text("doc_type").notNull(), // DRAWING|BOQ|INVOICE etc
  currentVersion: integer("current_version").notNull().default(1),
  latestFileUrl: text("latest_file_url"),
  status: documentStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentVersions = pgTable("document_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  versionNumber: integer("version_number").notNull(),
  fileUrl: text("file_url").notNull(),
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  storagePath: text("storage_path").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- RELATIONS ---

export const workfrontRelations = relations(workfronts, ({ one, many }) => ({
  parent: one(workfronts, { fields: [workfronts.parentId], references: [workfronts.id], relationName: 'parentChild' }),
  children: many(workfronts, { relationName: 'parentChild' }),
  site: one(sites, { fields: [workfronts.siteId], references: [sites.id] }),
}));

export const projectRelations = relations(projects, ({ many }) => ({
  sites: many(sites),
}));

export const siteRelations = relations(sites, ({ one, many }) => ({
  project: one(projects, { fields: [sites.projectId], references: [projects.id] }),
  workfronts: many(workfronts),
  activities: many(activities),
}));

export const activityRelations = relations(activities, ({ one }) => ({
  site: one(sites, { fields: [activities.siteId], references: [sites.id] }),
  workfront: one(workfronts, { fields: [activities.workfrontId], references: [workfronts.id] }),
  costCode: one(costCodes, { fields: [activities.costCodeId], references: [costCodes.id] }),
}));

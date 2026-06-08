import { z } from 'zod';

// Project Validations
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  code: z.string().optional(),
  clientName: z.string().optional(),
  contractValue: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateProjectStatusSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
});

// Site Validations
export const siteSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, 'Site name is required'),
  siteCode: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['setup', 'active', 'suspended', 'completed', 'closed']),
});

// Workfront Validations
export const workfrontSchema = z.object({
  siteId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  levelType: z.string().min(1, 'Level type is required'),
  name: z.string().min(1, 'Workfront name is required'),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'on_hold']).default('pending'),
});

// Activity Validations
export const activitySchema = z.object({
  siteId: z.string().uuid(),
  workfrontId: z.string().uuid(),
  costCodeId: z.string().uuid().optional(),
  name: z.string().min(1, 'Activity name is required'),
  plannedQty: z.string().optional(),
  uom: z.string().default('NOS'),
  status: z.string().default('planned'),
  completionPct: z.string().default('0'),
});

// Procurement Validations
export const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  gstin: z.string().optional(),
  vendorType: z.array(z.string()).default(['supplier']),
});

export const prSchema = z.object({
  siteId: z.string().uuid(),
  prNumber: z.string().min(1, 'PR number is required'),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    requestedQty: z.string(),
    uom: z.string(),
  })).min(1, 'At least one item is required'),
});

export const poSchema = z.object({
  vendorId: z.string().uuid(),
  siteId: z.string().uuid().optional(),
  poNumber: z.string().min(1, 'PO number is required'),
  poDate: z.string().optional(),
  totalAmount: z.string(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'sent_to_vendor', 'partially_received', 'fully_received', 'cancelled', 'closed']),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    qty: z.string(),
    unitRate: z.string(),
    uom: z.string(),
  })).optional(),
});

// GRN Validations
export const grnSchema = z.object({
  siteId: z.string().uuid(),
  storeId: z.string().uuid(),
  poId: z.string().uuid().optional(),
  vendorId: z.string().uuid(),
  grnNumber: z.string().min(1, 'GRN number is required'),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    receivedQty: z.string(),
    acceptedQty: z.string(),
    unitRate: z.string().optional(),
    uom: z.string(),
  })).min(1, 'At least one item is required'),
});

// Workforce Validations
export const workerSchema = z.object({
  subcontractorId: z.string().uuid().optional(),
  name: z.string().min(1, 'Worker name is required'),
  trade: z.string().min(1, 'Trade is required'),
  skillLevel: z.enum(['unskilled', 'semi_skilled', 'skilled', 'highly_skilled']).default('unskilled'),
});

export const attendanceSchema = z.object({
  siteId: z.string().uuid(),
  workerId: z.string().uuid(),
  attendanceDate: z.string(),
  shift: z.string(),
  hoursWorked: z.string().optional(),
  attendanceType: z.string(),
});

// DPR Progress Entries
export const dprSchema = z.object({
  siteId: z.string().uuid(),
  dprDate: z.string(),
  weather: z.string().optional(),
  totalWorkers: z.number().default(0),
  remarks: z.string().optional(),
  progressEntries: z.array(z.object({
    activityId: z.string().uuid(),
    qtyDoneToday: z.string(),
    uom: z.string(),
    remarks: z.string().optional(),
  })).optional(),
});

// Finance Validations
export const workOrderSchema = z.object({
  siteId: z.string().uuid(),
  vendorId: z.string().uuid(),
  woNumber: z.string().min(1, 'Work Order number is required'),
  scopeOfWork: z.string().min(1, 'Scope of work is required'),
  contractValue: z.string(),
  retentionPct: z.string().default('10'),
});

export const mbSchema = z.object({
  siteId: z.string().uuid(),
  vendorId: z.string().uuid(),
  workOrderId: z.string().uuid().optional(),
  mbNumber: z.string().min(1, 'MB number is required'),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: z.string().default('draft'),
  entries: z.array(z.object({
    activityId: z.string().uuid(),
    claimedQty: z.string(),
    certifiedQty: z.string().optional(),
    rate: z.string(),
    remarks: z.string().optional(),
  })).min(1, 'At least one measurement entry is required'),
});

export const invoiceSchema = z.object({
  siteId: z.string().uuid().optional(),
  vendorId: z.string().uuid(),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string(),
  referenceType: z.enum(['PO', 'MB', 'WO', 'DIRECT']),
  referenceId: z.string().uuid().optional(),
  subtotal: z.string(),
  cgstAmount: z.string().default('0'),
  sgstAmount: z.string().default('0'),
  igstAmount: z.string().default('0'),
  tdsAmount: z.string().default('0'),
  otherDeductions: z.string().default('0'),
  totalAmount: z.string(),
});

export const paymentSchema = z.object({
  vendorId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amount: z.string(),
  paymentMode: z.string().default('bank_transfer'),
  referenceNumber: z.string().optional(),
});

// Document Validations
export const documentSchema = z.object({
  projectId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  title: z.string().min(1, 'Document title is required'),
  docType: z.string(),
  latestFileUrl: z.string().optional(),
  status: z.enum(['draft', 'under_review', 'approved', 'superseded', 'archived']).default('draft'),
});

// Settings Validations
export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  plan: z.string().default('starter'),
});

export const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  designation: z.string().optional(),
  phone: z.string().optional(),
});

# ConstructionOS: Finance & Compliance

## Overview
The Finance & Compliance layer is specifically engineered for the complexities of the Indian construction industry. It handles multi-stage billing, statutory withholdings, and labor compliance as native primitives, not bolt-on features.

## Finance Data Model (Indian Context)

### 1. Invoicing & Billing
- **Measurement Books (MB):** The foundation of subcontractor billing. Tracks cumulative work done against a Subcontract Work Order (SWO).
- **RA Bills (Running Account Bills):** Sequential invoices generated from MBs.
- **Final Bills:** The concluding bill that triggers retention release logic.

### 2. Taxation (GST)
- Every transaction (PO, Invoice) supports CGST, SGST, IGST.
- **Reverse Charge Mechanism (RCM):** Flag on items/vendors that shifts tax liability to the contractor.

### 3. Statutory Withholdings (TDS & TCS)
- **`tds_entries` table:** Tracks deductions made against vendor invoices.
- **Sections:** Configurable rates for 194C (Contractors), 194J (Professionals), 194I (Rent).
- Automatically deducts TDS from the net payable amount during invoice approval.

### 4. Retention (Holdback)
- **`retention_ledger`:** Tracks a percentage of every RA Bill withheld for defect liability.
- Tracks Expected Release Date and Actual Release Date per project/vendor.

### 5. Imprest (Petty Cash)
- **`imprest_accounts`:** Site-level cash management.
- Transactions strictly linked to Cost Codes and Activities for accurate project cost roll-ups.

## Labor Compliance Data Model

Indian construction requires strict adherence to labor laws.

### 1. Vendor/Contractor Level
- **PF & ESIC Codes:** Mandatory tracking of subcontractor statutory registration numbers.
- **Labour Licenses:** Validities tracked per site; PO generation blocked if expired.
- **CAR Policy:** Contractors All Risk insurance tracking.

### 2. Worker Level
- **`compliance_documents` table:** Stores BOCW (Building and Other Construction Workers) registration, Medical Fitness Certificates, and Safety Induction records.
- **Aadhaar Verification:** Hashed tracking of unique worker IDs to prevent ghost workers across sites.

## Integration Points
- **Event:** `InvoiceApproved` -> Creates `TDSDeduction` record -> Updates `BudgetConsumption`.
- **Event:** `WorkerAttendanceLogged` -> Checks `ComplianceValidity` -> Flags anomalies if medical cert is expired.
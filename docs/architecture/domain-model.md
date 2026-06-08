# ConstructionOS: Domain Driven Design (DDD)

## Bounded Contexts

### 1. CRM & Contacts
*   **Purpose:** Manage relationships, KYC, and performance of vendors, clients, and consultants.
*   **Aggregates:** `Vendor`, `Client`, `Contact`.
*   **Entities:** `Vendor`, `VendorRateContract`, `Client`, `ContactProfile`.
*   **Value Objects:** `GSTIN`, `PAN`, `BankDetails`, `KYCDocument`.
*   **Domain Events:** `VendorOnboarded`, `VendorBlacklisted`, `RateContractExpired`.
*   **Ownership Rules:** Org Admin / Procurement Head.

### 2. Projects & Sites
*   **Purpose:** Define the structural and geographic hierarchy of execution.
*   **Aggregates:** `Project`, `Site`.
*   **Entities:** `Project`, `Site`, `Workfront` (WBS node).
*   **Value Objects:** `GPSCoordinates`, `ProjectStatus`, `SiteBoundary`.
*   **Domain Events:** `ProjectCreated`, `SiteMobilized`, `SiteSuspended`.
*   **Ownership Rules:** Project Director / Planning Engineer.

### 3. Activities
*   **Purpose:** Track discrete units of work against the WBS and schedule.
*   **Aggregates:** `Activity`, `DailyProgressReport (DPR)`.
*   **Entities:** `Activity`, `DPR`, `ProgressEntry`, `Blocker`.
*   **Value Objects:** `UOM`, `CompletionPercentage`, `WeatherCondition`.
*   **Domain Events:** `ActivityStarted`, `DPRSubmitted`, `WorkBlocked`.
*   **Ownership Rules:** Site Engineer.

### 4. Resources
*   **Purpose:** Master catalog of everything needed to build (Materials, Labor Types, Equipment).
*   **Aggregates:** `ResourceCatalog`.
*   **Entities:** `ItemCategory`, `Item`.
*   **Value Objects:** `ItemCode`, `HSNCode`, `StandardRate`.
*   **Domain Events:** `NewItemAdded`, `ItemRateUpdated`.
*   **Ownership Rules:** Org Admin.

### 5. Labor & Contractors
*   **Purpose:** Manage direct and subcontracted workforce, attendance, and wages.
*   **Aggregates:** `Worker`, `SubcontractorWorkOrder (SWO)`, `Payroll`.
*   **Entities:** `Worker`, `AttendanceRecord`, `PayrollRun`, `PayrollEntry`, `Advance`.
*   **Value Objects:** `AadhaarHash`, `SkillLevel`, `WageRate`, `Shift`.
*   **Domain Events:** `WorkerMobilized`, `AttendanceRecorded`, `PayrollApproved`.
*   **Ownership Rules:** HR Manager / Site Admin.

### 6. Equipment
*   **Purpose:** Manage lifecycle, deployment, and maintenance of machinery.
*   **Aggregates:** `Asset`.
*   **Entities:** `Asset`, `AssetDeployment`, `MaintenanceLog`.
*   **Value Objects:** `AssetStatus`, `OwnershipType` (Owned/Rented).
*   **Domain Events:** `AssetDeployed`, `AssetBreakdown`, `ServiceDue`.
*   **Ownership Rules:** Plant & Machinery (P&M) Manager.

### 7. Inventory
*   **Purpose:** Track material movement and stock levels at specific locations.
*   **Aggregates:** `Store`, `InventoryLedger`.
*   **Entities:** `Store`, `InventoryTransaction`, `StockBalance`.
*   **Value Objects:** `TransactionType` (Receipt/Issue/Transfer), `BatchNo`.
*   **Domain Events:** `MaterialIssued`, `StockOut`, `TransferInitiated`.
*   **Ownership Rules:** Store Manager.

### 8. Procurement
*   **Purpose:** Manage the acquisition of materials and services.
*   **Aggregates:** `PurchaseRequisition (PR)`, `PurchaseOrder (PO)`, `GoodsReceiptNote (GRN)`.
*   **Entities:** `PR`, `PRItem`, `PO`, `POItem`, `GRN`, `GRNItem`.
*   **Value Objects:** `Priority`, `ApprovalStatus`, `DeliveryTerms`.
*   **Domain Events:** `PRApproved`, `POCreated`, `MaterialReceivedAtGate`.
*   **Ownership Rules:** Procurement Manager.

### 9. Finance
*   **Purpose:** Manage budgets, liabilities, payments, and statutory deductions.
*   **Aggregates:** `Budget`, `MeasurementBook (MB)`, `Invoice`, `Payment`.
*   **Entities:** `Budget`, `BudgetItem`, `MB`, `MBEntry`, `Invoice`, `Payment`, `RetentionLedger`.
*   **Value Objects:** `CostCode`, `TDSSection`, `GSTAmount`.
*   **Domain Events:** `BudgetExceeded`, `MBCertified`, `InvoiceApproved`, `PaymentReleased`.
*   **Ownership Rules:** Accountant / Finance Manager.

### 10. Documents
*   **Purpose:** Secure, versioned storage of all project artifacts.
*   **Aggregates:** `Document`.
*   **Entities:** `Document`, `DocumentVersion`, `Attachment`.
*   **Value Objects:** `MimeType`, `DocumentStatus`.
*   **Domain Events:** `DocumentUploaded`, `NewVersionPublished`, `DocumentApproved`.
*   **Ownership Rules:** Document Controller / System.

### 11. Safety & Quality
*   **Purpose:** Ensure compliance with safety standards and quality parameters.
*   **Aggregates:** `SafetyIncident`, `QualityInspection`.
*   **Entities:** `IncidentReport`, `InspectionForm`, `PunchList`.
*   **Value Objects:** `Severity`, `InspectionResult`.
*   **Domain Events:** `IncidentReported`, `InspectionFailed`.
*   **Ownership Rules:** Safety Officer / Quality Engineer.

### 12. Compliance
*   **Purpose:** Track statutory requirements and document validities.
*   **Aggregates:** `ComplianceRecord`.
*   **Entities:** `StatutoryDocument` (PF/ESIC/CAR Policy).
*   **Value Objects:** `ExpiryDate`, `Authority`.
*   **Domain Events:** `ComplianceExpiring`, `ComplianceRenewed`.
*   **Ownership Rules:** HR / Finance.

### 13. Notifications & Workflows
*   **Purpose:** Orchestrate approvals and alert users of system events.
*   **Aggregates:** `WorkflowInstance`, `Notification`.
*   **Entities:** `WorkflowTemplate`, `WorkflowStep`, `ApprovalAction`, `NotificationMessage`.
*   **Value Objects:** `Channel`, `DeliveryStatus`.
*   **Domain Events:** `ApprovalRequested`, `WorkflowCompleted`, `NotificationSent`.
*   **Ownership Rules:** System Orchestrator.

### 14. Analytics & AI
*   **Purpose:** Derive insights, predictions, and reports from operational data.
*   **Aggregates:** `Dashboard`, `PredictionModel`.
*   **Entities:** `WidgetConfig`, `MaterializedMetric`.
*   **Value Objects:** `KPIType`, `ConfidenceScore`.
*   **Domain Events:** `ReportGenerated`, `AnomalyDetected`.
*   **Ownership Rules:** Org Admin / Management.

## Entity Relationship Mapping (High Level)
`Organization -> Projects -> Sites -> Workfronts -> Activities`
`Vendor -> POs -> GRNs -> Inventory`
`Budget -> POs -> Invoices -> Payments`
`Site -> Workers -> Attendance -> Payroll`

## Cross Domain Communication
- **Event-Driven:** Domains communicate primarily through events.
  - *Example:* `GRN` (Procurement) emits `MaterialReceivedAtGate`. `Inventory` listens and updates `StockBalance`. `Finance` listens and flags `PendingInvoiceLiability`.
- **Anti-Corruption Layers:** When integrating with external accounting systems (e.g., Tally), an ACL translates our event ledger into traditional journal entries.
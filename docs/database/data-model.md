# ConstructionOS: Data Model

## Core Tables

- `organizations`: Multi-tenant root.
- `projects`: High-level structures.
- `sites`: Execution locations.
- `inventory_ledger`: Immutable tracking of material movement.
- `purchase_orders`: Vendor agreements.
- `invoices`: Financial records.

## Indexing & RLS

- Every table requires an `org_id` column.
- Row Level Security policies restrict read/write access based on the user's mapped organization.
- B-Tree indexes on all foreign keys.
- Soft-delete pattern implemented using a `deleted_at` timestamp.
# ConstructionOS: Security & RBAC

## Security Philosophy
- **Zero Trust:** Every API call, Server Action, and database query must explicitly prove authorization.
- **Defense in Depth:** Security is enforced at the UI (Client), the API/Action (Server), and the Database (RLS).
- **Granular Scoping:** A user may be a "Project Manager" for Project A, but a "Viewer" for Project B.

## Roles Hierarchy
1. **Super Admin:** Platform owner (System level).
2. **Organization Owner:** Full control of a single tenant.
3. **Director:** Read-all, approve high-value transactions across the Org.
4. **Project Manager:** Full control scoped to specific `project_id`.
5. **Site Engineer:** Read/Write scoped to specific `site_id` (Attendance, DPR, Material Requests).
6. **Store Manager:** Read/Write scoped to specific `site_id` and Inventory context (GRN, Issues).
7. **Procurement Manager:** Org-wide or Project-wide control over PRs, POs, and Vendor masters.
8. **HR Manager:** Org-wide or Site-scoped control over Workforce, Payroll, and Compliance.
9. **Accountant:** Org-wide or Project-wide control over Invoices, MBs, and Payments.
10. **Safety/Quality Officer:** Scoped to Sites for Inspections and Blockers.
11. **Subcontractor/Client (Portal):** External users with tightly restricted views of their own data (POs, MBs, Invoices).

## Access Control Models

### 1. Role-Based Access Control (RBAC)
Base permissions attached to a Role.
*Example:* `Role: Store Manager` -> `Permissions: [grn:create, grn:read, inventory:read, pr:create]`

### 2. Attribute-Based Access Control (ABAC) & Scoping
Permissions evaluated against resource attributes (Scope).
*Example:* User A has `Role: Store Manager` but their `user_roles.scope_id` is `site_123`.
They can only perform `grn:create` where `payload.site_id == site_123`.

## Supabase RLS Implementation

Every table MUST have RLS enabled.

**Standard Pattern:**
```sql
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- 1. Org Isolation (Foundation)
CREATE POLICY "org_isolation" ON sites
  FOR ALL
  USING (org_id = (select auth.jwt()->>'org_id'));

-- 2. Scoped Access (Specific)
CREATE POLICY "site_engineer_access" ON sites
  FOR SELECT
  USING (
    id IN (
      SELECT scope_id FROM user_roles 
      WHERE user_id = auth.uid() AND role_id = 'site_engineer_role_id'
    )
  );
```

## Server Action Authorization (Next.js)

All Server Actions must use a wrapper that validates identity, tenant, and permissions before executing logic.

```typescript
// Conceptual Example
export const createPR = actionClient
  .schema(PRSchema)
  .requirePermission('pr:create')
  .requireScope('site_id', (input) => input.siteId)
  .action(async ({ parsedInput, ctx }) => {
    // Business logic... guaranteed to be authorized
  });
```

## API Authorization (Edge / External)
External APIs utilize scoped JWTs or API Keys linked to a specific Service Role within the Organization, validated at the Edge middleware.
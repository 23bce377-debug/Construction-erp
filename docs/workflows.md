# ConstructionOS: Workflow Engine

## Overview
The Workflow Engine handles all multi-step approvals, conditional routing, and escalations across ConstructionOS. It acts as an orchestrator that listens to domain events and halts or progresses the aggregate state based on predefined rules.

## Use Cases
- Material Request (PR) Approval
- Purchase Order (PO) Approval
- Subcontractor Invoice (RA Bill) Approval
- Payroll Run Approval
- Site Closure / Handover Approval

## Features
- **Multi-Step:** Sequential and parallel approval nodes.
- **Conditional Routing:** E.g., If PO Amount > ₹5,00,000, require Director Approval.
- **Escalation & SLA:** If no action in 48 hours, escalate to Supervisor.
- **Delegation:** "I am on leave; route my approvals to X."
- **Reassignment:** Manually override current approver.

## Architecture & Schema

### `workflow_templates`
Defines the blueprint for a process.
- `id`, `org_id`, `trigger_entity` (e.g., 'PO'), `name`, `is_active`.

### `workflow_steps`
The nodes within a template.
- `id`, `template_id`, `step_order`, `role_id` (who can approve), `condition_sql` (JSON logic), `sla_hours`.

### `workflow_instances`
An active workflow running for a specific entity.
- `id`, `org_id`, `template_id`, `entity_id` (e.g., specific PO ID), `status` (Pending/Approved/Rejected), `current_step_order`.

### `workflow_approvals` (Audit)
The actual decisions made by users.
- `id`, `instance_id`, `step_id`, `approver_id`, `decision` (Approve/Reject), `comments`, `timestamp`.

## Execution Flow
1. **Trigger:** `PRCreated` event fires.
2. **Instantiate:** Engine checks if a `workflow_template` exists for 'PR' in this `org_id`. If yes, creates `workflow_instance`.
3. **Route:** Engine determines the first step, identifies eligible users (based on `role_id` and Scope), and emits `ApprovalRequested` event.
4. **Action:** User approves via UI. Server Action writes to `workflow_approvals`.
5. **Evaluate:** Engine evaluates if next step exists. If yes, loops to Route. If no, updates Entity Status to 'Approved' and emits `PRApproved` event.
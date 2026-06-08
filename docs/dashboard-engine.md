# ConstructionOS: Dashboard Engine

## Overview
A dynamic widget-based dashboard system allowing users to personalize their landing pages based on their role and preferences.

## Dashboard Components

### 1. Widget Registry
A central dictionary of available widgets.
- `id`, `name`, `type` (e.g., 'Chart', 'Metric', 'Table', 'Feed'), `data_source` (API endpoint or Server Action).

### 2. Widget Permissions
Not all widgets are available to all roles.
- The `widget_permissions` table maps `widget_id` to `role_id`.
- Example: Only the 'Accountant' role can view the 'Pending Payables' widget.

### 3. Personalization
Users can arrange their own dashboards.
- `user_dashboards` table: `user_id`, `dashboard_layout` (JSON defining grid positions, coordinates, and selected widgets).

## Core Widget Types
- **Metric Cards:** Single value KPIs (e.g., "Active Sites", "Pending Approvals").
- **Timeline/Gantt:** High-level project schedule views.
- **Activity Feed:** Real-time stream of domain events (e.g., "PO #102 Approved").
- **Data Tables:** Mini-tables showing urgent action items (e.g., "Items Below Reorder Level").
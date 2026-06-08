# ConstructionOS: Resource OS

## Workforce Management

1. **Workers**
   - Tracks demographic data, skill levels, and trades.
   - Managed directly or via Subcontractors.
   - Unique Worker IDs hash to prevent duplication across sites.

2. **Attendance System (Offline-First)**
   - Sites often lack internet. Attendance is recorded on mobile devices (biometric/QR) and timestamped locally.
   - Syncs to the server using a sync hash to prevent duplicate entries when connectivity is restored.
   - Feeds directly into Daily Progress Reports (DPRs) and Payroll inputs.

3. **Payroll Inputs**
   - Automatically calculates daily wages based on shifts and overtime.
   - Handles advances and recoveries (e.g., deducting ₹500/week for a loan).

## Equipment & Machinery

1. **Asset Master**
   - Tracks Owned and Rented equipment.
   - Records capacity, make, model, and current deployment site.

2. **Deployment Tracking**
   - Tracks hours used and fuel consumed (Diesel consumption tracking is critical for cost control).
   - Tied to specific Activities for accurate heavy machinery cost allocation.

3. **Maintenance**
   - Schedules preventive maintenance.
   - Logs breakdowns, which trigger events that halt dependent Activities on the site schedule.
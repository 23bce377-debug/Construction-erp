-- =============================================================================
-- ConstructionOS — Supabase PostgreSQL Schema v1.1.0
-- =============================================================================
-- Architecture : Multi-tenant | Event-Driven Execution Graph
-- Target       : Indian construction companies — SME to EPC scale
-- Stack        : Supabase (PG 15+), RLS, TanStack Query, Next.js App Router
--
-- CHANGES FROM v1.0.0
--   + §18A  cost_code_recipes    — BOM / standard consumption norms
--   + §9    inventory_ledger     — device_timestamp + sync_hash (offline-first)
--   + §7    worker_attendance    — device_timestamp + sync_hash (offline-first)
--   + §10   purchase_orders      — amendment_number column
--   + §10   po_amendments        — full PO snapshot history table
--   + §12   imprest_transactions — cost_code_id, workfront_id, asset_id linkage
--   + §18B  attachments          — polymorphic file attachments (replaces photo_url[])
--   + §23   mv_compliance_alerts — completed + CONCURRENT refresh helper
--
-- DESIGN PRINCIPLES
--   1. Every table has org_id for clean O(1) RLS — no nested subquery joins
--   2. site_events is IMMUTABLE — INSERT only, never UPDATE/DELETE
--   3. inventory_ledger is IMMUTABLE — balance maintained by trigger
--   4. payments / measurement_books are IMMUTABLE once finalised
--   5. All security definer functions use SET search_path = public
--   6. Audit trail on every critical financial + compliance table
--   7. BRIN for pure append-only time-series; BTREE for FK + filter combos
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- §0  EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- CREATE EXTENSION IF NOT EXISTS "postgis";  -- Enable for GPS geofencing
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";  -- Enable for scheduled MV refresh

-- ─────────────────────────────────────────────────────────────────────────────
-- §1  ENUMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE org_role              AS ENUM ('owner','admin','project_director','site_engineer','purchase_head','store_keeper','finance','hr_admin','viewer','vendor_portal','client_portal');
CREATE TYPE project_status        AS ENUM ('planning','active','on_hold','completed','cancelled');
CREATE TYPE site_status           AS ENUM ('setup','active','suspended','completed','closed');
CREATE TYPE workfront_status      AS ENUM ('pending','in_progress','completed','blocked','on_hold');
CREATE TYPE event_category        AS ENUM ('progress','material','labour','safety','equipment','financial','compliance','document','communication');
CREATE TYPE ownership_type        AS ENUM ('owned','rented','leased');
CREATE TYPE asset_status          AS ENUM ('available','deployed','idle','breakdown','under_maintenance','retired');
CREATE TYPE pr_status             AS ENUM ('draft','pending_approval','approved','po_created','cancelled');
CREATE TYPE po_status             AS ENUM ('draft','pending_approval','approved','sent_to_vendor','partially_received','fully_received','cancelled','closed');
CREATE TYPE grn_status            AS ENUM ('draft','quality_check','accepted','partially_accepted','rejected');
CREATE TYPE invoice_status        AS ENUM ('draft','submitted','under_review','approved','rejected','paid','partially_paid');
CREATE TYPE payment_status_type   AS ENUM ('pending','processing','paid','failed','reversed','on_hold');
CREATE TYPE inventory_txn_type    AS ENUM ('RECEIPT','ISSUE','RETURN','SCRAP','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','OPENING_STOCK');
CREATE TYPE mb_status             AS ENUM ('draft','submitted','under_certification','certified','billed','paid','disputed');
CREATE TYPE blocker_type          AS ENUM ('material_shortage','labour_shortage','design_pending','payment_pending','approval_pending','weather_delay','equipment_breakdown','access_restriction','safety_hold','client_hold','statutory_hold','other');
CREATE TYPE blocker_status_type   AS ENUM ('open','escalated','in_progress','resolved','closed');
CREATE TYPE compliance_doc_status AS ENUM ('valid','expiring_soon','expired','pending','rejected');
CREATE TYPE workflow_status       AS ENUM ('pending','approved','rejected','cancelled','escalated');
CREATE TYPE document_status       AS ENUM ('draft','under_review','approved','superseded','archived');
CREATE TYPE skill_level           AS ENUM ('unskilled','semi_skilled','skilled','highly_skilled');
CREATE TYPE cost_state            AS ENUM ('planned','committed','consumed','installed','billed');
CREATE TYPE gender_type           AS ENUM ('male','female','other');

-- ─────────────────────────────────────────────────────────────────────────────
-- §2  UTILITY FUNCTION — updated_at auto-stamp
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §3  CONTROL PLANE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE organizations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        NOT NULL UNIQUE,
  logo_url     TEXT,
  phone        TEXT,
  address      TEXT,
  city         TEXT,
  state        TEXT,
  pincode      TEXT,
  website      TEXT,
  plan         TEXT        NOT NULL DEFAULT 'starter',   -- starter|growth|enterprise
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE entities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name    TEXT        NOT NULL,
  trade_name    TEXT,
  gstin         TEXT        NOT NULL,
  pan           TEXT,
  tan           TEXT,
  state_code    CHAR(2)     NOT NULL,
  address       TEXT,
  city          TEXT,
  pincode       TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, gstin)
);

CREATE TABLE profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT        NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  designation   TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_org_memberships (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          org_role    NOT NULL DEFAULT 'viewer',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  invited_by    UUID        REFERENCES profiles(id),
  joined_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §4  HIERARCHY PLANE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID           NOT NULL REFERENCES organizations(id),
  entity_id       UUID           NOT NULL REFERENCES entities(id),
  name            TEXT           NOT NULL,
  project_code    TEXT,
  description     TEXT,
  client_name     TEXT,
  client_gstin    TEXT,
  contract_value  NUMERIC(18,2),
  currency        CHAR(3)        NOT NULL DEFAULT 'INR',
  start_date      DATE,
  end_date        DATE,
  status          project_status NOT NULL DEFAULT 'planning',
  project_manager UUID           REFERENCES profiles(id),
  created_by      UUID           REFERENCES profiles(id),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE sites (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  name            TEXT        NOT NULL,
  site_code       TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  -- gps_boundary GEOMETRY(Polygon,4326), -- uncomment when PostGIS enabled
  gps_lat         NUMERIC(10,7),
  gps_lng         NUMERIC(10,7),
  timezone        TEXT        NOT NULL DEFAULT 'Asia/Kolkata',
  site_incharge   UUID        REFERENCES profiles(id),
  status          site_status NOT NULL DEFAULT 'setup',
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_site_access (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id       UUID        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  role          org_role    NOT NULL DEFAULT 'site_engineer',
  granted_by    UUID        REFERENCES profiles(id),
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, site_id)
);

CREATE TABLE workfronts (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID              NOT NULL REFERENCES organizations(id),
  site_id       UUID              NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  parent_id     UUID              REFERENCES workfronts(id),
  level_type    TEXT              NOT NULL,   -- Block|Tower|Wing|Floor|Zone|Room|Segment
  name          TEXT              NOT NULL,
  code          TEXT,
  status        workfront_status  NOT NULL DEFAULT 'pending',
  sequence_no   INT               NOT NULL DEFAULT 1,
  area_sqm      NUMERIC(10,2),
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TABLE cost_codes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id     UUID        REFERENCES cost_codes(id),
  code          TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  uom           TEXT        NOT NULL DEFAULT 'NOS',
  cost_category TEXT,       -- civil|mep|finishing|external|overhead
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, code)
);

CREATE TABLE activities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  site_id         UUID        NOT NULL REFERENCES sites(id),
  workfront_id    UUID        NOT NULL REFERENCES workfronts(id) ON DELETE RESTRICT,
  cost_code_id    UUID        REFERENCES cost_codes(id),
  name            TEXT        NOT NULL,
  planned_qty     NUMERIC(14,3),
  uom             TEXT        NOT NULL DEFAULT 'NOS',
  planned_start   DATE,
  planned_end     DATE,
  actual_start    DATE,
  actual_end      DATE,
  status          TEXT        NOT NULL DEFAULT 'planned',   -- planned|in_progress|completed|suspended
  completion_pct  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §5  MASTER DATA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE item_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id     UUID        REFERENCES item_categories(id),
  name          TEXT        NOT NULL,
  code          TEXT,
  hsn_code      TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, code)
);

CREATE TABLE items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id     UUID        REFERENCES item_categories(id),
  code            TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  description     TEXT,
  uom             TEXT        NOT NULL DEFAULT 'NOS',
  alt_uom         TEXT,
  uom_conversion  NUMERIC(10,4),
  hsn_code        TEXT,
  gst_rate        NUMERIC(5,2) NOT NULL DEFAULT 18,
  item_type       TEXT        NOT NULL DEFAULT 'material',   -- material|labour|equipment|service|ppe
  is_returnable   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  spec_notes      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, code)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §6  VENDOR PLANE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vendors (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  code              TEXT,
  vendor_type       TEXT[]      NOT NULL DEFAULT '{}',   -- supplier|subcontractor|transporter|consultant
  gstin             TEXT,
  pan               TEXT,
  state_code        CHAR(2),
  address           TEXT,
  city              TEXT,
  pincode           TEXT,
  primary_contact   TEXT,
  primary_phone     TEXT,
  primary_email     TEXT,
  bank_name         TEXT,
  bank_account      TEXT,
  ifsc_code         TEXT,
  credit_limit      NUMERIC(18,2),
  payment_terms_days INT        NOT NULL DEFAULT 30,
  performance_score NUMERIC(3,1),
  kyc_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
  kyc_docs          JSONB       NOT NULL DEFAULT '{}',
  is_blacklisted    BOOLEAN     NOT NULL DEFAULT FALSE,
  blacklist_reason  TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by        UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, gstin)
);

CREATE TABLE vendor_rate_contracts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  vendor_id       UUID        NOT NULL REFERENCES vendors(id),
  site_id         UUID        REFERENCES sites(id),   -- NULL = applies to all sites
  item_id         UUID        NOT NULL REFERENCES items(id),
  rate            NUMERIC(14,4) NOT NULL,
  uom             TEXT        NOT NULL,
  gst_rate        NUMERIC(5,2),
  valid_from      DATE        NOT NULL,
  valid_until     DATE        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (valid_until >= valid_from)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §7  RESOURCE PLANE — WORKFORCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE workers (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID          NOT NULL REFERENCES organizations(id),
  subcontractor_id      UUID          REFERENCES vendors(id),
  name                  TEXT          NOT NULL,
  father_name           TEXT,
  gender                gender_type,
  dob                   DATE,
  phone                 TEXT,
  emergency_contact     TEXT,
  address               TEXT,
  home_state            TEXT,
  aadhaar_hash          TEXT          UNIQUE,   -- SHA256 of Aadhaar — never store raw
  uan_number            TEXT,
  esic_ip_number        TEXT,
  shram_suvidha_lin     TEXT,
  trade                 TEXT          NOT NULL,
  skill_level           skill_level   NOT NULL DEFAULT 'unskilled',
  daily_wage            NUMERIC(10,2),
  pf_applicable         BOOLEAN       NOT NULL DEFAULT FALSE,
  esic_applicable       BOOLEAN       NOT NULL DEFAULT FALSE,
  safety_training_done  BOOLEAN       NOT NULL DEFAULT FALSE,
  safety_training_date  DATE,
  medical_fit_cert_date DATE,
  photo_url             TEXT,
  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by            UUID          REFERENCES profiles(id),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE worker_site_assignments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  worker_id       UUID        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  site_id         UUID        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  assigned_from   DATE        NOT NULL,
  assigned_until  DATE,
  is_current      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Offline-first: device_timestamp + sync_hash added for mobile storekeeper sync
CREATE TABLE worker_attendance (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  site_id           UUID        NOT NULL REFERENCES sites(id),
  worker_id         UUID        NOT NULL REFERENCES workers(id),
  attendance_date   DATE        NOT NULL,
  shift             TEXT        NOT NULL DEFAULT 'day',       -- day|night|split
  check_in_time     TIME,
  check_out_time    TIME,
  hours_worked      NUMERIC(5,2),
  overtime_hours    NUMERIC(5,2) NOT NULL DEFAULT 0,
  attendance_type   TEXT        NOT NULL DEFAULT 'present',   -- present|absent|half_day|leave
  wage_for_day      NUMERIC(10,2),
  source            TEXT        NOT NULL DEFAULT 'manual',    -- manual|biometric|mobile
  device_timestamp  TIMESTAMPTZ,                              -- When recorded on device (offline)
  sync_hash         TEXT        UNIQUE,                       -- Idempotency: prevent duplicate mobile syncs
  recorded_by       UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, worker_id, attendance_date, shift)
);

CREATE TABLE worker_advances (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES organizations(id),
  site_id             UUID        NOT NULL REFERENCES sites(id),
  worker_id           UUID        NOT NULL REFERENCES workers(id),
  advance_amount      NUMERIC(12,2) NOT NULL,
  advance_date        DATE        NOT NULL,
  reason              TEXT,
  recovery_mode       TEXT        NOT NULL DEFAULT 'weekly',  -- weekly|monthly|one_shot
  amount_recovered    NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_fully_recovered  BOOLEAN     NOT NULL DEFAULT FALSE,
  approved_by         UUID        REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_runs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id),
  site_id          UUID        NOT NULL REFERENCES sites(id),
  period_start     DATE        NOT NULL,
  period_end       DATE        NOT NULL,
  total_gross      NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net        NUMERIC(14,2) NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'draft',   -- draft|approved|disbursed
  approved_by      UUID        REFERENCES profiles(id),
  approved_at      TIMESTAMPTZ,
  created_by       UUID        REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, period_start, period_end)
);

CREATE TABLE payroll_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  payroll_run_id    UUID        NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  worker_id         UUID        NOT NULL REFERENCES workers(id),
  days_present      NUMERIC(5,2) NOT NULL DEFAULT 0,
  overtime_days     NUMERIC(5,2) NOT NULL DEFAULT 0,
  basic_wage        NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  pf_deduction      NUMERIC(12,2) NOT NULL DEFAULT 0,
  esic_deduction    NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_recovery  NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions  NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payable       NUMERIC(12,2) GENERATED ALWAYS AS (
    gross_amount - pf_deduction - esic_deduction - advance_recovery - other_deductions
  ) STORED,
  payment_mode      TEXT        NOT NULL DEFAULT 'cash',
  payment_reference TEXT,
  is_paid           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §8  RESOURCE PLANE — ASSETS & EQUIPMENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE assets (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID           NOT NULL REFERENCES organizations(id),
  asset_type          TEXT           NOT NULL,
  asset_category      TEXT           NOT NULL DEFAULT 'heavy_equipment',   -- heavy_equipment|small_tool|vehicle|scaffold|formwork
  make                TEXT,
  model               TEXT,
  year                INT,
  registration_no     TEXT,
  capacity            TEXT,
  ownership_type      ownership_type NOT NULL DEFAULT 'owned',
  vendor_id           UUID           REFERENCES vendors(id),
  rental_rate         NUMERIC(14,2),
  rental_uom          TEXT,                                                -- per_day|per_hour
  status              asset_status   NOT NULL DEFAULT 'available',
  current_site_id     UUID           REFERENCES sites(id),
  amc_expiry          DATE,
  insurance_expiry    DATE,
  rc_expiry           DATE,
  fitness_cert_expiry DATE,
  last_service_date   DATE,
  next_service_date   DATE,
  odometer_km         NUMERIC(10,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE asset_deployments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  asset_id          UUID        NOT NULL REFERENCES assets(id),
  site_id           UUID        NOT NULL REFERENCES sites(id),
  workfront_id      UUID        REFERENCES workfronts(id),
  operator_id       UUID        REFERENCES workers(id),
  deployed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at       TIMESTAMPTZ,
  hours_used        NUMERIC(8,2),
  fuel_consumed_l   NUMERIC(8,2),
  deployment_cost   NUMERIC(14,2),
  notes             TEXT,
  created_by        UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §9  STORES & INVENTORY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE stores (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  site_id         UUID        REFERENCES sites(id),   -- NULL = central warehouse
  name            TEXT        NOT NULL,
  store_type      TEXT        NOT NULL DEFAULT 'site_store',   -- central_warehouse|site_store|sub_store
  incharge_id     UUID        REFERENCES profiles(id),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IMMUTABLE ledger — offline-first: device_timestamp + sync_hash added
CREATE TABLE inventory_ledger (
  id                    UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID               NOT NULL REFERENCES organizations(id),
  site_id               UUID               NOT NULL REFERENCES sites(id),
  store_id              UUID               NOT NULL REFERENCES stores(id),
  item_id               UUID               NOT NULL REFERENCES items(id),
  transaction_type      inventory_txn_type NOT NULL,
  qty                   NUMERIC(14,3)      NOT NULL CHECK (qty > 0),
  uom                   TEXT               NOT NULL,
  unit_rate             NUMERIC(14,4),
  reference_type        TEXT,              -- GRN|DPR_ISSUE|RETURN|TRANSFER|SCRAP
  reference_id          UUID,
  reference_event_id    UUID,
  destination_store_id  UUID               REFERENCES stores(id),
  batch_number          TEXT,
  remarks               TEXT,
  device_timestamp      TIMESTAMPTZ,       -- When recorded on device (offline storekeeper)
  sync_hash             TEXT               UNIQUE, -- Idempotency: prevent duplicate mobile syncs
  recorded_by           UUID               REFERENCES profiles(id),
  created_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW()
  -- No updated_at — this table is strictly immutable
);

CREATE TABLE inventory_stock (
  store_id      UUID          NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id       UUID          NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  qty_on_hand   NUMERIC(14,3) NOT NULL DEFAULT 0,
  reserved_qty  NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(14,3),
  last_updated  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, item_id),
  CONSTRAINT non_negative_stock CHECK (qty_on_hand >= 0)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §10  PROCUREMENT PLANE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE purchase_requisitions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  site_id         UUID        NOT NULL REFERENCES sites(id),
  pr_number       TEXT        NOT NULL,
  requested_by    UUID        NOT NULL REFERENCES profiles(id),
  required_date   DATE,
  priority        TEXT        NOT NULL DEFAULT 'normal',   -- urgent|high|normal|low
  status          pr_status   NOT NULL DEFAULT 'draft',
  notes           TEXT,
  approved_by     UUID        REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, pr_number)
);

CREATE TABLE pr_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  pr_id           UUID        NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  item_id         UUID        NOT NULL REFERENCES items(id),
  workfront_id    UUID        REFERENCES workfronts(id),
  cost_code_id    UUID        REFERENCES cost_codes(id),
  requested_qty   NUMERIC(14,3) NOT NULL,
  uom             TEXT        NOT NULL,
  estimated_rate  NUMERIC(14,4),
  purpose         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- amendment_number tracks revision history; po_amendments stores snapshots
CREATE TABLE purchase_orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  entity_id         UUID        NOT NULL REFERENCES entities(id),
  site_id           UUID        REFERENCES sites(id),
  vendor_id         UUID        NOT NULL REFERENCES vendors(id),
  po_number         TEXT        NOT NULL,
  po_date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  delivery_date     DATE,
  delivery_address  TEXT,
  status            po_status   NOT NULL DEFAULT 'draft',
  amendment_number  INT         NOT NULL DEFAULT 0,   -- Increments on each formal revision
  subtotal          NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_gst         NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  advance_paid      NUMERIC(18,2) NOT NULL DEFAULT 0,
  freight_terms     TEXT,
  payment_terms     TEXT,
  notes             TEXT,
  approved_by       UUID        REFERENCES profiles(id),
  approved_at       TIMESTAMPTZ,
  created_by        UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, po_number)
);

CREATE TABLE po_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID          NOT NULL REFERENCES organizations(id),
  po_id           UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id         UUID          NOT NULL REFERENCES items(id),
  pr_item_id      UUID          REFERENCES pr_items(id),
  description     TEXT,
  qty             NUMERIC(14,3) NOT NULL,
  received_qty    NUMERIC(14,3) NOT NULL DEFAULT 0,
  uom             TEXT          NOT NULL,
  unit_rate       NUMERIC(14,4) NOT NULL,
  gst_rate        NUMERIC(5,2)  NOT NULL DEFAULT 18,
  cgst_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(18,2) GENERATED ALWAYS AS (qty * unit_rate) STORED,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- PO Amendment history — full snapshot stored before each revision
CREATE TABLE po_amendments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id),
  po_id            UUID        NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  amendment_number INT         NOT NULL,
  change_summary   TEXT        NOT NULL,
  snapshot         JSONB       NOT NULL,   -- Full PO header + items state before this amendment
  amended_by       UUID        REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (po_id, amendment_number)
);

CREATE TABLE grn (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  site_id           UUID        NOT NULL REFERENCES sites(id),
  store_id          UUID        NOT NULL REFERENCES stores(id),
  po_id             UUID        REFERENCES purchase_orders(id),
  vendor_id         UUID        NOT NULL REFERENCES vendors(id),
  grn_number        TEXT        NOT NULL,
  grn_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  challan_number    TEXT,
  challan_date      DATE,
  vehicle_number    TEXT,
  status            grn_status  NOT NULL DEFAULT 'draft',
  quality_inspector UUID        REFERENCES profiles(id),
  quality_notes     TEXT,
  received_by       UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, grn_number)
);

CREATE TABLE grn_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID          NOT NULL REFERENCES organizations(id),
  grn_id            UUID          NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
  po_item_id        UUID          REFERENCES po_items(id),
  item_id           UUID          NOT NULL REFERENCES items(id),
  ordered_qty       NUMERIC(14,3),
  received_qty      NUMERIC(14,3) NOT NULL,
  accepted_qty      NUMERIC(14,3),
  rejected_qty      NUMERIC(14,3) NOT NULL DEFAULT 0,
  rejection_reason  TEXT,
  uom               TEXT          NOT NULL,
  unit_rate         NUMERIC(14,4),
  batch_number      TEXT,
  expiry_date       DATE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §11  EXECUTION GRAPH — SITE EVENTS (IMMUTABLE LEDGER)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE site_events (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID           NOT NULL REFERENCES organizations(id),
  site_id           UUID           NOT NULL REFERENCES sites(id),
  workfront_id      UUID           REFERENCES workfronts(id),
  activity_id       UUID           REFERENCES activities(id),
  actor_id          UUID           REFERENCES profiles(id),
  worker_id         UUID           REFERENCES workers(id),
  asset_id          UUID           REFERENCES assets(id),
  event_category    event_category NOT NULL,
  event_type        TEXT           NOT NULL,
  payload           JSONB          NOT NULL DEFAULT '{}',
  device_timestamp  TIMESTAMPTZ    NOT NULL,
  server_timestamp  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  sync_hash         TEXT           NOT NULL UNIQUE,
  gps_lat           NUMERIC(10,7),
  gps_lng           NUMERIC(10,7),
  gps_accuracy_m    NUMERIC(6,2),
  photo_urls        TEXT[]         NOT NULL DEFAULT '{}',   -- legacy; prefer attachments table
  is_voided         BOOLEAN        NOT NULL DEFAULT FALSE,
  voided_by         UUID           REFERENCES profiles(id),
  void_reason       TEXT,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE dprs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  site_id         UUID        NOT NULL REFERENCES sites(id),
  dpr_date        DATE        NOT NULL,
  weather         TEXT,
  temperature_c   NUMERIC(4,1),
  site_incharge   UUID        REFERENCES profiles(id),
  total_workers   INT         NOT NULL DEFAULT 0,
  total_vehicles  INT         NOT NULL DEFAULT 0,
  remarks         TEXT,
  next_day_plan   TEXT,
  status          TEXT        NOT NULL DEFAULT 'draft',   -- draft|submitted|approved
  submitted_by    UUID        REFERENCES profiles(id),
  submitted_at    TIMESTAMPTZ,
  approved_by     UUID        REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, dpr_date)
);

CREATE TABLE dpr_progress_entries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID          NOT NULL REFERENCES organizations(id),
  dpr_id          UUID          NOT NULL REFERENCES dprs(id) ON DELETE CASCADE,
  activity_id     UUID          NOT NULL REFERENCES activities(id),
  workfront_id    UUID          REFERENCES workfronts(id),
  qty_done_today  NUMERIC(14,3) NOT NULL,
  uom             TEXT          NOT NULL,
  cumulative_qty  NUMERIC(14,3),
  remarks         TEXT,
  photo_urls      TEXT[]        NOT NULL DEFAULT '{}',   -- legacy; prefer attachments table
  recorded_by     UUID          REFERENCES profiles(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §12  MONEY PLANE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE budgets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  project_id      UUID        NOT NULL REFERENCES projects(id),
  site_id         UUID        REFERENCES sites(id),
  name            TEXT        NOT NULL,
  budget_code     TEXT,
  version         INT         NOT NULL DEFAULT 1,
  is_approved     BOOLEAN     NOT NULL DEFAULT FALSE,
  total_amount    NUMERIC(18,2) NOT NULL DEFAULT 0,
  contingency_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  approved_by     UUID        REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE budget_line_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  budget_id       UUID        NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  cost_code_id    UUID        REFERENCES cost_codes(id),
  workfront_id    UUID        REFERENCES workfronts(id),
  description     TEXT        NOT NULL,
  qty             NUMERIC(14,3),
  uom             TEXT,
  unit_rate       NUMERIC(14,4),
  budgeted_amount NUMERIC(18,2) NOT NULL,
  cost_state      cost_state  NOT NULL DEFAULT 'planned',
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subcontract_work_orders (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID        NOT NULL REFERENCES organizations(id),
  entity_id             UUID        NOT NULL REFERENCES entities(id),
  site_id               UUID        NOT NULL REFERENCES sites(id),
  vendor_id             UUID        NOT NULL REFERENCES vendors(id),
  wo_number             TEXT        NOT NULL,
  wo_date               DATE        NOT NULL DEFAULT CURRENT_DATE,
  scope_of_work         TEXT        NOT NULL,
  start_date            DATE,
  end_date              DATE,
  contract_value        NUMERIC(18,2) NOT NULL,
  retention_pct         NUMERIC(5,2)  NOT NULL DEFAULT 10,
  advance_paid          NUMERIC(18,2) NOT NULL DEFAULT 0,
  mobilization_advance  NUMERIC(18,2) NOT NULL DEFAULT 0,
  status                TEXT        NOT NULL DEFAULT 'active',   -- draft|active|completed|terminated
  approved_by           UUID        REFERENCES profiles(id),
  created_by            UUID        REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, wo_number)
);

CREATE TABLE measurement_books (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  site_id           UUID        NOT NULL REFERENCES sites(id),
  work_order_id     UUID        REFERENCES subcontract_work_orders(id),
  vendor_id         UUID        NOT NULL REFERENCES vendors(id),
  mb_number         TEXT        NOT NULL,
  ra_bill_number    INT         NOT NULL,
  period_start      DATE        NOT NULL,
  period_end        DATE        NOT NULL,
  status            mb_status   NOT NULL DEFAULT 'draft',
  gross_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  deductions        NUMERIC(18,2) NOT NULL DEFAULT 0,
  retention_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_payable       NUMERIC(18,2) NOT NULL DEFAULT 0,
  cgst_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  certified_by      UUID        REFERENCES profiles(id),
  certified_at      TIMESTAMPTZ,
  submitted_by      UUID        REFERENCES profiles(id),
  submitted_at      TIMESTAMPTZ,
  notes             TEXT,
  created_by        UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, mb_number)
);

CREATE TABLE mb_entries (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID          NOT NULL REFERENCES organizations(id),
  mb_id                   UUID          NOT NULL REFERENCES measurement_books(id) ON DELETE CASCADE,
  activity_id             UUID          NOT NULL REFERENCES activities(id),
  workfront_id            UUID          REFERENCES workfronts(id),
  cost_code_id            UUID          REFERENCES cost_codes(id),
  description             TEXT          NOT NULL,
  uom                     TEXT          NOT NULL,
  previous_cumulative_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  claimed_qty             NUMERIC(14,3) NOT NULL,
  certified_qty           NUMERIC(14,3),
  rate                    NUMERIC(14,4) NOT NULL,
  certified_amount        NUMERIC(18,2) GENERATED ALWAYS AS (COALESCE(certified_qty, 0) * rate) STORED,
  remarks                 TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
  id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID                NOT NULL REFERENCES organizations(id),
  entity_id       UUID                NOT NULL REFERENCES entities(id),
  site_id         UUID                REFERENCES sites(id),
  vendor_id       UUID                NOT NULL REFERENCES vendors(id),
  invoice_number  TEXT                NOT NULL,
  invoice_date    DATE                NOT NULL,
  due_date        DATE,
  reference_type  TEXT                NOT NULL,   -- PO|MB|WO|DIRECT
  reference_id    UUID,
  subtotal        NUMERIC(18,2)       NOT NULL,
  cgst_amount     NUMERIC(14,2)       NOT NULL DEFAULT 0,
  sgst_amount     NUMERIC(14,2)       NOT NULL DEFAULT 0,
  igst_amount     NUMERIC(14,2)       NOT NULL DEFAULT 0,
  tds_amount      NUMERIC(14,2)       NOT NULL DEFAULT 0,
  other_deductions NUMERIC(14,2)      NOT NULL DEFAULT 0,
  total_amount    NUMERIC(18,2)       NOT NULL,
  amount_paid     NUMERIC(18,2)       NOT NULL DEFAULT 0,
  status          invoice_status      NOT NULL DEFAULT 'draft',
  payment_status  payment_status_type NOT NULL DEFAULT 'pending',
  notes           TEXT,
  approved_by     UUID                REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  created_by      UUID                REFERENCES profiles(id),
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, vendor_id, invoice_number)
);

CREATE TABLE payments (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID                NOT NULL REFERENCES organizations(id),
  entity_id         UUID                NOT NULL REFERENCES entities(id),
  vendor_id         UUID                NOT NULL REFERENCES vendors(id),
  invoice_id        UUID                REFERENCES invoices(id),
  payment_date      DATE                NOT NULL DEFAULT CURRENT_DATE,
  amount            NUMERIC(18,2)       NOT NULL,
  payment_mode      TEXT                NOT NULL DEFAULT 'bank_transfer',   -- cash|cheque|bank_transfer|upi|rtgs|neft
  reference_number  TEXT,
  bank_account      TEXT,
  tds_deducted      NUMERIC(14,2)       NOT NULL DEFAULT 0,
  status            payment_status_type NOT NULL DEFAULT 'pending',
  remarks           TEXT,
  approved_by       UUID                REFERENCES profiles(id),
  created_by        UUID                REFERENCES profiles(id),
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
  -- No updated_at — immutable after 'paid'; guarded by trigger
);

CREATE TABLE retention_register (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  site_id           UUID        NOT NULL REFERENCES sites(id),
  vendor_id         UUID        NOT NULL REFERENCES vendors(id),
  work_order_id     UUID        REFERENCES subcontract_work_orders(id),
  mb_id             UUID        REFERENCES measurement_books(id),
  amount_withheld   NUMERIC(18,2) NOT NULL,
  withheld_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_release  DATE,
  amount_released   NUMERIC(18,2) NOT NULL DEFAULT 0,
  released_date     DATE,
  status            TEXT        NOT NULL DEFAULT 'withheld',   -- withheld|partially_released|released
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE imprest_accounts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  site_id           UUID        NOT NULL REFERENCES sites(id),
  name              TEXT        NOT NULL,
  custodian_id      UUID        NOT NULL REFERENCES profiles(id),
  authorized_limit  NUMERIC(14,2) NOT NULL,
  current_balance   NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Imprest connected to execution: cost_code, workfront, and asset linkage
CREATE TABLE imprest_transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  imprest_id      UUID        NOT NULL REFERENCES imprest_accounts(id),
  txn_type        TEXT        NOT NULL,   -- topup|expense|reimbursement
  amount          NUMERIC(14,2) NOT NULL,
  category        TEXT,                  -- diesel|labour_transport|misc_purchase
  description     TEXT        NOT NULL,
  receipt_url     TEXT,
  vendor_name     TEXT,
  cost_code_id    UUID        REFERENCES cost_codes(id),    -- For cost roll-up
  workfront_id    UUID        REFERENCES workfronts(id),    -- For location cost attribution
  asset_id        UUID        REFERENCES assets(id),        -- e.g., diesel for a specific excavator
  recorded_by     UUID        REFERENCES profiles(id),
  approved_by     UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §13  COMPLIANCE PLANE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE compliance_documents (
  id                UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID                  NOT NULL REFERENCES organizations(id),
  entity_id         UUID                  REFERENCES entities(id),
  site_id           UUID                  REFERENCES sites(id),
  vendor_id         UUID                  REFERENCES vendors(id),
  worker_id         UUID                  REFERENCES workers(id),
  doc_type          TEXT                  NOT NULL,   -- PF_CHALLAN|ESIC|BOCW|LABOUR_LICENSE|GST_RETURN|TDS_CERT|INSURANCE|FIRE_NOC
  doc_number        TEXT,
  issue_date        DATE,
  expiry_date       DATE,
  issuing_authority TEXT,
  file_url          TEXT,
  status            compliance_doc_status NOT NULL DEFAULT 'valid',
  reminder_days     INT                   NOT NULL DEFAULT 30,
  notes             TEXT,
  uploaded_by       UUID                  REFERENCES profiles(id),
  verified_by       UUID                  REFERENCES profiles(id),
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE TABLE tds_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  entity_id       UUID        NOT NULL REFERENCES entities(id),
  vendor_id       UUID        NOT NULL REFERENCES vendors(id),
  invoice_id      UUID        REFERENCES invoices(id),
  payment_id      UUID        REFERENCES payments(id),
  section         TEXT        NOT NULL DEFAULT '194C',   -- 194C|194J|194I|194IA
  base_amount     NUMERIC(18,2) NOT NULL,
  tds_rate        NUMERIC(5,2)  NOT NULL,
  tds_amount      NUMERIC(14,2) NOT NULL,
  deduction_date  DATE        NOT NULL,
  quarter         CHAR(6),    -- Q1FY25
  challan_number  TEXT,
  challan_date    DATE,
  deposited       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §14  WORKFLOW ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE workflow_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  name            TEXT        NOT NULL,
  entity_type     TEXT        NOT NULL,   -- purchase_order|payment|measurement_book|pr
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_template_steps (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id),
  template_id       UUID        NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order        INT         NOT NULL,
  step_name         TEXT        NOT NULL,
  approver_role     org_role    NOT NULL,
  approver_user_id  UUID        REFERENCES profiles(id),
  timeout_hours     INT         NOT NULL DEFAULT 24,
  is_parallel       BOOLEAN     NOT NULL DEFAULT FALSE,
  conditions        JSONB       NOT NULL DEFAULT '{}',   -- {"min_amount": 100000}
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_instances (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID            NOT NULL REFERENCES organizations(id),
  template_id     UUID            NOT NULL REFERENCES workflow_templates(id),
  entity_type     TEXT            NOT NULL,
  entity_id       UUID            NOT NULL,
  current_step    INT             NOT NULL DEFAULT 1,
  status          workflow_status NOT NULL DEFAULT 'pending',
  initiated_by    UUID            REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_approvals (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID            NOT NULL REFERENCES organizations(id),
  instance_id   UUID            NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id       UUID            NOT NULL REFERENCES workflow_template_steps(id),
  approver_id   UUID            NOT NULL REFERENCES profiles(id),
  action        workflow_status NOT NULL,   -- approved|rejected|escalated
  comment       TEXT,
  acted_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §15  DOCUMENT MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE documents (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID            NOT NULL REFERENCES organizations(id),
  project_id        UUID            REFERENCES projects(id),
  site_id           UUID            REFERENCES sites(id),
  workfront_id      UUID            REFERENCES workfronts(id),
  doc_type          TEXT            NOT NULL,   -- DRAWING|BOQ|APPROVAL|PERMIT|CONTRACT|PHOTO|TEST_REPORT|INSPECTION|NOC|HANDOVER
  title             TEXT            NOT NULL,
  document_number   TEXT,
  discipline        TEXT,
  tags              TEXT[]          NOT NULL DEFAULT '{}',
  current_version   INT             NOT NULL DEFAULT 1,
  latest_file_url   TEXT,
  status            document_status NOT NULL DEFAULT 'draft',
  issuer            TEXT,
  effective_date    DATE,
  expiry_date       DATE,
  search_vector     TSVECTOR,
  uploaded_by       UUID            REFERENCES profiles(id),
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE document_versions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES organizations(id),
  document_id         UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number      INT         NOT NULL,
  file_url            TEXT        NOT NULL,
  file_size_bytes     BIGINT,
  change_description  TEXT,
  uploaded_by         UUID        REFERENCES profiles(id),
  approved_by         UUID        REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version_number)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §16  BLOCKERS & EXCEPTIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE blockers (
  id                    UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID                NOT NULL REFERENCES organizations(id),
  site_id               UUID                NOT NULL REFERENCES sites(id),
  workfront_id          UUID                REFERENCES workfronts(id),
  activity_id           UUID                REFERENCES activities(id),
  blocker_type          blocker_type        NOT NULL,
  title                 TEXT                NOT NULL,
  description           TEXT,
  severity              TEXT                NOT NULL DEFAULT 'medium',   -- low|medium|high|critical
  status                blocker_status_type NOT NULL DEFAULT 'open',
  raised_by             UUID                REFERENCES profiles(id),
  assigned_to           UUID                REFERENCES profiles(id),
  target_resolution     DATE,
  resolved_at           TIMESTAMPTZ,
  resolution_notes      TEXT,
  photo_urls            TEXT[]              NOT NULL DEFAULT '{}',   -- legacy; prefer attachments table
  estimated_delay_days  INT                 NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE blocker_updates (
  id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID                NOT NULL REFERENCES organizations(id),
  blocker_id      UUID                NOT NULL REFERENCES blockers(id) ON DELETE CASCADE,
  update_text     TEXT                NOT NULL,
  status_change   blocker_status_type,
  updated_by      UUID                REFERENCES profiles(id),
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §17  AUDIT TRAIL (APPEND-ONLY — never DELETE)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id              BIGSERIAL   PRIMARY KEY,
  org_id          UUID        REFERENCES organizations(id),
  table_name      TEXT        NOT NULL,
  record_id       TEXT        NOT NULL,
  operation       TEXT        NOT NULL,   -- INSERT|UPDATE|DELETE
  old_data        JSONB,
  new_data        JSONB,
  changed_fields  TEXT[],
  actor_id        UUID,
  actor_email     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §18A  BOM / STANDARD CONSUMPTION NORMS
-- ─────────────────────────────────────────────────────────────────────────────
-- Enables: "10 CUM M25 poured → system auto-calculates 4000 KG cement should
-- have been consumed" — the foundation of automated material reconciliation.

CREATE TABLE cost_code_recipes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cost_code_id    UUID          NOT NULL REFERENCES cost_codes(id) ON DELETE CASCADE,
  item_id         UUID          NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  qty_per_uom     NUMERIC(14,4) NOT NULL,   -- Quantity of item per 1 UOM of cost_code work
  uom             TEXT          NOT NULL,
  waste_factor    NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (waste_factor >= 0),   -- % wastage allowance
  notes           TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by      UUID          REFERENCES profiles(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, cost_code_id, item_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- §18B  POLYMORPHIC ATTACHMENTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Central file store replacing scattered TEXT[] photo_url arrays.
-- Links any Supabase Storage object to any entity with proper lifecycle control.
-- entity_type values: 'site_event'|'dpr_entry'|'grn'|'blocker'|'worker'
--                     |'vendor'|'measurement_book'|'compliance_doc'|'imprest_txn'

CREATE TABLE attachments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     TEXT        NOT NULL,
  entity_id       UUID        NOT NULL,
  storage_path    TEXT        NOT NULL,   -- Supabase Storage bucket path
  file_name       TEXT        NOT NULL,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  caption         TEXT,
  uploaded_by     UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════════════════════
-- §19  INDEXES
-- ═════════════════════════════════════════════════════════════════════════════

-- organizations
CREATE INDEX idx_orgs_slug ON organizations(slug);

-- entities
CREATE INDEX idx_entities_org_id ON entities(org_id);
CREATE INDEX idx_entities_gstin  ON entities(gstin);

-- user_org_memberships — HOT PATH on every authenticated request
CREATE INDEX idx_uom_user_id     ON user_org_memberships(user_id);
CREATE INDEX idx_uom_org_id      ON user_org_memberships(org_id);
CREATE INDEX idx_uom_user_active ON user_org_memberships(user_id, org_id) WHERE is_active = TRUE;

-- user_site_access — HOT PATH for site-restricted roles
CREATE INDEX idx_usa_user_id     ON user_site_access(user_id);
CREATE INDEX idx_usa_site_id     ON user_site_access(site_id);
CREATE INDEX idx_usa_user_active ON user_site_access(user_id) WHERE is_active = TRUE;

-- projects
CREATE INDEX idx_projects_org_id    ON projects(org_id);
CREATE INDEX idx_projects_entity_id ON projects(entity_id);
CREATE INDEX idx_projects_status    ON projects(org_id, status);

-- sites
CREATE INDEX idx_sites_org_id     ON sites(org_id);
CREATE INDEX idx_sites_project_id ON sites(project_id);
CREATE INDEX idx_sites_org_status ON sites(org_id, status);

-- workfronts
CREATE INDEX idx_workfronts_site_id   ON workfronts(site_id);
CREATE INDEX idx_workfronts_parent_id ON workfronts(parent_id);
CREATE INDEX idx_workfronts_org_id    ON workfronts(org_id);

-- cost_codes
CREATE INDEX idx_cost_codes_org_id    ON cost_codes(org_id);
CREATE INDEX idx_cost_codes_parent_id ON cost_codes(parent_id);

-- activities
CREATE INDEX idx_activities_site_id      ON activities(site_id);
CREATE INDEX idx_activities_workfront_id ON activities(workfront_id);
CREATE INDEX idx_activities_cost_code_id ON activities(cost_code_id);
CREATE INDEX idx_activities_org_status   ON activities(site_id, status);

-- items
CREATE INDEX idx_items_org_id      ON items(org_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_items_org_code    ON items(org_id, code);
CREATE INDEX idx_items_name_trgm   ON items USING GIN(name gin_trgm_ops);

-- vendors
CREATE INDEX idx_vendors_org_id     ON vendors(org_id);
CREATE INDEX idx_vendors_gstin      ON vendors(gstin);
CREATE INDEX idx_vendors_name_trgm  ON vendors USING GIN(name gin_trgm_ops);
CREATE INDEX idx_vendors_org_active ON vendors(org_id) WHERE is_active = TRUE AND is_blacklisted = FALSE;

-- vendor_rate_contracts
CREATE INDEX idx_vrc_vendor_item ON vendor_rate_contracts(vendor_id, item_id);
CREATE INDEX idx_vrc_org_active  ON vendor_rate_contracts(org_id) WHERE is_active = TRUE;

-- workers
CREATE INDEX idx_workers_org_id        ON workers(org_id);
CREATE INDEX idx_workers_subcontractor ON workers(subcontractor_id);
CREATE INDEX idx_workers_org_trade     ON workers(org_id, trade);
CREATE INDEX idx_workers_org_active    ON workers(org_id) WHERE is_active = TRUE;

-- worker_site_assignments
CREATE INDEX idx_wsa_site_id   ON worker_site_assignments(site_id);
CREATE INDEX idx_wsa_worker_id ON worker_site_assignments(worker_id);
CREATE INDEX idx_wsa_current   ON worker_site_assignments(site_id, worker_id) WHERE is_current = TRUE;

-- worker_attendance — HIGH FREQUENCY
CREATE INDEX idx_wa_site_date   ON worker_attendance(site_id, attendance_date DESC);
CREATE INDEX idx_wa_worker_date ON worker_attendance(worker_id, attendance_date DESC);
CREATE INDEX idx_wa_date        ON worker_attendance(attendance_date);
CREATE INDEX idx_wa_sync_hash   ON worker_attendance(sync_hash) WHERE sync_hash IS NOT NULL;

-- payroll
CREATE INDEX idx_payroll_runs_site   ON payroll_runs(site_id, period_start DESC);
CREATE INDEX idx_payroll_entries_run ON payroll_entries(payroll_run_id);
CREATE INDEX idx_payroll_entries_wkr ON payroll_entries(worker_id);

-- assets
CREATE INDEX idx_assets_org_id       ON assets(org_id);
CREATE INDEX idx_assets_current_site ON assets(current_site_id);
CREATE INDEX idx_assets_org_status   ON assets(org_id, status);
CREATE INDEX idx_assets_expiry       ON assets(amc_expiry, insurance_expiry, rc_expiry);

-- asset_deployments
CREATE INDEX idx_adep_asset_id ON asset_deployments(asset_id);
CREATE INDEX idx_adep_site_id  ON asset_deployments(site_id);
CREATE INDEX idx_adep_active   ON asset_deployments(asset_id) WHERE returned_at IS NULL;

-- stores
CREATE INDEX idx_stores_site_id ON stores(site_id);
CREATE INDEX idx_stores_org_id  ON stores(org_id);

-- inventory_ledger — HIGH VOLUME APPEND-ONLY
CREATE INDEX idx_il_store_item   ON inventory_ledger(store_id, item_id, created_at DESC);
CREATE INDEX idx_il_site_id      ON inventory_ledger(site_id);
CREATE INDEX idx_il_reference    ON inventory_ledger(reference_type, reference_id);
CREATE INDEX idx_il_event        ON inventory_ledger(reference_event_id);
CREATE INDEX idx_il_date         ON inventory_ledger(site_id, created_at DESC);
CREATE INDEX idx_il_created_brin ON inventory_ledger USING BRIN(created_at);
CREATE INDEX idx_il_sync_hash    ON inventory_ledger(sync_hash) WHERE sync_hash IS NOT NULL;

-- purchase_requisitions
CREATE INDEX idx_pr_org_status ON purchase_requisitions(org_id, status);
CREATE INDEX idx_pr_site_id    ON purchase_requisitions(site_id);

-- pr_items
CREATE INDEX idx_pr_items_pr_id   ON pr_items(pr_id);
CREATE INDEX idx_pr_items_item_id ON pr_items(item_id);
CREATE INDEX idx_pr_items_org_id  ON pr_items(org_id);

-- purchase_orders
CREATE INDEX idx_po_org_status ON purchase_orders(org_id, status);
CREATE INDEX idx_po_vendor_id  ON purchase_orders(vendor_id);
CREATE INDEX idx_po_site_id    ON purchase_orders(site_id);
CREATE INDEX idx_po_date       ON purchase_orders(org_id, po_date DESC);

-- po_items
CREATE INDEX idx_po_items_po_id   ON po_items(po_id);
CREATE INDEX idx_po_items_item_id ON po_items(item_id);
CREATE INDEX idx_po_items_org_id  ON po_items(org_id);

-- po_amendments
CREATE INDEX idx_poa_po_id  ON po_amendments(po_id);
CREATE INDEX idx_poa_org_id ON po_amendments(org_id);

-- grn
CREATE INDEX idx_grn_org_id ON grn(org_id);
CREATE INDEX idx_grn_po_id  ON grn(po_id);
CREATE INDEX idx_grn_site   ON grn(site_id, grn_date DESC);

-- grn_items
CREATE INDEX idx_grn_items_grn_id  ON grn_items(grn_id);
CREATE INDEX idx_grn_items_item_id ON grn_items(item_id);
CREATE INDEX idx_grn_items_org_id  ON grn_items(org_id);

-- site_events — HIGHEST VOLUME / MOST CRITICAL
CREATE INDEX idx_se_site_time    ON site_events(site_id, device_timestamp DESC);
CREATE INDEX idx_se_org_time     ON site_events(org_id, device_timestamp DESC);
CREATE INDEX idx_se_category     ON site_events(site_id, event_category, device_timestamp DESC);
CREATE INDEX idx_se_type         ON site_events(event_type, site_id);
CREATE INDEX idx_se_workfront    ON site_events(workfront_id);
CREATE INDEX idx_se_activity     ON site_events(activity_id);
CREATE INDEX idx_se_actor        ON site_events(actor_id);
CREATE INDEX idx_se_payload      ON site_events USING GIN(payload);
CREATE INDEX idx_se_active       ON site_events(site_id, device_timestamp DESC) WHERE is_voided = FALSE;
CREATE INDEX idx_se_created_brin ON site_events USING BRIN(created_at);

-- dprs
CREATE INDEX idx_dprs_site_date  ON dprs(site_id, dpr_date DESC);
CREATE INDEX idx_dprs_org_status ON dprs(org_id, status);

-- dpr_progress_entries
CREATE INDEX idx_dpe_dpr_id      ON dpr_progress_entries(dpr_id);
CREATE INDEX idx_dpe_activity_id ON dpr_progress_entries(activity_id);
CREATE INDEX idx_dpe_org_id      ON dpr_progress_entries(org_id);

-- budgets
CREATE INDEX idx_budgets_project ON budgets(project_id);
CREATE INDEX idx_budgets_site    ON budgets(site_id);
CREATE INDEX idx_budgets_org_id  ON budgets(org_id);

-- measurement_books
CREATE INDEX idx_mb_site_status ON measurement_books(site_id, status);
CREATE INDEX idx_mb_vendor_id   ON measurement_books(vendor_id);
CREATE INDEX idx_mb_work_order  ON measurement_books(work_order_id);
CREATE INDEX idx_mb_org_id      ON measurement_books(org_id);

-- mb_entries
CREATE INDEX idx_mbe_mb_id       ON mb_entries(mb_id);
CREATE INDEX idx_mbe_activity_id ON mb_entries(activity_id);
CREATE INDEX idx_mbe_org_id      ON mb_entries(org_id);

-- invoices
CREATE INDEX idx_inv_org_vendor ON invoices(org_id, vendor_id);
CREATE INDEX idx_inv_status     ON invoices(org_id, status, payment_status);
CREATE INDEX idx_inv_site_id    ON invoices(site_id);
CREATE INDEX idx_inv_due_date   ON invoices(due_date) WHERE payment_status != 'paid';

-- payments
CREATE INDEX idx_pay_org_id     ON payments(org_id);
CREATE INDEX idx_pay_vendor_id  ON payments(vendor_id);
CREATE INDEX idx_pay_invoice_id ON payments(invoice_id);
CREATE INDEX idx_pay_date       ON payments(org_id, payment_date DESC);

-- imprest_transactions
CREATE INDEX idx_imptxn_imprest   ON imprest_transactions(imprest_id);
CREATE INDEX idx_imptxn_cost_code ON imprest_transactions(cost_code_id) WHERE cost_code_id IS NOT NULL;
CREATE INDEX idx_imptxn_workfront ON imprest_transactions(workfront_id) WHERE workfront_id IS NOT NULL;
CREATE INDEX idx_imptxn_asset     ON imprest_transactions(asset_id) WHERE asset_id IS NOT NULL;

-- compliance_documents
CREATE INDEX idx_comp_org_id  ON compliance_documents(org_id);
CREATE INDEX idx_comp_site_id ON compliance_documents(site_id);
CREATE INDEX idx_comp_vendor  ON compliance_documents(vendor_id);
CREATE INDEX idx_comp_worker  ON compliance_documents(worker_id);
CREATE INDEX idx_comp_expiry  ON compliance_documents(expiry_date) WHERE status NOT IN ('expired');

-- tds_entries
CREATE INDEX idx_tds_org_id    ON tds_entries(org_id);
CREATE INDEX idx_tds_vendor_id ON tds_entries(vendor_id);
CREATE INDEX idx_tds_quarter   ON tds_entries(org_id, quarter);

-- workflow
CREATE INDEX idx_wi_entity     ON workflow_instances(entity_type, entity_id);
CREATE INDEX idx_wi_org_status ON workflow_instances(org_id, status);

-- documents
CREATE INDEX idx_docs_org_id     ON documents(org_id);
CREATE INDEX idx_docs_project_id ON documents(project_id);
CREATE INDEX idx_docs_site_id    ON documents(site_id);
CREATE INDEX idx_docs_type       ON documents(site_id, doc_type);
CREATE INDEX idx_docs_tags       ON documents USING GIN(tags);
CREATE INDEX idx_docs_search     ON documents USING GIN(search_vector);

-- blockers
CREATE INDEX idx_bloc_site_status ON blockers(site_id, status);
CREATE INDEX idx_bloc_org_id      ON blockers(org_id);
CREATE INDEX idx_bloc_type        ON blockers(site_id, blocker_type);
CREATE INDEX idx_bloc_open        ON blockers(site_id) WHERE status IN ('open','escalated');

-- audit_log
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_actor        ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_org          ON audit_log(org_id, created_at DESC);
CREATE INDEX idx_audit_brin         ON audit_log USING BRIN(created_at);

-- cost_code_recipes
CREATE INDEX idx_ccr_org_id    ON cost_code_recipes(org_id);
CREATE INDEX idx_ccr_cost_code ON cost_code_recipes(cost_code_id);
CREATE INDEX idx_ccr_item      ON cost_code_recipes(item_id);

-- attachments
CREATE INDEX idx_att_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_att_org_id ON attachments(org_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- §20  RLS SECURITY DEFINER FUNCTIONS
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS UUID[] LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT org_id), '{}')
  FROM user_org_memberships
  WHERE user_id = auth.uid() AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION get_my_role_in_org(p_org_id UUID)
RETURNS org_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role
  FROM user_org_memberships
  WHERE user_id = auth.uid() AND org_id = p_org_id AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM user_org_memberships
    WHERE user_id = auth.uid()
      AND org_id = p_org_id
      AND role IN ('owner','admin')
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION get_my_accessible_site_ids()
RETURNS UUID[] LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT s.id), '{}')
  FROM sites s
  WHERE
    s.id IN (
      SELECT site_id FROM user_site_access
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
    OR
    s.org_id IN (
      SELECT org_id FROM user_org_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','project_director','purchase_head','finance','hr_admin')
        AND is_active = TRUE
    );
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- §21  ROW LEVEL SECURITY POLICIES
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities                ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_org_memberships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_access        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workfronts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_codes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_rate_contracts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_advances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_deployments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_amendments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dprs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpr_progress_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_line_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontract_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_books       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mb_entries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_register      ENABLE ROW LEVEL SECURITY;
ALTER TABLE imprest_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE imprest_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_entries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocker_updates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_code_recipes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments             ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS
CREATE POLICY "orgs_read"   ON organizations FOR SELECT USING (id = ANY(get_my_org_ids()));
CREATE POLICY "orgs_update" ON organizations FOR UPDATE USING (is_org_admin(id));

-- ENTITIES
CREATE POLICY "entities_all" ON entities FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- PROFILES
CREATE POLICY "profiles_read"   ON profiles FOR SELECT USING (
  id = auth.uid()
  OR id IN (SELECT user_id FROM user_org_memberships WHERE org_id = ANY(get_my_org_ids()) AND is_active = TRUE)
);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- USER ORG MEMBERSHIPS
CREATE POLICY "uom_read"   ON user_org_memberships FOR SELECT USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "uom_manage" ON user_org_memberships FOR INSERT WITH CHECK (is_org_admin(org_id));
CREATE POLICY "uom_update" ON user_org_memberships FOR UPDATE USING (is_org_admin(org_id));
CREATE POLICY "uom_delete" ON user_org_memberships FOR DELETE USING (is_org_admin(org_id));

-- USER SITE ACCESS
CREATE POLICY "usa_read"   ON user_site_access FOR SELECT USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "usa_manage" ON user_site_access FOR ALL    USING (is_org_admin(org_id));

-- PROJECTS
CREATE POLICY "projects_all" ON projects FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- SITES
CREATE POLICY "sites_read"   ON sites FOR SELECT USING (id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "sites_insert" ON sites FOR INSERT WITH CHECK (org_id = ANY(get_my_org_ids()));
CREATE POLICY "sites_update" ON sites FOR UPDATE USING (is_org_admin(org_id));

-- WORKFRONTS
CREATE POLICY "workfronts_all" ON workfronts FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));

-- COST CODES
CREATE POLICY "cost_codes_all" ON cost_codes FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- ACTIVITIES
CREATE POLICY "activities_all" ON activities FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));

-- MASTER DATA
CREATE POLICY "item_categories_all" ON item_categories FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "items_all"           ON items           FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- VENDORS
CREATE POLICY "vendors_all" ON vendors              FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "vrc_all"     ON vendor_rate_contracts FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- WORKFORCE
CREATE POLICY "workers_all"       ON workers                 FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "wsa_site_based"    ON worker_site_assignments  FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "wa_site_based"     ON worker_attendance        FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "wadvance_site"     ON worker_advances          FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "payroll_run_site"  ON payroll_runs             FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "payroll_entry_org" ON payroll_entries          FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- ASSETS
CREATE POLICY "assets_all" ON assets            FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "adep_site"  ON asset_deployments FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));

-- STORES & INVENTORY
CREATE POLICY "stores_all" ON stores FOR ALL USING (org_id = ANY(get_my_org_ids()));

CREATE POLICY "inv_ledger_site"   ON inventory_ledger FOR SELECT USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "inv_ledger_insert" ON inventory_ledger FOR INSERT WITH CHECK (site_id = ANY(get_my_accessible_site_ids()));
-- Deliberately no UPDATE/DELETE policy — ledger is immutable

CREATE POLICY "inv_stock_org" ON inventory_stock FOR ALL USING (
  store_id IN (SELECT id FROM stores WHERE org_id = ANY(get_my_org_ids()))
);

-- PROCUREMENT
CREATE POLICY "pr_site"       ON purchase_requisitions FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "pr_items_org"  ON pr_items              FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "po_org"        ON purchase_orders       FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "po_items_org"  ON po_items              FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "poa_org"       ON po_amendments         FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "grn_site"      ON grn                   FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "grn_items_org" ON grn_items             FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- SITE EVENTS
CREATE POLICY "se_read"   ON site_events FOR SELECT USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "se_insert" ON site_events FOR INSERT WITH CHECK (site_id = ANY(get_my_accessible_site_ids()));
-- No UPDATE/DELETE — void via service role / edge function only

-- DPRs
CREATE POLICY "dprs_site" ON dprs                 FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "dpe_org"   ON dpr_progress_entries FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- MONEY PLANE
CREATE POLICY "budgets_org"   ON budgets                FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "bli_org"       ON budget_line_items      FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "swo_site"      ON subcontract_work_orders FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "mb_site"       ON measurement_books      FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "mbe_org"       ON mb_entries             FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "inv_org"       ON invoices               FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "pay_org"       ON payments               FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "ret_site"      ON retention_register     FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "imp_site"      ON imprest_accounts       FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "imptxn_org"    ON imprest_transactions   FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- COMPLIANCE
CREATE POLICY "comp_docs_org" ON compliance_documents FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "tds_org"       ON tds_entries          FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- WORKFLOW
CREATE POLICY "wft_org"  ON workflow_templates      FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "wfts_org" ON workflow_template_steps FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "wfi_org"  ON workflow_instances      FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "wfa_org"  ON workflow_approvals      FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- DOCUMENTS
CREATE POLICY "docs_org" ON documents         FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "dv_org"   ON document_versions FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- BLOCKERS
CREATE POLICY "blockers_site" ON blockers       FOR ALL USING (site_id = ANY(get_my_accessible_site_ids()));
CREATE POLICY "bup_org"       ON blocker_updates FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- AUDIT LOG — read-only via app; INSERT only via service role triggers
CREATE POLICY "audit_read" ON audit_log FOR SELECT USING (org_id = ANY(get_my_org_ids()));

-- ENHANCEMENTS
CREATE POLICY "ccr_all" ON cost_code_recipes FOR ALL USING (org_id = ANY(get_my_org_ids()));
CREATE POLICY "att_all" ON attachments       FOR ALL USING (org_id = ANY(get_my_org_ids()));

-- ═════════════════════════════════════════════════════════════════════════════
-- §22  TRIGGERS
-- ═════════════════════════════════════════════════════════════════════════════

-- updated_at auto-stamps
CREATE TRIGGER trg_upd_organizations       BEFORE UPDATE ON organizations           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_entities            BEFORE UPDATE ON entities                FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_profiles            BEFORE UPDATE ON profiles                FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_uom                 BEFORE UPDATE ON user_org_memberships    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_projects            BEFORE UPDATE ON projects                FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_sites               BEFORE UPDATE ON sites                   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_workfronts          BEFORE UPDATE ON workfronts              FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_activities          BEFORE UPDATE ON activities              FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_items               BEFORE UPDATE ON items                   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_vendors             BEFORE UPDATE ON vendors                 FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_workers             BEFORE UPDATE ON workers                 FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_assets              BEFORE UPDATE ON assets                  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_pr                  BEFORE UPDATE ON purchase_requisitions   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_po                  BEFORE UPDATE ON purchase_orders         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_grn                 BEFORE UPDATE ON grn                     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_dprs                BEFORE UPDATE ON dprs                    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_budgets             BEFORE UPDATE ON budgets                 FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_swo                 BEFORE UPDATE ON subcontract_work_orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_mb                  BEFORE UPDATE ON measurement_books       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_invoices            BEFORE UPDATE ON invoices                FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_documents           BEFORE UPDATE ON documents               FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_blockers            BEFORE UPDATE ON blockers                FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_compliance_docs     BEFORE UPDATE ON compliance_documents    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_imprest             BEFORE UPDATE ON imprest_accounts        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_upd_cost_code_recipes   BEFORE UPDATE ON cost_code_recipes       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- Inventory stock balance maintained by ledger INSERT
CREATE OR REPLACE FUNCTION fn_update_inventory_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta NUMERIC(14,3);
BEGIN
  v_delta := CASE NEW.transaction_type
    WHEN 'RECEIPT'       THEN  NEW.qty
    WHEN 'ISSUE'         THEN -NEW.qty
    WHEN 'RETURN'        THEN  NEW.qty
    WHEN 'SCRAP'         THEN -NEW.qty
    WHEN 'TRANSFER_IN'   THEN  NEW.qty
    WHEN 'TRANSFER_OUT'  THEN -NEW.qty
    WHEN 'OPENING_STOCK' THEN  NEW.qty
    WHEN 'ADJUSTMENT'    THEN  NEW.qty
    ELSE 0
  END;

  INSERT INTO inventory_stock (store_id, item_id, qty_on_hand, last_updated)
  VALUES (NEW.store_id, NEW.item_id, v_delta, NOW())
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET
    qty_on_hand  = inventory_stock.qty_on_hand + v_delta,
    last_updated = NOW();

  IF NEW.transaction_type != 'ADJUSTMENT' THEN
    IF (SELECT qty_on_hand FROM inventory_stock WHERE store_id = NEW.store_id AND item_id = NEW.item_id) < 0 THEN
      RAISE EXCEPTION 'Insufficient stock — store: %, item: %, shortfall: %',
        NEW.store_id, NEW.item_id,
        ABS((SELECT qty_on_hand FROM inventory_stock WHERE store_id = NEW.store_id AND item_id = NEW.item_id));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_stock_update
  AFTER INSERT ON inventory_ledger
  FOR EACH ROW EXECUTE FUNCTION fn_update_inventory_stock();

-- Financial immutability guard
CREATE OR REPLACE FUNCTION fn_guard_financial_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('paid','certified') THEN
    RAISE EXCEPTION 'Record is finalised and cannot be modified (table=%, id=%)', TG_TABLE_NAME, OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_payments
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_guard_financial_immutability();

CREATE TRIGGER trg_guard_mb
  BEFORE UPDATE ON measurement_books
  FOR EACH ROW EXECUTE FUNCTION fn_guard_financial_immutability();

-- Document full-text search vector
CREATE OR REPLACE FUNCTION fn_update_doc_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := TO_TSVECTOR('english',
    COALESCE(NEW.title,'') || ' ' ||
    COALESCE(NEW.doc_type,'') || ' ' ||
    COALESCE(NEW.document_number,'') || ' ' ||
    COALESCE(ARRAY_TO_STRING(NEW.tags,' '),'')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_doc_search_vector
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION fn_update_doc_search_vector();

-- Universal audit trail
CREATE OR REPLACE FUNCTION fn_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old     JSONB;
  v_new     JSONB;
  v_changed TEXT[];
BEGIN
  v_old := CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::JSONB ELSE NULL END;
  v_new := CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::JSONB ELSE NULL END;

  IF TG_OP = 'UPDATE' THEN
    SELECT ARRAY_AGG(k) INTO v_changed
    FROM jsonb_object_keys(v_new) AS t(k)
    WHERE v_new->k IS DISTINCT FROM v_old->k;
  END IF;

  INSERT INTO audit_log (org_id, table_name, record_id, operation, old_data, new_data, changed_fields, actor_id)
  VALUES (
    COALESCE((v_new->>'org_id')::UUID, (v_old->>'org_id')::UUID),
    TG_TABLE_NAME,
    COALESCE(v_new->>'id', v_old->>'id'),
    TG_OP, v_old, v_new, v_changed,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_orgs            AFTER INSERT OR UPDATE OR DELETE ON organizations           FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_entities        AFTER INSERT OR UPDATE OR DELETE ON entities                FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_uom             AFTER INSERT OR UPDATE OR DELETE ON user_org_memberships    FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_usa             AFTER INSERT OR UPDATE OR DELETE ON user_site_access        FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_projects        AFTER INSERT OR UPDATE OR DELETE ON projects                FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_sites           AFTER INSERT OR UPDATE OR DELETE ON sites                   FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_vendors         AFTER INSERT OR UPDATE OR DELETE ON vendors                 FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON purchase_orders         FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_po_amendments   AFTER INSERT OR UPDATE OR DELETE ON po_amendments           FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_mb              AFTER INSERT OR UPDATE OR DELETE ON measurement_books       FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_invoices        AFTER INSERT OR UPDATE OR DELETE ON invoices                FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_payments        AFTER INSERT OR UPDATE OR DELETE ON payments                FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_compliance      AFTER INSERT OR UPDATE OR DELETE ON compliance_documents    FOR EACH ROW EXECUTE FUNCTION fn_audit();
CREATE TRIGGER audit_workflow        AFTER INSERT OR UPDATE OR DELETE ON workflow_approvals      FOR EACH ROW EXECUTE FUNCTION fn_audit();

-- ═════════════════════════════════════════════════════════════════════════════
-- §23  MATERIALIZED VIEWS
--      Manual refresh: SELECT refresh_mv_all();
--      Scheduled: SELECT cron.schedule('0 */5 * * *', $$SELECT refresh_mv_all()$$);
-- ═════════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW mv_site_progress AS
SELECT
  s.id                                                                  AS site_id,
  s.org_id,
  s.name                                                                AS site_name,
  s.status                                                              AS site_status,
  COUNT(DISTINCT a.id)                                                  AS total_activities,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed')           AS completed_activities,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'in_progress')         AS active_activities,
  ROUND(AVG(a.completion_pct), 1)                                       AS avg_completion_pct,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('open','escalated')) AS open_blockers,
  MAX(d.dpr_date)                                                       AS last_dpr_date
FROM sites s
LEFT JOIN workfronts wf ON wf.site_id = s.id
LEFT JOIN activities a  ON a.workfront_id = wf.id
LEFT JOIN blockers b    ON b.site_id = s.id
LEFT JOIN dprs d        ON d.site_id = s.id
GROUP BY s.id, s.org_id, s.name, s.status;

CREATE UNIQUE INDEX idx_mv_site_progress_pk  ON mv_site_progress(site_id);
CREATE        INDEX idx_mv_site_progress_org ON mv_site_progress(org_id);

-- Material issued vs received per site per item
CREATE MATERIALIZED VIEW mv_material_consumption AS
SELECT
  il.site_id,
  il.item_id,
  i.name                                                             AS item_name,
  i.uom,
  SUM(il.qty) FILTER (WHERE il.transaction_type = 'RECEIPT')        AS total_received,
  SUM(il.qty) FILTER (WHERE il.transaction_type = 'ISSUE')          AS total_issued,
  SUM(il.qty) FILTER (WHERE il.transaction_type = 'RETURN')         AS total_returned,
  SUM(il.qty) FILTER (WHERE il.transaction_type = 'SCRAP')          AS total_scrapped
FROM inventory_ledger il
JOIN items i ON i.id = il.item_id
GROUP BY il.site_id, il.item_id, i.name, i.uom;

CREATE UNIQUE INDEX idx_mv_material_consumption_pk ON mv_material_consumption(site_id, item_id);

-- Payable aging per org
CREATE MATERIALIZED VIEW mv_payable_aging AS
SELECT
  inv.org_id,
  inv.vendor_id,
  v.name                                                                                                AS vendor_name,
  COUNT(*)                                                                                              AS invoice_count,
  SUM(inv.total_amount - inv.amount_paid)                                                               AS outstanding_total,
  SUM(inv.total_amount - inv.amount_paid) FILTER (WHERE inv.due_date >= NOW()::DATE)                    AS current_bucket,
  SUM(inv.total_amount - inv.amount_paid) FILTER (WHERE (NOW()::DATE - inv.due_date) BETWEEN 1  AND 30) AS bucket_01_30,
  SUM(inv.total_amount - inv.amount_paid) FILTER (WHERE (NOW()::DATE - inv.due_date) BETWEEN 31 AND 60) AS bucket_31_60,
  SUM(inv.total_amount - inv.amount_paid) FILTER (WHERE (NOW()::DATE - inv.due_date) BETWEEN 61 AND 90) AS bucket_61_90,
  SUM(inv.total_amount - inv.amount_paid) FILTER (WHERE (NOW()::DATE - inv.due_date) > 90)              AS bucket_90_plus
FROM invoices inv
JOIN vendors v ON v.id = inv.vendor_id
WHERE inv.payment_status != 'paid'
GROUP BY inv.org_id, inv.vendor_id, v.name;

CREATE UNIQUE INDEX idx_mv_payable_aging_pk ON mv_payable_aging(org_id, vendor_id);

-- Compliance expiry radar
CREATE MATERIALIZED VIEW mv_compliance_alerts AS
SELECT
  cd.id,
  cd.org_id,
  cd.site_id,
  cd.vendor_id,
  cd.worker_id,
  cd.doc_type,
  cd.doc_number,
  cd.expiry_date,
  (cd.expiry_date - NOW()::DATE)  AS days_remaining,
  CASE
    WHEN cd.expiry_date < NOW()::DATE          THEN 'EXPIRED'
    WHEN cd.expiry_date < NOW()::DATE + 30     THEN 'EXPIRING_SOON'
    ELSE                                            'VALID'
  END                             AS alert_level
FROM compliance_documents cd
WHERE cd.expiry_date IS NOT NULL;

CREATE UNIQUE INDEX idx_mv_compliance_alerts_pk    ON mv_compliance_alerts(id);
CREATE        INDEX idx_mv_compliance_alerts_org   ON mv_compliance_alerts(org_id, alert_level);
CREATE        INDEX idx_mv_compliance_alerts_site  ON mv_compliance_alerts(site_id);
CREATE        INDEX idx_mv_compliance_alerts_expiry ON mv_compliance_alerts(expiry_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- Convenience function — call from app or pg_cron job
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_mv_all()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_site_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_material_consumption;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payable_aging;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_compliance_alerts;
END;
$$;

COMMIT;

-- =============================================================================
-- END OF SCHEMA v1.1.0
-- =============================================================================
-- Table count  : 58 tables
-- MV count     : 4 materialized views
-- Trigger count: 40 triggers
-- RLS policies : 60+ policies
-- Index count  : 100+ indexes
--
-- To refresh dashboards:   SELECT refresh_mv_all();
-- To schedule (pg_cron):   SELECT cron.schedule('mv_refresh', '*/5 * * * *', 'SELECT refresh_mv_all()');
-- =============================================================================
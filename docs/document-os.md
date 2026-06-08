# ConstructionOS: Document OS

## Overview
A centralized, version-controlled repository for all project artifacts, replacing scattered emails and physical files.

## Document Types
- Contracts & Work Orders
- BOQs (Bill of Quantities)
- Good For Construction (GFC) Drawings
- Invoices & RA Bills
- Site Photos & Videos
- Compliance Certificates

## Core Features
1. **Versioning:** Every upload of the same document creates a new version. Old versions are marked 'Superseded' but retained for audit purposes.
2. **Metadata & Tags:** Documents are tagged with Project, Site, Workfront, and Category for easy retrieval.
3. **Approval Workflows:** Integration with the Workflow Engine for drawing approvals (e.g., Draft -> Under Review -> Approved -> GFC).
4. **Storage:** Files are stored securely in Supabase Storage buckets, with database tables maintaining the metadata and access control lists (RLS).
5. **Search:** Database implements full-text search across document titles, tags, and extracted metadata.
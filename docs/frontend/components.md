# ConstructionOS: Component Architecture

## Architectural Philosophy
Follow an Atomic Design-inspired structure adapted for Next.js App Router. Components must be stateless where possible (Server Components) and purely presentational, relying on Server Actions for mutations.

## Directory Structure
```
/src
  /app                  # Next.js App Router (Pages, Layouts, API routes)
  /components
    /atoms              # Base UI elements (Button, Input, Badge, Icon)
    /molecules          # Small grouped elements (SearchInput, StatusBadge, FormField)
    /organisms          # Complex sections (DataTable, PageHeader, NavigationSidebar)
    /templates          # Layout wrappers (DashboardLayout, AuthLayout)
  /features             # Domain-specific logic and UI (Feature-Based Architecture)
    /procurement
      /components       # e.g., PurchaseOrderForm, PRListTable
      /actions          # Next.js Server Actions specific to Procurement
      /schema.ts        # Zod validation schemas
    /inventory
    /finance
  /lib                  # Utilities, Supabase clients, Drizzle schemas
  /hooks                # Custom React hooks (Client-side only)
  /store                # Global client state (Zustand/Jotai - use sparingly)
```

## Implementation Rules
1. **Server Components First:** All page components (`page.tsx`) must be Server Components. They fetch data via Drizzle ORM directly and pass it down as props.
2. **Client Components:** Only add `"use client"` at the lowest possible leaf node in the component tree (e.g., a button that triggers a modal, or an interactive chart).
3. **Tailwind Class Merging:** Use `clsx` and `tailwind-merge` utility functions to handle dynamic class names in reusable components safely.
4. **Prop Types:** Strict TypeScript interfaces for all component props. No `any`.
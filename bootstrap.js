import fs from 'fs';
import path from 'path';

const dirs = [
  'src/lib/db',
  'src/lib/utils',
  'src/lib/validations',
  'src/app/(dashboard)',
  'src/app/(dashboard)/projects',
  'src/app/(dashboard)/sites',
  'src/app/(dashboard)/procurement',
  'src/app/(dashboard)/finance',
  'src/app/(dashboard)/dpr',
  'src/app/(dashboard)/documents',
  'src/app/api/auth',
  'src/components/ui',
  'src/components/layout',
];

dirs.forEach(dir => fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true }));

const files = {
  'src/lib/db/db.ts': `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
`,
  'src/lib/db/schema.ts': `import { pgTable, text, timestamp, uuid, boolean, numeric, date, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Phase 1: Foundation
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').notNull().default('starter'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  fullName: text('full_name').notNull(),
  designation: text('designation'),
});

// Phase 2: Project Hierarchy
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('planning'),
});

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('setup'),
});

// Phase 3: Site Execution
export const dprs = pgTable('dprs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  siteId: uuid('site_id').notNull().references(() => sites.id),
  dprDate: date('dpr_date').notNull(),
  totalWorkers: integer('total_workers').notNull().default(0),
});

// Phase 4: Procurement
export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  poNumber: text('po_number').notNull(),
  totalAmount: numeric('total_amount').notNull().default('0'),
  status: text('status').notNull().default('draft'),
});

// Phase 5: Finance
export const measurementBooks = pgTable('measurement_books', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  siteId: uuid('site_id').notNull().references(() => sites.id),
  mbNumber: text('mb_number').notNull(),
  netPayable: numeric('net_payable').notNull().default('0'),
});

// Phase 7: Document OS
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  docType: text('doc_type').notNull(),
  fileUrl: text('file_url'),
  status: text('status').notNull().default('draft'),
});
`,
  'src/lib/utils.ts': `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
  'src/lib/validations/index.ts': `import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  status: z.enum(['planning', 'active', 'completed']),
});
`,
  'src/components/ui/button.tsx': `import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          "bg-accent-500 text-white hover:bg-accent-500/90 h-10 px-4 py-2",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
`,
  'src/components/ui/card.tsx': `import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-white/10 bg-surface-900/50 backdrop-blur-md shadow-sm",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight text-white", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0 text-slate-300", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardContent }
`,
  'src/components/layout/sidebar.tsx': `import Link from 'next/link';

export function Sidebar() {
  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Projects', href: '/projects' },
    { label: 'Sites', href: '/sites' },
    { label: 'DPRs', href: '/dpr' },
    { label: 'Procurement', href: '/procurement' },
    { label: 'Finance', href: '/finance' },
    { label: 'Documents', href: '/documents' },
  ];

  return (
    <div className="w-64 h-screen glass border-r flex flex-col p-4 fixed left-0 top-0">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-accent-400">ConstructionOS</h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="block px-4 py-2 rounded-md hover:bg-white/10 text-sm transition-colors text-slate-200">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
`,
  'src/app/(dashboard)/layout.tsx': `import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-950 text-white font-sans flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
`,
  'src/app/(dashboard)/page.tsx': `import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-mono">12</p>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle>Pending POs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-mono">5</p>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle>Open Blocker</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-mono text-red-400">2</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`,
  'src/app/(dashboard)/projects/page.tsx': `import { db } from '@/lib/db/db';
import { projects } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function ProjectsPage() {
  // Using SSR first paradigm - fetching data directly in server component
  // Example dummy fetch, assuming RLS would apply in real context via supabase auth
  const allProjects = await db.select().from(projects).limit(10).catch(() => []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Projects Management (Phase 2)</h1>
      <div className="grid grid-cols-1 gap-4">
        {allProjects.length === 0 && <p className="text-slate-400">No projects found. Setup database to see data.</p>}
        {allProjects.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
            </CardHeader>
            <CardContent>Status: {p.status}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
`,
  'src/app/(dashboard)/sites/page.tsx': `import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function SitesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Site Management (Phase 2)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Central Hub Site</CardTitle>
        </CardHeader>
        <CardContent>Active execution</CardContent>
      </Card>
    </div>
  );
}
`,
  'src/app/(dashboard)/dpr/page.tsx': `import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function DPRPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Daily Progress Reports (Phase 3)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent DPRs</CardTitle>
        </CardHeader>
        <CardContent>Tracking execution and attendance offline-first.</CardContent>
      </Card>
    </div>
  );
}
`,
  'src/app/(dashboard)/procurement/page.tsx': `import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function ProcurementPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Procurement & Inventory (Phase 4)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>Manage PRs, POs, and GRNs.</CardContent>
      </Card>
    </div>
  );
}
`,
  'src/app/(dashboard)/finance/page.tsx': `import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function FinancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Finance & Compliance (Phase 5)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Measurement Books</CardTitle>
        </CardHeader>
        <CardContent>RA Bills and deductions.</CardContent>
      </Card>
    </div>
  );
}
`,
  'src/app/(dashboard)/documents/page.tsx': `import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function DocumentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Document OS & AI (Phase 7)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Document Repository</CardTitle>
        </CardHeader>
        <CardContent>OCR and versioned storage integration.</CardContent>
      </Card>
    </div>
  );
}
`,
};

for (const [filePath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(process.cwd(), filePath), content);
  console.log('Created ' + filePath);
}

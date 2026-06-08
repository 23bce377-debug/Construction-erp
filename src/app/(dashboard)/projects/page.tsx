import { db } from '@/lib/db/db';
import { projects } from '@/lib/db/schema';
import { getOrgContext } from '@/lib/auth-utils';
import { eq, desc } from 'drizzle-orm';
import { ProjectListWrapper } from '@/components/ProjectListWrapper';

export default async function ProjectsPage() {
  const { orgId } = await getOrgContext();
  
  const allProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(desc(projects.createdAt));

  return (
    <ProjectListWrapper initialProjects={allProjects as unknown as { id: string; name: string; code: string | null; clientName: string | null; contractValue: string | null; status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'; startDate: string | null; endDate: string | null }[]} />
  );
}

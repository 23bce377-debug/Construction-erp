import { seedDatabase } from '@/lib/db/seed';
import { getDashboardStats } from '@/lib/actions/dashboard';
import { DashboardWrapper } from '@/components/DashboardWrapper';

export default async function DashboardPage() {
  await seedDatabase();
  const stats = await getDashboardStats();

  return <DashboardWrapper initialStats={stats} />;
}

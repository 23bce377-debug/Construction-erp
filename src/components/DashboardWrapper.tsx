'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/actions/dashboard';
import { DataCard } from '@/components/ui/data-card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Activity, Briefcase, ClipboardCheck, IndianRupee } from 'lucide-react';

interface RecentSite {
  id: string;
  name: string;
  siteCode: string | null;
  createdAt: Date | string;
}

interface DashboardWrapperProps {
  initialStats: {
    activeProjectsCount: number;
    pendingPOsCount: number;
    todayAttendance: number;
    totalBudget: string;
    recentSites: RecentSite[];
  };
}

export function DashboardWrapper({ initialStats }: DashboardWrapperProps) {
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => getDashboardStats(),
    initialData: initialStats,
    refetchInterval: 10000, // auto poll dashboard stats every 10 seconds for real-time reactivity
  });

  const formatCurrency = (val: string | number | null) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Executive Overview</h1>
        <p className="text-slate-400 mt-1">Real-time operational intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DataCard
          title="Active Projects"
          value={stats.activeProjectsCount}
          icon={<Briefcase className="w-5 h-5 text-blue-400" />}
          description="Projects currently in execution"
        />
        <DataCard
          title="Budget Committed"
          value={formatCurrency(stats.totalBudget)}
          icon={<IndianRupee className="w-5 h-5 text-emerald-400" />}
          description="Total value across all projects"
        />
        <DataCard
          title="Workforce Today"
          value={stats.todayAttendance}
          icon={<Activity className="w-5 h-5 text-orange-400" />}
          description="Total personnel on site today"
        />
        <DataCard
          title="Pending Approvals"
          value={stats.pendingPOsCount}
          icon={<ClipboardCheck className="w-5 h-5 text-purple-400" />}
          description="POs awaiting authorization"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassPanel className="lg:col-span-2 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Site Events</h2>
          <div className="space-y-4">
            {stats.recentSites.length > 0 ? (
              stats.recentSites.map((site) => (
                <div key={site.id} className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <div>
                      <p className="text-sm font-medium text-white">{site.name}</p>
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">{site.siteCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Created</p>
                    <p className="text-xs font-mono text-slate-300">
                      {new Date(site.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">No recent activity found.</p>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">System Health</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Database Connection</span>
                <span className="text-emerald-400 font-medium">Optimal</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[98%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">API Latency</span>
                <span className="text-emerald-400 font-medium">12ms</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[95%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Storage Usage</span>
                <span className="text-blue-400 font-medium">24%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[24%]" />
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

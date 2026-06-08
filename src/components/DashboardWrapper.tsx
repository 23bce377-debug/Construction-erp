'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/actions/dashboard';
import { DataCard } from '@/components/ui/data-card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Activity, Briefcase, ClipboardCheck, IndianRupee, Database, Radio, HardDrive, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

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
    refetchInterval: 15000, // auto poll dashboard stats every 15 seconds
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
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Executive Control Tower
        </h1>
        <p className="text-slate-400 mt-1 text-sm font-medium">Real-time operational and resource intelligence</p>
      </div>

      {/* Grid of operational KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DataCard
          title="Active Projects"
          value={stats.activeProjectsCount}
          icon={<Briefcase className="w-5 h-5 text-blue-400" />}
          description="Ongoing project execution"
          className="hover:border-blue-500/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(59,130,246,0.08)]"
        />
        <DataCard
          title="Budget Committed"
          value={formatCurrency(stats.totalBudget)}
          icon={<IndianRupee className="w-5 h-5 text-emerald-400" />}
          description="Total contract values"
          className="hover:border-emerald-500/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(16,185,129,0.08)]"
        />
        <DataCard
          title="Workforce Today"
          value={stats.todayAttendance}
          icon={<Activity className="w-5 h-5 text-amber-400" />}
          description="Personnel checked-in today"
          className="hover:border-amber-500/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(245,158,11,0.08)]"
        />
        <DataCard
          title="Pending Approvals"
          value={stats.pendingPOsCount}
          icon={<ClipboardCheck className="w-5 h-5 text-violet-400" />}
          description="Awaiting PR/PO clearance"
          className="hover:border-violet-500/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(139,92,246,0.08)]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Site Events Log */}
        <GlassPanel className="lg:col-span-2 p-6 border border-white/5 bg-slate-900/10 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Site Deployments</h2>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live Updates
            </span>
          </div>
          <div className="space-y-4">
            {stats.recentSites && stats.recentSites.length > 0 ? (
              stats.recentSites.map((site) => (
                <div 
                  key={site.id} 
                  className="flex items-center justify-between p-4 bg-slate-950/20 border border-white/5 rounded-xl hover:border-slate-700/50 hover:bg-slate-900/30 transition-all duration-200 active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 group-hover:bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.6)] transition-all" />
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{site.name}</p>
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-0.5">{site.siteCode || 'NO CODE'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Logged On</p>
                      <p className="text-xs font-mono font-medium text-slate-300">
                        {formatDate(site.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-xl bg-slate-950/10">
                <p className="text-slate-500 text-sm">No recent site activities found.</p>
              </div>
            )}
          </div>
        </GlassPanel>

        {/* System Health check list */}
        <GlassPanel className="p-6 border border-white/5 bg-slate-900/10 backdrop-blur-md shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-6 tracking-tight">Telemetry & Infrastructure</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2 font-medium">
                  <Database className="w-4 h-4 text-emerald-400" /> DB Connection
                </span>
                <span className="text-emerald-400 font-bold font-mono text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">98%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[98%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2 font-medium">
                  <Radio className="w-4 h-4 text-emerald-400" /> Edge Cache Latency
                </span>
                <span className="text-emerald-400 font-bold font-mono text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">12ms</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[95%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2 font-medium">
                  <HardDrive className="w-4 h-4 text-blue-400" /> File Storage (S3)
                </span>
                <span className="text-blue-400 font-bold font-mono text-xs bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">24%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[24%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Briefcase, 
  MapPin, 
  ClipboardList, 
  ShoppingCart, 
  IndianRupee, 
  FileText,
  BarChart3,
  Settings,
  ShieldCheck,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Projects', href: '/projects', icon: Briefcase },
    { label: 'Sites', href: '/sites', icon: MapPin },
    { label: 'DPRs', href: '/dpr', icon: ClipboardList },
    { label: 'Procurement', href: '/procurement', icon: ShoppingCart },
    { label: 'Finance', href: '/finance', icon: IndianRupee },
    { label: 'Documents', href: '/documents', icon: FileText },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-950/45 backdrop-blur-xl border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
      {/* Brand logo section with neon glow */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <ShieldCheck className="w-5.5 h-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
            ConstructionOS
          </h1>
          <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Enterprise</span>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                isActive 
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-[0_4px_20px_rgba(59,130,246,0.08)]" 
                  : "text-slate-400 border border-transparent hover:text-white hover:bg-white/5 hover:border-white/5"
              )}
            >
              <Icon className={cn(
                "w-4.5 h-4.5 transition-colors duration-200",
                isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
              )} />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile & Settings */}
      <div className="p-4 border-t border-white/5 space-y-3 bg-slate-950/20">
        <Link 
          href="/settings"
          className={cn(
            "w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 active:scale-[0.98]",
            pathname === '/settings' 
              ? "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_4px_20px_rgba(59,130,246,0.08)]" 
              : "text-slate-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/5"
          )}
        >
          <Settings className={cn(
            "w-4.5 h-4.5 transition-colors duration-200",
            pathname === '/settings' ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
          )} />
          Settings
        </Link>

        {/* Mock Logged-in User Info block */}
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
          <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">Hrushikesh M.</p>
            <p className="text-[10px] text-slate-500 truncate font-mono">Project Director</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

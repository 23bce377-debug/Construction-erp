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
  ShieldCheck
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
    <aside className="w-64 h-screen bg-slate-950/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
          ConstOS
        </h1>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 shadow-[inset_0_0_10px_rgba(37,99,235,0.05)]" 
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
              )} />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-900">
        <Link 
          href="/settings"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all",
            pathname === '/settings' 
              ? "bg-blue-600/10 text-blue-400 shadow-[inset_0_0_10px_rgba(37,99,235,0.05)] border border-blue-500/20" 
              : "text-slate-500 hover:text-white hover:bg-slate-900/40"
          )}
        >
          <Settings className={cn(
            "w-4 h-4 transition-colors",
            pathname === '/settings' ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
          )} />
          Settings
          {pathname === '/settings' && (
            <div className="ml-auto w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          )}
        </Link>
      </div>
    </aside>
  );
}

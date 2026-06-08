import React from 'react';
import { GlassPanel } from './glass-panel';
import { cn } from '@/lib/utils';

interface DataCardProps {
  label?: string;
  title?: string;
  value: string | number;
  subValue?: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export const DataCard = ({ label, title, value, subValue, description, trend, icon, className }: DataCardProps) => {
  const displayLabel = label || title || '';
  const displaySubValue = subValue || description;

  return (
    <GlassPanel className={cn("p-4 flex flex-col gap-1", className)}>
      <div className="flex justify-between items-start">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{displayLabel}</span>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold font-mono text-white tracking-tight">
          {value}
        </span>
        {displaySubValue && (
          <span className="text-xs text-slate-500 font-mono italic">{displaySubValue}</span>
        )}
      </div>
      {trend && (
        <div className={cn(
          "text-[10px] font-medium mt-1 uppercase",
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'
        )}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend}
        </div>
      )}
    </GlassPanel>
  );
};


import React from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const GlassPanel = ({ children, className, ...props }: GlassPanelProps) => {
  return (
    <div 
      className={cn(
        "bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};

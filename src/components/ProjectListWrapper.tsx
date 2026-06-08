'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { Plus, Calendar, Briefcase, IndianRupee, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '@/lib/actions/projects';
import { formatDate } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  code: string | null;
  clientName: string | null;
  contractValue: string | null;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate: string | null;
  endDate: string | null;
}

interface ProjectListWrapperProps {
  initialProjects: Project[];
}

export function ProjectListWrapper({ initialProjects }: ProjectListWrapperProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { data: projectsList = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => getProjects() as unknown as Promise<Project[]>,
    initialData: initialProjects,
  });

  const formatCurrency = (val: string | null) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Helper to get simulated completion % based on status
  const getSimulatedProgress = (status: string) => {
    switch (status) {
      case 'completed': return 100;
      case 'active': return 45;
      case 'on_hold': return 20;
      case 'planning': return 5;
      default: return 0;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Projects Portfolio
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">Manage scope, schedule, and contract values across sites</p>
        </div>
        <Button 
          onClick={() => {
            if (editingProject) {
              setEditingProject(null);
              setShowForm(false);
            } else {
              setShowForm(!showForm);
            }
          }}
          className="active:scale-[0.98] transition-transform flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          {showForm || editingProject ? 'Cancel' : 'New Project'}
        </Button>
      </div>

      {(showForm || editingProject) && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <ProjectForm 
            initialData={editingProject || undefined}
            onSuccess={() => {
              setShowForm(false);
              setEditingProject(null);
            }} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projectsList.map((project: Project) => {
          const progress = getSimulatedProgress(project.status);
          return (
            <GlassPanel 
              key={project.id} 
              className="p-6 flex flex-col justify-between border border-white/5 bg-slate-900/10 hover:border-blue-500/20 hover:bg-slate-900/20 hover:shadow-[0_8px_30px_rgb(59,130,246,0.04)] transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="space-y-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                      {project.name}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      {project.code || 'NO-CODE'}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium truncate">{project.clientName || 'Direct Client'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <IndianRupee className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-mono text-emerald-400 font-semibold">
                      {formatCurrency(project.contractValue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-mono">
                      {formatDate(project.startDate)} - {formatDate(project.endDate)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Completion
                    </span>
                    <span className="text-blue-400 font-mono font-semibold">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                <Link href={`/sites?projectId=${project.id}`} className="flex-1">
                  <Button variant="outline" className="w-full text-xs py-1 h-8.5 rounded-lg">View Details</Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingProject(project);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex-1 text-xs py-1 h-8.5 rounded-lg"
                >
                  Edit
                </Button>
              </div>
            </GlassPanel>
          );
        })}
        
        {projectsList.length === 0 && !showForm && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-500 bg-slate-950/10 border border-dashed border-white/5 rounded-2xl">
            <Briefcase className="w-12 h-12 mb-4 opacity-20 text-blue-400" />
            <p className="font-medium text-sm">No projects found in this portfolio.</p>
            <p className="text-xs text-slate-600 mt-1">Create your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

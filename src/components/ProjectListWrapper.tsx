'use client';

import { useState } from 'react';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { Plus, Calendar, Briefcase, IndianRupee } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '@/lib/actions/projects';

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-slate-400">Manage and monitor project lifecycles</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="active:scale-[0.98] transition-transform flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Project'}
        </Button>
      </div>

      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <ProjectForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projectsList.map((project: Project) => (
          <GlassPanel key={project.id} className="p-6 flex flex-col justify-between group hover:border-slate-700 transition-colors">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                    {project.code || 'NO-CODE'}
                  </p>
                </div>
                <StatusBadge status={project.status} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">{project.clientName || 'Direct Client'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <IndianRupee className="w-4 h-4" />
                  <span className="text-sm font-jetbrains font-mono text-emerald-400">
                    {formatCurrency(project.contractValue)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-jetbrains font-mono">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'} - 
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800/50 flex gap-2">
              <Button variant="outline" className="flex-1 text-xs py-1 h-8">View Details</Button>
              <Button variant="outline" className="flex-1 text-xs py-1 h-8">Edit</Button>
            </div>
          </GlassPanel>
        ))}
        
        {projectsList.length === 0 && !showForm && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl">
            <Briefcase className="w-12 h-12 mb-4 opacity-20" />
            <p>No projects found. Create your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}


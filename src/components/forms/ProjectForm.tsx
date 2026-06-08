'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema } from '@/lib/validations';
import { createProject } from '@/lib/actions/projects';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  onSuccess?: () => void;
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'planning',
    },
  });

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      reset();
      onSuccess?.();
    },
  });

  async function onSubmit(data: ProjectFormValues) {
    mutation.mutate(data);
  }


  return (
    <GlassPanel className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Project Name</label>
            <input
              {...register('name')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="e.g. Skyline Towers"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Project Code</label>
            <input
              {...register('code')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="PRJ-001"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Client Name</label>
            <input
              {...register('clientName')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Client Corp"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Contract Value</label>
            <input
              {...register('contractValue')}
              type="number"
              step="0.01"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Status</label>
            <select
              {...register('status')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Start Date</label>
            <input
              {...register('startDate')}
              type="date"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">End Date</label>
            <input
              {...register('endDate')}
              type="date"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full active:scale-[0.98] transition-transform"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}

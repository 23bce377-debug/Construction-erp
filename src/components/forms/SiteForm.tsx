'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { siteSchema } from '@/lib/validations';
import { createSite } from '@/lib/actions/projects';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type SiteFormValues = z.infer<typeof siteSchema>;

interface SiteFormProps {
  projectId: string;
  onSuccess?: () => void;
}

export function SiteForm({ projectId, onSuccess }: SiteFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      projectId,
      status: 'setup',
    },
  });

  const mutation = useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      reset();
      onSuccess?.();
    },
  });

  async function onSubmit(data: SiteFormValues) {
    mutation.mutate(data);
  }


  return (
    <GlassPanel className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('projectId')} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Site Name</label>
            <input
              {...register('name')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="e.g. Phase 1 Foundation"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Site Code</label>
            <input
              {...register('siteCode')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="SITE-01"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-400">Address</label>
            <textarea
              {...register('address')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Full site address..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Status</label>
            <select
              {...register('status')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              <option value="setup">Setup</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full active:scale-[0.98] transition-transform"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Site'}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}

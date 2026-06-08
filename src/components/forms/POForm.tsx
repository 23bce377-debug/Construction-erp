'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { poSchema } from '@/lib/validations';
import { createPO } from '@/lib/actions/procurement';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type POFormValues = z.infer<typeof poSchema>;

interface POFormProps {
  vendors: { id: string; name: string }[];
  sites?: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function POForm({ vendors, sites, onSuccess }: POFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      status: 'draft',
      totalAmount: '0',
    },
  });

  const mutation = useMutation({
    mutationFn: createPO,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      reset();
      onSuccess?.();
    },
  });

  async function onSubmit(data: POFormValues) {
    mutation.mutate(data);
  }


  return (
    <GlassPanel className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Vendor</label>
            <select
              {...register('vendorId')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              <option value="">Select Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            {errors.vendorId && <p className="text-xs text-red-500">{errors.vendorId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">PO Number</label>
            <input
              {...register('poNumber')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="PO-2024-001"
            />
            {errors.poNumber && <p className="text-xs text-red-500">{errors.poNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Total Amount</label>
            <input
              {...register('totalAmount')}
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
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="sent_to_vendor">Sent to Vendor</option>
            </select>
          </div>

          {sites && sites.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Site (Optional)</label>
              <select
                {...register('siteId')}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                <option value="">Select Site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full active:scale-[0.98] transition-transform"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Purchase Order'}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}


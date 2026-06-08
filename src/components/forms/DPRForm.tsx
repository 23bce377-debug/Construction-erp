'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { attendanceSchema } from '@/lib/validations';
import { recordAttendance } from '@/lib/actions/workforce';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type AttendanceFormValues = z.infer<typeof attendanceSchema>;

interface DPRFormProps {
  workers: { id: string; name: string; trade: string }[];
  sites: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function DPRForm({ workers, sites, onSuccess }: DPRFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      attendanceDate: new Date().toISOString().split('T')[0],
      shift: 'day',
      attendanceType: 'present',
      hoursWorked: '8',
    },
  });

  const mutation = useMutation({
    mutationFn: recordAttendance,
    onSuccess: (_, variables) => {
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      const vars = variables as AttendanceFormValues;
      reset({
        ...vars,
        workerId: '', // Reset worker only to allow quick entry for next worker
      });
      onSuccess?.();
    },
  });

  async function onSubmit(data: AttendanceFormValues) {
    mutation.mutate(data);
  }


  return (
    <GlassPanel className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Daily Progress Report - Attendance</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Site</label>
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
            {errors.siteId && <p className="text-xs text-red-500">{errors.siteId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Date</label>
            <input
              {...register('attendanceDate')}
              type="date"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            {errors.attendanceDate && <p className="text-xs text-red-500">{errors.attendanceDate.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Worker</label>
            <select
              {...register('workerId')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              <option value="">Select Worker</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} ({worker.trade})
                </option>
              ))}
            </select>
            {errors.workerId && <p className="text-xs text-red-500">{errors.workerId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Shift</label>
            <select
              {...register('shift')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              <option value="day">Day Shift</option>
              <option value="night">Night Shift</option>
              <option value="overtime">Overtime</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Hours Worked</label>
            <input
              {...register('hoursWorked')}
              type="number"
              step="0.5"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Attendance Type</label>
            <select
              {...register('attendanceType')}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full active:scale-[0.98] transition-transform"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Recording...' : 'Record Attendance'}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}


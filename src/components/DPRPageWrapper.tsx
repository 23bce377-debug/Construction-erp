'use client';

import { useState, useEffect } from 'react';
import { createDPR, recordAttendanceBatch, recordMaterialIssue, getWorkers } from '@/lib/actions/dpr';
import { getSites, getActivities } from '@/lib/actions/projects';
import { getItems } from '@/lib/actions/procurement';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { CloudOff, RefreshCw, Wifi, Layers, UserCheck, PackageOpen, Calendar, HelpCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Site {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
  siteId: string;
  uom: string;
}

interface Worker {
  id: string;
  name: string;
  trade: string;
}

interface Item {
  id: string;
  name: string;
  uom: string;
}

interface DPRPageWrapperProps {
  sites: Site[];
  activities: Activity[];
  workers: Worker[];
  items: Item[];
}

export function DPRPageWrapper({ sites, activities, workers, items }: DPRPageWrapperProps) {
  const queryClient = useQueryClient();

  const { data: sitesList = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => getSites() as unknown as Promise<Site[]>,
    initialData: sites,
  });

  const { data: activitiesList = [] } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => getActivities() as unknown as Promise<Activity[]>,
    initialData: activities,
  });

  const { data: workersList = [] } = useQuery<Worker[]>({
    queryKey: ['workers'],
    queryFn: () => getWorkers() as unknown as Promise<Worker[]>,
    initialData: workers,
  });

  const { data: itemsList = [] } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => getItems() as unknown as Promise<Item[]>,
    initialData: items,
  });

  const [selectedSiteId, setSelectedSiteId] = useState<string>(sitesList[0]?.id || sites[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'work' | 'attendance' | 'material'>('work');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState<{ id: string; type: string; payload: unknown; timestamp: string }[]>([]);

  // Form states - Work Log
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [qtyDone, setQtyDone] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [workRemarks, setWorkRemarks] = useState('');

  // Form states - Attendance Batch
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { shift: string; hoursWorked: string; attendanceType: string }>>({});

  // Form states - Material Issue
  const [selectedItemId, setSelectedItemId] = useState('');
  const [issueQty, setIssueQty] = useState('');
  const [issueActivityId, setIssueActivityId] = useState('');

  // Sync state if sitesList updates from empty to loaded
  useEffect(() => {
    if (!selectedSiteId && sitesList.length > 0) {
      setSelectedSiteId(sitesList[0].id);
    }
  }, [sitesList, selectedSiteId]);

  // Load unsynced records from localStorage
  useEffect(() => {
    const cached = localStorage.getItem('dpr_unsynced_data');
    if (cached) {
      setTimeout(() => {
        setPendingSync(JSON.parse(cached));
      }, 0);
    }
  }, []);

  // Filter activities for the selected site
  const siteActivities = activitiesList.filter(a => a.siteId === selectedSiteId);

  // Initialize attendance records
  useEffect(() => {
    const initial: typeof attendanceRecords = {};
    workersList.forEach(w => {
      initial[w.id] = { shift: 'day', hoursWorked: '8', attendanceType: 'present' };
    });
    setTimeout(() => {
      setAttendanceRecords(initial);
    }, 0);
  }, [workersList]);

  const handleOfflineSave = (type: string, payload: unknown) => {
    const newRecord = {
      id: Math.random().toString(36).substring(7),
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    const updated = [...pendingSync, newRecord];
    setPendingSync(updated);
    localStorage.setItem('dpr_unsynced_data', JSON.stringify(updated));
    alert(`Device Offline! Record saved locally. (${updated.length} logs pending sync)`);
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      for (const record of pendingSync) {
        if (record.type === 'work') {
          await createDPR(record.payload as any);
        } else if (record.type === 'attendance') {
          await recordAttendanceBatch(record.payload as any);
        } else if (record.type === 'material') {
          await recordMaterialIssue(record.payload as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryStock'] });
      setPendingSync([]);
      localStorage.removeItem('dpr_unsynced_data');
      alert('All offline progress records synced successfully!');
    },
    onError: (err) => {
      console.error(err);
      alert('Sync failed. Please check connection and try again.');
    }
  });

  const handleSync = async () => {
    if (pendingSync.length === 0 || syncMutation.isPending) return;
    syncMutation.mutate();
  };

  const createDPRMutation = useMutation({
    mutationFn: createDPR,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setQtyDone('');
      setWorkRemarks('');
      alert('Daily activity log recorded successfully!');
    }
  });

  const recordAttendanceBatchMutation = useMutation({
    mutationFn: recordAttendanceBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      alert('Attendance logs recorded successfully!');
    }
  });

  const recordMaterialIssueMutation = useMutation({
    mutationFn: recordMaterialIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryStock'] });
      setIssueQty('');
      setSelectedItemId('');
      setIssueActivityId('');
      alert('Material issuance tracked successfully!');
    }
  });

  // Submit Work Log
  const handleWorkLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityId || !qtyDone) return;

    const activity = activitiesList.find(a => a.id === selectedActivityId);
    const payload = {
      siteId: selectedSiteId,
      dprDate: workDate,
      weather: 'clear',
      totalWorkers: Object.values(attendanceRecords).filter(r => r.attendanceType === 'present').length,
      progressEntries: [
        {
          activityId: selectedActivityId,
          qtyDoneToday: qtyDone,
          uom: activity?.uom || 'NOS',
          remarks: workRemarks,
        }
      ]
    };

    if (!isOnline) {
      handleOfflineSave('work', payload);
      setQtyDone('');
      setWorkRemarks('');
    } else {
      createDPRMutation.mutate(payload);
    }
  };

  // Submit Attendance
  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const records = Object.entries(attendanceRecords).map(([workerId, data]) => ({
      workerId,
      ...data,
    }));

    const payload = {
      siteId: selectedSiteId,
      attendanceDate,
      records,
    };

    if (!isOnline) {
      handleOfflineSave('attendance', payload);
    } else {
      recordAttendanceBatchMutation.mutate(payload);
    }
  };

  // Submit Material Issue
  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !issueQty) return;

    const item = itemsList.find(i => i.id === selectedItemId);
    const payload = {
      siteId: selectedSiteId,
      itemId: selectedItemId,
      qty: issueQty,
      uom: item?.uom || 'NOS',
      activityId: issueActivityId || undefined,
    };

    if (!isOnline) {
      handleOfflineSave('material', payload);
      setIssueQty('');
      setSelectedItemId('');
      setIssueActivityId('');
    } else {
      recordMaterialIssueMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Offline/Online Simulation Banner */}
      <GlassPanel className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/5 bg-slate-900/10 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl flex items-center justify-center relative ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {isOnline ? (
              <>
                <Wifi className="w-5.5 h-5.5" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </>
            ) : (
              <CloudOff className="w-5.5 h-5.5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Execution Connectivity</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isOnline ? 'Online mode active. Submissions sync automatically.' : 'Offline storage enabled. Progress logs cached in client buffer.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingSync.length > 0 && (
            <Button
              onClick={handleSync}
              disabled={syncMutation.isPending || !isOnline}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 px-4 active:scale-95 transition-transform"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Buffer ({pendingSync.length})
            </Button>
          )}
          <Button
            variant="outline"
            className="h-9 px-4 border-white/5 hover:border-slate-700 bg-slate-950/20 text-slate-300"
            onClick={() => setIsOnline(!isOnline)}
          >
            {isOnline ? 'Go Offline' : 'Go Online'}
          </Button>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left column: Site selector and tabs */}
        <div className="space-y-4">
          <GlassPanel className="p-4 space-y-4 border border-white/5 bg-slate-900/10">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Execution Site</h3>
            <select
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50"
            >
              {sitesList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </GlassPanel>

          <GlassPanel className="p-2 space-y-1 border border-white/5 bg-slate-900/10">
            <button
              onClick={() => setActiveTab('work')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                activeTab === 'work' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_4px_15px_rgba(59,130,246,0.06)]' : 'text-slate-400 border border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-4.5 h-4.5" /> Daily Work Logs
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                activeTab === 'attendance' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_4px_15px_rgba(245,158,11,0.06)]' : 'text-slate-400 border border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-4.5 h-4.5" /> Attendance Batch
            </button>
            <button
              onClick={() => setActiveTab('material')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                activeTab === 'material' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_4px_15px_rgba(139,92,246,0.06)]' : 'text-slate-400 border border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <PackageOpen className="w-4.5 h-4.5" /> Material Issue
            </button>
          </GlassPanel>
        </div>

        {/* Right column: Tab content */}
        <div className="lg:col-span-3">
          {activeTab === 'work' && (
            <GlassPanel className="p-6 border border-white/5 bg-slate-900/10 backdrop-blur-md shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-6 tracking-tight">Log Daily Quantities Achieved</h2>
              <form onSubmit={handleWorkLogSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Site Activity</label>
                    <select
                      value={selectedActivityId}
                      onChange={e => setSelectedActivityId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Activity</option>
                      {siteActivities.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.uom})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date of Execution</label>
                    <input
                      type="date"
                      value={workDate}
                      onChange={e => setWorkDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quantity Completed</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 150"
                      value={qtyDone}
                      onChange={e => setQtyDone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Remarks / Constraints</label>
                    <input
                      type="text"
                      placeholder="e.g. Work halted due to rain"
                      value={workRemarks}
                      onChange={e => setWorkRemarks(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="submit" className="w-full md:w-auto px-6 active:scale-95 transition-transform">
                    Submit Log Entry
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          {activeTab === 'attendance' && (
            <GlassPanel className="p-6 border border-white/5 bg-slate-900/10 backdrop-blur-md shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight font-sans">Worker Attendance Roll Call</h2>
                  <p className="text-slate-400 text-xs mt-1 font-medium">Daily manpower log and payroll reference check</p>
                </div>
                <div className="flex items-center gap-3.5 self-start sm:self-auto">
                  <Calendar className="w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <form onSubmit={handleAttendanceSubmit} className="space-y-6">
                <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Personnel</th>
                        <th className="px-6 py-4">Trade</th>
                        <th className="px-6 py-4">Attendance Status</th>
                        <th className="px-6 py-4">Shift Type</th>
                        <th className="px-6 py-4">Hours Logged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {workersList.map(w => {
                        const rec = attendanceRecords[w.id] || { shift: 'day', hoursWorked: '8', attendanceType: 'present' };
                        return (
                          <tr key={w.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-white">{w.name}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-400">{w.trade}</td>
                            <td className="px-6 py-4">
                              <select
                                value={rec.attendanceType}
                                onChange={e => setAttendanceRecords(prev => ({
                                  ...prev,
                                  [w.id]: { ...rec, attendanceType: e.target.value }
                                }))}
                                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                              >
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="half_day">Half Day</option>
                                <option value="on_leave">On Leave</option>
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={rec.shift}
                                onChange={e => setAttendanceRecords(prev => ({
                                  ...prev,
                                  [w.id]: { ...rec, shift: e.target.value }
                                }))}
                                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                              >
                                <option value="day">General Day</option>
                                <option value="night">Night Shift</option>
                                <option value="overtime">Overtime</option>
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                step="0.5"
                                value={rec.hoursWorked}
                                onChange={e => setAttendanceRecords(prev => ({
                                  ...prev,
                                  [w.id]: { ...rec, hoursWorked: e.target.value }
                                }))}
                                className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono text-center"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" className="px-6 active:scale-95 transition-transform shadow-lg">
                    Publish Attendance Batch
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          {activeTab === 'material' && (
            <GlassPanel className="p-6 border border-white/5 bg-slate-900/10 backdrop-blur-md shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-6 tracking-tight">Track Material Consumption</h2>
              <form onSubmit={handleMaterialSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Item / Material Code</label>
                    <select
                      value={selectedItemId}
                      onChange={e => setSelectedItemId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Item</option>
                      {itemsList.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.uom})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quantity Issued</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 50"
                      value={issueQty}
                      onChange={e => setIssueQty(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Link to Work Activity (Optional)</label>
                    <select
                      value={issueActivityId}
                      onChange={e => setIssueActivityId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">General Site Buffer (Unlinked)</option>
                      {siteActivities.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="submit" className="w-full md:w-auto px-6 active:scale-95 transition-transform shadow-lg">
                    Log Material Issue
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}

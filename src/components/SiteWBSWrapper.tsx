'use client';

import { useState } from 'react';
import { createWorkfront, createActivity, getSites, getWorkfronts, getActivities, getCostCodes } from '@/lib/actions/projects';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { Plus, ChevronDown, ChevronRight, Folder, CheckSquare, Layers, Award, Hash } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Workfront {
  id: string;
  siteId: string;
  name: string;
  levelType: string;
  parentId: string | null;
  status: string;
}

interface Activity {
  id: string;
  siteId: string;
  workfrontId: string;
  costCodeId: string | null;
  name: string;
  plannedQty: string | null;
  uom: string;
  status: string;
  completionPct: string;
}

interface Site {
  id: string;
  name: string;
  siteCode: string | null;
  status: string;
}

interface CostCode {
  id: string;
  code: string;
  description: string;
}

interface SiteWBSWrapperProps {
  sites: Site[];
  workfronts: Workfront[];
  activities: Activity[];
  costCodes: CostCode[];
}

export function SiteWBSWrapper({ sites, workfronts, activities, costCodes }: SiteWBSWrapperProps) {
  const queryClient = useQueryClient();

  const { data: sitesList = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => getSites() as unknown as Promise<Site[]>,
    initialData: sites,
  });

  const { data: workfrontsList = [] } = useQuery<Workfront[]>({
    queryKey: ['workfronts'],
    queryFn: () => getWorkfronts() as unknown as Promise<Workfront[]>,
    initialData: workfronts,
  });

  const { data: activitiesList = [] } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => getActivities() as unknown as Promise<Activity[]>,
    initialData: activities,
  });

  const { data: costCodesList = [] } = useQuery<CostCode[]>({
    queryKey: ['costCodes'],
    queryFn: () => getCostCodes() as unknown as Promise<CostCode[]>,
    initialData: costCodes,
  });

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(sitesList[0]?.id || null);
  const [expandedWorkfronts, setExpandedWorkfronts] = useState<Record<string, boolean>>({});
  const [showWorkfrontForm, setShowWorkfrontForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState<string | null>(null);

  // Form states
  const [wfName, setWfName] = useState('');
  const [wfLevel, setWfLevel] = useState('Block');
  const [wfParent, setWfParent] = useState('');

  const [actName, setActName] = useState('');
  const [actQty, setActQty] = useState('');
  const [actUom, setActUom] = useState('CUM');
  const [actCostCode, setActCostCode] = useState('');

  const selectedSite = sitesList.find(s => s.id === selectedSiteId);

  const siteWorkfronts = workfrontsList.filter(w => w.siteId === selectedSiteId);
  const siteActivities = activitiesList.filter(a => a.siteId === selectedSiteId);

  // Calculate site health
  const getSiteHealth = (siteId: string) => {
    const siteActs = activitiesList.filter(a => a.siteId === siteId);
    if (siteActs.length === 0) return 0;
    const sum = siteActs.reduce((acc, act) => acc + Number(act.completionPct || 0), 0);
    return Math.round(sum / siteActs.length);
  };

  const toggleWorkfront = (wfId: string) => {
    setExpandedWorkfronts(prev => ({ ...prev, [wfId]: !prev[wfId] }));
  };

  const addWorkfrontMutation = useMutation({
    mutationFn: createWorkfront,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workfronts'] });
      setWfName('');
      setShowWorkfrontForm(false);
    }
  });

  const addActivityMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setActName('');
      setActQty('');
      setActCostCode('');
      setShowActivityForm(null);
    }
  });

  const handleAddWorkfront = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId || !wfName) return;
    addWorkfrontMutation.mutate({
      siteId: selectedSiteId,
      name: wfName,
      levelType: wfLevel,
      parentId: wfParent || undefined,
      status: 'pending',
    });
  };

  const handleAddActivity = async (e: React.FormEvent, wfId: string) => {
    e.preventDefault();
    if (!selectedSiteId || !actName) return;
    addActivityMutation.mutate({
      siteId: selectedSiteId,
      workfrontId: wfId,
      name: actName,
      plannedQty: actQty || '0',
      uom: actUom,
      costCodeId: actCostCode || undefined,
      status: 'planned',
      completionPct: '0',
    });
  };


  // Build hierarchical WBS tree
  const renderWorkfrontNode = (wf: Workfront, depth = 0) => {
    const isExpanded = !!expandedWorkfronts[wf.id];
    const childWorkfronts = siteWorkfronts.filter(w => w.parentId === wf.id);
    const wfActivities = siteActivities.filter(a => a.workfrontId === wf.id);
    const hasChildren = childWorkfronts.length > 0 || wfActivities.length > 0;

    return (
      <div key={wf.id} className="space-y-2" style={{ marginLeft: `${depth * 20}px` }}>
        <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800/80 rounded-lg hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-2">
            <button onClick={() => hasChildren && toggleWorkfront(wf.id)} className="text-slate-500 hover:text-white">
              {hasChildren ? (
                isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>
            <Layers className="w-4 h-4 text-blue-400" />
            <div>
              <span className="text-sm font-medium text-white">{wf.name}</span>
              <span className="text-xs text-slate-500 ml-2 font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                {wf.levelType}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-7 text-xs px-2 py-0"
              onClick={() => setShowActivityForm(showActivityForm === wf.id ? null : wf.id)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Activity
            </Button>
            <StatusBadge status={wf.status as string} />
          </div>
        </div>

        {/* Form to add activity inside this Workfront */}
        {showActivityForm === wf.id && (
          <GlassPanel className="p-4 border-dashed border-blue-500/30 ml-6">
            <form onSubmit={(e) => handleAddActivity(e, wf.id)} className="space-y-3">
              <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">New Activity</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Activity Name (e.g., Brickwork, Plastering)"
                  value={actName}
                  onChange={e => setActName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  required
                />
                <select
                  value={actCostCode}
                  onChange={e => setActCostCode(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="">Link Cost Code</option>
                  {costCodesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.description}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Planned Qty"
                  value={actQty}
                  onChange={e => setActQty(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="UOM (e.g. CUM, SQM, KG)"
                  value={actUom}
                  onChange={e => setActUom(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-7 text-xs" type="button" onClick={() => setShowActivityForm(null)}>
                  Cancel
                </Button>
                <Button className="h-7 text-xs" type="submit">
                  Save Activity
                </Button>
              </div>
            </form>
          </GlassPanel>
        )}

        {isExpanded && (
          <div className="space-y-2">
            {wfActivities.map(act => {
              const codeObj = costCodesList.find(c => c.id === act.costCodeId);
              return (
                <div
                  key={act.id}
                  className="ml-6 flex items-center justify-between p-3 bg-slate-950/40 border border-slate-900 rounded-lg hover:border-slate-850"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{act.name}</p>
                      {codeObj && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                          <Hash className="w-3 h-3 text-slate-600" /> {codeObj.code} ({codeObj.description})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-mono font-medium">
                        {act.plannedQty || '0'} {act.uom}
                      </p>
                      <p className="text-[10px] text-slate-500">Planned Scope</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-400 font-mono font-bold">{act.completionPct}%</p>
                      <div className="w-16 bg-slate-900 h-1 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${act.completionPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {childWorkfronts.map(child => renderWorkfrontNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 1. Sites Health & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sitesList.map(site => {
          const health = getSiteHealth(site.id);
          return (
            <GlassPanel
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`p-6 cursor-pointer flex flex-col justify-between border-2 transition-all ${
                selectedSiteId === site.id ? 'border-blue-500' : 'border-white/5 hover:border-slate-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-white leading-tight">{site.name}</h3>
                  <StatusBadge status={site.status as string} />
                </div>
                <p className="text-xs font-mono text-slate-500">{site.siteCode || 'NO-CODE'}</p>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Site Completion</span>
                  <span className="font-semibold text-white">{health}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${health}%` }}
                  />
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {/* 2. Interactive WBS Tree */}
      {selectedSite && (
        <GlassPanel className="p-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Work Breakdown Structure (WBS)</h2>
              <p className="text-slate-400 text-sm mt-0.5">Explore workfronts and activities for {selectedSite.name}</p>
            </div>
            <Button
              className="active:scale-[0.98] transition-transform flex items-center gap-1.5"
              onClick={() => setShowWorkfrontForm(!showWorkfrontForm)}
            >
              <Plus className="w-4 h-4" /> Add Workfront
            </Button>
          </div>

          {showWorkfrontForm && (
            <GlassPanel className="p-4 border border-dashed border-blue-500/20 mb-6">
              <form onSubmit={handleAddWorkfront} className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">New Workfront Node</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-medium">Workfront Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Block A, Tower 2, 4th Floor"
                      value={wfName}
                      onChange={e => setWfName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-medium">Level Type</label>
                    <select
                      value={wfLevel}
                      onChange={e => setWfLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="Block">Block</option>
                      <option value="Tower">Tower</option>
                      <option value="Floor">Floor</option>
                      <option value="Zone">Zone</option>
                      <option value="Wing">Wing</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-medium">Parent Workfront (Optional)</label>
                    <select
                      value={wfParent}
                      onChange={e => setWfParent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="">None (Root Level)</option>
                      {siteWorkfronts.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.levelType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setShowWorkfrontForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Workfront</Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="space-y-4">
            {siteWorkfronts.filter(w => !w.parentId).map(rootWf => renderWorkfrontNode(rootWf))}
            {siteWorkfronts.length === 0 && (
              <p className="text-slate-500 text-center py-8">No workfronts created for this site yet.</p>
            )}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

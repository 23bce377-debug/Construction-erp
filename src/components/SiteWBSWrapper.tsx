'use client';

import { useState, useEffect } from 'react';
import { createWorkfront, createActivity, getSites, getWorkfronts, getActivities, getCostCodes } from '@/lib/actions/projects';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { Plus, ChevronDown, ChevronRight, Folder, CheckSquare, Layers, Award, Hash, ArrowRight } from 'lucide-react';
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
  projectId: string;
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
  initialProjectId?: string;
}

export function SiteWBSWrapper({ sites, workfronts, activities, costCodes, initialProjectId }: SiteWBSWrapperProps) {
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

  // Sync state if sitesList updates from empty to loaded (e.g. after seed) or if initialProjectId is provided
  useEffect(() => {
    if (initialProjectId) {
      const projectSites = sitesList.filter(s => s.projectId === initialProjectId);
      if (projectSites.length > 0) {
        setSelectedSiteId(projectSites[0].id);
        return;
      }
    }
    if (!selectedSiteId && sitesList.length > 0) {
      setSelectedSiteId(sitesList[0].id);
    }
  }, [sitesList, selectedSiteId, initialProjectId]);

  const selectedSite = sitesList.find(s => s.id === selectedSiteId);
  const siteWorkfronts = workfrontsList.filter(w => w.siteId === selectedSiteId);
  const siteActivities = activitiesList.filter(a => a.siteId === selectedSiteId);

  // Calculate site health / overall completion %
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

  // Build hierarchical WBS tree nodes recursively
  const renderWorkfrontNode = (wf: Workfront, depth = 0) => {
    const isExpanded = !!expandedWorkfronts[wf.id];
    const childWorkfronts = siteWorkfronts.filter(w => w.parentId === wf.id);
    const wfActivities = siteActivities.filter(a => a.workfrontId === wf.id);
    const hasChildren = childWorkfronts.length > 0 || wfActivities.length > 0;

    return (
      <div key={wf.id} className="space-y-2.5 relative" style={{ marginLeft: `${depth > 0 ? 24 : 0}px` }}>
        {/* Left vertical timeline line connector */}
        {depth > 0 && (
          <div className="absolute -left-3.5 top-0 bottom-0 w-[1px] bg-slate-800" />
        )}

        <div className="flex items-center justify-between p-3.5 bg-slate-900/20 border border-white/5 rounded-xl hover:border-slate-700/50 hover:bg-slate-900/30 transition-all duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => hasChildren && toggleWorkfront(wf.id)} 
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>
            <Layers className="w-4.5 h-4.5 text-blue-500 shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-white truncate">{wf.name}</span>
              <span className="text-[9px] text-blue-400 font-mono font-bold uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full shrink-0">
                {wf.levelType}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              className="h-7.5 text-xs px-2.5 py-0 border-white/5 bg-slate-950/30 hover:border-blue-500/30 text-slate-300 hover:text-white"
              onClick={() => setShowActivityForm(showActivityForm === wf.id ? null : wf.id)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Activity
            </Button>
            <StatusBadge status={wf.status as any} />
          </div>
        </div>

        {/* Form to add activity inside this Workfront */}
        {showActivityForm === wf.id && (
          <GlassPanel className="p-4 border border-dashed border-blue-500/30 ml-6 bg-slate-950/20">
            <form onSubmit={(e) => handleAddActivity(e, wf.id)} className="space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <ArrowRight className="w-3.5 h-3.5" /> Configure Activity
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold uppercase">Activity Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Brickwork, Plastering"
                    value={actName}
                    onChange={e => setActName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold uppercase">Link Cost Code</label>
                  <select
                    value={actCostCode}
                    onChange={e => setActCostCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">No Cost Code Link</option>
                    {costCodesList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold uppercase">Planned Scope Qty</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={actQty}
                    onChange={e => setActQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold uppercase">Unit of Measure (UOM)</label>
                  <input
                    type="text"
                    placeholder="e.g. CUM, SQM, BAG"
                    value={actUom}
                    onChange={e => setActUom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <Button variant="outline" className="h-8 text-xs px-3" type="button" onClick={() => setShowActivityForm(null)}>
                  Cancel
                </Button>
                <Button className="h-8 text-xs px-4" type="submit" disabled={addActivityMutation.isPending}>
                  {addActivityMutation.isPending ? 'Saving...' : 'Save Activity'}
                </Button>
              </div>
            </form>
          </GlassPanel>
        )}

        {isExpanded && (
          <div className="space-y-2.5">
            {wfActivities.map(act => {
              const codeObj = costCodesList.find(c => c.id === act.costCodeId);
              return (
                <div
                  key={act.id}
                  className="ml-6 flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{act.name}</p>
                      {codeObj && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono mt-0.5 truncate">
                          <Hash className="w-3 h-3 text-slate-600" /> {codeObj.code} • {codeObj.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-300 font-mono font-bold">
                        {act.plannedQty || '0'} <span className="text-[10px] text-slate-500">{act.uom}</span>
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Budget Qty</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-400 font-mono font-extrabold">{act.completionPct}%</p>
                      <div className="w-20 bg-slate-950 h-1 rounded-full overflow-hidden mt-1.5 border border-white/5">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
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
    <div className="space-y-8 animate-fade-in">
      {/* 1. Sites Health & Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sitesList.map(site => {
          const health = getSiteHealth(site.id);
          const isActive = selectedSiteId === site.id;
          return (
            <GlassPanel
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`p-6 cursor-pointer flex flex-col justify-between border transition-all duration-300 active:scale-[0.98] ${
                isActive 
                  ? 'border-blue-500/40 bg-blue-500/5 shadow-[0_8px_30px_rgb(59,130,246,0.08)]' 
                  : 'border-white/5 bg-slate-900/10 hover:border-slate-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-base font-bold text-white leading-tight truncate">{site.name}</h3>
                  <StatusBadge status={site.status as any} />
                </div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{site.siteCode || 'NO-CODE'}</p>
              </div>
              <div className="mt-8 space-y-2">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-400">Site Work Completed</span>
                  <span className="text-blue-400 font-mono">{health}%</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${health}%` }}
                  />
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {/* 2. Interactive WBS Tree panel */}
      {selectedSite && (
        <GlassPanel className="p-6 border border-white/5 bg-slate-900/10 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-5 mb-6 gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Work Breakdown Structure (WBS)</h2>
              <p className="text-slate-400 text-xs mt-1 font-medium">Explore workfront nodes and daily activities for <span className="text-blue-400 font-bold">{selectedSite.name}</span></p>
            </div>
            <Button
              className="active:scale-[0.98] transition-transform flex items-center gap-1.5 self-start sm:self-auto"
              onClick={() => setShowWorkfrontForm(!showWorkfrontForm)}
            >
              <Plus className="w-4 h-4" /> Add Workfront Node
            </Button>
          </div>

          {/* Create Workfront Form Drawer */}
          {showWorkfrontForm && (
            <GlassPanel className="p-5 border border-dashed border-blue-500/20 mb-6 bg-slate-950/20">
              <form onSubmit={handleAddWorkfront} className="space-y-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">New WBS Branch Node</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold uppercase">Workfront Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Block A, Tower 2, 4th Floor"
                      value={wfName}
                      onChange={e => setWfName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold uppercase">Level Type</label>
                    <select
                      value={wfLevel}
                      onChange={e => setWfLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="Block">Block</option>
                      <option value="Tower">Tower</option>
                      <option value="Floor">Floor</option>
                      <option value="Zone">Zone</option>
                      <option value="Wing">Wing</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold uppercase">Parent Branch Node (Optional)</label>
                    <select
                      value={wfParent}
                      onChange={e => setWfParent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">None (Root Branch)</option>
                      {siteWorkfronts.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.levelType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 pt-2">
                  <Button variant="outline" type="button" onClick={() => setShowWorkfrontForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addWorkfrontMutation.isPending}>
                    {addWorkfrontMutation.isPending ? 'Creating...' : 'Create Node'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="space-y-3.5">
            {siteWorkfronts.filter(w => !w.parentId).map(rootWf => renderWorkfrontNode(rootWf))}
            {siteWorkfronts.length === 0 && (
              <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl bg-slate-950/10">
                <Folder className="w-10 h-10 mb-3 opacity-20 text-blue-400 mx-auto" />
                <p className="text-slate-500 text-sm font-medium">No workfront branches mapped for this site.</p>
                <p className="text-slate-600 text-xs mt-1">Add a workfront node to begin mapping activities.</p>
              </div>
            )}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

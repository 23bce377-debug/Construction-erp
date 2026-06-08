'use client';

import { useState } from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  User, 
  Settings, 
  Building, 
  Sliders, 
  Database, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Cpu,
  RefreshCw,
  Globe
} from 'lucide-react';
import { updateOrganization, updateProfile, getOrganization, getProfile } from '@/lib/actions/settings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SettingsWrapperProps {
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  } | null;
  profile: {
    id: string;
    fullName: string;
    designation: string | null;
    phone: string | null;
  } | null;
}

export function SettingsWrapper({ org, profile }: SettingsWrapperProps) {
  const queryClient = useQueryClient();

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => getOrganization(),
    initialData: org,
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    initialData: profile,
  });

  const [activeTab, setActiveTab] = useState<'org' | 'profile' | 'system'>('org');
  const [copiedText, setCopiedText] = useState<'tenant' | 'user' | null>(null);

  // Form states for Organization
  const [orgName, setOrgName] = useState(orgData?.name || '');
  const [orgPlan, setOrgPlan] = useState(orgData?.plan || 'starter');
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Form states for Profile
  const [fullName, setFullName] = useState(profileData?.fullName || '');
  const [designation, setDesignation] = useState(profileData?.designation || '');
  const [phone, setPhone] = useState(profileData?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: 'tenant' | 'user') => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const updateOrgMutation = useMutation({
    mutationFn: updateOrganization,
    onMutate: () => {
      setOrgLoading(true);
      setOrgSuccess(false);
      setOrgError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      setOrgSuccess(true);
      setTimeout(() => setOrgSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setOrgError(err.message || 'Failed to update organization settings');
    },
    onSettled: () => {
      setOrgLoading(false);
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onMutate: () => {
      setProfileLoading(true);
      setProfileSuccess(false);
      setProfileError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setProfileError(err.message || 'Failed to update profile settings');
    },
    onSettled: () => {
      setProfileLoading(false);
    }
  });

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgMutation.mutate({ name: orgName, plan: orgPlan });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ fullName, designation, phone });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Left Side: Navigation Links & General Summary */}
      <div className="space-y-6 lg:col-span-1">
        <GlassPanel className="p-6 relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/5">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Security & IAM</h3>
              <p className="text-xs text-slate-400">Active Tenant Access</p>
            </div>
          </div>

          <div className="border-t border-white/5 mt-6 pt-6 space-y-4 relative z-10">
            <div className="flex items-center justify-between text-xs font-mono bg-slate-950/45 p-3 rounded-xl border border-white/5">
              <span className="text-slate-500 font-semibold tracking-wider text-[10px]">TENANT ID</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 select-all font-medium text-right">
                  {orgData?.id ? `${orgData.id.substring(0, 8)}...` : 'N/A'}
                </span>
                {orgData?.id && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(orgData.id, 'tenant')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
                    title="Copy Tenant ID"
                  >
                    {copiedText === 'tenant' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono bg-slate-950/45 p-3 rounded-xl border border-white/5">
              <span className="text-slate-500 font-semibold tracking-wider text-[10px]">USER ID</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 select-all font-medium text-right">
                  {profileData?.id ? `${profileData.id.substring(0, 8)}...` : 'N/A'}
                </span>
                {profileData?.id && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(profileData.id, 'user')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
                    title="Copy User ID"
                  >
                    {copiedText === 'user' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-950/45 p-3 rounded-xl border border-white/5">
              <span className="text-slate-500 font-semibold tracking-wider text-[10px]">ROLE LEVEL</span>
              <span className="text-blue-400 font-semibold uppercase tracking-wider text-[9px] bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full shadow-inner">
                Super Admin
              </span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-2 space-y-1.5 border border-white/5">
          <button 
            type="button"
            onClick={() => setActiveTab('org')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 border ${
              activeTab === 'org'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-lg shadow-blue-500/5'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <Building className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'org' ? 'scale-110 text-blue-400' : 'text-slate-400'}`} />
            <span>Organization Details</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 border ${
              activeTab === 'profile'
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-lg shadow-orange-500/5'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <User className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'profile' ? 'scale-110 text-orange-400' : 'text-slate-400'}`} />
            <span>User Profile</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 border ${
              activeTab === 'system'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-lg shadow-purple-500/5'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <Sliders className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'system' ? 'scale-110 text-purple-400' : 'text-slate-400'}`} />
            <span>System Control</span>
          </button>
        </GlassPanel>
      </div>

      {/* Right Side: Configuration Panels */}
      <div className="space-y-6 lg:col-span-2">
        {/* Panel 1: Organization Settings */}
        {activeTab === 'org' && (
          <GlassPanel className="p-6 space-y-6 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <Building className="w-5 h-5 text-blue-400" /> Tenant Organization
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure company name, tier level, and base details.</p>
            </div>

            {orgSuccess && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-1 relative z-10">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Organization settings updated successfully.</span>
              </div>
            )}

            {orgError && (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm animate-in fade-in relative z-10">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{orgError}</span>
              </div>
            )}

            <form 
              key={orgData?.name + '-' + orgData?.plan} 
              onSubmit={handleOrgSubmit} 
              className="space-y-6 relative z-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 placeholder-slate-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider">Domain Slug</label>
                  <input
                    type="text"
                    value={orgData?.slug || 'constos-corp'}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-500 font-mono focus:outline-none opacity-60 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider">Subscription Plan</label>
                  <select
                    value={orgPlan}
                    onChange={(e) => setOrgPlan(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300 cursor-pointer appearance-none"
                  >
                    <option value="starter" className="bg-slate-950">Starter Plan</option>
                    <option value="growth" className="bg-slate-950">Growth Plan</option>
                    <option value="enterprise" className="bg-slate-950">Enterprise OS</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider">Tax Region</label>
                  <select
                    defaultValue="IN-MH"
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300 cursor-pointer appearance-none"
                  >
                    <option value="IN-MH" className="bg-slate-950">India (Maharashtra)</option>
                    <option value="IN-DL" className="bg-slate-950">India (Delhi)</option>
                    <option value="US-CA" className="bg-slate-950">United States (California)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-white/5">
                <Button 
                  type="submit" 
                  disabled={orgLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center gap-2"
                >
                  {orgLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Organization
                </Button>
              </div>
            </form>
          </GlassPanel>
        )}

        {/* Panel 2: Profile Settings */}
        {activeTab === 'profile' && (
          <GlassPanel className="p-6 space-y-6 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <User className="w-5 h-5 text-orange-400" /> User Profile
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure your personal information and designation.</p>
            </div>

            {profileSuccess && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-1 relative z-10">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>User profile updated successfully.</span>
              </div>
            )}

            {profileError && (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm animate-in fade-in relative z-10">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form 
              key={profileData?.fullName + '-' + profileData?.designation + '-' + profileData?.phone} 
              onSubmit={handleProfileSubmit} 
              className="space-y-6 relative z-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 placeholder-slate-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 placeholder-slate-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs text-slate-400 font-semibold tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 placeholder-slate-500 transition-all duration-300"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-white/5">
                <Button 
                  type="submit" 
                  disabled={profileLoading}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 flex items-center gap-2"
                >
                  {profileLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Profile
                </Button>
              </div>
            </form>
          </GlassPanel>
        )}

        {/* Panel 3: Diagnostics & Hardware Limits */}
        {activeTab === 'system' && (
          <GlassPanel className="p-6 space-y-6 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-purple-400" /> Control Diagnostics
              </h3>
              <p className="text-xs text-slate-400 mt-1">Real-time status logs of database pooling and storage drivers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-4 hover:border-emerald-500/20 transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-white font-semibold">
                    <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
                      <Database className="w-4.5 h-4.5" />
                    </div>
                    <span>Drizzle Pooler</span>
                  </div>
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </div>
                </div>
                
                <div className="text-xs text-slate-400 space-y-2 font-mono bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                  <div className="flex justify-between"><span className="text-slate-500">Client:</span> <span className="text-slate-300">postgres-js</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Host:</span> <span className="text-slate-300">Supabase DB</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Max Conns:</span> <span className="text-slate-300">10</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Idle Timeout:</span> <span className="text-slate-300">30s</span></div>
                </div>
              </div>

              <div className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-4 hover:border-blue-500/20 transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-white font-semibold">
                    <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                      <HardDrive className="w-4.5 h-4.5" />
                    </div>
                    <span>Storage Buckets</span>
                  </div>
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </div>
                </div>
                
                <div className="text-xs text-slate-400 space-y-2 font-mono bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                  <div className="flex justify-between"><span className="text-slate-500">Vault:</span> <span className="text-emerald-400 font-bold">active</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Limit:</span> <span className="text-slate-300">50MB</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Buffer:</span> <span className="text-slate-300">500 records</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sync Mode:</span> <span className="text-slate-300">realtime</span></div>
                </div>
              </div>

              <div className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-4 hover:border-purple-500/20 transition-all duration-300 group md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-white font-semibold">
                    <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
                      <Cpu className="w-4.5 h-4.5" />
                    </div>
                    <span>Telemetry & Engine</span>
                  </div>
                  <span className="text-[10px] bg-purple-500/15 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded font-mono">v1.4.2</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5 text-center">
                    <div className="text-xs text-slate-500 font-semibold mb-1">API Latency</div>
                    <div className="text-sm font-bold text-white font-mono">14ms</div>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5 text-center">
                    <div className="text-xs text-slate-500 font-semibold mb-1">DPR Queue</div>
                    <div className="text-sm font-bold text-white font-mono">0 pending</div>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5 text-center">
                    <div className="text-xs text-slate-500 font-semibold mb-1">RAM Usage</div>
                    <div className="text-sm font-bold text-white font-mono">112 MB</div>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}


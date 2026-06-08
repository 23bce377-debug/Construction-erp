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
  Loader2
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Side: Navigation Links & General Summary */}
      <div className="space-y-6 lg:col-span-1">
        <GlassPanel className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Security & IAM</h3>
              <p className="text-xs text-slate-500">Active Tenant Access</p>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-4 space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">TENANT ID:</span>
              <span className="text-slate-300 select-all">{orgData?.id ? `${orgData.id.substring(0, 8)}...` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">USER ID:</span>
              <span className="text-slate-300 select-all">{profileData?.id ? `${profileData.id.substring(0, 8)}...` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">ROLE LEVEL:</span>
              <span className="text-blue-400 font-semibold uppercase tracking-wider text-[10px] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 space-y-1">
          <button 
            type="button"
            onClick={() => setActiveTab('org')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'org'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <Building className="w-4 h-4" /> Organization Details
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'profile'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <User className="w-4 h-4" /> User Profile
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'system'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4" /> System Control
          </button>
        </GlassPanel>
      </div>

      {/* Right Side: Configuration Panels */}
      <div className="space-y-6 lg:col-span-2">
        {/* Panel 1: Organization Settings */}
        {activeTab === 'org' && (
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-400" /> Tenant Organization
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure company name, tier level, and base details.</p>
            </div>

            {orgSuccess && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Organization settings updated successfully.</span>
              </div>
            )}

            {orgError && (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{orgError}</span>
              </div>
            )}

            <form key={orgData?.name + '-' + orgData?.plan} onSubmit={handleOrgSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Domain Slug</label>
                  <input
                    type="text"
                    value={orgData?.slug || 'constos-corp'}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-400 font-mono focus:outline-none opacity-60 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Subscription Plan</label>
                  <select
                    value={orgPlan}
                    onChange={(e) => setOrgPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="starter">Starter Plan</option>
                    <option value="growth">Growth Plan</option>
                    <option value="enterprise">Enterprise OS</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Tax Region</label>
                  <select
                    defaultValue="IN-MH"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="IN-MH">India (Maharashtra)</option>
                    <option value="IN-DL">India (Delhi)</option>
                    <option value="US-CA">United States (California)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={orgLoading}>
                  {orgLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Organization
                </Button>
              </div>
            </form>
          </GlassPanel>
        )}

        {/* Panel 2: Profile Settings */}
        {activeTab === 'profile' && (
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-orange-400" /> User Profile
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure your personal information and designation.</p>
            </div>

            {profileSuccess && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>User profile updated successfully.</span>
              </div>
            )}

            {profileError && (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form key={profileData?.fullName + '-' + profileData?.designation + '-' + profileData?.phone} onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-medium">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Profile
                </Button>
              </div>
            </form>
          </GlassPanel>
        )}

        {/* Panel 3: Diagnostics & Hardware Limits */}
        {activeTab === 'system' && (
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" /> Control Diagnostics
              </h3>
              <p className="text-xs text-slate-400 mt-1">Real-time status logs of database pooling and storage drivers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm text-white font-semibold">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Drizzle Connection Pooler</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <p>Client: postgres-js</p>
                  <p>Database: postgresql (Supabase)</p>
                  <p>Max Connections: 10</p>
                  <p>Idle Timeout: 30s</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm text-white font-semibold">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span>Storage Buckets & Sync</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <p>GFC Vault: active</p>
                  <p>Upload Limit: 50MB</p>
                  <p>Offline Buffer: 500 records</p>
                  <p>Sync interval: realtime</p>
                </div>
              </div>
            </div>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}

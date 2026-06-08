'use client';

import { useState } from 'react';
import { createMeasurementBook, certifyMeasurementBook, generateRABill, recordPayment, getMeasurementBooks, getInvoices, getSubcontractWorkOrders } from '@/lib/actions/finance';
import { getVendors } from '@/lib/actions/procurement';
import { getSites, getActivities } from '@/lib/actions/projects';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { FileText, IndianRupee, Layers, Plus, Calendar, ShieldAlert, Award, FileSpreadsheet, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';

interface MB {
  id: string;
  mbNumber: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  netPayable: string;
  siteName: string;
  vendorName: string;
}

interface SubcontractWorkOrder {
  id: string;
  woNumber: string;
  scopeOfWork: string;
  contractValue: string;
  vendorName: string;
}

interface Invoice {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: string;
  referenceType: string;
  subtotal: string;
  cgstAmount: string;
  sgstAmount: string;
  tdsAmount: string;
  totalAmount: string;
  amountPaid: string;
  status: string;
  paymentStatus: string;
  vendorName: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
  siteId: string;
}

interface FinanceWrapperProps {
  mbs: MB[];
  invoices: Invoice[];
  workOrders: SubcontractWorkOrder[];
  vendors: Vendor[];
  sites: Site[];
  activities: Activity[];
}

export function FinanceWrapper({ mbs, invoices, workOrders, vendors, sites, activities }: FinanceWrapperProps) {
  const queryClient = useQueryClient();

  const { data: mbsList = [] } = useQuery<MB[]>({
    queryKey: ['measurementBooks'],
    queryFn: () => getMeasurementBooks() as unknown as Promise<MB[]>,
    initialData: mbs,
  });

  const { data: invoicesList = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => getInvoices() as unknown as Promise<Invoice[]>,
    initialData: invoices,
  });

  const { data: workOrdersList = [] } = useQuery<SubcontractWorkOrder[]>({
    queryKey: ['subcontractWorkOrders'],
    queryFn: () => getSubcontractWorkOrders() as unknown as Promise<SubcontractWorkOrder[]>,
    initialData: workOrders,
  });

  const { data: vendorsList = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => getVendors() as unknown as Promise<Vendor[]>,
    initialData: vendors,
  });

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

  const [activeTab, setActiveTab] = useState<'mb' | 'invoice' | 'wo'>('mb');
  const [showMBForm, setShowMBForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);

  // Form states - MB
  const [mbSiteId, setMbSiteId] = useState('');
  const [mbVendorId, setMbVendorId] = useState('');
  const [mbWorkOrderId, setMbWorkOrderId] = useState('');
  const [mbNumber, setMbNumber] = useState('');
  const [mbPeriodStart, setMbPeriodStart] = useState('');
  const [mbPeriodEnd, setMbPeriodEnd] = useState('');
  const [mbEntriesInput, setMbEntriesInput] = useState<{ activityId: string; claimedQty: string; rate: string }[]>([
    { activityId: '', claimedQty: '', rate: '' }
  ]);

  // Form states - Payment
  const [payAmount, setPayAmount] = useState('');
  const payMode = 'bank_transfer';
  const [payRef, setPayRef] = useState('');

  // Calculations
  const formatCurrency = (val: string | null) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const createMBMutation = useMutation({
    mutationFn: createMeasurementBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurementBooks'] });
      setShowMBForm(false);
      setMbNumber('');
      setMbEntriesInput([{ activityId: '', claimedQty: '', rate: '' }]);
      alert('Measurement Book record created!');
    }
  });

  const certifyMBMutation = useMutation({
    mutationFn: (mbId: string) => certifyMeasurementBook(mbId, 'current-user-id-simulated'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurementBooks'] });
      alert('Measurement Book certified successfully! It is now ready for billing.');
    }
  });

  const generateRABillMutation = useMutation({
    mutationFn: generateRABill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurementBooks'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert('Running Account (RA) Bill generated successfully. Tax, TDS, and retention deductions processed.');
    }
  });

  const recordPaymentMutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowPaymentForm(null);
      setPayAmount('');
      setPayRef('');
      alert('Payment tracked and liability adjusted.');
    }
  });

  const handleCreateMB = async (e: React.FormEvent) => {
    e.preventDefault();
    createMBMutation.mutate({
      siteId: mbSiteId,
      vendorId: mbVendorId,
      workOrderId: mbWorkOrderId || undefined,
      mbNumber,
      periodStart: mbPeriodStart,
      periodEnd: mbPeriodEnd,
      status: 'draft',
      entries: mbEntriesInput.filter(ent => ent.activityId !== ''),
    });
  };

  const handleCertify = async (mbId: string) => {
    certifyMBMutation.mutate(mbId);
  };

  const handleGenerateRABill = async (mbId: string) => {
    generateRABillMutation.mutate(mbId);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent, invoiceId: string, vendorId: string) => {
    e.preventDefault();
    recordPaymentMutation.mutate({
      invoiceId,
      vendorId,
      amount: payAmount,
      paymentMode: payMode,
      referenceNumber: payRef,
    });
  };

  const activeActivities = activitiesList.filter(a => a.siteId === mbSiteId);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Tabs list */}
      <div className="flex border-b border-white/5 gap-6 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          onClick={() => setActiveTab('mb')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'mb' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4.5 h-4.5" /> Measurement Books
        </button>
        <button
          onClick={() => setActiveTab('invoice')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'invoice' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <IndianRupee className="w-4.5 h-4.5" /> RA Bills & Invoices
        </button>
        <button
          onClick={() => setActiveTab('wo')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'wo' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4.5 h-4.5" /> Subcontract Work Orders
        </button>
      </div>

      {/* Tab: Measurement Books */}
      {activeTab === 'mb' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Measurement Books (MB)</h2>
            <Button onClick={() => setShowMBForm(!showMBForm)}>
              <Plus className="w-4 h-4 mr-1.5" /> Log Measurement
            </Button>
          </div>

          {showMBForm && (
            <GlassPanel className="p-6 border border-dashed border-blue-500/20 bg-slate-950/20 animate-in fade-in duration-200">
              <form onSubmit={handleCreateMB} className="space-y-6">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">New Measurement Book Entry</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Execution Site</label>
                    <select
                      value={mbSiteId}
                      onChange={e => setMbSiteId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Site</option>
                      {sitesList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subcontractor</label>
                    <select
                      value={mbVendorId}
                      onChange={e => setMbVendorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Subcontractor</option>
                      {vendorsList.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Link to Work Order</label>
                    <select
                      value={mbWorkOrderId}
                      onChange={e => setMbWorkOrderId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select Work Order (Optional)</option>
                      {workOrdersList.map(w => (
                        <option key={w.id} value={w.id}>{w.woNumber} ({w.vendorName})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">MB Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MB-TWR-023"
                      value={mbNumber}
                      onChange={e => setMbNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Period Start</label>
                    <input
                      type="date"
                      value={mbPeriodStart}
                      onChange={e => setMbPeriodStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Period End</label>
                    <input
                      type="date"
                      value={mbPeriodEnd}
                      onChange={e => setMbPeriodEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Measurement Slabs Log</h4>
                  {mbEntriesInput.map((entry, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1 md:col-span-2">
                        <select
                          value={entry.activityId}
                          onChange={e => {
                            const updated = [...mbEntriesInput];
                            updated[idx].activityId = e.target.value;
                            setMbEntriesInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          required
                        >
                          <option value="">Select Site Activity</option>
                          {activeActivities.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="number"
                          placeholder="Certified Qty"
                          value={entry.claimedQty}
                          onChange={e => {
                            const updated = [...mbEntriesInput];
                            updated[idx].claimedQty = e.target.value;
                            setMbEntriesInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1 flex gap-2">
                        <input
                          type="number"
                          placeholder="Rate per UOM"
                          value={entry.rate}
                          onChange={e => {
                            const updated = [...mbEntriesInput];
                            updated[idx].rate = e.target.value;
                            setMbEntriesInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="text-red-400 hover:text-red-300 border-white/5 bg-slate-950/20 h-9 text-xs px-3"
                          onClick={() => {
                            setMbEntriesInput(mbEntriesInput.filter((_, i) => i !== idx));
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8.5 text-xs text-slate-300 border-white/5 hover:border-slate-700 bg-slate-950/10"
                    onClick={() => setMbEntriesInput([...mbEntriesInput, { activityId: '', claimedQty: '', rate: '' }])}
                  >
                    + Add Measurement Row
                  </Button>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5">
                  <Button variant="outline" type="button" onClick={() => setShowMBForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMBMutation.isPending}>
                    {createMBMutation.isPending ? 'Submitting...' : 'Log MB Sheet'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">MB Serial</th>
                  <th className="px-6 py-4">Location & Subcontractor</th>
                  <th className="px-6 py-4">Certification Period</th>
                  <th className="px-6 py-4">Claim Value</th>
                  <th className="px-6 py-4">Audit Status</th>
                  <th className="px-6 py-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {mbsList.map(mb => (
                  <tr key={mb.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-purple-400 font-bold">{mb.mbNumber}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white font-semibold">{mb.siteName}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{mb.vendorName}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {formatDate(mb.periodStart, false)} - {formatDate(mb.periodEnd)}
                    </td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-bold">
                      {formatCurrency(mb.netPayable)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={mb.status as any} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2.5">
                        {mb.status === 'draft' && (
                          <Button
                            onClick={() => handleCertify(mb.id)}
                            className="h-8 text-xs py-1"
                            disabled={certifyMBMutation.isPending}
                          >
                            Certify Book
                          </Button>
                        )}
                        {mb.status === 'certified' && (
                          <Button
                            onClick={() => handleGenerateRABill(mb.id)}
                            className="h-8.5 text-xs py-1 bg-purple-600 hover:bg-purple-700 text-white shadow-lg border border-purple-500/30"
                            disabled={generateRABillMutation.isPending}
                          >
                            Generate RA Bill
                          </Button>
                        )}
                        {mb.status === 'billed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-500/10 border border-slate-500/20 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <Check className="w-3 h-3" /> RA Billed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: RA Bills & Invoices */}
      {activeTab === 'invoice' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">RA Bills & Invoices Liabilities</h2>
          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Bill Code</th>
                  <th className="px-6 py-4">Subcontractor</th>
                  <th className="px-6 py-4">Subtotal</th>
                  <th className="px-6 py-4">Deductions (TDS/Ret)</th>
                  <th className="px-6 py-4">Net Total Amount</th>
                  <th className="px-6 py-4">Amount Cleared</th>
                  <th className="px-6 py-4">Payment Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {invoicesList.map(inv => {
                  const deductions = Number(inv.subtotal) - Number(inv.totalAmount);
                  const isPaid = inv.paymentStatus === 'paid';
                  const percentPaid = Math.min(100, Math.round((Number(inv.amountPaid || 0) / Number(inv.totalAmount)) * 100));
                  return (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-blue-400 font-bold">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 text-white font-semibold">{inv.vendorName}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {formatCurrency(inv.subtotal)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-rose-400 font-semibold">
                        -{formatCurrency(deductions.toString())}
                      </td>
                      <td className="px-6 py-4 font-mono text-white font-bold">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-mono text-xs text-emerald-400 font-bold">{formatCurrency(inv.amountPaid)}</p>
                          <div className="w-16 bg-slate-950 h-1 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-emerald-500 h-full" style={{ width: `${percentPaid}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inv.paymentStatus as any} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isPaid ? (
                          <div className="relative inline-block text-left">
                            <Button
                              onClick={() => setShowPaymentForm(showPaymentForm === inv.id ? null : inv.id)}
                              className="h-8 text-xs py-1"
                            >
                              Log Payment
                            </Button>
                            {showPaymentForm === inv.id && (
                              <GlassPanel className="absolute right-0 mt-2 w-72 border border-white/10 bg-slate-950 p-5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] z-50 text-left">
                                <form onSubmit={(e) => handleRecordPaymentSubmit(e, inv.id, inv.vendorId)} className="space-y-4">
                                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Record Bank Remittance</h4>
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payment Amount (INR)</label>
                                    <input
                                      type="number"
                                      placeholder="Amount"
                                      value={payAmount}
                                      onChange={e => setPayAmount(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">RTGS/UPI Txn Reference</label>
                                    <input
                                      type="text"
                                      placeholder="Ref Serial#"
                                      value={payRef}
                                      onChange={e => setPayRef(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                      required
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2.5 pt-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-7.5 text-xs"
                                      onClick={() => setShowPaymentForm(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button type="submit" className="h-7.5 text-xs px-3" disabled={recordPaymentMutation.isPending}>
                                      {recordPaymentMutation.isPending ? 'Logging...' : 'Confirm Remittance'}
                                    </Button>
                                  </div>
                                </form>
                              </GlassPanel>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Work Orders */}
      {activeTab === 'wo' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Subcontract Work Orders</h2>
          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">WO Number</th>
                  <th className="px-6 py-4">Vendor Partner</th>
                  <th className="px-6 py-4">Scope of Work (SOW)</th>
                  <th className="px-6 py-4 font-mono">Total Contract Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {workOrdersList.map(wo => (
                  <tr key={wo.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-blue-400 font-bold">{wo.woNumber}</td>
                    <td className="px-6 py-4 text-white font-semibold">{wo.vendorName}</td>
                    <td className="px-6 py-4 text-slate-300 font-medium">{wo.scopeOfWork}</td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-bold">
                      {formatCurrency(wo.contractValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { createMeasurementBook, certifyMeasurementBook, generateRABill, recordPayment, getMeasurementBooks, getInvoices, getSubcontractWorkOrders } from '@/lib/actions/finance';
import { getVendors } from '@/lib/actions/procurement';
import { getSites, getActivities } from '@/lib/actions/projects';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { FileText, IndianRupee, Layers, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('mb')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'mb' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Measurement Books
        </button>
        <button
          onClick={() => setActiveTab('invoice')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'invoice' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <IndianRupee className="w-4 h-4" /> RA Bills & Invoices
        </button>
        <button
          onClick={() => setActiveTab('wo')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'wo' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> Subcontract Work Orders
        </button>
      </div>

      {/* Tab: MB */}
      {activeTab === 'mb' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Measurement Logs</h2>
            <Button onClick={() => setShowMBForm(!showMBForm)}>
              <Plus className="w-4 h-4 mr-1.5" /> Log Measurement
            </Button>
          </div>

          {showMBForm && (
            <GlassPanel className="p-6 border border-dashed border-blue-500/20">
              <form onSubmit={handleCreateMB} className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">New Measurement Book (MB)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Site</label>
                    <select
                      value={mbSiteId}
                      onChange={e => setMbSiteId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Site</option>
                      {sitesList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Subcontractor / Vendor</label>
                    <select
                      value={mbVendorId}
                      onChange={e => setMbVendorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Subcontractor</option>
                      {vendorsList.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Work Order Link</label>
                    <select
                      value={mbWorkOrderId}
                      onChange={e => setMbWorkOrderId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select Work Order (Optional)</option>
                      {workOrdersList.map(w => (
                        <option key={w.id} value={w.id}>{w.woNumber} ({w.vendorName})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">MB Reference Number</label>
                    <input
                      type="text"
                      placeholder="MB-2024-xxx"
                      value={mbNumber}
                      onChange={e => setMbNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Period Start</label>
                    <input
                      type="date"
                      value={mbPeriodStart}
                      onChange={e => setMbPeriodStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Period End</label>
                    <input
                      type="date"
                      value={mbPeriodEnd}
                      onChange={e => setMbPeriodEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-850">
                  <h4 className="text-xs font-semibold text-slate-300">Measurement Details</h4>
                  {mbEntriesInput.map((entry, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <select
                        value={entry.activityId}
                        onChange={e => {
                          const updated = [...mbEntriesInput];
                          updated[idx].activityId = e.target.value;
                          setMbEntriesInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                        required
                      >
                        <option value="">Select Activity</option>
                        {activeActivities.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Measured / Claimed Qty"
                        value={entry.claimedQty}
                        onChange={e => {
                          const updated = [...mbEntriesInput];
                          updated[idx].claimedQty = e.target.value;
                          setMbEntriesInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Rate per UOM (INR)"
                        value={entry.rate}
                        onChange={e => {
                          const updated = [...mbEntriesInput];
                          updated[idx].rate = e.target.value;
                          setMbEntriesInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-400 hover:text-red-300 border-slate-850 h-8 text-xs py-0"
                        onClick={() => {
                          setMbEntriesInput(mbEntriesInput.filter((_, i) => i !== idx));
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-xs text-slate-300"
                    onClick={() => setMbEntriesInput([...mbEntriesInput, { activityId: '', claimedQty: '', rate: '' }])}
                  >
                    + Add Item Row
                  </Button>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setShowMBForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Submit MB</Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">MB Number</th>
                  <th className="px-6 py-4">Site / Vendor</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Net Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-855">
                {mbsList.map(mb => (
                  <tr key={mb.id} className="hover:bg-slate-900/10">
                    <td className="px-6 py-4 font-mono text-sm text-purple-400 font-medium">{mb.mbNumber}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white font-medium">{mb.siteName}</p>
                      <p className="text-xs text-slate-500">{mb.vendorName}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {new Date(mb.periodStart).toLocaleDateString()} - {new Date(mb.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-emerald-400 font-semibold">
                      {formatCurrency(mb.netPayable)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={mb.status as string} />
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {mb.status === 'draft' && (
                        <Button
                          onClick={() => handleCertify(mb.id)}
                          className="h-8 text-xs py-1"
                        >
                          Certify MB
                        </Button>
                      )}
                      {mb.status === 'certified' && (
                        <Button
                          onClick={() => handleGenerateRABill(mb.id)}
                          className="h-8 text-xs py-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Generate RA Bill
                        </Button>
                      )}
                      {mb.status === 'billed' && (
                        <span className="text-xs text-slate-500 font-medium py-1.5 block">Billed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Invoices (RA Bills) */}
      {activeTab === 'invoice' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">RA Bills (Running Account Invoices)</h2>
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Bill Number</th>
                  <th className="px-6 py-4">Subcontractor</th>
                  <th className="px-6 py-4">Net Payable</th>
                  <th className="px-6 py-4">Deductions (TDS/Ret)</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-855">
                {invoicesList.map(inv => {
                  const deductions = Number(inv.subtotal) - Number(inv.totalAmount);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-900/10">
                      <td className="px-6 py-4 font-mono text-sm text-blue-400">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 text-sm text-slate-200">{inv.vendorName}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {formatCurrency(inv.subtotal)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-red-400">
                        {formatCurrency(deductions.toString())}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-white font-bold">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-emerald-400">
                        {formatCurrency(inv.amountPaid)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inv.paymentStatus as string} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inv.paymentStatus !== 'paid' ? (
                          <div className="relative inline-block text-left">
                            <Button
                              onClick={() => setShowPaymentForm(showPaymentForm === inv.id ? null : inv.id)}
                              className="h-8 text-xs py-1"
                            >
                              Pay Bill
                            </Button>
                            {showPaymentForm === inv.id && (
                              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl z-55 text-left">
                                <form onSubmit={(e) => handleRecordPaymentSubmit(e, inv.id, 'vendor-id-simulated')} className="space-y-3">
                                  <h4 className="text-xs font-semibold text-slate-200">Record Bank Transfer</h4>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] text-slate-400">Payment Amount</label>
                                    <input
                                      type="number"
                                      placeholder="Amount"
                                      value={payAmount}
                                      onChange={e => setPayAmount(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] text-slate-400">Upi / RTGS Ref No</label>
                                    <input
                                      type="text"
                                      placeholder="Reference#"
                                      value={payRef}
                                      onChange={e => setPayRef(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                                      required
                                    />
                                  </div>
                                  <div className="flex justify-end gap-1.5 pt-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-7 text-[10px]"
                                      onClick={() => setShowPaymentForm(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button type="submit" className="h-7 text-[10px]">
                                      Record Pay
                                    </Button>
                                  </div>
                                </form>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-400 font-semibold">Fully Cleared</span>
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
          <h2 className="text-xl font-bold text-white">Subcontract Work Orders (SOW)</h2>
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">WO Number</th>
                  <th className="px-6 py-4">Subcontractor</th>
                  <th className="px-6 py-4">Scope of Work</th>
                  <th className="px-6 py-4">Contract Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-855">
                {workOrdersList.map(wo => (
                  <tr key={wo.id} className="hover:bg-slate-900/10">
                    <td className="px-6 py-4 font-mono text-sm text-blue-400 font-semibold">{wo.woNumber}</td>
                    <td className="px-6 py-4 text-sm text-white">{wo.vendorName}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{wo.scopeOfWork}</td>
                    <td className="px-6 py-4 font-mono text-sm text-emerald-400 font-semibold">
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

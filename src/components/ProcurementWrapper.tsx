'use client';

import { useState, useEffect } from 'react';
import { createPO, createPR, createGRN, getVendors, getItems, getStores, getPurchaseOrders, getPurchaseRequisitions, getInventoryStock } from '@/lib/actions/procurement';
import { getSites } from '@/lib/actions/projects';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { ShoppingBag, ShoppingCart, Archive, Users, Plus, AlertTriangle, CheckCircle2, Calendar, FileText, ArrowRight, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';

interface PO {
  id: string;
  poNumber: string;
  poDate: string;
  status: string;
  totalAmount: string;
  vendorName: string;
}

interface PR {
  id: string;
  prNumber: string;
  siteName: string;
  status: string;
  createdAt: string;
}

interface StoreStock {
  storeName: string;
  itemName: string;
  itemCode: string;
  uom: string;
  qtyOnHand: string;
  reorderLevel: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  code: string;
  uom: string;
}

interface Store {
  id: string;
  name: string;
}

interface ProcurementWrapperProps {
  pos: PO[];
  prs: PR[];
  stock: StoreStock[];
  vendors: Vendor[];
  sites: Site[];
  items: Item[];
  stores: Store[];
}

export function ProcurementWrapper({ pos, prs, stock, vendors, sites, items, stores }: ProcurementWrapperProps) {
  const queryClient = useQueryClient();

  const { data: posList = [] } = useQuery<PO[]>({
    queryKey: ['purchaseOrders'],
    queryFn: () => getPurchaseOrders() as unknown as Promise<PO[]>,
    initialData: pos,
  });

  const { data: prsList = [] } = useQuery<PR[]>({
    queryKey: ['purchaseRequisitions'],
    queryFn: () => getPurchaseRequisitions() as unknown as Promise<PR[]>,
    initialData: prs,
  });

  const { data: stockList = [] } = useQuery<StoreStock[]>({
    queryKey: ['inventoryStock'],
    queryFn: () => getInventoryStock() as unknown as Promise<StoreStock[]>,
    initialData: stock,
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

  const { data: itemsList = [] } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => getItems() as unknown as Promise<Item[]>,
    initialData: items,
  });

  const { data: storesList = [] } = useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: () => getStores() as unknown as Promise<Store[]>,
    initialData: stores,
  });

  const [activeTab, setActiveTab] = useState<'po' | 'pr' | 'stock' | 'vendor'>('po');
  
  // Dialog/form state
  const [showPOForm, setShowPOForm] = useState(false);
  const [showPRForm, setShowPRForm] = useState(false);
  const [showGRNForm, setShowGRNForm] = useState(false);

  // Form states - PO
  const [poVendorId, setPoVendorId] = useState('');
  const [poSiteId, setPoSiteId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poAmount, setPoAmount] = useState('');
  const [poItemsInput, setPoItemsInput] = useState<{ itemId: string; qty: string; unitRate: string; uom: string }[]>([
    { itemId: '', qty: '', unitRate: '', uom: 'CUM' }
  ]);

  // Form states - PR
  const [prSiteId, setPrSiteId] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [prNotes, setPrNotes] = useState('');
  const [prItemsInput, setPrItemsInput] = useState<{ itemId: string; requestedQty: string; uom: string }[]>([
    { itemId: '', requestedQty: '', uom: 'CUM' }
  ]);

  // Form states - GRN
  const [grnSiteId, setGrnSiteId] = useState('');
  const [grnStoreId, setGrnStoreId] = useState('');
  const [grnPoId, setGrnPoId] = useState('');
  const [grnVendorId, setGrnVendorId] = useState('');
  const [grnNumber, setGrnNumber] = useState('');
  const [grnItemsInput, setGrnItemsInput] = useState<{ itemId: string; receivedQty: string; acceptedQty: string; uom: string }[]>([
    { itemId: '', receivedQty: '', acceptedQty: '', uom: 'CUM' }
  ]);

  // Simulated vendor context
  const [selectedVendorPortalId, setSelectedVendorPortalId] = useState(vendorsList[0]?.id || vendors[0]?.id || '');

  // Synchronize simulated vendor selection once loaded
  useEffect(() => {
    if (!selectedVendorPortalId && vendorsList.length > 0) {
      setSelectedVendorPortalId(vendorsList[0].id);
    }
  }, [vendorsList, selectedVendorPortalId]);

  const createPOMutation = useMutation({
    mutationFn: createPO,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowPOForm(false);
      setPoNumber('');
      setPoAmount('');
      setPoItemsInput([{ itemId: '', qty: '', unitRate: '', uom: 'CUM' }]);
      alert('PO created successfully!');
    }
  });

  const createPRMutation = useMutation({
    mutationFn: createPR,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequisitions'] });
      setShowPRForm(false);
      setPrNumber('');
      setPrNotes('');
      setPrItemsInput([{ itemId: '', requestedQty: '', uom: 'CUM' }]);
      alert('PR created successfully!');
    }
  });

  const createGRNMutation = useMutation({
    mutationFn: createGRN,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryStock'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setShowGRNForm(false);
      setGrnNumber('');
      setGrnItemsInput([{ itemId: '', receivedQty: '', acceptedQty: '', uom: 'CUM' }]);
      alert('GRN logged successfully! Stock levels updated.');
    }
  });

  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createPOMutation.mutate({
      vendorId: poVendorId,
      siteId: poSiteId || undefined,
      poNumber,
      totalAmount: poAmount || '0',
      status: 'approved',
      items: poItemsInput.filter(i => i.itemId !== ''),
    });
  };

  const handleCreatePRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createPRMutation.mutate({
      siteId: prSiteId,
      prNumber,
      notes: prNotes,
      items: prItemsInput.filter(i => i.itemId !== ''),
    });
  };

  const handleCreateGRNSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createGRNMutation.mutate({
      siteId: grnSiteId,
      storeId: grnStoreId,
      poId: grnPoId || undefined,
      vendorId: grnVendorId,
      grnNumber,
      items: grnItemsInput.filter(i => i.itemId !== ''),
    });
  };

  const formatCurrency = (val: string | null) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Tabs navigation */}
      <div className="flex border-b border-white/5 gap-6 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          onClick={() => setActiveTab('po')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'po' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4.5 h-4.5" /> Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('pr')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'pr' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4.5 h-4.5" /> Purchase Requests
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'stock' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Archive className="w-4.5 h-4.5" /> Stock Levels & Alerts
        </button>
        <button
          onClick={() => setActiveTab('vendor')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'vendor' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4.5 h-4.5" /> Vendor Portal
        </button>
      </div>

      {/* Tab content: Purchase Orders */}
      {activeTab === 'po' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Active Purchase Orders</h2>
            <div className="flex gap-3">
              <Button onClick={() => setShowGRNForm(!showGRNForm)} variant="outline" className="border-white/5 hover:border-slate-700 bg-slate-950/20 text-slate-300">
                Log Goods Receipt (GRN)
              </Button>
              <Button onClick={() => setShowPOForm(!showPOForm)}>
                <Plus className="w-4 h-4 mr-1.5" /> Create PO
              </Button>
            </div>
          </div>

          {/* Create PO Form */}
          {showPOForm && (
            <GlassPanel className="p-6 border border-dashed border-blue-500/20 bg-slate-950/20 animate-in fade-in duration-200">
              <form onSubmit={handleCreatePOSubmit} className="space-y-6">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">New Purchase Order</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Supplier/Vendor</label>
                    <select
                      value={poVendorId}
                      onChange={e => setPoVendorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendorsList.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Site Link</label>
                    <select
                      value={poSiteId}
                      onChange={e => setPoSiteId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select Destination Site (Optional)</option>
                      {sitesList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PO Reference Code</label>
                    <input
                      type="text"
                      placeholder="e.g. PO-2026-004"
                      value={poNumber}
                      onChange={e => setPoNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contract/Committed Amount (INR)</label>
                    <input
                      type="number"
                      placeholder="Enter value"
                      value={poAmount}
                      onChange={e => setPoAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Purchase Order Line Items</h4>
                  {poItemsInput.map((pItem, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1 md:col-span-2">
                        <select
                          value={pItem.itemId}
                          onChange={e => {
                            const updated = [...poItemsInput];
                            updated[idx].itemId = e.target.value;
                            setPoItemsInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          required
                        >
                          <option value="">Select Item</option>
                          {itemsList.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.uom})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={pItem.qty}
                          onChange={e => {
                            const updated = [...poItemsInput];
                            updated[idx].qty = e.target.value;
                            setPoItemsInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1 flex gap-2">
                        <input
                          type="number"
                          placeholder="Unit Rate"
                          value={pItem.unitRate}
                          onChange={e => {
                            const updated = [...poItemsInput];
                            updated[idx].unitRate = e.target.value;
                            setPoItemsInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="text-red-400 hover:text-red-300 border-white/5 bg-slate-950/20 h-9 text-xs px-3"
                          onClick={() => {
                            setPoItemsInput(poItemsInput.filter((_, i) => i !== idx));
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
                    onClick={() => setPoItemsInput([...poItemsInput, { itemId: '', qty: '', unitRate: '', uom: 'CUM' }])}
                  >
                    + Add Item Row
                  </Button>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5">
                  <Button variant="outline" type="button" onClick={() => setShowPOForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPOMutation.isPending}>
                    {createPOMutation.isPending ? 'Publishing...' : 'Publish Purchase Order'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          {/* Log Goods Receipt (GRN) Form */}
          {showGRNForm && (
            <GlassPanel className="p-6 border border-dashed border-purple-500/20 bg-slate-950/20 animate-in fade-in duration-200">
              <form onSubmit={handleCreateGRNSubmit} className="space-y-6">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Log Goods Received Note (GRN)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Destination Site</label>
                    <select
                      value={grnSiteId}
                      onChange={e => setGrnSiteId(e.target.value)}
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
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Receiving Store</label>
                    <select
                      value={grnStoreId}
                      onChange={e => setGrnStoreId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Store</option>
                      {storesList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Link to PO</label>
                    <select
                      value={grnPoId}
                      onChange={e => setGrnPoId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">Direct Receipt (Unlinked PO)</option>
                      {posList.map(p => (
                        <option key={p.id} value={p.id}>{p.poNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Vendor/Supplier</label>
                    <select
                      value={grnVendorId}
                      onChange={e => setGrnVendorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendorsList.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">GRN Invoice/Challan Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. GRN-2026-004"
                      value={grnNumber}
                      onChange={e => setGrnNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Received Materials Check</h4>
                  {grnItemsInput.map((gItem, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1 md:col-span-2">
                        <select
                          value={gItem.itemId}
                          onChange={e => {
                            const updated = [...grnItemsInput];
                            updated[idx].itemId = e.target.value;
                            setGrnItemsInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          required
                        >
                          <option value="">Select Item</option>
                          {itemsList.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.uom})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="number"
                          placeholder="Received Qty"
                          value={gItem.receivedQty}
                          onChange={e => {
                            const updated = [...grnItemsInput];
                            updated[idx].receivedQty = e.target.value;
                            updated[idx].acceptedQty = e.target.value; // set accepted as default
                            setGrnItemsInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1 flex gap-2">
                        <input
                          type="number"
                          placeholder="Accepted Qty"
                          value={gItem.acceptedQty}
                          onChange={e => {
                            const updated = [...grnItemsInput];
                            updated[idx].acceptedQty = e.target.value;
                            setGrnItemsInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="text-red-400 hover:text-red-300 border-white/5 bg-slate-950/20 h-9 text-xs px-3"
                          onClick={() => {
                            setGrnItemsInput(grnItemsInput.filter((_, i) => i !== idx));
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
                    onClick={() => setGrnItemsInput([...grnItemsInput, { itemId: '', receivedQty: '', acceptedQty: '', uom: 'CUM' }])}
                  >
                    + Add Material Row
                  </Button>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5">
                  <Button variant="outline" type="button" onClick={() => setShowGRNForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createGRNMutation.isPending}>
                    {createGRNMutation.isPending ? 'Logging GRN...' : 'Log GRN Receipt'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Vendor Partner</th>
                  <th className="px-6 py-4">Publish Date</th>
                  <th className="px-6 py-4">Total Value</th>
                  <th className="px-6 py-4">Execution Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {posList.map(po => (
                  <tr key={po.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-blue-400 font-bold">{po.poNumber}</td>
                    <td className="px-6 py-4 text-white font-medium">{po.vendorName}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {formatDate(po.poDate)}
                    </td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-bold">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={po.status as any} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Purchase Requests */}
      {activeTab === 'pr' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Material Requisitions</h2>
            <Button onClick={() => setShowPRForm(!showPRForm)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Requisition
            </Button>
          </div>

          {/* Create PR Form */}
          {showPRForm && (
            <GlassPanel className="p-6 border border-dashed border-blue-500/20 bg-slate-950/20 animate-in fade-in duration-200">
              <form onSubmit={handleCreatePRSubmit} className="space-y-6">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">New Material Requisition</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requesting Site</label>
                    <select
                      value={prSiteId}
                      onChange={e => setPrSiteId(e.target.value)}
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
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PR Reference ID</label>
                    <input
                      type="text"
                      placeholder="e.g. PR-2026-004"
                      value={prNumber}
                      onChange={e => setPrNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Notes / Justification</label>
                    <input
                      type="text"
                      placeholder="For tower structural framework..."
                      value={prNotes}
                      onChange={e => setPrNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Requested Materials</h4>
                  {prItemsInput.map((pItem, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="space-y-1 md:col-span-2">
                        <select
                          value={pItem.itemId}
                          onChange={e => {
                            const updated = [...prItemsInput];
                            updated[idx].itemId = e.target.value;
                            setPrItemsInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          required
                        >
                          <option value="">Select Item</option>
                          {itemsList.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.uom})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 flex gap-2">
                        <input
                          type="number"
                          placeholder="Requested Quantity"
                          value={pItem.requestedQty}
                          onChange={e => {
                            const updated = [...prItemsInput];
                            updated[idx].requestedQty = e.target.value;
                            setPrItemsInput(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="text-red-400 hover:text-red-300 border-white/5 bg-slate-950/20 h-9 text-xs px-3"
                          onClick={() => {
                            setPrItemsInput(prItemsInput.filter((_, i) => i !== idx));
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
                    onClick={() => setPrItemsInput([...prItemsInput, { itemId: '', requestedQty: '', uom: 'CUM' }])}
                  >
                    + Add Item Row
                  </Button>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5">
                  <Button variant="outline" type="button" onClick={() => setShowPRForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPRMutation.isPending}>
                    {createPRMutation.isPending ? 'Submitting...' : 'Submit Requisition'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">PR Number</th>
                  <th className="px-6 py-4">Site Mapped</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {prsList.map(pr => (
                  <tr key={pr.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-blue-400 font-bold">{pr.prNumber}</td>
                    <td className="px-6 py-4 text-white font-medium">{pr.siteName}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {formatDate(pr.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={pr.status as any} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Stock Levels */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Real-Time Store Balances</h2>
          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Store Depot</th>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Catalog Code</th>
                  <th className="px-6 py-4 font-mono text-right">In-Stock Quantity</th>
                  <th className="px-6 py-4 font-mono text-right">Reorder Threshold</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {stockList.map((s, idx) => {
                  const isLow = s.reorderLevel !== null && Number(s.qtyOnHand) <= Number(s.reorderLevel);
                  return (
                    <tr key={idx} className={`hover:bg-white/5 transition-colors ${isLow ? 'bg-rose-500/5' : ''}`}>
                      <td className="px-6 py-4 text-white font-semibold">{s.storeName}</td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{s.itemName}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{s.itemCode}</td>
                      <td className="px-6 py-4 text-right text-slate-200 font-mono font-bold">
                        {s.qtyOnHand} <span className="text-[10px] text-slate-500 font-sans">{s.uom}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-400 font-mono">
                        {s.reorderLevel ? `${s.reorderLevel} ${s.uom}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            <AlertTriangle className="w-3 h-3" /> Reorder Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Normal
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

      {/* Tab: Vendor Portal Simulator */}
      {activeTab === 'vendor' && (
        <div className="space-y-6">
          <GlassPanel className="p-6 border border-white/5 bg-slate-900/10 backdrop-blur-md shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Vendor Portal Interface</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Simulated supplier dashboard views</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 self-start sm:self-auto">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identity context:</label>
                <select
                  value={selectedVendorPortalId}
                  onChange={e => setSelectedVendorPortalId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  {vendorsList.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Assigned Purchase Orders</h3>
              <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">PO Reference</th>
                      <th className="px-6 py-4 font-mono">Total Order Value</th>
                      <th className="px-6 py-4">Linked Destination Site</th>
                      <th className="px-6 py-4">Order Date</th>
                      <th className="px-6 py-4">Supplier Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {posList
                      .filter(po => {
                        const targetVendor = vendorsList.find(v => v.id === selectedVendorPortalId);
                        return po.vendorName === targetVendor?.name;
                      })
                      .map(po => (
                        <tr key={po.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-blue-400 font-bold">{po.poNumber}</td>
                          <td className="px-6 py-4 font-mono text-emerald-400 font-bold">
                            {formatCurrency(po.totalAmount)}
                          </td>
                          <td className="px-6 py-4 text-slate-300 font-medium">Apex Smart City Hub</td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            {formatDate(po.poDate)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Assigned
                            </span>
                          </td>
                        </tr>
                      ))}
                    {posList.filter(po => {
                      const targetVendor = vendorsList.find(v => v.id === selectedVendorPortalId);
                      return po.vendorName === targetVendor?.name;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-500 font-medium">
                          No active purchase orders found for this vendor context.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { createPO, createPR, createGRN, getVendors, getItems, getStores, getPurchaseOrders, getPurchaseRequisitions, getInventoryStock } from '@/lib/actions/procurement';
import { getSites } from '@/lib/actions/projects';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { ShoppingBag, ShoppingCart, Archive, Users, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

  const { data: stockList = [] } = useQuery<StoreStock[]>( {
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

  // Submitting actions
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

  // Helper formatting
  const formatCurrency = (val: string | null) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };


  return (
    <div className="space-y-8">
      {/* Tabs list */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('po')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'po' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('pr')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'pr' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Purchase Requests
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'stock' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4" /> Stock Levels & Alerts
        </button>
        <button
          onClick={() => setActiveTab('vendor')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'vendor' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Vendor Portal
        </button>
      </div>

      {/* Tab: Purchase Orders */}
      {activeTab === 'po' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">POs Issued</h2>
            <div className="flex gap-2">
              <Button onClick={() => setShowGRNForm(!showGRNForm)} variant="outline" className="border-slate-700">
                Log GRN Receipt
              </Button>
              <Button onClick={() => setShowPOForm(!showPOForm)}>
                <Plus className="w-4 h-4 mr-1.5" /> Create PO
              </Button>
            </div>
          </div>

          {showPOForm && (
            <GlassPanel className="p-6 border border-dashed border-blue-500/20">
              <form onSubmit={handleCreatePOSubmit} className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">New Purchase Order</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Vendor</label>
                    <select
                      value={poVendorId}
                      onChange={e => setPoVendorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendorsList.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Site Link</label>
                    <select
                      value={poSiteId}
                      onChange={e => setPoSiteId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select Site (Optional)</option>
                      {sitesList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">PO Number</label>
                    <input
                      type="text"
                      placeholder="PO-2024-xxx"
                      value={poNumber}
                      onChange={e => setPoNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Total Committed Amount (INR)</label>
                    <input
                      type="number"
                      placeholder="Total Value"
                      value={poAmount}
                      onChange={e => setPoAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-850">
                  <h4 className="text-xs font-semibold text-slate-300">Add PO Items</h4>
                  {poItemsInput.map((pItem, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <select
                        value={pItem.itemId}
                        onChange={e => {
                          const updated = [...poItemsInput];
                          updated[idx].itemId = e.target.value;
                          setPoItemsInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                      >
                        <option value="">Select Item</option>
                        {itemsList.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={pItem.qty}
                        onChange={e => {
                          const updated = [...poItemsInput];
                          updated[idx].qty = e.target.value;
                          setPoItemsInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Unit Rate"
                        value={pItem.unitRate}
                        onChange={e => {
                          const updated = [...poItemsInput];
                          updated[idx].unitRate = e.target.value;
                          setPoItemsInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-400 hover:text-red-300 border-slate-850 h-8 text-xs py-0"
                        onClick={() => {
                          setPoItemsInput(poItemsInput.filter((_, i) => i !== idx));
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
                    onClick={() => setPoItemsInput([...poItemsInput, { itemId: '', qty: '', unitRate: '', uom: 'CUM' }])}
                  >
                    + Add Item Row
                  </Button>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setShowPOForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Publish PO</Button>
                </div>
              </form>
            </GlassPanel>
          )}

          {showGRNForm && (
            <GlassPanel className="p-6 border border-dashed border-purple-500/20">
              <form onSubmit={handleCreateGRNSubmit} className="space-y-4">
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Log Goods Received Note (GRN)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Site</label>
                    <select
                      value={grnSiteId}
                      onChange={e => setGrnSiteId(e.target.value)}
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
                    <label className="text-xs text-slate-400">Store</label>
                    <select
                      value={grnStoreId}
                      onChange={e => setGrnStoreId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Store</option>
                      {storesList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Linked PO</label>
                    <select
                      value={grnPoId}
                      onChange={e => setGrnPoId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select PO (Optional)</option>
                      {posList.map(p => (
                        <option key={p.id} value={p.id}>{p.poNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Vendor</label>
                    <select
                      value={grnVendorId}
                      onChange={e => setGrnVendorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendorsList.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">GRN Challan/Bill Number</label>
                    <input
                      type="text"
                      placeholder="GRN-xxx"
                      value={grnNumber}
                      onChange={e => setGrnNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-850">
                  <h4 className="text-xs font-semibold text-slate-300">Add Received Materials</h4>
                  {grnItemsInput.map((gItem, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <select
                        value={gItem.itemId}
                        onChange={e => {
                          const updated = [...grnItemsInput];
                          updated[idx].itemId = e.target.value;
                          setGrnItemsInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                      >
                        <option value="">Select Item</option>
                        {itemsList.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
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
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Accepted Qty"
                        value={gItem.acceptedQty}
                        onChange={e => {
                          const updated = [...grnItemsInput];
                          updated[idx].acceptedQty = e.target.value;
                          setGrnItemsInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-400 hover:text-red-300 border-slate-850 h-8 text-xs py-0"
                        onClick={() => {
                          setGrnItemsInput(grnItemsInput.filter((_, i) => i !== idx));
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
                    onClick={() => setGrnItemsInput([...grnItemsInput, { itemId: '', receivedQty: '', acceptedQty: '', uom: 'CUM' }])}
                  >
                    + Add Material Row
                  </Button>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setShowGRNForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Log GRN Receipt</Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {posList.map(po => (
                  <tr key={po.id} className="hover:bg-slate-900/10">
                    <td className="px-6 py-4 font-mono text-sm text-blue-400">{po.poNumber}</td>
                    <td className="px-6 py-4 text-sm text-white">{po.vendorName}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {new Date(po.poDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-emerald-400 font-semibold">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={po.status as string} />
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
            <h2 className="text-xl font-bold text-white">Purchase Requests (BOQ Scoped)</h2>
            <Button onClick={() => setShowPRForm(!showPRForm)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Requisition
            </Button>
          </div>

          {showPRForm && (
            <GlassPanel className="p-6 border border-dashed border-blue-500/20">
              <form onSubmit={handleCreatePRSubmit} className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">New Material Requisition</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Site Requesting</label>
                    <select
                      value={prSiteId}
                      onChange={e => setPrSiteId(e.target.value)}
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
                    <label className="text-xs text-slate-400">PR Reference Number</label>
                    <input
                      type="text"
                      placeholder="PR-2024-xxx"
                      value={prNumber}
                      onChange={e => setPrNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Notes / Purpose</label>
                    <input
                      type="text"
                      placeholder="Scope or activity details"
                      value={prNotes}
                      onChange={e => setPrNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-850">
                  <h4 className="text-xs font-semibold text-slate-300">Requested Items</h4>
                  {prItemsInput.map((pItem, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={pItem.itemId}
                        onChange={e => {
                          const updated = [...prItemsInput];
                          updated[idx].itemId = e.target.value;
                          setPrItemsInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                      >
                        <option value="">Select Item</option>
                        {itemsList.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Requested Quantity"
                        value={pItem.requestedQty}
                        onChange={e => {
                          const updated = [...prItemsInput];
                          updated[idx].requestedQty = e.target.value;
                          setPrItemsInput(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-400 hover:text-red-300 border-slate-855 h-8 text-xs py-0"
                        onClick={() => {
                          setPrItemsInput(prItemsInput.filter((_, i) => i !== idx));
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
                    onClick={() => setPrItemsInput([...prItemsInput, { itemId: '', requestedQty: '', uom: 'CUM' }])}
                  >
                    + Add Item Row
                  </Button>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setShowPRForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Submit Requisition</Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">PR Number</th>
                  <th className="px-6 py-4">Site</th>
                  <th className="px-6 py-4">Date Submitted</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-855">
                {prsList.map(pr => (
                  <tr key={pr.id} className="hover:bg-slate-900/10">
                    <td className="px-6 py-4 font-mono text-sm text-blue-400">{pr.prNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-200">{pr.siteName}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {new Date(pr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={pr.status as string} />
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
          <h2 className="text-xl font-bold text-white">Store Inventory Levels & Reorder Limits</h2>
          <div className="grid grid-cols-1 gap-6">
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Store</th>
                    <th className="px-6 py-4">Material Name</th>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Current Stock</th>
                    <th className="px-6 py-4">Reorder Level</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-855">
                  {stockList.map((s, idx) => {
                    const isLow = s.reorderLevel !== null && Number(s.qtyOnHand) <= Number(s.reorderLevel);
                    return (
                      <tr key={idx} className={`hover:bg-slate-900/10 ${isLow ? 'bg-red-500/5' : ''}`}>
                        <td className="px-6 py-4 text-sm text-white font-medium">{s.storeName}</td>
                        <td className="px-6 py-4 text-sm text-slate-200">{s.itemName}</td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">{s.itemCode}</td>
                        <td className="px-6 py-4 text-sm text-slate-100 font-mono font-semibold">
                          {s.qtyOnHand} {s.uom}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                          {s.reorderLevel ? `${s.reorderLevel} ${s.uom}` : 'Not Set'}
                        </td>
                        <td className="px-6 py-4">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                              <AlertTriangle className="w-3 h-3" /> Reorder Alert
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                              <CheckCircle2 className="w-3 h-3" /> Healthy
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
        </div>
      )}

      {/* Tab: Vendor Portal */}
      {activeTab === 'vendor' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Simulated Vendor Portal</h2>
              <p className="text-xs text-slate-400 mt-0.5">Mock portal context for active vendor suppliers</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Logged in Vendor:</label>
              <select
                value={selectedVendorPortalId}
                onChange={e => setSelectedVendorPortalId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
              >
                {vendorsList.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-855">
                {posList.map(po => (
                  <tr key={po.id} className="hover:bg-slate-900/10">
                    <td className="px-6 py-4 font-mono text-sm text-blue-400">{po.poNumber}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {new Date(po.poDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-emerald-400 font-semibold">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={po.status as string} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" className="h-7 text-xs px-2 py-0 border-slate-800">
                        Accept PO & Schedule Delivery
                      </Button>
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

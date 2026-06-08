'use client';

import { useState } from 'react';
import { createDocument, updateDocumentStatus, getDocuments } from '@/lib/actions/documents';
import { createPO, getVendors, getItems } from '@/lib/actions/procurement';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { Folder, Upload, FileText, Bot, Check, ArrowRight, RefreshCw, FileLock2, HelpCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';

interface DocumentModel {
  id: string;
  title: string;
  docType: string;
  currentVersion: number;
  latestFileUrl: string | null;
  status: string;
  createdAt: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
}

interface DocumentsWrapperProps {
  documentsList: DocumentModel[];
  vendors: Vendor[];
  items: Item[];
}

interface OCRInvoice {
  name: string;
  items: { itemName: string; itemId: string; qty: string; unitRate: string; uom: string }[];
  totalAmount: string;
  vendorId: string;
  poNumber: string;
}

export function DocumentsWrapper({ documentsList, vendors, items }: DocumentsWrapperProps) {
  const queryClient = useQueryClient();

  const { data: docs = [] } = useQuery<DocumentModel[]>({
    queryKey: ['documents'],
    queryFn: () => getDocuments() as unknown as Promise<DocumentModel[]>,
    initialData: documentsList,
  });

  const { data: vendorsList = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => getVendors() as unknown as Promise<Vendor[]>,
    initialData: vendors,
  });

  const { data: itemsList = [] } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => getItems() as unknown as Promise<Item[]>,
    initialData: items,
  });

  const [activeTab, setActiveTab] = useState<'gfc' | 'ocr'>('gfc');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Form states - upload document
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('DRAWING');
  const [docUrl, setDocUrl] = useState('');

  // OCR state machine
  const [ocrStage, setOcrStage] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<OCRInvoice | null>(null);
  const [isPoCreated, setIsPoCreated] = useState(false);

  // Sample invoices to run OCR simulation
  const sampleInvoices = [
    {
      name: 'Cement Bulk Invoice - Ambuja Ltd',
      items: [
        { itemName: 'Cement (OPC 53 Grade)', itemId: itemsList[0]?.id || 'cement-id', qty: '600', unitRate: '410', uom: 'BAG' }
      ],
      totalAmount: '246000',
      vendorId: vendorsList[0]?.id || 'vendor-id',
      poNumber: 'PO-OCR-CEMENT-889',
    },
    {
      name: 'Tata Steel Delivery Challan',
      items: [
        { itemName: 'Steel Rebars (8mm)', itemId: itemsList[1]?.id || 'steel-id', qty: '15', unitRate: '68000', uom: 'MT' }
      ],
      totalAmount: '1020000',
      vendorId: vendorsList[1]?.id || 'vendor-id',
      poNumber: 'PO-OCR-STEEL-114',
    }
  ];

  const createDocumentMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDocTitle('');
      setDocUrl('');
      setShowUploadForm(false);
      alert('Document registered in GFC vault!');
    }
  });

  const updateDocumentStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'under_review' | 'approved' | 'superseded' | 'archived' }) => updateDocumentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      alert('Document status updated successfully!');
    }
  });

  const createPOMutation = useMutation({
    mutationFn: createPO,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setIsPoCreated(true);
      alert(`PO ${ocrData?.poNumber} auto-generated successfully from invoice!`);
    }
  });

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    createDocumentMutation.mutate({
      title: docTitle,
      docType,
      latestFileUrl: docUrl || 'https://supabase-storage.co/drawings/sample.pdf',
      status: 'draft',
    });
  };

  const handleUpdateStatus = async (id: string, newStatus: 'draft' | 'under_review' | 'approved' | 'superseded' | 'archived') => {
    updateDocumentStatusMutation.mutate({ id, status: newStatus });
  };

  const handleRunOcr = (invoice: typeof sampleInvoices[0]) => {
    setSelectedInvoice(invoice.name);
    setOcrStage('scanning');
    setIsPoCreated(false);

    // Simulate OCR processing time
    setTimeout(() => {
      setOcrData(invoice);
      setOcrStage('complete');
    }, 1500);
  };

  const handleGeneratePOFromOcr = async () => {
    if (!ocrData) return;
    createPOMutation.mutate({
      vendorId: ocrData.vendorId,
      poNumber: ocrData.poNumber,
      totalAmount: ocrData.totalAmount,
      status: 'approved',
      items: ocrData.items.map((i) => ({
        itemId: i.itemId,
        qty: i.qty,
        unitRate: i.unitRate,
        uom: i.uom,
      })),
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          onClick={() => setActiveTab('gfc')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'gfc' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Folder className="w-4.5 h-4.5" /> Good For Construction (GFC) Vault
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 shrink-0 ${
            activeTab === 'ocr' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-4.5 h-4.5" /> AI OCR Invoice Scanner
        </button>
      </div>

      {/* Tab: GFC Drawing Vault */}
      {activeTab === 'gfc' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Engineering Drawings Vault</h2>
            <Button onClick={() => setShowUploadForm(!showUploadForm)}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload Document
            </Button>
          </div>

          {showUploadForm && (
            <GlassPanel className="p-6 border border-dashed border-blue-500/20 bg-slate-950/20 animate-in fade-in duration-200">
              <form onSubmit={handleCreateDocument} className="space-y-6">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Register Building Document</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Title / Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Foundation GFC Drawing v1"
                      value={docTitle}
                      onChange={e => setDocTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Document Type</label>
                    <select
                      value={docType}
                      onChange={e => setDocType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="DRAWING">Drawing</option>
                      <option value="BOQ">BOQ (Bill of Quantities)</option>
                      <option value="CONTRACT">Agreement / Contract</option>
                      <option value="PERMIT">Permit / NOC</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Storage URL Link</label>
                    <input
                      type="text"
                      placeholder="Storage bucket link"
                      value={docUrl}
                      onChange={e => setDocUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5">
                  <Button variant="outline" type="button" onClick={() => setShowUploadForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDocumentMutation.isPending}>
                    {createDocumentMutation.isPending ? 'Saving...' : 'Register Vault Entry'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Title / Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Current Version</th>
                  <th className="px-6 py-4">Date Uploaded</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-semibold flex items-center gap-2">
                      <FileText className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                      <span className="truncate">{doc.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider">
                        {doc.docType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      v{doc.currentVersion}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status as any} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2.5">
                        {doc.status === 'draft' && (
                          <Button
                            onClick={() => handleUpdateStatus(doc.id, 'under_review')}
                            className="h-8 text-xs py-1"
                            disabled={updateDocumentStatusMutation.isPending}
                          >
                            Submit Review
                          </Button>
                        )}
                        {doc.status === 'under_review' && (
                          <Button
                            onClick={() => handleUpdateStatus(doc.id, 'approved')}
                            className="h-8.5 text-xs py-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border border-emerald-500/30"
                            disabled={updateDocumentStatusMutation.isPending}
                          >
                            Approve GFC
                          </Button>
                        )}
                        {doc.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5" /> GFC Released
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

      {/* Tab: AI OCR Invoice Scanner */}
      {activeTab === 'ocr' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left box: Selector/Scanner */}
            <GlassPanel className="p-6 space-y-6 col-span-1 border border-white/5 bg-slate-900/10 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">AI OCR Documents Queue</h3>
                <p className="text-slate-400 text-xs mt-1 font-medium font-sans">Run layout parsers on raw supplier slips.</p>
              </div>

              <div className="space-y-3">
                {sampleInvoices.map((inv, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleRunOcr(inv)}
                    className={`p-4 border rounded-xl cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-200 flex items-center justify-between group active:scale-[0.98] ${
                      selectedInvoice === inv.name ? 'border-blue-500 bg-blue-500/5 shadow-[0_4px_15px_rgba(59,130,246,0.06)]' : 'border-white/5 bg-slate-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileLock2 className={`w-5 h-5 shrink-0 ${selectedInvoice === inv.name ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                      <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors truncate">{inv.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </div>
                ))}
              </div>

              {ocrStage === 'scanning' && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3 border border-dashed border-blue-500/20 rounded-xl bg-blue-500/5 animate-pulse">
                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-xs font-mono font-medium">Extracting metadata schema...</span>
                </div>
              )}
            </GlassPanel>

            {/* Right box: OCR results */}
            <GlassPanel className="p-6 col-span-2 space-y-6 border border-white/5 bg-slate-900/10 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
                <Bot className="w-5.5 h-5.5 text-blue-400" /> AI OCR Parsed Schema
              </h3>

              {ocrStage === 'complete' && ocrData ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm border-b border-white/5 pb-5">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Suggested PO Number</p>
                      <p className="font-mono text-blue-400 font-bold mt-1 text-sm bg-blue-500/5 border border-blue-500/10 px-2.5 py-1 rounded-lg inline-block">{ocrData.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Amount Extracted</p>
                      <p className="font-mono text-emerald-400 font-extrabold mt-1 text-base">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(ocrData.totalAmount))}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Line Items Extracted</h4>
                    <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/20">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900/40 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-5 py-3.5">Material Description</th>
                            <th className="px-5 py-3.5 font-mono text-right">Quantity</th>
                            <th className="px-5 py-3.5 font-mono text-right">Rate</th>
                            <th className="px-5 py-3.5 font-mono text-right">Total Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-medium">
                          {ocrData.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-5 py-3.5 text-white">{it.itemName}</td>
                              <td className="px-5 py-3.5 text-right text-slate-300 font-mono">{it.qty} <span className="text-[10px] text-slate-500 font-sans">{it.uom}</span></td>
                              <td className="px-5 py-3.5 text-right text-slate-300 font-mono">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(it.unitRate))}
                              </td>
                              <td className="px-5 py-3.5 text-right text-white font-mono font-bold">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(it.qty) * Number(it.unitRate))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                    {isPoCreated ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
                        <Check className="w-4.5 h-4.5 animate-bounce" /> Purchase Order Published
                      </span>
                    ) : (
                      <Button
                        onClick={handleGeneratePOFromOcr}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-lg border border-blue-500/30"
                        disabled={createPOMutation.isPending}
                      >
                        {createPOMutation.isPending ? 'Publishing...' : 'Auto-Publish PO Record'} <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-500 border border-dashed border-white/5 rounded-2xl bg-slate-950/10">
                  <FileText className="w-12 h-12 mb-4 opacity-20 text-blue-400" />
                  <p className="text-sm font-semibold">Ready for layout extraction</p>
                  <p className="text-xs text-slate-600 mt-1">Select a document from the queue on the left to start OCR.</p>
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { createDocument, updateDocumentStatus, getDocuments } from '@/lib/actions/documents';
import { createPO, getVendors, getItems } from '@/lib/actions/procurement';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { Folder, Upload, FileText, Bot, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
      queryClient.invalidateQueries({ queryKey: ['procurement:pos'] });
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
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('gfc')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'gfc' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Folder className="w-4 h-4" /> Good For Construction (GFC) Vault
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'ocr' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" /> AI OCR Invoice Scanner
        </button>
      </div>

      {/* Tab: GFC Drawing Vault */}
      {activeTab === 'gfc' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Engineering Drawings Vault</h2>
            <Button onClick={() => setShowUploadForm(!showUploadForm)}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload Document
            </Button>
          </div>

          {showUploadForm && (
            <GlassPanel className="p-6 border border-dashed border-blue-500/20">
              <form onSubmit={handleCreateDocument} className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Register Building Document</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Title / Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Foundation GFC Drawing v1"
                      value={docTitle}
                      onChange={e => setDocTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Document Type</label>
                    <select
                      value={docType}
                      onChange={e => setDocType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="DRAWING">Drawing</option>
                      <option value="BOQ">BOQ (Bill of Quantities)</option>
                      <option value="CONTRACT">Agreement / Contract</option>
                      <option value="PERMIT">Permit / NOC</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">File Storage Path URL</label>
                    <input
                      type="text"
                      placeholder="Storage bucket link"
                      value={docUrl}
                      onChange={e => setDocUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" type="button" onClick={() => setShowUploadForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Upload & Save</Button>
                </div>
              </form>
            </GlassPanel>
          )}

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Current Version</th>
                  <th className="px-6 py-4">Date Uploaded</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-855">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-900/10">
                    <td className="px-6 py-4 text-sm font-semibold text-white">{doc.title}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 uppercase tracking-widest font-mono">
                      {doc.docType}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      v{doc.currentVersion}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status as string} />
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {doc.status === 'draft' && (
                        <Button
                          onClick={() => handleUpdateStatus(doc.id, 'under_review')}
                          className="h-8 text-xs py-1"
                        >
                          Submit Review
                        </Button>
                      )}
                      {doc.status === 'under_review' && (
                        <Button
                          onClick={() => handleUpdateStatus(doc.id, 'approved')}
                          className="h-8 text-xs py-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Approve GFC
                        </Button>
                      )}
                      {doc.status === 'approved' && (
                        <span className="text-xs text-emerald-400 font-semibold py-1.5 block">Approved GFC</span>
                      )}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left box: Selector/Scanner */}
            <GlassPanel className="p-6 space-y-6 col-span-1">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">OCR Upload Queue</h3>
                <p className="text-xs text-slate-400">Select a mock document to run AI layout parsing.</p>
              </div>

              <div className="space-y-3">
                {sampleInvoices.map((inv, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleRunOcr(inv)}
                    className={`p-4 border rounded-xl cursor-pointer hover:border-blue-500 transition-colors flex items-center justify-between ${
                      selectedInvoice === inv.name ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 bg-slate-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold text-white">{inv.name}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                ))}
              </div>

              {ocrStage === 'scanning' && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3 border border-dashed border-blue-500/20 rounded-xl bg-blue-500/5">
                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-xs font-mono">AI parsing invoice schema...</span>
                </div>
              )}
            </GlassPanel>

            {/* Right box: OCR results */}
            <GlassPanel className="p-6 col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                <Bot className="w-5 h-5 text-blue-400" /> AI Parsed Fields
              </h3>

              {ocrStage === 'complete' && ocrData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-b border-slate-850 pb-4">
                    <div>
                      <p className="text-xs text-slate-500">Suggested PO Reference</p>
                      <p className="font-mono text-blue-400 font-semibold mt-0.5">{ocrData.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Invoice Total Amount</p>
                      <p className="font-mono text-emerald-400 font-bold mt-0.5">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(ocrData.totalAmount))}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Line Items Detected</h4>
                    <div className="overflow-x-auto border border-slate-850 rounded-lg">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-900/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="px-4 py-2">Item Name</th>
                            <th className="px-4 py-2">Quantity</th>
                            <th className="px-4 py-2">Detected Rate</th>
                            <th className="px-4 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-xs">
                          {ocrData.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-white font-medium">{it.itemName}</td>
                              <td className="px-4 py-2 font-mono text-slate-300">{it.qty} {it.uom}</td>
                              <td className="px-4 py-2 font-mono text-slate-300">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(it.unitRate))}
                              </td>
                              <td className="px-4 py-2 font-mono text-white font-semibold">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(it.qty) * Number(it.unitRate))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-850">
                    {isPoCreated ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                        <Check className="w-4 h-4" /> Purchase Order Published
                      </span>
                    ) : (
                      <Button
                        onClick={handleGeneratePOFromOcr}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        Auto-Publish PO Record <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-850 rounded-xl">
                  <FileText className="w-12 h-12 mb-4 opacity-25" />
                  <p className="text-sm">Select an invoice on the left to start the OCR extraction simulation.</p>
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

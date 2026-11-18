/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Upload Tab Component
 * - Clean list of all orders with "Upload" / "Re-Upload e-Stamp" button.
 * - Accepts PDF, PNG, JPG, JPEG, WEBP images/PDFs.
 * - Zero AI blocking: once a file is loaded, "Attach & Overlay e-Stamp" is immediately clickable (solid blue).
 * - Interactive Dual-Boundary Visual Controls:
 *   1) Top Start Line (blankStartPercent): where legal writing BEGINS below the e-Stamp certificate header
 *   2) Bottom End Line (blankEndPercent): where Page 1 writing ENDS (overflow flows automatically onto Page 2+)
 *   Both can be dragged directly on the e-Stamp preview OR adjusted via crisp sliders.
 * - Uploads cleanly to Cloudinary via /api/documents/overlay-stamp and persists to Supabase.
 */

import React, { useRef, useState } from 'react';
import { Order } from '../types';
import { formatDateStandard } from '../utils/dateTime';
import {
  Upload,
  Search,
  User,
  Phone,
  CheckCircle2,
  Clock,
  X,
  UploadCloud,
  Check,
  Inbox,
  AlertTriangle,
  SlidersHorizontal
} from 'lucide-react';

interface UploadViewProps {
  orders: Order[];
  currentOrder: Order | null;
  onSelectOrder: (order: Order) => void;
  onSaveOrder: (updatedOrder: Order) => void;
  onSendNotification?: (message: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  orders,
  onSaveOrder,
  onSendNotification
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for uploading e-Stamp to a selected order
  const [activeUploadOrder, setActiveUploadOrder] = useState<Order | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Dual Boundary Offsets: Top Start Line & Bottom End Line
  const [blankStartPercent, setBlankStartPercent] = useState<number>(54);
  const [blankEndPercent, setBlankEndPercent] = useState<number>(94);

  // Interactive pointer drag support on the preview canvas
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'top' | 'bottom' | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const p1 = order.legalData?.party1?.fullName?.toLowerCase() || order.clientName.toLowerCase();
    const fn = order.formName.toLowerCase();
    const id = order.id.toLowerCase();
    const phone = order.clientPhone.toLowerCase();
    return p1.includes(q) || fn.includes(q) || id.includes(q) || phone.includes(q);
  });

  const handleOpenUploadModal = (order: Order) => {
    setActiveUploadOrder(order);
    setSelectedFile(null);
    const existingPreview = order.stampData?.scanUrl || order.stampData?.eStampPaperUrl || null;
    setFilePreview(existingPreview);
    setBlankStartPercent(order.stampData?.blankStartPercent || 54);
    setBlankEndPercent(order.stampData?.blankEndPercent || 94);
    setUploadError(null);
    setSuccessNotice(null);
    setIsSubmitting(false);
  };

  const handleCloseModal = () => {
    setActiveUploadOrder(null);
    setSelectedFile(null);
    setFilePreview(null);
    setIsSubmitting(false);
    setUploadError(null);
    setSuccessNotice(null);
    setDraggingHandle(null);
  };

  const updateTopLine = (val: number) => {
    const clamped = Math.max(15, Math.min(blankEndPercent - 8, Math.round(val)));
    setBlankStartPercent(clamped);
  };

  const updateBottomLine = (val: number) => {
    const clamped = Math.max(blankStartPercent + 8, Math.min(98, Math.round(val)));
    setBlankEndPercent(clamped);
  };

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingHandle || !previewBoxRef.current) return;
    const rect = previewBoxRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;
    const pct = ((e.clientY - rect.top) / rect.height) * 100;
    if (draggingHandle === 'top') {
      updateTopLine(pct);
    } else {
      updateBottomLine(pct);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setFilePreview(dataUri);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = async () => {
    if (!activeUploadOrder || !filePreview || isSubmitting) return;
    setIsSubmitting(true);
    setUploadError(null);

    const topOffsetPt = Math.round((blankStartPercent / 100) * 841.89);
    const bottomOffsetPt = Math.round((blankEndPercent / 100) * 841.89);
    const generatedUin =
      activeUploadOrder.stampData?.uin ||
      `IN-DL${Date.now().toString().slice(-8)}T`;

    const optimisticOrder: Order = {
      ...activeUploadOrder,
      status: 'confirmed_stamp_attached',
      stampData: {
        uin: generatedUin,
        certificateNo: activeUploadOrder.stampData?.certificateNo || `CERT-${Date.now().toString().slice(-6)}`,
        issueDate: activeUploadOrder.stampData?.issueDate || new Date().toISOString().split('T')[0],
        firstParty: activeUploadOrder.legalData?.party1?.fullName || activeUploadOrder.clientName,
        secondParty: activeUploadOrder.legalData?.party2?.fullName || 'Second Party',
        stampDutyPaidBy: activeUploadOrder.stampDutyPaidBy || 'First Party',
        stampDutyAmount: activeUploadOrder.stampDutyValue,
        article: activeUploadOrder.stampData?.article || 'Article 35 Agreement',
        state: activeUploadOrder.legalData?.state || activeUploadOrder.state || 'Delhi',
        scanUrl: filePreview,
        eStampPaperUrl: filePreview,
        blankStartPercent,
        blankEndPercent,
        topOffsetPt,
        aiAnalyzed: false,
        verified: true,
        verifiedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    try {
      const resp = await fetch('/api/documents/overlay-stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeUploadOrder.id,
          stampPaperImageBase64: filePreview,
          topOffset: topOffsetPt,
          bottomOffset: bottomOffsetPt,
          blankStartPercent,
          blankEndPercent,
          order: optimisticOrder
        })
      });

      const json = await resp.json().catch(() => null);

      if (!resp.ok || !json?.success) {
        throw new Error(json?.error || `Upload failed with HTTP ${resp.status}`);
      }

      const persistedOrder: Order = {
        ...optimisticOrder,
        stampData: {
          ...optimisticOrder.stampData!,
          ...(json.stampData || {}),
          scanUrl: json.eStampPaperUrl || json.stampData?.scanUrl || optimisticOrder.stampData!.scanUrl,
          eStampPaperUrl: json.eStampPaperUrl || json.stampData?.eStampPaperUrl || optimisticOrder.stampData!.eStampPaperUrl,
          pdfUrl: json.pdfDownloadUrl || json.stampData?.pdfUrl,
          provider: json.stampData?.provider || optimisticOrder.stampData!.provider,
          blankStartPercent,
          blankEndPercent,
          topOffsetPt,
          verified: true
        },
        updatedAt: new Date().toISOString()
      };

      onSaveOrder(persistedOrder);

      if (onSendNotification) {
        onSendNotification(
          `e-Stamp Paper uploaded & overlaid on ${activeUploadOrder.id} (Zone: ${blankStartPercent}% to ${blankEndPercent}%)`
        );
      }

      setSuccessNotice(
        `e-Stamp uploaded & attached cleanly! Text overlays between ${blankStartPercent}% and ${blankEndPercent}% on Page 1.`
      );
      setTimeout(() => {
        setSuccessNotice(null);
        handleCloseModal();
      }, 900);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload e-Stamp to server/Cloudinary. Please retry.');
      setIsSubmitting(false);
    }
  };

  const isPreviewPdf =
    Boolean(filePreview) &&
    (filePreview!.startsWith('data:application/pdf') || filePreview!.toLowerCase().includes('.pdf'));

  return (
    <div className="space-y-5 pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders to upload e-Stamp (Party Name, Form Name, ID)..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
          />
        </div>

        <div className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
          Total Orders: <span className="text-blue-600">{orders.length}</span>
        </div>
      </div>

      {/* Orders List with "Upload" Button */}
      <div className="space-y-3.5">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-lg mx-auto my-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Orders Available for Upload</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When orders arrive from Website A, they will automatically appear here so you can attach their official e-Stamp papers.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-slate-500 text-xs font-medium">
            No orders match your search criteria.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const hasStamp = Boolean(order.stampData?.verified);
            const dateStd = formatDateStandard(order.createdAt);
            const party1Name = order.legalData?.party1?.fullName || order.registrationData?.applicantName || order.clientName;
            const contactPhone = order.legalData?.party1?.phone || order.clientPhone;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column */}
                  <div className="space-y-1 flex-1">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase leading-snug">
                      {order.formName}
                    </h2>
                    <div className="font-mono text-xs font-bold text-blue-600 tracking-wide">
                      {order.id}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 pt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">First Party:</span>
                      <strong className="text-slate-900">{party1Name}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-mono font-medium text-slate-900">{contactPhone}</span>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      {hasStamp ? (
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            e-Stamp Attached: {order.stampData?.uin}
                            {order.stampData?.blankStartPercent
                              ? ` (${order.stampData.blankStartPercent}%–${order.stampData.blankEndPercent || 94}%)`
                              : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>e-Stamp Pending</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                        Stamp Paper Price
                      </span>
                      <div className="text-lg sm:text-xl font-black text-slate-950 font-mono text-blue-600 leading-tight">
                        ₹ {order.stampDutyValue}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        Date: {dateStd}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal(order)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer ${
                        hasStamp ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>{hasStamp ? 'Re-Upload e-Stamp' : 'Upload'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= UPLOAD E-STAMP MODAL (TOP & BOTTOM LINE BOUNDARIES + CLOUDINARY) ================= */}
      {activeUploadOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Upload e-Stamp Paper &amp; Set Overlay Lines</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order: <strong className="font-mono text-blue-600">{activeUploadOrder.id}</strong> — {activeUploadOrder.formName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drag and Drop Box */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                dragActive
                  ? 'border-blue-600 bg-blue-50'
                  : filePreview
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : 'border-gray-300 bg-slate-50/50 hover:border-blue-400'
              }`}
            >
              <input
                type="file"
                id="modal-estamp-file"
                accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {filePreview ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{selectedFile ? selectedFile.name : 'e-Stamp Paper Ready'}</span>
                    </div>
                    <label
                      htmlFor="modal-estamp-file"
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Change File
                    </label>
                  </div>

                  {/* Interactive Visual Overlay Preview with BOTH Top Start Line & Bottom End Line */}
                  <div
                    ref={previewBoxRef}
                    onPointerMove={handlePreviewPointerMove}
                    onPointerUp={() => setDraggingHandle(null)}
                    onPointerLeave={() => setDraggingHandle(null)}
                    className="relative mx-auto w-[250px] h-[354px] rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm select-none touch-none"
                  >
                    {isPreviewPdf ? (
                      <div className="w-full h-full bg-slate-50 flex flex-col justify-between p-4 text-center">
                        <div className="border border-slate-200 rounded-md bg-white p-3 mt-2">
                          <div className="text-[11px] font-bold text-slate-800 uppercase">PDF e-Stamp Loaded</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                            {selectedFile?.name || 'e-Stamp Certificate.pdf'}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 mb-2">
                          Adjust Top &amp; Bottom lines for Page 1 overlay
                        </div>
                      </div>
                    ) : (
                      <img
                        src={filePreview}
                        alt="e-Stamp Preview"
                        className="w-full h-full object-fill pointer-events-none"
                      />
                    )}

                    {/* Upper Certificate Zone (Above Top Line) */}
                    <div
                      className="absolute inset-x-0 top-0 bg-slate-900/10 pointer-events-none"
                      style={{ height: `${blankStartPercent}%` }}
                    />

                    {/* Lower Footer Margin Mask (Below Bottom Line) */}
                    <div
                      className="absolute inset-x-0 bottom-0 bg-slate-900/15 pointer-events-none"
                      style={{ top: `${blankEndPercent}%` }}
                    />

                    {/* Highlighted Blue Writing Zone BETWEEN Top Line & Bottom Line */}
                    <div
                      className="absolute inset-x-2 bg-blue-500/18 border-x border-dashed border-blue-500 flex items-center justify-center pointer-events-none"
                      style={{
                        top: `${blankStartPercent}%`,
                        bottom: `${100 - blankEndPercent}%`
                      }}
                    >
                      <span className="text-[10px] font-bold text-blue-900 bg-white/85 px-2 py-1 rounded shadow-2xs text-center leading-snug">
                        Page 1 Text Writes Here ({blankStartPercent}% – {blankEndPercent}%)
                        <br />
                        <span className="text-[9px] font-semibold text-blue-700">Overflow auto-shifts to Page 2+</span>
                      </span>
                    </div>

                    {/* LINE 1: Top Start Line (Draggable) */}
                    <div
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setDraggingHandle('top');
                      }}
                      className="absolute inset-x-0 border-t-[3px] border-blue-600 flex items-center justify-center cursor-ns-resize z-10"
                      style={{ top: `${blankStartPercent}%` }}
                      title="Drag up/down to set where writing starts"
                    >
                      <span className="text-[9px] font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full -mt-3 shadow-md">
                        ▲ Top Start: {blankStartPercent}%
                      </span>
                    </div>

                    {/* LINE 2: Bottom End Line (Draggable) */}
                    <div
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setDraggingHandle('bottom');
                      }}
                      className="absolute inset-x-0 border-t-[3px] border-emerald-600 flex items-center justify-center cursor-ns-resize z-10"
                      style={{ top: `${blankEndPercent}%` }}
                      title="Drag up/down to set bottom writing limit"
                    >
                      <span className="text-[9px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full -mt-2.5 shadow-md">
                        ▼ Bottom Limit: {blankEndPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-5">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    Drag and drop your e-Stamp paper here, or{' '}
                    <label
                      htmlFor="modal-estamp-file"
                      className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Browse
                    </label>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports JPG, PNG, WEBP, and PDF e-Stamp papers. Set Top &amp; Bottom lines directly after selecting file.
                  </p>
                </div>
              )}
            </div>

            {/* Dual Sliders: Top Start Line & Bottom Limit Line */}
            {filePreview && (
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-3.5 space-y-3">
                {/* Slider 1: Top Start Line */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                      <span>1. Top Line — Writing Starts Here</span>
                    </span>
                    <span className="font-mono text-blue-700">{blankStartPercent}% from top</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={Math.max(20, blankEndPercent - 8)}
                    step={1}
                    value={blankStartPercent}
                    onChange={(e) => updateTopLine(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Slider 2: Bottom End Line */}
                <div className="space-y-1 pt-1 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                      <span>2. Bottom Line — Writing Ends Here</span>
                    </span>
                    <span className="font-mono text-emerald-700">{blankEndPercent}% from top</span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(90, blankStartPercent + 8)}
                    max={98}
                    step={1}
                    value={blankEndPercent}
                    onChange={(e) => updateBottomLine(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {uploadError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Success message */}
            {successNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={!filePreview || isSubmitting}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all ${
                  filePreview && !isSubmitting
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Uploading & Saving...' : 'Attach & Overlay e-Stamp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

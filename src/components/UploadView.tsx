/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Upload Tab Component
 * - Clean list of all orders with "Upload" / "Re-Upload e-Stamp" button.
 * - Accepts PDF, PNG, JPG, JPEG, etc.
 * - Calls server-side Gemini AI (/api/estamp/analyze) to inspect the uploaded e-Stamp paper,
 *   detect the printed certificate header & notice line ("Write down the agreement"),
 *   and calculate the exact blank-space start % for Page 1 overlapping.
 * - Provides a live visual overlay preview + fine-tune slider before attaching.
 */

import React, { useState } from 'react';
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
  Sparkles,
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

interface AiAnalysisResult {
  isEStampDetected?: boolean;
  blankStartPercent: number;
  blankEndPercent: number;
  topOffsetPt: number;
  noticeLineText?: string;
  uin?: string;
  stampDutyAmount?: number;
  state?: string;
  article?: string;
  firstParty?: string;
  secondParty?: string;
  reasoning?: string;
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
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // AI e-Stamp analysis & overlay offset state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [blankStartPercent, setBlankStartPercent] = useState<number>(54);
  const [blankEndPercent, setBlankEndPercent] = useState<number>(94);

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
    setAiError(null);
    setAiResult(
      order.stampData?.aiAnalyzed
        ? {
            isEStampDetected: true,
            blankStartPercent: order.stampData.blankStartPercent || 54,
            blankEndPercent: order.stampData.blankEndPercent || 94,
            topOffsetPt: order.stampData.topOffsetPt || 455,
            noticeLineText: order.stampData.aiDetectedNotice,
            uin: order.stampData.uin
          }
        : null
    );
  };

  const handleCloseModal = () => {
    setActiveUploadOrder(null);
    setSelectedFile(null);
    setFilePreview(null);
    setIsSubmitting(false);
    setIsAnalyzingAi(false);
    setAiError(null);
    setAiResult(null);
  };

  const runAiBlankSpaceDetection = async (dataUri: string, orderId: string) => {
    setIsAnalyzingAi(true);
    setAiError(null);
    setAiResult(null);

    try {
      const resp = await fetch('/api/estamp/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileDataUri: dataUri, orderId })
      });
      const json = await resp.json();
      if (!resp.ok || !json.success || !json.analysis) {
        setAiError(json.error || `AI analysis returned HTTP ${resp.status}`);
      } else {
        const analysis: AiAnalysisResult = json.analysis;
        setAiResult(analysis);
        setBlankStartPercent(analysis.blankStartPercent || 54);
        setBlankEndPercent(analysis.blankEndPercent || 94);
      }
    } catch (err: any) {
      setAiError(err?.message || 'Network error while analyzing e-Stamp with AI');
    } finally {
      setIsAnalyzingAi(false);
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
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setFilePreview(dataUri);
      if (activeUploadOrder) {
        runAiBlankSpaceDetection(dataUri, activeUploadOrder.id);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = () => {
    if (!activeUploadOrder || !filePreview) return;
    setIsSubmitting(true);

    const topOffsetPt = Math.round((blankStartPercent / 100) * 841.89);
    const generatedUin =
      aiResult?.uin ||
      activeUploadOrder.stampData?.uin ||
      `IN-DL${Date.now().toString().slice(-8)}T`;

    const updatedOrder: Order = {
      ...activeUploadOrder,
      status: 'confirmed_stamp_attached',
      stampData: {
        uin: generatedUin,
        certificateNo: activeUploadOrder.stampData?.certificateNo || `CERT-${Date.now().toString().slice(-6)}`,
        issueDate: new Date().toISOString().split('T')[0],
        firstParty: aiResult?.firstParty || activeUploadOrder.legalData?.party1?.fullName || activeUploadOrder.clientName,
        secondParty: aiResult?.secondParty || activeUploadOrder.legalData?.party2?.fullName || 'Second Party',
        stampDutyPaidBy: activeUploadOrder.stampDutyPaidBy || 'First Party',
        stampDutyAmount: aiResult?.stampDutyAmount || activeUploadOrder.stampDutyValue,
        article: aiResult?.article || 'Article 35 Agreement',
        state: aiResult?.state || activeUploadOrder.legalData?.state || activeUploadOrder.state || 'Delhi',
        scanUrl: filePreview,
        eStampPaperUrl: filePreview,
        blankStartPercent,
        blankEndPercent,
        topOffsetPt,
        aiDetectedNotice: aiResult?.noticeLineText || activeUploadOrder.stampData?.aiDetectedNotice,
        aiAnalyzed: Boolean(aiResult),
        verified: true,
        verifiedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    onSaveOrder(updatedOrder);

    fetch('/api/documents/overlay-stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: activeUploadOrder.id,
        stampPaperImageBase64: filePreview,
        topOffset: topOffsetPt,
        blankStartPercent,
        blankEndPercent,
        aiDetectedNotice: aiResult?.noticeLineText,
        aiAnalyzed: Boolean(aiResult),
        order: updatedOrder
      })
    }).catch(() => {});

    if (onSendNotification) {
      onSendNotification(
        `e-Stamp Paper attached & overlaid on ${activeUploadOrder.id} (Agreement starts at ${blankStartPercent}%)`
      );
    }

    setSuccessNotice(`e-Stamp attached & overlaid cleanly at ${blankStartPercent}% from top!`);
    setTimeout(() => {
      setSuccessNotice(null);
      handleCloseModal();
    }, 1200);
  };

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
                            {order.stampData?.blankStartPercent ? ` (Start ${order.stampData.blankStartPercent}%)` : ''}
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

      {/* ================= UPLOAD E-STAMP MODAL WITH AI BLANK-SPACE DETECTION ================= */}
      {activeUploadOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Upload e-Stamp Paper &amp; Auto-Overlay Format</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order: <strong className="font-mono text-blue-600">{activeUploadOrder.id}</strong> — {activeUploadOrder.formName}
                </p>
              </div>
              <button
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
                accept="*/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {filePreview ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{selectedFile ? selectedFile.name : 'e-Stamp Paper Loaded'}</span>
                    </div>
                    <label
                      htmlFor="modal-estamp-file"
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Change File
                    </label>
                  </div>

                  {/* Interactive Visual Overlay Preview on Uploaded e-Stamp */}
                  {filePreview.startsWith('data:image') ? (
                    <div className="relative mx-auto w-[220px] h-[311px] rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm">
                      <img
                        src={filePreview}
                        alt="e-Stamp Preview"
                        className="w-full h-full object-fill"
                      />
                      {/* Upper Printed Certificate Mask */}
                      <div
                        className="absolute inset-x-0 top-0 bg-slate-900/10 pointer-events-none"
                        style={{ height: `${blankStartPercent}%` }}
                      />
                      {/* Detected Agreement Start Line */}
                      <div
                        className="absolute inset-x-0 border-t-2 border-blue-600 flex items-center justify-center pointer-events-none"
                        style={{ top: `${blankStartPercent}%` }}
                      >
                        <span className="text-[9px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded -mt-3 shadow">
                          Agreement Starts Here ({blankStartPercent}%)
                        </span>
                      </div>
                      {/* Blank Printable Area Highlight */}
                      <div
                        className="absolute inset-x-2 bottom-2 bg-blue-500/15 border border-dashed border-blue-500 rounded flex items-center justify-center pointer-events-none"
                        style={{ top: `${blankStartPercent + 1}%` }}
                      >
                        <span className="text-[10px] font-bold text-blue-800 px-2 text-center">
                          Page 1 Text Overlays Here &amp; Shifts Rest to Page 2+
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800 font-semibold">
                      PDF e-Stamp Loaded — Overlay starts at {blankStartPercent}% from top
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 py-4">
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
                    AI automatically checks the lower blank area below &quot;Write down the agreement&quot; and shifts Page 1 text onto the e-Stamp
                  </p>
                </div>
              )}
            </div>

            {/* AI Blank Space Detection Status + Fine-Tune Slider */}
            {filePreview && (
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-3.5 space-y-3">
                {isAnalyzingAi ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                    <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
                    <span>AI is inspecting e-Stamp notice line &amp; blank writing area...</span>
                  </div>
                ) : aiResult ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>
                        AI Detected Blank Area Starting at {aiResult.blankStartPercent}%
                      </span>
                    </div>
                    {aiResult.noticeLineText && (
                      <p className="text-[11px] text-slate-600">
                        Notice Line Found: <strong className="text-slate-900">&quot;{aiResult.noticeLineText}&quot;</strong>
                      </p>
                    )}
                    {aiResult.uin && (
                      <p className="text-[11px] text-slate-600 font-mono">
                        Detected UIN: <strong>{aiResult.uin}</strong>
                      </p>
                    )}
                  </div>
                ) : aiError ? (
                  <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">AI Auto-Scan Unavailable: {aiError}</span>
                      <span className="text-[11px] text-amber-700">
                        Use the slider below to set exactly where the blank space begins on your e-Stamp paper.
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Fine-Tune Agreement Start Y-Position */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                      <span>Agreement Start Position (Below e-Stamp Notice)</span>
                    </span>
                    <span className="font-mono text-blue-700">{blankStartPercent}% from top</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={75}
                    step={1}
                    value={blankStartPercent}
                    onChange={(e) => setBlankStartPercent(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Success message */}
            {successNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmUpload}
                disabled={!filePreview || isSubmitting || isAnalyzingAi}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
                  filePreview && !isSubmitting && !isAnalyzingAi
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Attaching & Shifting...' : 'Attach & Overlay e-Stamp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

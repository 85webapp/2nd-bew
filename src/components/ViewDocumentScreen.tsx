/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dedicated Full-Page View Screen
 * Exact Specifications:
 * - Top: Form Name + Green Tick (e-Stamp Attached / Pending)
 * - Subheader: Reference ID (CTC-2026-200X) • Stamp Duty (₹ ...) • State
 * - Action buttons: Print A4 Document & Download PDF
 * - NO EDIT OPTION
 * - Full printable agreement rendered cleanly below
 */

import React from 'react';
import { Order } from '../types';
import { DocumentRenderer } from './DocumentRenderer';
import { RegistrationChecklistView } from './RegistrationChecklistView';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  CheckCircle2, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';

interface ViewDocumentScreenProps {
  order: Order;
  onBack: () => void;
  onUpdateOrder?: (order: Order) => void;
  onSendNotification?: (msg: string) => void;
}

export const ViewDocumentScreen: React.FC<ViewDocumentScreenProps> = ({
  order,
  onBack,
  onUpdateOrder,
  onSendNotification
}) => {
  const isLegal = order.category === 'legal';
  const hasStamp = Boolean(order.stampData?.verified);
  const stateName = order.state || order.legalData?.state || order.rawPayload?.state || 'NCT of Delhi';
  const stampDuty = order.stampDutyValue;

  const isPdfOrDoc = (url: string, kind?: string) => {
    if (kind === 'pdf' || kind === 'file') return true;
    const lower = url.toLowerCase();
    return lower.includes('.pdf') || lower.includes('application/pdf') || lower.includes('.doc') || lower.includes('/uploads/documents/');
  };

  const extraFields = {
    ...(order.legalData?.extraFields || {}),
    ...(order.registrationData?.extraFields || {})
  };
  const extraEntries = Object.entries(extraFields).filter(
    ([, val]) => val !== undefined && val !== null && val !== '' && typeof val !== 'object'
  );

  const uploadedFiles = order.uploadedFiles && order.uploadedFiles.length > 0
    ? order.uploadedFiles
    : [
        ...(order.photoUrl ? [{ name: 'Primary Photo', url: order.photoUrl, kind: isPdfOrDoc(order.photoUrl) ? 'pdf' as const : 'image' as const }] : []),
        ...(order.mediaUrls || [])
          .filter((u) => u !== order.photoUrl)
          .map((u, idx) => ({
            name: isPdfOrDoc(u) ? `Attached Document #${idx + 1}` : `Attachment #${idx + 1}`,
            url: u,
            kind: isPdfOrDoc(u) ? 'pdf' as const : 'image' as const
          }))
      ];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (order.stampData?.pdfUrl) {
      window.open(order.stampData.pdfUrl, '_blank');
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      
      {/* ================= EXACT TOP VIEW BAR PER SPEC ================= */}
      <div className="no-print bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>

          {/* Action Buttons: Print A4 Document & Download PDF Only (NO EDIT) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-gray-200 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{order.stampData?.pdfUrl ? 'Open / Download PDF' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Document</span>
            </button>
          </div>

        </div>

        {/* Top: Form Name + Green Tick Attached / Pending */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              {order.formName}
            </h1>
            {hasStamp ? (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>e-Stamp Attached</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>e-Stamp Pending</span>
              </span>
            )}
            {order.signatureVerified && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>HMAC Verified</span>
              </span>
            )}
          </div>

          {/* Subheader: Reference ID (CTC-2026-200X) • Stamp Duty • State */}
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium mt-1.5 flex-wrap">
            <div>
              <span className="text-slate-400">Reference ID:</span>{' '}
              <strong className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{order.id}</strong>
            </div>
            <span className="text-slate-300">•</span>
            <div>
              <span className="text-slate-400">Stamp Duty:</span>{' '}
              <strong className="text-slate-900 font-mono">₹ {stampDuty}</strong>
            </div>
            <span className="text-slate-300">•</span>
            <div>
              <span className="text-slate-400">State:</span>{' '}
              <strong className="text-slate-900">{stateName}</strong>
            </div>
            {order.clientEmail && (
              <>
                <span className="text-slate-300">•</span>
                <div>
                  <span className="text-slate-400">Email:</span>{' '}
                  <strong className="text-slate-900">{order.clientEmail}</strong>
                </div>
              </>
            )}
            {order.stampData?.uin && (
              <>
                <span className="text-slate-300">•</span>
                <div>
                  <span className="text-slate-400">UIN:</span>{' '}
                  <span className="font-mono text-emerald-700 font-bold">{order.stampData.uin}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Attached Photos, PDFs & Files from Website 1 */}
        {uploadedFiles.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <span className="text-xs font-bold text-slate-700 block mb-2">Attached Photos, PDFs & Files ({uploadedFiles.length}):</span>
            <div className="flex flex-wrap gap-2.5 items-center">
              {uploadedFiles.map((file, idx) =>
                isPdfOrDoc(file.url, file.kind) ? (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{file.name || `Document #${idx + 1}`}</span>
                  </a>
                ) : (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 bg-slate-100 shadow-2xs"
                    title={file.name}
                  >
                    <img src={file.url} alt={file.name || `Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-bold transition-opacity">
                      View
                    </span>
                  </a>
                )
              )}
            </div>
          </div>
        )}

        {/* Additional Described Form Fields */}
        {extraEntries.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <span className="text-xs font-bold text-slate-700 block mb-2">Submitted Form Details:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {extraEntries.map(([key, val]) => (
                <div key={key} className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5">
                  <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>{' '}
                  <strong className="text-slate-900 break-words">{String(val)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= DOCUMENT RENDERING CONTENT ================= */}
      {isLegal ? (
        <DocumentRenderer order={order} hideRibbon={true} />
      ) : (
        <RegistrationChecklistView
          order={order}
          onUpdateOrder={onUpdateOrder || (() => {})}
          onSendNotification={onSendNotification || (() => {})}
        />
      )}

    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Formats Tab Component
 * - Top switcher: "Standard Formats" vs "e-Stamp Paper"
 * - "Standard Formats": multi-page A4 legal document formats without e-Stamp.
 * - "e-Stamp Paper": shows ONLY documents with an uploaded e-Stamp paper, rendering the
 *   overlaid multi-page format (Page 1 overlapped inside e-Stamp blank zone + A4 continuation pages).
 *   If no e-Stamp has been uploaded yet, clearly displays "No Uploaded e-Stamp Paper".
 */

import React, { useState } from 'react';
import { Order } from '../types';
import { formatDateStandard } from '../utils/dateTime';
import { DocumentRenderer } from './DocumentRenderer';
import {
  Eye,
  Search,
  User,
  Phone,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  ArrowLeft,
  Inbox,
  FileText,
  Stamp
} from 'lucide-react';

interface FormatsViewProps {
  orders: Order[];
  onSelectOrderForView?: (order: Order) => void;
}

export const FormatsView: React.FC<FormatsViewProps> = ({
  orders
}) => {
  const [formatMode, setFormatMode] = useState<'standard' | 'estamp'>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchingOrder, setWatchingOrder] = useState<Order | null>(null);
  const [watchingWithStampOverlay, setWatchingWithStampOverlay] = useState(false);

  const ordersWithUploadedStamp = orders.filter((o) =>
    Boolean(o.stampData?.verified && (o.stampData?.scanUrl || o.stampData?.eStampPaperUrl))
  );

  const sourceList = formatMode === 'estamp' ? ordersWithUploadedStamp : orders;

  const filteredOrders = sourceList.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const p1 = order.legalData?.party1?.fullName?.toLowerCase() || order.clientName.toLowerCase();
    const fn = order.formName.toLowerCase();
    const id = order.id.toLowerCase();
    const phone = order.clientPhone.toLowerCase();
    return p1.includes(q) || fn.includes(q) || id.includes(q) || phone.includes(q);
  });

  const currentWatchingOrder = watchingOrder
    ? (orders.find((o) => o.id === watchingOrder.id) || watchingOrder)
    : null;

  const hasStampOnCurrent = Boolean(
    currentWatchingOrder?.stampData?.verified &&
      (currentWatchingOrder.stampData?.scanUrl || currentWatchingOrder.stampData?.eStampPaperUrl)
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (currentWatchingOrder) {
      const overlayParam = watchingWithStampOverlay && hasStampOnCurrent ? '&overlay=true' : '';
      window.open(`/api/documents/render-pdf?orderId=${currentWatchingOrder.id}${overlayParam}`, '_blank');
    } else {
      window.print();
    }
  };

  // Watching a selected document format
  if (currentWatchingOrder) {
    const activeOverlay = watchingWithStampOverlay && hasStampOnCurrent;

    return (
      <div className="space-y-6 pb-24 max-w-5xl mx-auto">
        {/* Top Control Bar */}
        <div className="no-print bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setWatchingOrder(null)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Formats List</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {hasStampOnCurrent && (
              <div className="inline-flex rounded-lg border border-gray-200 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setWatchingWithStampOverlay(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    !activeOverlay ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Standard A4
                </button>
                <button
                  type="button"
                  onClick={() => setWatchingWithStampOverlay(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    activeOverlay ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  e-Stamp Paper Overlaid
                </button>
              </div>
            )}

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-gray-200 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
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

        {/* Format Header Vitals */}
        <div className="no-print bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                {activeOverlay
                  ? 'e-Stamp Paper Overlaid Multi-Page Format'
                  : 'Generated Legal Document Format (Multi-Page A4 Standard)'}
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                {currentWatchingOrder.formName}
              </h2>
            </div>
            <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
              Order: {currentWatchingOrder.id}
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2">
            {activeOverlay
              ? `Page 1 shifts cleanly onto the uploaded e-Stamp paper's lower blank zone (starting at ${currentWatchingOrder.stampData?.blankStartPercent || 54}%), with remaining clauses flowing onto standard A4 continuation sheets.`
              : 'Multi-page A4 legal format generated directly from submitted & edited order details. Any edits made in the Edit tab reflect immediately.'}
          </p>
        </div>

        {/* Multi-Page A4 Document Rendering (Standard or Overlaid on Uploaded e-Stamp) */}
        <DocumentRenderer
          order={currentWatchingOrder}
          hideRibbon={true}
          showEStampOverlay={activeOverlay}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      {/* Top Option Bar: Standard Formats vs e-Stamp Paper */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto flex-1 max-w-md">
          <button
            type="button"
            onClick={() => setFormatMode('standard')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              formatMode === 'standard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Standard Formats</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatMode('estamp')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              formatMode === 'estamp'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-gray-200'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>e-Stamp Paper ({ordersWithUploadedStamp.length})</span>
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-500 px-2 hidden md:block">
          {formatMode === 'estamp'
            ? 'Overlaid A4 formats ready for uploaded e-Stamp papers'
            : 'Clean multi-page A4 document drafts'}
        </div>
      </div>

      {/* Search Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search formats by First Party Name, Form Name, ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
          />
        </div>

        <div className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
          {formatMode === 'estamp' ? 'Overlaid Ready:' : 'Available Formats:'}{' '}
          <span className="text-blue-600">{sourceList.length}</span>
        </div>
      </div>

      {/* Orders List / Empty State */}
      <div className="space-y-3.5">
        {formatMode === 'estamp' && ordersWithUploadedStamp.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-amber-300 p-12 text-center max-w-lg mx-auto my-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <Stamp className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No Uploaded e-Stamp Paper
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No document has an uploaded e-Stamp paper yet. Go to the Upload tab and upload an e-Stamp paper for any order — the overlaid A4 format will appear here automatically.
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-lg mx-auto my-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Orders Available Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When orders arrive from Website A, the legal format will be automatically created on A4 standard paper and appear here ready to watch.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-slate-500 text-xs font-medium">
            No formats match your search criteria.
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
                            e-Stamp Attached
                            {order.stampData?.blankStartPercent ? ` • Overlay ${order.stampData.blankStartPercent}%` : ''}
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
                      onClick={() => {
                        setWatchingOrder(order);
                        setWatchingWithStampOverlay(formatMode === 'estamp');
                      }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer ${
                        formatMode === 'estamp'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>{formatMode === 'estamp' ? 'Watch e-Stamp Format' : 'Watch'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

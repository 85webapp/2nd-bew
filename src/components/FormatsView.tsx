/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Formats Tab Component
 * Specifications:
 * 1. Displays the exact same order card list as Orders, Edit, and Upload tabs.
 * 2. Features a "Watch" button on each card.
 * 3. Clicking "Watch" opens the clean A4 Legal Document Format generated automatically
 *    from the raw order data (No e-Stamp shown here).
 * 4. Changes made in the Edit tab instantly update this format within milliseconds.
 * 5. Supports on-demand dynamic PDF printing and downloading without storing any files.
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
  Share2
} from 'lucide-react';

interface FormatsViewProps {
  orders: Order[];
  onSelectOrderForView?: (order: Order) => void;
}

export const FormatsView: React.FC<FormatsViewProps> = ({
  orders
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [watchingOrder, setWatchingOrder] = useState<Order | null>(null);

  // Filter orders by search
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const p1 = order.legalData?.party1?.fullName?.toLowerCase() || order.clientName.toLowerCase();
    const fn = order.formName.toLowerCase();
    const id = order.id.toLowerCase();
    const phone = order.clientPhone.toLowerCase();
    return p1.includes(q) || fn.includes(q) || id.includes(q) || phone.includes(q);
  });

  // Current active order being watched
  const currentWatchingOrder = watchingOrder 
    ? (orders.find(o => o.id === watchingOrder.id) || watchingOrder)
    : null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Dynamic stream without storing file
    if (currentWatchingOrder) {
      window.open(`/api/documents/render-pdf?orderId=${currentWatchingOrder.id}`, '_blank');
    } else {
      window.print();
    }
  };

  // If viewing a specific format
  if (currentWatchingOrder) {
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

          <div className="flex items-center gap-2">
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
                Generated Legal Document Format (A4 Standard)
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
            This format is dynamically rendered on clean A4 paper per standard legal drafting rules. No e-Stamp is shown here. Any edits in the Edit tab reflect here in real-time.
          </p>
        </div>

        {/* Clean A4 Document Rendering (No e-Stamp header) */}
        <DocumentRenderer order={currentWatchingOrder} hideRibbon={true} />
      </div>
    );
  }

  // List of Orders with "Watch" button
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
            placeholder="Search formats by First Party Name, Form Name, ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
          />
        </div>

        <div className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
          Available Formats: <span className="text-blue-600">{orders.length}</span>
        </div>
      </div>

      {/* Orders List with "Watch" Button */}
      <div className="space-y-3.5">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-lg mx-auto my-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No Orders Available Yet
            </h3>
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
                          <span>e-Stamp Attached</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>e-Stamp Pending</span>
                        </div>
                      )}
                      {order.photoUrl && (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          <span>Photo Attached</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Stamp Paper Price, Date, and "Watch" Button */}
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

                    {/* Single "Watch" Button */}
                    <button
                      onClick={() => setWatchingOrder(order)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Watch</span>
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

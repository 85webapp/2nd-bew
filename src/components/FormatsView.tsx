/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Formats Tab Component
 * Strict Requirement:
 * - Only shows the formatted documents for actual incoming orders/requests.
 * - Displays who the format is for ("Format For: [Client/Parties Name]").
 * - Fills all vitals (First Party, Second Party, addresses, stamp duty, jurisdiction) into the legal format.
 * - If no orders/requests have arrived, shows a clean empty state.
 */

import React, { useState } from 'react';
import { Order } from '../types';
import { formatDateStandard } from '../utils/dateTime';
import { 
  ScrollText, 
  User, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Printer, 
  ChevronRight, 
  Search,
  Scale,
  FileCheck
} from 'lucide-react';

interface FormatsViewProps {
  orders: Order[];
  onSelectOrderForView: (order: Order) => void;
}

export const FormatsView: React.FC<FormatsViewProps> = ({
  orders,
  onSelectOrderForView
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter orders by search query
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const p1 = order.legalData?.party1?.fullName?.toLowerCase() || order.clientName.toLowerCase();
    const p2 = order.legalData?.party2?.fullName?.toLowerCase() || '';
    const fn = order.formName.toLowerCase();
    const id = order.id.toLowerCase();
    return p1.includes(q) || p2.includes(q) || fn.includes(q) || id.includes(q);
  });

  return (
    <div className="space-y-5 pb-20">
      
      {/* Top Banner & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-blue-600" />
            <span>Generated Legal Formats</span>
          </h2>
          <p className="text-xs text-slate-500">
            Automated legal documents populated with incoming order vitals and execution terms
          </p>
        </div>

        {orders.length > 0 && (
          <div className="flex-1 min-w-[220px] max-w-sm relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client or format title..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
            />
          </div>
        )}
      </div>

      {/* Formatted Documents Feed */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-xl mx-auto my-6">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <ScrollText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No Formatted Documents Available
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              When an order or request arrives from Website A, the legal format will be automatically generated with the client's genuine vitals, terms, and clauses here.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-slate-600 font-semibold">No formats matched your search.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const p1 = order.legalData?.party1?.fullName || order.clientName;
            const p2 = order.legalData?.party2?.fullName;
            const hasStamp = Boolean(order.stampData?.verified);
            const dateStd = formatDateStandard(order.createdAt);
            const state = order.legalData?.state || 'Standard State Jurisdiction';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-blue-400 p-5 shadow-xs transition-all hover:shadow-md space-y-4"
              >
                {/* Header: Format For Client */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-block mb-1">
                      Format For: {p1} {p2 ? `& ${p2}` : ''}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                      {order.legalData?.documentTitle || order.formName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {order.id}
                    </span>
                    {hasStamp ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>e-Stamp Attached</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>e-Stamp Pending</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Filled Vitals Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">First Party / Executant:</span>
                    <strong className="text-slate-900 block truncate">{p1}</strong>
                    <span className="text-slate-500 text-[10px]">{order.clientPhone}</span>
                  </div>

                  {p2 && (
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Second Party / Obligee:</span>
                      <strong className="text-slate-900 block truncate">{p2}</strong>
                      <span className="text-slate-500 text-[10px]">{order.legalData?.party2?.phone || 'On Record'}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Stamp Duty & Jurisdiction:</span>
                    <strong className="text-blue-700 font-mono">₹ {order.stampDutyValue} /-</strong>
                    <span className="text-slate-500 text-[10px] block truncate">{state}</span>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500">
                    Received on: <span className="font-medium text-slate-700">{dateStd}</span> via {order.source}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectOrderForView(order)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>View Formatted Document</span>
                      <ChevronRight className="w-4 h-4" />
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

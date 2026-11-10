/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Orders Tab Component
 * Specifications:
 * 1. Top tabs: "Legal Document Requests" and "Registration & Compliance Leads"
 * 2. White Dropdown Menu next to search:
 *    - For Legal: All, Requests, Normal DOC
 *    - For Registration: All, Registrations, Insurance, Filing, Notices
 * 3. Card layout:
 *    - Top: Bold Form Name
 *    - Below: CTC-2026-200X
 *    - Below: First Party Name & Contact Number
 *    - Below: e-Stamp Attached (in green) or Pending
 *    - Right side: Stamp Paper Price, Date below price, Single Button: "View"
 * 4. Empty state when no orders have arrived yet
 * 5. Quick action to unlock inbound payloads from Website A
 */

import React, { useState } from 'react';
import { Order, OrderCategory } from '../types';
import { formatDateStandard } from '../utils/dateTime';
import { REQUEST_GROUP_IDS } from '../utils/templates';
import { 
  Search, 
  FileText, 
  Building2, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  User, 
  Phone,
  KeyRound,
  Inbox
} from 'lucide-react';

interface OrdersViewProps {
  orders: Order[];
  onSelectOrderForView: (order: Order) => void;
  onOpenUnlocker?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onSelectOrderForView,
  onOpenUnlocker
}) => {
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory>('legal');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dropdown filter state
  const [legalSubFilter, setLegalSubFilter] = useState<'all' | 'requests' | 'normal_doc'>('all');
  const [regSubFilter, setRegSubFilter] = useState<
    'all' | 'all_states' | 'filing_notices' | 'insurance_registration' | 'bank_loans' | 'website'
  >('all');

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    // 1. Primary Category
    if (order.category !== selectedCategory) return false;

    // 2. Sub-group Filter
    if (selectedCategory === 'legal') {
      const isRequestDoc = order.legalGroup === 'requests' || REQUEST_GROUP_IDS.includes(order.formType);
      if (legalSubFilter === 'requests' && !isRequestDoc) return false;
      if (legalSubFilter === 'normal_doc' && isRequestDoc) return false;
    } else {
      if (regSubFilter !== 'all') {
        if (order.subCategory !== regSubFilter) return false;
      }
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const p1 = order.legalData?.party1?.fullName?.toLowerCase() || order.clientName.toLowerCase();
      const fn = order.formName.toLowerCase();
      const id = order.id.toLowerCase();
      const phone = order.clientPhone.toLowerCase();
      if (!p1.includes(q) && !fn.includes(q) && !id.includes(q) && !phone.includes(q)) return false;
    }

    return true;
  });

  return (
    <div className="space-y-5 pb-20">
      
      {/* 1. Category Switch Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 gap-2">
          
          <button
            onClick={() => {
              setSelectedCategory('legal');
              setLegalSubFilter('all');
            }}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              selectedCategory === 'legal'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-gray-200'
            }`}
          >
            <FileText className={`w-4 h-4 ${selectedCategory === 'legal' ? 'text-white' : 'text-blue-600'}`} />
            <span>Legal Document Requests</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('registration');
              setRegSubFilter('all');
            }}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              selectedCategory === 'registration'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-gray-200'
            }`}
          >
            <Building2 className={`w-4 h-4 ${selectedCategory === 'registration' ? 'text-white' : 'text-blue-600'}`} />
            <span>Registration & Compliance Leads</span>
          </button>

        </div>
      </div>

      {/* 2. Search Bar + Clean White Dropdown Menu + Unlock Action */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by First Party Name, Form Name, ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
          />
        </div>

        {/* White Dropdown Menu & Quick Inbound Unlock */}
        <div className="flex items-center gap-2">
          {selectedCategory === 'legal' ? (
            <div className="relative">
              <select
                value={legalSubFilter}
                onChange={(e) => setLegalSubFilter(e.target.value as any)}
                className="appearance-none text-xs font-bold px-4 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-slate-800 shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[140px]"
              >
                <option value="all">All Documents</option>
                <option value="requests">Requests Group</option>
                <option value="normal_doc">Standard Documents</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <div className="relative">
              <select
                value={regSubFilter}
                onChange={(e) => setRegSubFilter(e.target.value as any)}
                className="appearance-none text-xs font-bold px-4 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-slate-800 shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px]"
              >
                <option value="all">All Categories</option>
                <option value="all_states">All States</option>
                <option value="filing_notices">Filing Notices</option>
                <option value="insurance_registration">Insurance Registration</option>
                <option value="bank_loans">Bank and Loans</option>
                <option value="website">Website</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {onOpenUnlocker && (
            <button
              onClick={onOpenUnlocker}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
              title="Unlock Inbound Order from Website A"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Unlock Payload</span>
            </button>
          )}
        </div>

      </div>

      {/* 3. Orders List */}
      <div className="space-y-3.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-lg mx-auto my-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No Inbound Orders Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When Website A sends encrypted client requests, or when you unlock an inbound payload using the Master Key, they will appear here in real-time.
            </p>
            {onOpenUnlocker && (
              <button
                onClick={onOpenUnlocker}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Unlock Inbound Payload from Website A</span>
              </button>
            )}
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
                          <span>e-Stamp Attached: {order.stampData?.uin}</span>
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

                    {/* Single "View" Button */}
                    <button
                      onClick={() => onSelectOrderForView(order)}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <span>View</span>
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

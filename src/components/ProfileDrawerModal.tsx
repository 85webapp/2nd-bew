/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Profile & Order Status Drawer Modal
 * Strict User Requirements:
 * 1. Confirmed Orders (कन्फर्मड ऑर्डर) - Shows all confirmed orders with e-Stamp attached
 * 2. Cancelled (कैंसिल्ड) - Shows all cancelled orders with full details
 * 3. Pending (पेंडिंग में) - Orders where e-Stamp is not yet added
 * 4. Submit Request (सबमिट रिक्वेस्ट) - Review queue with Confirm & Cancel buttons.
 *    - Strict rule: Only orders with e-Stamp attached can be clicked "Confirm"!
 *    - Confirmed moves to Confirmed Orders
 *    - Cancelled moves to Cancelled Orders
 */

import React, { useState } from 'react';
import { Order } from '../types';
import { formatDateStandard } from '../utils/dateTime';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  User, 
  Phone, 
  ChevronRight, 
  ShieldCheck, 
  FileText,
  AlertCircle
} from 'lucide-react';

export type ProfileSection = 'confirmed' | 'cancelled' | 'pending' | 'submit_request';

interface ProfileDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onConfirmOrder: (orderId: string) => void;
  onCancelOrder: (orderId: string, reason?: string) => void;
  onSelectOrderForView: (order: Order) => void;
}

export const ProfileDrawerModal: React.FC<ProfileDrawerModalProps> = ({
  isOpen,
  onClose,
  orders,
  onConfirmOrder,
  onCancelOrder,
  onSelectOrderForView
}) => {
  const [activeSection, setActiveSection] = useState<ProfileSection>('confirmed');
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter orders by section
  const confirmedOrders = orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'confirmed_stamp_attached'
  );

  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  const pendingOrders = orders.filter(
    (o) => !o.stampData?.verified && o.status !== 'confirmed' && o.status !== 'cancelled'
  );

  const submitRequests = orders.filter((o) => o.status !== 'cancelled');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Top Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Profile & Order Management
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                CTC Central Compliance Desk • Order Lifecycle Tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            aria-label="Close Profile Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Profile Navigation Sections */}
        <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            
            {/* 1. Confirmed Orders */}
            <button
              onClick={() => setActiveSection('confirmed')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeSection === 'confirmed'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeSection === 'confirmed' ? 'text-white' : 'text-emerald-600'}`} />
                <span className="truncate">कन्फर्मड (Confirmed)</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSection === 'confirmed' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {confirmedOrders.length}
              </span>
            </button>

            {/* 2. Cancelled Orders */}
            <button
              onClick={() => setActiveSection('cancelled')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeSection === 'cancelled'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <XCircle className={`w-3.5 h-3.5 ${activeSection === 'cancelled' ? 'text-white' : 'text-red-500'}`} />
                <span className="truncate">कैंसिल्ड (Cancelled)</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSection === 'cancelled' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {cancelledOrders.length}
              </span>
            </button>

            {/* 3. Pending Orders */}
            <button
              onClick={() => setActiveSection('pending')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeSection === 'pending'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Clock className={`w-3.5 h-3.5 ${activeSection === 'pending' ? 'text-white' : 'text-amber-500'}`} />
                <span className="truncate">पेंडिंग (Pending)</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSection === 'pending' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {pendingOrders.length}
              </span>
            </button>

            {/* 4. Submit Request */}
            <button
              onClick={() => setActiveSection('submit_request')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeSection === 'submit_request'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Send className={`w-3.5 h-3.5 ${activeSection === 'submit_request' ? 'text-white' : 'text-blue-500'}`} />
                <span className="truncate">सबमिट रिक्वेस्ट (Review)</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeSection === 'submit_request' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {submitRequests.length}
              </span>
            </button>

          </div>
        </div>

        {/* Modal Body / Orders Display */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/50">
          
          {/* Section: CONFIRMED ORDERS */}
          {activeSection === 'confirmed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                <span>कन्फर्मड ऑर्डर्स (All Confirmed with e-Stamp):</span>
                <span>{confirmedOrders.length} Records</span>
              </div>

              {confirmedOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Confirmed Orders Yet</p>
                  <p className="text-xs text-slate-500 mt-0.5">Attach an e-Stamp and confirm in Submit Request.</p>
                </div>
              ) : (
                confirmedOrders.map((order) => {
                  const dateStd = formatDateStandard(order.createdAt);
                  const p1 = order.legalData?.party1?.fullName || order.clientName;
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900 uppercase">{order.formName}</h4>
                          <div className="font-mono text-xs font-bold text-blue-600">{order.id}</div>
                          <div className="text-xs text-slate-700">First Party: <strong>{p1}</strong></div>
                          <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirmed • e-Stamp: {order.stampData?.uin || 'Attached'}</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                          <div className="text-right">
                            <div className="text-base font-black text-blue-600 font-mono">₹ {order.stampDutyValue}</div>
                            <span className="text-[11px] text-slate-500">{dateStd}</span>
                          </div>
                          <button
                            onClick={() => {
                              onClose();
                              onSelectOrderForView(order);
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Section: CANCELLED ORDERS */}
          {activeSection === 'cancelled' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                <span>कैंसिल्ड ऑर्डर्स (Cancelled Records with Full Details):</span>
                <span>{cancelledOrders.length} Records</span>
              </div>

              {cancelledOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Cancelled Orders</p>
                </div>
              ) : (
                cancelledOrders.map((order) => {
                  const dateStd = formatDateStandard(order.createdAt);
                  const p1 = order.legalData?.party1?.fullName || order.clientName;
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-red-200 p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900 uppercase">{order.formName}</h4>
                          <div className="font-mono text-xs font-bold text-red-600">{order.id}</div>
                          <div className="text-xs text-slate-700">First Party: <strong>{p1}</strong></div>
                          <div className="text-xs text-red-700 font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Status: Cancelled</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                          <div className="text-right">
                            <div className="text-base font-black text-slate-500 font-mono">₹ {order.stampDutyValue}</div>
                            <span className="text-[11px] text-slate-500">{dateStd}</span>
                          </div>
                          <button
                            onClick={() => {
                              onClose();
                              onSelectOrderForView(order);
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Section: PENDING ORDERS */}
          {activeSection === 'pending' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                <span>पेंडिंग ऑर्डर्स (e-Stamp Pending):</span>
                <span>{pendingOrders.length} Records</span>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Pending Orders</p>
                  <p className="text-xs text-slate-500 mt-0.5">All received orders have e-Stamp attached.</p>
                </div>
              ) : (
                pendingOrders.map((order) => {
                  const dateStd = formatDateStandard(order.createdAt);
                  const p1 = order.legalData?.party1?.fullName || order.clientName;
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900 uppercase">{order.formName}</h4>
                          <div className="font-mono text-xs font-bold text-blue-600">{order.id}</div>
                          <div className="text-xs text-slate-700">First Party: <strong>{p1}</strong></div>
                          <div className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>e-Stamp Paper Not Attached</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                          <div className="text-right">
                            <div className="text-base font-black text-blue-600 font-mono">₹ {order.stampDutyValue}</div>
                            <span className="text-[11px] text-slate-500">{dateStd}</span>
                          </div>
                          <button
                            onClick={() => {
                              onClose();
                              onSelectOrderForView(order);
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Section: SUBMIT REQUEST (Review Queue with Confirm & Cancel) */}
          {activeSection === 'submit_request' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Approval Rule:</strong> You can only <strong>Confirm</strong> orders on which an e-Stamp has been attached. Unstamped orders can be reviewed or cancelled.
                </span>
              </div>

              {submitRequests.map((order) => {
                const dateStd = formatDateStandard(order.createdAt);
                const p1 = order.legalData?.party1?.fullName || order.clientName;
                const hasStamp = Boolean(order.stampData?.verified);
                const isAlreadyConfirmed = order.status === 'confirmed';

                return (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs hover:border-blue-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 uppercase">{order.formName}</h4>
                        <div className="font-mono text-xs font-bold text-blue-600">{order.id}</div>
                        <div className="text-xs text-slate-700">First Party: <strong>{p1}</strong></div>
                        <div className="text-xs text-slate-600">Contact: <span className="font-mono">{order.clientPhone}</span></div>
                        
                        <div className="pt-1">
                          {hasStamp ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>e-Stamp Attached: {order.stampData?.uin}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>e-Stamp Pending</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex flex-wrap items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">Stamp Duty</span>
                          <span className="font-mono font-black text-slate-900 text-sm">₹ {order.stampDutyValue}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Cancel Button */}
                          <button
                            onClick={() => onCancelOrder(order.id, 'Cancelled from Submit Request Desk')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors active:scale-95"
                          >
                            Cancel
                          </button>

                          {/* Confirm Button: Strict check for e-Stamp */}
                          {hasStamp ? (
                            <button
                              onClick={() => onConfirmOrder(order.id)}
                              disabled={isAlreadyConfirmed}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs ${
                                isAlreadyConfirmed
                                  ? 'bg-emerald-600 cursor-default'
                                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                              }`}
                            >
                              {isAlreadyConfirmed ? 'Confirmed ✓' : 'Confirm'}
                            </button>
                          ) : (
                            <button
                              disabled
                              title="e-Stamp must be attached in Upload tab before confirming"
                              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-75"
                            >
                              Confirm (Locked)
                            </button>
                          )}

                          {/* View Button */}
                          <button
                            onClick={() => {
                              onClose();
                              onSelectOrderForView(order);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                            title="View Full Document"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>CTC Compliance & Audit Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

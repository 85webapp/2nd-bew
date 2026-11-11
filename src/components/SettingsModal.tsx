/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Settings Modal — Final Document & Production System Security
 * Specifications:
 * 1. Prominent Top Section: "Final Document"
 *    - Lists ONLY orders that have an e-Stamp paper uploaded.
 *    - Each card displays Form Name, Order ID, Party 1, Contact, Stamp Price, Date.
 *    - Action Button on each card: "Match"
 *    - Clicking "Match" opens the Final Overlaid Document where the uploaded e-Stamp paper
 *      is at the top of Page 1, with legal text continuing underneath and on subsequent pages!
 * 2. Clean System Environment Info:
 *    - Removes old telemetry clutter & manual key inputs.
 *    - Confirms that all keys (WEBSITE_SECRET_KEY, PRIVATE_KEY, Supabase, Cloudinary, Telegram)
 *      are securely managed through Vercel / server environment variables (.env).
 */

import React, { useState } from 'react';
import { Order } from '../types';
import { formatDateStandard } from '../utils/dateTime';
import { DocumentRenderer } from './DocumentRenderer';
import { 
  X, 
  Layers, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  Printer, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  Server, 
  Database, 
  Sparkles,
  Inbox
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders?: Order[];
  onClearAllOrders?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  orders = [],
  onClearAllOrders
}) => {
  // Active order being matched/viewed as Final Document
  const [matchedOrder, setMatchedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  // Filter orders that have an e-Stamp paper attached
  const finalDocumentOrders = orders.filter((o) => Boolean(o.stampData?.verified));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (matchedOrder) {
      // Dynamic on-demand stream with overlay, never saving to server
      window.open(`/api/documents/render-pdf?orderId=${matchedOrder.id}&overlay=true`, '_blank');
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="no-print p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {matchedOrder ? 'Final Overlaid Document' : 'Settings & Final Documents'}
              </h2>
              <p className="text-xs text-slate-500">
                {matchedOrder ? `Overlaying Order ${matchedOrder.id}` : 'Official Final e-Stamp merged documents & system security'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (matchedOrder) {
                setMatchedOrder(null);
              } else {
                onClose();
              }
            }}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* ================= IF MATCH IS CLICKED: SHOW OVERLAID FINAL DOCUMENT ================= */}
          {matchedOrder ? (
            <div className="space-y-5">
              
              {/* Back to list & Print Bar */}
              <div className="no-print bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setMatchedOrder(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 bg-white border border-gray-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Final Documents List</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-gray-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Final Overlaid A4</span>
                  </button>
                </div>
              </div>

              {/* Informative Overlay Notice */}
              <div className="no-print bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Front-Side e-Stamp Overlay Active:</strong> Page 1 displays your uploaded e-Stamp paper certificate at the top half, with the legal agreement text starting in the designated continuation blank space directly underneath. Subsequent pages continue with all remaining clauses and signatures.
                </div>
              </div>

              {/* Render Final Document with e-Stamp Overlay */}
              <div className="border border-gray-200 rounded-2xl p-4 bg-slate-100">
                <DocumentRenderer order={matchedOrder} hideRibbon={true} showEStampOverlay={true} />
              </div>
            </div>
          ) : (
            /* ================= DEFAULT VIEW: "FINAL DOCUMENT" SECTION ON TOP ================= */
            <div className="space-y-6">
              
              {/* 1. Final Document Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold text-blue-600 tracking-wider">
                      Section 1
                    </span>
                    <h3 className="text-sm font-black text-slate-900 uppercase">
                      Final Documents (e-Stamp Ready)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {finalDocumentOrders.length} Stamped Orders Available
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Only orders with an official e-Stamp paper uploaded appear in this section. Click <strong>"Match"</strong> to view or print the final overlaid document where Page 1 carries the e-Stamp certificate with the agreement text continuing below.
                </p>

                {/* Stamped Orders List with "Match" Button */}
                {finalDocumentOrders.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-gray-300 rounded-xl p-8 text-center space-y-2">
                    <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">No Final Documents Available Yet</h4>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Go to the <strong>Upload</strong> tab, select an order, and upload its e-Stamp paper. Once attached, it will instantly appear here ready for the <strong>Match</strong> view.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {finalDocumentOrders.map((order) => {
                      const dateStd = formatDateStandard(order.createdAt);
                      const party1Name = order.legalData?.party1?.fullName || order.registrationData?.applicantName || order.clientName;
                      const contactPhone = order.legalData?.party1?.phone || order.clientPhone;

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 p-4 shadow-xs transition-all hover:shadow-md"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            
                            {/* Left Column */}
                            <div className="space-y-1 flex-1">
                              <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase">
                                {order.formName}
                              </h4>

                              <div className="font-mono text-xs font-bold text-blue-600">
                                {order.id}
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-slate-700 pt-0.5">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-slate-500">First Party:</span>
                                <strong className="text-slate-900">{party1Name}</strong>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-slate-500">Contact:</span>
                                <span className="font-mono font-medium text-slate-900">{contactPhone}</span>
                              </div>

                              <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>e-Stamp Attached: {order.stampData?.uin}</span>
                              </div>
                            </div>

                            {/* Right Column: Stamp Paper Price, Date, and "Match" Button */}
                            <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2.5 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-gray-100">
                              <div className="text-right">
                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                                  Stamp Duty
                                </span>
                                <div className="text-base sm:text-lg font-black text-blue-600 font-mono">
                                  ₹ {order.stampDutyValue}
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium block">
                                  Date: {dateStd}
                                </span>
                              </div>

                              {/* Single "Match" Button */}
                              <button
                                onClick={() => setMatchedOrder(order)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Match</span>
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. System Environment & Security Status (Clean Architecture) */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                    Section 2
                  </span>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Vercel & Backend Environment Architecture
                  </h3>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Zero Hard-Coding Discipline Active</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    All sensitive API keys, HMAC secrets (<code className="bg-white px-1 py-0.5 rounded text-blue-600 border border-slate-200">WEBSITE_SECRET_KEY</code>), private decryption keys (<code className="bg-white px-1 py-0.5 rounded text-blue-600 border border-slate-200">PRIVATE_KEY</code>), Supabase credentials, and Cloudinary settings are strictly loaded from Vercel Serverless environment variables.
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>Zero PDF Storage:</strong> PDFs are dynamically rendered in-memory on demand when downloaded or printed. Only raw JSON data is permanently stored in the Supabase database to ensure zero storage bloat.
                  </p>
                </div>

                {onClearAllOrders && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear local cache? (Supabase remote records will remain safe).')) {
                          onClearAllOrders();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                    >
                      Clear Local Client Cache
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Formats Tab Component (फॉर्मेट)
 * Specifications:
 * 1. Displays all 26+ statutory formats under Indian Stamp Act 1899 & Uttar Pradesh Stamp Rules (Schedule 1-B),
 *    plus All States Registration & Compliance Formats (GST, Udyam MSME, ITR, Insurance, Bank & Loans, Website).
 * 2. Directly shows incoming orders associated with each format.
 * 3. Each format card has a prominent "View" button.
 * 4. Clicking View opens the full statutory format view complete with preamble, recitals,
 *    stamp duty guidelines, and legal clauses.
 */

import React, { useState } from 'react';
import { Order, LegalFormatTemplate } from '../types';
import { STATUTORY_FORMAT_TEMPLATES } from '../utils/templates';
import { 
  Search, 
  ChevronDown, 
  ScrollText, 
  Scale, 
  Printer, 
  Copy, 
  Check, 
  ArrowLeft, 
  FileCheck2, 
  Building2, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface FormatsViewProps {
  orders: Order[];
  onSelectOrderForView: (order: Order) => void;
}

export const FormatsView: React.FC<FormatsViewProps> = ({
  orders,
  onSelectOrderForView
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'legal' | 'compliance' | 'requests'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<LegalFormatTemplate | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter templates
  const filteredTemplates = STATUTORY_FORMAT_TEMPLATES.filter((tpl) => {
    if (filterCategory === 'legal' && (tpl.category !== 'legal' || tpl.isRequestOnly)) return false;
    if (filterCategory === 'compliance' && tpl.category !== 'compliance') return false;
    if (filterCategory === 'requests' && !tpl.isRequestOnly) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = tpl.title.toLowerCase().includes(q);
      const matchAct = tpl.actReference.toLowerCase().includes(q);
      const matchDesc = tpl.description.toLowerCase().includes(q);
      if (!matchTitle && !matchAct && !matchDesc) return false;
    }
    return true;
  });

  const handleCopyText = () => {
    if (!selectedFormat) return;
    const content = `${selectedFormat.title}\n${selectedFormat.actReference}\n\nSTAMP DUTY:\n${selectedFormat.stampDutyGuideline}\n\nPREAMBLE:\n${selectedFormat.statutoryPreamble}\n\n${selectedFormat.standardBody}\n\nMANDATORY CLAUSES:\n${selectedFormat.mandatoryClauses.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 pb-20">
      
      {/* ================= IF VIEWING FULL FORMAT PREVIEW ================= */}
      {selectedFormat ? (
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setSelectedFormat(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Formats</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-gray-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Format</span>
              </button>
            </div>
          </div>

          {/* Full Statutory Format Paper */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 shadow-sm space-y-6 max-w-4xl mx-auto">
            {/* Stamp Act & Jurisdiction Banner */}
            <div className="border-b border-gray-200 pb-5 text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Scale className="w-4 h-4" />
                <span>Statutory Reference: {selectedFormat.actReference}</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {selectedFormat.title}
              </h1>
              <p className="text-xs text-slate-500 max-w-2xl mx-auto">
                {selectedFormat.description}
              </p>
            </div>

            {/* Stamp Duty & Parties Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs border border-gray-200">
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">Recommended Stamp Duty (Indian / UP Stamp Act):</span>
                <strong className="text-blue-700 font-mono text-sm">{selectedFormat.stampDutyGuideline}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">Executing Parties Required:</span>
                <strong className="text-slate-900 text-sm">{selectedFormat.partiesRequired}</strong>
              </div>
            </div>

            {/* Statutory Preamble & Recitals */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-gray-100 pb-1">
                Statutory Preamble & Recitals
              </h3>
              <p className="text-xs font-mono text-slate-800 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                {selectedFormat.statutoryPreamble}
              </p>
              <p className="text-xs text-slate-700 leading-relaxed text-justify">
                {selectedFormat.standardBody}
              </p>
            </div>

            {/* Mandatory Numbered Clauses */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-gray-100 pb-1">
                Mandatory Statutory Clauses
              </h3>
              <div className="space-y-2">
                {selectedFormat.mandatoryClauses.map((clause, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                    <span className="font-bold text-blue-600 shrink-0">{idx + 1}.</span>
                    <span className="font-medium">{clause}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attestation & Witness Schedule */}
            <div className="pt-6 border-t border-gray-200 text-xs space-y-4">
              <p className="font-semibold text-slate-700">
                IN WITNESS WHEREOF, the executing parties have signed and delivered this deed on the date and place first hereinabove stated, in the presence of the subscribing witnesses.
              </p>
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="border-t border-dashed border-gray-300 pt-2 text-slate-600">
                  <span className="block font-bold">First Party / Executant Signature</span>
                  <span className="text-[11px] text-slate-400">Date & Seal</span>
                </div>
                <div className="border-t border-dashed border-gray-300 pt-2 text-slate-600 text-right">
                  <span className="block font-bold">Second Party / Obligee Signature</span>
                  <span className="text-[11px] text-slate-400">Date & Seal</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (

        /* ================= DEFAULT: LIST OF STATUTORY FORMATS ================= */
        <>
          {/* Top Filter and Search Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search formats by Act, Title, or Clause..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
              />
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="appearance-none text-xs font-bold px-4 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-slate-800 shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[200px]"
              >
                <option value="all">All Formats ({STATUTORY_FORMAT_TEMPLATES.length})</option>
                <option value="legal">Indian Stamp Act 1899 & UP Rules</option>
                <option value="compliance">Registration & Compliance Leads</option>
                <option value="requests">Request-Only Formats (3)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

          </div>

          {/* Formats Grid / Cards */}
          <div className="space-y-3.5">
            {filteredTemplates.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <ScrollText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Formats Found</h3>
                <p className="text-xs text-slate-500 mt-1">Try another search keyword or filter.</p>
              </div>
            ) : (
              filteredTemplates.map((tpl) => {
                // Find matching orders in system using this format
                const linkedOrders = orders.filter((o) => o.formType === tpl.id);

                return (
                  <div
                    key={tpl.id}
                    className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      
                      {/* Left: Title -> Statutory Act -> Description -> Active Orders */}
                      <div className="space-y-1 flex-1">
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase leading-snug">
                            {tpl.title}
                          </h2>
                          {tpl.isRequestOnly && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Request Only
                            </span>
                          )}
                        </div>

                        {/* Statutory Reference */}
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold pt-0.5">
                          <Scale className="w-3.5 h-3.5 shrink-0" />
                          <span>{tpl.actReference}</span>
                        </div>

                        <p className="text-xs text-slate-600 pt-1 line-clamp-2">
                          {tpl.description}
                        </p>

                        {/* Live Ingested Orders matching this format */}
                        {linkedOrders.length > 0 && (
                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">Live Ingested Requests ({linkedOrders.length}):</span>
                            {linkedOrders.map((ord) => (
                              <button
                                key={ord.id}
                                onClick={() => onSelectOrderForView(ord)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 transition-colors"
                                title={`Click to view live order ${ord.id}`}
                              >
                                <span>{ord.id}</span>
                                <span className="text-slate-400">•</span>
                                <span className="font-sans font-normal truncate max-w-[120px]">{ord.clientName}</span>
                              </button>
                            ))}
                          </div>
                        )}

                      </div>

                      {/* Right: Stamp Duty -> Action Button "View" */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                            Stamp Duty Rule
                          </span>
                          <div className="text-xs font-mono font-bold text-slate-800 max-w-[200px]">
                            {tpl.stampDutyGuideline}
                          </div>
                        </div>

                        {/* SINGLE "VIEW" BUTTON PER SPEC */}
                        <button
                          onClick={() => setSelectedFormat(tpl)}
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
        </>
      )}

    </div>
  );
};

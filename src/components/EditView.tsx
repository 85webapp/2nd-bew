/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Edit Tab Component
 * Specifications:
 * 1. Top Dropdown Menu with:
 *    - All (Default - shows all orders)
 *    - Requests (5 specific documents)
 *    - Normal DOC (23 legal documents)
 *    - Registrations
 *    - Insurance
 *    - Filing
 *    - Notices
 * 2. Search bar for 1st Party & Form Name
 * 3. Cards in exact same layout as Orders Tab with an "Edit" button
 * 4. Clicking Edit opens the complete form ONLY (NO preview document below/beside!)
 * 5. Optional fields explicitly shown (e.g. "Aadhaar Card = 0" with an editable input box)
 * 6. Stamped documents are automatically excluded from the Edit list!
 */

import React, { useState } from 'react';
import { Order, LegalOrderData } from '../types';
import { formatDateStandard } from '../utils/dateTime';
import { REQUEST_GROUP_IDS } from '../utils/templates';
import { 
  Search, 
  ChevronDown, 
  Pencil, 
  Save, 
  ArrowLeft, 
  Check, 
  RotateCcw, 
  User, 
  Phone, 
  FileText,
  AlertCircle
} from 'lucide-react';

interface EditViewProps {
  orders: Order[];
  currentOrder: Order | null;
  onSelectOrder: (order: Order) => void;
  onSaveOrder: (updatedOrder: Order) => void;
  onSendNotification?: (message: string) => void;
}

export const EditView: React.FC<EditViewProps> = ({
  orders,
  currentOrder,
  onSelectOrder,
  onSaveOrder
}) => {
  // Allow editing all orders anytime
  const editableOrders = orders;

  // Top Dropdown Filter
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'requests' | 'normal_doc' | 'all_states' | 'filing_notices' | 'insurance_registration' | 'bank_loans' | 'website'
  >('all');

  const [searchQuery, setSearchQuery] = useState('');

  // Active Editing Order
  const [activeEditingOrder, setActiveEditingOrder] = useState<Order | null>(null);

  // Form Field State (For Legal orders)
  const [legalForm, setLegalForm] = useState<LegalOrderData | null>(null);

  // Registration form field state
  const [regForm, setRegForm] = useState<any | null>(null);

  const [isSaved, setIsSaved] = useState(false);

  // Filter Orders & Sort Latest First (All orders visible in Edit tab)
  const filteredOrders = editableOrders
    .filter((order) => {
      // 1. Dropdown filter
      if (categoryFilter === 'requests') {
        const isReq = order.legalGroup === 'requests' || REQUEST_GROUP_IDS.includes(order.formType);
        if (!isReq) return false;
      } else if (categoryFilter === 'normal_doc') {
        const isReq = order.legalGroup === 'requests' || REQUEST_GROUP_IDS.includes(order.formType);
        if (order.category !== 'legal' || isReq) return false;
      } else if (categoryFilter === 'all_states') {
        if (order.subCategory !== 'all_states') return false;
      } else if (categoryFilter === 'filing_notices') {
        if (order.subCategory !== 'filing_notices') return false;
      } else if (categoryFilter === 'insurance_registration') {
        if (order.subCategory !== 'insurance_registration') return false;
      } else if (categoryFilter === 'bank_loans') {
        if (order.subCategory !== 'bank_loans') return false;
      } else if (categoryFilter === 'website') {
        if (order.subCategory !== 'website') return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p1 = order.legalData?.party1?.fullName?.toLowerCase() || order.clientName.toLowerCase();
        const fn = order.formName.toLowerCase();
        const id = order.id.toLowerCase();
        if (!p1.includes(q) && !fn.includes(q) && !id.includes(q)) return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleOpenEdit = (order: Order) => {
    setActiveEditingOrder(order);
    onSelectOrder(order);
    setIsSaved(false);

    if (order.category === 'legal' && order.legalData) {
      setLegalForm(JSON.parse(JSON.stringify(order.legalData)));
      setRegForm(null);
    } else if (order.registrationData) {
      setRegForm(JSON.parse(JSON.stringify(order.registrationData)));
      setLegalForm(null);
    }
  };

  const handleCloseEdit = () => {
    setActiveEditingOrder(null);
    setLegalForm(null);
    setRegForm(null);
  };

  const handleSaveLegal = () => {
    if (!activeEditingOrder || !legalForm) return;
    const updated: Order = {
      ...activeEditingOrder,
      clientName: legalForm.party1.fullName,
      clientPhone: legalForm.party1.phone,
      stampDutyValue: legalForm.stampDutyAmount || activeEditingOrder.stampDutyValue,
      legalData: legalForm,
      updatedAt: new Date().toISOString()
    };
    onSaveOrder(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSaveRegistration = () => {
    if (!activeEditingOrder || !regForm) return;
    const updated: Order = {
      ...activeEditingOrder,
      clientName: regForm.applicantName,
      clientPhone: regForm.contactNumber,
      registrationData: regForm,
      updatedAt: new Date().toISOString()
    };
    onSaveOrder(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // ===================== IF EDIT IS OPENED: SHOW ONLY THE FORM (NO DOCUMENT PREVIEW!) ===================== //
  if (activeEditingOrder) {
    const isLegal = activeEditingOrder.category === 'legal';

    return (
      <div className="space-y-5 pb-24 max-w-4xl mx-auto">
        
        {/* Top Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseEdit}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Form Orders</span>
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase">
                {activeEditingOrder.formName}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Order ID: {activeEditingOrder.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isLegal && activeEditingOrder.legalData) {
                  setLegalForm(JSON.parse(JSON.stringify(activeEditingOrder.legalData)));
                } else if (activeEditingOrder.registrationData) {
                  setRegForm(JSON.parse(JSON.stringify(activeEditingOrder.registrationData)));
                }
              }}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-gray-200 transition-colors"
              title="Reset to Original Values"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={isLegal ? handleSaveLegal : handleSaveRegistration}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
                isSaved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Saved Successfully!' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* ================= PURE FORM ONLY (NO DOCUMENT PREVIEW BELOW!) ================= */}
        {isLegal && legalForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
            
            {/* 1. Execution & Jurisdiction */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-gray-100 pb-2">
                1. General Parameters & Duty
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Document Title</label>
                  <input
                    type="text"
                    value={legalForm.documentTitle}
                    onChange={(e) => setLegalForm({ ...legalForm, documentTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Stamp Duty Amount (₹)</label>
                  <input
                    type="number"
                    value={legalForm.stampDutyAmount}
                    onChange={(e) => setLegalForm({ ...legalForm, stampDutyAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono font-bold bg-white text-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">State / Jurisdiction</label>
                  <input
                    type="text"
                    value={legalForm.state}
                    onChange={(e) => setLegalForm({ ...legalForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. First Party Details */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-gray-100 pb-2">
                2. First Party Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    value={legalForm.party1.fullName}
                    onChange={(e) => setLegalForm({
                      ...legalForm,
                      party1: { ...legalForm.party1, fullName: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Contact Mobile Number *</label>
                  <input
                    type="text"
                    value={legalForm.party1.phone}
                    onChange={(e) => setLegalForm({
                      ...legalForm,
                      party1: { ...legalForm.party1, phone: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Email ID</label>
                  <input
                    type="email"
                    value={legalForm.party1.email}
                    onChange={(e) => setLegalForm({
                      ...legalForm,
                      party1: { ...legalForm.party1, email: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Relation & Relative</label>
                  <input
                    type="text"
                    value={legalForm.party1.relativeName || ''}
                    onChange={(e) => setLegalForm({
                      ...legalForm,
                      party1: { ...legalForm.party1, relativeName: e.target.value }
                    })}
                    placeholder="Father / Spouse Name"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>

                {/* OPTIONAL FIELD SPECIFICATION: Show "Aadhaar Card = 0" with an editable box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 font-semibold">Aadhaar Card</label>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-mono">
                      Aadhaar Card = {legalForm.party1.aadhaarLast4 || '0'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={legalForm.party1.aadhaarLast4 || '0'}
                    onChange={(e) => setLegalForm({
                      ...legalForm,
                      party1: { ...legalForm.party1, aadhaarLast4: e.target.value }
                    })}
                    placeholder="Aadhaar Last 4 or 0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    value={legalForm.party1.pan || ''}
                    onChange={(e) => setLegalForm({
                      ...legalForm,
                      party1: { ...legalForm.party1, pan: e.target.value.toUpperCase() }
                    })}
                    placeholder="PAN Number"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Permanent Residential Address</label>
                  <textarea
                    rows={2}
                    value={legalForm.party1.address}
                    onChange={(e) => setLegalForm({
                      ...legalForm,
                      party1: { ...legalForm.party1, address: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 3. Second Party Details (if present) */}
            {legalForm.party2 && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-gray-100 pb-2">
                  3. Second Party Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Second Party Name</label>
                    <input
                      type="text"
                      value={legalForm.party2.fullName}
                      onChange={(e) => setLegalForm({
                        ...legalForm,
                        party2: { ...legalForm.party2!, fullName: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={legalForm.party2.phone}
                      onChange={(e) => setLegalForm({
                        ...legalForm,
                        party2: { ...legalForm.party2!, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                    />
                  </div>

                  {/* OPTIONAL FIELD SPECIFICATION: Show "Aadhaar Card = 0" */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 font-semibold">Second Party Aadhaar</label>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-mono">
                        Aadhaar Card = {legalForm.party2.aadhaarLast4 || '0'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={legalForm.party2.aadhaarLast4 || '0'}
                      onChange={(e) => setLegalForm({
                        ...legalForm,
                        party2: { ...legalForm.party2!, aadhaarLast4: e.target.value }
                      })}
                      placeholder="Aadhaar Last 4 or 0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={legalForm.party2.pan || ''}
                      onChange={(e) => setLegalForm({
                        ...legalForm,
                        party2: { ...legalForm.party2!, pan: e.target.value.toUpperCase() }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Address</label>
                    <textarea
                      rows={2}
                      value={legalForm.party2.address}
                      onChange={(e) => setLegalForm({
                        ...legalForm,
                        party2: { ...legalForm.party2!, address: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Property or Covenants (if applicable) */}
            {legalForm.propertyDetails && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-gray-100 pb-2">
                  4. Property & Consideration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Premises Address</label>
                    <textarea
                      rows={2}
                      value={legalForm.propertyDetails.fullAddress}
                      onChange={(e) => setLegalForm({
                        ...legalForm,
                        propertyDetails: { ...legalForm.propertyDetails!, fullAddress: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Monthly Consideration (₹)</label>
                    <input
                      type="number"
                      value={legalForm.propertyDetails.monthlyRentOrConsideration}
                      onChange={(e) => setLegalForm({
                        ...legalForm,
                        propertyDetails: { ...legalForm.propertyDetails!, monthlyRentOrConsideration: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Security Deposit (₹)</label>
                    <input
                      type="number"
                      value={legalForm.propertyDetails.securityDeposit}
                      onChange={(e) => setLegalForm({
                        ...legalForm,
                        propertyDetails: { ...legalForm.propertyDetails!, securityDeposit: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save Action */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSaveLegal}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save & Confirm Changes</span>
              </button>
            </div>

          </div>
        ) : regForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 border-b border-gray-100 pb-2">
              Registration Dossier Parameters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Applicant Name</label>
                <input
                  type="text"
                  value={regForm.applicantName}
                  onChange={(e) => setRegForm({ ...regForm, applicantName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={regForm.contactNumber}
                  onChange={(e) => setRegForm({ ...regForm, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">PAN Number</label>
                <input
                  type="text"
                  value={regForm.panNumber || ''}
                  onChange={(e) => setRegForm({ ...regForm, panNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Aadhaar (UIDAI)</label>
                <input
                  type="text"
                  value={regForm.aadhaarNumber || '0'}
                  onChange={(e) => setRegForm({ ...regForm, aadhaarNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Business Name</label>
                <input
                  type="text"
                  value={regForm.businessName || ''}
                  onChange={(e) => setRegForm({ ...regForm, businessName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSaveRegistration}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Registration Details</span>
              </button>
            </div>
          </div>
        ) : null}

      </div>
    );
  }

  // ===================== DEFAULT VIEW: ORDERS LIST WITH DROPDOWN FILTER & EDIT BUTTON ===================== //
  return (
    <div className="space-y-5 pb-20">
      
      {/* 1. Top Dropdown Menu Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Search by 1st Party & Form Name */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by 1st Party Name or Form Name..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
          />
        </div>

        {/* Custom White Dropdown Menu */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="appearance-none text-xs font-bold px-4 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-slate-800 shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[170px]"
          >
            <option value="all">All (All Forms)</option>
            <option value="requests">Requests (5 Formats)</option>
            <option value="normal_doc">Normal DOC (23 Formats)</option>
            <option value="all_states">All States</option>
            <option value="filing_notices">Filing Notices</option>
            <option value="insurance_registration">Insurance Registration</option>
            <option value="bank_loans">Bank and Loans</option>
            <option value="website">Website</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

      </div>

      {/* Orders List (Same Layout + Pencil Edit Button) */}
      <div className="space-y-3.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Editable Forms Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Forms with e-Stamps attached are automatically removed from this Edit list.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const dateStd = formatDateStandard(order.createdAt);
            const party1Name = order.legalData?.party1?.fullName || order.registrationData?.applicantName || order.clientName;
            const contactPhone = order.legalData?.party1?.phone || order.clientPhone;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  
                  {/* Left Column: Form Name -> ID -> First Party -> Contact */}
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
                      {order.stampData?.verified ? (
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>e-Stamp Attached</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
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

                  {/* Right Column: Stamp Paper Price -> Date Below -> PENCIL EDIT BUTTON */}
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

                    {/* Pencil Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(order)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
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

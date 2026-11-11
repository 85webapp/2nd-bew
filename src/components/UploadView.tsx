/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Upload Tab Component
 * Specifications:
 * 1. Clean list of all orders matching the exact card layout of Orders & Edit tabs.
 * 2. Each card features an "Upload" button.
 * 3. Clicking "Upload" on an order opens the Drag & Drop / File Upload Modal:
 *    - Accepts PDF, PNG, JPG, JPEG, etc. with NO size restrictions.
 *    - Uploads file and marks e-Stamp as attached for that order.
 *    - Strictly file upload (no manual form field filling required).
 * 4. Shows e-Stamp Attached (green) or Pending (amber) status on each card.
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
  FileText, 
  Check, 
  Inbox
} from 'lucide-react';

interface UploadViewProps {
  orders: Order[];
  currentOrder: Order | null;
  onSelectOrder: (order: Order) => void;
  onSaveOrder: (updatedOrder: Order) => void;
  onSendNotification?: (message: string) => void;
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

  const handleOpenUploadModal = (order: Order) => {
    setActiveUploadOrder(order);
    setSelectedFile(null);
    setFilePreview(order.stampData?.scanUrl || order.stampData?.eStampPaperUrl || null);
  };

  const handleCloseModal = () => {
    setActiveUploadOrder(null);
    setSelectedFile(null);
    setFilePreview(null);
    setIsSubmitting(false);
  };

  // Drag and drop handlers
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
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = () => {
    if (!activeUploadOrder || !filePreview) return;
    setIsSubmitting(true);

    const generatedUin = activeUploadOrder.stampData?.uin || 
      `IN-DL${Date.now().toString().slice(-8)}T`;

    const updatedOrder: Order = {
      ...activeUploadOrder,
      status: 'confirmed_stamp_attached',
      stampData: {
        uin: generatedUin,
        certificateNo: activeUploadOrder.stampData?.certificateNo || `CERT-${Date.now().toString().slice(-6)}`,
        issueDate: new Date().toISOString().split('T')[0],
        firstParty: activeUploadOrder.legalData?.party1?.fullName || activeUploadOrder.clientName,
        secondParty: activeUploadOrder.legalData?.party2?.fullName || 'Second Party',
        stampDutyPaidBy: 'First Party',
        stampDutyAmount: activeUploadOrder.stampDutyValue,
        article: 'Article 35 Agreement',
        state: activeUploadOrder.legalData?.state || 'Delhi',
        scanUrl: filePreview,
        eStampPaperUrl: filePreview,
        verified: true,
        verifiedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    onSaveOrder(updatedOrder);

    // Call server overlay endpoint to update e-Stamp
    fetch('/api/documents/overlay-stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: activeUploadOrder.id,
        stampPaperImageBase64: filePreview,
        topOffset: 260
      })
    }).catch(() => {});

    if (onSendNotification) {
      onSendNotification(`e-Stamp Paper successfully attached to Order ${activeUploadOrder.id}`);
    }

    setSuccessNotice(`e-Stamp paper successfully bound to ${activeUploadOrder.id}!`);
    setTimeout(() => {
      setSuccessNotice(null);
      handleCloseModal();
    }, 1500);
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
            <h3 className="text-base font-bold text-slate-800">
              No Orders Available for Upload
            </h3>
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
                  
                  {/* Left Column: Form Name, ID, Party, Contact, Stamp Status */}
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

                  {/* Right Column: Stamp Paper Price, Date, and "Upload" Button */}
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

                    {/* Single "Upload" Button */}
                    <button
                      onClick={() => handleOpenUploadModal(order)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer ${
                        hasStamp 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
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

      {/* ================= UPLOAD E-STAMP MODAL ================= */}
      {activeUploadOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Upload e-Stamp Paper</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order: <strong className="font-mono text-blue-600">{activeUploadOrder.id}</strong> — {activeUploadOrder.formName}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drag and Drop Box (Any format, no size restriction) */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragActive 
                  ? 'border-blue-600 bg-blue-50' 
                  : filePreview 
                    ? 'border-emerald-400 bg-emerald-50/30' 
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

              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {filePreview ? (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{selectedFile ? selectedFile.name : 'e-Stamp Paper Attached'}</span>
                    </div>

                    {filePreview.startsWith('data:image') && (
                      <div className="max-h-48 overflow-hidden rounded-lg border border-gray-200 mt-2">
                        <img src={filePreview} alt="e-Stamp Preview" className="w-full object-contain max-h-48" />
                      </div>
                    )}

                    <div className="pt-1">
                      <label
                        htmlFor="modal-estamp-file"
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                      >
                        Choose a different file
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
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
                      Supports PDF, PNG, JPG, JPEG, Scans • No file size limit
                    </p>
                  </div>
                )}
              </div>
            </div>

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
                disabled={!filePreview || isSubmitting}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
                  filePreview && !isSubmitting
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Attaching...' : 'Attach e-Stamp'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

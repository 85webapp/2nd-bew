/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Specialized Registration & Compliance Dossier View
 * Used for GST, ITR, Udyam MSME, and Insurance Leads
 */

import React, { useState } from 'react';
import { Order, RegistrationDocumentChecklist } from '../types';
import { 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  FileCheck, 
  Clock, 
  Send, 
  Save, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface RegistrationChecklistViewProps {
  order: Order;
  onUpdateOrder: (updatedOrder: Order) => void;
  onSendNotification: (message: string) => void;
}

export const RegistrationChecklistView: React.FC<RegistrationChecklistViewProps> = ({
  order,
  onUpdateOrder,
  onSendNotification
}) => {
  const regData = order.registrationData;
  const [officerNotes, setOfficerNotes] = useState(regData?.officerNotes || '');
  const [ackNumber, setAckNumber] = useState(regData?.filingAckNumber || '');
  const [checklist, setChecklist] = useState<RegistrationDocumentChecklist[]>(
    regData?.documentChecklist || []
  );

  if (!regData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Registration Dossier Found</h3>
      </div>
    );
  }

  const handleToggleUploaded = (id: string) => {
    const updated = checklist.map(doc => 
      doc.id === id ? { ...doc, uploaded: !doc.uploaded } : doc
    );
    setChecklist(updated);
    saveChanges(updated, officerNotes, ackNumber);
  };

  const handleToggleVerified = (id: string) => {
    const updated = checklist.map(doc => 
      doc.id === id ? { ...doc, verified: !doc.verified } : doc
    );
    setChecklist(updated);
    saveChanges(updated, officerNotes, ackNumber);
  };

  const saveChanges = (
    newChecklist = checklist, 
    newNotes = officerNotes, 
    newAck = ackNumber
  ) => {
    const allVerified = newChecklist.filter(d => d.required).every(d => d.verified);
    const updatedOrder: Order = {
      ...order,
      status: allVerified ? 'completed' : 'processing',
      registrationData: {
        ...regData,
        documentChecklist: newChecklist,
        officerNotes: newNotes,
        filingAckNumber: newAck
      },
      updatedAt: new Date().toISOString()
    };
    onUpdateOrder(updatedOrder);
  };

  const handleCompleteFiling = () => {
    const updatedOrder: Order = {
      ...order,
      status: 'completed',
      registrationData: {
        ...regData,
        officerNotes,
        filingAckNumber: ackNumber || `ACK-${Date.now()}`
      },
      updatedAt: new Date().toISOString()
    };
    onUpdateOrder(updatedOrder);
    onSendNotification(`✅ *COMPLIANCE DOSSIER COMPLETED*\n• Lead ID: ${order.id}\n• Client: ${regData.applicantName}\n• Service: ${regData.serviceTitle}\n• Ack/ARN: ${ackNumber || 'Generated'}`);
  };

  const verifiedCount = checklist.filter(d => d.verified).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Tax & Compliance Dossier
            </span>
            <span className="text-xs font-mono text-slate-500">
              ID: {order.id} • Ref: {order.referenceCode}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {regData.serviceTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Client: <strong className="text-slate-800">{regData.applicantName}</strong> • Phone: <strong className="text-slate-800">{regData.contactNumber}</strong> • Email: {regData.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-600">Verification Progress</div>
            <div className="text-base font-bold text-blue-600 font-mono">
              {verifiedCount} / {totalCount} Done ({progressPercent}%)
            </div>
          </div>
          <button
            onClick={handleCompleteFiling}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Compliant & File
          </button>
        </div>
      </div>

      {/* Grid: Client Details & Banking on Left, Checklist on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Applicant, Business & Banking Profile */}
        <div className="space-y-6">
          
          {/* Identity & Contact Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Applicant Identification
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-slate-500">Applicant Full Name:</span>
                <span className="font-semibold text-slate-900">{regData.applicantName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-slate-500">Income Tax PAN:</span>
                <span className="font-mono font-bold text-slate-900">{regData.panNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-slate-500">Aadhaar (UIDAI):</span>
                <span className="font-mono text-slate-900">{regData.aadhaarNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-slate-500">Registered Phone:</span>
                <span className="font-semibold text-slate-900">{regData.contactNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-slate-500">Email Address:</span>
                <span className="text-slate-900">{regData.email}</span>
              </div>
              {regData.taxYearOrAssessmentYear && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Assessment Period:</span>
                  <span className="font-semibold text-blue-600">{regData.taxYearOrAssessmentYear}</span>
                </div>
              )}
            </div>
          </div>

          {/* Business & Commercial Profile (if available) */}
          {(regData.businessName || regData.constitutionType || regData.businessAddress) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Commercial Entity Details
              </h3>
              <div className="space-y-2.5 text-xs">
                {regData.businessName && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-slate-500">Trade / Firm Name:</span>
                    <span className="font-semibold text-slate-900">{regData.businessName}</span>
                  </div>
                )}
                {regData.constitutionType && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-slate-500">Constitution:</span>
                    <span className="font-semibold text-slate-900">{regData.constitutionType}</span>
                  </div>
                )}
                {regData.annualTurnover && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-slate-500">Turnover / Declared:</span>
                    <span className="font-semibold text-slate-900">{regData.annualTurnover}</span>
                  </div>
                )}
                {regData.businessAddress && (
                  <div className="py-1">
                    <span className="text-slate-500 block mb-0.5">Principal Business Address:</span>
                    <span className="text-slate-800 leading-snug">{regData.businessAddress}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bank Mandate Details */}
          {regData.bankDetails && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Bank Mandate Verification
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-slate-500">Bank Name:</span>
                  <span className="font-semibold text-slate-900">{regData.bankDetails.bankName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-slate-500">Account No:</span>
                  <span className="font-mono font-bold text-slate-900">{regData.bankDetails.accountNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-slate-500">IFSC Code:</span>
                  <span className="font-mono font-bold text-blue-600">{regData.bankDetails.ifscCode}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Branch:</span>
                  <span className="text-slate-800">{regData.bankDetails.branch}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Col (2/3 width): Document Checklist & Officer Workbench */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Document Checklist Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Required KYC & Statutory Checklist</h3>
                <p className="text-xs text-slate-500">Click to verify documents received from Website A</p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {verifiedCount} of {totalCount} verified
              </span>
            </div>

            <div className="space-y-2.5">
              {checklist.map((doc) => (
                <div 
                  key={doc.id}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    doc.verified 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : doc.uploaded 
                        ? 'bg-blue-50/30 border-blue-200' 
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {doc.verified ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : doc.uploaded ? (
                        <Clock className="w-5 h-5 text-blue-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{doc.label}</span>
                        {doc.required && (
                          <span className="text-[10px] text-red-600 font-normal">*Mandatory</span>
                        )}
                      </div>
                      {doc.documentNumber && (
                        <div className="text-[11px] font-mono text-slate-500">
                          Doc Ref: {doc.documentNumber}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Status:{' '}
                        {doc.verified ? (
                          <span className="text-emerald-700 font-semibold">Verified by Officer</span>
                        ) : doc.uploaded ? (
                          <span className="text-blue-700 font-medium">Uploaded, Pending Verification</span>
                        ) : (
                          <span className="text-slate-400">Awaiting Upload from Client</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this document */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleUploaded(doc.id)}
                      className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                        doc.uploaded 
                          ? 'bg-white text-slate-700 border-gray-300 hover:bg-slate-50' 
                          : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {doc.uploaded ? 'Mark Absent' : 'Mark Uploaded'}
                    </button>
                    <button
                      onClick={() => handleToggleVerified(doc.id)}
                      className={`px-3 py-1 text-xs rounded-md font-semibold transition-all shadow-2xs ${
                        doc.verified 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                          : 'bg-white text-slate-700 border border-gray-300 hover:bg-slate-50'
                      }`}
                    >
                      {doc.verified ? 'Verified ✓' : 'Verify'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filing & Officer Notes Workbench */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Government Portal Filing & Notes</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Application Reference Number (ARN / Ack No.)
                </label>
                <input
                  type="text"
                  value={ackNumber}
                  onChange={(e) => setAckNumber(e.target.value)}
                  placeholder="e.g. ARN-AA271126001928G"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Processing Phase
                </label>
                <select 
                  value={order.status}
                  onChange={(e) => {
                    const updated = { ...order, status: e.target.value as any };
                    onUpdateOrder(updated);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="decrypted">Decrypted / Ingested</option>
                  <option value="processing">Processing / Under Review</option>
                  <option value="stamp_pending">Documents Pending</option>
                  <option value="completed">Completed / Acknowledged</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Compliance & Verification Remarks
              </label>
              <textarea
                rows={3}
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="Add internal notes regarding UIDAI OTP verification, NPCI bank validation, or client communications..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  saveChanges();
                  alert('Checklist and officer notes saved successfully!');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-gray-300 transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-slate-600" />
                Save Notes
              </button>

              <button
                onClick={() => {
                  onSendNotification(`📌 *DOSSIER UPDATE*\n• Client: ${regData.applicantName}\n• Service: ${regData.serviceTitle}\n• Status: ${order.status}\n• Note: ${officerNotes || 'No notes'}`);
                  alert('Telegram notification sent to operations stream!');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-blue-600" />
                Broadcast Update
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

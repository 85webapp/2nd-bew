/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Legal Document Rendering Engine
 * Standard Indian Legal Formats (A4 Print-Ready with e-Stamp Paper Integration)
 */

import React from 'react';
import { Order } from '../types';
import { LEGAL_TEMPLATES } from '../utils/templates';
import { Printer, Download, CheckCircle, Shield, Stamp, FileText, Share2 } from 'lucide-react';

interface DocumentRendererProps {
  order: Order;
  onEditRequest?: () => void;
  onUploadStampRequest?: () => void;
  hideRibbon?: boolean;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  order,
  onEditRequest,
  onUploadStampRequest,
  hideRibbon = false
}) => {
  const legalData = order.legalData;
  const stampData = order.stampData;
  const templateMeta = legalData?.documentType ? LEGAL_TEMPLATES[legalData.documentType] : undefined;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const docElement = document.getElementById('printable-legal-document');
    if (docElement) {
      navigator.clipboard.writeText(docElement.innerText);
      alert('Document text copied to clipboard!');
    }
  };

  if (!legalData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Legal Document Data Found</h3>
        <p className="text-sm text-slate-500 mt-1">
          This order does not contain legal document parameters.
        </p>
      </div>
    );
  }

  const party1 = legalData.party1;
  const party2 = legalData.party2;
  const prop = legalData.propertyDetails;
  const affidavit = legalData.affidavitDetails;
  const defaultFallbackClauses = [
    { id: 'c1', title: 'Terms & Undertakings', body: 'The parties agree that all conditions and covenants enumerated herein shall be strictly complied with.' },
    { id: 'c2', title: 'Dispute Jurisdiction', body: 'Any disputes arising out of this agreement shall be subject to the exclusive jurisdiction of the competent civil courts.' }
  ];
  const clauses = (legalData.clauses && legalData.clauses.length > 0) ? legalData.clauses : defaultFallbackClauses;
  const witnesses = legalData.witnesses || [
    { name: 'Witness 1: ______________', address: 'Address: ____________________' },
    { name: 'Witness 2: ______________', address: 'Address: ____________________' }
  ];

  return (
    <div className="space-y-4">
      {/* Top Action Ribbon (No-Print) */}
      {!hideRibbon && (
        <div className="no-print bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{order.formName}</span>
                {stampData?.verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    <CheckCircle className="w-3 h-3" /> e-Stamp Attached
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                    e-Stamp Pending
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Ref: <span className="font-mono">{order.id}</span> • Stamp Duty: ₹{order.stampDutyValue} • State: {legalData.state}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!stampData && onUploadStampRequest && (
              <button
                onClick={onUploadStampRequest}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors"
              >
                Attach e-Stamp
              </button>
            )}

            {onEditRequest && (
              <button
                onClick={onEditRequest}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-gray-200 transition-colors"
              >
                Edit Fields
              </button>
            )}

            <button
              onClick={handleCopyText}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-gray-200 transition-colors"
              title="Copy Raw Text"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 print-keep"
            >
              <Printer className="w-4 h-4" />
              Print A4 Document
            </button>
          </div>
        </div>
      )}

      {/* Main Printable Legal Document Container */}
      <div 
        id="printable-legal-document"
        className="print-only-container bg-white border border-gray-200 rounded-xl shadow-lg max-w-[850px] mx-auto p-6 sm:p-12 font-legal text-slate-900 leading-relaxed text-sm sm:text-[15px]"
      >
        {/* ===================== E-STAMP HEADER BLOCK ===================== */}
        {stampData ? (
          <div className="mb-8 border-2 border-slate-900 p-4 bg-amber-50/20 text-xs font-mono">
            {/* National Emblem & Title Header */}
            <div className="text-center border-b border-slate-800 pb-3 mb-3">
              <div className="text-[10px] tracking-widest uppercase font-bold text-slate-700">
                Government of National Capital Territory of {stampData.state}
              </div>
              <div className="text-lg font-black tracking-wider text-slate-950 uppercase mt-0.5">
                e-Stamp Certificate
              </div>
              <div className="text-[10px] text-slate-600 tracking-wider">
                CERTIFICATE NO: <span className="font-bold text-slate-900">{stampData.certificateNo}</span>
              </div>
            </div>

            {/* Grid of Stamp Values */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] mb-3">
              <div className="border-b border-slate-200 pb-1">
                <span className="text-slate-500">Certificate Issued Date:</span>
                <span className="font-bold text-slate-900 ml-2">{stampData.issueDate}</span>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <span className="text-slate-500">Account Reference:</span>
                <span className="font-bold text-slate-900 ml-2">NONACC (SV)/ dl1092804</span>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <span className="text-slate-500">Unique Doc. Reference:</span>
                <span className="font-bold text-slate-900 ml-2">{stampData.uin}</span>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <span className="text-slate-500">Purchased by:</span>
                <span className="font-bold text-slate-900 ml-2">{stampData.stampDutyPaidBy}</span>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <span className="text-slate-500">Description of Document:</span>
                <span className="font-bold text-slate-900 ml-2">{stampData.article}</span>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <span className="text-slate-500">First Party:</span>
                <span className="font-bold text-slate-900 ml-2">{stampData.firstParty}</span>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <span className="text-slate-500">Second Party:</span>
                <span className="font-bold text-slate-900 ml-2">{stampData.secondParty || 'N/A'}</span>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <span className="text-slate-500">Stamp Duty Amount:</span>
                <span className="font-black text-slate-950 ml-2 text-xs">₹ {stampData.stampDutyAmount}/- (INR)</span>
              </div>
            </div>

            {/* Security Barcode & Statutory Notice */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[9px] text-slate-600">
              <div className="tracking-widest">
                ||| | ||||| |||| ||| ||||||| ||| |||| ||||| ||||||
                <div className="text-[8px] text-slate-500 mt-0.5">UIN: {stampData.uin}</div>
              </div>
              <div className="text-right italic">
                Statutory Alert: The authenticity of this Stamp Certificate should be verified at www.shcilestamp.com
              </div>
            </div>
          </div>
        ) : (
          <div className="no-print mb-8 p-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 text-amber-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stamp className="w-4 h-4 text-amber-600" />
              <span>Non-Judicial Stamp Paper pending. Document will print with blank header reservation.</span>
            </div>
            {onUploadStampRequest && (
              <button
                onClick={onUploadStampRequest}
                className="font-bold underline hover:text-amber-950"
              >
                Upload e-Stamp Now
              </button>
            )}
          </div>
        )}

        {/* ===================== DOCUMENT TITLE ===================== */}
        <div className="text-center my-6">
          <div className="inline-block border-y-2 border-slate-900 py-1.5 px-6">
            <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-950">
              {legalData.documentTitle || order.formName}
            </h2>
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mt-2">
            Executed at {legalData.executionPlace}, {legalData.state} on {legalData.executionDate}
          </div>
        </div>

        {/* ===================== PREAMBLE & PARTIES ===================== */}
        <div className="space-y-4 text-justify">
          <p>
            <strong>THIS {legalData.documentTitle.includes('AFFIDAVIT') ? 'AFFIDAVIT' : 'DEED / AGREEMENT'}</strong> is made and entered into at <strong>{legalData.executionPlace}</strong> on this <strong>{legalData.executionDate}</strong>, by and between:
          </p>

          {/* Party 1 */}
          <div className="pl-4 border-l-2 border-slate-400 py-1">
            <p>
              <strong>{party1.fullName}</strong>
              {party1.relativeName && (
                <>, {party1.relationshipType || 'S/o'} {party1.relativeName}</>
              )}
              {party1.age && <>, aged about {party1.age} years</>}
              {party1.pan && <>, bearing PAN: <strong>{party1.pan}</strong></>}
              {party1.aadhaarLast4 && <>, Aadhaar No. ending with: <strong>XXXX-XXXX-{party1.aadhaarLast4}</strong></>}
              , permanently residing at <em>{party1.address}</em> (hereinafter referred to as the <strong>"FIRST PARTY"</strong>, which expression shall unless repugnant to the context include their legal heirs, executors, administrators, and assigns);
            </p>
          </div>

          {/* Party 2 (if present) */}
          {party2 && (
            <>
              <div className="text-center font-bold tracking-wider text-xs uppercase text-slate-600">
                — AND —
              </div>
              <div className="pl-4 border-l-2 border-slate-400 py-1">
                <p>
                  <strong>{party2.fullName}</strong>
                  {party2.relativeName && (
                    <>, {party2.relationshipType || 'S/o'} {party2.relativeName}</>
                  )}
                  {party2.age && <>, aged about {party2.age} years</>}
                  {party2.pan && <>, bearing PAN: <strong>{party2.pan}</strong></>}
                  {party2.aadhaarLast4 && <>, Aadhaar No. ending with: <strong>XXXX-XXXX-{party2.aadhaarLast4}</strong></>}
                  , permanently residing at <em>{party2.address}</em> (hereinafter referred to as the <strong>"SECOND PARTY"</strong>, which expression shall include their permitted successors and assigns).
                </p>
              </div>
            </>
          )}

          {/* WHEREAS RECITALS */}
          <div className="pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1">
              WHEREAS:
            </h4>
            {prop ? (
              <p>
                A. The First Party is the lawful owner and in physical possession of the immovable property situated at <strong>{prop.fullAddress}</strong> ({prop.premisesType || 'Premises'}).<br />
                B. The Second Party has approached the First Party with a request to take the said premises on lease/tenancy for bona fide residential purposes.<br />
                C. Both parties have mutually agreed upon the monthly rent, security deposit, and covenants as recorded hereinafter.
              </p>
            ) : affidavit ? (
              <div className="space-y-1.5">
                <p>That the deponent makes this sworn affirmation for the specific reason: <strong>{affidavit.reasonForAffidavit || 'General Legal Verification'}</strong>.</p>
                {affidavit.declarationStatements?.map((stmt, idx) => (
                  <p key={idx}><strong>({idx + 1})</strong> {stmt}</p>
                ))}
              </div>
            ) : (
              <p>
                The parties hereto are desirous of recording their mutual covenants, warranties, and obligations in writing under these presents.
              </p>
            )}
          </div>

          {/* NOW THIS INDENTURE WITNESSETH */}
          <div className="pt-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-300 pb-1">
              NOW THEREFORE THIS AGREEMENT WITNESSETH AND IT IS HEREBY MUTUALLY AGREED BY AND BETWEEN THE PARTIES AS UNDER:
            </h4>

            {/* Financial & Property Terms Summary (if applicable) */}
            {prop && (
              <div className="mb-4 bg-slate-50 p-3 rounded-sm border border-slate-200 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div>
                    <span className="text-slate-500 block">Monthly Rent:</span>
                    <strong className="text-slate-900">₹ {prop.monthlyRentOrConsideration}/-</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Security Deposit:</span>
                    <strong className="text-slate-900">₹ {prop.securityDeposit}/-</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duration:</span>
                    <strong className="text-slate-900">{prop.agreementDurationMonths || 11} Months</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Notice Period:</span>
                    <strong className="text-slate-900">{prop.noticePeriodDays || 30} Days</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Numbered Legal Clauses */}
            <div className="space-y-3">
              {clauses.map((clause, index) => (
                <div key={clause.id || index} className="text-justify">
                  <span className="font-bold">{index + 1}. {clause.title}: </span>
                  <span>{clause.body}</span>
                </div>
              ))}
            </div>

            {/* Jurisdiction Clause */}
            <div className="pt-3">
              <span className="font-bold">{clauses.length + 1}. Jurisdiction & Governing Law: </span>
              <span>
                This deed shall be governed by and construed in accordance with the substantive laws of India, and the Civil Courts at <strong>{legalData.executionPlace}, {legalData.state}</strong> shall have exclusive jurisdiction over any disputes arising hereunder.
              </span>
            </div>
          </div>

          {/* IN WITNESS WHEREOF */}
          <div className="pt-6">
            <p>
              <strong>IN WITNESS WHEREOF</strong>, the parties hereto have set their hands and signed this instrument on the day, month, and year first written above in the presence of the following witnesses:
            </p>
          </div>

          {/* Signature Blocks */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center">
            <div className="border-t border-slate-800 pt-2">
              <div className="font-bold text-slate-900">{party1.fullName}</div>
              <div className="text-xs text-slate-500 uppercase">First Party / Deponent</div>
              {order.esignStatus?.party1Signed && (
                <div className="mt-1 text-[10px] text-emerald-600 font-mono flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> Digitally Signed (Aadhaar OTP)
                </div>
              )}
            </div>

            {party2 ? (
              <div className="border-t border-slate-800 pt-2">
                <div className="font-bold text-slate-900">{party2.fullName}</div>
                <div className="text-xs text-slate-500 uppercase">Second Party</div>
                {order.esignStatus?.party2Signed && (
                  <div className="mt-1 text-[10px] text-emerald-600 font-mono flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> Digitally Signed (Aadhaar OTP)
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-slate-800 pt-2">
                <div className="font-bold text-slate-900">NOTARY PUBLIC / ATTESTATION</div>
                <div className="text-xs text-slate-500 uppercase">Seal & Registration Number</div>
              </div>
            )}
          </div>

          {/* Witnesses Block */}
          <div className="pt-8">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3">
              Witnesses to Signatures:
            </div>
            <div className="grid grid-cols-2 gap-6 text-xs text-slate-700">
              {witnesses.map((w, idx) => (
                <div key={idx} className="border-b border-dotted border-slate-400 pb-2">
                  <p className="font-bold">1. {w.name}</p>
                  <p className="text-[11px] text-slate-500">{w.address}</p>
                  {w.phone && <p className="text-[10px] text-slate-400">Phone: {w.phone}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Digital e-Sign Audit Trail (if signed) */}
          {order.esignStatus?.certificateHash && (
            <div className="mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <div>
                <span>AUTHENTICATION HASH: </span>
                <span className="font-bold text-slate-700">{order.esignStatus.certificateHash}</span>
              </div>
              <div>
                <span>PROVIDER: {order.esignStatus.provider}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

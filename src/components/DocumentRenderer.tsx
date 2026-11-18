/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Multi-Page A4 Legal Document Rendering & e-Stamp Overlay Engine
 * - Paginates legal documents dynamically across exact A4 pages (794x1123px / 210x297mm)
 * - In Standard Format mode: renders clean multi-page A4 sheets (Page 1 of N, Page 2 of N...)
 * - In e-Stamp Overlaid mode: places Page 1 content directly inside the uploaded e-Stamp
 *   paper's detected blank area (below the printed header & notice line) and shifts
 *   remaining clauses onto continuation A4 pages automatically.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Order } from '../types';
import { LEGAL_TEMPLATES, STATUTORY_FORMAT_TEMPLATES } from '../utils/templates';
import { extractCompleteOrderInspection } from '../utils/formFieldExtractor';
import { Printer, Download, CheckCircle, Shield, Stamp, FileText, Layers } from 'lucide-react';

interface DocumentRendererProps {
  order: Order;
  onEditRequest?: () => void;
  onUploadStampRequest?: () => void;
  hideRibbon?: boolean;
  showEStampOverlay?: boolean;
}

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const A4_SIDE_PADDING_PX = 52;
const A4_CONTENT_WIDTH_PX = A4_WIDTH_PX - A4_SIDE_PADDING_PX * 2; // 690px
const STANDARD_USABLE_HEIGHT_PX = 995; // 1123 - top/bottom margins & footer

class DocumentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || 'Document rendering error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-2xl mx-auto space-y-2">
          <h3 className="text-base font-bold text-red-700">Unable to Render Document Preview</h3>
          <p className="text-xs text-slate-600">{this.state.errorMsg}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function normalizeDedupKey(str: string): string {
  return String(str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeDedupValue(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .toLowerCase()
    .replace(/₹|rs\.?|inr|\/-/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  order,
  onEditRequest,
  onUploadStampRequest,
  hideRibbon = false,
  showEStampOverlay = false
}) => {
  const stampData = order.stampData;
  const uploadedStampImage = stampData?.scanUrl || stampData?.eStampPaperUrl || '';
  const hasUploadedStamp = Boolean(stampData?.verified && uploadedStampImage);

  // Build resilient legalData even if order came with flat rawPayload fields
  const raw = (order.rawPayload && typeof order.rawPayload === 'object') ? order.rawPayload : {};
  const legalData = useMemo(() => {
    if (order.legalData) return order.legalData;
    return {
      documentType: order.formType || 'custom_document',
      documentTitle: order.formName || 'Legal Agreement',
      stampDutyAmount: order.stampDutyValue || 500,
      state: order.state || raw.state || 'Delhi',
      executionDate: raw.executionDate || new Date().toISOString().split('T')[0],
      executionPlace: raw.executionPlace || order.state || 'New Delhi',
      party1: raw.party1 || {
        fullName: order.clientName || 'First Party',
        phone: order.clientPhone || '',
        email: order.clientEmail || '',
        address: raw.address || ''
      },
      party2: raw.party2,
      propertyDetails: raw.propertyDetails,
      affidavitDetails: raw.affidavitDetails,
      clauses: raw.clauses,
      witnesses: raw.witnesses
    };
  }, [order, raw]);

  const templateMeta = legalData?.documentType ? LEGAL_TEMPLATES[legalData.documentType] : undefined;
  const formatTemplateMeta = STATUTORY_FORMAT_TEMPLATES.find(
    (f) => f.id === legalData?.documentType || f.id === order.formType
  );

  const party1 = legalData.party1 || { fullName: order.clientName || 'First Party', phone: order.clientPhone || '', email: order.clientEmail || '', address: '' };
  const party2 = legalData.party2;
  const prop = legalData.propertyDetails;
  const affidavit = legalData.affidavitDetails;

  const defaultFallbackClauses = formatTemplateMeta?.mandatoryClauses?.length
    ? formatTemplateMeta.mandatoryClauses.map((c: string, idx: number) => ({
        id: `tpl-${idx}`,
        title: c,
        body: `Both parties hereby agree and undertake to comply with all covenants, terms, and statutory obligations relating to ${c.toLowerCase()} in accordance with ${formatTemplateMeta.actReference || templateMeta?.article || 'applicable Indian law'}.`
      }))
    : [
        { id: 'c1', title: 'Terms & Undertakings', body: 'The parties agree that all conditions and covenants enumerated herein shall be strictly complied with during the subsistence of this instrument.' },
        { id: 'c2', title: 'Consideration & Payment Obligations', body: `The consideration, monthly rent, security deposit, and applicable stamp duty of ₹${order.stampDutyValue}/- shall be honored as mutually settled between the parties.` },
        { id: 'c3', title: 'Peaceful Possession & Non-Interference', body: 'The Second Party shall observe all residential/commercial rules and maintain the premises/subject matter in good condition without unauthorized alterations or subletting.' },
        { id: 'c4', title: 'Termination & Notice Period', body: 'Either party may terminate this arrangement by serving prior written notice as stipulated herein, subject to settlement of all outstanding dues.' },
        { id: 'c5', title: 'Dispute Jurisdiction', body: 'Any disputes arising out of this agreement shall be subject to the exclusive jurisdiction of the competent civil courts.' }
      ];

  const clauses = (legalData.clauses && legalData.clauses.length > 0) ? legalData.clauses : defaultFallbackClauses;
  const witnesses = (legalData.witnesses && legalData.witnesses.length > 0)
    ? legalData.witnesses
    : [
        { name: 'Witness 1: ____________________', address: 'Address: __________________________' },
        { name: 'Witness 2: ____________________', address: 'Address: __________________________' }
      ];

  const inspection = useMemo(() => extractCompleteOrderInspection(order), [order]);

  const rawFormData = (raw.formData && typeof raw.formData === 'object')
    ? raw.formData
    : (raw.fields && typeof raw.fields === 'object')
      ? raw.fields
      : (raw.answers && typeof raw.answers === 'object')
        ? raw.answers
        : {};

  const pickVal = (...candidates: any[]): string => {
    for (const c of candidates) {
      if (c !== undefined && c !== null) {
        const s = String(c).trim();
        if (s !== '' && s !== 'Not Provided' && s !== 'undefined' && s !== 'null') return s;
      }
    }
    return '';
  };

  const p1Any = party1 as any;
  const p2Any = party2 as any;
  const propAny = prop as any;

  const p1Email = pickVal(p1Any.email, order.clientEmail, raw.clientEmail, raw.email, raw.landlordEmail, rawFormData.email, rawFormData.clientEmail);
  const p1EntityType = pickVal(p1Any.entityType, raw.landlordEntityType, raw.firstPartyEntityType, rawFormData.entityType);
  const p1Aadhaar = pickVal(p1Any.aadhaar, p1Any.aadhaarNumber, p1Any.aadhaarLast4, raw.landlordAadhaar, rawFormData.aadhaar);
  const p1Pincode = pickVal(p1Any.pincode, raw.landlordPincode, rawFormData.pincode);
  const p1SignedByPoa = Boolean(p1Any.signedByPoa ?? raw.signedByPoa ?? rawFormData.signedByPoa);
  const p1PoaHolder = pickVal(p1Any.poaHolderName, raw.poaHolderName, raw.poaDetails, rawFormData.poaHolderName);
  const p1OwnershipProof = pickVal(p1Any.propertyOwnershipProofType, raw.propertyOwnershipProofType, raw.proofOfPropertyOwnerType, raw.ownershipProofType, rawFormData.propertyOwnershipProofType);

  const p2Email = pickVal(p2Any?.email, raw.tenantEmail, rawFormData.tenantEmail);
  const p2EntityType = pickVal(p2Any?.entityType, raw.lesseeEntityType, raw.secondPartyEntityType);
  const p2Aadhaar = pickVal(p2Any?.aadhaar, p2Any?.aadhaarNumber, p2Any?.aadhaarLast4, raw.tenantAadhaar);
  const p2Pincode = pickVal(p2Any?.pincode, raw.tenantPincode);
  const rawOccupants = p2Any?.occupantDetails ?? raw.occupantDetails ?? raw.familyMemberDetails ?? raw.occupants ?? rawFormData.occupantDetails;
  const formattedOccupants = useMemo(() => {
    if (!rawOccupants) return '';
    if (typeof rawOccupants === 'string') return rawOccupants.trim();
    if (Array.isArray(rawOccupants)) {
      return rawOccupants
        .map((occ: any, idx: number) => {
          if (typeof occ === 'string') return occ;
          if (occ && typeof occ === 'object') {
            const parts = [occ.name || occ.fullName || `Occupant ${idx + 1}`];
            if (occ.relationship || occ.relation) parts.push(`(${occ.relationship || occ.relation})`);
            if (occ.age) parts.push(`Age: ${occ.age}`);
            if (occ.idNumber || occ.aadhaar) parts.push(`ID: ${occ.idNumber || occ.aadhaar}`);
            return parts.join(' ');
          }
          return '';
        })
        .filter(Boolean)
        .join('; ');
    }
    if (typeof rawOccupants === 'object') {
      return Object.entries(rawOccupants)
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    return String(rawOccupants);
  }, [rawOccupants]);

  const leaseCommencementDate = pickVal(propAny?.leaseCommencementDate, raw.leaseCommencementDate, raw.commencementDate, raw.startDate, rawFormData.leaseCommencementDate);
  const leaseEndDate = pickVal(propAny?.leaseEndDate, raw.leaseEndDate, raw.expiryDate, raw.endDate, rawFormData.leaseEndDate);
  const leaseTenure = pickVal(propAny?.leaseTenure, propAny?.agreementDurationMonths ? `${propAny.agreementDurationMonths} Months` : '', raw.leaseTenure, raw.leaseDuration);
  const maintenanceCharges = pickVal(propAny?.maintenanceCharges, raw.maintenanceCharges, raw.monthlyMaintenance, rawFormData.maintenanceCharges);
  const purposeOfTenancy = pickVal(raw.purposeOfTenancy, raw.specificPurpose, raw.tenancyPurpose, raw.purpose, rawFormData.purposeOfTenancy);
  const documentCategory = pickVal(raw.documentCategory, raw.rentCategory, raw.leaseCategory, rawFormData.documentCategory, prop?.premisesType);
  const stampPaperMode = pickVal(raw.stampPaperMode, raw.stampProcurementMode, raw.procurementMode, rawFormData.stampPaperMode);
  const stampDutyPaidBy = pickVal(order.stampDutyPaidBy, raw.stampDutyPaidBy, order.stampData?.stampDutyPaidBy, rawFormData.stampDutyPaidBy);

  // Responsive scale so 794px A4 sheets fit gracefully on any screen without horizontal scrolling
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const avail = containerRef.current.clientWidth;
      if (avail > 0 && avail < A4_WIDTH_PX) {
        setScale(avail / A4_WIDTH_PX);
      } else {
        setScale(1);
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Build atomic blocks so pagination can shift/flow cleanly between Page 1 (e-Stamp) and Page 2..N
  const blocks = useMemo(() => {
    const list: Array<{ id: string; node: React.ReactNode }> = [];

    list.push({
      id: 'title',
      node: (
        <div className="text-center pb-3">
          <div className="inline-block border-y-2 border-slate-900 py-1 px-6">
            <h2 className="text-base font-black tracking-wider uppercase text-slate-950">
              {legalData.documentTitle || order.formName}
            </h2>
          </div>
          <div className="text-[11px] text-slate-600 uppercase tracking-widest mt-1.5">
            {documentCategory ? `${documentCategory} • ` : ''}
            Executed at {legalData.executionPlace || legalData.state || 'New Delhi'}, {legalData.state || 'Delhi'} on {legalData.executionDate || new Date().toISOString().split('T')[0]}
          </div>
          {(stampPaperMode || stampDutyPaidBy || purposeOfTenancy) && (
            <div className="text-[10.5px] text-slate-700 mt-1">
              {purposeOfTenancy ? <>Purpose: <strong>{purposeOfTenancy}</strong></> : null}
              {purposeOfTenancy && (stampPaperMode || stampDutyPaidBy) ? ' • ' : ''}
              {stampPaperMode ? <>Stamp Mode: <strong>{stampPaperMode}</strong></> : null}
              {stampPaperMode && stampDutyPaidBy ? ' • ' : ''}
              {stampDutyPaidBy ? <>Stamp Duty Paid By: <strong>{stampDutyPaidBy}</strong></> : null}
            </div>
          )}
        </div>
      )
    });

    list.push({
      id: 'preamble',
      node: (
        <p className="text-justify pb-3">
          <strong>THIS {(legalData.documentTitle || order.formName || '').toUpperCase().includes('AFFIDAVIT') ? 'AFFIDAVIT' : 'DEED / AGREEMENT'}</strong> is made and entered into at <strong>{legalData.executionPlace || legalData.state || 'New Delhi'}</strong> ({legalData.state || 'Delhi'}) on this <strong>{legalData.executionDate || new Date().toISOString().split('T')[0]}</strong> (Stamp Duty: <strong>₹{order.stampDutyValue || legalData.stampDutyAmount || 0}/-</strong>{stampDutyPaidBy ? `, borne by ${stampDutyPaidBy}` : ''}), by and between:
        </p>
      )
    });

    list.push({
      id: 'party1',
      node: (
        <div className="pl-3.5 border-l-2 border-slate-500 py-0.5 mb-2.5 text-justify">
          <p>
            <strong>{party1.fullName}</strong>
            {p1EntityType && <> ({p1EntityType})</>}
            {party1.relativeName && (
              <>, {party1.relationshipType || 'S/o'} {party1.relativeName}</>
            )}
            {party1.age && <>, aged about {party1.age} years</>}
            {party1.pan && <>, bearing PAN: <strong>{party1.pan}</strong></>}
            {p1Aadhaar && <>, Aadhaar No.: <strong>{p1Aadhaar.length <= 4 ? `XXXX-XXXX-${p1Aadhaar}` : p1Aadhaar}</strong></>}
            {party1.phone && <>, Mobile: <strong>{party1.phone}</strong></>}
            {p1Email && <>, Email ID: <strong>{p1Email}</strong></>}
            {party1.address ? <>, permanently residing at <em>{party1.address}{p1Pincode && !String(party1.address).includes(p1Pincode) ? ` — PIN: ${p1Pincode}` : ''}</em></> : null}
            {(p1SignedByPoa || p1PoaHolder) && (
              <>, acting through Power of Attorney (POA) Holder: <strong>{p1PoaHolder || 'Authorized POA Holder'}</strong></>
            )}
            {p1OwnershipProof && (
              <>, Property Ownership Proof: <strong>{p1OwnershipProof}</strong></>
            )}{' '}
            (hereinafter referred to as the <strong>&quot;FIRST PARTY&quot;</strong>, which expression shall unless repugnant to the context include their legal heirs, executors, administrators, and assigns);
          </p>
        </div>
      )
    });

    if (party2) {
      list.push({
        id: 'party2',
        node: (
          <div className="space-y-1.5 mb-3">
            <div className="text-center font-bold tracking-wider text-xs uppercase text-slate-600">
              — AND —
            </div>
            <div className="pl-3.5 border-l-2 border-slate-500 py-0.5 text-justify">
              <p>
                <strong>{party2.fullName}</strong>
                {p2EntityType && <> ({p2EntityType})</>}
                {party2.relativeName && (
                  <>, {party2.relationshipType || 'S/o'} {party2.relativeName}</>
                )}
                {party2.age && <>, aged about {party2.age} years</>}
                {party2.pan && <>, bearing PAN: <strong>{party2.pan}</strong></>}
                {p2Aadhaar && <>, Aadhaar No.: <strong>{p2Aadhaar.length <= 4 ? `XXXX-XXXX-${p2Aadhaar}` : p2Aadhaar}</strong></>}
                {party2.phone && <>, Mobile: <strong>{party2.phone}</strong></>}
                {p2Email && <>, Email ID: <strong>{p2Email}</strong></>}
                {party2.address ? <>, permanently residing at <em>{party2.address}{p2Pincode && !String(party2.address).includes(p2Pincode) ? ` — PIN: ${p2Pincode}` : ''}</em></> : null}
                {formattedOccupants ? <>, Permitted Occupants / Family Members: <strong>{formattedOccupants}</strong></> : null}{' '}
                (hereinafter referred to as the <strong>&quot;SECOND PARTY&quot;</strong>, which expression shall include their permitted successors and assigns).
              </p>
            </div>
          </div>
        )
      });
    }

    list.push({
      id: 'recitals',
      node: (
        <div className="pb-3 text-justify">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1">
            WHEREAS:
          </h4>
          {prop ? (
            <p>
              A. The First Party is the lawful owner{p1OwnershipProof ? ` (evidenced by ${p1OwnershipProof})` : ''} and in physical possession of the immovable property situated at <strong>{prop.fullAddress}</strong> ({prop.premisesType || documentCategory || 'Premises'}).<br />
              B. The Second Party has approached the First Party with a request to take the said premises on lease/tenancy{purposeOfTenancy ? ` specifically for ${purposeOfTenancy}` : ' for bona fide purposes'}{leaseCommencementDate ? `, commencing from ${leaseCommencementDate}` : ''}{leaseEndDate ? ` until ${leaseEndDate}` : ''}.<br />
              C. Both parties have mutually agreed upon the monthly rent, security deposit, maintenance, utilities, tenure, and covenants as recorded hereinafter.
            </p>
          ) : affidavit ? (
            <div className="space-y-1">
              <p>
                {affidavit.deponentName ? <>Deponent: <strong>{affidavit.deponentName}</strong>. </> : null}
                That the deponent makes this sworn affirmation for the specific reason: <strong>{affidavit.reasonForAffidavit || 'General Legal Verification'}</strong>.
                {affidavit.oldName || affidavit.newName ? <> Former Name: <strong>{affidavit.oldName || '—'}</strong>; New / Corrected Name: <strong>{affidavit.newName || '—'}</strong>.</> : null}
                {affidavit.gapDuration ? <> Gap Duration: <strong>{affidavit.gapDuration}</strong>.</> : null}
                {affidavit.educationalInstitution ? <> Educational Institution: <strong>{affidavit.educationalInstitution}</strong>.</> : null}
              </p>
              {affidavit.declarationStatements?.map((stmt: string, idx: number) => (
                <p key={idx}><strong>({idx + 1})</strong> {stmt}</p>
              ))}
            </div>
          ) : (
            <p>
              The parties hereto are desirous of recording their mutual covenants, warranties, and obligations in writing under these presents.
            </p>
          )}
        </div>
      )
    });

    list.push({
      id: 'witnesseth_header',
      node: (
        <div className="pb-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-300 pb-1">
            NOW THEREFORE THIS AGREEMENT WITNESSETH AND IT IS HEREBY MUTUALLY AGREED AS UNDER:
          </h4>
          {prop && (
            <div className="mb-2 bg-slate-50/90 p-2.5 rounded border border-slate-200 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div>
                  <span className="text-slate-500 block">Monthly Rent:</span>
                  <strong className="text-slate-900">₹ {prop.monthlyRentOrConsideration || '—'}/-</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Security Deposit:</span>
                  <strong className="text-slate-900">₹ {prop.securityDeposit || '—'}/-</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Duration:</span>
                  <strong className="text-slate-900">{leaseTenure || `${prop.agreementDurationMonths || 11} Months`}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Notice Period:</span>
                  <strong className="text-slate-900">{prop.noticePeriodDays || 30} Days</strong>
                </div>
                {leaseCommencementDate && (
                  <div>
                    <span className="text-slate-500 block">Start Date:</span>
                    <strong className="text-slate-900">{leaseCommencementDate}</strong>
                  </div>
                )}
                {leaseEndDate && (
                  <div>
                    <span className="text-slate-500 block">End Date:</span>
                    <strong className="text-slate-900">{leaseEndDate}</strong>
                  </div>
                )}
                {maintenanceCharges && (
                  <div>
                    <span className="text-slate-500 block">Maintenance:</span>
                    <strong className="text-slate-900">{maintenanceCharges}</strong>
                  </div>
                )}
                {prop.lockInPeriodMonths !== undefined && prop.lockInPeriodMonths !== '' && (
                  <div>
                    <span className="text-slate-500 block">Lock-In Period:</span>
                    <strong className="text-slate-900">{prop.lockInPeriodMonths} Months</strong>
                  </div>
                )}
                {prop.utilityChargesBorneBy && (
                  <div>
                    <span className="text-slate-500 block">Utilities Borne By:</span>
                    <strong className="text-slate-900">{prop.utilityChargesBorneBy}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )
    });

    clauses.forEach((clause: any, index: number) => {
      list.push({
        id: `clause-${clause.id || index}`,
        node: (
          <div className="pb-2.5 text-justify">
            <span className="font-bold">{index + 1}. {clause.title}: </span>
            <span>{clause.body}</span>
          </div>
        )
      });
    });

    // Embed Selected / Ticked Checkboxes & Declarations if submitted
    if (inspection.checkboxes.length > 0) {
      list.push({
        id: 'submitted_checkboxes_schedule',
        node: (
          <div className="pb-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-1.5 border-b border-slate-300 pb-0.5">
              Confirmed Declarations, Amenities &amp; Submitted Options:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] bg-slate-50/80 p-2.5 rounded border border-slate-200">
              {inspection.checkboxes.map((cb, idx) => (
                <div key={`${cb.key}-${idx}`} className="flex items-start gap-1.5">
                  <span className="font-mono font-bold text-slate-900">{cb.checked ? '[✓]' : '[ ]'}</span>
                  <span className={cb.checked ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
                    {cb.label} <span className="text-[10px]">({cb.checked ? 'Confirmed' : 'Not Selected'})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      });
    }

    // Embed ALL Additional / Custom & Remaining Unique Submitted Form Particulars (Zero Duplicates!)
    const renderedCoreKeysNorm = new Set([
      'documentcategory', 'rentcategory', 'leasecategory', 'agreementcategory', 'state', 'stateut',
      'stateorut', 'unionterritory', 'jurisdictionstate', 'purposeoftenancy', 'specificpurpose',
      'tenancypurpose', 'purpose', 'stamppapermode', 'stampprocurementmode', 'procurementmode',
      'stamppapervalue', 'stampdutyvalue', 'stampdutyamount', 'stampvalue', 'stampdutypaidby',
      'stamppaidby', 'costpaidby', 'executiondate', 'agreementdate', 'executionplace',
      'placeofexecution', 'city', 'landlordentitytype', 'lessorentitytype', 'firstpartyentitytype',
      'party1entitytype', 'party1fullname', 'landlordname', 'lessorname', 'firstpartyname',
      'firstparty', 'clientname', 'applicantname', 'party1relativename', 'landlordfathername',
      'lessorfathername', 'party1age', 'landlordage', 'party1address', 'landlordaddress',
      'lessoraddress', 'party1phone', 'landlordphone', 'landlordmobile', 'clientphone',
      'party1email', 'landlordemail', 'lessoremail', 'clientemail', 'party1aadhaar',
      'landlordaadhaar', 'party1pan', 'landlordpan', 'party1pincode', 'landlordpincode',
      'party1poa', 'signedbypoa', 'party1poaholdername', 'poaholdername', 'poadetails',
      'propertyownershipprooftype', 'proofofpropertyownertype', 'ownershipprooftype',
      'lesseeentitytype', 'tenantentitytype', 'secondpartyentitytype', 'party2entitytype',
      'party2fullname', 'tenantname', 'lesseename', 'secondpartyname', 'secondparty',
      'party2relativename', 'tenantfathername', 'party2age', 'tenantage', 'party2address',
      'tenantaddress', 'lesseeaddress', 'party2phone', 'tenantphone', 'tenantmobile',
      'party2email', 'tenantemail', 'lesseeemail', 'party2aadhaar', 'tenantaadhaar',
      'party2pan', 'tenantpan', 'party2pincode', 'tenantpincode', 'occupantdetails',
      'familymemberdetails', 'occupants', 'rentedpropertyaddress', 'propertyaddress',
      'premisesaddress', 'premisestype', 'propertytype', 'leasetenure', 'leaseduration',
      'agreementdurationmonths', 'durationmonths', 'tenure', 'leasecommencementdate',
      'commencementdate', 'startdate', 'leaseenddate', 'expirydate', 'enddate',
      'monthlyrent', 'monthlyrentorconsideration', 'rentamount', 'rent', 'securitydeposit',
      'depositamount', 'deposit', 'maintenancecharges', 'monthlymaintenance', 'lockinperiodmonths',
      'lockinperiod', 'noticeperioddays', 'noticeperiod', 'utilitychargesborneby',
      'electricitywatercharges', 'deponentname', 'reasonforaffidavit', 'oldname', 'newname',
      'gapduration', 'educationalinstitution', 'declarationstatements',
      'id', 'orderid', 'docketid', 'referencecode', 'formname', 'formtype', 'documenttitle',
      'documenttype', 'category', 'subcategory', 'status', 'source', 'createdat', 'updatedat',
      'receivedat', 'hmacverified', 'isdecrypted', 'signatureverified'
    ]);

    // Track every core value already printed in the agreement body above so Website A's repeated values never duplicate
    const renderedValuesNorm = new Set<string>();
    [
      order.id, order.referenceCode, order.formName, legalData.documentTitle,
      legalData.state, legalData.executionDate, legalData.executionPlace,
      order.stampDutyValue, legalData.stampDutyAmount, documentCategory,
      purposeOfTenancy, stampPaperMode, stampDutyPaidBy,
      party1.fullName, p1EntityType, party1.relativeName, party1.age, party1.pan,
      p1Aadhaar, party1.phone, order.clientPhone, p1Email, order.clientEmail,
      party1.address, p1Pincode, p1PoaHolder, p1OwnershipProof,
      party2?.fullName, p2EntityType, party2?.relativeName, party2?.age, party2?.pan,
      p2Aadhaar, party2?.phone, p2Email, party2?.address, p2Pincode, formattedOccupants,
      prop?.fullAddress, prop?.premisesType, prop?.monthlyRentOrConsideration,
      prop?.securityDeposit, prop?.agreementDurationMonths, leaseTenure,
      leaseCommencementDate, leaseEndDate, maintenanceCharges,
      prop?.lockInPeriodMonths, prop?.noticePeriodDays, prop?.utilityChargesBorneBy,
      affidavit?.deponentName, affidavit?.reasonForAffidavit, affidavit?.oldName,
      affidavit?.newName, affidavit?.gapDuration, affidavit?.educationalInstitution
    ].forEach((val) => {
      const nv = normalizeDedupValue(val);
      if (nv && nv.length >= 2) {
        renderedValuesNorm.add(nv);
      }
    });

    const seenScheduleLabels = new Set<string>();
    const seenScheduleValuePairs = new Set<string>();
    const extraSubmittedEntries: Array<{ id: string; label: string; value: string }> = [];

    for (const sec of inspection.sections) {
      for (const f of sec.fields) {
        if (f.isEmpty) continue;
        const nk = normalizeDedupKey(f.key);
        const nl = normalizeDedupKey(f.label);
        if (order.category !== 'registration' && renderedCoreKeysNorm.has(nk)) continue;

        const rawStr = typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value);
        // Never print huge base64 strings inside document text
        if (rawStr.startsWith('data:') && rawStr.includes(';base64,')) continue;

        const nv = normalizeDedupValue(rawStr);
        if (!nv || nv === 'not provided' || nv === 'na' || nv === '—') continue;

        // Skip values already printed verbatim in Header / Party 1 / Party 2 / Property Schedule
        if (order.category !== 'registration' && renderedValuesNorm.has(nv)) continue;

        // Prevent duplicate rows inside the extra schedule itself
        if (seenScheduleLabels.has(nl) || seenScheduleValuePairs.has(`${nl}:${nv}`) || seenScheduleValuePairs.has(nv)) {
          continue;
        }
        seenScheduleLabels.add(nl);
        seenScheduleValuePairs.add(`${nl}:${nv}`);
        seenScheduleValuePairs.add(nv);

        extraSubmittedEntries.push({
          id: `${sec.id}_${f.key}_${extraSubmittedEntries.length}`,
          label: f.label,
          value: rawStr
        });
      }
    }

    if (extraSubmittedEntries.length > 0) {
      list.push({
        id: 'complete_submitted_particulars',
        node: (
          <div className="pb-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-1.5 border-b border-slate-300 pb-0.5">
              Schedule of Additional Submitted Particulars:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] bg-slate-50/70 p-2.5 rounded border border-slate-200">
              {extraSubmittedEntries.map((item) => (
                <div key={item.id} className="border-b border-dotted border-slate-300 pb-1">
                  <span className="text-slate-600 font-semibold">{item.label}: </span>
                  <span className="text-slate-950 font-bold break-words">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )
      });
    }

    list.push({
      id: 'jurisdiction',
      node: (
        <div className="pb-3 text-justify">
          <span className="font-bold">{clauses.length + 1}. Jurisdiction &amp; Governing Law: </span>
          <span>
            This deed shall be governed by and construed in accordance with the substantive laws of India, and the Civil Courts at <strong>{legalData.executionPlace || legalData.state || 'New Delhi'}, {legalData.state || 'Delhi'}</strong> shall have exclusive jurisdiction over any disputes arising hereunder.
          </span>
        </div>
      )
    });

    list.push({
      id: 'signatures_witnesses',
      node: (
        <div className="pt-3 space-y-5">
          <p className="text-justify">
            <strong>IN WITNESS WHEREOF</strong>, the parties hereto have set their hands and signed this instrument on the day, month, and year first written above in the presence of the following witnesses:
          </p>

          <div className="pt-6 grid grid-cols-2 gap-8 text-center">
            <div className="border-t border-slate-800 pt-2">
              <div className="font-bold text-slate-900">{party1.fullName}</div>
              <div className="text-[11px] text-slate-500 uppercase">First Party / Executant</div>
              {order.esignStatus?.party1Signed && (
                <div className="mt-1 text-[10px] text-emerald-600 font-mono flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> Digitally Signed (Aadhaar OTP)
                </div>
              )}
            </div>

            {party2 ? (
              <div className="border-t border-slate-800 pt-2">
                <div className="font-bold text-slate-900">{party2.fullName}</div>
                <div className="text-[11px] text-slate-500 uppercase">Second Party / Acceptor</div>
                {order.esignStatus?.party2Signed && (
                  <div className="mt-1 text-[10px] text-emerald-600 font-mono flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> Digitally Signed (Aadhaar OTP)
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-slate-800 pt-2">
                <div className="font-bold text-slate-900">NOTARY PUBLIC / ATTESTATION</div>
                <div className="text-[11px] text-slate-500 uppercase">Seal &amp; Registration Number</div>
              </div>
            )}
          </div>

          <div className="pt-4">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
              Witnesses to Signatures:
            </div>
            <div className="grid grid-cols-2 gap-6 text-xs text-slate-700">
              {witnesses.map((w: any, idx: number) => (
                <div key={idx} className="border-b border-dotted border-slate-400 pb-2">
                  <p className="font-bold">{idx + 1}. {w.name}</p>
                  <p className="text-[11px] text-slate-500">{w.address}</p>
                  {w.phone && <p className="text-[10px] text-slate-400">Phone: {w.phone}</p>}
                </div>
              ))}
            </div>
          </div>

          {order.esignStatus?.certificateHash && (
            <div className="pt-3 border-t border-slate-300 text-[10px] text-slate-500 font-mono flex items-center justify-between">
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
      )
    });

    return list;
  }, [
    order, legalData, party1, party2, prop, affidavit, clauses, witnesses,
    inspection, formattedOccupants, stampPaperMode, stampDutyPaidBy,
    p1Email, p1EntityType, p1Aadhaar, p1Pincode, p1SignedByPoa, p1PoaHolder, p1OwnershipProof,
    p2Email, p2EntityType, p2Aadhaar, p2Pincode,
    leaseCommencementDate, leaseEndDate, leaseTenure, maintenanceCharges,
    purposeOfTenancy, documentCategory
  ]);

  // Blank region percentages when overlaying on uploaded e-Stamp sheet
  const blankStartPercent = stampData?.blankStartPercent || 54;
  const blankEndPercent = stampData?.blankEndPercent || 94;
  const isOverlayActive = Boolean(showEStampOverlay && hasUploadedStamp);
  const page1TopPx = isOverlayActive ? Math.round((blankStartPercent / 100) * A4_HEIGHT_PX) : 50;
  const page1BottomPx = isOverlayActive ? Math.round((blankEndPercent / 100) * A4_HEIGHT_PX) : A4_HEIGHT_PX - 56;
  const page1CapacityPx = Math.max(160, page1BottomPx - page1TopPx);

  // Measure actual block heights off-screen and paginate cleanly across A4 sheets
  const measureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pages, setPages] = useState<number[][]>(() => [blocks.map((_, i) => i)]);

  useLayoutEffect(() => {
    const heights = blocks.map((_, i) => {
      const el = measureRefs.current[i];
      return el ? el.getBoundingClientRect().height : 80;
    });

    const computedPages: number[][] = [];
    let currentPage: number[] = [];
    let currentHeight = 0;

    for (let i = 0; i < blocks.length; i++) {
      const limit = computedPages.length === 0 ? page1CapacityPx : STANDARD_USABLE_HEIGHT_PX;
      const h = heights[i];

      if (currentPage.length > 0 && currentHeight + h > limit) {
        computedPages.push(currentPage);
        currentPage = [i];
        currentHeight = h;
      } else {
        currentPage.push(i);
        currentHeight += h;
      }
    }
    if (currentPage.length > 0) {
      computedPages.push(currentPage);
    }

    setPages(computedPages.length > 0 ? computedPages : [blocks.map((_, i) => i)]);
  }, [blocks, page1CapacityPx]);

  // Defensive sanitized page indices so changing to an order with fewer blocks never crashes pre-layout render
  const safePages = useMemo(() => {
    const valid = pages
      .map((indices) => indices.filter((idx) => idx >= 0 && idx < blocks.length))
      .filter((indices) => indices.length > 0);
    return valid.length > 0 ? valid : [blocks.map((_, i) => i)];
  }, [pages, blocks]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const docElement = document.getElementById('printable-legal-document');
    if (docElement) {
      navigator.clipboard.writeText(docElement.innerText);
    }
  };

  const isStampPdf = uploadedStampImage.toLowerCase().includes('application/pdf') || uploadedStampImage.toLowerCase().endsWith('.pdf');

  // If overlay mode was explicitly requested without an uploaded e-Stamp
  if (showEStampOverlay && !hasUploadedStamp) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-amber-300 p-10 text-center max-w-2xl mx-auto space-y-3">
        <Stamp className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">No Uploaded e-Stamp Paper</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No e-Stamp paper has been uploaded for this order yet. Upload the e-Stamp paper in the Upload tab to generate the overlaid A4 format.
        </p>
      </div>
    );
  }

  return (
    <DocumentErrorBoundary>
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer"
                >
                  Attach e-Stamp
                </button>
              )}

              {onEditRequest && (
                <button
                  onClick={onEditRequest}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-gray-200 transition-colors cursor-pointer"
                >
                  Edit Fields
                </button>
              )}

              <button
                onClick={handleCopyText}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-gray-200 transition-colors cursor-pointer"
                title="Copy Raw Text"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 print-keep cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print A4 Document
              </button>
            </div>
          </div>
        )}

        {/* Multi-Page Summary Bar (No-Print) */}
        <div className="no-print max-w-[794px] mx-auto bg-white rounded-xl border border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>
              Total A4 Pages: <strong className="text-blue-700">{safePages.length}</strong>{' '}
              ({safePages.length === 1 ? '1 Sheet' : `${safePages.length} Sheets`})
            </span>
          </div>
          {isOverlayActive ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
              Page 1 Overlay Zone: {blankStartPercent}% – {blankEndPercent}% • Pages 2–{safePages.length}: Continuation A4
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500">
              Standard A4 Multi-Page Format (210mm × 297mm)
            </span>
          )}
        </div>

        {/* Hidden Measurement Container (Exact A4 inner width) */}
        <div
          aria-hidden="true"
          className="font-legal text-slate-900 leading-relaxed text-[13.5px]"
          style={{
            position: 'fixed',
            left: '-99999px',
            top: 0,
            width: `${A4_CONTENT_WIDTH_PX}px`,
            visibility: 'hidden',
            pointerEvents: 'none'
          }}
        >
          {blocks.map((block, idx) => (
            <div
              key={block.id}
              ref={(el) => {
                measureRefs.current[idx] = el;
              }}
            >
              {block.node}
            </div>
          ))}
        </div>

        {/* Rendered Multi-Page A4 Sheets Container */}
        <div ref={containerRef} id="printable-legal-document" className="print-only-container space-y-6">
          {safePages.map((blockIndices, pageIdx) => {
            const isFirstPage = pageIdx === 0;
            const isOverlaidPage1 = isFirstPage && isOverlayActive;

            return (
              <div
                key={pageIdx}
                style={{
                  width: `${Math.round(A4_WIDTH_PX * scale)}px`,
                  height: `${Math.round(A4_HEIGHT_PX * scale)}px`
                }}
                className="mx-auto"
              >
                <div
                  style={{
                    width: `${A4_WIDTH_PX}px`,
                    height: `${A4_HEIGHT_PX}px`,
                    transform: scale < 1 ? `scale(${scale})` : undefined,
                    transformOrigin: 'top left'
                  }}
                  className="a4-sheet-page relative bg-white border border-gray-300 shadow-lg overflow-hidden font-legal text-slate-900 leading-relaxed text-[13.5px]"
                >
                  {/* Page 1 e-Stamp Background Layer (when uploaded & overlay active) */}
                  {isOverlaidPage1 && (
                    <>
                      {isStampPdf ? (
                        <div className="absolute inset-0 bg-white">
                          <object
                            data={uploadedStampImage}
                            type="application/pdf"
                            aria-label="Uploaded e-Stamp PDF"
                            className="w-full border-0 pointer-events-none"
                            style={{ height: `${blankStartPercent}%` }}
                          >
                            <div
                              className="w-full flex flex-col justify-between p-8 border-b-2 border-slate-300 bg-slate-50/80"
                              style={{ height: `${page1TopPx - 8}px` }}
                            >
                              <div className="text-center border-b border-slate-300 pb-3">
                                <div className="text-xs font-sans font-bold uppercase tracking-widest text-emerald-700">
                                  Uploaded Official e-Stamp PDF Certificate
                                </div>
                                <div className="text-sm font-black text-slate-900 mt-1">
                                  UIN: {stampData?.uin || 'ATTACHED'} • ₹{stampData?.stampDutyAmount || order.stampDutyValue}/- ({stampData?.state || legalData.state})
                                </div>
                              </div>
                              <div className="text-center text-[11px] font-sans text-slate-500">
                                Embedded PDF Certificate Header Zone (0% – {blankStartPercent}%)
                              </div>
                            </div>
                          </object>
                        </div>
                      ) : (
                        <img
                          src={uploadedStampImage}
                          alt="Uploaded Official e-Stamp Paper"
                          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                        />
                      )}

                      {/* Subtle Start & End divider guides (screen only, hidden in print) */}
                      <div
                        className="no-print absolute left-[52px] right-[52px] border-t border-dashed border-blue-500/60 flex justify-end pointer-events-none"
                        style={{ top: `${page1TopPx - 6}px` }}
                      >
                        <span className="text-[9px] font-sans font-bold text-blue-600 bg-white/90 px-1.5 -mt-2.5 rounded">
                          Top Start ({blankStartPercent}%)
                        </span>
                      </div>
                      <div
                        className="no-print absolute left-[52px] right-[52px] border-t border-dashed border-emerald-500/60 flex justify-end pointer-events-none"
                        style={{ top: `${page1BottomPx}px` }}
                      >
                        <span className="text-[9px] font-sans font-bold text-emerald-700 bg-white/90 px-1.5 -mt-2.5 rounded">
                          Bottom Limit ({blankEndPercent}%)
                        </span>
                      </div>
                    </>
                  )}

                  {/* Continuation Header on Page 2+ */}
                  {!isFirstPage && (
                    <div className="absolute top-4 left-[52px] right-[52px] flex items-center justify-between text-[10px] font-sans text-slate-400 border-b border-slate-200 pb-1">
                      <span>
                        {isOverlayActive && stampData?.uin
                          ? `Continuation Sheet to e-Stamp UIN: ${stampData.uin}`
                          : `${order.formName} — Continuation Sheet`}
                      </span>
                      <span className="font-mono">Order: {order.id}</span>
                    </div>
                  )}

                  {/* Agreement Content Layer (Bounded between Top & Bottom Lines on Page 1, or top margin on plain A4) */}
                  <div
                    className="absolute"
                    style={{
                      left: `${A4_SIDE_PADDING_PX}px`,
                      right: `${A4_SIDE_PADDING_PX}px`,
                      top: `${isOverlaidPage1 ? page1TopPx : 50}px`,
                      bottom: `${isOverlaidPage1 ? Math.max(32, A4_HEIGHT_PX - page1BottomPx) : 44}px`,
                      overflow: 'hidden'
                    }}
                  >
                    {blockIndices.map((idx) => {
                      const block = blocks[idx];
                      if (!block) return null;
                      return <React.Fragment key={block.id}>{block.node}</React.Fragment>;
                    })}
                  </div>

                  {/* Page Footer */}
                  <div className="absolute bottom-3 left-[52px] right-[52px] flex items-center justify-between text-[10px] font-sans text-slate-500 border-t border-slate-200/80 pt-1">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>{order.formName} • Ref: {order.id}</span>
                    </span>
                    <span className="font-bold text-slate-700">
                      Page {pageIdx + 1} of {safePages.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DocumentErrorBoundary>
  );
};

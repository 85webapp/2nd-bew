/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Production Multi-Page A4 Legal Document Rendering & e-Stamp Overlay Engine
 * - Wrapped in an outer ErrorBoundary so a white page crash is impossible.
 * - Strictly coerces every field/array/clause/witness so malformed Website A or Supabase data never throws.
 * - Splits large sections (property terms, long clauses, checkboxes, extra particulars) into granular atomic rows
 *   so documents paginate cleanly across however many A4 sheets (1..1000+) are needed without clipping.
 * - In e-Stamp Overlaid mode: places Page 1 content strictly inside [blankStartPercent%, blankEndPercent%]
 *   with explicit z-index layering above the e-Stamp background and flows remaining clauses onto continuation A4 sheets.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Order } from '../types';
import { LEGAL_TEMPLATES, STATUTORY_FORMAT_TEMPLATES } from '../utils/templates';
import { extractCompleteOrderInspection } from '../utils/formFieldExtractor';
import { Printer, Download, CheckCircle, Shield, Stamp, FileText, Layers, ArrowLeft, AlertTriangle } from 'lucide-react';

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
const STANDARD_USABLE_HEIGHT_PX = 990; // 1123 - top (50) - bottom footer (44) - safety buffer (39)

export class DocumentErrorBoundary extends React.Component<
  { children: React.ReactNode; onBack?: () => void; backLabel?: string },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode; onBack?: () => void; backLabel?: string }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || 'Unexpected document rendering error' };
  }
  componentDidCatch(error: any) {
    console.error('DocumentErrorBoundary caught:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-2xl mx-auto my-6 space-y-3 shadow-xs">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-red-700">Unable to Render Document Preview</h3>
          <p className="text-xs text-slate-600 break-words">{this.state.errorMsg}</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {this.props.onBack && (
              <button
                type="button"
                onClick={this.props.onBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{this.props.backLabel || 'Go Back'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMsg: '' })}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Retry Render
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function safeObj(val: any): Record<string, any> {
  if (!val) return {};
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return {};
  }
  if (typeof val === 'object' && !Array.isArray(val)) return val;
  return {};
}

function safeStr(val: any, fallback = ''): string {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map((v) => safeStr(v)).filter(Boolean).join(', ') || fallback;
  }
  if (typeof val === 'object') {
    if ('value' in val && val.value !== undefined) return safeStr(val.value, fallback);
    if ('label' in val && val.label !== undefined) return safeStr(val.label, fallback);
    if ('fullAddress' in val && val.fullAddress !== undefined) return safeStr(val.fullAddress, fallback);
    if ('name' in val && val.name !== undefined) return safeStr(val.name, fallback);
    if ('text' in val && val.text !== undefined) return safeStr(val.text, fallback);
    const parts = Object.entries(val)
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${safeStr(v)}`);
    return parts.length > 0 ? parts.join(', ') : fallback;
  }
  return fallback;
}

function safeArr<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
  }
  return [];
}

function normalizeDedupKey(str: string): string {
  return String(str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeDedupValue(val: any): string {
  const s = safeStr(val);
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/₹|rs\.?|inr|\/-/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function splitLongClauseText(body: string, maxLen = 650): string[] {
  const clean = body.trim();
  if (clean.length <= maxLen) return [clean];

  const segments: string[] = [];
  const rawParagraphs = clean.split(/\n+/).map((s) => s.trim()).filter(Boolean);

  for (const para of rawParagraphs) {
    if (para.length <= maxLen) {
      segments.push(para);
      continue;
    }
    const sentences = para.split(/(?<=[.?!;।])\s+/);
    let current = '';
    for (const sent of sentences) {
      if (current && current.length + sent.length + 1 > maxLen) {
        segments.push(current.trim());
        current = sent;
      } else {
        current = current ? `${current} ${sent}` : sent;
      }
    }
    if (current.trim()) segments.push(current.trim());
  }

  return segments.length > 0 ? segments : [clean];
}

const DocumentRendererInner: React.FC<DocumentRendererProps> = ({
  order,
  onEditRequest,
  onUploadStampRequest,
  hideRibbon = false,
  showEStampOverlay = false
}) => {
  const stampData = useMemo(() => {
    const sd = safeObj(order?.stampData);
    return Object.keys(sd).length > 0 ? (sd as NonNullable<Order['stampData']>) : undefined;
  }, [order?.stampData]);

  const uploadedStampImage = safeStr(stampData?.scanUrl || stampData?.eStampPaperUrl);
  const hasUploadedStamp = Boolean(stampData?.verified && uploadedStampImage);

  const [stampImageFailed, setStampImageFailed] = useState(false);
  useEffect(() => {
    setStampImageFailed(false);
  }, [uploadedStampImage]);

  const raw = useMemo(() => safeObj(order?.rawPayload), [order?.rawPayload]);

  const legalData = useMemo(() => {
    const existingLegal = safeObj(order?.legalData);
    if (Object.keys(existingLegal).length > 0) {
      return {
        ...existingLegal,
        documentType: safeStr(existingLegal.documentType || order?.formType, 'custom_document'),
        documentTitle: safeStr(existingLegal.documentTitle || order?.formName, 'Legal Agreement'),
        stampDutyAmount: Number(existingLegal.stampDutyAmount ?? order?.stampDutyValue ?? 500) || 0,
        state: safeStr(existingLegal.state || order?.state || raw.state, 'Delhi'),
        executionDate: safeStr(existingLegal.executionDate || raw.executionDate, new Date().toISOString().split('T')[0]),
        executionPlace: safeStr(existingLegal.executionPlace || raw.executionPlace || existingLegal.state || order?.state, 'New Delhi'),
        party1: safeObj(existingLegal.party1 || raw.party1),
        party2: existingLegal.party2 || raw.party2 ? safeObj(existingLegal.party2 || raw.party2) : undefined,
        propertyDetails: existingLegal.propertyDetails || raw.propertyDetails ? safeObj(existingLegal.propertyDetails || raw.propertyDetails) : undefined,
        affidavitDetails: existingLegal.affidavitDetails || raw.affidavitDetails ? safeObj(existingLegal.affidavitDetails || raw.affidavitDetails) : undefined,
        clauses: existingLegal.clauses ?? raw.clauses,
        witnesses: existingLegal.witnesses ?? raw.witnesses
      };
    }

    return {
      documentType: safeStr(order?.formType, 'custom_document'),
      documentTitle: safeStr(order?.formName, 'Legal Agreement'),
      stampDutyAmount: Number(order?.stampDutyValue ?? raw.stampDutyValue ?? raw.stampDutyAmount ?? 500) || 0,
      state: safeStr(order?.state || raw.state, 'Delhi'),
      executionDate: safeStr(raw.executionDate, new Date().toISOString().split('T')[0]),
      executionPlace: safeStr(raw.executionPlace || order?.state || raw.state, 'New Delhi'),
      party1: safeObj(raw.party1),
      party2: raw.party2 ? safeObj(raw.party2) : undefined,
      propertyDetails: raw.propertyDetails ? safeObj(raw.propertyDetails) : undefined,
      affidavitDetails: raw.affidavitDetails ? safeObj(raw.affidavitDetails) : undefined,
      clauses: raw.clauses,
      witnesses: raw.witnesses
    };
  }, [order, raw]);

  const templateMeta = legalData.documentType ? LEGAL_TEMPLATES[legalData.documentType] : undefined;
  const formatTemplateMeta = STATUTORY_FORMAT_TEMPLATES.find(
    (f) => f.id === legalData.documentType || f.id === order?.formType
  );

  const party1Raw = safeObj(legalData.party1);
  const party1 = useMemo(
    () => ({
      ...party1Raw,
      fullName: safeStr(party1Raw.fullName || party1Raw.name || order?.clientName, 'First Party'),
      relationshipType: safeStr(party1Raw.relationshipType, 'S/o'),
      relativeName: safeStr(party1Raw.relativeName || party1Raw.fatherName || party1Raw.fatherHusbandName),
      age: safeStr(party1Raw.age),
      pan: safeStr(party1Raw.pan || party1Raw.panNumber),
      phone: safeStr(party1Raw.phone || party1Raw.mobile || order?.clientPhone),
      email: safeStr(party1Raw.email || order?.clientEmail),
      address: safeStr(party1Raw.address || party1Raw.fullAddress || raw.address)
    }),
    [party1Raw, order?.clientName, order?.clientPhone, order?.clientEmail, raw.address]
  );

  const party2 = useMemo(() => {
    const p2 = safeObj(legalData.party2);
    if (Object.keys(p2).length === 0) return undefined;
    return {
      ...p2,
      fullName: safeStr(p2.fullName || p2.name, 'Second Party'),
      relationshipType: safeStr(p2.relationshipType, 'S/o'),
      relativeName: safeStr(p2.relativeName || p2.fatherName || p2.fatherHusbandName),
      age: safeStr(p2.age),
      pan: safeStr(p2.pan || p2.panNumber),
      phone: safeStr(p2.phone || p2.mobile),
      email: safeStr(p2.email),
      address: safeStr(p2.address || p2.fullAddress)
    };
  }, [legalData.party2]);

  const prop = useMemo(() => {
    const p = safeObj(legalData.propertyDetails);
    if (Object.keys(p).length === 0) return undefined;
    return {
      ...p,
      fullAddress: safeStr(p.fullAddress || p.propertyAddress || p.address),
      premisesType: safeStr(p.premisesType || p.propertyType),
      monthlyRentOrConsideration: safeStr(p.monthlyRentOrConsideration || p.monthlyRent || p.rentAmount),
      securityDeposit: safeStr(p.securityDeposit || p.depositAmount),
      agreementDurationMonths: safeStr(p.agreementDurationMonths || p.durationMonths),
      lockInPeriodMonths: safeStr(p.lockInPeriodMonths || p.lockInPeriod),
      noticePeriodDays: safeStr(p.noticePeriodDays || p.noticePeriod, '30'),
      utilityChargesBorneBy: safeStr(p.utilityChargesBorneBy || p.electricityWaterCharges)
    };
  }, [legalData.propertyDetails]);

  const affidavit = useMemo(() => {
    const a = safeObj(legalData.affidavitDetails);
    if (Object.keys(a).length === 0) return undefined;
    const rawStmts = a.declarationStatements;
    const stmtsArr = safeArr(rawStmts);
    const statements = stmtsArr.length > 0
      ? stmtsArr.map((s) => safeStr(s)).filter(Boolean)
      : (typeof rawStmts === 'string' && rawStmts.trim()
          ? rawStmts.split(/\n+/).map((s) => s.trim()).filter(Boolean)
          : []);
    return {
      deponentName: safeStr(a.deponentName),
      reasonForAffidavit: safeStr(a.reasonForAffidavit, 'General Legal Verification'),
      oldName: safeStr(a.oldName),
      newName: safeStr(a.newName),
      gapDuration: safeStr(a.gapDuration),
      educationalInstitution: safeStr(a.educationalInstitution),
      declarationStatements: statements
    };
  }, [legalData.affidavitDetails]);

  const clauses = useMemo(() => {
    const rawClauses = legalData.clauses;
    let parsedList = safeArr(rawClauses);

    if (parsedList.length === 0 && typeof rawClauses === 'string' && rawClauses.trim()) {
      parsedList = rawClauses
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, idx) => ({ id: `str-clause-${idx}`, title: `Condition ${idx + 1}`, body: line }));
    }

    if (parsedList.length > 0) {
      return parsedList
        .map((c: any, idx: number) => {
          if (typeof c === 'string') {
            return { id: `c-${idx}`, title: `Clause ${idx + 1}`, body: c };
          }
          if (c && typeof c === 'object') {
            return {
              id: safeStr(c.id, `c-${idx}`),
              title: safeStr(c.title || c.heading || c.name, `Clause ${idx + 1}`),
              body: safeStr(c.body || c.text || c.content || c.description)
            };
          }
          return null;
        })
        .filter((c): c is { id: string; title: string; body: string } => Boolean(c && (c.title || c.body)));
    }

    if (formatTemplateMeta?.mandatoryClauses?.length) {
      return formatTemplateMeta.mandatoryClauses.map((c: string, idx: number) => ({
        id: `tpl-${idx}`,
        title: c,
        body: `Both parties hereby agree and undertake to comply with all covenants, terms, and statutory obligations relating to ${c.toLowerCase()} in accordance with ${formatTemplateMeta.actReference || templateMeta?.article || 'applicable Indian law'}.`
      }));
    }

    return [
      { id: 'c1', title: 'Terms & Undertakings', body: 'The parties agree that all conditions and covenants enumerated herein shall be strictly complied with during the subsistence of this instrument.' },
      { id: 'c2', title: 'Consideration & Payment Obligations', body: `The consideration, monthly rent, security deposit, and applicable stamp duty of ₹${Number(order?.stampDutyValue || 0)}/- shall be honored as mutually settled between the parties.` },
      { id: 'c3', title: 'Peaceful Possession & Non-Interference', body: 'The Second Party shall observe all residential/commercial rules and maintain the premises/subject matter in good condition without unauthorized alterations or subletting.' },
      { id: 'c4', title: 'Termination & Notice Period', body: 'Either party may terminate this arrangement by serving prior written notice as stipulated herein, subject to settlement of all outstanding dues.' },
      { id: 'c5', title: 'Dispute Jurisdiction', body: 'Any disputes arising out of this agreement shall be subject to the exclusive jurisdiction of the competent civil courts.' }
    ];
  }, [legalData.clauses, formatTemplateMeta, templateMeta, order?.stampDutyValue]);

  const witnesses = useMemo(() => {
    const wArr = safeArr(legalData.witnesses);
    if (wArr.length > 0) {
      return wArr.map((w: any, idx: number) => {
        if (typeof w === 'string') {
          return { name: w, address: 'Address: __________________________', phone: '' };
        }
        const obj = safeObj(w);
        return {
          name: safeStr(obj.name || obj.fullName, `Witness ${idx + 1}: ____________________`),
          address: safeStr(obj.address, 'Address: __________________________'),
          phone: safeStr(obj.phone)
        };
      });
    }
    if (typeof legalData.witnesses === 'string' && legalData.witnesses.trim()) {
      return legalData.witnesses
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, address: 'Address: __________________________', phone: '' }));
    }
    return [
      { name: 'Witness 1: ____________________', address: 'Address: __________________________', phone: '' },
      { name: 'Witness 2: ____________________', address: 'Address: __________________________', phone: '' }
    ];
  }, [legalData.witnesses]);

  const inspection = useMemo(() => extractCompleteOrderInspection(order), [order]);

  const rawFormData = useMemo(() => {
    const fd = safeObj(raw.formData);
    if (Object.keys(fd).length > 0) return fd;
    const fl = safeObj(raw.fields);
    if (Object.keys(fl).length > 0) return fl;
    return safeObj(raw.answers);
  }, [raw]);

  const pickVal = (...candidates: any[]): string => {
    for (const c of candidates) {
      const s = safeStr(c).trim();
      if (s !== '' && s !== 'Not Provided' && s !== 'undefined' && s !== 'null') return s;
    }
    return '';
  };

  const p1Email = pickVal(party1.email, order?.clientEmail, raw.clientEmail, raw.email, raw.landlordEmail, rawFormData.email, rawFormData.clientEmail);
  const p1EntityType = pickVal(party1Raw.entityType, raw.landlordEntityType, raw.firstPartyEntityType, rawFormData.entityType);
  const p1Aadhaar = pickVal(party1Raw.aadhaar, party1Raw.aadhaarNumber, party1Raw.aadhaarLast4, raw.landlordAadhaar, rawFormData.aadhaar);
  const p1Pincode = pickVal(party1Raw.pincode, raw.landlordPincode, rawFormData.pincode);
  const p1SignedByPoa = Boolean(party1Raw.signedByPoa ?? raw.signedByPoa ?? rawFormData.signedByPoa);
  const p1PoaHolder = pickVal(party1Raw.poaHolderName, raw.poaHolderName, raw.poaDetails, rawFormData.poaHolderName);
  const p1OwnershipProof = pickVal(party1Raw.propertyOwnershipProofType, raw.propertyOwnershipProofType, raw.proofOfPropertyOwnerType, raw.ownershipProofType, rawFormData.propertyOwnershipProofType);

  const p2Raw = safeObj(legalData.party2);
  const p2Email = pickVal(party2?.email, raw.tenantEmail, rawFormData.tenantEmail);
  const p2EntityType = pickVal(p2Raw.entityType, raw.lesseeEntityType, raw.secondPartyEntityType);
  const p2Aadhaar = pickVal(p2Raw.aadhaar, p2Raw.aadhaarNumber, p2Raw.aadhaarLast4, raw.tenantAadhaar);
  const p2Pincode = pickVal(p2Raw.pincode, raw.tenantPincode);

  const rawOccupants = p2Raw.occupantDetails ?? raw.occupantDetails ?? raw.familyMemberDetails ?? raw.occupants ?? rawFormData.occupantDetails;
  const formattedOccupants = useMemo(() => {
    if (!rawOccupants) return '';
    if (typeof rawOccupants === 'string') return rawOccupants.trim();
    if (Array.isArray(rawOccupants)) {
      return rawOccupants
        .map((occ: any, idx: number) => {
          if (typeof occ === 'string') return occ;
          if (occ && typeof occ === 'object') {
            const parts = [safeStr(occ.name || occ.fullName, `Occupant ${idx + 1}`)];
            if (occ.relationship || occ.relation) parts.push(`(${safeStr(occ.relationship || occ.relation)})`);
            if (occ.age) parts.push(`Age: ${safeStr(occ.age)}`);
            if (occ.idNumber || occ.aadhaar) parts.push(`ID: ${safeStr(occ.idNumber || occ.aadhaar)}`);
            return parts.join(' ');
          }
          return '';
        })
        .filter(Boolean)
        .join('; ');
    }
    return safeStr(rawOccupants);
  }, [rawOccupants]);

  const propRaw = safeObj(legalData.propertyDetails);
  const leaseCommencementDate = pickVal(propRaw.leaseCommencementDate, raw.leaseCommencementDate, raw.commencementDate, raw.startDate, rawFormData.leaseCommencementDate);
  const leaseEndDate = pickVal(propRaw.leaseEndDate, raw.leaseEndDate, raw.expiryDate, raw.endDate, rawFormData.leaseEndDate);
  const leaseTenure = pickVal(propRaw.leaseTenure, prop?.agreementDurationMonths ? `${prop.agreementDurationMonths} Months` : '', raw.leaseTenure, raw.leaseDuration);
  const maintenanceCharges = pickVal(propRaw.maintenanceCharges, raw.maintenanceCharges, raw.monthlyMaintenance, rawFormData.maintenanceCharges);
  const purposeOfTenancy = pickVal(raw.purposeOfTenancy, raw.specificPurpose, raw.tenancyPurpose, raw.purpose, rawFormData.purposeOfTenancy);
  const documentCategory = pickVal(raw.documentCategory, raw.rentCategory, raw.leaseCategory, rawFormData.documentCategory, prop?.premisesType);
  const stampPaperMode = pickVal(raw.stampPaperMode, raw.stampProcurementMode, raw.procurementMode, rawFormData.stampPaperMode);
  const stampDutyPaidBy = pickVal(order?.stampDutyPaidBy, raw.stampDutyPaidBy, stampData?.stampDutyPaidBy, rawFormData.stampDutyPaidBy);

  const safeFormName = safeStr(order?.formName, 'Legal Document');
  const safeOrderId = safeStr(order?.id, 'CTC-ORDER');
  const safeStampDutyVal = Number(order?.stampDutyValue ?? legalData.stampDutyAmount ?? 0) || 0;

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
    const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(updateScale) : 0;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScale) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    return () => {
      if (raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [hasUploadedStamp, showEStampOverlay, safeOrderId]);

  // Build granular atomic blocks so ANY document (short or 10+ pages) flows seamlessly across A4 sheets
  const blocks = useMemo(() => {
    const list: Array<{ id: string; estHeight: number; node: React.ReactNode }> = [];

    list.push({
      id: 'title',
      estHeight: 74,
      node: (
        <div className="text-center pb-3">
          <div className="inline-block border-y-2 border-slate-900 py-1 px-6">
            <h2 className="text-base font-black tracking-wider uppercase text-slate-950">
              {safeStr(legalData.documentTitle, safeFormName)}
            </h2>
          </div>
          <div className="text-[11px] text-slate-600 uppercase tracking-widest mt-1.5">
            {documentCategory ? `${documentCategory} • ` : ''}
            Executed at {safeStr(legalData.executionPlace || legalData.state, 'New Delhi')}, {safeStr(legalData.state, 'Delhi')} on {safeStr(legalData.executionDate, new Date().toISOString().split('T')[0])}
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
      estHeight: 62,
      node: (
        <p className="text-justify pb-3">
          <strong>THIS {(safeStr(legalData.documentTitle || safeFormName)).toUpperCase().includes('AFFIDAVIT') ? 'AFFIDAVIT' : 'DEED / AGREEMENT'}</strong> is made and entered into at <strong>{safeStr(legalData.executionPlace || legalData.state, 'New Delhi')}</strong> ({safeStr(legalData.state, 'Delhi')}) on this <strong>{safeStr(legalData.executionDate, new Date().toISOString().split('T')[0])}</strong> (Stamp Duty: <strong>₹{safeStampDutyVal}/-</strong>{stampDutyPaidBy ? `, borne by ${stampDutyPaidBy}` : ''}), by and between:
        </p>
      )
    });

    list.push({
      id: 'party1',
      estHeight: 88,
      node: (
        <div className="pl-3.5 border-l-2 border-slate-500 py-0.5 mb-2.5 text-justify">
          <p>
            <strong>{party1.fullName}</strong>
            {p1EntityType && <> ({p1EntityType})</>}
            {party1.relativeName && (
              <>, {party1.relationshipType} {party1.relativeName}</>
            )}
            {party1.age && <>, aged about {party1.age} years</>}
            {party1.pan && <>, bearing PAN: <strong>{party1.pan}</strong></>}
            {p1Aadhaar && <>, Aadhaar No.: <strong>{p1Aadhaar.length <= 4 ? `XXXX-XXXX-${p1Aadhaar}` : p1Aadhaar}</strong></>}
            {party1.phone && <>, Mobile: <strong>{party1.phone}</strong></>}
            {p1Email && <>, Email ID: <strong>{p1Email}</strong></>}
            {party1.address ? <>, permanently residing at <em>{party1.address}{p1Pincode && !party1.address.includes(p1Pincode) ? ` — PIN: ${p1Pincode}` : ''}</em></> : null}
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
        estHeight: 96,
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
                  <>, {party2.relationshipType} {party2.relativeName}</>
                )}
                {party2.age && <>, aged about {party2.age} years</>}
                {party2.pan && <>, bearing PAN: <strong>{party2.pan}</strong></>}
                {p2Aadhaar && <>, Aadhaar No.: <strong>{p2Aadhaar.length <= 4 ? `XXXX-XXXX-${p2Aadhaar}` : p2Aadhaar}</strong></>}
                {party2.phone && <>, Mobile: <strong>{party2.phone}</strong></>}
                {p2Email && <>, Email ID: <strong>{p2Email}</strong></>}
                {party2.address ? <>, permanently residing at <em>{party2.address}{p2Pincode && !party2.address.includes(p2Pincode) ? ` — PIN: ${p2Pincode}` : ''}</em></> : null}
                {formattedOccupants ? <>, Permitted Occupants / Family Members: <strong>{formattedOccupants}</strong></> : null}{' '}
                (hereinafter referred to as the <strong>&quot;SECOND PARTY&quot;</strong>, which expression shall include their permitted successors and assigns).
              </p>
            </div>
          </div>
        )
      });
    }

    // Recitals (split individually so Page 1 breaks smoothly at exact Bottom Limit)
    list.push({
      id: 'recitals_header',
      estHeight: 26,
      node: (
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 pb-1">
          WHEREAS:
        </h4>
      )
    });

    if (prop) {
      list.push({
        id: 'recital_a',
        estHeight: 42,
        node: (
          <p className="text-justify pb-1">
            A. The First Party is the lawful owner{p1OwnershipProof ? ` (evidenced by ${p1OwnershipProof})` : ''} and in physical possession of the immovable property situated at <strong>{prop.fullAddress || 'the scheduled premises'}</strong> ({prop.premisesType || documentCategory || 'Premises'}).
          </p>
        )
      });
      list.push({
        id: 'recital_b',
        estHeight: 42,
        node: (
          <p className="text-justify pb-1">
            B. The Second Party has approached the First Party with a request to take the said premises on lease/tenancy{purposeOfTenancy ? ` specifically for ${purposeOfTenancy}` : ' for bona fide purposes'}{leaseCommencementDate ? `, commencing from ${leaseCommencementDate}` : ''}{leaseEndDate ? ` until ${leaseEndDate}` : ''}.
          </p>
        )
      });
      list.push({
        id: 'recital_c',
        estHeight: 36,
        node: (
          <p className="text-justify pb-2.5">
            C. Both parties have mutually agreed upon the monthly rent, security deposit, maintenance, utilities, tenure, and covenants as recorded hereinafter.
          </p>
        )
      });
    } else if (affidavit) {
      list.push({
        id: 'recital_affidavit_intro',
        estHeight: 50,
        node: (
          <p className="text-justify pb-1.5">
            {affidavit.deponentName ? <>Deponent: <strong>{affidavit.deponentName}</strong>. </> : null}
            That the deponent makes this sworn affirmation for the specific reason: <strong>{affidavit.reasonForAffidavit}</strong>.
            {affidavit.oldName || affidavit.newName ? <> Former Name: <strong>{affidavit.oldName || '—'}</strong>; New / Corrected Name: <strong>{affidavit.newName || '—'}</strong>.</> : null}
            {affidavit.gapDuration ? <> Gap Duration: <strong>{affidavit.gapDuration}</strong>.</> : null}
            {affidavit.educationalInstitution ? <> Educational Institution: <strong>{affidavit.educationalInstitution}</strong>.</> : null}
          </p>
        )
      });
      affidavit.declarationStatements.forEach((stmt: string, idx: number) => {
        list.push({
          id: `affidavit_stmt_${idx}`,
          estHeight: 38,
          node: (
            <p className="text-justify pb-1.5">
              <strong>({idx + 1})</strong> {stmt}
            </p>
          )
        });
      });
    } else {
      list.push({
        id: 'recital_generic',
        estHeight: 40,
        node: (
          <p className="text-justify pb-2.5">
            The parties hereto are desirous of recording their mutual covenants, warranties, and obligations in writing under these presents.
          </p>
        )
      });
    }

    list.push({
      id: 'witnesseth_header',
      estHeight: 34,
      node: (
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-300 pb-1">
          NOW THEREFORE THIS AGREEMENT WITNESSETH AND IT IS HEREBY MUTUALLY AGREED AS UNDER:
        </h4>
      )
    });

    if (prop) {
      const propMetrics: Array<{ label: string; value: string }> = [
        { label: 'Monthly Rent:', value: `₹ ${prop.monthlyRentOrConsideration || '—'}/-` },
        { label: 'Security Deposit:', value: `₹ ${prop.securityDeposit || '—'}/-` },
        { label: 'Duration:', value: leaseTenure || `${prop.agreementDurationMonths || '11'} Months` },
        { label: 'Notice Period:', value: `${prop.noticePeriodDays || '30'} Days` }
      ];
      if (leaseCommencementDate) propMetrics.push({ label: 'Start Date:', value: leaseCommencementDate });
      if (leaseEndDate) propMetrics.push({ label: 'End Date:', value: leaseEndDate });
      if (maintenanceCharges) propMetrics.push({ label: 'Maintenance:', value: maintenanceCharges });
      if (prop.lockInPeriodMonths) propMetrics.push({ label: 'Lock-In Period:', value: `${prop.lockInPeriodMonths} Months` });
      if (prop.utilityChargesBorneBy) propMetrics.push({ label: 'Utilities Borne By:', value: prop.utilityChargesBorneBy });

      const propRows = chunkArray(propMetrics, 4);
      propRows.forEach((rowItems, rIdx) => {
        list.push({
          id: `prop_terms_row_${rIdx}`,
          estHeight: 54,
          node: (
            <div className="mb-2 bg-slate-50/90 p-2 rounded border border-slate-200 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                {rowItems.map((m, mIdx) => (
                  <div key={mIdx}>
                    <span className="text-slate-500 block">{m.label}</span>
                    <strong className="text-slate-900 break-words">{m.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )
        });
      });
    }

    // Clauses (long clauses split cleanly into readable paragraph blocks)
    clauses.forEach((clause, index) => {
      const segments = splitLongClauseText(clause.body || '');
      segments.forEach((seg, segIdx) => {
        list.push({
          id: `clause-${clause.id || index}-seg-${segIdx}`,
          estHeight: Math.max(40, Math.ceil(seg.length / 85) * 20 + 16),
          node: (
            <div className="pb-2.5 text-justify">
              {segIdx === 0 && <span className="font-bold">{index + 1}. {clause.title}: </span>}
              <span>{seg}</span>
            </div>
          )
        });
      });
    });

    // Embed Selected / Ticked Checkboxes in granular 2-row chunks (4 items per block) so unlimited lists paginate cleanly
    if (inspection.checkboxes.length > 0) {
      list.push({
        id: 'checkboxes_header',
        estHeight: 30,
        node: (
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-1.5 border-b border-slate-300 pb-0.5 pt-1">
            Confirmed Declarations, Amenities &amp; Submitted Options:
          </h4>
        )
      });

      const cbChunks = chunkArray(inspection.checkboxes, 4);
      cbChunks.forEach((chunk, chunkIdx) => {
        list.push({
          id: `checkbox_chunk_${chunkIdx}`,
          estHeight: 56,
          node: (
            <div className="mb-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] bg-slate-50/80 p-2 rounded border border-slate-200">
              {chunk.map((cb, idx) => (
                <div key={`${cb.key}-${chunkIdx}-${idx}`} className="flex items-start gap-1.5">
                  <span className="font-mono font-bold text-slate-900">{cb.checked ? '[✓]' : '[ ]'}</span>
                  <span className={cb.checked ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
                    {safeStr(cb.label)} <span className="text-[10px]">({cb.checked ? 'Confirmed' : 'Not Selected'})</span>
                  </span>
                </div>
              ))}
            </div>
          )
        });
      });
    }

    // Embed ALL Additional / Custom & Remaining Unique Submitted Form Particulars (Zero Duplicates, granular 2-item row chunks!)
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

    const renderedValuesNorm = new Set<string>();
    [
      safeOrderId, order?.referenceCode, safeFormName, legalData.documentTitle,
      legalData.state, legalData.executionDate, legalData.executionPlace,
      safeStampDutyVal, legalData.stampDutyAmount, documentCategory,
      purposeOfTenancy, stampPaperMode, stampDutyPaidBy,
      party1.fullName, p1EntityType, party1.relativeName, party1.age, party1.pan,
      p1Aadhaar, party1.phone, order?.clientPhone, p1Email, order?.clientEmail,
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
      if (nv && nv.length >= 2) renderedValuesNorm.add(nv);
    });

    const seenScheduleLabels = new Set<string>();
    const seenScheduleValuePairs = new Set<string>();
    const extraSubmittedEntries: Array<{ id: string; label: string; value: string }> = [];

    for (const sec of inspection.sections) {
      for (const f of sec.fields) {
        if (f.isEmpty) continue;
        const nk = normalizeDedupKey(f.key);
        const labelStr = safeStr(f.label, f.key);
        const nl = normalizeDedupKey(labelStr);
        if (order?.category !== 'registration' && renderedCoreKeysNorm.has(nk)) continue;

        const rawStr = safeStr(f.value);
        if (!rawStr) continue;
        if (rawStr.startsWith('data:') && rawStr.includes(';base64,')) continue;

        const nv = normalizeDedupValue(rawStr);
        if (!nv || nv === 'not provided' || nv === 'na' || nv === '—') continue;

        if (order?.category !== 'registration' && renderedValuesNorm.has(nv)) continue;
        if (seenScheduleLabels.has(nl) || seenScheduleValuePairs.has(`${nl}:${nv}`) || seenScheduleValuePairs.has(nv)) {
          continue;
        }
        seenScheduleLabels.add(nl);
        seenScheduleValuePairs.add(`${nl}:${nv}`);
        seenScheduleValuePairs.add(nv);

        extraSubmittedEntries.push({
          id: `${sec.id}_${f.key}_${extraSubmittedEntries.length}`,
          label: labelStr,
          value: rawStr
        });
      }
    }

    if (extraSubmittedEntries.length > 0) {
      list.push({
        id: 'particulars_header',
        estHeight: 30,
        node: (
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-1.5 border-b border-slate-300 pb-0.5 pt-1">
            Schedule of Additional Submitted Particulars:
          </h4>
        )
      });

      const entryChunks = chunkArray(extraSubmittedEntries, 4);
      entryChunks.forEach((chunk, chunkIdx) => {
        list.push({
          id: `particulars_chunk_${chunkIdx}`,
          estHeight: 68,
          node: (
            <div className="mb-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] bg-slate-50/70 p-2 rounded border border-slate-200">
              {chunk.map((item) => (
                <div key={item.id} className="border-b border-dotted border-slate-300 pb-1">
                  <span className="text-slate-600 font-semibold">{item.label}: </span>
                  <span className="text-slate-950 font-bold break-words">{item.value}</span>
                </div>
              ))}
            </div>
          )
        });
      });
    }

    list.push({
      id: 'jurisdiction',
      estHeight: 54,
      node: (
        <div className="pb-3 pt-1 text-justify">
          <span className="font-bold">{clauses.length + 1}. Jurisdiction &amp; Governing Law: </span>
          <span>
            This deed shall be governed by and construed in accordance with the substantive laws of India, and the Civil Courts at <strong>{safeStr(legalData.executionPlace || legalData.state, 'New Delhi')}, {safeStr(legalData.state, 'Delhi')}</strong> shall have exclusive jurisdiction over any disputes arising hereunder.
          </span>
        </div>
      )
    });

    list.push({
      id: 'witness_whereof',
      estHeight: 48,
      node: (
        <p className="text-justify pt-2 pb-3">
          <strong>IN WITNESS WHEREOF</strong>, the parties hereto have set their hands and signed this instrument on the day, month, and year first written above in the presence of the following witnesses:
        </p>
      )
    });

    list.push({
      id: 'party_signatures',
      estHeight: 82,
      node: (
        <div className="pt-5 pb-3 grid grid-cols-2 gap-8 text-center">
          <div className="border-t border-slate-800 pt-2">
            <div className="font-bold text-slate-900">{party1.fullName}</div>
            <div className="text-[11px] text-slate-500 uppercase">First Party / Executant</div>
            {order?.esignStatus?.party1Signed && (
              <div className="mt-1 text-[10px] text-emerald-600 font-mono flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Digitally Signed (Aadhaar OTP)
              </div>
            )}
          </div>

          {party2 ? (
            <div className="border-t border-slate-800 pt-2">
              <div className="font-bold text-slate-900">{party2.fullName}</div>
              <div className="text-[11px] text-slate-500 uppercase">Second Party / Acceptor</div>
              {order?.esignStatus?.party2Signed && (
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
      )
    });

    list.push({
      id: 'witnesses_signatures',
      estHeight: 96,
      node: (
        <div className="pt-2 space-y-3">
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
              Witnesses to Signatures:
            </div>
            <div className="grid grid-cols-2 gap-6 text-xs text-slate-700">
              {witnesses.map((w, idx) => (
                <div key={idx} className="border-b border-dotted border-slate-400 pb-2">
                  <p className="font-bold">{idx + 1}. {w.name}</p>
                  <p className="text-[11px] text-slate-500">{w.address}</p>
                  {w.phone && <p className="text-[10px] text-slate-400">Phone: {w.phone}</p>}
                </div>
              ))}
            </div>
          </div>

          {order?.esignStatus?.certificateHash && (
            <div className="pt-3 border-t border-slate-300 text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <div>
                <span>AUTHENTICATION HASH: </span>
                <span className="font-bold text-slate-700">{safeStr(order.esignStatus.certificateHash)}</span>
              </div>
              <div>
                <span>PROVIDER: {safeStr(order.esignStatus.provider)}</span>
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
    purposeOfTenancy, documentCategory, safeFormName, safeOrderId, safeStampDutyVal
  ]);

  // Blank region percentages when overlaying on uploaded e-Stamp sheet
  const blankStartPercent = Math.max(10, Math.min(85, Number(stampData?.blankStartPercent) || 54));
  const blankEndPercent = Math.max(blankStartPercent + 8, Math.min(98, Number(stampData?.blankEndPercent) || 94));
  const isOverlayActive = Boolean(showEStampOverlay && hasUploadedStamp);
  const page1TopPx = isOverlayActive ? Math.round((blankStartPercent / 100) * A4_HEIGHT_PX) : 50;
  const page1BottomPx = isOverlayActive ? Math.round((blankEndPercent / 100) * A4_HEIGHT_PX) : A4_HEIGHT_PX - 56;
  const page1CapacityPx = Math.max(150, page1BottomPx - page1TopPx - 6);

  const computePageBuckets = (heights: number[], firstPageLimit: number): number[][] => {
    const computedPages: number[][] = [];
    let currentPage: number[] = [];
    let currentHeight = 0;

    for (let i = 0; i < heights.length; i++) {
      const limit = computedPages.length === 0 ? firstPageLimit : STANDARD_USABLE_HEIGHT_PX;
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
    return computedPages.length > 0 ? computedPages : [heights.map((_, i) => i)];
  };

  // Measure actual block heights off-screen (falling back cleanly if unmeasured/SSR) and paginate across A4 sheets
  const measureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pages, setPages] = useState<number[][]>(() =>
    computePageBuckets(blocks.map((b) => b.estHeight), page1CapacityPx)
  );

  useLayoutEffect(() => {
    measureRefs.current.length = blocks.length;
    const heights = blocks.map((b, i) => {
      const el = measureRefs.current[i];
      if (!el) return b.estHeight;
      const rectH = el.getBoundingClientRect().height;
      const offsetH = el.offsetHeight;
      return rectH > 4 ? rectH : (offsetH > 4 ? offsetH : b.estHeight);
    });

    setPages(computePageBuckets(heights, page1CapacityPx));
  }, [blocks, page1CapacityPx]);

  // Defensive sanitized page indices
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
                <span>{safeFormName}</span>
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
                Ref: <span className="font-mono">{safeOrderId}</span> • Stamp Duty: ₹{safeStampDutyVal} • State: {safeStr(legalData.state, 'Delhi')}
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
            Page 1 Overlay Zone: {blankStartPercent}% – {blankEndPercent}% • {safePages.length > 1 ? `Pages 2–${safePages.length}: Continuation A4` : 'Fits on Page 1'}
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
                {/* Page 1 e-Stamp Background Layer (strictly at z-0 below overlay text) */}
                {isOverlaidPage1 && (
                  <>
                    {isStampPdf ? (
                      <div
                        className="absolute top-0 left-0 right-0 z-0 bg-white overflow-hidden"
                        style={{ height: `${page1TopPx}px` }}
                      >
                        <object
                          data={uploadedStampImage}
                          type="application/pdf"
                          aria-label="Uploaded e-Stamp PDF"
                          className="w-full h-full border-0 pointer-events-none"
                        >
                          <div className="w-full h-full flex flex-col justify-between p-8 border-b-2 border-slate-300 bg-slate-50/90">
                            <div className="text-center border-b border-slate-300 pb-3">
                              <div className="text-xs font-sans font-bold uppercase tracking-widest text-emerald-700">
                                Uploaded Official e-Stamp PDF Certificate
                              </div>
                              <div className="text-sm font-black text-slate-900 mt-1">
                                UIN: {safeStr(stampData?.uin, 'ATTACHED')} • ₹{Number(stampData?.stampDutyAmount ?? safeStampDutyVal)}/- ({safeStr(stampData?.state || legalData.state, 'Delhi')})
                              </div>
                            </div>
                            <div className="text-center text-[11px] font-sans text-slate-500">
                              Embedded PDF Certificate Header Zone (0% – {blankStartPercent}%)
                            </div>
                          </div>
                        </object>
                      </div>
                    ) : !stampImageFailed ? (
                      <img
                        src={uploadedStampImage}
                        alt="Uploaded Official e-Stamp Paper"
                        onError={() => setStampImageFailed(true)}
                        className="absolute inset-0 z-0 w-full h-full object-fill pointer-events-none select-none"
                      />
                    ) : (
                      <div
                        className="absolute top-0 left-0 right-0 z-0 flex flex-col justify-center items-center p-6 border-b border-dashed border-emerald-300 bg-emerald-50/40"
                        style={{ height: `${Math.max(80, page1TopPx - 8)}px` }}
                      >
                        <div className="text-xs font-sans font-bold uppercase tracking-wider text-emerald-800">
                          Official e-Stamp Attached — UIN: {safeStr(stampData?.uin, 'ATTACHED')}
                        </div>
                        <div className="text-[11px] font-sans text-slate-600 mt-0.5">
                          Stamp Duty: ₹{Number(stampData?.stampDutyAmount ?? safeStampDutyVal)}/- • {safeStr(stampData?.state || legalData.state, 'Delhi')}
                        </div>
                      </div>
                    )}

                    {/* Subtle Start & End divider guides (screen only, hidden in print) */}
                    <div
                      className="no-print absolute left-[52px] right-[52px] z-30 border-t border-dashed border-blue-500/70 flex justify-end pointer-events-none"
                      style={{ top: `${Math.max(4, page1TopPx - 4)}px` }}
                    >
                      <span className="text-[9px] font-sans font-bold text-blue-600 bg-white/95 px-1.5 -mt-2.5 rounded">
                        Top Start ({blankStartPercent}%)
                      </span>
                    </div>
                    <div
                      className="no-print absolute left-[52px] right-[52px] z-30 border-t border-dashed border-emerald-500/70 flex justify-end pointer-events-none"
                      style={{ top: `${page1BottomPx}px` }}
                    >
                      <span className="text-[9px] font-sans font-bold text-emerald-700 bg-white/95 px-1.5 -mt-2.5 rounded">
                        Bottom Limit ({blankEndPercent}%)
                      </span>
                    </div>
                  </>
                )}

                {/* Continuation Header on Page 2+ */}
                {!isFirstPage && (
                  <div className="absolute top-4 left-[52px] right-[52px] z-20 flex items-center justify-between text-[10px] font-sans text-slate-400 border-b border-slate-200 pb-1">
                    <span>
                      {isOverlayActive && stampData?.uin
                        ? `Continuation Sheet to e-Stamp UIN: ${safeStr(stampData.uin)}`
                        : `${safeFormName} — Continuation Sheet`}
                    </span>
                    <span className="font-mono">Order: {safeOrderId}</span>
                  </div>
                )}

                {/* Agreement Content Layer (Bounded between Top & Bottom Lines on Page 1, always at z-20 above e-Stamp) */}
                <div
                  className="absolute z-20"
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
                <div className="absolute bottom-3 left-[52px] right-[52px] z-30 flex items-center justify-between text-[10px] font-sans text-slate-500 border-t border-slate-200/80 pt-1">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{safeFormName} • Ref: {safeOrderId}</span>
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
  );
};

export const DocumentRenderer: React.FC<DocumentRendererProps> = (props) => {
  return (
    <DocumentErrorBoundary>
      <DocumentRendererInner {...props} />
    </DocumentErrorBoundary>
  );
};

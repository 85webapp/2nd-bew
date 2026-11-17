/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Legal Document Service & Media Storage Pipeline
 * Clean, flexible legal agreement PDF generation with e-Stamp continuation support
 * Automatic media & image upload to Cloudinary with secure local document store fallback.
 */

import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractCompleteOrderInspection } from '../utils/formFieldExtractor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Secure local storage directories
const LOCAL_DOCS_DIR = path.resolve(__dirname, '../../public/uploads/documents');
const LOCAL_MEDIA_DIR = path.resolve(__dirname, '../../public/uploads/media');

[LOCAL_DOCS_DIR, LOCAL_MEDIA_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // ignore
  }
});

export interface LegalOrderPayload {
  id?: string;
  formName?: string;
  documentTitle?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  stampDutyValue?: number;
  stampDutyAmount?: number;
  category?: string;
  overlayProvision?: boolean;
  legalData?: {
    documentTitle?: string;
    stampDutyAmount?: number;
    state?: string;
    executionDate?: string;
    executionPlace?: string;
    party1?: {
      fullName: string;
      relativeName?: string;
      relationshipType?: string;
      pan?: string;
      aadhaarLast4?: string;
      phone?: string;
      email?: string;
      address?: string;
      photo?: string;
      [key: string]: any;
    };
    party2?: {
      fullName: string;
      relativeName?: string;
      relationshipType?: string;
      pan?: string;
      aadhaarLast4?: string;
      phone?: string;
      email?: string;
      address?: string;
      photo?: string;
      [key: string]: any;
    };
    propertyDetails?: {
      fullAddress?: string;
      monthlyRentOrConsideration?: number | string;
      securityDeposit?: number | string;
      agreementDurationMonths?: number | string;
      [key: string]: any;
    };
    affidavitDetails?: any;
    clauses?: Array<{ title: string; body: string }>;
    witnesses?: Array<{ name?: string; address?: string; phone?: string }>;
    [key: string]: any;
  };
  photo?: string;
  photoUrl?: string;
  photos?: string[];
  applicantPhoto?: string;
  signatureImage?: string;
  attachments?: Array<{ name?: string; url?: string; data?: string }>;
  [key: string]: any;
}

/**
 * Generates an official, clean Legal Document PDF.
 * Does NOT generate a fake government e-Stamp header.
 * If overlayProvision is true, reserves blank continuation space on top of Page 1
 * for when the administrator overlays or prints this on an official e-Stamp certificate.
 */
export async function generateLegalAgreementPdf(
  order: LegalOrderPayload,
  options: { overlayProvision?: boolean; topBlankSpace?: number; stampImageBase64?: string } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const isOverlay = options.overlayProvision ?? (order.overlayProvision || false);
      const startY = isOverlay ? (options.topBlankSpace || 440) : 45;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
        autoFirstPage: true,
        bufferPages: true
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const raw = (order.rawPayload && typeof order.rawPayload === 'object') ? order.rawPayload : order;
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

      const p1: any = order.legalData?.party1 || order.party1 || raw.party1 || { fullName: order.clientName || 'First Party' };
      const p2: any = order.legalData?.party2 || order.party2 || raw.party2 || null;
      const prop: any = order.legalData?.propertyDetails || order.propertyDetails || raw.propertyDetails || null;
      const aff: any = order.legalData?.affidavitDetails || order.affidavitDetails || raw.affidavitDetails || null;

      const state = order.legalData?.state || order.state || raw.state || 'Delhi';
      const duty = Number(order.stampDutyValue ?? order.stampDutyAmount ?? order.legalData?.stampDutyAmount ?? 500);
      const docTitle = (order.legalData?.documentTitle || order.formName || order.documentTitle || 'LEGAL AGREEMENT & INDENTURE').toUpperCase();
      const execDate = order.legalData?.executionDate || raw.executionDate || new Date().toISOString().split('T')[0];
      const execPlace = order.legalData?.executionPlace || raw.executionPlace || state || 'New Delhi';

      const documentCategory = pickVal(raw.documentCategory, raw.rentCategory, raw.leaseCategory, rawFormData.documentCategory, prop?.premisesType);
      const purposeOfTenancy = pickVal(raw.purposeOfTenancy, raw.specificPurpose, raw.tenancyPurpose, raw.purpose, rawFormData.purposeOfTenancy);
      const stampPaperMode = pickVal(raw.stampPaperMode, raw.stampProcurementMode, raw.procurementMode, rawFormData.stampPaperMode);
      const stampDutyPaidBy = pickVal(order.stampDutyPaidBy, raw.stampDutyPaidBy, order.stampData?.stampDutyPaidBy, rawFormData.stampDutyPaidBy);

      const p1Email = pickVal(p1.email, order.clientEmail, raw.clientEmail, raw.email, raw.landlordEmail, rawFormData.email, rawFormData.clientEmail);
      const p1EntityType = pickVal(p1.entityType, raw.landlordEntityType, raw.firstPartyEntityType, rawFormData.entityType);
      const p1Aadhaar = pickVal(p1.aadhaar, p1.aadhaarNumber, p1.aadhaarLast4, raw.landlordAadhaar, rawFormData.aadhaar);
      const p1Pincode = pickVal(p1.pincode, raw.landlordPincode, rawFormData.pincode);
      const p1SignedByPoa = Boolean(p1.signedByPoa ?? raw.signedByPoa ?? rawFormData.signedByPoa);
      const p1PoaHolder = pickVal(p1.poaHolderName, raw.poaHolderName, raw.poaDetails, rawFormData.poaHolderName);
      const p1OwnershipProof = pickVal(p1.propertyOwnershipProofType, raw.propertyOwnershipProofType, raw.proofOfPropertyOwnerType, raw.ownershipProofType, rawFormData.propertyOwnershipProofType);

      const p2Email = pickVal(p2?.email, raw.tenantEmail, rawFormData.tenantEmail);
      const p2EntityType = pickVal(p2?.entityType, raw.lesseeEntityType, raw.secondPartyEntityType);
      const p2Aadhaar = pickVal(p2?.aadhaar, p2?.aadhaarNumber, p2?.aadhaarLast4, raw.tenantAadhaar);
      const p2Pincode = pickVal(p2?.pincode, raw.tenantPincode);
      const rawOccupants = p2?.occupantDetails ?? raw.occupantDetails ?? raw.familyMemberDetails ?? raw.occupants ?? rawFormData.occupantDetails;
      let formattedOccupants = '';
      if (typeof rawOccupants === 'string') {
        formattedOccupants = rawOccupants.trim();
      } else if (Array.isArray(rawOccupants)) {
        formattedOccupants = rawOccupants
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
      } else if (rawOccupants && typeof rawOccupants === 'object') {
        formattedOccupants = Object.entries(rawOccupants)
          .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
      }

      const inspection = extractCompleteOrderInspection(order as any);

      // Embed uploaded e-Stamp image across Page 1 if provided (PNG / JPEG)
      if (isOverlay && options.stampImageBase64 && typeof options.stampImageBase64 === 'string') {
        try {
          const imgMatch = options.stampImageBase64.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
          if (imgMatch && imgMatch[2]) {
            const imgBuf = Buffer.from(imgMatch[2].replace(/\s+/g, ''), 'base64');
            doc.image(imgBuf, 0, 0, { width: 595.28, height: 841.89 });
          }
        } catch {
          // If unsupported image format, continue with clean continuation offset
        }
      }

      // If in overlay mode without a scan image, show an unobtrusive guideline marker
      if (isOverlay && !options.stampImageBase64) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8');
        doc.text('— [e-STAMP CERTIFICATE CONTINUATION AREA] —', 45, startY - 18, { align: 'center', width: 505 });
        doc.moveTo(45, startY - 8).lineTo(550, startY - 8).lineWidth(0.5).stroke('#cbd5e1');
      }

      // Title
      doc.y = startY;
      doc.font('Times-Bold').fontSize(14).fillColor('#0f172a').text(docTitle, 45, doc.y, { align: 'center', width: 505 });
      doc.moveDown(0.35);

      // Sub-heading with full category, state, duty, mode, paidBy, purpose
      const subParts = [
        documentCategory || null,
        `Jurisdiction: ${state}`,
        `Stamp Duty: ₹${duty}/-`,
        stampDutyPaidBy ? `Paid By: ${stampDutyPaidBy}` : null,
        stampPaperMode ? `Mode: ${stampPaperMode}` : null
      ].filter(Boolean);
      doc.font('Times-Roman').fontSize(9).fillColor('#475569').text(subParts.join(' • '), 45, doc.y, { align: 'center', width: 505 });
      if (purposeOfTenancy) {
        doc.moveDown(0.2);
        doc.font('Times-Bold').fontSize(9).fillColor('#334155').text(`Purpose of Tenancy: ${purposeOfTenancy}`, 45, doc.y, { align: 'center', width: 505 });
      }
      doc.moveDown(0.85);

      // Recital
      if (doc.y > 730) doc.addPage();
      doc.font('Times-Roman').fontSize(10).fillColor('#1e293b').text(
        `THIS AGREEMENT / INSTRUMENT is made and entered into on this ${execDate} at ${execPlace}, ${state}, by and between:`,
        { align: 'justify' }
      );
      doc.moveDown(0.6);

      // First Party Box (including Email ID, Entity Type, Age, PAN, Aadhaar, Mobile, Address, PIN, POA, Ownership Proof)
      if (doc.y > 710) doc.addPage();
      const p1Parts: string[] = [p1.fullName || order.clientName || 'First Party'];
      if (p1EntityType) p1Parts.push(`(${p1EntityType})`);
      if (p1.relativeName) p1Parts.push(`${p1.relationshipType || 'S/o'} ${p1.relativeName}`);
      if (p1.age) p1Parts.push(`aged about ${p1.age} years`);
      if (p1.pan) p1Parts.push(`PAN: ${p1.pan}`);
      if (p1Aadhaar) p1Parts.push(`Aadhaar No.: ${p1Aadhaar.length <= 4 ? `XXXX-XXXX-${p1Aadhaar}` : p1Aadhaar}`);
      if (p1.phone || order.clientPhone) p1Parts.push(`Mobile: ${p1.phone || order.clientPhone}`);
      if (p1Email) p1Parts.push(`Email ID: ${p1Email}`);
      if (p1.address) p1Parts.push(`residing at: ${p1.address}${p1Pincode && !String(p1.address).includes(p1Pincode) ? ` - PIN: ${p1Pincode}` : ''}`);
      if (p1SignedByPoa || p1PoaHolder) p1Parts.push(`acting via POA Holder: ${p1PoaHolder || 'Authorized POA Holder'}`);
      if (p1OwnershipProof) p1Parts.push(`Property Ownership Proof: ${p1OwnershipProof}`);

      doc.font('Times-Bold').fontSize(10).fillColor('#0f172a').text('1. FIRST PARTY (Executant / Lessor / Deponent):');
      doc.font('Times-Roman').fontSize(9.5).fillColor('#334155').text(
        `${p1Parts.join(', ')}. (hereinafter referred to as the "FIRST PARTY", which expression shall include their legal heirs, executors, and administrators).`,
        { align: 'justify' }
      );
      doc.moveDown(0.6);

      // Second Party Box (when p2 exists, including Email ID, Entity Type, Age, PAN, Aadhaar, Mobile, Address, PIN, Occupants)
      if (p2 && (p2.fullName || p2.phone || p2Email || p2.address || prop)) {
        if (doc.y > 710) doc.addPage();
        const p2Parts: string[] = [p2.fullName || 'Second Party'];
        if (p2EntityType) p2Parts.push(`(${p2EntityType})`);
        if (p2.relativeName) p2Parts.push(`${p2.relationshipType || 'S/o'} ${p2.relativeName}`);
        if (p2.age) p2Parts.push(`aged about ${p2.age} years`);
        if (p2.pan) p2Parts.push(`PAN: ${p2.pan}`);
        if (p2Aadhaar) p2Parts.push(`Aadhaar No.: ${p2Aadhaar.length <= 4 ? `XXXX-XXXX-${p2Aadhaar}` : p2Aadhaar}`);
        if (p2.phone) p2Parts.push(`Mobile: ${p2.phone}`);
        if (p2Email) p2Parts.push(`Email ID: ${p2Email}`);
        if (p2.address) p2Parts.push(`residing at: ${p2.address}${p2Pincode && !String(p2.address).includes(p2Pincode) ? ` - PIN: ${p2Pincode}` : ''}`);
        if (formattedOccupants) p2Parts.push(`Permitted Occupants / Family Members: ${formattedOccupants}`);

        doc.font('Times-Bold').fontSize(10).fillColor('#0f172a').text('2. SECOND PARTY (Acceptor / Lessee / Beneficiary):');
        doc.font('Times-Roman').fontSize(9.5).fillColor('#334155').text(
          `${p2Parts.join(', ')}. (hereinafter referred to as the "SECOND PARTY", which expression shall include their legal successors and permitted assigns).`,
          { align: 'justify' }
        );
        doc.moveDown(0.75);
      }

      // Property & Lease Particulars Schedule (if applicable)
      const leaseCommencementDate = pickVal(prop?.leaseCommencementDate, raw.leaseCommencementDate, raw.commencementDate, raw.startDate, rawFormData.leaseCommencementDate);
      const leaseEndDate = pickVal(prop?.leaseEndDate, raw.leaseEndDate, raw.expiryDate, raw.endDate, rawFormData.leaseEndDate);
      const leaseTenure = pickVal(prop?.leaseTenure, prop?.agreementDurationMonths ? `${prop.agreementDurationMonths} Months` : '', raw.leaseTenure, raw.leaseDuration);
      const maintenanceCharges = pickVal(prop?.maintenanceCharges, raw.maintenanceCharges, raw.monthlyMaintenance, rawFormData.maintenanceCharges);

      if (prop || leaseCommencementDate || purposeOfTenancy) {
        if (doc.y > 690) doc.addPage();
        doc.font('Times-Bold').fontSize(10).fillColor('#0f172a').text('PREMISES & LEASE TENURE PARTICULARS:');
        doc.font('Times-Roman').fontSize(9).fillColor('#334155');
        const propLines: string[] = [];
        if (prop?.fullAddress) propLines.push(`• Rented Property Address: ${prop.fullAddress}`);
        if (prop?.premisesType || documentCategory) propLines.push(`• Premises / Category Type: ${prop?.premisesType || documentCategory}`);
        if (prop?.monthlyRentOrConsideration !== undefined && prop?.monthlyRentOrConsideration !== '') propLines.push(`• Monthly Rent / Consideration: ₹${prop.monthlyRentOrConsideration}/-`);
        if (prop?.securityDeposit !== undefined && prop?.securityDeposit !== '') propLines.push(`• Refundable Security Deposit: ₹${prop.securityDeposit}/-`);
        if (maintenanceCharges) propLines.push(`• Monthly Maintenance Charges: ${maintenanceCharges}`);
        if (leaseTenure) propLines.push(`• Lease Tenure / Duration: ${leaseTenure}`);
        if (leaseCommencementDate) propLines.push(`• Lease Commencement Date: ${leaseCommencementDate}`);
        if (leaseEndDate) propLines.push(`• Lease End / Expiry Date: ${leaseEndDate}`);
        if (prop?.lockInPeriodMonths !== undefined && prop?.lockInPeriodMonths !== '') propLines.push(`• Lock-In Period: ${prop.lockInPeriodMonths} Months`);
        if (prop?.noticePeriodDays !== undefined && prop?.noticePeriodDays !== '') propLines.push(`• Notice Period: ${prop.noticePeriodDays} Days`);
        if (prop?.utilityChargesBorneBy) propLines.push(`• Electricity / Water Utilities Borne By: ${prop.utilityChargesBorneBy}`);
        propLines.forEach((line) => doc.text(line, { align: 'left' }));
        doc.moveDown(0.7);
      }

      // Affidavit details if present
      if (aff) {
        if (doc.y > 700) doc.addPage();
        doc.font('Times-Bold').fontSize(10).fillColor('#0f172a').text('SWORN AFFIDAVIT PARTICULARS:');
        doc.font('Times-Roman').fontSize(9).fillColor('#334155');
        if (aff.deponentName) doc.text(`• Deponent: ${aff.deponentName}`);
        if (aff.reasonForAffidavit) doc.text(`• Reason / Purpose: ${aff.reasonForAffidavit}`);
        if (aff.oldName || aff.newName) doc.text(`• Former Name: ${aff.oldName || '—'}  |  New Name: ${aff.newName || '—'}`);
        if (aff.gapDuration) doc.text(`• Gap Duration: ${aff.gapDuration}`);
        if (aff.educationalInstitution) doc.text(`• Institution: ${aff.educationalInstitution}`);
        if (Array.isArray(aff.declarationStatements)) {
          aff.declarationStatements.forEach((stmt: string, i: number) => {
            doc.text(`  (${i + 1}) ${stmt}`, { align: 'justify' });
          });
        }
        doc.moveDown(0.7);
      }

      // Operative Part & Terms
      if (doc.y > 710) doc.addPage();
      doc.font('Times-Bold').fontSize(10.5).fillColor('#0f172a').text('NOW THIS AGREEMENT WITNESSETH AS UNDER:');
      doc.moveDown(0.5);

      const defaultClauses = [
        {
          title: 'PURPOSE & SCOPE',
          body: 'The First Party agrees to provide the specified property / legal rights / services to the Second Party, and the Second Party agrees to accept the same under the covenants set forth herein.'
        },
        {
          title: 'CONSIDERATION & DEPOSIT',
          body: `The agreed financial consideration / rent / security deposit stands at the value agreed upon by both parties, with the applicable stamp duty of ₹${duty}/- duly provided as per statutory norms.`
        },
        {
          title: 'COVENANTS & STATUTORY COMPLIANCE',
          body: 'Both parties agree to comply with all prevailing central, state, and municipal regulations, ensuring non-encumbrance and rightful enjoyment of privileges without breach.'
        },
        {
          title: 'DURATION & TERMINATION',
          body: 'This agreement remains in full legal effect for the agreed tenure unless terminated earlier by mutual written consent or a written notice period of not less than 30 days.'
        },
        {
          title: 'JURISDICTION & DISPUTE RESOLUTION',
          body: `Any dispute or claim arising out of or in connection with this agreement shall be settled through mutual conciliation or arbitration in accordance with Indian law, subject to the exclusive jurisdiction of the competent courts at ${execPlace}.`
        }
      ];

      const clausesToPrint = (order.legalData?.clauses && order.legalData.clauses.length > 0)
        ? order.legalData.clauses
        : (order.clauses || defaultClauses);

      clausesToPrint.forEach((cl: any, index: number) => {
        if (doc.y > 700) doc.addPage();
        const title = cl.title || `CLAUSE ${index + 1}`;
        const body = cl.body || cl.text || String(cl);
        doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text(`${index + 1}. ${title}: `, 45, doc.y, { continued: true });
        doc.font('Times-Roman').fillColor('#334155').text(body, { align: 'justify' });
        doc.moveDown(0.55);
      });

      // Checkboxes / Confirmed Declarations & Amenities
      if (inspection.checkboxes.length > 0) {
        if (doc.y > 680) doc.addPage();
        doc.moveDown(0.3);
        doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text('CONFIRMED DECLARATIONS, AMENITIES & SUBMITTED OPTIONS:');
        doc.moveDown(0.25);
        inspection.checkboxes.forEach((cb) => {
          if (doc.y > 740) doc.addPage();
          doc.font('Times-Roman').fontSize(8.8).fillColor('#334155').text(
            `${cb.checked ? '[YES]' : '[NO ]'} ${cb.label} — ${cb.checked ? 'Confirmed' : 'Not Selected'}`,
            50,
            doc.y
          );
        });
        doc.moveDown(0.6);
      }

      // Schedule of ALL Remaining Submitted Form Particulars (A-to-Z Complete Record)
      const renderedCoreKeys = new Set([
        'documentCategory', 'stateUt', 'purposeOfTenancy', 'stampPaperMode', 'stampPaperValue', 'stampDutyPaidBy',
        'executionDate', 'executionPlace', 'landlordEntityType', 'party1EntityType', 'party1FullName',
        'party1RelativeName', 'party1Age', 'party1Address', 'party1Phone', 'party1Email', 'party1Aadhaar',
        'party1Pan', 'party1Poa', 'party1PoaHolderName', 'propertyOwnershipProofType',
        'lesseeEntityType', 'party2FullName', 'party2RelativeName', 'party2Age', 'party2Address',
        'party2Phone', 'party2Email', 'party2Aadhaar', 'party2Pan', 'occupantDetails',
        'rentedPropertyAddress', 'premisesType', 'leaseTenure', 'leaseCommencementDate', 'leaseEndDate',
        'monthlyRent', 'securityDeposit', 'maintenanceCharges', 'lockInPeriodMonths', 'noticePeriodDays',
        'utilityChargesBorneBy', 'deponentName', 'reasonForAffidavit', 'oldName', 'newName',
        'gapDuration', 'educationalInstitution', 'declarationStatements'
      ]);

      const extraSubmittedEntries = inspection.sections.flatMap((sec) =>
        sec.fields
          .filter((f) => !f.isEmpty && (order.category === 'registration' || !renderedCoreKeys.has(f.key)))
          .map((f) => ({
            label: f.label,
            value: typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value)
          }))
      );

      if (extraSubmittedEntries.length > 0) {
        if (doc.y > 680) doc.addPage();
        doc.moveDown(0.3);
        doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text('SCHEDULE OF COMPLETE SUBMITTED PARTICULARS:');
        doc.moveDown(0.25);
        extraSubmittedEntries.forEach((entry) => {
          if (doc.y > 740) doc.addPage();
          doc.font('Times-Bold').fontSize(8.8).fillColor('#1e293b').text(`• ${entry.label}: `, 50, doc.y, { continued: true });
          doc.font('Times-Roman').fillColor('#334155').text(entry.value, { align: 'left' });
        });
        doc.moveDown(0.6);
      }

      // Signature Block
      if (doc.y > 620) {
        doc.addPage();
      }

      doc.moveDown(1.1);
      doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text(
        'IN WITNESS WHEREOF, the First Party and the Second Party have set their respective hands and seals hereunto on the day, month, and year first above written:'
      );
      doc.moveDown(2.2);

      const sigY = doc.y;

      // Executant Signature
      doc.moveTo(45, sigY + 15).lineTo(220, sigY + 15).lineWidth(0.8).stroke('#334155');
      doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text(p1.fullName || order.clientName || 'First Party', 45, sigY + 22);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('FIRST PARTY (Executant)', 45, sigY + 34);

      // Acceptor Signature
      doc.moveTo(375, sigY + 15).lineTo(550, sigY + 15).lineWidth(0.8).stroke('#334155');
      doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text(p2?.fullName || 'Second Party', 375, sigY + 22, { align: 'right', width: 175 });
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('SECOND PARTY (Acceptor)', 375, sigY + 34, { align: 'right', width: 175 });

      // Witness Section
      doc.y = sigY + 55;
      if (doc.y > 700) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('WITNESSES:');
      doc.font('Times-Roman').fontSize(8).fillColor('#64748b');
      const submittedWitnesses = order.legalData?.witnesses || raw.witnesses;
      if (Array.isArray(submittedWitnesses) && submittedWitnesses.length > 0) {
        submittedWitnesses.forEach((w: any, idx: number) => {
          doc.text(
            `${idx + 1}. Name: ${w.name || '_______________________'}  Address: ${w.address || '_________________________________'}${w.phone ? `  Phone: ${w.phone}` : ''}`,
            45,
            doc.y + 4
          );
        });
      } else {
        doc.text('1. Name: _______________________  Address: _________________________________', 45, doc.y + 4);
        doc.text('2. Name: _______________________  Address: _________________________________', 45, doc.y + 16);
      }

      // Add multi-page footers cleanly across every generated page
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const savedBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.moveTo(45, 795).lineTo(550, 795).lineWidth(0.5).stroke('#e2e8f0');
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text(
          `Legal Document • Order ID: ${order.id || 'CTC-2026'} • Page ${i + 1} of ${range.count}`,
          45,
          802,
          { align: 'center', width: 505, lineBreak: false }
        );
        doc.page.margins.bottom = savedBottomMargin;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Uploads a raw buffer (PDF or file) to Cloudinary or falls back to local static serving.
 * All credentials strictly read from process.env with NO hardcoded fallbacks.
 */
export async function uploadPdfToCloudinary(
  pdfBuffer: Buffer,
  orderId: string,
  fileName: string = 'legal_document.pdf'
): Promise<{ success: boolean; url: string; provider: string; publicId?: string; error?: string }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const publicId = `ctc_${orderId}_${timestamp}`;
      const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

      const formData = new FormData();
      const base64Pdf = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      formData.append('file', base64Pdf);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('public_id', publicId);
      formData.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (json.secure_url || json.url) {
        return {
          success: true,
          url: json.secure_url || json.url,
          provider: 'Cloudinary Cloud Storage',
          publicId: json.public_id
        };
      }
    } catch (err: any) {
      console.warn('Cloudinary upload error, using local secure document store:', err.message);
    }
  }

  // Local static file store
  try {
    const safeName = `ctc_${orderId}_${Date.now()}.pdf`;
    const localFilePath = path.join(LOCAL_DOCS_DIR, safeName);
    fs.writeFileSync(localFilePath, pdfBuffer);

    return {
      success: true,
      url: `/uploads/documents/${safeName}`,
      provider: 'Secure Document Store'
    };
  } catch (err: any) {
    return {
      success: true,
      url: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
      provider: 'Direct Inline Store'
    };
  }
}

export interface UploadedFileRecord {
  name: string;
  url: string;
  mimeType: string;
  kind: 'pdf' | 'image' | 'file';
  provider: string;
}

function inferMimeAndExtension(dataStr: string, hintName?: string, hintMime?: string): { mimeType: string; ext: string; kind: 'pdf' | 'image' | 'file'; rawBase64: string } {
  const dataUriMatch = dataStr.match(/^data:([^;]+);base64,(.+)$/s);
  let mimeType = hintMime || '';
  let rawBase64 = dataStr;

  if (dataUriMatch) {
    mimeType = dataUriMatch[1].toLowerCase().trim();
    rawBase64 = dataUriMatch[2].replace(/\s+/g, '');
  } else {
    rawBase64 = dataStr.replace(/\s+/g, '');
    // Detect magic bytes if raw base64
    if (!mimeType) {
      if (rawBase64.startsWith('JVBERi0')) mimeType = 'application/pdf';
      else if (rawBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
      else if (rawBase64.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
      else if (rawBase64.startsWith('UklGR')) mimeType = 'image/webp';
      else if (rawBase64.startsWith('R0lGOD')) mimeType = 'image/gif';
    }
  }

  const lowerName = (hintName || '').toLowerCase();
  if (!mimeType && lowerName.endsWith('.pdf')) mimeType = 'application/pdf';
  if (!mimeType && (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg'))) mimeType = 'image/jpeg';
  if (!mimeType && lowerName.endsWith('.png')) mimeType = 'image/png';
  if (!mimeType && lowerName.endsWith('.webp')) mimeType = 'image/webp';

  let ext = 'bin';
  let kind: 'pdf' | 'image' | 'file' = 'file';

  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    mimeType = 'application/pdf';
    ext = 'pdf';
    kind = 'pdf';
  } else if (mimeType.startsWith('image/')) {
    kind = 'image';
    const sub = mimeType.split('/')[1]?.split('+')[0] || 'png';
    ext = sub === 'jpeg' ? 'jpg' : sub;
  } else if (mimeType === 'application/msword' || lowerName.endsWith('.doc')) {
    ext = 'doc';
  } else if (mimeType.includes('wordprocessingml') || lowerName.endsWith('.docx')) {
    ext = 'docx';
  } else if (lowerName.includes('.')) {
    ext = lowerName.split('.').pop() || 'bin';
  } else {
    mimeType = mimeType || 'application/octet-stream';
  }

  return { mimeType, ext, kind, rawBase64 };
}

function classifyUrlKind(url: string, hintName?: string, hintMime?: string): { mimeType: string; kind: 'pdf' | 'image' | 'file' } {
  const target = `${url} ${hintName || ''} ${hintMime || ''}`.toLowerCase();
  if (target.includes('application/pdf') || target.includes('.pdf')) {
    return { mimeType: 'application/pdf', kind: 'pdf' };
  }
  if (
    target.includes('image/') ||
    target.includes('.png') ||
    target.includes('.jpg') ||
    target.includes('.jpeg') ||
    target.includes('.webp') ||
    target.includes('.gif')
  ) {
    return { mimeType: hintMime || 'image/jpeg', kind: 'image' };
  }
  return { mimeType: hintMime || 'application/octet-stream', kind: 'file' };
}

/**
 * Uploads an image/PDF/document file (base64 data URI, raw base64, or URL) to Cloudinary
 * or stores locally in /public/uploads/documents/ or /public/uploads/media/.
 */
export async function uploadMediaToCloudinary(
  mediaData: string,
  publicIdPrefix: string,
  options?: { fileName?: string; mimeType?: string }
): Promise<{ success: boolean; url: string; provider: string; mimeType?: string; kind?: 'pdf' | 'image' | 'file' }> {
  if (!mediaData || typeof mediaData !== 'string') {
    return { success: false, url: '', provider: 'none' };
  }

  const trimmed = mediaData.trim();

  // If already an HTTP URL or local /uploads/ path, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/')) {
    const classified = classifyUrlKind(trimmed, options?.fileName, options?.mimeType);
    return {
      success: true,
      url: trimmed,
      provider: trimmed.startsWith('/uploads/') ? 'Local Store' : 'External Remote URL',
      mimeType: classified.mimeType,
      kind: classified.kind
    };
  }

  const { mimeType, ext, kind, rawBase64 } = inferMimeAndExtension(trimmed, options?.fileName, options?.mimeType);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const publicId = `${publicIdPrefix}_${timestamp}`;
      const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

      const uploadDataUri = trimmed.startsWith('data:')
        ? trimmed
        : `data:${mimeType};base64,${rawBase64}`;

      const formData = new FormData();
      formData.append('file', uploadDataUri);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('public_id', publicId);
      formData.append('signature', signature);

      const resourceType = kind === 'image' ? 'image' : 'raw';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (json.secure_url || json.url) {
        return {
          success: true,
          url: json.secure_url || json.url,
          provider: 'Cloudinary Cloud Storage',
          mimeType,
          kind
        };
      }
    } catch (err: any) {
      console.warn('Cloudinary media upload failed, using local store:', err.message);
    }
  }

  // Local storage fallback (documents for PDFs/files, media for images)
  try {
    const safePrefix = publicIdPrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = `${safePrefix}_${Date.now()}.${ext}`;
    const targetDir = kind === 'image' ? LOCAL_MEDIA_DIR : LOCAL_DOCS_DIR;
    const urlBase = kind === 'image' ? '/uploads/media' : '/uploads/documents';
    const localFilePath = path.join(targetDir, safeName);
    fs.writeFileSync(localFilePath, Buffer.from(rawBase64, 'base64'));

    return {
      success: true,
      url: `${urlBase}/${safeName}`,
      provider: kind === 'image' ? 'Local Media Store' : 'Secure Document Store',
      mimeType,
      kind
    };
  } catch {
    return {
      success: true,
      url: trimmed.startsWith('data:') ? trimmed : `data:${mimeType};base64,${rawBase64}`,
      provider: 'Inline Media',
      mimeType,
      kind
    };
  }
}

/**
 * Recursively scans order payload for any photo/image/PDF/file/attachment fields,
 * uploads them to Cloudinary (or local store), and populates URLs & uploadedFiles.
 */
export async function processOrderMedia(
  orderData: any,
  orderId: string
): Promise<{ photoUrl: string | null; mediaUrls: string[]; uploadedFiles: UploadedFileRecord[] }> {
  const mediaUrls: string[] = [];
  const uploadedFiles: UploadedFileRecord[] = [];
  let primaryPhotoUrl: string | null = null;
  let counter = 0;

  const registerFile = (name: string, url: string, mimeType: string, kind: 'pdf' | 'image' | 'file', provider: string) => {
    if (!url) return;
    if (!mediaUrls.includes(url)) {
      mediaUrls.push(url);
    }
    if (!uploadedFiles.some((f) => f.url === url)) {
      uploadedFiles.push({ name, url, mimeType, kind, provider });
    }
    if (kind === 'image' && !primaryPhotoUrl) {
      primaryPhotoUrl = url;
    }
  };

  const isUploadableString = (val: unknown): val is string => {
    if (typeof val !== 'string') return false;
    const s = val.trim();
    if (!s) return false;
    if (s.startsWith('data:') && s.includes(';base64,')) return true;
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return /\.(pdf|png|jpe?g|webp|gif|docx?|xlsx?)(\?|$)/i.test(s) || s.includes('cloudinary.com') || s.includes('supabase');
    }
    if (s.startsWith('/uploads/')) return true;
    // Raw base64 PDF or image magic header with substantial length
    if (s.length > 100 && /^(JVBERi0|\/9j\/|iVBORw0KGgo|UklGR|R0lGOD)/.test(s)) return true;
    return false;
  };

  const uploadSingleEntry = async (
    val: string,
    labelName: string,
    hintMime?: string
  ): Promise<string> => {
    const idx = counter++;
    const res = await uploadMediaToCloudinary(val, `ctc_media_${orderId}_${idx}`, {
      fileName: labelName,
      mimeType: hintMime
    });
    if (res.success && res.url) {
      registerFile(
        labelName,
        res.url,
        res.mimeType || hintMime || 'application/octet-stream',
        res.kind || 'file',
        res.provider
      );
      return res.url;
    }
    return val;
  };

  // 1. Named top-level and party photo/file fields
  const namedFields: Array<[any, string, (url: string) => void]> = [
    [orderData.photo, 'Applicant Photo', (u) => { orderData.photo = u; }],
    [orderData.applicantPhoto, 'Applicant Photo', (u) => { orderData.applicantPhoto = u; }],
    [orderData.photoUrl, 'Primary Photo', (u) => { orderData.photoUrl = u; }],
    [orderData.signatureImage, 'Signature', (u) => { orderData.signatureImage = u; }],
    [orderData.signature, 'Signature', (u) => { orderData.signature = u; }],
    [orderData.pdf, 'Attached PDF', (u) => { orderData.pdf = u; }],
    [orderData.pdfData, 'Attached PDF', (u) => { orderData.pdfData = u; }],
    [orderData.pdfUrl, 'Attached PDF', (u) => { orderData.pdfUrl = u; }],
    [orderData.file, 'Attached File', (u) => { orderData.file = u; }],
    [orderData.fileData, 'Attached File', (u) => { orderData.fileData = u; }],
    [orderData.documentUrl, 'Attached Document', (u) => { orderData.documentUrl = u; }],
    [orderData.idProof, 'ID Proof', (u) => { orderData.idProof = u; }],
    [orderData.aadhaarFile, 'Aadhaar Document', (u) => { orderData.aadhaarFile = u; }],
    [orderData.panFile, 'PAN Document', (u) => { orderData.panFile = u; }],
    [orderData.party1?.photo, 'Party 1 Photo', (u) => { if (orderData.party1) orderData.party1.photo = u; }],
    [orderData.party1?.signature, 'Party 1 Signature', (u) => { if (orderData.party1) orderData.party1.signature = u; }],
    [orderData.party1?.idProof, 'Party 1 ID Proof', (u) => { if (orderData.party1) orderData.party1.idProof = u; }],
    [orderData.legalData?.party1?.photo, 'Party 1 Photo', (u) => { if (orderData.legalData?.party1) orderData.legalData.party1.photo = u; }],
    [orderData.party2?.photo, 'Party 2 Photo', (u) => { if (orderData.party2) orderData.party2.photo = u; }],
    [orderData.party2?.signature, 'Party 2 Signature', (u) => { if (orderData.party2) orderData.party2.signature = u; }],
    [orderData.party2?.idProof, 'Party 2 ID Proof', (u) => { if (orderData.party2) orderData.party2.idProof = u; }],
    [orderData.legalData?.party2?.photo, 'Party 2 Photo', (u) => { if (orderData.legalData?.party2) orderData.legalData.party2.photo = u; }]
  ];

  for (const [val, label, setter] of namedFields) {
    if (isUploadableString(val)) {
      const uploadedUrl = await uploadSingleEntry(val, label);
      setter(uploadedUrl);
    }
  }

  // 2. Arrays of file/attachment/photo objects or strings
  const arrayKeys = ['photos', 'attachments', 'files', 'documents', 'uploadedFiles', 'media', 'kycDocuments'];
  for (const key of arrayKeys) {
    const arr = orderData[key];
    if (!Array.isArray(arr)) continue;

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof item === 'string' && isUploadableString(item)) {
        arr[i] = await uploadSingleEntry(item, `${key}_${i + 1}`);
      } else if (item && typeof item === 'object') {
        const rawContent = item.data || item.base64 || item.content || item.fileData || item.url || item.fileUrl;
        const name = item.name || item.fileName || item.label || item.title || `${key}_${i + 1}`;
        const mime = item.mimeType || item.type || item.contentType;
        if (typeof rawContent === 'string' && (rawContent.startsWith('http') || isUploadableString(rawContent))) {
          const uploadedUrl = await uploadSingleEntry(rawContent, name, mime);
          item.url = uploadedUrl;
          delete item.data;
          delete item.base64;
          delete item.content;
          delete item.fileData;
        }
      }
    }
  }

  // 3. Registration documentChecklist items
  const checklist = orderData.registrationData?.documentChecklist || orderData.documentChecklist;
  if (Array.isArray(checklist)) {
    for (let i = 0; i < checklist.length; i++) {
      const docItem = checklist[i];
      if (!docItem || typeof docItem !== 'object') continue;
      const rawContent = docItem.data || docItem.base64 || docItem.fileData || docItem.fileUrl || docItem.url;
      if (typeof rawContent === 'string' && (rawContent.startsWith('http') || isUploadableString(rawContent))) {
        const uploadedUrl = await uploadSingleEntry(rawContent, docItem.label || docItem.name || `Checklist_${i + 1}`, docItem.mimeType);
        docItem.fileUrl = uploadedUrl;
        docItem.uploaded = true;
        delete docItem.data;
        delete docItem.base64;
        delete docItem.fileData;
      }
    }
  }

  // 4. Deep recursive sweep for any remaining base64 data URIs anywhere inside orderData (so no base64 bloats DB)
  const visited = new Set<any>();
  const sweepNested = async (node: any, keyPath: string, depth: number) => {
    if (!node || typeof node !== 'object' || depth > 5 || visited.has(node)) return;
    visited.add(node);

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === 'string' && v.startsWith('data:') && v.includes(';base64,')) {
          node[i] = await uploadSingleEntry(v, `${keyPath}_${i + 1}`);
        } else if (v && typeof v === 'object') {
          await sweepNested(v, `${keyPath}_${i}`, depth + 1);
        }
      }
      return;
    }

    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === 'string' && v.startsWith('data:') && v.includes(';base64,')) {
        node[k] = await uploadSingleEntry(v, k);
      } else if (v && typeof v === 'object') {
        await sweepNested(v, k, depth + 1);
      }
    }
  };

  await sweepNested(orderData, 'attachment', 0);

  if (primaryPhotoUrl) {
    orderData.photoUrl = primaryPhotoUrl;
  }
  orderData.mediaUrls = mediaUrls;
  orderData.uploadedFiles = uploadedFiles;

  return { photoUrl: primaryPhotoUrl, mediaUrls, uploadedFiles };
}


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
      address?: string;
      photo?: string;
    };
    party2?: {
      fullName: string;
      relativeName?: string;
      relationshipType?: string;
      pan?: string;
      aadhaarLast4?: string;
      phone?: string;
      address?: string;
      photo?: string;
    };
    propertyDetails?: {
      fullAddress?: string;
      monthlyRentOrConsideration?: number | string;
      securityDeposit?: number | string;
      agreementDurationMonths?: number | string;
    };
    clauses?: Array<{ title: string; body: string }>;
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
  options: { overlayProvision?: boolean; topBlankSpace?: number } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const isOverlay = options.overlayProvision ?? (order.overlayProvision || false);
      const startY = isOverlay ? (options.topBlankSpace || 260) : 45;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
        autoFirstPage: true,
        bufferPages: true
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const p1 = order.legalData?.party1 || order.party1 || { fullName: order.clientName || 'First Party' };
      const p2 = order.legalData?.party2 || order.party2 || { fullName: 'Second Party' };
      const state = order.legalData?.state || order.state || 'Delhi';
      const duty = Number(order.stampDutyValue || order.stampDutyAmount || 500);
      const docTitle = (order.legalData?.documentTitle || order.formName || order.documentTitle || 'LEGAL AGREEMENT & INDENTURE').toUpperCase();
      const execDate = order.legalData?.executionDate || new Date().toISOString().split('T')[0];
      const execPlace = order.legalData?.executionPlace || 'New Delhi';

      // If in overlay mode, show an unobtrusive guideline marker for where continuation text begins
      if (isOverlay) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8');
        doc.text('— [e-STAMP CERTIFICATE CONTINUATION AREA] —', 45, startY - 18, { align: 'center', width: 505 });
        doc.moveTo(45, startY - 8).lineTo(550, startY - 8).lineWidth(0.5).stroke('#cbd5e1');
      }

      // Title
      doc.y = startY;
      doc.font('Times-Bold').fontSize(14).fillColor('#0f172a').text(docTitle, 45, doc.y, { align: 'center', width: 505 });
      doc.moveDown(0.4);

      // Sub-heading
      doc.font('Times-Roman').fontSize(9.5).fillColor('#475569').text(
        `Executed under Article 35 / Schedule 1A (${state}) • Consideration Value: ₹${duty}/-`,
        45, doc.y, { align: 'center', width: 505 }
      );
      doc.moveDown(1.2);

      // Recital
      doc.font('Times-Roman').fontSize(10).fillColor('#1e293b').text(
        `THIS AGREEMENT is made and entered into on this ${execDate} at ${execPlace}, by and between:`,
        { align: 'justify' }
      );
      doc.moveDown(0.8);

      // First Party Box
      const p1Father = p1.relativeName ? ` (${p1.relationshipType || 'S/o, D/o'} ${p1.relativeName})` : '';
      const p1Pan = p1.pan ? ` having PAN: ${p1.pan}` : '';
      const p1Aadhaar = p1.aadhaarLast4 ? `, Aadhaar ending in ${p1.aadhaarLast4}` : '';
      const p1Addr = p1.address ? `, residing at: ${p1.address}` : '';

      doc.font('Times-Bold').fontSize(10).fillColor('#0f172a').text('1. FIRST PARTY (Executant / Deponent):');
      doc.font('Times-Roman').fontSize(9.5).fillColor('#334155').text(
        `${p1.fullName}${p1Father}${p1Pan}${p1Aadhaar}${p1Addr}. (hereinafter referred to as the "FIRST PARTY", which expression shall include their legal heirs, executors, and administrators).`,
        { align: 'justify' }
      );
      doc.moveDown(0.6);

      // Second Party Box
      const p2Father = p2.relativeName ? ` (${p2.relationshipType || 'S/o, D/o'} ${p2.relativeName})` : '';
      const p2Pan = p2.pan ? ` having PAN: ${p2.pan}` : '';
      const p2Aadhaar = p2.aadhaarLast4 ? `, Aadhaar ending in ${p2.aadhaarLast4}` : '';
      const p2Addr = p2.address ? `, residing at: ${p2.address}` : '';

      doc.font('Times-Bold').fontSize(10).fillColor('#0f172a').text('2. SECOND PARTY (Acceptor / Beneficiary):');
      doc.font('Times-Roman').fontSize(9.5).fillColor('#334155').text(
        `${p2.fullName || 'Second Party'}${p2Father}${p2Pan}${p2Aadhaar}${p2Addr}. (hereinafter referred to as the "SECOND PARTY", which expression shall include their legal successors and permitted assigns).`,
        { align: 'justify' }
      );
      doc.moveDown(1);

      // Operative Part & Terms
      doc.font('Times-Bold').fontSize(10.5).fillColor('#0f172a').text('NOW THIS AGREEMENT WITNESSETH AS UNDER:');
      doc.moveDown(0.6);

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
        // If getting near page bottom, auto add page
        if (doc.y > 680) {
          doc.addPage();
        }

        const title = cl.title || `CLAUSE ${index + 1}`;
        const body = cl.body || cl.text || String(cl);

        doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text(`${index + 1}. ${title}: `, 45, doc.y, { continued: true });
        doc.font('Times-Roman').fillColor('#334155').text(body, { align: 'justify' });
        doc.moveDown(0.6);
      });

      // Signature Block
      if (doc.y > 640) {
        doc.addPage();
      }

      doc.moveDown(1.5);
      doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text(
        'IN WITNESS WHEREOF, the First Party and the Second Party have set their respective hands and seals hereunto on the day, month, and year first above written:'
      );
      doc.moveDown(2.5);

      const sigY = doc.y;

      // Executant Signature
      doc.moveTo(45, sigY + 15).lineTo(220, sigY + 15).lineWidth(0.8).stroke('#334155');
      doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text(p1.fullName, 45, sigY + 22);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('FIRST PARTY (Executant)', 45, sigY + 34);

      // Acceptor Signature
      doc.moveTo(375, sigY + 15).lineTo(550, sigY + 15).lineWidth(0.8).stroke('#334155');
      doc.font('Times-Bold').fontSize(9.5).fillColor('#0f172a').text(p2.fullName || 'Second Party', 375, sigY + 22, { align: 'right', width: 175 });
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('SECOND PARTY (Acceptor)', 375, sigY + 34, { align: 'right', width: 175 });

      // Witness Section
      doc.y = sigY + 55;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('WITNESSES:');
      doc.font('Times-Roman').fontSize(8).fillColor('#64748b');
      doc.text('1. Name: _______________________  Address: _________________________________', 45, doc.y + 4);
      doc.text('2. Name: _______________________  Address: _________________________________', 45, doc.y + 16);

      // Clean footer
      doc.y = 750;
      doc.moveTo(45, 750).lineTo(550, 750).lineWidth(0.5).stroke('#e2e8f0');
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text(
        `Legal Document • Order ID: ${order.id || 'CTC-2026'} • e-Stamp Ready Continuation Format`,
        45, 756, { align: 'center', width: 505 }
      );

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


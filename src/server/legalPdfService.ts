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

/**
 * Uploads an image/media file (base64 string or binary) to Cloudinary
 * or stores locally in /public/uploads/media/.
 */
export async function uploadMediaToCloudinary(
  mediaData: string,
  publicIdPrefix: string
): Promise<{ success: boolean; url: string; provider: string }> {
  if (!mediaData || typeof mediaData !== 'string') {
    return { success: false, url: '', provider: 'none' };
  }

  // If already an HTTP URL, return as-is
  if (mediaData.startsWith('http://') || mediaData.startsWith('https://')) {
    return { success: true, url: mediaData, provider: 'External Remote URL' };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const publicId = `${publicIdPrefix}_${timestamp}`;
      const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

      const formData = new FormData();
      formData.append('file', mediaData);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('public_id', publicId);
      formData.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (json.secure_url || json.url) {
        return {
          success: true,
          url: json.secure_url || json.url,
          provider: 'Cloudinary Cloud Storage'
        };
      }
    } catch (err: any) {
      console.warn('Cloudinary media upload failed, using local media store:', err.message);
    }
  }

  // Local storage fallback for media
  try {
    let cleanBase64 = mediaData;
    let ext = 'png';

    const match = mediaData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (match) {
      ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      cleanBase64 = match[2];
    }

    const safeName = `${publicIdPrefix}_${Date.now()}.${ext}`;
    const localFilePath = path.join(LOCAL_MEDIA_DIR, safeName);
    fs.writeFileSync(localFilePath, Buffer.from(cleanBase64, 'base64'));

    return {
      success: true,
      url: `/uploads/media/${safeName}`,
      provider: 'Local Media Store'
    };
  } catch (err: any) {
    return {
      success: true,
      url: mediaData, // Return data URL if saving fails
      provider: 'Inline Media'
    };
  }
}

/**
 * Recursively scans order payload for any photo/image/media fields,
 * uploads them to Cloudinary (or local store), and populates URLs.
 */
export async function processOrderMedia(orderData: any, orderId: string): Promise<{ photoUrl: string | null; mediaUrls: string[] }> {
  const mediaUrls: string[] = [];
  let primaryPhotoUrl: string | null = null;

  // Check top-level photo/applicantPhoto
  const potentialPhotos = [
    orderData.photo,
    orderData.applicantPhoto,
    orderData.photoUrl,
    orderData.signatureImage,
    orderData.party1?.photo,
    orderData.legalData?.party1?.photo,
    orderData.party2?.photo,
    orderData.legalData?.party2?.photo
  ].filter(Boolean);

  for (let i = 0; i < potentialPhotos.length; i++) {
    const photo = potentialPhotos[i];
    if (photo && typeof photo === 'string') {
      const uploadRes = await uploadMediaToCloudinary(photo, `ctc_media_${orderId}_${i}`);
      if (uploadRes.success && uploadRes.url) {
        mediaUrls.push(uploadRes.url);
        if (!primaryPhotoUrl) {
          primaryPhotoUrl = uploadRes.url;
        }
      }
    }
  }

  // Check photos array if provided
  if (Array.isArray(orderData.photos)) {
    for (let i = 0; i < orderData.photos.length; i++) {
      const p = orderData.photos[i];
      if (p && typeof p === 'string') {
        const uploadRes = await uploadMediaToCloudinary(p, `ctc_photo_${orderId}_${i}`);
        if (uploadRes.success && uploadRes.url) {
          mediaUrls.push(uploadRes.url);
          if (!primaryPhotoUrl) {
            primaryPhotoUrl = uploadRes.url;
          }
        }
      }
    }
  }

  // Check attachments array if provided
  if (Array.isArray(orderData.attachments)) {
    for (let i = 0; i < orderData.attachments.length; i++) {
      const att = orderData.attachments[i];
      if (att && att.data && typeof att.data === 'string') {
        const uploadRes = await uploadMediaToCloudinary(att.data, `ctc_att_${orderId}_${i}`);
        if (uploadRes.success && uploadRes.url) {
          att.url = uploadRes.url;
          delete att.data; // clean base64
          mediaUrls.push(uploadRes.url);
        }
      }
    }
  }

  // Update orderData with uploaded URLs
  if (primaryPhotoUrl) {
    orderData.photoUrl = primaryPhotoUrl;
    if (orderData.photo && orderData.photo.startsWith('data:')) {
      orderData.photo = primaryPhotoUrl;
    }
    if (orderData.party1 && orderData.party1.photo && orderData.party1.photo.startsWith('data:')) {
      orderData.party1.photo = primaryPhotoUrl;
    }
  }
  orderData.mediaUrls = mediaUrls;

  return { photoUrl: primaryPhotoUrl, mediaUrls };
}

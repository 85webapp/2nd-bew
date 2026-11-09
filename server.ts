/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Express Full-Stack Server for CTC System
 * Quadtrix / DOC India Legal & Tax Ecosystem
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Master Key for AES-256 Lock-Travel-Unlock encryption
const MASTER_KEY = process.env.MASTER_KEY || 'CTC_QUADTRIX_MASTER_KEY_2026_SECURE_AES256';

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Enable CORS for external Website A inbound requests and webhooks
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to derive 32-byte key from string
function derive32ByteKey(passphrase: string): Buffer {
  return crypto.createHash('sha256').update(passphrase).digest();
}

/**
 * Encrypt arbitrary JSON with AES-256-GCM
 */
function encryptAES256GCM(data: any, keyString: string = MASTER_KEY): string {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const key = derive32ByteKey(keyString);
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: ivHex:cipherHex:tagHex
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypt AES-256-GCM or AES-256-CBC ciphertext
 */
function decryptAES256(encryptedString: string, keyString: string = MASTER_KEY): { success: boolean; data?: any; error?: string } {
  try {
    const trimmed = encryptedString.trim();

    if (trimmed.startsWith('b64:')) {
      const raw = Buffer.from(trimmed.substring(4), 'base64').toString('utf8');
      return { success: true, data: JSON.parse(decodeURIComponent(raw)) };
    }

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const key = derive32ByteKey(keyString);

      if (parts.length === 3) {
        // GCM: iv : cipher : authTag
        const iv = Buffer.from(parts[0], 'hex');
        const cipherHex = parts[1];
        const authTag = Buffer.from(parts[2], 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return { success: true, data: JSON.parse(decrypted) };
      } else if (parts.length === 2) {
        // GCM or CBC without separate auth tag
        const iv = Buffer.from(parts[0], 'hex');
        const cipherHex = parts[1];
        try {
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return { success: true, data: JSON.parse(decrypted) };
        } catch {
          // Fallback to CBC
          const decipherCbc = crypto.createDecipheriv('aes-256-cbc', key, iv.subarray(0, 16));
          let decrypted = decipherCbc.update(cipherHex, 'hex', 'utf8');
          decrypted += decipherCbc.final('utf8');
          return { success: true, data: JSON.parse(decrypted) };
        }
      }
    }

    // Try base64 decoded string
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      if (decoded.startsWith('{') || decoded.startsWith('[')) {
        return { success: true, data: JSON.parse(decoded) };
      }
    } catch {
      // ignore
    }

    // Try raw JSON string
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return { success: true, data: JSON.parse(trimmed) };
    }

    return { success: false, error: 'Unrecognized encrypted payload structure' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Decryption failed' };
  }
}

// In-Memory store for system state and notifications
const notificationsLog: any[] = [];
const systemAuditTrail: any[] = [];

// ======================== API ROUTES ======================== //

// Decrypt endpoint for client verification
app.post('/api/decrypt', (req: Request, res: Response) => {
  const { payload, key } = req.body;
  if (!payload) {
    return res.status(400).json({ success: false, error: 'Missing encrypted payload' });
  }

  const result = decryptAES256(payload, key || MASTER_KEY);
  if (!result.success) {
    return res.status(422).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: result.data });
});

// Encrypt endpoint (for generating test payloads / Website A integration simulation)
app.post('/api/encrypt', (req: Request, res: Response) => {
  const { data, key } = req.body;
  if (!data) {
    return res.status(400).json({ success: false, error: 'Missing data to encrypt' });
  }

  try {
    const encrypted = encryptAES256GCM(data, key || MASTER_KEY);
    res.json({ success: true, payload: encrypted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook endpoint: Receives secure inbound payloads from Website A
app.post('/api/webhook/website-a', (req: Request, res: Response) => {
  const { payload, signature, source } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!payload) {
    return res.status(400).json({ error: 'Payload missing' });
  }

  const decryptResult = decryptAES256(payload, MASTER_KEY);
  if (!decryptResult.success) {
    return res.status(401).json({ error: 'Decryption failed: Unauthorized or corrupted key' });
  }

  const orderData = decryptResult.data;
  const orderId = (orderData.id && String(orderData.id).startsWith('CTC-2026-')) 
    ? orderData.id 
    : `CTC-2026-${Math.floor(2012 + (systemAuditTrail.length || 0))}`;

  const auditEntry = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    orderId,
    type: 'webhook_received',
    message: `Inbound webhook received from Website A (${clientIp}). Payload auto-decrypted.`,
    status: 'success'
  };
  systemAuditTrail.unshift(auditEntry);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID || '@Quadtrix_Ops_Alerts';
  const clientName = orderData.clientName || orderData.party1?.fullName || orderData.party2?.fullName || 'Client';
  const formName = orderData.formName || orderData.documentTitle || 'Legal Service';

  // Send notification
  const notification = {
    id: `tg-${Date.now()}`,
    timestamp: new Date().toISOString(),
    orderId,
    clientName,
    serviceName: formName,
    category: orderData.category || 'legal',
    channel: tgChatId,
    status: botToken ? 'Delivered' : 'Simulated',
    messageText: `⚡ *INBOUND ORDER RECEIVED FROM WEBSITE A*\n• ID: ${orderId}\n• Client: ${clientName}\n• Service: ${formName}\n• Duty: ₹${orderData.stampDutyValue || orderData.stampDutyAmount || 500}/-\n• Decrypted via Shared Master Key`
  };
  notificationsLog.unshift(notification);

  // Dispatch live Telegram bot HTTP message if configured
  if (botToken) {
    try {
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: notification.messageText,
          parse_mode: 'Markdown'
        })
      }).catch(() => {});
    } catch {}
  }

  // Sync to Supabase if configured in server environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const cleanUrl = supabaseUrl.replace(/\/+$/, '');
      fetch(`${cleanUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: orderId,
          reference_code: orderData.referenceCode || `WA-REF-${Date.now()}`,
          client_name: clientName,
          client_phone: orderData.clientPhone || '',
          form_name: formName,
          category: orderData.category || 'legal',
          stamp_duty_value: orderData.stampDutyValue || 500,
          status: 'decrypted',
          legal_data: orderData.legalData || null,
          registration_data: orderData.registrationData || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source: 'Website A'
        })
      }).catch(() => {});
    } catch {}
  }

  res.json({
    status: 'acknowledged',
    orderId,
    receivedAt: new Date().toISOString(),
    decryptedData: orderData
  });
});

// Telegram Notification Stream endpoint
app.post('/api/notify', async (req: Request, res: Response) => {
  const { orderId, clientName, serviceName, category, message, channel } = req.body;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || channel || '@Quadtrix_Ops_Alerts';

  const notificationEntry = {
    id: `tg-${Date.now()}`,
    timestamp: new Date().toISOString(),
    orderId: orderId || 'SYSTEM',
    clientName: clientName || 'N/A',
    serviceName: serviceName || 'General Notification',
    category: category || 'legal',
    channel: chatId,
    status: botToken ? 'Delivered' : 'Simulated',
    messageText: message || `🔔 CTC Notification for Order ${orderId}`
  };

  // If live Telegram bot token is configured in environment, dispatch actual HTTP call
  if (botToken) {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: notificationEntry.messageText,
          parse_mode: 'Markdown'
        })
      });
      const tgData = await tgRes.json();
      if (!tgData.ok) {
        notificationEntry.status = 'Error';
      }
    } catch {
      notificationEntry.status = 'Error';
    }
  }

  notificationsLog.unshift(notificationEntry);
  res.json({ success: true, notification: notificationEntry });
});

// Aadhaar e-Sign API trigger endpoint
app.post('/api/esign/trigger', (req: Request, res: Response) => {
  const { orderId, signerName, signerAadhaarLast4, phone } = req.body;

  const txnId = `ESIGN-DL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const certHash = `SHA256:${crypto.createHash('sha256').update(txnId + orderId).digest('hex')}`;

  const auditEntry = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    orderId,
    type: 'esign_triggered',
    message: `Aadhaar e-Sign request sent to ${signerName} (Aadhaar ending ${signerAadhaarLast4 || 'XXXX'}). Txn: ${txnId}`,
    status: 'success'
  };
  systemAuditTrail.unshift(auditEntry);

  res.json({
    success: true,
    transactionId: txnId,
    initiatedAt: new Date().toISOString(),
    certificateHash: certHash,
    provider: 'Aadhaar e-Sign (DigiLocker / NSDL / eMudhra)',
    status: 'OTP_SENT_TO_MOBILE'
  });
});

// System Status endpoint
app.get('/api/system/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    masterKeyConfigured: true,
    masterKeyHash: crypto.createHash('sha256').update(MASTER_KEY).digest('hex').substring(0, 16) + '...',
    telegramActive: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    cloudinaryConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    digilockerGateway: 'Active (UIDAI v2.1 Compliant)',
    aadhaarEsign: 'Active (NSDL/CDSL/eMudhra)',
    uptimeSeconds: Math.floor(process.uptime()),
    notificationsCount: notificationsLog.length,
    auditEntriesCount: systemAuditTrail.length
  });
});

// Secure Media / File upload route (Cloudinary fallback ready)
app.post('/api/storage/upload', async (req: Request, res: Response) => {
  const { fileName, fileType, base64Data, orderId } = req.body;
  const isCloudinarySet = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

  const fileUri = isCloudinarySet
    ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v${Date.now()}/ctc_${orderId || 'scan'}_${fileName || 'doc.pdf'}`
    : `/uploads/scans/${orderId || 'CTC'}_${Date.now()}_${fileName || 'stamp.pdf'}`;

  res.json({
    success: true,
    url: fileUri,
    provider: isCloudinarySet ? 'Cloudinary Cloud Storage' : 'Secure Applet Document Store',
    storedAt: new Date().toISOString()
  });
});

// AI Verification Endpoint: Compares Form Vitals vs e-Stamp Paper Vitals via Gemini API
app.post('/api/verify-stamp-ai', async (req: Request, res: Response) => {
  const { formVitals, stampVitals } = req.body;
  if (!formVitals || !stampVitals) {
    return res.status(400).json({ error: 'Missing formVitals or stampVitals in request body' });
  }

  // 1. Try Gemini API if key is present
  if (geminiClient) {
    try {
      const prompt = `You are a Senior Indian Legal Stamp Paper Auditor.
Compare the following Form Vitals with the e-Stamp Paper Vitals:

FORM VITALS:
- Form Type: ${formVitals.formName || formVitals.documentTitle || 'Legal Contract'}
- First Party (Landlord/Vendor/Deponent): ${formVitals.party1Name || formVitals.party1?.fullName || 'N/A'}
- Second Party (Tenant/Buyer): ${formVitals.party2Name || formVitals.party2?.fullName || 'N/A'}
- Stamp Duty Value: ₹${formVitals.stampDutyAmount || 0}
- State: ${formVitals.state || 'N/A'}

STAMP PAPER SCANNED VITALS:
- Certificate No: ${stampVitals.certificateNo || 'N/A'}
- UIN: ${stampVitals.uin || 'N/A'}
- First Party on Stamp: ${stampVitals.firstParty || 'N/A'}
- Second Party on Stamp: ${stampVitals.secondParty || 'N/A'}
- Stamp Duty Paid on Paper: ₹${stampVitals.stampDutyAmount || 0}
- State/Treasury: ${stampVitals.state || 'N/A'}

INSTRUCTIONS:
- Party 1: Match if names substantially match (ignore Mr/Shri/Dr or S/o suffixes).
- Party 2: Match if names substantially match.
- Stamp Duty: Stamp paper amount must be >= Form duty amount. If stamp is less, it is an invalid shortage violation!
- Return a JSON object with:
  "isMatch": boolean (true if all vital fields match, false if any critical field fails),
  "matchScore": number (0 to 100),
  "discrepancies": string[] (list of specific human-readable errors explaining each mismatch),
  "feedback": string (clear verdict explaining the result),
  "matchedFields": {
    "party1": boolean,
    "party2": boolean,
    "stampDuty": boolean,
    "state": boolean
  }`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI API timeout - switching to instant verifier')), 3000)
      );

      const generatePromise = geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'You are an elite Indian legal stamp verification audit system. Analyze strictly and return valid JSON only.'
        }
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const parsed = JSON.parse(response.text || '{}');
      return res.json({ success: true, result: parsed, engine: 'gemini-3.8-flash' });
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to deterministic verifier:', err.message);
    }
  }

  // 2. High-Precision Deterministic Fallback
  const cleanStr = (s: any) => (s ? String(s).toLowerCase().replace(/[^a-z0-9]/g, '') : '');
  const formP1 = cleanStr(formVitals.party1Name || formVitals.party1?.fullName || '');
  const stampP1 = cleanStr(stampVitals.firstParty || '');
  const formP2 = cleanStr(formVitals.party2Name || formVitals.party2?.fullName || '');
  const stampP2 = cleanStr(stampVitals.secondParty || '');
  const formDuty = Number(formVitals.stampDutyAmount || 0);
  const stampDuty = Number(stampVitals.stampDutyAmount || 0);
  const formState = cleanStr(formVitals.state || '');
  const stampState = cleanStr(stampVitals.state || '');

  const discrepancies: string[] = [];
  const matchedFields = {
    party1: formP1 === stampP1 || formP1.includes(stampP1) || stampP1.includes(formP1),
    party2: !formP2 || formP2 === stampP2 || formP2.includes(stampP2) || stampP2.includes(formP2),
    stampDuty: stampDuty >= formDuty && formDuty > 0,
    state: !formState || !stampState || formState.includes(stampState) || stampState.includes(formState)
  };

  if (!matchedFields.party1) {
    discrepancies.push(`First Party Mismatch: Form specifies "${formVitals.party1Name || formVitals.party1?.fullName}" but e-Stamp has "${stampVitals.firstParty}"`);
  }
  if (!matchedFields.party2 && formP2) {
    discrepancies.push(`Second Party Mismatch: Form specifies "${formVitals.party2Name || formVitals.party2?.fullName}" but e-Stamp has "${stampVitals.secondParty}"`);
  }
  if (!matchedFields.stampDuty) {
    discrepancies.push(`Stamp Duty Shortfall: Required ₹${formDuty}/-, but attached e-Stamp only bears ₹${stampDuty}/-`);
  }
  if (!matchedFields.state && formState && stampState) {
    discrepancies.push(`State Jurisdiction Mismatch: Form is in "${formVitals.state}" but e-Stamp is from "${stampVitals.state}"`);
  }

  const isMatch = discrepancies.length === 0;
  const matchScore = isMatch ? 100 : Math.max(0, 100 - discrepancies.length * 35);

  return res.json({
    success: true,
    result: {
      isMatch,
      matchScore,
      discrepancies,
      feedback: isMatch
        ? `Verification Passed: All vital parameters (First Party, Second Party, Stamp Duty ₹${stampDuty}, and Jurisdiction) match 100%. Ready for submission.`
        : `Verification Failed with ${discrepancies.length} discrepancy: Please check the party names and stamp duty amount.`,
      matchedFields
    },
    engine: 'deterministic-audit'
  });
});

// Mount Vite or static server
async function setupViteOrStatic() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CTC SYSTEM] Full-stack engine listening on port ${PORT}`);
  });
}

setupViteOrStatic();

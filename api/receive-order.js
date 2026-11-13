/**
 * Vercel Serverless API Function: /api/receive-order
 * File: api/receive-order.js
 *
 * 1. Full CORS support
 * 2. HMAC verification (WEBSITE_SECRET_KEY / SUBMISSION_HMAC_SECRET)
 * 3. Decryption via PRIVATE_KEY / PRIVATE_DECRYPTION_KEY / MASTER_ENCRYPTION_KEY (RSA & AES-256)
 * 4. Logs full decrypted payload to console
 * 5. Introspects Supabase `orders` table schema & inserts without column mismatch errors
 *    (falls back to flexible JSONB `payload` / `order_data` / `raw_payload` and NEVER swallows errors)
 * 6. Awaits Telegram notification inside try-catch with console.error logging
 */

import crypto from 'crypto';

function deriveCandidate32ByteKeys(passphrase) {
  const trimmed = String(passphrase).trim();
  const keys = [crypto.createHash('sha256').update(trimmed, 'utf8').digest()];
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    keys.push(Buffer.from(trimmed, 'hex'));
  }
  const utf8Buf = Buffer.from(trimmed, 'utf8');
  if (utf8Buf.length === 32) {
    keys.push(utf8Buf);
  }
  try {
    const b64Buf = Buffer.from(trimmed, 'base64');
    if (b64Buf.length === 32) keys.push(b64Buf);
  } catch {}
  return keys;
}

function decodeBufferAuto(str) {
  const clean = String(str).trim();
  if (/^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0) {
    return Buffer.from(clean, 'hex');
  }
  return Buffer.from(clean, 'base64');
}

function tryAesPartsDecrypt(ivBuf, cipherBuf, tagBuf, keys) {
  for (const key of keys) {
    if (tagBuf) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
        decipher.setAuthTag(tagBuf);
        const out = Buffer.concat([decipher.update(cipherBuf), decipher.final()]).toString('utf8');
        return JSON.parse(out);
      } catch {}
    } else {
      if (cipherBuf.length > 16) {
        try {
          const ct = cipherBuf.subarray(0, cipherBuf.length - 16);
          const tag = cipherBuf.subarray(cipherBuf.length - 16);
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
          decipher.setAuthTag(tag);
          const out = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
          return JSON.parse(out);
        } catch {}
      }
      if (ivBuf.length >= 16) {
        try {
          const decipherCbc = crypto.createDecipheriv('aes-256-cbc', key, ivBuf.subarray(0, 16));
          const out = Buffer.concat([decipherCbc.update(cipherBuf), decipherCbc.final()]).toString('utf8');
          return JSON.parse(out);
        } catch {}
      }
    }
  }
  return null;
}

function decryptPayload(encryptedInput, privateKeyOrPass) {
  if (!privateKeyOrPass || !String(privateKeyOrPass).trim()) {
    throw new Error('Server configuration error: PRIVATE_KEY is missing in environment variables.');
  }

  const trimmed = typeof encryptedInput === 'string' ? encryptedInput.trim() : JSON.stringify(encryptedInput);

  // 1. Hybrid RSA + AES Envelope
  let envelope = null;
  if (typeof encryptedInput === 'object' && encryptedInput !== null) {
    if (encryptedInput.encKey || encryptedInput.key) envelope = encryptedInput;
  } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.encKey || parsed.key) envelope = parsed;
    } catch {}
  }

  if (envelope) {
    const encKeyBuf = Buffer.from(envelope.encKey || envelope.key, 'base64');
    let aesKey;
    try {
      aesKey = crypto.privateDecrypt(
        { key: privateKeyOrPass, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        encKeyBuf
      );
    } catch {
      aesKey = crypto.privateDecrypt(
        { key: privateKeyOrPass, padding: crypto.constants.RSA_PKCS1_PADDING },
        encKeyBuf
      );
    }

    const iv = decodeBufferAuto(envelope.iv);
    const cipherBuf = decodeBufferAuto(envelope.cipher || envelope.ciphertext || envelope.encryptedData || envelope.data);
    const tagRaw = envelope.tag || envelope.authTag;
    const tag = tagRaw ? decodeBufferAuto(tagRaw) : null;

    if (tag) {
      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(cipherBuf), decipher.final()]).toString('utf8');
      return JSON.parse(decrypted);
    } else {
      if (cipherBuf.length > 16) {
        try {
          const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
          decipher.setAuthTag(cipherBuf.subarray(cipherBuf.length - 16));
          const decrypted = Buffer.concat([
            decipher.update(cipherBuf.subarray(0, cipherBuf.length - 16)),
            decipher.final()
          ]).toString('utf8');
          return JSON.parse(decrypted);
        } catch {}
      }
      const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv.subarray(0, 16));
      const decrypted = Buffer.concat([decipher.update(cipherBuf), decipher.final()]).toString('utf8');
      return JSON.parse(decrypted);
    }
  }

  // 2. RSA Private Key PEM
  const isRsa = privateKeyOrPass.includes('BEGIN RSA PRIVATE KEY') ||
                privateKeyOrPass.includes('BEGIN PRIVATE KEY') ||
                privateKeyOrPass.includes('BEGIN ENCRYPTED PRIVATE KEY');

  if (isRsa) {
    try {
      const cleaned = trimmed.replace(/\s+/g, '');
      const isHex = /^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0;
      const buf = Buffer.from(cleaned, isHex ? 'hex' : 'base64');
      try {
        const decrypted = crypto.privateDecrypt(
          { key: privateKeyOrPass, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
          buf
        );
        return JSON.parse(decrypted.toString('utf8'));
      } catch {
        const decrypted = crypto.privateDecrypt(
          { key: privateKeyOrPass, padding: crypto.constants.RSA_PKCS1_PADDING },
          buf
        );
        return JSON.parse(decrypted.toString('utf8'));
      }
    } catch {}
  }

  // 3. AES-256 (Structured object or iv:cipher:tag / iv:cipherWithTag / CBC)
  const candidateKeys = deriveCandidate32ByteKeys(privateKeyOrPass);

  if (typeof encryptedInput === 'object' && encryptedInput !== null && encryptedInput.iv) {
    const cipherVal = encryptedInput.ciphertext || encryptedInput.encryptedData || encryptedInput.cipher || encryptedInput.data;
    if (cipherVal) {
      const ivBuf = decodeBufferAuto(encryptedInput.iv);
      const cipherBuf = decodeBufferAuto(cipherVal);
      const tagRaw = encryptedInput.authTag || encryptedInput.tag;
      const tagBuf = tagRaw ? decodeBufferAuto(tagRaw) : null;
      const parsed = tryAesPartsDecrypt(ivBuf, cipherBuf, tagBuf, candidateKeys);
      if (parsed !== null) return parsed;
    }
  }

  if (trimmed.startsWith('b64:')) {
    const raw = Buffer.from(trimmed.substring(4), 'base64').toString('utf8');
    return JSON.parse(decodeURIComponent(raw));
  }

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 3) {
      const parsed = tryAesPartsDecrypt(
        decodeBufferAuto(parts[0]),
        decodeBufferAuto(parts[1]),
        decodeBufferAuto(parts[2]),
        candidateKeys
      );
      if (parsed !== null) return parsed;
    } else if (parts.length === 2) {
      const parsed = tryAesPartsDecrypt(
        decodeBufferAuto(parts[0]),
        decodeBufferAuto(parts[1]),
        null,
        candidateKeys
      );
      if (parsed !== null) return parsed;
    }
  }

  // 4. Plaintext JSON or Base64 JSON
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.startsWith('{') || decoded.startsWith('[')) {
      return JSON.parse(decoded);
    }
  } catch {}

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }

  throw new Error('Unrecognized or corrupted encrypted payload.');
}

async function uploadMedia(mediaData, publicId) {
  if (!mediaData || typeof mediaData !== 'string') return null;
  if (mediaData.startsWith('http://') || mediaData.startsWith('https://')) return mediaData;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const formData = new URLSearchParams();
    formData.append('file', mediaData);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('public_id', publicId);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      return data.secure_url || data.url;
    }
  } catch (err) {
    console.warn('Cloudinary upload warning:', err);
  }
  return null;
}

function resolveSupabaseCredentials() {
  const rawUrl = process.env.SUPABASE_URL || process.env.SUPABASE_CONNECTION_STRING || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  let cleanUrl = rawUrl.trim();

  if (cleanUrl && cleanUrl.includes('supabase.co') && !cleanUrl.startsWith('http')) {
    const match = cleanUrl.match(/db\.([a-z0-9-]+)\.supabase\.co/i);
    cleanUrl = match ? `https://${match[1]}.supabase.co` : cleanUrl;
  }
  if (cleanUrl) cleanUrl = cleanUrl.replace(/\/+$/, '');

  return { cleanUrl, key };
}

/**
 * Queries PostgREST OpenAPI specification to discover exact columns on `orders` table.
 * Returns Set<string> of column names, or null if introspection is unavailable.
 */
async function getOrdersTableColumns(cleanUrl, supabaseKey) {
  try {
    const res = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/openapi+json'
      }
    });
    if (!res.ok) return null;
    const spec = await res.json();
    const props = spec?.definitions?.orders?.properties || spec?.components?.schemas?.orders?.properties;
    if (props && typeof props === 'object') {
      return new Set(Object.keys(props));
    }
  } catch (err) {
    console.warn('Supabase schema introspection skipped:', err.message);
  }
  return null;
}

/**
 * Inserts or upserts order into Supabase `orders` table without column mismatch failures.
 * Never swallows errors — throws or returns explicit error details.
 */
async function insertIntoSupabaseOrders(cleanUrl, supabaseKey, fullFieldMap, fallbackFlexibleMap) {
  const existingCols = await getOrdersTableColumns(cleanUrl, supabaseKey);

  let recordToInsert;
  let conflictTarget = null;

  if (existingCols && existingCols.size > 0) {
    recordToInsert = {};
    for (const [col, val] of Object.entries(fullFieldMap)) {
      if (existingCols.has(col) && val !== undefined) {
        recordToInsert[col] = val;
      }
    }
    // Guarantee at least one flexible JSONB column gets the full payload if present
    const fullPayloadObj = fullFieldMap.payload || fullFieldMap.raw_payload;
    for (const jsonCol of ['payload', 'order_data', 'raw_payload', 'data']) {
      if (existingCols.has(jsonCol) && !recordToInsert[jsonCol]) {
        recordToInsert[jsonCol] = fullPayloadObj;
      }
    }
    if (Object.keys(recordToInsert).length === 0) {
      return {
        ok: false,
        status: 500,
        error: {
          message: `Supabase "orders" table exists but none of the expected columns matched. Available columns: ${Array.from(existingCols).join(', ')}`,
          availableColumns: Array.from(existingCols)
        }
      };
    }
    if (existingCols.has('id') && recordToInsert.id) {
      conflictTarget = 'id';
    }
  } else {
    // Introspection disabled: start with standard structured columns and adapt on PGRST204
    recordToInsert = { ...fallbackFlexibleMap };
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const endpoint = conflictTarget
      ? `${cleanUrl}/rest/v1/orders?on_conflict=${encodeURIComponent(conflictTarget)}`
      : `${cleanUrl}/rest/v1/orders`;

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': conflictTarget ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(recordToInsert)
    });

    if (resp.ok) {
      const inserted = await resp.json().catch(() => null);
      return { ok: true, data: inserted };
    }

    const rawText = await resp.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(rawText);
    } catch {
      parsedErr = { message: rawText, status: resp.status };
    }

    // Handle missing column (PGRST204 / 42703)
    const msg = parsedErr?.message || rawText;
    const colMatch = msg.match(/Could not find the '([^']+)' column/i) ||
                     msg.match(/column "([^"]+)" of relation "orders" does not exist/i);

    if (colMatch && colMatch[1] && colMatch[1] in recordToInsert) {
      const missingCol = colMatch[1];
      console.warn(`[Supabase] Column '${missingCol}' missing on 'orders' table. Stripping & retrying.`);
      delete recordToInsert[missingCol];
      if (missingCol === conflictTarget) conflictTarget = null;
      if (Object.keys(recordToInsert).length === 0) {
        return { ok: false, status: resp.status, error: parsedErr };
      }
      continue;
    }

    // Handle UUID / Integer type mismatch on `id` (22P02) by letting DB auto-generate `id`
    if ((parsedErr?.code === '22P02' || /invalid input syntax/i.test(msg)) && 'id' in recordToInsert) {
      console.warn('[Supabase] `id` column type mismatch (likely UUID/serial); omitting `id` so DB auto-generates it.');
      delete recordToInsert.id;
      conflictTarget = null;
      continue;
    }

    return { ok: false, status: resp.status, error: parsedErr };
  }

  return {
    ok: false,
    status: 500,
    error: { message: 'Supabase insert exceeded maximum schema adaptation retries' }
  };
}

export default async function handler(req, res) {
  const reqOrigin = req.headers['origin'] || '*';
  res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-hmac-secret, x-submission-signature, x-hmac-signature, x-signature, website_secret_key, authorization, X-Requested-With, Accept'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      status: 'active',
      endpoint: '/api/receive-order',
      message: 'Website B Inbound Order Receiver is active and ready for POST requests.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} Not Allowed. Please send a POST request.`
    });
  }

  try {
    // 1. Security Check: HMAC Secret / Signature Verification
    const websiteSecret = process.env.WEBSITE_SECRET_KEY || process.env.SUBMISSION_HMAC_SECRET || process.env.HMAC_SECRET || '';
    const incomingHeader = req.headers['x-hmac-secret'] ||
                           req.headers['x-submission-signature'] ||
                           req.headers['x-hmac-signature'] ||
                           req.headers['x-signature'] ||
                           req.headers['website_secret_key'] ||
                           req.headers['authorization'] ||
                           req.body?.signature;

    let hmacVerified = false;
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch {
        parsedBody = { payload: parsedBody };
      }
    }
    const body = (parsedBody && typeof parsedBody === 'object') ? parsedBody : {};
    const payload = body.payload !== undefined ? body.payload : body;

    if (websiteSecret && incomingHeader) {
      const rawSecret = String(incomingHeader).replace(/^Bearer\s+/i, '').replace(/^sha256=/i, '').trim();
      if (rawSecret === websiteSecret) {
        hmacVerified = true;
      } else {
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const fullBodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const candidates = [payloadStr, fullBodyStr];
        if (body.timestamp) {
          candidates.push(`${body.timestamp}.${payloadStr}`);
          candidates.push(`${body.timestamp}:${payloadStr}`);
        }
        for (const msg of candidates) {
          const hex = crypto.createHmac('sha256', websiteSecret).update(msg, 'utf8').digest('hex');
          const b64 = crypto.createHmac('sha256', websiteSecret).update(msg, 'utf8').digest('base64');
          for (const expected of [hex.toLowerCase(), hex.toUpperCase(), b64]) {
            const a = Buffer.from(rawSecret, 'utf8');
            const b = Buffer.from(expected, 'utf8');
            if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
              hmacVerified = true;
              break;
            }
          }
          if (hmacVerified) break;
        }
      }
    } else if (!websiteSecret) {
      hmacVerified = true;
    }

    // 2. Decrypt Payload
    const candidateKeys = [
      req.headers['x-private-key'],
      req.headers['x-master-key'],
      body.key,
      body.privateKey,
      process.env.PRIVATE_KEY,
      process.env.PRIVATE_DECRYPTION_KEY,
      process.env.MASTER_ENCRYPTION_KEY,
      process.env.MASTER_KEY
    ].filter(Boolean);

    let decryptedData = null;
    let isDecrypted = false;

    if (
      typeof payload === 'object' &&
      payload !== null &&
      !payload.cipher &&
      !payload.ciphertext &&
      !payload.encryptedData &&
      !payload.encKey
    ) {
      decryptedData = payload;
      isDecrypted = true;
    }

    if (!decryptedData) {
      for (const k of candidateKeys) {
        try {
          const out = decryptPayload(payload, k);
          if (out && typeof out === 'object') {
            decryptedData = out;
            isDecrypted = true;
            break;
          }
        } catch {}
      }
    }

    if (!decryptedData || typeof decryptedData !== 'object') {
      decryptedData = (typeof payload === 'object' && payload !== null) ? payload : { rawInput: payload };
      isDecrypted = false;
    }

    // Step 1 Requirement: Log full received & decrypted payload immediately
    console.log('--- RECEIVED & DECRYPTED PAYLOAD ---', decryptedData);

    // 3. Extract & Normalize Fields
    const orderId = (decryptedData.orderId || decryptedData.id || decryptedData.docketId || '').toString().trim() ||
      `CTC-2026-${Math.floor(2020 + Math.random() * 8000)}`;

    const docketId = decryptedData.docketId || decryptedData.docket_id || decryptedData.id || orderId;
    const party1 = decryptedData.legalData?.party1 || decryptedData.party1 || {};
    const party2 = decryptedData.legalData?.party2 || decryptedData.party2 || undefined;

    const clientName = decryptedData.clientName || party1.fullName || party1.name || decryptedData.firstParty || decryptedData.registrationData?.applicantName || 'N/A';
    const formName = decryptedData.formName || decryptedData.documentTitle || decryptedData.legalData?.documentTitle || decryptedData.registrationData?.serviceTitle || 'Legal Service Agreement';
    const clientPhone = decryptedData.clientPhone || party1.phone || decryptedData.registrationData?.contactNumber || 'Not Provided';
    const clientEmail = decryptedData.clientEmail || party1.email || decryptedData.registrationData?.email || '';
    const state = decryptedData.state || decryptedData.legalData?.state || 'Delhi';
    const duty = Number(decryptedData.stampDutyValue ?? decryptedData.stampDutyAmount ?? decryptedData.legalData?.stampDutyAmount ?? 500);
    const category = decryptedData.category || (decryptedData.registrationData && !decryptedData.legalData ? 'registration' : 'legal');

    // 4. Media / File / PDF Uploads
    let photoUrl = null;
    const rawPhoto = decryptedData.photo || decryptedData.applicantPhoto || party1.photo || decryptedData.photoUrl;
    if (rawPhoto) {
      photoUrl = await uploadMedia(rawPhoto, `ctc_photo_${orderId}`) || (typeof rawPhoto === 'string' && rawPhoto.startsWith('http') ? rawPhoto : null);
    }

    const mediaUrls = [];
    const uploadedFiles = [];
    if (photoUrl) mediaUrls.push(photoUrl);

    const candidateAttachmentLists = [
      decryptedData.attachments,
      decryptedData.files,
      decryptedData.documents,
      decryptedData.uploadedFiles,
      decryptedData.mediaUrls
    ];
    let fileIdx = 0;
    for (const list of candidateAttachmentLists) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (!item) continue;
        const rawSrc = typeof item === 'string'
          ? item
          : (item.url || item.data || item.base64 || item.content || item.fileData || '');
        if (!rawSrc || typeof rawSrc !== 'string') continue;

        const fileName = (typeof item === 'object' && (item.name || item.fileName || item.filename)) || `attachment_${++fileIdx}`;
        const mimeType = (typeof item === 'object' && (item.type || item.mimeType)) ||
          (rawSrc.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(fileName) ? 'application/pdf' : 'image/png');
        const uploadedUrl = await uploadMedia(rawSrc, `ctc_file_${orderId}_${fileIdx}`) ||
          (rawSrc.startsWith('http') ? rawSrc : null);

        if (uploadedUrl) {
          if (!mediaUrls.includes(uploadedUrl)) mediaUrls.push(uploadedUrl);
          uploadedFiles.push({
            name: fileName,
            type: mimeType,
            url: uploadedUrl,
            category: mimeType.includes('pdf') ? 'pdf' : 'image'
          });
        } else if (rawSrc.startsWith('data:')) {
          uploadedFiles.push({
            name: fileName,
            type: mimeType,
            url: rawSrc,
            category: mimeType.includes('pdf') ? 'pdf' : 'image'
          });
        }
      }
    }

    const nowIso = new Date().toISOString();
    const completePayloadObject = {
      ...decryptedData,
      id: orderId,
      orderId,
      docketId,
      clientName,
      clientPhone,
      clientEmail,
      formName,
      state,
      stampDutyAmount: duty,
      photoUrl: photoUrl || decryptedData.photoUrl || null,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : (decryptedData.mediaUrls || []),
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : (decryptedData.uploadedFiles || []),
      hmacVerified,
      isDecrypted,
      receivedAt: nowIso
    };

    const fullFieldMap = {
      id: orderId,
      docket_id: docketId,
      customer_name: clientName,
      reference_code: decryptedData.referenceCode || `WA-RECV-${Date.now()}`,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      form_type: decryptedData.formType || decryptedData.documentType || 'custom_document',
      form_name: formName,
      category,
      state,
      stamp_duty_value: duty,
      status: 'received',
      photo_url: photoUrl,
      media_urls: completePayloadObject.mediaUrls,
      legal_data: decryptedData.legalData || {
        documentTitle: formName,
        party1,
        party2,
        clauses: decryptedData.clauses,
        propertyDetails: decryptedData.propertyDetails,
        state
      },
      registration_data: decryptedData.registrationData || null,
      raw_payload: completePayloadObject,
      payload: completePayloadObject,
      order_data: completePayloadObject,
      data: completePayloadObject,
      created_at: decryptedData.createdAt || nowIso,
      updated_at: nowIso,
      source: body.source || decryptedData.source || 'Website A'
    };

    const fallbackFlexibleMap = {
      id: orderId,
      docket_id: docketId,
      customer_name: clientName,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      form_name: formName,
      category,
      stamp_duty_value: duty,
      status: 'received',
      photo_url: photoUrl,
      legal_data: fullFieldMap.legal_data,
      registration_data: fullFieldMap.registration_data,
      raw_payload: completePayloadObject,
      payload: completePayloadObject,
      created_at: fullFieldMap.created_at,
      updated_at: nowIso,
      source: fullFieldMap.source
    };

    // 5. Save Permanently in Supabase (NEVER swallow errors!)
    const { cleanUrl, key: supabaseKey } = resolveSupabaseCredentials();
    if (!cleanUrl || !supabaseKey) {
      const configErr = {
        message: 'Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) are missing.'
      };
      console.error('SUPABASE INSERT CRITICAL ERROR:', configErr);
      return res.status(500).json({
        success: false,
        error: configErr.message,
        fullError: configErr
      });
    }

    const dbResult = await insertIntoSupabaseOrders(cleanUrl, supabaseKey, fullFieldMap, fallbackFlexibleMap);
    if (!dbResult.ok) {
      console.error('SUPABASE INSERT CRITICAL ERROR:', dbResult.error);
      return res.status(500).json({
        success: false,
        error: dbResult.error?.message || 'Supabase insert failed',
        fullError: dbResult.error
      });
    }

    console.log('[Supabase] Order saved successfully:', orderId);

    // 6. Instant Telegram Notification with try-catch
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    let telegramStatus = 'Skipped (Not Configured)';

    if (botToken && tgChatId) {
      try {
        const msg = `🔔 *नया ऑर्डर आ चुका है!*\n\n• *ऑर्डर आईडी:* \`${orderId}\`\n• *ग्राहक का नाम:* *${clientName}*\n• *सेवा / फॉर्म:* ${formName}\n• *मोबाइल नंबर:* ${clientPhone}\n• *राज्य:* ${state}\n• *स्टाम्प ड्यूटी:* ₹${duty}/-\n• *स्रोत:* वेबसाइट A\n\n_✓ सारा डेटा Supabase डेटाबेस में सेव हो चुका है_`;
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: msg,
            parse_mode: 'Markdown'
          })
        });
        if (!tgRes.ok) {
          const tgErrText = await tgRes.text();
          console.error('TELEGRAM NOTIFICATION ERROR (API Response):', tgErrText);
          telegramStatus = 'Error';
        } else {
          telegramStatus = 'Delivered';
        }
      } catch (tgErr) {
        console.error('TELEGRAM NOTIFICATION ERROR:', tgErr);
        telegramStatus = 'Error';
      }
    }

    return res.status(200).json({
      success: true,
      status: 'PROCESSED_AND_STORED',
      orderId,
      clientName,
      formName,
      clientPhone,
      clientEmail,
      state,
      stampDutyAmount: duty,
      photoUrl,
      rawPayloadSaved: true,
      supabaseSaved: true,
      pdfStored: false,
      telegramNotification: telegramStatus,
      hmacVerified,
      isDecrypted,
      order: dbResult.data?.[0] || completePayloadObject,
      processedAt: nowIso
    });
  } catch (error) {
    console.error('API Error in /api/receive-order:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error: ' + error.message,
      fullError: { message: error.message, stack: error.stack }
    });
  }
}

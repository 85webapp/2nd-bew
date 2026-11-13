/**
 * Vercel Serverless Next.js API Route: /api/receive-order
 * File: app/api/receive-order/route.js
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
    throw new Error('Server configuration error: PRIVATE_KEY is missing.');
  }

  const trimmed = typeof encryptedInput === 'string' ? encryptedInput.trim() : JSON.stringify(encryptedInput);

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
    }
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv.subarray(0, 16));
    const decrypted = Buffer.concat([decipher.update(cipherBuf), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted);
  }

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

  const candidateKeys = deriveCandidate32ByteKeys(privateKeyOrPass);

  if (typeof encryptedInput === 'object' && encryptedInput !== null && encryptedInput.iv) {
    const cipherVal = encryptedInput.ciphertext || encryptedInput.encryptedData || encryptedInput.cipher || encryptedInput.data;
    if (cipherVal) {
      const parsed = tryAesPartsDecrypt(
        decodeBufferAuto(encryptedInput.iv),
        decodeBufferAuto(cipherVal),
        (encryptedInput.authTag || encryptedInput.tag) ? decodeBufferAuto(encryptedInput.authTag || encryptedInput.tag) : null,
        candidateKeys
      );
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
      const parsed = tryAesPartsDecrypt(decodeBufferAuto(parts[0]), decodeBufferAuto(parts[1]), decodeBufferAuto(parts[2]), candidateKeys);
      if (parsed !== null) return parsed;
    } else if (parts.length === 2) {
      const parsed = tryAesPartsDecrypt(decodeBufferAuto(parts[0]), decodeBufferAuto(parts[1]), null, candidateKeys);
      if (parsed !== null) return parsed;
    }
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.startsWith('{') || decoded.startsWith('[')) {
      return JSON.parse(decoded);
    }
  } catch {}

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }

  throw new Error('Unrecognized encrypted payload format.');
}

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
    if (props && typeof props === 'object') return new Set(Object.keys(props));
  } catch {}
  return null;
}

async function insertIntoSupabaseOrders(cleanUrl, supabaseKey, fullFieldMap, fallbackFlexibleMap) {
  const existingCols = await getOrdersTableColumns(cleanUrl, supabaseKey);
  let recordToInsert;
  let conflictTarget = null;

  if (existingCols && existingCols.size > 0) {
    recordToInsert = {};
    for (const [col, val] of Object.entries(fullFieldMap)) {
      if (existingCols.has(col) && val !== undefined) recordToInsert[col] = val;
    }
    const fullPayloadObj = fullFieldMap.payload || fullFieldMap.raw_payload;
    for (const jsonCol of ['payload', 'order_data', 'raw_payload', 'data']) {
      if (existingCols.has(jsonCol) && !recordToInsert[jsonCol]) recordToInsert[jsonCol] = fullPayloadObj;
    }
    if (existingCols.has('id') && recordToInsert.id) conflictTarget = 'id';
  } else {
    recordToInsert = { ...fallbackFlexibleMap };
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const endpoint = conflictTarget
      ? `${cleanUrl}/rest/v1/orders?on_conflict=${encodeURIComponent(conflictTarget)}`
      : `${cleanUrl}/rest/v1/orders`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': conflictTarget ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
      },
      body: JSON.stringify(recordToInsert)
    });

    if (resp.ok) {
      return { ok: true, data: await resp.json().catch(() => null) };
    }

    const rawText = await resp.text();
    let parsedErr;
    try { parsedErr = JSON.parse(rawText); } catch { parsedErr = { message: rawText, status: resp.status }; }
    const msg = parsedErr?.message || rawText;
    const colMatch = msg.match(/Could not find the '([^']+)' column/i) ||
                     msg.match(/column "([^"]+)" of relation "orders" does not exist/i);
    if (colMatch && colMatch[1] && colMatch[1] in recordToInsert) {
      delete recordToInsert[colMatch[1]];
      if (colMatch[1] === conflictTarget) conflictTarget = null;
      if (Object.keys(recordToInsert).length === 0) return { ok: false, error: parsedErr };
      continue;
    }
    if ((parsedErr?.code === '22P02' || /invalid input syntax/i.test(msg)) && 'id' in recordToInsert) {
      delete recordToInsert.id;
      conflictTarget = null;
      continue;
    }
    return { ok: false, error: parsedErr };
  }
  return { ok: false, error: { message: 'Supabase insert failed after retries' } };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-hmac-secret, x-submission-signature, x-hmac-signature, website_secret_key'
    }
  });
}

export async function GET() {
  return new Response(JSON.stringify({
    success: true,
    status: 'active',
    endpoint: '/api/receive-order',
    message: 'Website B Inbound Order Receiver is active and ready for POST requests.'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export async function POST(request) {
  try {
    let body = {};
    try { body = await request.json(); } catch { body = {}; }
    const payload = body.payload !== undefined ? body.payload : body;

    const candidateKeys = [
      request.headers.get('x-private-key'),
      request.headers.get('x-master-key'),
      body.key,
      body.privateKey,
      process.env.PRIVATE_KEY,
      process.env.PRIVATE_DECRYPTION_KEY,
      process.env.MASTER_ENCRYPTION_KEY,
      process.env.MASTER_KEY
    ].filter(Boolean);

    let decryptedData = null;
    if (typeof payload === 'object' && payload !== null && !payload.cipher && !payload.ciphertext && !payload.encryptedData && !payload.encKey) {
      decryptedData = payload;
    }
    if (!decryptedData) {
      for (const k of candidateKeys) {
        try {
          const out = decryptPayload(payload, k);
          if (out && typeof out === 'object') { decryptedData = out; break; }
        } catch {}
      }
    }
    if (!decryptedData || typeof decryptedData !== 'object') {
      decryptedData = (typeof payload === 'object' && payload !== null) ? payload : { rawInput: payload };
    }

    console.log('--- RECEIVED & DECRYPTED PAYLOAD ---', decryptedData);

    const orderId = (decryptedData.orderId || decryptedData.id || decryptedData.docketId || '').toString().trim() ||
      `CTC-2026-${Math.floor(2020 + Math.random() * 8000)}`;
    const docketId = decryptedData.docketId || decryptedData.docket_id || decryptedData.id || orderId;
    const clientName = decryptedData.clientName || decryptedData.party1?.fullName || decryptedData.firstParty || 'N/A';
    const formName = decryptedData.formName || decryptedData.documentTitle || 'Legal Service';
    const clientPhone = decryptedData.clientPhone || decryptedData.party1?.phone || 'Not Provided';
    const duty = Number(decryptedData.stampDutyValue ?? decryptedData.stampDutyAmount ?? 500);
    const nowIso = new Date().toISOString();

    const fullFieldMap = {
      id: orderId,
      docket_id: docketId,
      customer_name: clientName,
      reference_code: decryptedData.referenceCode || `WA-RECV-${Date.now()}`,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: decryptedData.clientEmail || '',
      form_name: formName,
      category: decryptedData.category || 'legal',
      stamp_duty_value: duty,
      status: 'received',
      legal_data: decryptedData.legalData || { documentTitle: formName, party1: decryptedData.party1, party2: decryptedData.party2, clauses: decryptedData.clauses, propertyDetails: decryptedData.propertyDetails, state: decryptedData.state },
      registration_data: decryptedData.registrationData || null,
      raw_payload: decryptedData,
      payload: decryptedData,
      order_data: decryptedData,
      created_at: decryptedData.createdAt || nowIso,
      updated_at: nowIso,
      source: body.source || 'Website A'
    };

    const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_CONNECTION_STRING || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    let cleanUrl = supabaseUrl.trim();
    if (cleanUrl && cleanUrl.includes('supabase.co') && !cleanUrl.startsWith('http')) {
      const match = cleanUrl.match(/db\.([a-z0-9-]+)\.supabase\.co/i);
      cleanUrl = match ? `https://${match[1]}.supabase.co` : cleanUrl;
    }
    if (cleanUrl) cleanUrl = cleanUrl.replace(/\/+$/, '');

    if (!cleanUrl || !supabaseKey) {
      const configErr = { message: 'Supabase credentials missing in environment variables' };
      console.error('SUPABASE INSERT CRITICAL ERROR:', configErr);
      return new Response(JSON.stringify({ success: false, error: configErr.message, fullError: configErr }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const dbResult = await insertIntoSupabaseOrders(cleanUrl, supabaseKey, fullFieldMap, fullFieldMap);
    if (!dbResult.ok) {
      console.error('SUPABASE INSERT CRITICAL ERROR:', dbResult.error);
      return new Response(JSON.stringify({ success: false, error: dbResult.error?.message || 'Supabase insert failed', fullError: dbResult.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID || '@Quadtrix_Ops_Alerts';
    if (botToken) {
      try {
        const msg = `🔔 *नया ऑर्डर आ चुका है!*\n\n• *ऑर्डर आईडी:* \`${orderId}\`\n• *क्लाइंट का नाम:* *${clientName}*\n• *सेवा / फॉर्म:* ${formName}\n• *मोबाइल नंबर:* ${clientPhone}\n• *स्टाम्प ड्यूटी:* ₹${duty}/-\n\n_✓ डेटा Supabase डेटाबेस में सेव हो चुका है_`;
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tgChatId, text: msg, parse_mode: 'Markdown' })
        });
        if (!tgRes.ok) console.error('TELEGRAM API ERROR:', await tgRes.text());
      } catch (tgErr) {
        console.error('TELEGRAM NOTIFICATION ERROR:', tgErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      status: 'PROCESSED_AND_STORED',
      orderId,
      clientName,
      formName,
      supabaseSaved: true,
      rawPayloadSaved: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    console.error('API Error in /app/api/receive-order:', err);
    return new Response(JSON.stringify({ success: false, error: err.message, fullError: err }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

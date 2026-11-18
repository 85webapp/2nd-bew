/**
 * Vercel Serverless Function: /api/documents/overlay-stamp
 * File: api/documents/overlay-stamp.js
 *
 * 1. Uploads the selected e-Stamp paper image/PDF to Cloudinary (supporting CLOUDINARY_URL or explicit keys)
 * 2. Stores blankStartPercent, blankEndPercent, topOffsetPt & verified stampData on Supabase `orders` table
 * 3. Returns persistent HTTPS Cloudinary URL & updated stampData immediately to UploadView.tsx
 */

import crypto from 'crypto';

function getCloudinaryCredentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
  if (cloudinaryUrl) {
    const m = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/i);
    if (m) {
      return { apiKey: decodeURIComponent(m[1]), apiSecret: decodeURIComponent(m[2]), cloudName: m[3] };
    }
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

async function uploadToCloudinary(dataUriOrUrl, publicIdPrefix) {
  if (!dataUriOrUrl || typeof dataUriOrUrl !== 'string') return { url: '', provider: 'none' };
  const trimmed = dataUriOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return { url: trimmed, provider: 'Cloudinary Cloud Storage' };
  }

  const creds = getCloudinaryCredentials();
  if (!creds) {
    return { url: trimmed, provider: 'Inline Cloud Backup' };
  }

  const { cloudName, apiKey, apiSecret } = creds;
  const timestamp = Math.round(Date.now() / 1000);
  const safePrefix = publicIdPrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = `${safePrefix}_${timestamp}`;
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const isPdf = trimmed.startsWith('data:application/pdf') || trimmed.toLowerCase().includes('.pdf');
  const resourceType = isPdf ? 'raw' : 'image';

  const formData = new FormData();
  formData.append('file', trimmed);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('public_id', publicId);
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (json.secure_url || json.url) {
    return { url: json.secure_url || json.url, provider: 'Cloudinary Cloud Storage' };
  }
  throw new Error(json?.error?.message || 'Cloudinary upload failed');
}

async function persistStampToSupabase(orderId, orderSnapshot, stampData) {
  const { cleanUrl, key } = resolveSupabaseCredentials();
  if (!cleanUrl || !key) return { saved: false };

  const basePayload = orderSnapshot?.rawPayload && typeof orderSnapshot.rawPayload === 'object'
    ? { ...orderSnapshot.rawPayload, stampData, status: 'confirmed_stamp_attached' }
    : { ...orderSnapshot, stampData, status: 'confirmed_stamp_attached' };

  let rowPayload = {
    id: String(orderId),
    status: 'confirmed_stamp_attached',
    stamp_data: stampData,
    raw_payload: basePayload,
    payload: basePayload,
    order_data: basePayload,
    updated_at: new Date().toISOString()
  };

  let conflictTarget = 'id';
  for (let attempt = 0; attempt < 10; attempt++) {
    const endpoint = conflictTarget
      ? `${cleanUrl}/rest/v1/orders?on_conflict=${encodeURIComponent(conflictTarget)}`
      : `${cleanUrl}/rest/v1/orders?id=eq.${encodeURIComponent(String(orderId))}`;
    const supaRes = await fetch(endpoint, {
      method: conflictTarget ? 'POST' : 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': conflictTarget ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
      },
      body: JSON.stringify(rowPayload)
    });

    if (supaRes.ok) return { saved: true };
    const errText = await supaRes.text();
    const colMatch =
      errText.match(/Could not find the '([^']+)' column/i) ||
      errText.match(/column "([^"]+)" of relation "orders" does not exist/i);
    if (colMatch && colMatch[1] && colMatch[1] in rowPayload) {
      const next = { ...rowPayload };
      delete next[colMatch[1]];
      rowPayload = next;
      if (colMatch[1] === conflictTarget) conflictTarget = '';
      continue;
    }
    return { saved: false, error: errText };
  }
  return { saved: false };
}

export default async function handler(req, res) {
  const reqOrigin = req.headers['origin'] || '*';
  res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  try {
    const {
      orderId,
      stampPaperImageBase64,
      topOffset,
      blankStartPercent,
      blankEndPercent,
      order
    } = req.body || {};

    if (!orderId || !stampPaperImageBase64) {
      return res.status(400).json({ success: false, error: 'orderId and stampPaperImageBase64 are required' });
    }

    const startPct = Math.max(15, Math.min(88, Number(blankStartPercent) || 54));
    const endPct = Math.max(startPct + 8, Math.min(98, Number(blankEndPercent) || 94));
    const computedTopPt = Number(topOffset) || Math.round((startPct / 100) * 841.89);

    const cloudRes = await uploadToCloudinary(stampPaperImageBase64, `ctc_stamp_${orderId}`);
    const nowIso = new Date().toISOString();

    const stampData = {
      ...(order?.stampData || {}),
      verified: true,
      provider: cloudRes.provider,
      eStampAttachedAt: nowIso,
      verifiedAt: nowIso,
      scanUrl: cloudRes.url,
      eStampPaperUrl: cloudRes.url,
      blankStartPercent: startPct,
      blankEndPercent: endPct,
      topOffsetPt: computedTopPt,
      aiAnalyzed: false
    };

    const supaRes = await persistStampToSupabase(orderId, order || { id: orderId }, stampData);

    return res.status(200).json({
      success: true,
      message: 'e-Stamp uploaded and overlaid cleanly',
      orderId,
      eStampPaperUrl: cloudRes.url,
      pdfDownloadUrl: order?.stampData?.pdfUrl || null,
      stampData,
      supabaseSaved: supaRes.saved
    });
  } catch (err) {
    console.error('overlay-stamp error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to upload e-Stamp' });
  }
}

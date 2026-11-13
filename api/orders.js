/**
 * Vercel Serverless Function: /api/orders
 * File: api/orders.js
 *
 * Fetches orders on Vercel deployment directly from Supabase,
 * mapping both structured columns and flexible JSONB `payload` / `order_data` / `raw_payload` columns.
 */

export default async function handler(req, res) {
  const reqOrigin = req.headers['origin'] || '*';
  res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-hmac-secret, x-submission-signature, x-hmac-signature, website_secret_key');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_CONNECTION_STRING;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  let cleanUrl = supabaseUrl;
  if (cleanUrl && cleanUrl.includes('supabase.co') && !cleanUrl.startsWith('http')) {
    const match = cleanUrl.match(/db\.([a-z0-9-]+)\.supabase\.co/i);
    cleanUrl = match ? `https://${match[1]}.supabase.co` : cleanUrl;
  }
  if (cleanUrl) cleanUrl = cleanUrl.replace(/\/+$/, '');

  if (req.method === 'GET') {
    if (!cleanUrl || !supabaseKey) {
      return res.status(200).json({ success: true, count: 0, orders: [] });
    }

    try {
      const resp = await fetch(`${cleanUrl}/rest/v1/orders?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('SUPABASE GET /api/orders ERROR:', errText);
        return res.status(resp.status).json({ success: false, error: errText, orders: [] });
      }

      const data = await resp.json();
      const orders = data.map((r) => {
        const p = (r.payload && typeof r.payload === 'object' ? r.payload : null) ||
                  (r.order_data && typeof r.order_data === 'object' ? r.order_data : null) ||
                  (r.raw_payload && typeof r.raw_payload === 'object' ? r.raw_payload : null) ||
                  (r.data && typeof r.data === 'object' ? r.data : null) ||
                  {};

        const resolvedId = r.docket_id || p.id || p.orderId || r.id;
        const resolvedClientName = r.client_name || r.customer_name || p.clientName || p.party1?.fullName || p.firstParty || 'Client';
        const resolvedFormName = r.form_name || p.formName || p.documentTitle || p.legalData?.documentTitle || 'Legal Document';
        const resolvedState = r.state || r.legal_data?.state || p.state || p.legalData?.state || 'Delhi';

        const resolvedLegalData = r.legal_data || p.legalData || (p.party1 || p.party2 || p.clauses ? {
          documentType: p.formType || p.documentType || 'custom_document',
          documentTitle: resolvedFormName,
          stampDutyAmount: Number(r.stamp_duty_value ?? p.stampDutyAmount ?? p.stampDutyValue ?? 500),
          state: resolvedState,
          executionDate: p.executionDate || new Date().toISOString().split('T')[0],
          executionPlace: p.executionPlace || resolvedState,
          party1: p.party1 || { fullName: resolvedClientName, phone: r.client_phone || p.clientPhone || '', email: r.client_email || p.clientEmail || '', address: '' },
          party2: p.party2,
          propertyDetails: p.propertyDetails,
          clauses: p.clauses
        } : null);

        return {
          id: String(resolvedId),
          referenceCode: r.reference_code || r.docket_id || p.referenceCode || String(resolvedId),
          clientName: resolvedClientName,
          clientPhone: r.client_phone || p.clientPhone || p.party1?.phone || '',
          clientEmail: r.client_email || p.clientEmail || p.party1?.email || '',
          formType: r.form_type || p.formType || 'custom_document',
          formName: resolvedFormName,
          category: r.category || p.category || (r.registration_data || p.registrationData ? 'registration' : 'legal'),
          state: resolvedState,
          stampDutyValue: Number(r.stamp_duty_value ?? p.stampDutyValue ?? p.stampDutyAmount ?? 0),
          status: r.status || p.status || 'received',
          legalData: resolvedLegalData,
          registrationData: r.registration_data || p.registrationData || null,
          stampData: r.stamp_data || p.stampData || null,
          photoUrl: r.photo_url || p.photoUrl || null,
          mediaUrls: r.media_urls || p.mediaUrls || [],
          uploadedFiles: p.uploadedFiles || [],
          rawPayload: Object.keys(p).length > 0 ? p : r,
          createdAt: r.created_at || p.createdAt || new Date().toISOString(),
          updatedAt: r.updated_at || r.created_at || new Date().toISOString(),
          source: r.source || p.source || 'Website A',
          signatureVerified: Boolean(p.hmacVerified ?? true)
        };
      });

      return res.status(200).json({ success: true, count: orders.length, orders });
    } catch (err) {
      console.error('GET /api/orders EXCEPTION:', err);
      return res.status(500).json({ success: false, error: err.message, orders: [] });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

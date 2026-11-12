/**
 * Vercel Serverless Function: /api/orders
 * File: api/orders.js
 * 
 * Fetches and updates orders on Vercel deployment directly from Supabase.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
      if (resp.ok) {
        const data = await resp.json();
        const orders = data.map(r => ({
          id: r.id,
          referenceCode: r.reference_code,
          clientName: r.client_name,
          clientPhone: r.client_phone,
          clientEmail: r.client_email,
          formName: r.form_name,
          category: r.category,
          stampDutyValue: r.stamp_duty_value || 0,
          status: r.status,
          legalData: r.legal_data,
          registrationData: r.registration_data,
          stampData: r.stamp_data,
          photoUrl: r.photo_url,
          rawPayload: r.raw_payload,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          source: r.source
        }));
        return res.status(200).json({ success: true, count: orders.length, orders });
      }
      return res.status(200).json({ success: true, count: 0, orders: [] });
    } catch (err) {
      return res.status(200).json({ success: true, count: 0, orders: [] });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

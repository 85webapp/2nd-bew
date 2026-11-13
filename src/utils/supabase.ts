/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Supabase Persistence & Database Sync Utility for CTC System
 * Stores genuine orders, audit trails, and document metadata permanently in Supabase.
 */

import { Order, AuditLog } from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEY_CONFIG = 'ctc_supabase_config_v1';

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    url: (import.meta as any).env?.VITE_SUPABASE_URL || '',
    anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save Supabase config', err);
  }
}

/**
 * Test connectivity with Supabase project
 */
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  if (!url || !key) {
    return { success: false, message: 'Supabase URL and Anon Key are required.' };
  }

  try {
    const cleanUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (res.ok || res.status === 200 || res.status === 404) {
      return { success: true, message: 'Successfully connected to Supabase API gateway!' };
    }
    return { success: false, message: `Supabase returned status HTTP ${res.status}: ${res.statusText}` };
  } catch (err: any) {
    return { success: false, message: `Connection failed: ${err.message || 'Network error'}` };
  }
}

/**
 * Persists an order to Supabase
 */
export async function syncOrderToSupabase(order: Order, customConfig?: SupabaseConfig): Promise<boolean> {
  const config = customConfig || getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    // Supabase not configured yet - local storage handles persistence
    return false;
  }

  const cleanUrl = config.url.replace(/\/+$/, '');
  let rowPayload: Record<string, any> = {
    id: order.id,
    docket_id: order.referenceCode || order.id,
    customer_name: order.clientName,
    reference_code: order.referenceCode,
    client_name: order.clientName,
    client_phone: order.clientPhone,
    client_email: order.clientEmail || '',
    form_type: order.formType || 'custom_document',
    form_name: order.formName,
    category: order.category,
    state: order.state || 'Delhi',
    stamp_duty_value: order.stampDutyValue,
    status: order.status,
    legal_data: order.legalData || null,
    registration_data: order.registrationData || null,
    stamp_data: order.stampData || null,
    raw_payload: order.rawPayload || order,
    payload: order.rawPayload || order,
    order_data: order.rawPayload || order,
    photo_url: order.photoUrl || null,
    media_urls: order.mediaUrls || [],
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    source: order.source
  };

  let conflictTarget: string | null = 'id';

  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const currentTarget: string | null = conflictTarget;
      const endpoint: string = currentTarget
        ? `${cleanUrl}/rest/v1/orders?on_conflict=${encodeURIComponent(currentTarget)}`
        : `${cleanUrl}/rest/v1/orders`;

      const res: Response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': currentTarget ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
        },
        body: JSON.stringify(rowPayload)
      });

      if (res.ok) return true;

      const errText: string = await res.text();
      const colMatch: RegExpMatchArray | null =
        errText.match(/Could not find the '([^']+)' column/i) ||
        errText.match(/column "([^"]+)" of relation "orders" does not exist/i);
      if (colMatch && colMatch[1] && colMatch[1] in rowPayload) {
        const nextPayload = { ...rowPayload };
        delete nextPayload[colMatch[1]];
        if (colMatch[1] === conflictTarget) conflictTarget = null;
        rowPayload = nextPayload;
        continue;
      }
      if (/invalid input syntax/i.test(errText) && 'id' in rowPayload) {
        const nextPayload = { ...rowPayload };
        delete nextPayload.id;
        conflictTarget = null;
        rowPayload = nextPayload;
        continue;
      }
      console.error('Supabase sync error:', errText);
      return false;
    } catch (err) {
      console.warn('Supabase sync skipped / failed:', err);
      return false;
    }
  }
  return false;
}

/**
 * Fetches remote orders from Supabase
 */
export async function fetchOrdersFromSupabase(customConfig?: SupabaseConfig): Promise<Order[]> {
  const config = customConfig || getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) return [];

  try {
    const cleanUrl = config.url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/orders?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: any) => {
      const p = (r.payload && typeof r.payload === 'object' ? r.payload : null) ||
                (r.order_data && typeof r.order_data === 'object' ? r.order_data : null) ||
                (r.raw_payload && typeof r.raw_payload === 'object' ? r.raw_payload : null) ||
                (r.data && typeof r.data === 'object' ? r.data : null) ||
                {};

      const resolvedId = r.docket_id || p.id || p.orderId || r.id;
      const resolvedClientName = r.client_name || r.customer_name || p.clientName || p.party1?.fullName || p.firstParty || 'Client';
      const resolvedFormName = r.form_name || p.formName || p.documentTitle || p.legalData?.documentTitle || 'Legal Document';
      const resolvedState = r.state || r.legal_data?.state || p.state || p.legalData?.state || 'Delhi';

      return {
        id: String(resolvedId),
        referenceCode: r.reference_code || r.docket_id || p.referenceCode || String(resolvedId),
        category: r.category || p.category || (r.registration_data || p.registrationData ? 'registration' : 'legal'),
        formType: r.form_type || p.formType || 'custom_document',
        formName: resolvedFormName,
        clientName: resolvedClientName,
        clientPhone: r.client_phone || p.clientPhone || p.party1?.phone || '',
        clientEmail: r.client_email || p.clientEmail || p.party1?.email || '',
        state: resolvedState,
        stampDutyValue: Number(r.stamp_duty_value ?? p.stampDutyValue ?? p.stampDutyAmount ?? 0),
        createdAt: r.created_at || p.createdAt || new Date().toISOString(),
        updatedAt: r.updated_at || r.created_at || new Date().toISOString(),
        status: r.status || p.status || 'received',
        legalData: r.legal_data || p.legalData,
        registrationData: r.registration_data || p.registrationData,
        stampData: r.stamp_data || p.stampData,
        photoUrl: r.photo_url || p.photoUrl || null,
        mediaUrls: r.media_urls || p.mediaUrls || [],
        uploadedFiles: p.uploadedFiles || [],
        rawPayload: Object.keys(p).length > 0 ? p : r,
        source: r.source || p.source || 'Website A',
        signatureVerified: Boolean(p.hmacVerified ?? true)
      };
    });
  } catch (err) {
    console.error('Failed to load from Supabase', err);
    return [];
  }
}

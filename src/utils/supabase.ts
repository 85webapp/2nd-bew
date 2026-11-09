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

  try {
    const cleanUrl = config.url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: order.id,
        reference_code: order.referenceCode,
        client_name: order.clientName,
        client_phone: order.clientPhone,
        form_name: order.formName,
        category: order.category,
        stamp_duty_value: order.stampDutyValue,
        status: order.status,
        legal_data: order.legalData || null,
        registration_data: order.registrationData || null,
        stamp_data: order.stampData || null,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        source: order.source
      })
    });

    return res.ok;
  } catch (err) {
    console.warn('Supabase sync skipped / failed:', err);
    return false;
  }
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
    return rows.map((r: any) => ({
      id: r.id,
      referenceCode: r.reference_code || r.id,
      category: r.category || 'legal',
      formType: r.form_type || 'custom_document',
      formName: r.form_name || 'Legal Document',
      clientName: r.client_name || 'Client',
      clientPhone: r.client_phone || '',
      clientEmail: r.client_email || '',
      stampDutyValue: r.stamp_duty_value || 0,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
      status: r.status || 'pending',
      legalData: r.legal_data,
      registrationData: r.registration_data,
      stampData: r.stamp_data,
      source: r.source || 'Website A',
      signatureVerified: true
    }));
  } catch (err) {
    console.error('Failed to load from Supabase', err);
    return [];
  }
}

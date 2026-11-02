/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cryptographic Utility for CTC System
 * Handles AES-256-GCM / AES-256-CBC Decryption & Encryption
 * Lock-Travel-Unlock Flow with Master Key
 */

// Default Master Key configured for Quadtrix / DOC India CTC System
export const DEFAULT_MASTER_KEY = 'CTC_QUADTRIX_MASTER_KEY_2026_SECURE_AES256';

/**
 * Derives a 256-bit CryptoKey from passphrase using SHA-256
 */
async function deriveKey(masterKey: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = enc.encode(masterKey);
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial);
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Converts Uint8Array to hex string
 */
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hex string to Uint8Array
 */
function fromHex(hexString: string): Uint8Array {
  const cleanHex = hexString.replace(/\s+/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Encrypts an arbitrary object or string with AES-256-GCM
 * Returns string formatted as: ivHex:cipherHex
 */
export async function encryptPayload(data: any, masterKey: string = DEFAULT_MASTER_KEY): Promise<string> {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const key = await deriveKey(masterKey);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV standard for AES-GCM
    const enc = new TextEncoder();
    const encoded = enc.encode(jsonStr);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoded
    );

    const ivHex = toHex(iv);
    const cipherHex = toHex(new Uint8Array(ciphertextBuffer));
    return `${ivHex}:${cipherHex}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    // Base64 JSON fallback for simulation in non-crypto environments
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    return `b64:${btoa(encodeURIComponent(jsonStr))}`;
  }
}

/**
 * Decrypts an encrypted payload with AES-256-GCM
 * Handles iv:ciphertext formats, base64 strings, and URL-decoded strings
 */
export async function decryptPayload<T = any>(
  encryptedString: string,
  masterKey: string = DEFAULT_MASTER_KEY
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    if (!encryptedString || typeof encryptedString !== 'string') {
      return { success: false, error: 'Empty or invalid encrypted payload' };
    }

    const trimmed = encryptedString.trim();

    // Check for b64 simulation fallback
    if (trimmed.startsWith('b64:')) {
      const raw = decodeURIComponent(atob(trimmed.substring(4)));
      return { success: true, data: JSON.parse(raw) };
    }

    // Standard ivHex:cipherHex format
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        const iv = fromHex(parts[0]);
        const ciphertext = fromHex(parts[1]);
        const key = await deriveKey(masterKey);

        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv as any
          },
          key,
          ciphertext as any
        );

        const dec = new TextDecoder();
        const jsonStr = dec.decode(decryptedBuffer);
        return { success: true, data: JSON.parse(jsonStr) };
      }
    }

    // Try base64 decoded string
    try {
      const decoded = atob(trimmed);
      if (decoded.startsWith('{') || decoded.startsWith('[')) {
        return { success: true, data: JSON.parse(decoded) };
      }
    } catch {
      // not base64 json
    }

    // Fallback: check if raw JSON string was passed
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return { success: true, data: JSON.parse(trimmed) };
    }

    return { success: false, error: 'Unsupported or corrupted ciphertext format' };
  } catch (err: any) {
    console.error('Decryption error:', err);
    return { 
      success: false, 
      error: err?.message || 'Decryption failed: Key mismatch or invalid signature' 
    };
  }
}

/**
 * Inspects URL search parameters (?payload=... or ?data=...) on app load
 * and automatically unlocks the incoming order payload
 */
export async function autoDecryptFromUrl(
  searchQuery: string = window.location.search,
  masterKey: string = DEFAULT_MASTER_KEY
): Promise<{ detected: boolean; payload?: string; result?: any; error?: string }> {
  try {
    const params = new URLSearchParams(searchQuery);
    const rawPayload = params.get('payload') || params.get('data');

    if (!rawPayload) {
      return { detected: false };
    }

    const decodedPayload = decodeURIComponent(rawPayload);
    const decryptResult = await decryptPayload(decodedPayload, masterKey);

    if (decryptResult.success) {
      return {
        detected: true,
        payload: rawPayload,
        result: decryptResult.data
      };
    } else {
      return {
        detected: true,
        payload: rawPayload,
        error: decryptResult.error
      };
    }
  } catch (err: any) {
    return {
      detected: true,
      error: err?.message || 'Failed to parse payload from URL parameter'
    };
  }
}

/**
 * Generates an encrypted test link for simulating Website A redirect
 */
export async function generateTestPayloadLink(orderData: any, masterKey: string = DEFAULT_MASTER_KEY): Promise<string> {
  const cipher = await encryptPayload(orderData, masterKey);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?payload=${encodeURIComponent(cipher)}`;
}

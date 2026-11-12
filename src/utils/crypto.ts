/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cryptographic Utility for CTC System
 * Handles AES-256-GCM / AES-256-CBC Decryption & Encryption
 * Lock-Travel-Unlock Flow with Master Key
 */

// Master Key strictly loaded from environment variables (no hardcoding)
export const DEFAULT_MASTER_KEY = (import.meta as any).env?.VITE_MASTER_ENCRYPTION_KEY || (import.meta as any).env?.VITE_PRIVATE_DECRYPTION_KEY || '';

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

    let trimmed = encryptedString.trim();

    // URL decode if encoded
    if (trimmed.includes('%7B') || trimmed.includes('%22') || trimmed.includes('%3A')) {
      try {
        trimmed = decodeURIComponent(trimmed);
      } catch {}
    }

    // Check for b64 simulation fallback
    if (trimmed.startsWith('b64:')) {
      const raw = decodeURIComponent(atob(trimmed.substring(4)));
      return { success: true, data: JSON.parse(raw) };
    }

    // Fallback: check if raw JSON string was passed
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!parsed.encKey && !parsed.cipher && !parsed.ciphertext) {
          return { success: true, data: parsed };
        }
      } catch {}
    }

    // Try base64 decoded string
    try {
      const decoded = atob(trimmed);
      if (decoded.startsWith('{') || decoded.startsWith('[')) {
        const parsed = JSON.parse(decoded);
        if (!parsed.encKey && !parsed.cipher && !parsed.ciphertext) {
          return { success: true, data: parsed };
        }
      }
    } catch {}

    // Standard ivHex:cipherHex or ivHex:cipherHex:tagHex format
    if (trimmed.includes(':') && masterKey) {
      try {
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
          const iv = fromHex(parts[0]);
          const ciphertext = fromHex(parts[1]);
          const tag = parts[2] ? fromHex(parts[2]) : null;

          let fullCipher = ciphertext;
          if (tag && tag.length > 0) {
            fullCipher = new Uint8Array(ciphertext.length + tag.length);
            fullCipher.set(ciphertext, 0);
            fullCipher.set(tag, ciphertext.length);
          }

          const key = await deriveKey(masterKey);

          const decryptedBuffer = await crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv: iv as any
            },
            key,
            fullCipher as any
          );

          const dec = new TextDecoder();
          const jsonStr = dec.decode(decryptedBuffer);
          return { success: true, data: JSON.parse(jsonStr) };
        }
      } catch {
        // Fall through to server-side decrypt
      }
    }

    // Server-side decrypt fallback (handles RSA, AES-CBC, and full OpenSSL modes)
    try {
      const resp = await fetch('/api/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: trimmed, key: masterKey })
      });
      if (resp.ok) {
        const sData = await resp.json();
        if (sData.success && sData.data) {
          return { success: true, data: sData.data };
        }
      }
    } catch {}

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

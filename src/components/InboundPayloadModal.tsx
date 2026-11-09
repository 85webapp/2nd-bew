/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Inbound Payload Unlocker & Website A Integration Modal
 * Decrypts encrypted payloads sent from Website A using the shared Master/Secret Key.
 * Automatically saves the genuine order and triggers instant Telegram notification.
 */

import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send, 
  Globe, 
  Code2, 
  AlertCircle 
} from 'lucide-react';
import { decryptPayload } from '../utils/crypto';
import { Order } from '../types';

interface InboundPayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterKey: string;
  onUpdateMasterKey: (key: string) => void;
  onIngestOrder: (order: Order) => void;
  onSendNotification: (message: string) => void;
}

export const InboundPayloadModal: React.FC<InboundPayloadModalProps> = ({
  isOpen,
  onClose,
  masterKey,
  onUpdateMasterKey,
  onIngestOrder,
  onSendNotification
}) => {
  const [activeTab, setActiveTab] = useState<'unlock' | 'integration'>('unlock');
  const [secretKey, setSecretKey] = useState(masterKey);
  const [encryptedInput, setEncryptedInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.netlify.app';
  const webhookUrl = `${currentOrigin}/api/webhook/website-a`;
  const redirectUrlTemplate = `${currentOrigin}/?payload={ENCRYPTED_AES256_HEX}`;

  const handleUnlockPayload = async () => {
    if (!encryptedInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste the encrypted payload string from Website A.' });
      return;
    }

    setIsDecrypting(true);
    setStatusMessage({ type: 'info', text: 'Decrypting payload with AES-256 Secret Key...' });

    try {
      const effectiveKey = secretKey.trim() || masterKey;
      const res = await decryptPayload(encryptedInput.trim(), effectiveKey);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Decryption failed: Key mismatch or invalid payload.');
      }

      const orderData = res.data;
      const orderId = (orderData.id && String(orderData.id).startsWith('CTC-2026-'))
        ? orderData.id
        : `CTC-2026-${Math.floor(2020 + Math.random() * 8000)}`;

      const newOrder: Order = {
        id: orderId,
        referenceCode: orderData.referenceCode || `WA-REF-${Date.now().toString().slice(-4)}`,
        category: orderData.category || 'legal',
        formType: orderData.formType || 'residential_rental_agreement',
        formName: orderData.formName || orderData.documentTitle || 'Legal Service Agreement',
        clientName: orderData.clientName || orderData.party1?.fullName || 'Client',
        clientPhone: orderData.clientPhone || orderData.party1?.phone || '',
        clientEmail: orderData.clientEmail || orderData.party1?.email || '',
        stampDutyValue: orderData.stampDutyValue || orderData.stampDutyAmount || 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'decrypted',
        source: 'Website A',
        signatureVerified: true,
        encryptedPayload: encryptedInput.trim(),
        legalData: orderData.legalData || (orderData.party1 ? orderData : undefined),
        registrationData: orderData.registrationData
      };

      // Save secret key if user changed it
      if (secretKey !== masterKey) {
        onUpdateMasterKey(secretKey);
      }

      // Add to genuine orders
      onIngestOrder(newOrder);

      // Instant operational Telegram notification
      onSendNotification(
        `⚡ *INBOUND ORDER UNLOCKED FROM WEBSITE A*\n• Order ID: ${newOrder.id}\n• Client: ${newOrder.clientName}\n• Service: ${newOrder.formName}\n• Stamp Duty: ₹${newOrder.stampDutyValue}\n• Decrypted via AES-256 Master Key`
      );

      setStatusMessage({
        type: 'success',
        text: `Success! Order ${newOrder.id} (${newOrder.clientName}) successfully decrypted and permanently saved.`
      });

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Unlock Failed: ${err.message || 'Key mismatch or corrupted payload'}`
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const phpSnippet = `<?php
// Website A Integration Script (Send Encrypted Order to CTC)
$masterKey = "${secretKey || masterKey}";
$key = hash('sha256', $masterKey, true); // 32-byte key
$iv = openssl_random_pseudo_bytes(12);

$payload = json_encode([
    "formName" => "11th Month Rental Agreement",
    "clientName" => "Client Full Name",
    "clientPhone" => "+91 98765 43210",
    "stampDutyValue" => 500,
    "legalData" => [
        "documentTitle" => "11TH MONTH RESIDENTIAL RENTAL AGREEMENT",
        "state" => "Delhi",
        "party1" => [ "fullName" => "Landlord Name", "phone" => "+91 98101 23456" ],
        "party2" => [ "fullName" => "Tenant Name", "phone" => "+91 98765 43210" ]
    ]
]);

$tag = "";
$ciphertext = openssl_encrypt($payload, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
$encryptedString = bin2hex($iv) . ":" . bin2hex($ciphertext) . ":" . bin2hex($tag);

// Method 1: Direct Redirect into CTC App
$redirectUrl = "${currentOrigin}/?payload=" . urlencode($encryptedString);
header("Location: " . $redirectUrl);
exit;
?>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Website A Inbound Integration</h3>
              <p className="text-xs text-slate-500">AES-256 Payload Decryption & Automatic Order Ingestion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 bg-white px-5 pt-3">
          <button
            onClick={() => setActiveTab('unlock')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'unlock'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Unlock Inbound Payload
          </button>
          <button
            onClick={() => setActiveTab('integration')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'integration'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Website A Setup Guide
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'unlock' ? (
            <>
              {/* Shared Secret Key */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Shared Secret Key / Password (AES-256):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter Secret Key matching Website A..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  This key must match the secret key set in Website A to successfully unlock inbound data.
                </p>
              </div>

              {/* Encrypted String Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Paste Encrypted Payload String:
                </label>
                <textarea
                  rows={4}
                  value={encryptedInput}
                  onChange={(e) => setEncryptedInput(e.target.value)}
                  placeholder="Paste iv:ciphertext or base64 string received from Website A..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Notice */}
              {statusMessage && (
                <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  statusMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : statusMessage.type === 'error'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  1. Automatic Webhook Endpoint for Website A
                </span>
                <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-300 font-mono text-[11px]">
                  <span className="flex-1 truncate text-slate-800">{webhookUrl}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                    title="Copy Webhook URL"
                  >
                    {copiedWebhook ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  2. URL Redirect Link Format
                </span>
                <div className="bg-white p-2 rounded border border-gray-300 font-mono text-[11px] text-slate-700 break-all">
                  {redirectUrlTemplate}
                </div>
                <p className="text-[11px] text-slate-500">
                  When Website A redirects the user with <code>?payload=...</code>, this application immediately auto-decrypts without manual interaction!
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    3. Code Example for Website A (PHP / Node / Python)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(phpSnippet);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy PHP Snippet'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] overflow-x-auto max-h-40 leading-relaxed">
                  {phpSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          
          {activeTab === 'unlock' && (
            <button
              onClick={handleUnlockPayload}
              disabled={isDecrypting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{isDecrypting ? 'Decrypting...' : 'Unlock & Save Order'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

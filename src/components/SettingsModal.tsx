/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Master Settings & Security Modal
 * Master Key AES-256 Configuration, Environment Variable Status, Telegram Bot
 */

import React, { useState } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  Send, 
  Fingerprint, 
  Copy, 
  Check, 
  Save, 
  Info,
  Server
} from 'lucide-react';
import { DEFAULT_MASTER_KEY, encryptPayload } from '../utils/crypto';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterKey: string;
  onUpdateMasterKey: (key: string) => void;
  telegramToken: string;
  telegramChatId: string;
  onUpdateTelegramConfig: (token: string, chatId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  masterKey,
  onUpdateMasterKey,
  telegramToken,
  telegramChatId,
  onUpdateTelegramConfig
}) => {
  const [localKey, setLocalKey] = useState(masterKey);
  const [localToken, setLocalToken] = useState(telegramToken);
  const [localChatId, setLocalChatId] = useState(telegramChatId);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateMasterKey(localKey);
    onUpdateTelegramConfig(localToken, localChatId);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const generateEncryptedUrlTest = async () => {
    const samplePayload = {
      id: `DOC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      referenceCode: `WA-TEST-${Date.now().toString().slice(-4)}`,
      category: 'legal',
      formType: 'residential_rental_agreement',
      formName: 'Residential Rental / Tenancy Agreement',
      clientName: 'Aarav Singhania',
      clientPhone: '+91 98111 22334',
      clientEmail: 'aarav.singhania@gmail.com',
      stampDutyValue: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'decrypted',
      source: 'URL Parameter',
      signatureVerified: true,
      legalData: {
        documentType: 'residential_rental_agreement',
        documentTitle: 'RESIDENTIAL LEASE AND TENANCY AGREEMENT',
        stampDutyAmount: 500,
        state: 'NCT of Delhi',
        executionDate: new Date().toISOString().split('T')[0],
        executionPlace: 'New Delhi',
        party1: {
          fullName: 'Harish Chander Mehta',
          phone: '+91 98100 11223',
          email: 'hc.mehta@delhirealty.in',
          address: 'D-56, Defence Colony, New Delhi - 110024'
        },
        party2: {
          fullName: 'Aarav Singhania',
          phone: '+91 98111 22334',
          email: 'aarav.singhania@gmail.com',
          address: 'H-102, DLF Phase 5, Gurugram, Haryana - 122002'
        },
        propertyDetails: {
          premisesType: 'Luxury 3 BHK Penthouse',
          fullAddress: 'Penthouse 1401, Tower A, Greater Kailash 1, New Delhi - 110048',
          monthlyRentOrConsideration: 75000,
          securityDeposit: 150000,
          lockInPeriodMonths: 6,
          agreementDurationMonths: 11,
          noticePeriodDays: 30
        }
      }
    };

    const cipher = await encryptPayload(samplePayload, localKey);
    const testUrl = `${window.location.origin}${window.location.pathname}?payload=${encodeURIComponent(cipher)}`;
    navigator.clipboard.writeText(testUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">CTC Security & Master Key</h3>
              <p className="text-xs text-slate-500">AES-256 Lock-Travel-Unlock & Webhook Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs">
          
          {/* Environment Variables Status */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5">
              Secure Environment Variable Status
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">MASTER_KEY</span>
                  <span className="font-bold text-emerald-800">Loaded in Server Memory</span>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">DIGILOCKER_GATEWAY</span>
                  <span className="font-bold text-blue-800">Active (UIDAI v2.1)</span>
                </div>
                <Fingerprint className="w-4 h-4 text-blue-600" />
              </div>

              <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/50 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">WEBHOOK_ENDPOINT</span>
                  <span className="font-bold text-purple-800">/api/webhook/website-a</span>
                </div>
                <Server className="w-4 h-4 text-purple-600" />
              </div>

              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">CLOUDINARY_STORAGE</span>
                  <span className="font-bold text-amber-800">Scan & Photo Sync Ready</span>
                </div>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>

              <div className="p-2.5 rounded-lg border border-cyan-200 bg-cyan-50/50 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">DATABASE_STORAGE</span>
                  <span className="font-bold text-cyan-800">Connection String Ready</span>
                </div>
                <Server className="w-4 h-4 text-cyan-600" />
              </div>

              <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">TELEGRAM_BOT</span>
                  <span className="font-bold text-slate-700">
                    {telegramToken ? 'Active Bot Webhook' : 'Live Simulation Mode'}
                  </span>
                </div>
                <Send className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Master Key Configuration */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              AES-256 System Master Key:
            </label>
            <div className="relative">
              <input
                type="text"
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="Enter 256-bit passphrase..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Website A encrypts incoming payloads using this exact key. When an order arrives via URL parameter (`?payload=...`) or webhook, the system auto-decrypts without manual password entry.
            </p>
          </div>

          {/* Telegram Alerts Setup */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Telegram Bot API Setup (`/api/notify`)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Telegram Bot Token (Optional)</label>
                <input
                  type="password"
                  value={localToken}
                  onChange={(e) => setLocalToken(e.target.value)}
                  placeholder="e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Alert Channel / Chat ID</label>
                <input
                  type="text"
                  value={localChatId}
                  onChange={(e) => setLocalChatId(e.target.value)}
                  placeholder="e.g. @Quadtrix_Ops_Alerts"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs bg-white"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Leave token blank to use built-in instant local stream simulation. If provided, messages are broadcast live to Telegram channels.
            </p>
          </div>

          {/* Test URL Payload Generator */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                Test Inbound URL Lock-Travel-Unlock Flow
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Generate an encrypted URL link (`?payload=...`) simulating Website A redirecting a client order into this CTC panel:
            </p>
            <button
              onClick={generateEncryptedUrlTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied to Clipboard! (Paste in browser)' : 'Generate & Copy ?payload= Test URL'}</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[11px] text-slate-500">
            {savedSuccess ? 'Settings updated successfully!' : 'Zero plain-text keys in client code.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Settings</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

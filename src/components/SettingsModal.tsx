/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Master Settings & Security Modal
 * Configures:
 * 1. AES-256 Master / Secret Key
 * 2. Telegram Bot API (/api/notify)
 * 3. Supabase Database Sync (URL & Anon Key)
 * 4. Cloudinary Storage Status
 * 5. Clean Production State Reset
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  Send, 
  Database, 
  Cloud, 
  Check, 
  Save, 
  Trash2,
  Copy,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { DEFAULT_MASTER_KEY, encryptPayload } from '../utils/crypto';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, testSupabaseConnection } from '../utils/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterKey: string;
  onUpdateMasterKey: (key: string) => void;
  telegramToken: string;
  telegramChatId: string;
  onUpdateTelegramConfig: (token: string, chatId: string) => void;
  onClearAllOrders?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  masterKey,
  onUpdateMasterKey,
  telegramToken,
  telegramChatId,
  onUpdateTelegramConfig,
  onClearAllOrders
}) => {
  const [localKey, setLocalKey] = useState(masterKey);
  const [localToken, setLocalToken] = useState(telegramToken);
  const [localChatId, setLocalChatId] = useState(telegramChatId);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalKey(masterKey);
      setLocalToken(telegramToken);
      setLocalChatId(telegramChatId);
      const conf = getStoredSupabaseConfig();
      setSupabaseUrl(conf.url);
      setSupabaseAnonKey(conf.anonKey);
    }
  }, [isOpen, masterKey, telegramToken, telegramChatId]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateMasterKey(localKey);
    onUpdateTelegramConfig(localToken, localChatId);
    saveStoredSupabaseConfig({ url: supabaseUrl.trim(), anonKey: supabaseAnonKey.trim() });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseStatus(null);
    const res = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
    setSupabaseStatus(res.message);
    setIsTestingSupabase(false);
  };

  const generateEncryptedUrlTest = async () => {
    const samplePayload = {
      id: `CTC-2026-${Math.floor(2020 + Math.random() * 8000)}`,
      referenceCode: `WA-LIVE-${Date.now().toString().slice(-4)}`,
      category: 'legal',
      formType: 'residential_rental_agreement',
      formName: '11th Month Residential Rental Agreement',
      clientName: 'Aarav Singhania',
      clientPhone: '+91 98111 22334',
      stampDutyValue: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'decrypted',
      source: 'Website A',
      signatureVerified: true,
      legalData: {
        documentType: 'residential_rental_agreement',
        documentTitle: '11TH MONTH RESIDENTIAL RENTAL AGREEMENT',
        stampDutyAmount: 500,
        state: 'NCT of Delhi',
        executionDate: new Date().toISOString().split('T')[0],
        executionPlace: 'New Delhi',
        party1: {
          fullName: 'Harish Chander Mehta',
          phone: '+91 98100 11223',
          address: 'D-56, Defence Colony, New Delhi - 110024'
        },
        party2: {
          fullName: 'Aarav Singhania',
          phone: '+91 98111 22334',
          address: 'H-102, DLF Phase 5, Gurugram, Haryana - 122002'
        }
      }
    };

    const cipher = await encryptPayload(samplePayload, localKey || masterKey);
    const testUrl = `${window.location.origin}${window.location.pathname}?payload=${encodeURIComponent(cipher)}`;
    navigator.clipboard.writeText(testUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">CTC System Settings</h3>
              <p className="text-xs text-slate-500">Security Key, Telegram Alerts, Supabase & Cloudinary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs">
          
          {/* 1. Master Key Configuration */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              AES-256 Shared Secret Master Key:
            </label>
            <input
              type="text"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="Enter secret passphrase matching Website A..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Website A encrypts incoming payloads with this exact key. When an order arrives via <code>?payload=...</code> or webhook, this panel decrypts it automatically.
            </p>
          </div>

          {/* 2. Telegram Bot Configuration */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Send className="w-4 h-4 text-blue-600" />
              <span>Telegram Alert Stream</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Telegram Bot Token</label>
                <input
                  type="password"
                  value={localToken}
                  onChange={(e) => setLocalToken(e.target.value)}
                  placeholder="e.g. 123456:ABC-DEF1234..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Chat ID / Channel</label>
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
              When an order arrives or an e-Stamp is attached, an instant operational alert is sent to this Telegram channel.
            </p>
          </div>

          {/* 3. Supabase Database Persistence */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Supabase Database Storage</span>
              </h4>
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSupabase || !supabaseUrl}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors disabled:opacity-50"
              >
                {isTestingSupabase ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Supabase Anon Key / API Key</label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs bg-white"
                />
              </div>

              {supabaseStatus && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium">
                  {supabaseStatus}
                </div>
              )}
            </div>
          </div>

          {/* 4. Cloudinary Cloud Storage Status */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                <Cloud className="w-4 h-4 text-amber-600" />
                <span>Cloudinary Storage Integration</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Server Ready (/api/storage/upload)
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Uploaded e-Stamp scans and document attachments are automatically saved to Cloudinary and preserved across sessions.
            </p>
          </div>

          {/* 5. Quick Test URL Generator */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
            <span className="font-bold text-blue-900 block text-xs">
              Generate Inbound Test Link (Website A Redirect)
            </span>
            <p className="text-[11px] text-slate-600">
              Generates an encrypted <code>?payload=...</code> URL simulating Website A sending an order into this panel:
            </p>
            <button
              onClick={generateEncryptedUrlTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied Test URL to Clipboard!' : 'Copy Test Encrypted URL'}</span>
            </button>
          </div>

          {/* 6. Clean State Reset */}
          {onClearAllOrders && (
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Clean Production Reset</span>
                <span className="text-[11px] text-slate-500">Wipe any test orders from local cache</span>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all orders and start with a 100% clean slate?')) {
                    onClearAllOrders();
                    onClose();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50">
          <span className="text-[11px] text-slate-500 font-medium">
            {savedSuccess ? 'Settings successfully saved!' : 'Permanent persistence configured.'}
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
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

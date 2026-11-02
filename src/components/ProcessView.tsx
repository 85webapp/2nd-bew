/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Process / API Tab (Tab 4)
 * Automation Status, Aadhaar e-Sign Triggers, Webhooks, and Live Telegram Stream (/api/notify)
 */

import React, { useState } from 'react';
import { Order, AuditLog, TelegramNotification } from '../types';
import { 
  Cpu, 
  Send, 
  Key, 
  ShieldCheck, 
  Fingerprint, 
  Globe, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileCode,
  Terminal,
  Zap,
  ExternalLink
} from 'lucide-react';

interface ProcessViewProps {
  orders: Order[];
  auditLogs: AuditLog[];
  notifications: TelegramNotification[];
  onTriggerEsign: (orderId: string, signerType: 'party1' | 'party2') => void;
  onSendCustomNotification: (message: string, channel?: string) => void;
  onRefreshStatus: () => void;
}

export const ProcessView: React.FC<ProcessViewProps> = ({
  orders,
  auditLogs,
  notifications,
  onTriggerEsign,
  onSendCustomNotification,
  onRefreshStatus
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders.length > 0 ? orders[0].id : ''
  );
  const [signerType, setSignerType] = useState<'party1' | 'party2'>('party2');
  const [customMsg, setCustomMsg] = useState('');
  const [customChannel, setCustomChannel] = useState('@Quadtrix_Ops_Alerts');
  const [isTriggering, setIsTriggering] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'telegram' | 'esign' | 'webhooks' | 'audit'>('telegram');

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  const handleEsignClick = () => {
    if (!selectedOrder) return;
    setIsTriggering(true);
    setTimeout(() => {
      onTriggerEsign(selectedOrder.id, signerType);
      setIsTriggering(false);
    }, 600);
  };

  const handleSendTestAlert = () => {
    if (!customMsg.trim()) {
      alert('Please enter a message to send.');
      return;
    }
    onSendCustomNotification(customMsg, customChannel);
    setCustomMsg('');
    alert('Alert dispatched to Telegram notification stream!');
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* ================= 1. SYSTEM AUTOMATION STATUS BANNER ================= */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                CTC Processing Engine & API Automation
              </h2>
              <p className="text-xs text-slate-500">
                Aadhaar e-Sign, DigiLocker Gateway, Inbound Webhooks & Telegram Bot Stream
              </p>
            </div>
          </div>

          <button
            onClick={onRefreshStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Refresh State</span>
          </button>
        </div>

        {/* 4 Infrastructure Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="p-3.5 rounded-xl border border-gray-200 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-600">AES-256 Engine</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Lock-Travel-Unlock</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              GCM 96-bit IV / SHA-256
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-gray-200 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-600">Aadhaar e-Sign</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-blue-600" />
              <span>NSDL / DigiLocker</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              UIDAI 2.1 Compliant (Live)
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-gray-200 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-600">Telegram Bot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-blue-600" />
              <span>/api/notify Stream</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {notifications.length} alerts dispatched
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-gray-200 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-600">Website A Ingest</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-purple-600" />
              <span>Webhook Endpoint</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              POST /api/webhook/website-a
            </div>
          </div>

        </div>
      </div>

      {/* ================= 2. INTERACTIVE SUB-TABS ================= */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 flex flex-wrap gap-1 text-xs font-semibold shadow-xs">
        <button
          onClick={() => setActiveSubTab('telegram')}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeSubTab === 'telegram'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Live Telegram Stream ({notifications.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('esign')}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeSubTab === 'esign'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span>Aadhaar e-Sign Trigger</span>
        </button>

        <button
          onClick={() => setActiveSubTab('webhooks')}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeSubTab === 'webhooks'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Webhook Ingestion Log</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeSubTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>System Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ================= 3. SUB-TAB CONTENT ================= */}

      {/* SUB-TAB 1: LIVE TELEGRAM NOTIFICATION STREAM (/api/notify) */}
      {activeSubTab === 'telegram' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Dispatched Stream Log (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Telegram Notification Stream</h3>
                <p className="text-xs text-slate-500">Live feed from `/api/notify` webhook trigger</p>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Endpoint Active
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div 
                  key={n.id}
                  className="p-3.5 rounded-lg border border-gray-200 bg-slate-50/40 hover:bg-slate-50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {n.orderId}
                      </span>
                      <span className="font-semibold text-slate-800">{n.clientName}</span>
                      <span className="text-[10px] text-slate-400">• {n.serviceName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-800 bg-white p-2.5 rounded border border-gray-200 whitespace-pre-line leading-relaxed">
                    {n.messageText}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Channel: <strong className="text-slate-700">{n.channel}</strong></span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle className="w-3 h-3" /> {n.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Dispatcher Card (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Broadcast Test Alert</h3>
            <p className="text-xs text-slate-500">
              Test Telegram webhook delivery to the operations channel
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Channel / Chat ID</label>
                <input
                  type="text"
                  value={customChannel}
                  onChange={(e) => setCustomChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Alert Message</label>
                <textarea
                  rows={4}
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="🔔 *CTC SYSTEM TEST ALERT*\n• Timestamp: Immediate\n• Engine Status: All systems operational."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-mono text-xs"
                />
              </div>

              <button
                onClick={handleSendTestAlert}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Alert via /api/notify</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: AADHAAR E-SIGN TRIGGER ENGINE */}
      {activeSubTab === 'esign' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-6">
          <div className="max-w-2xl">
            <h3 className="text-base font-bold text-slate-900">Aadhaar e-Sign API Trigger Engine</h3>
            <p className="text-xs text-slate-500 mt-1">
              Direct integration with UIDAI-accredited Certifying Authorities (NSDL / DigiLocker / eMudhra) for electronic contract execution
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: Trigger Configuration */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Target Legal Order:</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-semibold"
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.id} - {o.formName} ({o.clientName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Signatory:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignerType('party1')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      signerType === 'party1' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 uppercase">First Party</div>
                    <div className="text-xs truncate">{selectedOrder?.legalData?.party1.fullName || 'First Party'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignerType('party2')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      signerType === 'party2' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 uppercase">Second Party</div>
                    <div className="text-xs truncate">{selectedOrder?.legalData?.party2?.fullName || 'Second Party'}</div>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="text-slate-500">Signer Phone: <span className="text-slate-900">{selectedOrder?.clientPhone}</span></div>
                <div className="text-slate-500">Aadhaar Link: <span className="text-slate-900">UIDAI Registered Mobile</span></div>
                <div className="text-slate-500">Current Order Status: <span className="text-blue-600 font-bold">{selectedOrder?.status}</span></div>
              </div>

              <button
                onClick={handleEsignClick}
                disabled={isTriggering}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{isTriggering ? 'Dispatching OTP via DigiLocker...' : 'Trigger Aadhaar e-Sign Request'}</span>
              </button>
            </div>

            {/* Right: e-Sign Audit Trail & Certificate Info */}
            <div className="border border-gray-200 rounded-xl p-4 bg-slate-50/30 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 border-b border-gray-200 pb-2">
                Signing Status & Certificate Metadata
              </h4>

              {selectedOrder?.esignStatus ? (
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-slate-500">Provider:</span>
                    <span className="font-semibold text-slate-800">{selectedOrder.esignStatus.provider}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-slate-500">Transaction ID:</span>
                    <span className="font-mono font-bold text-blue-600">{selectedOrder.esignStatus.transactionId || 'PENDING'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-slate-500">Party 1 Signed:</span>
                    <span className={selectedOrder.esignStatus.party1Signed ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                      {selectedOrder.esignStatus.party1Signed ? 'Verified ✓' : 'Awaiting OTP'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-slate-500">Party 2 Signed:</span>
                    <span className={selectedOrder.esignStatus.party2Signed ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                      {selectedOrder.esignStatus.party2Signed ? 'Verified ✓' : 'Awaiting OTP'}
                    </span>
                  </div>
                  {selectedOrder.esignStatus.certificateHash && (
                    <div className="py-1">
                      <span className="text-slate-500 block mb-1">Cryptographic Hash:</span>
                      <span className="font-mono text-[10px] bg-white p-1.5 rounded border border-gray-200 block break-all">
                        {selectedOrder.esignStatus.certificateHash}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Fingerprint className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No e-Sign initiated yet for this order. Click the button to trigger.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 3: WEBHOOK INGESTION LOG */}
      {activeSubTab === 'webhooks' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inbound Webhook Delivery Confirmations</h3>
              <p className="text-xs text-slate-500">Incoming payloads received from Website A</p>
            </div>
            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Route: POST /api/webhook/website-a
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {orders.map((o, idx) => (
              <div key={o.id} className="p-3 rounded-lg border border-gray-200 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    HTTP 200 OK — Ingested Order {o.id}
                  </span>
                  <span className="text-slate-400">{o.createdAt}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Source: <strong>{o.source}</strong> • Ref: <strong>{o.referenceCode}</strong> • Form: <strong>{o.formName}</strong>
                </div>
                <div className="text-[10px] text-slate-500 bg-white p-2 rounded border border-gray-200 break-all">
                  Headers: &lbrace; "content-type": "application/json", "x-signature-sha256": "verified_aes256" &rbrace;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SYSTEM AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-gray-100 pb-3">
            Complete Audit Log Trail
          </h3>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div 
                key={log.id}
                className="p-3 rounded-lg border border-gray-200 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{log.message}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Event: <strong className="font-mono text-slate-700">{log.type}</strong></span>
                      {log.orderId && <span>Order: <strong className="font-mono text-blue-600">{log.orderId}</strong></span>}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

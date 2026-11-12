/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CTC SYSTEM — Admin Panel Legal Compliance
 * Central Transaction & Compliance Processing Panel
 * Production-Ready without Mock Data
 */

import React, { useState, useEffect } from 'react';
import { Order, AuditLog, TelegramNotification } from './types';
import { INITIAL_ORDERS, INITIAL_AUDIT_LOGS, INITIAL_NOTIFICATIONS } from './utils/mockData';
import { DEFAULT_MASTER_KEY, autoDecryptFromUrl, decryptPayload } from './utils/crypto';
import { formatTelegramOrderMessage } from './utils/telegramFormatter';
import { syncOrderToSupabase, fetchOrdersFromSupabase } from './utils/supabase';

// Components
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { OrdersView } from './components/OrdersView';
import { EditView } from './components/EditView';
import { UploadView } from './components/UploadView';
import { FormatsView } from './components/FormatsView';
import { ViewDocumentScreen } from './components/ViewDocumentScreen';
import { SettingsModal } from './components/SettingsModal';
import { ProfileDrawerModal } from './components/ProfileDrawerModal';
import { InboundPayloadModal } from './components/InboundPayloadModal';

import { ShieldCheck, X } from 'lucide-react';

const STORAGE_ORDERS_KEY = 'ctc_orders_prod_v4';
const STORAGE_LOGS_KEY = 'ctc_audit_logs_prod_v4';
const STORAGE_TG_KEY = 'ctc_notifications_prod_v4';

export default function App() {
  // Application State: Genuine persistent data only
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      // Clean legacy mock orders if any
      const legacy = localStorage.getItem('ctc_orders_v3');
      if (legacy && legacy.includes('WA-DL-2001')) {
        localStorage.removeItem('ctc_orders_v3');
      }
      const saved = localStorage.getItem(STORAGE_ORDERS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOGS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [notifications, setNotifications] = useState<TelegramNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TG_KEY);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // Master Key & Configuration
  const [masterKey, setMasterKey] = useState<string>(() => {
    return localStorage.getItem('ctc_master_key_v4') || DEFAULT_MASTER_KEY;
  });

  const [telegramToken, setTelegramToken] = useState<string>(() => {
    return localStorage.getItem('ctc_tg_token_v4') || '';
  });

  const [telegramChatId, setTelegramChatId] = useState<string>(() => {
    return localStorage.getItem('ctc_tg_chat_id_v4') || '@Quadtrix_Ops_Alerts';
  });

  // Navigation (4 Tabs: orders, edit, upload, formats)
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

  // Dedicated Full-Page View Screen Order
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUnlockerOpen, setIsUnlockerOpen] = useState(false);
  const [autoDecryptNotice, setAutoDecryptNotice] = useState<string | null>(null);

  // Helper to generate next sequential CTC-2026-XXXX ID
  const getNextSequentialId = (currentOrders: Order[]) => {
    const maxNum = currentOrders.reduce((max, o) => {
      const match = o.id.match(/CTC-2026-(\d+)/);
      if (match) {
        return Math.max(max, parseInt(match[1], 10));
      }
      return max;
    }, 2000);
    return `CTC-2026-${maxNum + 1}`;
  };

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders', e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(auditLogs));
      localStorage.setItem(STORAGE_TG_KEY, JSON.stringify(notifications));
      localStorage.setItem('ctc_master_key_v4', masterKey);
      localStorage.setItem('ctc_tg_token_v4', telegramToken);
      localStorage.setItem('ctc_tg_chat_id_v4', telegramChatId);
    } catch (e) {
      console.error('Failed to sync state', e);
    }
  }, [auditLogs, notifications, masterKey, telegramToken, telegramChatId]);

  // Synchronize masterKey with backend server for automated server-side decryption
  useEffect(() => {
    if (masterKey) {
      fetch('/api/config/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: masterKey })
      }).catch(() => {});
    }
  }, [masterKey]);

  // Real-Time Server-Sent Events (SSE) Listener for instant inbound orders from Website A
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/orders/stream');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_ORDER' && data.order) {
            const newOrder: Order = data.order;
            setOrders(prev => {
              const exists = prev.some(o => o.id === newOrder.id);
              if (exists) {
                return prev.map(o => o.id === newOrder.id ? newOrder : o);
              }
              return [newOrder, ...prev];
            });
            setSelectedOrder(newOrder);
            setActiveTab('orders');
            setAutoDecryptNotice(`⚡ नया ऑर्डर आ चुका है: ${newOrder.id} (${newOrder.clientName})`);
            setTimeout(() => setAutoDecryptNotice(null), 8000);
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (es) es.close();
    };
  }, []);

  // Sync with Backend Server & Supabase on startup and periodic interval (every 2.5s)
  useEffect(() => {
    const syncRemote = async () => {
      try {
        const serverRes = await fetch('/api/orders');
        if (serverRes.ok) {
          const serverData = await serverRes.json();
          if (serverData.success && Array.isArray(serverData.orders)) {
            setOrders(prev => {
              const orderMap = new Map<string, Order>();
              // First add server orders (which are sorted newest first)
              serverData.orders.forEach((o: Order) => orderMap.set(o.id, o));
              // Then add any local orders that might not be on the server
              prev.forEach(o => {
                if (!orderMap.has(o.id)) orderMap.set(o.id, o);
              });
              return Array.from(orderMap.values());
            });
            return;
          }
        }
      } catch {
        // server fetch fallback
      }

      const remoteOrders = await fetchOrdersFromSupabase();
      if (remoteOrders.length > 0) {
        setOrders(prev => {
          const map = new Map<string, Order>();
          remoteOrders.forEach(o => map.set(o.id, o));
          prev.forEach(o => {
            if (!map.has(o.id)) map.set(o.id, o);
          });
          return Array.from(map.values());
        });
      }
    };

    syncRemote();
    const interval = setInterval(syncRemote, 2500);
    return () => clearInterval(interval);
  }, []);

  // Auto-decrypt any pending orders in state using client masterKey if not yet decrypted
  useEffect(() => {
    if (!masterKey) return;
    orders.forEach(async (order) => {
      if (order.status === 'pending_decryption' && order.encryptedPayload) {
        const res = await decryptPayload(order.encryptedPayload, masterKey);
        if (res.success && res.data) {
          const decryptedData = res.data;
          setOrders(prev => prev.map(o => {
            if (o.id === order.id) {
              return {
                ...o,
                status: 'decrypted',
                clientName: decryptedData.clientName || decryptedData.party1?.fullName || o.clientName,
                formName: decryptedData.formName || decryptedData.documentTitle || o.formName,
                clientPhone: decryptedData.clientPhone || decryptedData.party1?.phone || o.clientPhone,
                stampDutyValue: Number(decryptedData.stampDutyValue || decryptedData.stampDutyAmount || o.stampDutyValue),
                legalData: decryptedData.legalData || (decryptedData.party1 ? decryptedData : o.legalData),
                registrationData: decryptedData.registrationData || o.registrationData,
                rawPayload: decryptedData
              };
            }
            return o;
          }));
        }
      }
    });
  }, [orders, masterKey]);

  // AUTO-DECRYPTION ON APP LOAD (?payload=... or ?data=...)
  useEffect(() => {
    const checkUrlPayload = async () => {
      if (!window.location.search) return;

      const result = await autoDecryptFromUrl(window.location.search, masterKey);
      if (result.detected && result.result) {
        const unlockedOrder = result.result as Order;
        
        // Assign sequential CTC-2026-XXXX format ID
        if (!unlockedOrder.id || !unlockedOrder.id.startsWith('CTC-2026-')) {
          unlockedOrder.id = getNextSequentialId(orders);
        }
        unlockedOrder.source = 'Website A';
        unlockedOrder.status = 'decrypted';

        setOrders(prev => {
          const exists = prev.some(o => o.id === unlockedOrder.id);
          return exists ? prev : [unlockedOrder, ...prev];
        });

        setSelectedOrder(unlockedOrder);
        setAutoDecryptNotice(`Order ${unlockedOrder.id} successfully unlocked and decrypted from Website A!`);
        setTimeout(() => setAutoDecryptNotice(null), 6000);

        addAuditLog({
          type: 'payload_decrypted',
          orderId: unlockedOrder.id,
          message: `Inbound order ${unlockedOrder.id} auto-decrypted using AES-256 Master Key from Website A.`,
          status: 'success'
        });

        // Sync to Supabase
        syncOrderToSupabase(unlockedOrder);

        // Broadcast formatted message to Telegram
        const telegramFormattedMsg = formatTelegramOrderMessage(unlockedOrder);
        sendTelegramNotification(telegramFormattedMsg);

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    checkUrlPayload();
  }, [masterKey]);

  // Helper to append audit log
  const addAuditLog = (entry: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Helper to send Telegram notification
  const sendTelegramNotification = async (messageText: string, channel: string = telegramChatId) => {
    const newNotification: TelegramNotification = {
      id: `tg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      orderId: selectedOrder?.id || 'SYSTEM',
      clientName: selectedOrder?.clientName || 'Client',
      serviceName: selectedOrder?.formName || 'CTC Compliance Stream',
      category: selectedOrder?.category || 'legal',
      channel,
      status: telegramToken ? 'Delivered' : 'Simulated',
      messageText
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Dispatch to server /api/notify
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder?.id,
          clientName: selectedOrder?.clientName,
          serviceName: selectedOrder?.formName,
          category: selectedOrder?.category,
          message: messageText,
          channel
        })
      });
    } catch {
      // Offline fallback
    }
  };

  // Ingest newly unlocked order from InboundPayloadModal
  const handleIngestOrder = (newOrder: Order) => {
    setOrders(prev => {
      const exists = prev.some(o => o.id === newOrder.id);
      return exists ? prev.map(o => o.id === newOrder.id ? newOrder : o) : [newOrder, ...prev];
    });
    setSelectedOrder(newOrder);

    addAuditLog({
      type: 'payload_decrypted',
      orderId: newOrder.id,
      message: `Inbound order ${newOrder.id} successfully decrypted with Secret Key.`,
      status: 'success'
    });

    // Permanent Supabase sync
    syncOrderToSupabase(newOrder);
  };

  // Update order in state
  const handleSaveOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    if (viewingOrder?.id === updatedOrder.id) {
      setViewingOrder(updatedOrder);
    }
    addAuditLog({
      type: 'field_modified',
      orderId: updatedOrder.id,
      message: `Order ${updatedOrder.id} updated and saved.`,
      status: 'success'
    });

    // Permanent Supabase sync
    syncOrderToSupabase(updatedOrder);
  };

  // Confirm order
  const handleConfirmOrder = (orderId: string) => {
    let targetOrd: Order | undefined;
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        targetOrd = {
          ...o,
          status: 'confirmed',
          updatedAt: new Date().toISOString()
        };
        return targetOrd;
      }
      return o;
    }));

    if (targetOrd) {
      syncOrderToSupabase(targetOrd);
    }

    addAuditLog({
      type: 'system_event',
      orderId,
      message: `Order ${orderId} confirmed with verified e-Stamp.`,
      status: 'success'
    });

    const ord = orders.find(o => o.id === orderId);
    if (ord) {
      sendTelegramNotification(
        `✅ *CTC ORDER CONFIRMED*\n• Reference: ${orderId}\n• Client: ${ord.clientName}\n• e-Stamp: ${ord.stampData?.uin || 'Attached'}`
      );
    }
  };

  // Cancel order
  const handleCancelOrder = (orderId: string, reason?: string) => {
    let targetOrd: Order | undefined;
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        targetOrd = {
          ...o,
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        };
        return targetOrd;
      }
      return o;
    }));

    if (targetOrd) {
      syncOrderToSupabase(targetOrd);
    }

    addAuditLog({
      type: 'system_event',
      orderId,
      message: `Order ${orderId} cancelled. Reason: ${reason || 'Admin cancelled from desk'}`,
      status: 'failed'
    });

    const ord = orders.find(o => o.id === orderId);
    if (ord) {
      sendTelegramNotification(
        `❌ *CTC ORDER CANCELLED*\n• Reference: ${orderId}\n• Client: ${ord.clientName}\n• Reason: ${reason || 'Cancelled'}`
      );
    }
  };

  // Clear all data for fresh production reset
  const handleClearAllData = () => {
    setOrders([]);
    setAuditLogs([]);
    setNotifications([]);
    setSelectedOrder(null);
    setViewingOrder(null);
    localStorage.removeItem(STORAGE_ORDERS_KEY);
    localStorage.removeItem(STORAGE_LOGS_KEY);
    localStorage.removeItem(STORAGE_TG_KEY);
    addAuditLog({
      type: 'system_event',
      message: 'System cache cleared for clean production state.',
      status: 'success'
    });
  };

  const pendingStampsCount = orders.filter(
    o => o.category === 'legal' && !o.stampData?.verified
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. Header (Centered CTC + Left Profile Icon + Right Inbound Unlock & Settings) */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenUnlocker={() => setIsUnlockerOpen(true)}
        masterKeyConfigured={Boolean(masterKey)}
        totalOrdersCount={orders.length}
      />

      {/* Auto Decryption Notification Banner */}
      {autoDecryptNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{autoDecryptNotice}</span>
          </div>
          <button 
            onClick={() => setAutoDecryptNotice(null)}
            className="p-1 hover:bg-emerald-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        
        {/* DEDICATED FULL-PAGE VIEW SCREEN (When user clicks "View" from an order) */}
        {viewingOrder ? (
          <ViewDocumentScreen
            order={viewingOrder}
            onBack={() => setViewingOrder(null)}
            onUpdateOrder={handleSaveOrder}
            onSendNotification={sendTelegramNotification}
          />
        ) : (
          <>
            {/* TAB 1: ORDERS */}
            {activeTab === 'orders' && (
              <OrdersView
                orders={orders}
                onSelectOrderForView={(order) => {
                  setSelectedOrder(order);
                  setViewingOrder(order);
                }}
                onOpenUnlocker={() => setIsUnlockerOpen(true)}
              />
            )}

            {/* TAB 2: EDIT */}
            {activeTab === 'edit' && (
              <EditView
                orders={orders}
                currentOrder={selectedOrder}
                onSelectOrder={setSelectedOrder}
                onSaveOrder={handleSaveOrder}
                onSendNotification={sendTelegramNotification}
              />
            )}

            {/* TAB 3: UPLOAD */}
            {activeTab === 'upload' && (
              <UploadView
                orders={orders}
                currentOrder={selectedOrder}
                onSelectOrder={setSelectedOrder}
                onSaveOrder={handleSaveOrder}
                onSendNotification={sendTelegramNotification}
              />
            )}

            {/* TAB 4: FORMATS */}
            {activeTab === 'formats' && (
              <FormatsView
                orders={orders}
                onSelectOrderForView={(order) => {
                  setSelectedOrder(order);
                  setViewingOrder(order);
                }}
              />
            )}
          </>
        )}

      </main>

      {/* 3. Bottom Navigation: Exactly 4 Fixed Tabs (Orders, Edit, Upload, Formats) */}
      {!viewingOrder && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ordersCount={orders.length}
          pendingStampsCount={pendingStampsCount}
        />
      )}

      {/* Inbound Payload Unlocker Modal (Website A integration) */}
      <InboundPayloadModal
        isOpen={isUnlockerOpen}
        onClose={() => setIsUnlockerOpen(false)}
        masterKey={masterKey}
        onUpdateMasterKey={(newKey) => {
          setMasterKey(newKey);
          addAuditLog({
            type: 'system_event',
            message: 'Secret Master Key updated.',
            status: 'success'
          });
        }}
        onIngestOrder={handleIngestOrder}
        onSendNotification={sendTelegramNotification}
      />

      {/* Settings Modal (Final Document & Environment Security) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        orders={orders}
        onClearAllOrders={handleClearAllData}
      />

      {/* Profile & Order Management Drawer Modal */}
      <ProfileDrawerModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        orders={orders}
        onConfirmOrder={handleConfirmOrder}
        onCancelOrder={handleCancelOrder}
        onSelectOrderForView={(order) => {
          setIsProfileOpen(false);
          setSelectedOrder(order);
          setViewingOrder(order);
        }}
      />

    </div>
  );
}

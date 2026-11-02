/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CTC SYSTEM — Admin Panel Legal Compliance
 * Central Transaction & Compliance Processing Panel
 */

import React, { useState, useEffect } from 'react';
import { Order, AuditLog, TelegramNotification } from './types';
import { INITIAL_ORDERS, INITIAL_AUDIT_LOGS, INITIAL_NOTIFICATIONS } from './utils/mockData';
import { DEFAULT_MASTER_KEY, autoDecryptFromUrl } from './utils/crypto';
import { formatTelegramOrderMessage } from './utils/telegramFormatter';

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

import { ShieldCheck, X } from 'lucide-react';

export default function App() {
  // Application State
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('ctc_orders_v3');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('ctc_audit_logs_v3');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [notifications, setNotifications] = useState<TelegramNotification[]>(() => {
    try {
      const saved = localStorage.getItem('ctc_notifications_v3');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // Master Key & Configuration
  const [masterKey, setMasterKey] = useState<string>(() => {
    return localStorage.getItem('ctc_master_key_v3') || DEFAULT_MASTER_KEY;
  });

  const [telegramToken, setTelegramToken] = useState<string>(() => {
    return localStorage.getItem('ctc_tg_token_v3') || '';
  });

  const [telegramChatId, setTelegramChatId] = useState<string>(() => {
    return localStorage.getItem('ctc_tg_chat_id_v3') || '@Quadtrix_Ops_Alerts';
  });

  // Navigation (4 Tabs: orders, edit, upload, formats)
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

  // Dedicated Full-Page View Screen Order
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [autoDecryptNotice, setAutoDecryptNotice] = useState<string | null>(null);

  // Helper to generate next sequential CTC-2026-200X ID
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
      localStorage.setItem('ctc_orders_v3', JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders', e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('ctc_audit_logs_v3', JSON.stringify(auditLogs));
      localStorage.setItem('ctc_notifications_v3', JSON.stringify(notifications));
      localStorage.setItem('ctc_master_key_v3', masterKey);
      localStorage.setItem('ctc_tg_token_v3', telegramToken);
      localStorage.setItem('ctc_tg_chat_id_v3', telegramChatId);
    } catch (e) {
      console.error('Failed to sync state', e);
    }
  }, [auditLogs, notifications, masterKey, telegramToken, telegramChatId]);

  // AUTO-DECRYPTION ON APP LOAD (?payload=...)
  useEffect(() => {
    const checkUrlPayload = async () => {
      if (!window.location.search) return;

      const result = await autoDecryptFromUrl(window.location.search, masterKey);
      if (result.detected && result.result) {
        const unlockedOrder = result.result as Order;
        
        // Assign sequential CTC-2026-200X format ID
        if (!unlockedOrder.id || !unlockedOrder.id.startsWith('CTC-2026-')) {
          unlockedOrder.id = getNextSequentialId(orders);
        }
        unlockedOrder.source = 'URL Parameter';
        unlockedOrder.status = 'pending';

        setOrders(prev => {
          const exists = prev.some(o => o.id === unlockedOrder.id);
          return exists ? prev : [unlockedOrder, ...prev];
        });

        setSelectedOrder(unlockedOrder);
        setAutoDecryptNotice(`Order ${unlockedOrder.id} successfully decrypted with Master Key!`);
        setTimeout(() => setAutoDecryptNotice(null), 6000);

        addAuditLog({
          type: 'payload_decrypted',
          orderId: unlockedOrder.id,
          message: `Inbound order ${unlockedOrder.id} auto-decrypted using AES-256 Master Key.`,
          status: 'success'
        });

        // Broadcast formatted message to Telegram
        const telegramFormattedMsg = formatTelegramOrderMessage(unlockedOrder);
        sendTelegramNotification(telegramFormattedMsg);

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    checkUrlPayload();
  }, []);

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
      // Offline or dev simulation fallback
    }
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
      message: `Order ${updatedOrder.id} fields saved and re-rendered.`,
      status: 'success'
    });
  };

  // Confirm order (from Profile Submit Request desk)
  const handleConfirmOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'confirmed',
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));

    addAuditLog({
      type: 'system_event',
      orderId,
      message: `Order ${orderId} confirmed by Admin with verified e-Stamp.`,
      status: 'success'
    });

    const ord = orders.find(o => o.id === orderId);
    if (ord) {
      sendTelegramNotification(
        `✅ *CTC ORDER CONFIRMED*\n• Reference: ${orderId}\n• Client: ${ord.clientName}\n• e-Stamp: ${ord.stampData?.uin || 'Attached'}`
      );
    }
  };

  // Cancel order (from Profile Submit Request desk)
  const handleCancelOrder = (orderId: string, reason?: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));

    addAuditLog({
      type: 'system_event',
      orderId,
      message: `Order ${orderId} cancelled. Reason: ${reason || 'User cancelled from desk'}`,
      status: 'failed'
    });

    const ord = orders.find(o => o.id === orderId);
    if (ord) {
      sendTelegramNotification(
        `❌ *CTC ORDER CANCELLED*\n• Reference: ${orderId}\n• Client: ${ord.clientName}\n• Reason: ${reason || 'Cancelled'}`
      );
    }
  };

  const pendingStampsCount = orders.filter(
    o => o.category === 'legal' && !o.stampData?.verified
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. Header (Centered CTC + Left Profile Icon + Right Settings Icon) */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
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

            {/* TAB 4: FORMATS (फॉर्मेट) */}
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        masterKey={masterKey}
        onUpdateMasterKey={(newKey) => {
          setMasterKey(newKey);
          addAuditLog({
            type: 'system_event',
            message: 'Master Key updated.',
            status: 'success'
          });
        }}
        telegramToken={telegramToken}
        telegramChatId={telegramChatId}
        onUpdateTelegramConfig={(token, chatId) => {
          setTelegramToken(token);
          setTelegramChatId(chatId);
        }}
      />

      {/* Profile & Order Management Drawer Modal (Confirmed, Cancelled, Pending, Submit Request) */}
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Top Header Component
 * Strict Clean English:
 * - Center: Big bold "CTC", with subtitle "ADMIN PANEL LEGAL COMPLIANCE"
 * - Left: Clean Profile avatar icon
 * - Right: Inbound Unlock button & Settings icon
 */

import React from 'react';
import { Settings, User, KeyRound } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenUnlocker?: () => void;
  masterKeyConfigured?: boolean;
  totalOrdersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSettings, 
  onOpenProfile,
  onOpenUnlocker 
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          
          {/* Left: User Profile Icon */}
          <div className="flex items-center">
            <button
              onClick={onOpenProfile}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 flex items-center justify-center text-slate-700 hover:text-blue-600 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Admin Profile & Order Status (Confirmed, Cancelled, Pending, Submit Request)"
              aria-label="Profile and Request Management"
            >
              <User className="w-5 h-5 text-current" />
            </button>
          </div>

          {/* Center: Top-Center Bold "CTC" with "ADMIN PANEL LEGAL COMPLIANCE" */}
          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
              CTC
            </h1>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider uppercase mt-0.5">
              ADMIN PANEL LEGAL COMPLIANCE
            </div>
          </div>

          {/* Right: Quick Inbound Unlock & Settings Icons */}
          <div className="flex items-center gap-2">
            {onOpenUnlocker && (
              <button
                onClick={onOpenUnlocker}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                title="Unlock Inbound Payload from Website A"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Unlock Website A</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-gray-200 transition-colors"
              title="CTC System Settings & Master Key"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 text-slate-700" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

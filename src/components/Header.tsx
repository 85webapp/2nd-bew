/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Top Header Component
 * Strict Spec:
 * - Center: Big bold "CTC", with subtitle "एडमिन पैनल लीगल कंप्लायंस / ADMIN PANEL LEGAL COMPLIANCE"
 * - Left: Clean Profile avatar icon (no text, no popups)
 * - Right: Settings icon (gear)
 * - REMOVED: Simulate Ingest button, Quadtrix/DOC India subheaders
 */

import React from 'react';
import { Settings, User } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  masterKeyConfigured?: boolean;
  totalOrdersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenProfile }) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          
          {/* Left: User Profile Icon (Click to open Confirmed, Cancelled, Pending & Submit Request) */}
          <div className="flex items-center">
            <button
              onClick={onOpenProfile}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 flex items-center justify-center text-slate-700 hover:text-blue-600 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Admin Profile & Request Status (Confirmed, Cancelled, Pending, Submit Request)"
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
              एडमिन पैनल लीगल कंप्लायंस • ADMIN PANEL LEGAL COMPLIANCE
            </div>
          </div>

          {/* Right: Settings Icon */}
          <div className="flex items-center">
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-gray-200 transition-colors"
              title="CTC System Settings"
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

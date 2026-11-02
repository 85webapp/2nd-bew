/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 4 Fixed Bottom Navigation Tabs: Orders, Edit, Upload, Formats
 */

import React from 'react';
import { 
  Inbox, 
  FileEdit, 
  UploadCloud,
  ScrollText
} from 'lucide-react';

export type TabType = 'orders' | 'edit' | 'upload' | 'formats';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  ordersCount: number;
  pendingStampsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  ordersCount,
  pendingStampsCount,
}) => {
  const tabs = [
    {
      id: 'orders' as TabType,
      label: 'Orders',
      icon: Inbox,
      badge: ordersCount > 0 ? ordersCount : null,
    },
    {
      id: 'edit' as TabType,
      label: 'Edit',
      icon: FileEdit,
      badge: null,
    },
    {
      id: 'upload' as TabType,
      label: 'Upload',
      icon: UploadCloud,
      badge: pendingStampsCount > 0 ? pendingStampsCount : null,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'formats' as TabType,
      label: 'Formats',
      icon: ScrollText,
      badge: null,
    },
  ];

  return (
    <nav className="bottom-nav-bar fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-md">
      <div className="max-w-md mx-auto sm:max-w-xl md:max-w-2xl px-3 sm:px-6">
        <div className="grid grid-cols-4 h-16 sm:h-18">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center transition-all duration-150 py-1 ${
                  isActive
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 font-normal'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-12 sm:w-16 h-0.5 bg-blue-600 rounded-b-full" />
                )}

                <div className="relative">
                  <Icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
                      isActive ? 'scale-110 text-blue-600 stroke-[2.4]' : 'stroke-[1.8]'
                    }`}
                  />
                  {tab.badge !== null && (
                    <span
                      className={`absolute -top-1 -right-2.5 px-1.5 py-0.2 text-[10px] font-bold text-white rounded-full leading-tight shadow-xs ${
                        tab.badgeColor || 'bg-blue-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-xs mt-1 tracking-tight ${
                    isActive ? 'font-bold text-blue-600' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

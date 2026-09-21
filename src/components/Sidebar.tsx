/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Contact, 
  FolderKanban, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Settings, 
  History,
  X,
  Briefcase
} from 'lucide-react';
import { PageId, User } from '../types';
import { useBranding } from '../hooks/useBranding';

interface SidebarProps {
  currentTab: PageId;
  setCurrentTab: (tab: PageId) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  user?: User | null;
}

interface SidebarMenuItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_ITEMS: SidebarMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'employees', label: 'Employees', icon: Contact },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'income', label: 'Income', icon: ArrowUpRight },
  { id: 'expenses', label: 'Expenses', icon: ArrowDownLeft },
  { id: 'salaries', label: 'Salary Payments', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'activity', label: 'Activity Log', icon: History },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isMobileOpen,
  setIsMobileOpen,
  user
}) => {
  const branding = useBranding();

  const handleItemClick = (tabId: PageId) => {
    setCurrentTab(tabId);
    setIsMobileOpen(false); // Close sidebar on mobile after clicking
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between h-18 px-6 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          {branding.companyLogo ? (
            <img 
              src={branding.companyLogo} 
              alt={branding.displayName} 
              className="h-10 w-10 object-cover rounded-xl shadow-md shrink-0" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center justify-center h-10 w-10 bg-[#2563EB] text-white rounded-xl shadow-md shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">{branding.displayName}</h1>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">Administration Panel</p>
          </div>
        </div>
        
        {/* Mobile close button */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors duration-150 shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-150 text-left ${
                isActive
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 transition-colors duration-150 ${
                isActive ? 'text-[#2563EB]' : 'text-slate-400 group-hover:text-slate-600'
              }`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4.5 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
            {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-slate-800 truncate">{user?.fullName || user?.username || 'Admin'}</h4>
            <p className="text-[10px] text-slate-400 truncate">{user?.role || 'Admin'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent Side Drawer) */}
      <aside className="hidden lg:block w-64 h-screen fixed top-0 left-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileOpen(false)}
          />
          
          {/* Sidebar sliding drawer */}
          <div className="relative w-64 h-full bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

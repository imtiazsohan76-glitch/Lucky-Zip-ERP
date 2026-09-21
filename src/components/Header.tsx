/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, Bell, LogOut, Search, User as UserIcon, CheckCircle2, DollarSign, Briefcase } from 'lucide-react';
import { useBranding } from '../hooks/useBranding';

import { User as UserType } from '../types';

interface HeaderProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onLogoutClick: () => void;
  user?: UserType | null;
}

export const Header: React.FC<HeaderProps> = ({
  setIsMobileOpen,
  searchQuery,
  setSearchQuery,
  onLogoutClick,
  user
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const branding = useBranding();

  // Live notifications
  const notifications: { id: number; text: string; time: string; icon: React.ReactNode }[] = [];

  return (
    <header className="sticky top-0 right-0 z-10 flex items-center justify-between h-18 px-4 lg:px-8 bg-white border-b border-slate-200">
      
      {/* Brand & Mobile Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors duration-150"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          {branding.companyLogo ? (
            <img 
              src={branding.companyLogo} 
              alt={branding.displayName} 
              className="h-8 w-8 object-cover rounded-lg shadow-xs shrink-0" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center justify-center h-8 w-8 bg-[#2563EB] text-white rounded-lg shadow-xs shrink-0">
              <Briefcase className="h-4 w-4" />
            </div>
          )}
          <span className="font-bold text-slate-900 text-sm lg:text-base tracking-tight">{branding.displayName}</span>
        </div>
      </div>

      {/* Global Search Bar (Responsive hidden on small screens) */}
      <div className="hidden sm:flex items-center w-full max-w-md relative mx-4">
        <Search className="absolute left-3.5 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Global search (clients, projects, employees...)"
          className="w-full h-10.5 text-sm bg-slate-50 border border-slate-200 focus:border-[#2563EB] rounded-xl pl-11 pr-4 text-[#111827] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#2563EB]/5 focus:bg-white transition-all duration-200"
        />
      </div>

      {/* Top Header Actions */}
      <div className="flex items-center gap-2 lg:gap-3.5">
        
        {/* Notifications Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl transition-all duration-150"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-[#EF4444] text-[9px] font-bold text-white flex items-center justify-center rounded-full ring-2 ring-white">
              3
            </span>
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setShowNotifications(false)} 
              />
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4.5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Notifications</h4>
                  <span className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer">Mark all read</span>
                </div>
                <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-4.5 hover:bg-slate-50/50 flex items-start gap-3 transition-colors duration-150">
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                        {notif.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{notif.text}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Current User Profiler (Desktop Layout) */}
        <div className="hidden md:flex items-center gap-3.5 pl-2 border-l border-slate-100">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-500">Welcome,</span>
            <span className="text-xs font-bold text-slate-900">{user?.fullName || user?.username || 'Admin'}</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-[#2563EB]/20">
            {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Logout Trigger */}
        <button
          onClick={onLogoutClick}
          className="p-2.5 hover:bg-red-50 text-slate-500 hover:text-[#EF4444] rounded-xl transition-all duration-150 border border-transparent hover:border-red-100/30"
          title="Sign Out"
        >
          <LogOut className="h-5 w-5" />
        </button>

      </div>
    </header>
  );
};

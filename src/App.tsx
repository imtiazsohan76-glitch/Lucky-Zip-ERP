/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { callGasApi } from './api';
import { PageId, User } from './types';
import { useBranding } from './hooks/useBranding';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { ConfirmationDialog, SuccessToast } from './components/UIComponents';
import { 
  DashboardPage, 
  ClientsPage, 
  EmployeesPage, 
  ProjectsPage, 
  IncomePage, 
  ExpensesPage, 
  SalariesPage, 
  SettingsPage, 
  ActivityLogPage 
} from './components/Pages';

export default function App() {
  const branding = useBranding();
  const [currentTab, setCurrentTab] = useState<PageId>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);

  // Verify session on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      setIsVerifyingSession(false);
      return;
    }

    callGasApi('verifySession', { token })
      .then((res) => {
        if (res.success && res.data) {
          if (typeof res.data === 'object' && res.data.username) {
            setUser((prev) => ({ ...prev, ...res.data }));
          }
        } else {
          // Invalid or expired session
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setUser(null);
        }
      })
      .catch(() => {
        // Network warning - preserve cached user
      })
      .finally(() => {
        setIsVerifyingSession(false);
      });
  }, []);

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    const token = localStorage.getItem('auth_token');
    try {
      await callGasApi('logout', { token, user });
    } catch {
      // Ignore network errors during logout
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setToastMsg('Securely signed out of the administrative terminal.');
  };

  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Agency ERP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(userData) => setUser(userData)} />;
  }

  // Switch content page based on current active tab
  const renderPage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} globalSearch={globalSearch} />;
      case 'clients':
        return <ClientsPage globalSearch={globalSearch} />;
      case 'employees':
        return <EmployeesPage globalSearch={globalSearch} />;
      case 'projects':
        return <ProjectsPage globalSearch={globalSearch} />;
      case 'income':
        return <IncomePage globalSearch={globalSearch} />;
      case 'expenses':
        return <ExpensesPage globalSearch={globalSearch} />;
      case 'salaries':
        return <SalariesPage globalSearch={globalSearch} />;
      case 'settings':
        return <SettingsPage />;
      case 'activity':
        return <ActivityLogPage globalSearch={globalSearch} />;
      default:
        return <DashboardPage onNavigate={setCurrentTab} globalSearch={globalSearch} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex font-sans antialiased">
      
      {/* 1. LEFT SIDEBAR DRAWERS */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
        user={user}
      />

      {/* 2. MAIN LAYOUT CONTAINER */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* TOP HEADER BAR */}
        <Header 
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          searchQuery={globalSearch}
          setSearchQuery={setGlobalSearch}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          user={user}
        />

        {/* MAIN VISUAL RUNWAY */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {renderPage()}
        </main>

      </div>

      {/* 3. LOGOUT CONFIRMATION DIALOG */}
      <ConfirmationDialog 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={handleLogoutConfirm} 
        title="Confirm Session Exit" 
        message={`Are you sure you want to sign out of the ${branding.displayName} administrative terminal? All local changes have already been safely buffered.`} 
        confirmLabel="Logout Now"
        cancelLabel="Stay Signed In"
        type="danger"
      />

      {/* 4. REUSABLE ACTION TOAST */}
      {toastMsg && (
        <SuccessToast message={toastMsg} onClose={() => setToastMsg(null)} />
      )}

    </div>
  );
}


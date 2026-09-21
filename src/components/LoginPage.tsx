/**
 * @file LoginPage.tsx
 * @description Single-role (Admin) Login screen for Agency ERP.
 */

import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ShieldAlert, LogIn } from 'lucide-react';
import { callGasApi } from '../api';
import { User as UserType } from '../types';
import { useBranding } from '../hooks/useBranding';

interface LoginPageProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const branding = useBranding();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [gasErrorDetails, setGasErrorDetails] = useState<boolean>(false);

  const handleFallbackLogin = () => {
    const adminUser: UserType = {
      userId: 'USR-000001',
      createdDate: new Date().toISOString().split('T')[0],
      createdTime: new Date().toLocaleTimeString(),
      fullName: 'System Administrator',
      email: 'admin@agency.com',
      username: username.trim() || 'admin',
      role: 'admin',
      status: 'Active',
      token: 'fallback-admin-token'
    };

    localStorage.setItem('auth_token', 'fallback-admin-token');
    localStorage.setItem('auth_user', JSON.stringify(adminUser));
    onLoginSuccess(adminUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setGasErrorDetails(false);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      const res = await callGasApi<UserType>('login', {
        username: cleanUsername,
        password: cleanPassword
      });

      if (res.success && res.data && (res.data.username || res.data.userId || res.data.token)) {
        const userData = res.data;
        if (userData.token) {
          localStorage.setItem('auth_token', userData.token);
        }
        localStorage.setItem('auth_user', JSON.stringify(userData));
        onLoginSuccess(userData);
      } else {
        if (res.isGasDeploymentError || res.message?.includes('Google Apps Script') || res.message?.includes('non-JSON')) {
          setGasErrorDetails(true);
          setErrorMsg(res.message || 'Google Apps Script Web App permissions issue.');
        } else {
          setErrorMsg(res.message || 'Invalid Username or Password. Please check username and password case-sensitivity.');
        }
      }
    } catch (err: any) {
      setGasErrorDetails(true);
      setErrorMsg(err?.message || 'Google Apps Script connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('gas_web_app_url');
    localStorage.removeItem('spreadsheet_id');
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('gas_cache_') || k.startsWith('auth_'))) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    setErrorMsg('Local storage and session cache cleared. Please try logging in again.');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
      {/* Container Box */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Card */}
        <div className="p-8 text-center bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25 mb-4">
            {branding.companyLogo ? (
              <img
                src={branding.companyLogo}
                alt={branding.displayName}
                className="h-10 w-10 object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <LogIn className="h-7 w-7" />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {branding.displayName}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Administrative Portal Sign In
          </p>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {errorMsg && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 animate-in fade-in slide-in-from-top-1 duration-150">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1 text-xs font-medium leading-relaxed space-y-1">
                  <div className="font-bold text-amber-900">
                    {gasErrorDetails ? 'Google Apps Script Web App Permissons Error' : 'Authentication Notice'}
                  </div>
                  <div>{errorMsg}</div>
                </div>
              </div>

              {gasErrorDetails && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Google Apps Script ঠিক করার উপায়:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed font-normal">
                    <li>Google Apps Script এ যান (<span className="font-mono bg-white px-1 border rounded">script.google.com</span>)</li>
                    <li><strong className="text-slate-800">Deploy</strong> &rarr; <strong className="text-slate-800">New deployment</strong> চাপুন</li>
                    <li>Select type: <strong className="text-slate-800">Web app</strong></li>
                    <li>Execute as: <strong className="text-slate-800">Me</strong></li>
                    <li>Who has access: <strong className="text-blue-700 font-bold">Anyone</strong> (বাধ্যতামূলক)</li>
                    <li><strong className="text-slate-800">Deploy</strong> ও <strong className="text-slate-800">Authorize access</strong> করে নিন।</li>
                  </ol>

                  <div className="pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleFallbackLogin}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Continue with Fallback Admin Login</span>
                      <LogIn className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-1">
                      (GAS ঠিক করা পর্যন্ত সরাসরি অ্যাডমিন পোর্টালে ঢুকতে এটি ব্যবহার করুন)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Username Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-4.5 w-4.5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full h-11 pl-10 pr-4 text-sm bg-slate-50 border border-slate-200 focus:border-[#2563EB] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:bg-white transition-all duration-150"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full h-11 pl-10 pr-11 text-sm bg-slate-50 border border-slate-200 focus:border-[#2563EB] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:bg-white transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Submit Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl shadow-md shadow-[#2563EB]/20 transition-all duration-150 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Login</span>
                <LogIn className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center flex flex-col items-center justify-center gap-1.5">
          <p className="text-[11px] text-slate-400 font-medium">
            Managed via Google Sheets • Restricted Admin Access
          </p>
          <button
            type="button"
            onClick={handleClearCache}
            className="text-[10px] text-slate-400 hover:text-slate-600 underline transition-colors cursor-pointer"
          >
            Reset Session & Clear Local Cache
          </button>
        </div>
      </div>
    </div>
  );
};

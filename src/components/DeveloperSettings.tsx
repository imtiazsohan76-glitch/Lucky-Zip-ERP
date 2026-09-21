/**
 * @file DeveloperSettings.tsx
 * @description Developer Settings & Environment Variables Management Component for Agency ERP.
 * Allows managing Web App URL and Spreadsheet ID dynamically with zero rebuild/refresh required.
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Globe, 
  Database, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trash2, 
  Save, 
  Activity, 
  ShieldCheck, 
  HardDrive, 
  Cpu, 
  Info, 
  Copy, 
  Check, 
  ExternalLink,
  Code2,
  AlertTriangle
} from 'lucide-react';
import { 
  getGasWebAppUrlDetails, 
  getSpreadsheetIdDetails, 
  DEFAULT_GAS_WEB_APP_URL, 
  DEFAULT_SPREADSHEET_ID,
  ConfigSource
} from '../config';
import { setGasWebAppUrl, setSpreadsheetId } from '../api';

interface DeveloperSettingsProps {
  onSuccessToast?: (msg: string) => void;
}

export const DeveloperSettings: React.FC<DeveloperSettingsProps> = ({ onSuccessToast }) => {
  // Config details state
  const [urlDetails, setUrlDetails] = useState(getGasWebAppUrlDetails());
  const [spreadsheetDetails, setSpreadsheetDetails] = useState(getSpreadsheetIdDetails());

  // Input fields state
  const [inputUrl, setInputUrl] = useState(urlDetails.value);
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState(spreadsheetDetails.value);

  // Connection Test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
    timestamp?: string;
  } | null>(null);

  // Local notification state inside tab
  const [localMessage, setLocalMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync inputs with resolved config on mount or update
  const refreshConfigState = () => {
    const urlDet = getGasWebAppUrlDetails();
    const spDet = getSpreadsheetIdDetails();
    setUrlDetails(urlDet);
    setSpreadsheetDetails(spDet);
    setInputUrl(urlDet.value);
    setInputSpreadsheetId(spDet.value);
  };

  useEffect(() => {
    refreshConfigState();
  }, []);

  // Helper for copy button
  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. SAVE ACTION
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const trimmedUrl = inputUrl.trim();
    const trimmedSp = inputSpreadsheetId.trim();

    if (!trimmedUrl) {
      setLocalMessage({ text: 'Google Apps Script Web App URL cannot be empty.', type: 'error' });
      return;
    }

    setGasWebAppUrl(trimmedUrl);
    setSpreadsheetId(trimmedSp);

    // Refresh configuration state
    refreshConfigState();

    const msg = 'Environment variables saved to Local Storage! API requests will immediately use the new configuration.';
    setLocalMessage({ text: msg, type: 'success' });
    if (onSuccessToast) onSuccessToast(msg);
  };

  // 2. TEST CONNECTION ACTION
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setLocalMessage(null);

    const targetUrl = inputUrl.trim() || urlDetails.value;

    try {
      // Build test health URL
      const separator = targetUrl.includes('?') ? '&' : '?';
      const healthUrl = `${targetUrl}${separator}action=health&_t=${Date.now()}`;

      const startTime = performance.now();
      const response = await fetch(healthUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const isOk = data.status === 'success' || data.success === true || data.status === 'active';

      if (isOk) {
        setTestResult({
          success: true,
          message: `Connected successfully (${latency}ms latency)`,
          details: data.data || data,
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Backend returned unsuccessful status response.',
          details: data
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to fetch. Ensure Google Apps Script Web App is deployed with "Who has access: Anyone".'
      });
    } finally {
      setTesting(false);
    }
  };

  // 3. RESET TO DEFAULT ACTION
  const handleResetToDefault = () => {
    localStorage.removeItem('gas_web_app_url');
    localStorage.removeItem('spreadsheet_id');

    refreshConfigState();
    setTestResult(null);

    const msg = 'Reset to default configuration. Values reloaded from config.ts / environment variables.';
    setLocalMessage({ text: msg, type: 'info' });
    if (onSuccessToast) onSuccessToast(msg);
  };

  // 4. CLEAR LOCAL STORAGE ACTION
  const handleClearLocalStorage = () => {
    // Remove specific keys
    localStorage.removeItem('gas_web_app_url');
    localStorage.removeItem('spreadsheet_id');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    // Remove all cached API data (gas_cache_*)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('gas_cache_') || key.startsWith('auth_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    refreshConfigState();
    setTestResult(null);

    const msg = 'Local Storage cleared! All cached API data, auth tokens, and overrides have been purged.';
    setLocalMessage({ text: msg, type: 'info' });
    if (onSuccessToast) onSuccessToast(msg);
  };

  // Helper badge generator
  const renderSourceBadge = (source: ConfigSource) => {
    switch (source) {
      case 'Local Storage':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <HardDrive className="h-3.5 w-3.5" />
            Local Storage (User Override)
          </span>
        );
      case 'Environment Variables':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Environment Variables (.env)
          </span>
        );
      case 'Default Config':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Cpu className="h-3.5 w-3.5" />
            Default Config (config.ts)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#2563EB]/10 dark:bg-[#2563EB]/20 text-[#2563EB] rounded-2xl">
              <Code2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Developer Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage backend API endpoints, spreadsheet identifiers, and runtime overrides with zero build or restart required.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Hot-Reloadable Config Active</span>
          </div>
        </div>
      </div>

      {/* Local Notification Banner */}
      {localMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-150 ${
          localMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : localMessage.type === 'error'
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {localMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {localMessage.type === 'error' && <XCircle className="h-4 w-4 shrink-0" />}
            {localMessage.type === 'info' && <Info className="h-4 w-4 shrink-0" />}
            <span>{localMessage.text}</span>
          </div>
          <button 
            onClick={() => setLocalMessage(null)}
            className="text-xs font-bold hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Environment Variables & API Configuration</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-semibold">Vite Runtime Scope</span>
        </div>

        <div className="p-6 space-y-8">
          
          {/* FIELD 1: Web App URL */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="gas_web_app_url_input" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#2563EB]" />
                1. Google Apps Script Web App URL
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  KEY: VITE_GAS_WEB_APP_URL
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('VITE_GAS_WEB_APP_URL', 'key_url')}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded transition-colors"
                  title="Copy Key Name"
                >
                  {copiedKey === 'key_url' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <input 
                id="gas_web_app_url_input"
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxx/exec"
                className="w-full h-11 px-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Active Source:</span>
                {renderSourceBadge(urlDetails.source)}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Example: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">https://script.google.com/macros/s/.../exec</code>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* FIELD 2: Spreadsheet ID */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="spreadsheet_id_input" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-600" />
                2. Google Spreadsheet ID
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  KEY: VITE_SPREADSHEET_ID
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('VITE_SPREADSHEET_ID', 'key_sp')}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded transition-colors"
                  title="Copy Key Name"
                >
                  {copiedKey === 'key_sp' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <input 
                id="spreadsheet_id_input"
                type="text"
                value={inputSpreadsheetId}
                onChange={(e) => setInputSpreadsheetId(e.target.value)}
                placeholder="1up_8Q8rkTCNtQek7M6arQHnn2nMFWuXygzZWxU6j-Gg"
                className="w-full h-11 px-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Active Source:</span>
                {renderSourceBadge(spreadsheetDetails.source)}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Example: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">1up_8Q8rkTCNtQek7M6arQHnn2nMFWuXygzZWxU6j-Gg</code>
              </div>
            </div>
          </div>

          {/* Test Connection Output Box */}
          {testResult && (
            <div className={`p-4 rounded-xl border space-y-2 animate-in fade-in duration-200 ${
              testResult.success 
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold">
                  {testResult.success ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>✅ Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span>❌ Connection Failed</span>
                    </>
                  )}
                </div>
                {testResult.timestamp && (
                  <span className="text-[10px] font-mono text-slate-400">{testResult.timestamp}</span>
                )}
              </div>

              <p className="text-xs leading-relaxed font-medium">
                {testResult.message}
              </p>

              {testResult.details && (
                <div className="mt-2 p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-slate-200/60 dark:border-slate-800 text-[11px] font-mono overflow-x-auto">
                  <pre>{JSON.stringify(testResult.details, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* Action Toolbar Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            
            {/* Left Group: Secondary utilities */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="h-10 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span>Reset to Default</span>
              </button>

              <button
                type="button"
                onClick={handleClearLocalStorage}
                className="h-10 px-4 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900 rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                <span>Clear Local Storage</span>
              </button>
            </div>

            {/* Right Group: Primary actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="h-10 px-4 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 active:scale-98"
              >
                <Activity className={`h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing Endpoint...' : 'Test Connection'}</span>
              </button>

              <button
                type="submit"
                className="h-10 px-5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Settings</span>
              </button>
            </div>

          </div>

        </div>

      </form>

      {/* Summary Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-[#2563EB]" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Active Runtime Configuration Summary
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Web App URL</span>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate" title={urlDetails.value}>
              {urlDetails.value}
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Source:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{urlDetails.source}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spreadsheet ID</span>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate" title={spreadsheetDetails.value}>
              {spreadsheetDetails.value}
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Source:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{spreadsheetDetails.source}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

/**
 * @file config.ts
 * @description Centralized Configuration for Agency ERP.
 * Allows dynamic configuration via Local Storage, Environment Variables, or Default Config.
 */

export const DEFAULT_GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyYoYrpyic9aibiqxDTAV8pou4np1N1_um8WB2M6rCtSfCsRy7hBIvAEWi6RvfLldW2jA/exec';

export const DEFAULT_SPREADSHEET_ID =
  '1up_8Q8rkTCNtQek7M6arQHnn2nMFWuXygzZWxU6j-Gg';

export type ConfigSource = 'Local Storage' | 'Environment Variables' | 'Default Config';

export interface ConfigDetails {
  value: string;
  source: ConfigSource;
  isOverridden: boolean;
}

/**
 * Cleans and normalizes Google Apps Script Web App URL by removing trailing query strings or accidental quotes.
 */
export function cleanGasUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  if (url.includes('?')) {
    url = url.split('?')[0];
  }
  return url.trim();
}

/**
 * Extracts pure Spreadsheet ID from raw text or Google Sheet URLs.
 */
export function cleanSpreadsheetId(rawId: string): string {
  if (!rawId) return '';
  let id = rawId.trim();
  if (id.includes('/d/')) {
    const match = id.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  if (id.includes('?')) {
    id = id.split('?')[0];
  }
  if (id.includes('/')) {
    id = id.split('/')[0];
  }
  return id.trim();
}

/**
 * Dynamically resolves the active Google Apps Script Web App URL along with its source origin.
 */
export function getGasWebAppUrlDetails(): ConfigDetails {
  const localVal = localStorage.getItem('gas_web_app_url');
  if (localVal && localVal.trim()) {
    const cleaned = cleanGasUrl(localVal);
    if (cleaned) {
      return { value: cleaned, source: 'Local Storage', isOverridden: true };
    }
  }
  const envVal = (import.meta as any).env?.VITE_GAS_WEB_APP_URL;
  if (envVal && envVal.trim()) {
    const cleaned = cleanGasUrl(envVal);
    if (cleaned) {
      return { value: cleaned, source: 'Environment Variables', isOverridden: false };
    }
  }
  return { value: cleanGasUrl(DEFAULT_GAS_WEB_APP_URL), source: 'Default Config', isOverridden: false };
}

/**
 * Dynamically resolves the active Google Spreadsheet ID along with its source origin.
 */
export function getSpreadsheetIdDetails(): ConfigDetails {
  const localVal = localStorage.getItem('spreadsheet_id');
  if (localVal && localVal.trim()) {
    const cleaned = cleanSpreadsheetId(localVal);
    if (cleaned) {
      return { value: cleaned, source: 'Local Storage', isOverridden: true };
    }
  }
  const envVal = (import.meta as any).env?.VITE_SPREADSHEET_ID;
  if (envVal && envVal.trim()) {
    const cleaned = cleanSpreadsheetId(envVal);
    if (cleaned) {
      return { value: cleaned, source: 'Environment Variables', isOverridden: false };
    }
  }
  return { value: cleanSpreadsheetId(DEFAULT_SPREADSHEET_ID), source: 'Default Config', isOverridden: false };
}

export const APPS_SCRIPT_WEB_APP_URL: string = getGasWebAppUrlDetails().value;
export const SPREADSHEET_ID: string = getSpreadsheetIdDetails().value;


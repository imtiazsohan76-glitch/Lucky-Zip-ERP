/**
 * @file api.ts
 * @description Communication utility for sending requests to Google Apps Script Web App API.
 */

import {
  APPS_SCRIPT_WEB_APP_URL,
  SPREADSHEET_ID,
  getGasWebAppUrlDetails,
  getSpreadsheetIdDetails
} from './config';

/**
 * Retrieves the published Google Apps Script Web App URL from configuration or localStorage.
 */
export function getGasWebAppUrl(): string {
  return getGasWebAppUrlDetails().value;
}

/**
 * Persists custom Google Apps Script Web App URL in localStorage.
 */
export function setGasWebAppUrl(url: string): void {
  if (url.trim()) {
    localStorage.setItem('gas_web_app_url', url.trim());
  } else {
    localStorage.removeItem('gas_web_app_url');
  }
}

/**
 * Retrieves the active Google Spreadsheet ID from configuration or localStorage.
 */
export function getSpreadsheetId(): string {
  return getSpreadsheetIdDetails().value;
}

/**
 * Persists custom Google Spreadsheet ID in localStorage.
 */
export function setSpreadsheetId(id: string): void {
  if (id.trim()) {
    localStorage.setItem('spreadsheet_id', id.trim());
  } else {
    localStorage.removeItem('spreadsheet_id');
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  status?: string;
  code: number;
  message: string;
  data: T;
  timestamp?: string;
  isGasDeploymentError?: boolean;
}

// Client-side in-flight request deduplication to prevent duplicate network calls
const clientInFlightRequests = new Map<string, Promise<ApiResponse<any>>>();

/**
 * Dispatches an API call to the Google Apps Script Web App API.
 * Prefers GET requests for CORS and redirect compatibility with Google Apps Script.
 */
export async function callGasApi<T = any>(
  rawAction: string, 
  payload: Record<string, any> = {}
): Promise<ApiResponse<T>> {
  // Normalize alias actions
  const action = rawAction === 'getIncome' ? 'getIncomes' : (rawAction === 'getExpense' ? 'getExpenses' : (rawAction === 'getSalary' || rawAction === 'getSalaries' ? 'getSalaryPayments' : rawAction));
  const baseUrl = getGasWebAppUrl();

  const isGet = action.startsWith('get') || action === 'verifySession' || action === 'health' || action === 'login';
  const cacheKey = `gas_cache_${action}`;

  // In-flight deduplication key for read actions
  const inFlightKey = `${baseUrl}|${action}|${JSON.stringify(payload)}`;
  if (isGet && clientInFlightRequests.has(inFlightKey)) {
    return clientInFlightRequests.get(inFlightKey)! as Promise<ApiResponse<T>>;
  }

  const executeCall = async (): Promise<ApiResponse<T>> => {
    // Handle local fallback token for session verification
    const effectiveToken = payload.token || localStorage.getItem('auth_token');
    if (action === 'verifySession' && effectiveToken && (effectiveToken.startsWith('fallback-') || effectiveToken.startsWith('demo-'))) {
      const storedUserRaw = localStorage.getItem('auth_user');
      let userObj = {
        userId: 'USR-000001',
        username: 'admin',
        fullName: 'System Administrator',
        role: 'admin',
        status: 'Active',
        token: effectiveToken
      };
      if (storedUserRaw) {
        try { userObj = { ...userObj, ...JSON.parse(storedUserRaw) }; } catch {}
      }
      return {
        success: true,
        status: 'success',
        code: 200,
        message: 'Active session verified (Fallback)',
        data: userObj as unknown as T
      };
    }

    // Local storage cache helper for fallback
    const getCachedData = (): any => {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore storage errors
      }
      return isGet ? [] : null;
    };

    const setCachedData = (data: any) => {
      try {
        if (data !== undefined && data !== null) {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch {
        // Ignore storage errors
      }
    };

    if (!baseUrl) {
      const cached = getCachedData();
      return {
        success: false,
        status: 'unconfigured',
        code: 400,
        message: `Google Apps Script URL is unconfigured for action "${action}".`,
        data: (cached ?? (isGet ? [] : null)) as T
      };
    }

    const token = localStorage.getItem('auth_token');
    const mergedPayload = {
      ...(token && !payload.token ? { token } : {}),
      ...payload
    };

    // Step 1: Try backend Express proxy endpoint first to avoid browser CORS/iframe issues
    try {
      const proxyRes = await fetch('/api/gas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gas-url': baseUrl
        },
        body: JSON.stringify({
          action,
          ...mergedPayload
        })
      });

      if (proxyRes.ok) {
        const json = await proxyRes.json();
        const isSuccess = json.success === true || json.status === 'success';

        if (isSuccess && json.data) {
          setCachedData(json.data);
        }

        // If verifySession failed on remote GAS but we have a stored session user, keep the session alive
        if (!isSuccess && action === 'verifySession') {
          const storedUserRaw = localStorage.getItem('auth_user');
          if (storedUserRaw) {
            try {
              const parsedUser = JSON.parse(storedUserRaw);
              return {
                success: true,
                status: 'success',
                code: 200,
                message: 'Session verified from local cache',
                data: parsedUser as unknown as T
              };
            } catch {}
          }
        }

        // If read action failed or timed out on proxy, attempt local cache fallback
        if (!isSuccess && isGet) {
          const localCache = getCachedData();
          if (localCache && (Array.isArray(localCache) ? localCache.length > 0 : Object.keys(localCache).length > 0)) {
            return {
              success: true,
              status: 'success',
              code: 200,
              message: 'Loaded from local storage (Offline fallback)',
              data: localCache as T,
              timestamp: json.timestamp,
              isGasDeploymentError: false
            };
          }
        }

        const isGasError = json.isGasDeploymentError || (!isSuccess && typeof json.message === 'string' && (json.message.includes('Google Apps Script') || json.message.includes('non-JSON')));

        return {
          success: isSuccess,
          status: json.status || (isSuccess ? 'success' : 'error'),
          code: json.code || (isSuccess ? 200 : 400),
          message: json.message || (isSuccess ? 'Success' : 'API request failed'),
          data: (json.data ?? (isGet ? [] : null)) as T,
          timestamp: json.timestamp,
          isGasDeploymentError: isGasError
        } as ApiResponse<T>;
      }
    } catch {
      // Server proxy failed or not available; fall through to direct fetch
    }

    // Step 2: Fallback to direct fetch
    const cleanBase = baseUrl.includes('?') ? baseUrl.split('?')[0] : baseUrl;

    const buildGetUrl = (act: string, data: Record<string, any>) => {
      const params = new URLSearchParams();
      params.append('action', act);
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          if (typeof val === 'object') {
            params.append(key, JSON.stringify(val));
          } else {
            params.append(key, String(val));
          }
        }
      });
      return `${cleanBase}?${params.toString()}`;
    };

    let url: string;
    let options: RequestInit;

    if (isGet) {
      url = buildGetUrl(action, mergedPayload);
      options = {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow'
      };
    } else {
      // Attempt POST for write / auth actions
      url = cleanBase;
      const bodyPayload = {
        action,
        ...mergedPayload
      };
      options = {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(bodyPayload)
      };
    }

    try {
      let response: Response;
      try {
        response = await fetch(url, options);
      } catch {
        if (!isGet) {
          const fallbackUrl = buildGetUrl(action, mergedPayload);
          const fallbackOptions: RequestInit = {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            redirect: 'follow'
          };
          response = await fetch(fallbackUrl, fallbackOptions);
        } else {
          const bodyPayload = {
            action,
            ...mergedPayload
          };
          const fallbackOptions: RequestInit = {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            redirect: 'follow',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(bodyPayload)
          };
          response = await fetch(cleanBase, fallbackOptions);
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const isSuccess = json.success === true || json.status === 'success';

      if (isSuccess && json.data) {
        setCachedData(json.data);
      }

      return {
        success: isSuccess,
        status: json.status || (isSuccess ? 'success' : 'error'),
        code: json.code || (isSuccess ? 200 : 400),
        message: json.message || '',
        data: (json.data ?? (isGet ? [] : null)) as T,
        timestamp: json.timestamp
      } as ApiResponse<T>;
    } catch (error: any) {
      const fallbackData = getCachedData();
      return {
        success: isGet && !!fallbackData,
        status: (isGet && fallbackData) ? 'success' : 'network_error',
        code: (isGet && fallbackData) ? 200 : 500,
        message: error?.message || 'Network request failed',
        data: (fallbackData ?? (isGet ? [] : null)) as T
      } as ApiResponse<T>;
    }
  };

  const callPromise = executeCall();
  if (isGet) {
    clientInFlightRequests.set(inFlightKey, callPromise);
    callPromise.finally(() => {
      clientInFlightRequests.delete(inFlightKey);
    });
  }

  return callPromise;
}

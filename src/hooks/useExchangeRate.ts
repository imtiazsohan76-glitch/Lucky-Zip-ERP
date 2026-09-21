import { useState, useEffect } from 'react';

/**
 * Helper to get current global USD to BDT exchange rate.
 * Defaults to 120 if not set or invalid.
 */
export function getGlobalExchangeRate(): number {
  const stored = localStorage.getItem('cfg_usd_exchange_rate');
  if (stored) {
    const parsed = parseFloat(stored);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 120;
}

/**
 * React Hook to access and subscribe to the global USD Exchange Rate state.
 */
export function useExchangeRate(): number {
  const [exchangeRate, setExchangeRate] = useState<number>(() => getGlobalExchangeRate());

  useEffect(() => {
    const handleUpdate = () => {
      setExchangeRate(getGlobalExchangeRate());
    };

    window.addEventListener('usdExchangeRateUpdate', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('usdExchangeRateUpdate', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return exchangeRate;
}

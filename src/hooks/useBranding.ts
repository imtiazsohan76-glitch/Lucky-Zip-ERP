import { useState, useEffect } from 'react';

export interface BrandingState {
  companyName: string;
  companyLogo: string;
  displayName: string;
}

export function getBranding(): BrandingState {
  const name = localStorage.getItem('cfg_company_name') || '';
  const logo = localStorage.getItem('cfg_company_logo') || '';
  return {
    companyName: name,
    companyLogo: logo,
    displayName: name.trim() ? name.trim() : 'Agency ERP'
  };
}

export function useBranding(): BrandingState {
  const [branding, setBranding] = useState<BrandingState>(getBranding);

  useEffect(() => {
    const handleUpdate = () => {
      setBranding(getBranding());
    };

    window.addEventListener('brandingUpdate', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('brandingUpdate', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return branding;
}

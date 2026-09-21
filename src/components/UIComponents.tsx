/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Loader2, 
  FolderOpen 
} from 'lucide-react';

// ==========================================
// BUTTONS (Rounded to 12px / rounded-xl)
// ==========================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  fullWidth = false,
  isLoading = false,
  icon,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium h-11 px-5 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  fullWidth = false,
  isLoading = false,
  icon,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium h-11 px-5 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

export const DangerButton: React.FC<ButtonProps> = ({
  children,
  fullWidth = false,
  isLoading = false,
  icon,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-medium h-11 px-5 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ==========================================
// FORM INPUTS (Rounded to 12px / rounded-xl)
// ==========================================

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-slate-400">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`w-full text-sm h-11 bg-white border ${
            error ? 'border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-slate-200 focus:ring-[#2563EB]/10'
          } rounded-xl px-4 ${icon ? 'pl-11' : ''} text-[#111827] placeholder-slate-400 focus:outline-none focus:ring-4 focus:border-[#2563EB] transition-all duration-150 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[#EF4444] mt-0.5">{error}</p>}
    </div>
  );
};

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  error,
  options,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={id}
          className={`w-full text-sm h-11 bg-white border appearance-none ${
            error ? 'border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-slate-200 focus:ring-[#2563EB]/10'
          } rounded-xl px-4 pr-10 text-[#111827] focus:outline-none focus:ring-4 focus:border-[#2563EB] transition-all duration-150 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-slate-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      {error && <p className="text-xs text-[#EF4444] mt-0.5">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full text-sm py-3 bg-white border ${
          error ? 'border-[#EF4444] focus:ring-[#EF4444]/10' : 'border-slate-200 focus:ring-[#2563EB]/10'
        } rounded-xl px-4 text-[#111827] placeholder-slate-400 focus:outline-none focus:ring-4 focus:border-[#2563EB] transition-all duration-150 min-h-[100px] resize-y ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#EF4444] mt-0.5">{error}</p>}
    </div>
  );
};

// ==========================================
// SEARCH BOX & FILTERS
// ==========================================

interface SearchBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange: (value: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  onSearchChange,
  placeholder = 'Search records...',
  className = '',
  value,
  ...props
}) => {
  return (
    <div className={`relative flex items-center w-full max-w-md ${className}`}>
      <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 text-sm bg-white border border-slate-200 focus:border-[#2563EB] rounded-xl pl-10 pr-4 text-[#111827] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 transition-all duration-150"
        {...props}
      />
    </div>
  );
};

interface FilterDropdownProps {
  label: string;
  selected: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  selected,
  options,
  onChange,
  icon = <Filter className="h-4 w-4" />,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = options.find((opt) => opt.value === selected)?.label || label;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium h-10 px-4 rounded-xl transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10"
      >
        {icon}
        <span>{activeLabel}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            Filter by: {label}
          </div>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center justify-between ${
                selected === opt.value
                  ? 'bg-[#2563EB]/10 text-[#2563EB] font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{opt.label}</span>
              {selected === opt.value && (
                <div className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// MODALS & OVERLAYS
// ==========================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footerActions,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Content Container (Rounded 16px) */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors duration-150"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footerActions && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'danger',
}) => {
  if (!isOpen) return null;

  const colorMap = {
    danger: {
      bg: 'bg-red-50 text-red-600',
      icon: <AlertCircle className="h-6 w-6" />,
      btn: DangerButton,
    },
    warning: {
      bg: 'bg-amber-50 text-amber-600',
      icon: <AlertTriangle className="h-6 w-6" />,
      btn: PrimaryButton, // Or custom warning button
    },
    info: {
      bg: 'bg-blue-50 text-[#2563EB]',
      icon: <CheckCircle2 className="h-6 w-6" />,
      btn: PrimaryButton,
    },
  };

  const currentTheme = colorMap[type];
  const ConfirmBtnComponent = currentTheme.btn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 text-center flex flex-col items-center">
        <div className={`p-3 rounded-full mb-4 ${currentTheme.bg}`}>
          {currentTheme.icon}
        </div>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        
        <div className="flex items-center justify-center gap-3 w-full">
          <SecondaryButton onClick={onClose} className="flex-1">
            {cancelLabel}
          </SecondaryButton>
          <ConfirmBtnComponent 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className="flex-1"
          >
            {confirmLabel}
          </ConfirmBtnComponent>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TOAST NOTIFICATIONS (Alert banner)
// ==========================================

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: 'success' | 'info' | 'warning' | 'error';
}

export const SuccessToast: React.FC<ToastProps> = ({
  message,
  onClose,
  type = 'success',
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styleMap = {
    success: {
      bg: 'bg-[#22C55E]/10 border-[#22C55E]/20 text-emerald-800',
      icon: <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />,
    },
    error: {
      bg: 'bg-[#EF4444]/10 border-[#EF4444]/20 text-red-800',
      icon: <AlertCircle className="h-5 w-5 text-[#EF4444]" />,
    },
    warning: {
      bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-amber-800',
      icon: <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />,
    },
    info: {
      bg: 'bg-[#2563EB]/10 border-[#2563EB]/20 text-blue-800',
      icon: <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />,
    },
  };

  const style = styleMap[type];

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4.5 py-3.5 border rounded-xl shadow-lg animate-in slide-in-from-bottom-5 duration-300 max-w-sm bg-white ${style.bg}`}>
      {style.icon}
      <p className="text-sm font-medium">{message}</p>
      <button 
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-slate-200/20 text-slate-400 hover:text-slate-600 transition-colors duration-150 ml-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// ==========================================
// MISCELLANEOUS STATE ELEMENTS
// ==========================================

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dims = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4',
  };
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-t-[#2563EB] border-slate-200 ${dims[size]}`} />
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = <FolderOpen className="h-12 w-12 text-slate-300" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white border border-slate-200 rounded-2xl shadow-xs py-16">
      <div className="p-4 bg-slate-50 rounded-full mb-5 text-slate-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-6">{description}</p>
      {actionLabel && onAction && (
        <PrimaryButton onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      )}
    </div>
  );
};

// ==========================================
// RESPONSIVE TABLE CONTAINER
// ==========================================

interface TableProps {
  headers: string[];
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ headers, children }) => {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
      <table className="w-full border-collapse text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-700 tracking-wider uppercase border-b border-slate-200">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {children}
        </tbody>
      </table>
    </div>
  );
};

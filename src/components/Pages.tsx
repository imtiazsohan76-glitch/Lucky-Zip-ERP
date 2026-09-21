/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Contact, 
  FolderKanban, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Settings, 
  History,
  Plus,
  Briefcase,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Printer,
  Mail,
  Upload,
  Clock,
  Database,
  Cpu,
  Check,
  Search,
  ArrowUpDown,
  Laptop,
  Globe,
  User,
  Server,
  DollarSign
} from 'lucide-react';

import { callGasApi, getGasWebAppUrl, setGasWebAppUrl } from '../api';
import { DeveloperSettings } from './DeveloperSettings';
import { formatDisplayPaymentDate, formatDisplaySalaryMonth, formatSheetDate, formatSheetTime } from '../utils/dateUtils';
import { EmployeePayrollCenter } from './EmployeePayrollCenter';
import { parseEmployeePaymentDetails, formatEmployeePaymentDetails, parseSalaryType } from '../utils/payroll';
import { 
  Client, 
  Employee, 
  Project, 
  Transaction, 
  SalaryPayment, 
  Activity,
  PageId 
} from '../types';
import { useBranding } from '../hooks/useBranding';

import { 
  Table, 
  SearchBox, 
  FilterDropdown, 
  Modal, 
  FormInput, 
  SelectInput, 
  Textarea, 
  PrimaryButton, 
  SecondaryButton, 
  EmptyState,
  SuccessToast,
  ConfirmationDialog
} from './UIComponents';

import { DashboardCards } from './DashboardCards';

// Format Helpers
export function formatTime12Hour(timeStr: string | undefined | null): string {
  if (!timeStr) return '';
  const str = timeStr.toString().trim();
  if (!str) return '';

  if (/am|pm/i.test(str)) {
    return str;
  }

  const timeMatch = str.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const seconds = timeMatch[3];

    if (!isNaN(hours) && hours >= 0 && hours <= 23) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const formattedHours = String(hours).padStart(2, '0');
      
      const timePart = seconds !== undefined
        ? `${formattedHours}:${minutes}:${seconds} ${ampm}`
        : `${formattedHours}:${minutes} ${ampm}`;

      if (/^\d{4}-\d{2}-\d{2}\s/.test(str)) {
        const datePart = str.split(/\s/)[0];
        return `${datePart} ${timePart}`;
      }
      return timePart;
    }
  }

  return str;
}

const formatCurrency = (amount: number, currency: 'BDT' | 'USD' = 'BDT') => {
  const safeNum = (amount === undefined || amount === null || isNaN(Number(amount))) ? 0 : Number(amount);
  if (currency === 'BDT') {
    return `৳${safeNum.toLocaleString('en-IN')}`;
  }
  return `$${safeNum.toLocaleString('en-US')}`;
};

// ==========================================
// 1. DASHBOARD PAGE
// ==========================================

export const DashboardPage: React.FC<{ 
  onNavigate: (tab: PageId) => void;
  globalSearch: string;
}> = ({ onNavigate, globalSearch }) => {
  const branding = useBranding();
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [incomeList, setIncomeList] = useState<Transaction[]>([]);
  const [expensesList, setExpensesList] = useState<Transaction[]>([]);
  const [activitiesList, setActivitiesList] = useState<Activity[]>([]);

  useEffect(() => {
    callGasApi('getProjects').then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        setProjectsList(res.data.map((p: any, i: number) => ({
          id: p.id || p.projectId || `P00${i + 1}`,
          name: p.projectName || p.name || 'Unnamed Project',
          clientName: p.clientName || p.client || 'N/A',
          budget: Number(p.budget || p.amount || 0),
          currency: (p.currency === 'USD' ? 'USD' : 'BDT'),
          status: (p.status || 'pending').toString().toLowerCase(),
          startDate: p.startDate || '',
          endDate: p.endDate || ''
        })));
      }
    }).catch(() => {});

    callGasApi('getIncomes').then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        setIncomeList(res.data.map((inc: any, i: number) => ({
          id: inc.id || inc.incomeId || `INC-00${i + 1}`,
          date: inc.date || inc.createdDate || '',
          category: inc.category || 'Project Milestone',
          description: inc.description || inc.notes || 'Income Transaction',
          amount: Number(inc.amount || inc.amountBDT || 0),
          currency: inc.currency || 'BDT',
          status: (inc.status || 'paid').toString().toLowerCase() === 'paid' ? 'paid' : 'pending'
        })));
      }
    }).catch(() => {});

    callGasApi('getExpenses').then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        setExpensesList(res.data.map((exp: any, i: number) => ({
          id: exp.id || exp.expenseId || `EXP-00${i + 1}`,
          date: exp.date || exp.createdDate || '',
          category: exp.category || 'Infrastructure',
          description: exp.description || exp.notes || 'Operating Expense',
          amount: Number(exp.amount || exp.amountBDT || 0),
          currency: exp.currency || 'BDT',
          status: (exp.status || 'paid').toString().toLowerCase() === 'paid' ? 'paid' : 'pending'
        })));
      }
    }).catch(() => {});

    callGasApi('getActivityLogs').then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        setActivitiesList(res.data.map((act: any, i: number) => ({
          id: act.id || act.activityId || `LOG-${i + 1}`,
          timestamp: String(act.time || act.timestamp || act.datetime || act.date || 'Recent').trim(),
          user: act.user || act.userId || 'System',
          action: act.action || 'Action',
          details: act.details || act.description || '',
          type: act.type || 'info'
        })));
      }
    }).catch(() => {});
  }, []);

  // Apply global search if typing
  const recentProjects = projectsList.slice(0, 3).filter(p => 
    p.name.toLowerCase().includes(globalSearch.toLowerCase()) || 
    p.clientName.toLowerCase().includes(globalSearch.toLowerCase())
  );
  
  const recentIncome = incomeList.slice(0, 3).filter(t => 
    t.description.toLowerCase().includes(globalSearch.toLowerCase()) || 
    t.category.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const recentExpenses = expensesList.slice(0, 3).filter(t => 
    t.description.toLowerCase().includes(globalSearch.toLowerCase()) || 
    t.category.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const recentActivity = activitiesList.slice(0, 4).filter(a => 
    a.action.toLowerCase().includes(globalSearch.toLowerCase()) || 
    a.details.toLowerCase().includes(globalSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#2563EB]/5 via-blue-50/20 to-slate-50 border border-blue-100 rounded-2xl p-6.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back, Imtiaz <Sparkles className="h-5 w-5 text-amber-500 fill-amber-100" />
          </h2>
          <p className="text-sm text-slate-500 mt-1">Here is a comprehensive financial and operational summary of {branding.displayName} today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs">
          <Calendar className="h-4 w-4 text-[#2563EB]" />
          <span>Session Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Dashboard Metric Summary Cards */}
      <DashboardCards />

      {/* Interactive Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Recent Projects Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Recent Projects</h4>
              <p className="text-xs text-slate-400">Current work delivery queues</p>
            </div>
            <button 
              onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              View all
            </button>
          </div>
          
          <div className="space-y-3.5">
            {recentProjects.map((p) => (
              <div key={p.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors duration-150 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">{p.name}</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.clientName}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800">{formatCurrency(p.budget, p.currency)}</span>
                  <span className={`block text-[9px] font-semibold uppercase mt-1 ${
                    p.status === 'in-progress' ? 'text-[#2563EB]' :
                    p.status === 'completed' ? 'text-[#22C55E]' :
                    p.status === 'planning' ? 'text-slate-400' : 'text-[#F59E0B]'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
            {recentProjects.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No recent projects match your search.</p>
            )}
          </div>
        </div>

        {/* Recent Transactions Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Recent Cashbook Entries</h4>
                <p className="text-xs text-slate-400">Latest income and expense records</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onNavigate('income')} className="text-xs font-semibold text-[#22C55E] hover:underline">Income</button>
                <span className="text-slate-300">|</span>
                <button onClick={() => onNavigate('expenses')} className="text-xs font-semibold text-[#EF4444] hover:underline">Expenses</button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Income Line */}
              {recentIncome.slice(0, 2).map((inc) => (
                <div key={inc.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-50 text-[#22C55E] rounded-lg">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{inc.description}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{inc.category}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#22C55E]">+{formatCurrency(inc.amount, inc.currency)}</span>
                </div>
              ))}

              {/* Expense Line */}
              {recentExpenses.slice(0, 2).map((exp) => (
                <div key={exp.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-red-50 text-[#EF4444] rounded-lg">
                      <ArrowDownLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{exp.description}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{exp.category}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#EF4444]">-{formatCurrency(exp.amount, exp.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Recent Operations Log</h4>
              <p className="text-xs text-slate-400">Chronological history of admin activity</p>
            </div>
            <button 
              onClick={() => onNavigate('activity')}
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              View full audit log
            </button>
          </div>

          <div className="space-y-3.5">
            {recentActivity.map((act) => (
              <div key={act.id} className="flex items-start gap-4.5 p-3 hover:bg-slate-50/50 rounded-xl transition-colors duration-150">
                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                  act.type === 'success' ? 'bg-[#22C55E]' :
                  act.type === 'info' ? 'bg-[#2563EB]' :
                  act.type === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">{act.action}</p>
                    <span className="text-[10px] text-slate-400 font-medium">{act.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.details}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">By: {act.user}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};


// ==========================================
// 2. CLIENTS PAGE
// ==========================================

export const ClientsPage: React.FC<{ globalSearch: string }> = ({ globalSearch }) => {
  const [clients, setClients] = useState<Client[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals Visibility
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Selected client for Edit, View, Delete
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Success message toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    company?: string;
    email?: string;
  }>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      status: 'active',
      notes: ''
    });
    setErrors({});
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    const currentLatest = clients.find(c => c.id === client.id) || client;
    setSelectedClient(currentLatest);
    setFormData({
      name: currentLatest.name,
      company: currentLatest.company === 'N/A' ? '' : currentLatest.company,
      email: currentLatest.email === 'N/A' ? '' : currentLatest.email,
      status: currentLatest.status,
      notes: currentLatest.notes || ''
    });
    setErrors({});
    setIsEditOpen(true);
  };

  const handleOpenView = (client: Client) => {
    const currentLatest = clients.find(c => c.id === client.id) || client;
    setSelectedClient(currentLatest);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (client: Client) => {
    const currentLatest = clients.find(c => c.id === client.id) || client;
    setSelectedClient(currentLatest);
    setIsDeleteOpen(true);
  };

  const handleResetEdit = () => {
    if (selectedClient) {
      const currentLatest = clients.find(c => c.id === selectedClient.id) || selectedClient;
      setFormData({
        name: currentLatest.name,
        company: currentLatest.company === 'N/A' ? '' : currentLatest.company,
        email: currentLatest.email === 'N/A' ? '' : currentLatest.email,
        status: currentLatest.status,
        notes: currentLatest.notes || ''
      });
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Client Name is required';
    }
    
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchClients = async (): Promise<Client[]> => {
    try {
      const res = await callGasApi('getClients');
      if (res && res.success && Array.isArray(res.data)) {
        const getCleanStr = (...keys: any[]) => {
          for (const k of keys) {
            if (k !== undefined && k !== null) {
              const str = String(k).trim();
              if (str !== '' && str !== 'N/A') return str;
            }
          }
          return '';
        };

        const mappedClients: Client[] = res.data.map((c: any, index: number) => {
          const id = getCleanStr(c.id, c.clientId, c['Client ID'], c['ID']) || `C00${index + 1}`;
          const name = getCleanStr(c.clientName, c.name, c['Client Name'], c['Contact Person'], c['Name']);
          const company = getCleanStr(c.company, c.companyName, c['Company Name'], c['Company'], c['Company Brand Name'], c.company_name) || 'N/A';
          const email = getCleanStr(c.email, c.emailAddress, c['Email Address'], c['Email']) || 'N/A';
          const rawStatus = getCleanStr(c.status, c['Status']) || 'active';
          const status = rawStatus.toLowerCase() === 'inactive' ? 'inactive' : 'active';
          const projectsCount = Number(c.projectsCount || c['Projects Count'] || 0);
          const notes = getCleanStr(c.notes, c['Notes']);

          return {
            id,
            clientName: name,
            name,
            companyName: company,
            company,
            email,
            status,
            projectsCount,
            notes
          };
        });

        setClients(mappedClients);
        return mappedClients;
      }
    } catch (err) {
      console.error('Failed to load clients from backend:', err);
    }
    return [];
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setToastType('error');
      setToastMsg('Please fix validation errors before saving.');
      return;
    }

    const payload = {
      clientName: formData.name,
      company: formData.company || 'N/A',
      email: formData.email || 'N/A',
      status: formData.status,
      notes: formData.notes || ''
    };

    try {
      const res = await callGasApi('addClient', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Registered new client "${formData.name}" successfully.`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Added client "${formData.name}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to communicate with Google Sheets backend.');
    }

    setIsAddOpen(false);
    resetForm();
    await fetchClients();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    if (!validateForm()) {
      setToastType('error');
      setToastMsg('Please fix validation errors before saving.');
      return;
    }

    const targetClientId = selectedClient.id;

    const payload = {
      id: targetClientId,
      clientName: formData.name,
      company: formData.company || 'N/A',
      email: formData.email || 'N/A',
      status: formData.status,
      notes: formData.notes || ''
    };

    try {
      const res = await callGasApi('updateClient', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Updated client "${formData.name}" details successfully.`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Updated client "${formData.name}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to update client on backend.');
    }

    // Refresh the client list from Google Sheets
    const freshClients = await fetchClients();

    // Update selectedClient and formData with fresh data from Google Sheets
    const updatedClient = freshClients.find(c => c.id === targetClientId);
    if (updatedClient) {
      setSelectedClient(updatedClient);
      setFormData({
        name: updatedClient.name,
        company: updatedClient.company === 'N/A' ? '' : updatedClient.company,
        email: updatedClient.email === 'N/A' ? '' : updatedClient.email,
        status: updatedClient.status,
        notes: updatedClient.notes || ''
      });
    }

    setIsEditOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedClient) return;
    const clientToDelete = selectedClient;

    try {
      const res = await callGasApi('deleteClient', { id: clientToDelete.id });
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Client "${clientToDelete.name}" (${clientToDelete.id}) deleted successfully.`);
      } else {
        setToastType('error');
        setToastMsg(res?.message || `Failed to delete client "${clientToDelete.name}".`);
      }
    } catch (err: any) {
      console.error('Failed to delete client:', err);
      setToastType('error');
      setToastMsg(`Error deleting client: ${err?.message || 'Network error'}`);
    }

    setIsDeleteOpen(false);
    setSelectedClient(null);
    await fetchClients();
  };

  // Filter list
  const query = search || globalSearch;
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(query.toLowerCase()) || 
                          c.company.toLowerCase().includes(query.toLowerCase()) ||
                          c.email.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset pagination to first page upon filter trigger
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, globalSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Clients Directory</h2>
          <p className="text-xs text-slate-500 mt-1">Directory of external company stakeholders and project accounts.</p>
        </div>
        <PrimaryButton 
          icon={<Plus className="h-4 w-4" />} 
          onClick={handleOpenAdd}
        >
          Add Client
        </PrimaryButton>
      </div>

      {/* Filters and search box */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <SearchBox 
          value={search} 
          onSearchChange={setSearch} 
          placeholder="Filter clients by name, brand, or email..." 
        />
        <FilterDropdown 
          label="Status" 
          selected={statusFilter} 
          onChange={setStatusFilter} 
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active Only' },
            { value: 'inactive', label: 'Inactive Only' }
          ]} 
        />
      </div>

      {/* Directory Table */}
      {paginatedClients.length > 0 ? (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-sm text-slate-600 relative">
              <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-700 tracking-wider uppercase border-b border-slate-200 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Client Name</th>
                  <th className="px-6 py-4 font-semibold">Company Name</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{client.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{client.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-medium text-slate-700">{client.company}</td>
                    <td className="px-6 py-4.5 text-slate-500">{client.email}</td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        client.status === 'active' 
                          ? 'bg-emerald-50 text-[#22C55E]' 
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${client.status === 'active' ? 'bg-[#22C55E]' : 'bg-slate-400'}`} />
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenView(client)}
                          title="View Client Details"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-150"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(client)}
                          title="Edit Client"
                          className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all duration-150"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenDelete(client)}
                          title="Delete Client"
                          className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-150"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, filteredClients.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{filteredClients.length}</span> clients
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all duration-150 shadow-xs ${
                    currentPage === pageNum
                      ? 'bg-[#2563EB] text-white font-bold'
                      : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState 
          title="No clients found" 
          description="Try adjusting your filter settings or create a new client profile." 
          actionLabel="Add New Client"
          onAction={handleOpenAdd}
          icon={<Users className="h-12 w-12 text-slate-300" />}
        />
      )}

      {/* Add Client Modal */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        title="Add New Client Account"
        footerActions={
          <>
            <SecondaryButton onClick={resetForm} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsAddOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveAdd}>Register Client</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <FormInput 
            id="add-client-name"
            label="Contact Person Name *" 
            placeholder="e.g. Zahirul Islam" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required 
          />
          <FormInput 
            id="add-client-company"
            label="Company Brand Name" 
            placeholder="e.g. Apex Digital Ltd" 
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            error={errors.company}
          />
          <FormInput 
            id="add-client-email"
            label="Email Address" 
            type="text"
            placeholder="e.g. zahirul@apex.com" 
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
          />
          <SelectInput 
            id="add-client-status"
            label="Status *" 
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            options={[
              { value: 'active', label: 'Active Account' },
              { value: 'inactive', label: 'Inactive / Suspended' }
            ]}
          />
          <Textarea 
            id="add-client-notes"
            label="Notes"
            placeholder="Log account backgrounds, contract requirements, or notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        title="Modify Client Profile"
        footerActions={
          <>
            <SecondaryButton onClick={handleResetEdit} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsEditOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveEdit}>Save Changes</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <FormInput 
            id="edit-client-name"
            label="Contact Person Name *" 
            placeholder="e.g. Zahirul Islam" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required 
          />
          <FormInput 
            id="edit-client-company"
            label="Company Brand Name" 
            placeholder="e.g. Apex Digital Ltd" 
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            error={errors.company}
          />
          <FormInput 
            id="edit-client-email"
            label="Email Address" 
            type="text"
            placeholder="e.g. zahirul@apex.com" 
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
          />
          <SelectInput 
            id="edit-client-status"
            label="Status *" 
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            options={[
              { value: 'active', label: 'Active Account' },
              { value: 'inactive', label: 'Inactive / Suspended' }
            ]}
          />
          <Textarea 
            id="edit-client-notes"
            label="Notes"
            placeholder="Log account backgrounds, contract requirements, or notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* View Client Modal */}
      <Modal 
        isOpen={isViewOpen} 
        onClose={() => setIsViewOpen(false)} 
        title="Client Profile Insights"
        footerActions={
          <SecondaryButton onClick={() => setIsViewOpen(false)}>Close Directory Profile</SecondaryButton>
        }
      >
        {selectedClient && (
          <div className="space-y-6">
            <div className="flex items-center gap-4.5 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="h-14 w-14 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center font-extrabold text-lg uppercase shadow-xs shrink-0">
                {selectedClient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 tracking-tight">{selectedClient.name}</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Account ID: {selectedClient.id}</p>
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full mt-2 border ${
                  selectedClient.status === 'active' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  <span className={`h-1 w-1 rounded-full ${selectedClient.status === 'active' ? 'bg-[#22C55E]' : 'bg-slate-400'}`} />
                  {selectedClient.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Company Name</span>
                <span className="text-sm font-semibold text-slate-800">{selectedClient.company || 'Not Specified'}</span>
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Active Projects</span>
                <span className="text-sm font-semibold text-[#2563EB]">{selectedClient.projectsCount} ongoing engagements</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Email Address</span>
                <span className="text-xs font-bold text-slate-800 select-all">{selectedClient.email || 'None provided'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Internal Admin Notes</span>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {selectedClient.notes || 'No internal administration notes have been logged for this partner.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Client Confirmation Modal */}
      <ConfirmationDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Client Removal"
        message={selectedClient ? `Are you sure you want to delete the client profile for "${selectedClient.name}" (${selectedClient.company})? This action will archive their contact files.` : ''}
        confirmLabel="Remove Profile"
        cancelLabel="Keep Profile"
        type="danger"
      />

      {/* Success Notification */}
      {toastMsg && (
        <SuccessToast message={toastMsg} onClose={() => setToastMsg(null)} type={toastType} />
      )}
    </div>
  );
};


// ==========================================
// 3. EMPLOYEES PAGE
// ==========================================

export const EmployeesPage: React.FC<{ globalSearch: string }> = ({ globalSearch }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [salariesList, setSalariesList] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Modals Visibility
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Selected Employee
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Success message toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    joiningDate: '',
    status: 'active' as 'active' | 'inactive',
    notes: '',
    salaryType: 'Fixed Salary' as 'Fixed Salary' | 'Project Payment' | 'Fixed Salary + Project Payment',
    currency: 'BDT' as 'BDT' | 'USD',
    amount: ''
  });

  // Validation errors state
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    amount?: string;
  }>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      joiningDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
      status: 'active',
      notes: '',
      salaryType: 'Fixed Salary',
      currency: 'BDT',
      amount: ''
    });
    setErrors({});
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    const rawType = (
      emp.salaryType ??
      (emp as any).salary_type ??
      (emp as any).type ??
      (emp as any).paymentType ??
      (emp as any)['Salary Type'] ??
      ''
    ).toString().trim();

    const salType = parseSalaryType(rawType);

    const hasFixedSalary = salType === 'Fixed Salary' || salType === 'Fixed Salary + Project Payment';
    const amountVal = hasFixedSalary && (emp.fixedSalary || emp.salary)
      ? (emp.fixedSalary || emp.salary || 0).toString()
      : '';

    setFormData({
      name: emp.name || emp.employeeName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      role: emp.role || emp.designation || '',
      joiningDate: emp.joiningDate || '',
      status: (emp.status || 'active').toString().toLowerCase() === 'inactive' ? 'inactive' : 'active',
      notes: emp.notes || '',
      salaryType: salType,
      currency: emp.currency || 'BDT',
      amount: amountVal
    });
    setErrors({});
    setIsEditOpen(true);
  };

  const handleOpenView = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDeleteOpen(true);
  };

  const handleResetEdit = () => {
    if (selectedEmployee) {
      const rawType = (
        selectedEmployee.salaryType ??
        (selectedEmployee as any).salary_type ??
        (selectedEmployee as any).type ??
        (selectedEmployee as any).paymentType ??
        (selectedEmployee as any)['Salary Type'] ??
        ''
      ).toString().trim();

      const salType = parseSalaryType(rawType);

      const hasFixedSalary = salType === 'Fixed Salary' || salType === 'Fixed Salary + Project Payment';
      const amountVal = hasFixedSalary && (selectedEmployee.fixedSalary || selectedEmployee.salary)
        ? (selectedEmployee.fixedSalary || selectedEmployee.salary || 0).toString()
        : '';

      setFormData({
        name: selectedEmployee.name || selectedEmployee.employeeName || '',
        email: selectedEmployee.email || '',
        phone: selectedEmployee.phone || '',
        role: selectedEmployee.role || selectedEmployee.designation || '',
        joiningDate: selectedEmployee.joiningDate || '',
        status: (selectedEmployee.status || 'active').toString().toLowerCase() === 'inactive' ? 'inactive' : 'active',
        notes: selectedEmployee.notes || '',
        salaryType: salType,
        currency: selectedEmployee.currency || 'BDT',
        amount: amountVal
      });
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Employee name is required';
    }
    
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.phone.trim()) {
      const phoneRegex = /^[+0-9\s()-]{5,20}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Designation/role is required';
    }

    // Dynamic field validation
    if (formData.salaryType === 'Fixed Salary' || formData.salaryType === 'Fixed Salary + Project Payment') {
      if (!formData.amount.trim() || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
        newErrors.amount = 'Valid fixed salary amount is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchEmployees = async () => {
    try {
      const [empRes, prjRes, salRes] = await Promise.all([
        callGasApi('getEmployees').catch(() => null),
        callGasApi('getProjects').catch(() => null),
        callGasApi('getSalary').catch(() => null)
      ]);

      if (empRes && empRes.success && Array.isArray(empRes.data)) {
        setEmployees(empRes.data.map((e: any, index: number) => {
          const rawType = (
            e.salaryType ??
            e['Salary Type'] ??
            e['salary_type'] ??
            e.salary_type ??
            e.SalaryType ??
            e.Salary_Type ??
            e.type ??
            e.paymentType ??
            ''
          ).toString().trim();

          const salType = parseSalaryType(rawType);

          const hasFixedSalary = salType === 'Fixed Salary' || salType === 'Fixed Salary + Project Payment';
          const fixedValue = hasFixedSalary ? Number(e.fixedSalary ?? e.fixedSalaryBdt ?? e.salary ?? e.amount ?? 0) : 0;

          let cleanJoinDate = (e.joiningDate || e.joinDate || '').toString().trim();
          if (cleanJoinDate) {
            const dateMatch = cleanJoinDate.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              cleanJoinDate = dateMatch[1];
            }
          }

          return {
            id: e.id || e.employeeId || `E00${index + 1}`,
            employeeId: e.id || e.employeeId || `E00${index + 1}`,
            name: e.employeeName || e.name || '',
            employeeName: e.employeeName || e.name || '',
            role: e.role || e.designation || 'Staff',
            designation: e.role || e.designation || 'Staff',
            department: e.department || 'Engineering',
            email: e.email || '',
            fixedSalary: fixedValue,
            salary: fixedValue,
            currency: (e.currency === 'USD' || e.fixedSalaryUsd > 0 ? 'USD' : 'BDT'),
            status: (e.status || 'active').toString().toLowerCase() === 'inactive' ? 'inactive' : 'active',
            phone: e.phone || '',
            joiningDate: cleanJoinDate,
            notes: e.notes || '',
            salaryType: salType
          };
        }));
      } else {
        setEmployees([]);
      }

      if (prjRes && prjRes.success && Array.isArray(prjRes.data)) {
        setProjectsList(prjRes.data.map((p: any, i: number) => ({
          id: p.id || p.projectId || `P00${i + 1}`,
          name: p.projectName || p.name || 'Unnamed Project',
          clientName: p.clientName || p.client || 'N/A',
          budget: Number(p.budget || p.amount || p.priceBDT || p.priceUSD || 0),
          currency: (p.currency === 'USD' ? 'USD' : 'BDT'),
          status: (p.status || 'pending').toString().toLowerCase(),
          startDate: p.startDate || '',
          endDate: p.endDate || '',
          assignedEmployees: Array.isArray(p.assignedEmployees) ? p.assignedEmployees : (typeof p.assignedEmployees === 'string' ? p.assignedEmployees.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
        })));
      } else {
        setProjectsList([]);
      }

      if (salRes && salRes.success && Array.isArray(salRes.data)) {
        setSalariesList(salRes.data);
      } else {
        setSalariesList([]);
      }
    } catch (err) {
      console.error('Failed to load employees from backend:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setToastType('error');
      setToastMsg('Please resolve validation errors before saving.');
      return;
    }

    const hasFixedSalary = formData.salaryType === 'Fixed Salary' || formData.salaryType === 'Fixed Salary + Project Payment';
    const fixedSalValue = hasFixedSalary ? (Number(formData.amount) || 0) : 0;

    const payload = {
      name: formData.name,
      employeeName: formData.name,
      role: formData.role,
      designation: formData.role,
      department: 'Engineering',
      email: formData.email || '',
      fixedSalary: fixedSalValue,
      salary: fixedSalValue,
      fixedSalaryBdt: fixedSalValue,
      fixedSalaryUsd: formData.currency === 'USD' ? fixedSalValue : 0,
      currency: formData.currency,
      status: formData.status === 'active' ? 'Active' : 'Inactive',
      phone: formData.phone,
      joiningDate: formData.joiningDate,
      notes: formData.notes,
      salaryType: formData.salaryType,
      salary_type: formData.salaryType,
      type: formData.salaryType,
      paymentType: formData.salaryType,
      'Salary Type': formData.salaryType,
      SalaryType: formData.salaryType,
      Salary_Type: formData.salaryType
    };

    try {
      const res = await callGasApi('addEmployee', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Employee profile registered for "${formData.name}".`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Registered employee "${formData.name}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to communicate with Google Sheets backend.');
    }

    setIsAddOpen(false);
    resetForm();
    await fetchEmployees();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!validateForm()) {
      setToastType('error');
      setToastMsg('Please resolve validation errors before saving.');
      return;
    }

    const hasFixedSalary = formData.salaryType === 'Fixed Salary' || formData.salaryType === 'Fixed Salary + Project Payment';
    const fixedSalValue = hasFixedSalary ? (Number(formData.amount) || 0) : 0;

    const payload = {
      id: selectedEmployee.id,
      employeeId: selectedEmployee.id,
      name: formData.name,
      employeeName: formData.name,
      role: formData.role,
      designation: formData.role,
      email: formData.email,
      status: formData.status === 'active' ? 'Active' : 'Inactive',
      phone: formData.phone,
      joiningDate: formData.joiningDate,
      notes: formData.notes,
      salaryType: formData.salaryType,
      salary_type: formData.salaryType,
      type: formData.salaryType,
      paymentType: formData.salaryType,
      'Salary Type': formData.salaryType,
      SalaryType: formData.salaryType,
      Salary_Type: formData.salaryType,
      fixedSalary: fixedSalValue,
      salary: fixedSalValue,
      fixedSalaryBdt: fixedSalValue,
      fixedSalaryUsd: formData.currency === 'USD' ? fixedSalValue : 0,
      currency: formData.currency
    };

    try {
      const res = await callGasApi('updateEmployee', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Saved modifications for "${formData.name}".`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Updated "${formData.name}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to update employee on backend.');
    }

    setIsEditOpen(false);
    resetForm();
    await fetchEmployees();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee) return;
    const empToDelete = selectedEmployee;
    setIsDeleteOpen(false);

    try {
      const res = await callGasApi('deleteEmployee', { id: empToDelete.id });
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Employee "${empToDelete.name}" deleted successfully.`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Deleted "${empToDelete.name}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to delete employee on backend.');
    }

    setSelectedEmployee(null);
    await fetchEmployees();
  };

  const formatSalaryTypeLabel = (type?: string) => {
    return parseSalaryType(type);
  };

  // Filter List
  const query = search || globalSearch;
  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(query.toLowerCase()) || 
                          e.role.toLowerCase().includes(query.toLowerCase()) ||
                          e.email.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesDept = deptFilter === 'all' || e.department === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  // Pagination Calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, deptFilter, globalSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Staff & Headcount Directory</h2>
          <p className="text-xs text-slate-500 mt-1">Manage corporate personnel, dynamic compensation structures, and active statuses.</p>
        </div>
        <PrimaryButton 
          icon={<Plus className="h-4 w-4" />} 
          onClick={handleOpenAdd}
        >
          Add Employee
        </PrimaryButton>
      </div>

      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="flex-1 max-w-md">
          <SearchBox 
            value={search} 
            onSearchChange={setSearch} 
            placeholder="Search employee by name, designation, or email..." 
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <FilterDropdown 
            label="Department" 
            selected={deptFilter} 
            onChange={setDeptFilter} 
            options={[
              { value: 'all', label: 'All Departments' },
              { value: 'Engineering', label: 'Engineering' },
              { value: 'Design', label: 'Design' },
              { value: 'Marketing', label: 'Marketing' },
              { value: 'Operations', label: 'Operations' }
            ]} 
          />
          <FilterDropdown 
            label="Status" 
            selected={statusFilter} 
            onChange={setStatusFilter} 
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Personnel' },
              { value: 'inactive', label: 'On Leave / Archived' }
            ]} 
          />
        </div>
      </div>

      {/* List Table */}
      {paginatedEmployees.length > 0 ? (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-sm text-slate-600 relative">
              <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-700 tracking-wider uppercase border-b border-slate-200 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Employee Name</th>
                  <th className="px-6 py-4 font-semibold">Designation</th>
                  <th className="px-6 py-4 font-semibold">Salary Type</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                          <User className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="font-medium text-slate-800">{emp.role}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">{emp.department}</div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${
                        formatSalaryTypeLabel(emp.salaryType) === 'Fixed Salary' 
                          ? 'bg-slate-50 text-slate-700 border border-slate-200' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {formatSalaryTypeLabel(emp.salaryType)}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        emp.status === 'active' 
                          ? 'bg-emerald-50 text-[#22C55E]' 
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${emp.status === 'active' ? 'bg-[#22C55E]' : 'bg-slate-400'}`} />
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenView(emp)}
                          title="View Employee Profile"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-150"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(emp)}
                          title="Edit Profile"
                          className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all duration-150"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenDelete(emp)}
                          title="Delete Employee"
                          className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-150"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, filteredEmployees.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{filteredEmployees.length}</span> staff members
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all duration-150 shadow-xs ${
                    currentPage === pageNum
                      ? 'bg-[#2563EB] text-white font-bold'
                      : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState 
          title="No employees found" 
          description="Try adjusting your filter settings or create a new employee profile." 
          actionLabel="Add New Employee"
          onAction={handleOpenAdd}
          icon={<Contact className="h-12 w-12 text-slate-300" />}
        />
      )}

      {/* Add Employee Modal */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        title="Register New Employee"
        footerActions={
          <>
            <SecondaryButton onClick={resetForm} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsAddOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveAdd}>Register Employee</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveAdd} className="space-y-5">
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basic Information</h4>
            <FormInput 
              id="add-emp-name"
              label="Employee Name *" 
              placeholder="e.g. Tahsin Ahmed" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput 
                id="add-emp-email"
                label="Work Email" 
                type="text"
                placeholder="e.g. tahsin@agencyerp.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
              />
              <FormInput 
                id="add-emp-phone"
                label="Contact Phone" 
                placeholder="e.g. +880 1712-112233" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={errors.phone}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput 
                id="add-emp-role"
                label="Designation / Role *" 
                placeholder="e.g. Lead Software Architect" 
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                error={errors.role}
                required 
              />
              <FormInput 
                id="add-emp-joining"
                label="Joining Date" 
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              />
            </div>
            <SelectInput 
              id="add-emp-status"
              label="Status *" 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              options={[
                { value: 'active', label: 'Active Personnel' },
                { value: 'inactive', label: 'On Leave / Archived' }
              ]}
            />
            <Textarea 
              id="add-emp-notes"
              label="Admin Notes"
              placeholder="Log skills, performance evaluations, or team assignments..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="bg-blue-50/20 p-4 border border-blue-50/50 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Salary & Compensation Information</h4>
            <SelectInput 
              id="add-emp-salary-type"
              label="Salary Type *" 
              value={formData.salaryType}
              onChange={(e) => setFormData({ ...formData, salaryType: e.target.value as 'Fixed Salary' | 'Project Payment' | 'Fixed Salary + Project Payment' })}
              options={[
                { value: 'Fixed Salary', label: 'Fixed Salary' },
                { value: 'Project Payment', label: 'Project Payment' },
                { value: 'Fixed Salary + Project Payment', label: 'Fixed Salary + Project Payment' }
              ]}
            />

            {/* Dynamic Rendering of fixed salary details */}
            {(formData.salaryType === 'Fixed Salary' || formData.salaryType === 'Fixed Salary + Project Payment') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                <SelectInput 
                  id="add-emp-currency"
                  label="Currency *" 
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'BDT' | 'USD' })}
                  options={[
                    { value: 'BDT', label: 'BDT (৳)' },
                    { value: 'USD', label: 'USD ($)' }
                  ]}
                />
                <FormInput 
                  id="add-emp-salary"
                  label="Fixed Salary *" 
                  type="text"
                  placeholder={formData.currency === 'BDT' ? "e.g. 150000" : "e.g. 1300"} 
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  error={errors.amount}
                />
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        title="Modify Employee Profile"
        footerActions={
          <>
            <SecondaryButton onClick={handleResetEdit} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsEditOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveEdit}>Save Changes</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-5">
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basic Information</h4>
            <FormInput 
              id="edit-emp-name"
              label="Employee Name *" 
              placeholder="e.g. Tahsin Ahmed" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput 
                id="edit-emp-email"
                label="Work Email" 
                type="text"
                placeholder="e.g. tahsin@agencyerp.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
              />
              <FormInput 
                id="edit-emp-phone"
                label="Contact Phone" 
                placeholder="e.g. +880 1712-112233" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={errors.phone}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput 
                id="edit-emp-role"
                label="Designation / Role *" 
                placeholder="e.g. Lead Software Architect" 
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                error={errors.role}
                required 
              />
              <FormInput 
                id="edit-emp-joining"
                label="Joining Date" 
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              />
            </div>
            <SelectInput 
              id="edit-emp-status"
              label="Status *" 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              options={[
                { value: 'active', label: 'Active Personnel' },
                { value: 'inactive', label: 'On Leave / Archived' }
              ]}
            />
            <Textarea 
              id="edit-emp-notes"
              label="Admin Notes"
              placeholder="Log skills, performance evaluations, or team assignments..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="bg-blue-50/20 p-4 border border-blue-50/50 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Salary & Compensation Information</h4>
            <SelectInput 
              id="edit-emp-salary-type"
              label="Salary Type *" 
              value={formData.salaryType}
              onChange={(e) => setFormData({ ...formData, salaryType: e.target.value as 'Fixed Salary' | 'Project Payment' | 'Fixed Salary + Project Payment' })}
              options={[
                { value: 'Fixed Salary', label: 'Fixed Salary' },
                { value: 'Project Payment', label: 'Project Payment' },
                { value: 'Fixed Salary + Project Payment', label: 'Fixed Salary + Project Payment' }
              ]}
            />

            {/* Dynamic Rendering of fixed salary details */}
            {(formData.salaryType === 'Fixed Salary' || formData.salaryType === 'Fixed Salary + Project Payment') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                <SelectInput 
                  id="edit-emp-currency"
                  label="Currency *" 
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'BDT' | 'USD' })}
                  options={[
                    { value: 'BDT', label: 'BDT (৳)' },
                    { value: 'USD', label: 'USD ($)' }
                  ]}
                />
                <FormInput 
                  id="edit-emp-salary"
                  label="Fixed Salary *" 
                  type="text"
                  placeholder={formData.currency === 'BDT' ? "e.g. 150000" : "e.g. 1300"} 
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  error={errors.amount}
                />
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* View Employee Dashboard Modal */}
      <Modal 
        isOpen={isViewOpen} 
        onClose={() => setIsViewOpen(false)} 
        title="Employee Directory Profile Details"
        footerActions={
          <SecondaryButton onClick={() => setIsViewOpen(false)}>Close Profile Details</SecondaryButton>
        }
      >
        {selectedEmployee && (
          <div className="space-y-6">
            
            {/* Header profile block */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4.5 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="h-16 w-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl font-extrabold text-slate-700 shadow-xs shrink-0 select-none">
                <User className="h-8 w-8 text-slate-500" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{selectedEmployee.name}</h4>
                  <span className={`inline-flex self-center sm:self-auto items-center gap-1.5 text-[9px] font-bold uppercase px-2.5 py-0.5 border rounded-full ${
                    selectedEmployee.status === 'active' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <span className={`h-1 w-1 rounded-full ${selectedEmployee.status === 'active' ? 'bg-[#22C55E]' : 'bg-slate-400'}`} />
                    {selectedEmployee.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">{selectedEmployee.role} &bull; {selectedEmployee.department}</p>
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-3">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold bg-white px-2 py-1 rounded-md border border-slate-100 shadow-3xs">ID: {selectedEmployee.id}</span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-3xs flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" /> Joined {selectedEmployee.joiningDate || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Layout tabs sections */}
            <div className="space-y-6">
              
              {/* SECTION 1: Basic & Admin Information */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Basic Contact & Admin Details</span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Email Address</span>
                    <span className="text-xs font-semibold text-slate-800 select-all">{selectedEmployee.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Contact Number</span>
                    <span className="text-xs font-semibold text-slate-800 select-all">{selectedEmployee.phone || 'N/A'}</span>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Administrative Notes</span>
                    <p className="text-xs text-slate-600 italic leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/50">
                      "{selectedEmployee.notes || 'No performance review log or administrative notations recorded.'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Salary Structure Details */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. Salary Structure Overview</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="text-xs text-slate-500 font-medium">Compensation Scheme</span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{formatSalaryTypeLabel(selectedEmployee.salaryType)}</span>
                  </div>
                  {(formatSalaryTypeLabel(selectedEmployee.salaryType) === 'Fixed Salary' || formatSalaryTypeLabel(selectedEmployee.salaryType) === 'Fixed Salary + Project Payment') && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-medium font-mono">Monthly Base Salary</span>
                      <span className="text-xs font-bold text-slate-800">
                        {selectedEmployee.currency === 'USD' ? '$' : '৳'} {((selectedEmployee.fixedSalary || selectedEmployee.salary) || 0).toLocaleString()} {selectedEmployee.currency || 'BDT'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: Assigned Projects */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">3. Assigned Active Engagements</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(() => {
                    const empProjects = projectsList.filter(p => {
                      const empNameLower = (selectedEmployee.name || '').toLowerCase();
                      const empIdLower = (selectedEmployee.id || '').toLowerCase();
                      return (p.assignedEmployees || []).some((ae: string) => 
                        ae.toLowerCase().includes(empNameLower) || ae.toLowerCase().includes(empIdLower)
                      );
                    });

                    if (empProjects.length === 0) {
                      return <div className="p-4 text-center text-xs text-slate-400">No active assigned projects found.</div>;
                    }

                    return empProjects.map((p) => (
                      <div key={p.id} className="p-3.5 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-bold text-slate-800">{p.name}</h5>
                          <p className="text-[10px] text-slate-400 mt-0.5">Client: {p.clientName} &bull; Budget: {p.currency === 'USD' ? '$' : '৳'}{p.budget.toLocaleString()}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          p.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          p.status === 'running' || p.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>{p.status}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* SECTION 4: Commission Summary */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">4. Commission & Performance Summary</span>
                </div>
                {(() => {
                  const empProjects = projectsList.filter(p => {
                    const empNameLower = (selectedEmployee.name || '').toLowerCase();
                    const empIdLower = (selectedEmployee.id || '').toLowerCase();
                    return (p.assignedEmployees || []).some((ae: string) => 
                      ae.toLowerCase().includes(empNameLower) || ae.toLowerCase().includes(empIdLower)
                    );
                  });
                  const completedEmpProjects = empProjects.filter(p => (p.status || '').toLowerCase() === 'completed');
                  const totalVolume = completedEmpProjects.reduce((sum, p) => sum + p.budget, 0);

                  const totalEarnedComm = completedEmpProjects.reduce((sum, p) => {
                    const parsedMap = parseEmployeePaymentDetails(p.employeePaymentDetails);
                    return sum + (parsedMap[selectedEmployee.id] || 0);
                  }, 0);

                  const empSalaries = salariesList.filter(s => {
                    const eId = (s.employeeId || s['Employee ID'] || '').toLowerCase();
                    const eName = (s.employeeName || s.name || '').toLowerCase();
                    return eId === selectedEmployee.id.toLowerCase() || eName === selectedEmployee.name.toLowerCase();
                  });

                  const paidComm = empSalaries.reduce((sum, s) => sum + Number(s.commissionPaidBDT ?? s['Commission Paid (BDT)'] ?? s.commissionPaidUSD ?? s['Commission Paid (USD)'] ?? 0), 0);
                  const accruingComm = Math.max(0, totalEarnedComm - paidComm);

                  return (
                    <div className="p-4 grid grid-cols-3 gap-3 text-center">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Project Volume</span>
                        <span className="text-xs font-extrabold text-slate-800">৳ {totalVolume.toLocaleString()}</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/30 rounded-lg border border-emerald-100/50">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Paid Commission</span>
                        <span className="text-xs font-extrabold text-emerald-700">৳ {paidComm.toLocaleString()}</span>
                      </div>
                      <div className="p-2.5 bg-amber-50/30 rounded-lg border border-amber-100/50">
                        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Accruing</span>
                        <span className="text-xs font-extrabold text-amber-700">৳ {accruingComm.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 5: Salary Payment History */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">5. Historic Base Salary Disbursements</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(() => {
                    const empSalaries = salariesList.filter(s => {
                      const eId = (s.employeeId || s['Employee ID'] || '').toLowerCase();
                      const eName = (s.employeeName || s.name || '').toLowerCase();
                      return eId === selectedEmployee.id.toLowerCase() || eName === selectedEmployee.name.toLowerCase();
                    });

                    if (empSalaries.length === 0) {
                      return <div className="p-4 text-center text-xs text-slate-400">No salary payment records found.</div>;
                    }

                    return empSalaries.map((s, idx) => {
                      const rawMonth = s.salaryMonth || s['Salary Month'] || s.month || 'N/A';
                      const rawDate = s.paymentDate || s['Payment Date'] || s.date || '';
                      const month = formatDisplaySalaryMonth(rawMonth);
                      const dateStr = formatDisplayPaymentDate(rawDate).fullStr;
                      const method = s.paymentMethod || s['Payment Method'] || 'Bank';
                      const totBDT = Number(s.totalPaidBDT ?? s['Total Paid (BDT)'] ?? s.fixedPaidBDT ?? s['Fixed Paid (BDT)'] ?? 0);

                      return (
                        <div key={s.id || s.paymentId || idx} className="p-3.5 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800">{month} Salary Pay</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">Disbursed on {dateStr} via {method}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-800 block">৳ {totBDT.toLocaleString()}</span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase text-emerald-600 mt-1">
                              <CheckCircle2 className="h-2.5 w-2.5" /> {s.status || 'PAID'}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal (CONFIRMATION ONLY, NO STATE REMOVAL AS SPECIFIED) */}
      <ConfirmationDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Employee Headcount Archival"
        message={selectedEmployee ? `Are you sure you want to deactivate and archive the staff profile for "${selectedEmployee.name}" (${selectedEmployee.role})? Standard historical logs will be preserved.` : ''}
        confirmLabel="Deactivate & Archive"
        cancelLabel="Maintain Headcount"
        type="danger"
      />

      {/* Success/Error Notifications */}
      {toastMsg && (
        <SuccessToast message={toastMsg} onClose={() => setToastMsg(null)} type={toastType} />
      )}

    </div>
  );
};


// ==========================================
// 4. PROJECTS PAGE
// ==========================================

export const ProjectsPage: React.FC<{ globalSearch: string }> = ({ globalSearch }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Dynamic VAT percentage state synced with Settings
  const [currentVatRate, setCurrentVatRate] = useState<number>(() => {
    const stored = localStorage.getItem('cfg_vat_percentage');
    if (stored !== null && stored !== undefined && stored.trim() !== '') {
      const val = parseFloat(stored);
      return isNaN(val) ? 0 : val;
    }
    return 0;
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals Visibility
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Selected Project
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Toast Notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    clientName: '',
    currency: 'BDT' as 'BDT' | 'USD',
    amount: '',
    startDate: '',
    endDate: '',
    status: 'pending' as 'pending' | 'running' | 'completed' | 'cancelled',
    notes: '',
    assignedEmployees: [] as string[],
    employeePayments: {} as Record<string, number>
  });

  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    clientName?: string;
    amount?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const resetForm = () => {
    setFormData({
      name: '',
      clientId: '',
      clientName: '',
      currency: 'BDT',
      amount: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'pending',
      notes: '',
      assignedEmployees: [],
      employeePayments: {}
    });
    setErrors({});
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const toYYYYMMDD = (dateVal: any): string => {
    if (!dateVal) return '';
    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return '';
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(dateVal).trim();
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return str;
  };

  const getClientIdForProject = (proj: Project) => {
    if (proj.clientId) return proj.clientId;
    const match = clientsList.find(c => c.name === proj.clientName || c.company === proj.clientName);
    return match ? match.id : '';
  };

  const handleOpenEdit = (proj: Project) => {
    setSelectedProject(proj);
    const rawDetails = proj.employeePaymentDetails || '';
    const parsedPayments = parseEmployeePaymentDetails(rawDetails);

    const enrichedPayments: Record<string, number> = { ...parsedPayments };
    Object.entries(parsedPayments).forEach(([key, amt]) => {
      const found = employeesList.find(e => e.id === key || e.employeeId === key || e.name === key || e.employeeName === key);
      if (found) {
        if (found.id) enrichedPayments[found.id] = amt;
        if (found.employeeId) enrichedPayments[found.employeeId] = amt;
        if (found.name) enrichedPayments[found.name] = amt;
        if (found.employeeName) enrichedPayments[found.employeeName] = amt;
      }
    });

    setFormData({
      name: proj.name,
      clientId: getClientIdForProject(proj),
      clientName: proj.clientName,
      currency: proj.currency || 'BDT',
      amount: (proj.budget || proj.priceBDT || proj.priceUSD || 0).toString(),
      startDate: toYYYYMMDD(proj.startDate),
      endDate: toYYYYMMDD(proj.endDate),
      status: proj.status as 'pending' | 'running' | 'completed' | 'cancelled',
      notes: proj.notes || '',
      assignedEmployees: proj.assignedEmployees || [],
      employeePayments: enrichedPayments
    });
    setErrors({});
    setIsEditOpen(true);
  };

  const handleOpenView = (proj: Project) => {
    setSelectedProject(proj);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (proj: Project) => {
    setSelectedProject(proj);
    setIsDeleteOpen(true);
  };

  const handleResetEdit = () => {
    if (selectedProject) {
      const rawDetails = selectedProject.employeePaymentDetails || '';
      const parsedPayments = parseEmployeePaymentDetails(rawDetails);

      const enrichedPayments: Record<string, number> = { ...parsedPayments };
      Object.entries(parsedPayments).forEach(([key, amt]) => {
        const found = employeesList.find(e => e.id === key || e.employeeId === key || e.name === key || e.employeeName === key);
        if (found) {
          if (found.id) enrichedPayments[found.id] = amt;
          if (found.employeeId) enrichedPayments[found.employeeId] = amt;
          if (found.name) enrichedPayments[found.name] = amt;
          if (found.employeeName) enrichedPayments[found.employeeName] = amt;
        }
      });

      setFormData({
        name: selectedProject.name,
        clientId: getClientIdForProject(selectedProject),
        clientName: selectedProject.clientName,
        currency: selectedProject.currency || 'BDT',
        amount: (selectedProject.budget || selectedProject.priceBDT || selectedProject.priceUSD || 0).toString(),
        startDate: toYYYYMMDD(selectedProject.startDate),
        endDate: toYYYYMMDD(selectedProject.endDate),
        status: selectedProject.status as 'pending' | 'running' | 'completed' | 'cancelled',
        notes: selectedProject.notes || '',
        assignedEmployees: selectedProject.assignedEmployees || [],
        employeePayments: enrichedPayments
      });
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Project Name is required';
    }
    if (!formData.clientId && !formData.clientName.trim()) {
      newErrors.clientName = 'Client selection is required';
    }
    if (!formData.amount.trim() || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Valid positive budget/price amount is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date cannot be earlier than start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchProjects = async () => {
    try {
      const res = await callGasApi('getProjects');
      if (res && res.success && Array.isArray(res.data)) {
        setProjects(res.data.map((p: any, index: number) => {
          let assignedNames: string[] = [];
          if (Array.isArray(p.assignedEmployeeNames)) {
            assignedNames = p.assignedEmployeeNames;
          } else if (Array.isArray(p.assignedEmployees)) {
            assignedNames = p.assignedEmployees;
          } else if (typeof p.assignedEmployeeNames === 'string' && p.assignedEmployeeNames) {
            assignedNames = p.assignedEmployeeNames.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else if (typeof p.assignedEmployees === 'string' && p.assignedEmployees) {
            assignedNames = p.assignedEmployees.split(',').map((s: string) => s.trim()).filter(Boolean);
          }

          let assignedIds: string[] = [];
          if (Array.isArray(p.assignedEmployeeIds)) {
            assignedIds = p.assignedEmployeeIds;
          } else if (typeof p.assignedEmployeeIds === 'string' && p.assignedEmployeeIds) {
            assignedIds = p.assignedEmployeeIds.split(',').map((s: string) => s.trim()).filter(Boolean);
          }

          const priceBdt = Number(p.priceBdt !== undefined ? p.priceBdt : (p.priceBDT || 0));
          const priceUsd = Number(p.priceUsd !== undefined ? p.priceUsd : (p.priceUSD || 0));
          const currency = p.currency || (priceUsd > 0 && priceBdt === 0 ? 'USD' : 'BDT');
          const budget = currency === 'USD' ? (priceUsd || Number(p.budget || p.amount || 0)) : (priceBdt || Number(p.budget || p.amount || 0));
          return {
            id: p.id || p.projectId || `P00${index + 1}`,
            name: p.projectName || p.name || '',
            clientId: p.clientId || '',
            clientName: p.clientName || p.client || 'N/A',
            budget: budget,
            priceBDT: priceBdt,
            priceUSD: priceUsd,
            currency: currency,
            status: (p.status || 'pending').toString().toLowerCase() as any,
            startDate: toYYYYMMDD(p.startDate),
            endDate: toYYYYMMDD(p.endDate),
            assignedEmployees: assignedNames,
            assignedEmployeeIds: assignedIds,
            assignedEmployeeNames: assignedNames,
            employeePaymentDetails: p.employeePaymentDetails || p.employeePaymentsDetails || p.employeePayments || '',
            totalEmployeePayment: Number(p.totalEmployeePayment || Object.values(parseEmployeePaymentDetails(p.employeePaymentDetails || p.employeePaymentsDetails || p.employeePayments || '')).reduce((a, b) => a + Number(b || 0), 0)),
            notes: p.notes || '',
            vatAmount: Number(p.vatAmount !== undefined && p.vatAmount !== null && !isNaN(Number(p.vatAmount)) ? p.vatAmount : +((budget * (currentVatRate / 100))).toFixed(2))
          };
        }));
      }
    } catch (err) {
      console.error('Failed to load projects from backend:', err);
    }
  };

  useEffect(() => {
    fetchProjects();

    const updateVatFromSettings = () => {
      const stored = localStorage.getItem('cfg_vat_percentage');
      if (stored !== null && stored !== undefined && stored.trim() !== '') {
        const val = parseFloat(stored);
        setCurrentVatRate(isNaN(val) ? 0 : val);
      } else {
        setCurrentVatRate(0);
      }
    };

    updateVatFromSettings();

    window.addEventListener('vatRateUpdate', updateVatFromSettings);
    window.addEventListener('storage', updateVatFromSettings);
    window.addEventListener('focus', updateVatFromSettings);

    callGasApi('getClients').then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        setClientsList(res.data.map((c: any) => ({
          id: c.id || c.clientId,
          name: c.clientName || c.name || '',
          company: c.company || c.companyName || '',
          email: c.email || '',
          status: c.status || 'active',
          projectsCount: 0
        })));
      }
    }).catch(() => {});

    callGasApi('getEmployees').then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        setEmployeesList(res.data.map((e: any) => ({
          id: e.id || e.employeeId,
          name: e.employeeName || e.name || '',
          role: e.role || '',
          department: e.department || '',
          email: e.email || '',
          salary: Number(e.salary || 0),
          currency: e.currency || 'BDT',
          status: e.status || 'active'
        })));
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('vatRateUpdate', updateVatFromSettings);
      window.removeEventListener('storage', updateVatFromSettings);
      window.removeEventListener('focus', updateVatFromSettings);
    };
  }, []);

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setToastType('error');
      setToastMsg('Please resolve validation errors before saving.');
      return;
    }

    const amountVal = Number(formData.amount);
    const isUsd = formData.currency === 'USD';

    // 1. Resolve Client ID and Client Name
    let resolvedClientId = formData.clientId;
    let resolvedClientName = formData.clientName;
    const foundClient = clientsList.find(c => c.id === formData.clientId || c.name === formData.clientName || c.company === formData.clientName);
    if (foundClient) {
      resolvedClientId = foundClient.id;
      resolvedClientName = foundClient.name;
    }

    // 2. Resolve Assigned Employee IDs and Names
    const assignedEmpNames = formData.assignedEmployees;
    const assignedEmpIds = formData.assignedEmployees.map(empName => {
      const foundEmp = employeesList.find(e => e.name === empName || e.id === empName);
      return foundEmp ? foundEmp.id : empName;
    }).filter(Boolean);

    // Build Payment Details Map
    const paymentMap: Record<string, number> = {};
    formData.assignedEmployees.forEach(empName => {
      const foundEmp = employeesList.find(e => e.name === empName || e.id === empName);
      const empId = foundEmp ? foundEmp.id : empName;
      paymentMap[empId] = Number(formData.employeePayments[empId] ?? formData.employeePayments[empName] ?? 0);
    });

    const empPaymentDetailsStr = formatEmployeePaymentDetails(paymentMap);
    const totalEmpPayment = Object.values(paymentMap).reduce((a, b) => a + Number(b || 0), 0);

    const vatRateSetting = parseFloat(localStorage.getItem('cfg_vat_percentage') || currentVatRate.toString());
    const vatPercent = isNaN(vatRateSetting) ? currentVatRate : vatRateSetting;

    const payload = {
      clientId: resolvedClientId,
      clientName: resolvedClientName,
      client: resolvedClientName,
      name: formData.name,
      projectName: formData.name,
      budget: amountVal,
      amount: amountVal,
      price: amountVal,
      currency: formData.currency,
      priceBdt: isUsd ? 0 : amountVal,
      priceBDT: isUsd ? 0 : amountVal,
      priceUsd: isUsd ? amountVal : 0,
      priceUSD: isUsd ? amountVal : 0,
      status: formData.status,
      startDate: toYYYYMMDD(formData.startDate),
      endDate: toYYYYMMDD(formData.endDate),
      assignedEmployees: assignedEmpNames.join(', '),
      assignedEmployeeNames: assignedEmpNames.join(', '),
      assignedEmployeeIds: assignedEmpIds.join(', '),
      employeePaymentDetails: empPaymentDetailsStr,
      totalEmployeePayment: totalEmpPayment,
      notes: formData.notes,
      vatAmount: +((amountVal * (vatPercent / 100))).toFixed(2)
    };

    try {
      const res = await callGasApi('addProject', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Project "${formData.name}" successfully registered!`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Registered project "${formData.name}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to communicate with Google Sheets backend.');
    }

    setIsAddOpen(false);
    resetForm();
    await fetchProjects();
    window.dispatchEvent(new Event('dashboardRefresh'));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    if (!validateForm()) {
      setToastType('error');
      setToastMsg('Please resolve validation errors before saving.');
      return;
    }

    const amountVal = Number(formData.amount);
    const isUsd = formData.currency === 'USD';

    // 1. Resolve Client ID and Client Name
    let resolvedClientId = formData.clientId;
    let resolvedClientName = formData.clientName;
    const foundClient = clientsList.find(c => c.id === formData.clientId || c.name === formData.clientName || c.company === formData.clientName);
    if (foundClient) {
      resolvedClientId = foundClient.id;
      resolvedClientName = foundClient.name;
    }

    // 2. Resolve Assigned Employee IDs and Names
    const assignedEmpNames = formData.assignedEmployees;
    const assignedEmpIds = formData.assignedEmployees.map(empName => {
      const foundEmp = employeesList.find(e => e.name === empName || e.id === empName);
      return foundEmp ? foundEmp.id : empName;
    }).filter(Boolean);

    // Build Payment Details Map
    const paymentMap: Record<string, number> = {};
    formData.assignedEmployees.forEach(empName => {
      const foundEmp = employeesList.find(e => e.name === empName || e.id === empName);
      const empId = foundEmp ? foundEmp.id : empName;
      paymentMap[empId] = Number(formData.employeePayments[empId] ?? formData.employeePayments[empName] ?? 0);
    });

    const empPaymentDetailsStr = formatEmployeePaymentDetails(paymentMap);
    const totalEmpPayment = Object.values(paymentMap).reduce((a, b) => a + Number(b || 0), 0);

    const editVatSetting = parseFloat(localStorage.getItem('cfg_vat_percentage') || currentVatRate.toString());
    const editVatPercent = isNaN(editVatSetting) ? currentVatRate : editVatSetting;
    let editVatVal = +((amountVal * (editVatPercent / 100))).toFixed(2);

    const payload = {
      id: selectedProject.id,
      projectId: selectedProject.id,
      clientId: resolvedClientId,
      clientName: resolvedClientName,
      client: resolvedClientName,
      name: formData.name,
      projectName: formData.name,
      budget: amountVal,
      amount: amountVal,
      price: amountVal,
      currency: formData.currency,
      priceBdt: isUsd ? 0 : amountVal,
      priceBDT: isUsd ? 0 : amountVal,
      priceUsd: isUsd ? amountVal : 0,
      priceUSD: isUsd ? amountVal : 0,
      status: formData.status,
      startDate: toYYYYMMDD(formData.startDate),
      endDate: toYYYYMMDD(formData.endDate),
      assignedEmployees: assignedEmpNames.join(', '),
      assignedEmployeeNames: assignedEmpNames.join(', '),
      assignedEmployeeIds: assignedEmpIds.join(', '),
      employeePaymentDetails: empPaymentDetailsStr,
      totalEmployeePayment: totalEmpPayment,
      notes: formData.notes,
      vatAmount: editVatVal
    };

    try {
      const res = await callGasApi('updateProject', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Saved modifications for project "${formData.name}"!`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Updated project "${formData.name}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to update project on backend.');
    }

    setIsEditOpen(false);
    resetForm();
    await fetchProjects();
    window.dispatchEvent(new Event('dashboardRefresh'));
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return;
    const projToDelete = selectedProject;
    setIsDeleteOpen(false);

    try {
      const res = await callGasApi('deleteProject', { id: projToDelete.id });
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Project "${projToDelete.name}" deleted successfully.`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Deleted project "${projToDelete.name}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to delete project on backend.');
    }

    setSelectedProject(null);
    await fetchProjects();
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'running': return 'Running';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Filter List
  const query = search || globalSearch;
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(query.toLowerCase()) || 
                          p.clientName.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination Calculations
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, globalSearch]);

  // Read-only dynamic VAT values for form UI
  const formVatAmount = formData.amount ? +((Number(formData.amount) * (currentVatRate / 100))).toFixed(2) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Project Pipelines</h2>
          <p className="text-xs text-slate-500 mt-1">Audit active client digital initiatives, revenue models, and developer allocations.</p>
        </div>
        <PrimaryButton 
          icon={<Plus className="h-4 w-4" />} 
          onClick={handleOpenAdd}
        >
          Add Project
        </PrimaryButton>
      </div>

      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="flex-1 max-w-md">
          <SearchBox 
            value={search} 
            onSearchChange={setSearch} 
            placeholder="Search projects by name or client..." 
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <FilterDropdown 
            label="Pipeline Phase" 
            selected={statusFilter} 
            onChange={setStatusFilter} 
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending / Backlog' },
              { value: 'running', label: 'Running / Active' },
              { value: 'completed', label: 'Completed Deliveries' },
              { value: 'cancelled', label: 'Cancelled Contracts' }
            ]} 
          />
        </div>
      </div>

      {/* Project Table */}
      {paginatedProjects.length > 0 ? (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-sm text-slate-600 relative">
              <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-700 tracking-wider uppercase border-b border-slate-200 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Project Name</th>
                  <th className="px-6 py-4 font-semibold">Client Name</th>
                  <th className="px-6 py-4 font-semibold">Currency</th>
                  <th className="px-6 py-4 font-semibold text-right">Price / Budget</th>
                  <th className="px-6 py-4 font-semibold">Start Date</th>
                  <th className="px-6 py-4 font-semibold">End Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-xs shrink-0 select-none">
                          {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 select-all">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="font-semibold text-slate-700">{p.clientName}</div>
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-slate-600">
                      {p.currency || 'BDT'}
                    </td>
                    <td className="px-6 py-4.5 text-right font-mono font-bold text-slate-800">
                      {p.currency === 'USD' ? '$' : '৳'}{(p.budget || p.priceBDT || p.priceUSD || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                      {p.startDate}
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                      {p.endDate}
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        p.status === 'running' || p.status === 'in-progress'
                          ? 'bg-blue-50 border border-blue-100 text-[#2563EB]'
                          : p.status === 'completed'
                            ? 'bg-emerald-50 border border-emerald-100 text-[#22C55E]'
                            : p.status === 'cancelled'
                              ? 'bg-rose-50 border border-rose-100 text-[#EF4444]'
                              : 'bg-slate-100 border border-slate-200 text-slate-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          p.status === 'running' || p.status === 'in-progress' ? 'bg-[#2563EB]' :
                          p.status === 'completed' ? 'bg-[#22C55E]' :
                          p.status === 'cancelled' ? 'bg-[#EF4444]' : 'bg-slate-400'
                        }`} />
                        {formatStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenView(p)}
                          title="View Project Details"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-150"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Project"
                          className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all duration-150"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenDelete(p)}
                          title="Delete Project"
                          className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-150"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, filteredProjects.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{filteredProjects.length}</span> pipelines
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all duration-150 shadow-xs ${
                    currentPage === pageNum
                      ? 'bg-[#2563EB] text-white font-bold'
                      : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-xs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState 
          title="No projects found" 
          description="Adjust your filters or record a new client digital service engagement." 
          actionLabel="Add New Project"
          onAction={handleOpenAdd}
          icon={<FolderKanban className="h-12 w-12 text-slate-300" />}
        />
      )}

      {/* Add Project Modal */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        title="Initiate New Client Engagement"
        footerActions={
          <>
            <SecondaryButton onClick={resetForm} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsAddOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveAdd}>Register Project</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveAdd} className="space-y-5">
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Information</h4>
            
            <SelectInput 
              id="add-proj-client"
              label="Client Selection *" 
              value={formData.clientId || (clientsList.find(c => c.name === formData.clientName || c.company === formData.clientName)?.id || '')}
              onChange={(e) => {
                const selectedId = e.target.value;
                const foundClient = clientsList.find(c => c.id === selectedId);
                setFormData({ 
                  ...formData, 
                  clientId: selectedId,
                  clientName: foundClient ? foundClient.name : ''
                });
              }}
              error={errors.clientName}
              options={[
                { value: '', label: '-- Select Associated Client --' },
                ...clientsList.map(c => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name }))
              ]}
            />

            <FormInput 
              id="add-proj-name"
              label="Project Title / Engagement Name *" 
              placeholder="e.g. E-Commerce Platform Redesign" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required 
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput 
                id="add-proj-start"
                label="Start Date *" 
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                error={errors.startDate}
              />
              <FormInput 
                id="add-proj-end"
                label="End Date *" 
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                error={errors.endDate}
              />
            </div>

            <SelectInput 
              id="add-proj-status"
              label="Project Status *" 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'pending', label: 'Pending / Backlog' },
                { value: 'running', label: 'Running / Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />

            <Textarea 
              id="add-proj-notes"
              label="Project Scope Brief & Notes"
              placeholder="Describe targets, deliverables, tech stacks, or administrative rules..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Assigned Employees */}
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Employees</h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono">
                {formData.assignedEmployees.length} Selected
              </span>
            </div>

            {/* Selected tags */}
            <div className="flex flex-wrap gap-2 p-2.5 border border-slate-200/60 bg-white rounded-xl min-h-[44px] items-center">
              {formData.assignedEmployees.length === 0 ? (
                <span className="text-xs text-slate-400 pl-1 italic">No staff assigned yet. Choose from dropdown.</span>
              ) : (
                formData.assignedEmployees.map(empName => (
                  <span key={empName} className="inline-flex items-center gap-1 text-xs font-bold bg-indigo-50 border border-indigo-100/70 text-[#2563EB] pl-2.5 pr-1.5 py-1 rounded-lg">
                    {empName}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        assignedEmployees: formData.assignedEmployees.filter(n => n !== empName)
                      })}
                      className="p-0.5 rounded hover:bg-indigo-100 text-indigo-500 transition-all duration-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <select
              className="w-full text-sm h-11 bg-white border border-slate-200 focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] rounded-xl px-4 text-[#111827] focus:outline-none transition-all duration-150"
              value=""
              onChange={(e) => {
                const selectedName = e.target.value;
                if (selectedName && !formData.assignedEmployees.includes(selectedName)) {
                  setFormData({
                    ...formData,
                    assignedEmployees: [...formData.assignedEmployees, selectedName]
                  });
                }
              }}
            >
              <option value="">-- Add staff member to pipeline --</option>
              {employeesList.filter(emp => !formData.assignedEmployees.includes(emp.name)).map(emp => (
                <option key={emp.id} value={emp.name}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>

            {/* Individual Employee Payment Amounts */}
            {formData.assignedEmployees.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <label className="text-xs font-bold text-slate-700 block">Employee Project Payment Amounts</label>
                <div className="space-y-2">
                  {formData.assignedEmployees.map(empName => {
                    const foundEmp = employeesList.find(e => e.name === empName || e.id === empName);
                    const empKey = foundEmp ? foundEmp.id : empName;
                    const amt = formData.employeePayments[empKey] ?? formData.employeePayments[empName] ?? 0;

                    return (
                      <div key={empName} className="flex items-center justify-between gap-3 p-2 bg-white border border-slate-200 rounded-lg">
                        <span className="text-xs font-bold text-slate-800">{empName}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Payment (BDT):</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={amt || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                employeePayments: {
                                  ...prev.employeePayments,
                                  [empKey]: val,
                                  [empName]: val
                                }
                              }));
                            }}
                            className="w-28 text-xs h-8 bg-slate-50 border border-slate-200 rounded px-2 text-right focus:outline-none focus:border-blue-500 font-mono font-bold"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-right text-xs font-bold text-slate-700 pt-1">
                  Total Employee Payment: <span className="font-mono text-blue-600">৳{(Object.values(formData.assignedEmployees.reduce((acc, name) => {
                    const found = employeesList.find(e => e.name === name || e.id === name);
                    const key = found ? found.id : name;
                    acc[key] = Number(formData.employeePayments[key] ?? formData.employeePayments[name] ?? 0);
                    return acc;
                  }, {} as Record<string, number>)) as number[]).reduce((a: number, b: number) => a + b, 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pricing and VAT */}
          <div className="bg-blue-50/20 p-4 border border-blue-50/50 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Financial & VAT Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectInput 
                id="add-proj-currency"
                label="Currency *" 
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'BDT' | 'USD' })}
                options={[
                  { value: 'BDT', label: 'BDT (৳)' },
                  { value: 'USD', label: 'USD ($)' }
                ]}
              />
              <FormInput 
                id="add-proj-amount"
                label="Approved Budget *" 
                placeholder={formData.currency === 'BDT' ? "e.g. 1200000" : "e.g. 10400"} 
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                error={errors.amount}
              />
            </div>

            {/* Read-only VAT amount display */}
            <div className="pt-2 border-t border-slate-200/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Read-Only Automated VAT Amount (Computed @ {currentVatRate}%)</span>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Computed VAT: <strong className="text-slate-800 font-mono">{formData.currency === 'USD' ? '$' : '৳'}{formVatAmount.toLocaleString()}</strong></span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 italic">Note: Real-time VAT settings are bound to system defaults and locked as read-only.</p>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        title="Modify Project Pipeline Details"
        footerActions={
          <>
            <SecondaryButton onClick={handleResetEdit} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsEditOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveEdit}>Save Modifications</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-5">
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Information</h4>
            
            <SelectInput 
              id="edit-proj-client"
              label="Client Selection *" 
              value={formData.clientId || (clientsList.find(c => c.name === formData.clientName || c.company === formData.clientName)?.id || '')}
              onChange={(e) => {
                const selectedId = e.target.value;
                const foundClient = clientsList.find(c => c.id === selectedId);
                setFormData({ 
                  ...formData, 
                  clientId: selectedId,
                  clientName: foundClient ? foundClient.name : ''
                });
              }}
              error={errors.clientName}
              options={[
                { value: '', label: '-- Select Associated Client --' },
                ...clientsList.map(c => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name }))
              ]}
            />

            <FormInput 
              id="edit-proj-name"
              label="Project Title / Engagement Name *" 
              placeholder="e.g. E-Commerce Platform Redesign" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required 
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput 
                id="edit-proj-start"
                label="Start Date *" 
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                error={errors.startDate}
              />
              <FormInput 
                id="edit-proj-end"
                label="End Date *" 
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                error={errors.endDate}
              />
            </div>

            <SelectInput 
              id="edit-proj-status"
              label="Project Status *" 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'pending', label: 'Pending / Backlog' },
                { value: 'running', label: 'Running / Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />

            <Textarea 
              id="edit-proj-notes"
              label="Project Scope Brief & Notes"
              placeholder="Describe targets, deliverables, tech stacks, or administrative rules..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Assigned Employees */}
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Employees</h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono">
                {formData.assignedEmployees.length} Selected
              </span>
            </div>

            {/* Selected tags */}
            <div className="flex flex-wrap gap-2 p-2.5 border border-slate-200/60 bg-white rounded-xl min-h-[44px] items-center">
              {formData.assignedEmployees.length === 0 ? (
                <span className="text-xs text-slate-400 pl-1 italic">No staff assigned yet. Choose from dropdown.</span>
              ) : (
                formData.assignedEmployees.map(empName => (
                  <span key={empName} className="inline-flex items-center gap-1 text-xs font-bold bg-indigo-50 border border-indigo-100/70 text-[#2563EB] pl-2.5 pr-1.5 py-1 rounded-lg">
                    {empName}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        assignedEmployees: formData.assignedEmployees.filter(n => n !== empName)
                      })}
                      className="p-0.5 rounded hover:bg-indigo-100 text-indigo-500 transition-all duration-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <select
              className="w-full text-sm h-11 bg-white border border-slate-200 focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB] rounded-xl px-4 text-[#111827] focus:outline-none transition-all duration-150"
              value=""
              onChange={(e) => {
                const selectedName = e.target.value;
                if (selectedName && !formData.assignedEmployees.includes(selectedName)) {
                  setFormData({
                    ...formData,
                    assignedEmployees: [...formData.assignedEmployees, selectedName]
                  });
                }
              }}
            >
              <option value="">-- Add staff member to pipeline --</option>
              {employeesList.filter(emp => !formData.assignedEmployees.includes(emp.name)).map(emp => (
                <option key={emp.id} value={emp.name}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>

            {/* Individual Employee Payment Amounts */}
            {formData.assignedEmployees.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <label className="text-xs font-bold text-slate-700 block">Employee Project Payment Amounts</label>
                <div className="space-y-2">
                  {formData.assignedEmployees.map(empName => {
                    const foundEmp = employeesList.find(e => e.name === empName || e.id === empName);
                    const empKey = foundEmp ? foundEmp.id : empName;
                    const amt = formData.employeePayments[empKey] ?? formData.employeePayments[empName] ?? 0;

                    return (
                      <div key={empName} className="flex items-center justify-between gap-3 p-2 bg-white border border-slate-200 rounded-lg">
                        <span className="text-xs font-bold text-slate-800">{empName}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Payment (BDT):</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={amt || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                employeePayments: {
                                  ...prev.employeePayments,
                                  [empKey]: val,
                                  [empName]: val
                                }
                              }));
                            }}
                            className="w-28 text-xs h-8 bg-slate-50 border border-slate-200 rounded px-2 text-right focus:outline-none focus:border-blue-500 font-mono font-bold"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-right text-xs font-bold text-slate-700 pt-1">
                  Total Employee Payment: <span className="font-mono text-blue-600">৳{(Object.values(formData.assignedEmployees.reduce((acc, name) => {
                    const found = employeesList.find(e => e.name === name || e.id === name);
                    const key = found ? found.id : name;
                    acc[key] = Number(formData.employeePayments[key] ?? formData.employeePayments[name] ?? 0);
                    return acc;
                  }, {} as Record<string, number>)) as number[]).reduce((a: number, b: number) => a + b, 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pricing and VAT */}
          <div className="bg-blue-50/20 p-4 border border-blue-50/50 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Financial & VAT Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectInput 
                id="edit-proj-currency"
                label="Currency *" 
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'BDT' | 'USD' })}
                options={[
                  { value: 'BDT', label: 'BDT (৳)' },
                  { value: 'USD', label: 'USD ($)' }
                ]}
              />
              <FormInput 
                id="edit-proj-amount"
                label="Approved Budget *" 
                placeholder={formData.currency === 'BDT' ? "e.g. 1200000" : "e.g. 10400"} 
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                error={errors.amount}
              />
            </div>

            {/* Read-only VAT amount display */}
            <div className="pt-2 border-t border-slate-200/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Read-Only Automated VAT Amount (Computed @ {currentVatRate}%)</span>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Computed VAT: <strong className="text-slate-800 font-mono">{formData.currency === 'USD' ? '$' : '৳'}{formVatAmount.toLocaleString()}</strong></span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 italic">Note: Real-time VAT settings are bound to system defaults and locked as read-only.</p>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Project Dashboard Details Modal */}
      <Modal 
        isOpen={isViewOpen} 
        onClose={() => setIsViewOpen(false)} 
        title="Project Engagement Dashboard"
        footerActions={
          <SecondaryButton onClick={() => setIsViewOpen(false)}>Close Details</SecondaryButton>
        }
      >
        {selectedProject && (
          <div className="space-y-6">
            
            {/* Header profile block */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4.5 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="h-16 w-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl font-extrabold text-slate-800 shadow-xs shrink-0 select-none">
                {selectedProject.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{selectedProject.name}</h4>
                  <span className={`inline-flex self-center sm:self-auto items-center gap-1.5 text-[9px] font-bold uppercase px-2.5 py-0.5 border rounded-full ${
                    selectedProject.status === 'running' || selectedProject.status === 'in-progress'
                      ? 'bg-blue-50 border-blue-100 text-[#2563EB]'
                      : selectedProject.status === 'completed'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : selectedProject.status === 'cancelled'
                          ? 'bg-rose-50 border-rose-100 text-[#EF4444]'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <span className={`h-1 w-1 rounded-full ${
                      selectedProject.status === 'running' || selectedProject.status === 'in-progress' ? 'bg-[#2563EB]' :
                      selectedProject.status === 'completed' ? 'bg-[#22C55E]' :
                      selectedProject.status === 'cancelled' ? 'bg-[#EF4444]' : 'bg-slate-400'
                    }`} />
                    {formatStatusLabel(selectedProject.status)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">Client Account: {selectedProject.clientName}</p>
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-3">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold bg-white px-2 py-1 rounded-md border border-slate-100 shadow-3xs">ID: {selectedProject.id}</span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-3xs flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" /> Start: {selectedProject.startDate} &bull; Due: {selectedProject.endDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Sections */}
            <div className="space-y-6">
              
              {/* SECTION: Project Timeline (Visual block) */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project Timeline Trace</span>
                </div>
                <div className="p-5">
                  <div className="relative flex items-center justify-between">
                    {/* Background line */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0" />
                    
                    {/* Active line tracking */}
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 transition-all duration-300 z-0`} style={{
                      width: selectedProject.status === 'pending' ? '0%' :
                             selectedProject.status === 'running' ? '50%' :
                             selectedProject.status === 'completed' ? '100%' : '50%'
                    }} />

                    {/* Nodes */}
                    <div className="flex flex-col items-center z-10">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs border ${
                        selectedProject.status === 'pending' || selectedProject.status === 'running' || selectedProject.status === 'completed'
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                        1
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 mt-1.5 bg-white px-1.5 py-0.5 rounded border border-slate-100">Start Date ({selectedProject.startDate})</span>
                    </div>

                    <div className="flex flex-col items-center z-10">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs border ${
                        selectedProject.status === 'running' || selectedProject.status === 'completed'
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                        2
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 mt-1.5 bg-white px-1.5 py-0.5 rounded border border-slate-100">Running State</span>
                    </div>

                    <div className="flex flex-col items-center z-10">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs border ${
                        selectedProject.status === 'completed'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                        3
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 mt-1.5 bg-white px-1.5 py-0.5 rounded border border-slate-100">Completed (Due: {selectedProject.endDate})</span>
                    </div>
                  </div>
                  {selectedProject.status === 'cancelled' && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-100 text-center animate-pulse">
                      * Status flagged as CANCELLED. Milestone progress interrupted.
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 1: Project Information & Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Project Information */}
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Project Information</span>
                  </div>
                  <div className="p-4 space-y-3.5">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Title Name</span>
                      <span className="text-xs font-bold text-slate-800 block">{selectedProject.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-50">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Start Date</span>
                        <span className="text-xs font-semibold text-slate-700 block">{selectedProject.startDate}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">End Date</span>
                        <span className="text-xs font-semibold text-slate-700 block">{selectedProject.endDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Client Information */}
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Client Information</span>
                  </div>
                  <div className="p-4 space-y-3.5">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Associated Account</span>
                      <span className="text-xs font-bold text-slate-800 block">{selectedProject.clientName}</span>
                    </div>
                    {/* Client account details */}
                    <div className="pt-2.5 border-t border-slate-50">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                      <span className="text-xs font-medium text-slate-600 italic">Connected external account in good standing.</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Grid 2: Pricing & VAT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 4. Price Information */}
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Price Information</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-medium">Currency</span>
                      <span className="text-xs font-semibold text-slate-700">{selectedProject.currency || 'BDT'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Price / Budget</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {selectedProject.currency === 'USD' ? '$' : '৳'}{(selectedProject.budget || selectedProject.priceBDT || selectedProject.priceUSD || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. VAT Information */}
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                    <Percent className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">VAT Information</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-medium">VAT Percentage</span>
                      <span className="text-xs font-bold text-slate-700">{currentVatRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">VAT Amount</span>
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50">
                        {selectedProject.currency === 'USD' ? '$' : '৳'}{(selectedProject.vatAmount !== undefined && selectedProject.vatAmount !== null ? selectedProject.vatAmount : +(((selectedProject.budget || selectedProject.priceBDT || selectedProject.priceUSD || 0) * (currentVatRate / 100))).toFixed(2)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. Assigned Employees Cards */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assigned Employees / Team</span>
                </div>
                <div className="p-4">
                  {selectedProject.assignedEmployees && selectedProject.assignedEmployees.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedProject.assignedEmployees.map((empName, i) => {
                        const match = employeesList.find(e => e.name === empName);
                        const role = match?.role || 'Technical Consultant';
                        const status = match?.status || 'active';
                        return (
                          <div key={i} className="p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center font-bold text-xs uppercase text-slate-700 select-none shrink-0">
                              {empName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-800 truncate">{empName}</h5>
                              <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{role}</p>
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase mt-1 px-2 py-0.5 rounded-full ${
                                status === 'active' ? 'bg-emerald-50 text-[#22C55E]' : 'bg-slate-100 text-slate-400'
                              }`}>
                                <span className={`h-1 w-1 rounded-full ${status === 'active' ? 'bg-[#22C55E]' : 'bg-slate-400'}`} />
                                {status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No team members assigned to this engagement yet.</span>
                  )}
                </div>
              </div>

              {/* 7. Notes */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Technical Brief & Scope Notes</span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    "{selectedProject.notes || 'No administrative annotations or technical briefs logged.'}"
                  </p>
                </div>
              </div>

              {/* BUSINESS RULE CARD DISPLAY */}
              <div className="p-4.5 bg-indigo-50/30 border border-indigo-100/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-800">
                  <Info className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Business Automation Rule Notice</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When a project status is changed to <strong className="text-indigo-900 font-extrabold uppercase">COMPLETED</strong>, the core ERP engine will subsequently:
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                  <li>Propagate the complete project amount to the <strong>Dashboard analytic cards</strong>.</li>
                  <li>Calculate <strong>employee milestone commissions</strong> dynamically based on active rates.</li>
                  <li>Incorporate calculated volumes to update the <strong>Staff Salary Module</strong> sheets.</li>
                  <li>Write a persistent log entry inside the system-wide <strong>Activity Tracebook</strong>.</li>
                </ul>
                <p className="text-[10px] font-semibold text-indigo-600 italic mt-1">
                  * Dynamic computations are held as read-only layouts within this frontend sandbox.
                </p>
              </div>

            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Project Pipeline Archival"
        message={selectedProject ? `Are you sure you want to deactivate and archive the project pipeline for "${selectedProject.name}"? Active work structures will be suspended.` : ''}
        confirmLabel="Archive Pipeline"
        cancelLabel="Maintain Pipeline"
        type="danger"
      />

      {/* Notifications */}
      {toastMsg && (
        <SuccessToast message={toastMsg} onClose={() => setToastMsg(null)} type={toastType} />
      )}

    </div>
  );
};


// ==========================================
// 5. INCOME PAGE (Inflow Cashbook)
// ==========================================

export const IncomePage: React.FC<{ globalSearch: string }> = ({ globalSearch }) => {
  const [incomes, setIncomes] = useState<Transaction[]>([]);

  // Search, filtering & pagination states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, paid
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Active records
  const [selectedIncome, setSelectedIncome] = useState<Transaction | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Form Fields State
  const [formFields, setFormFields] = useState({
    incomeSource: '',
    name: '',
    currency: 'BDT' as 'BDT' | 'USD',
    amount: '',
    paymentMethod: 'Bank' as 'Cash' | 'Bank' | 'Mobile Banking' | 'Other',
    status: 'paid' as 'pending' | 'paid',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formFields.incomeSource.trim()) errors.incomeSource = 'Income Source is required';
    if (!formFields.name.trim()) errors.name = 'Name is required';
    if (!formFields.amount || isNaN(Number(formFields.amount)) || Number(formFields.amount) <= 0) {
      errors.amount = 'Valid positive amount is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setFormFields({
      incomeSource: '',
      name: '',
      currency: 'BDT',
      amount: '',
      paymentMethod: 'Bank',
      status: 'paid',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const fetchIncomes = async () => {
    try {
      const res = await callGasApi('getIncomes');
      if (res && res.success && Array.isArray(res.data)) {
        setIncomes(res.data.map((inc: any, index: number) => {
          const amt = Number(inc.amount || inc.amountBDT || inc.amountBdt || inc.amountUSD || inc.amountUsd || 0);
          const source = inc.incomeSource || inc.project || inc.projectName || inc.category || '';
          const nameVal = inc.name || inc.client || inc.clientName || '';
          return {
            id: inc.id || inc.incomeId || `INC-00${index + 1}`,
            date: formatSheetDate(inc.date) || inc.date || new Date().toISOString().split('T')[0],
            category: inc.category || 'Income',
            description: inc.description || `${source || 'Income'} Payment`,
            amount: amt,
            currency: inc.currency || (inc.amountUSD || inc.amountUsd ? 'USD' : 'BDT'),
            status: (inc.status || 'paid').toString().toLowerCase(),
            incomeSource: source,
            projectName: source,
            name: nameVal,
            clientName: nameVal,
            paymentMethod: inc.paymentMethod || 'Bank',
            reference: inc.reference || `REF-${index + 1000}`,
            notes: inc.notes || ''
          };
        }));
      }
    } catch (err) {
      console.error('Failed to load income records from backend:', err);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const numAmount = Number(formFields.amount);

    const payload = {
      date: formFields.date,
      incomeSource: formFields.incomeSource,
      name: formFields.name,
      project: formFields.incomeSource,
      projectName: formFields.incomeSource,
      client: formFields.name,
      clientName: formFields.name,
      amount: numAmount,
      currency: formFields.currency,
      amountBdt: formFields.currency === 'BDT' ? numAmount : 0,
      amountBDT: formFields.currency === 'BDT' ? numAmount : 0,
      amountUsd: formFields.currency === 'USD' ? numAmount : 0,
      amountUSD: formFields.currency === 'USD' ? numAmount : 0,
      paymentMethod: formFields.paymentMethod,
      status: formFields.status,
      notes: formFields.notes,
      description: `${formFields.incomeSource} - ${formFields.name}`
    };

    try {
      const res = await callGasApi('addIncome', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Successfully recorded income for "${formFields.incomeSource}"`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Recorded income for "${formFields.incomeSource}"`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to record income on backend.');
    }

    setIsAddOpen(false);
    setCurrentPage(1);
    await fetchIncomes();
  };

  const handleResetAdd = () => {
    setFormFields({
      incomeSource: '',
      name: '',
      currency: 'BDT',
      amount: '',
      paymentMethod: 'Bank',
      status: 'paid',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
  };

  const handleOpenEdit = (inc: Transaction) => {
    setSelectedIncome(inc);
    setFormFields({
      incomeSource: inc.incomeSource || inc.projectName || '',
      name: inc.name || inc.clientName || '',
      currency: inc.currency || 'BDT',
      amount: (inc.amount || inc.amountBDT || 0).toString(),
      paymentMethod: inc.paymentMethod || 'Bank',
      status: (inc.status === 'paid' || inc.status === 'completed' ? 'paid' : 'pending') as 'paid' | 'pending',
      notes: inc.notes || '',
      date: inc.date
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedIncome) return;

    const numAmount = Number(formFields.amount);

    const payload = {
      id: selectedIncome.id,
      incomeId: selectedIncome.id,
      date: formFields.date,
      incomeSource: formFields.incomeSource,
      name: formFields.name,
      project: formFields.incomeSource,
      projectName: formFields.incomeSource,
      client: formFields.name,
      clientName: formFields.name,
      amount: numAmount,
      currency: formFields.currency,
      amountBdt: formFields.currency === 'BDT' ? numAmount : 0,
      amountBDT: formFields.currency === 'BDT' ? numAmount : 0,
      amountUsd: formFields.currency === 'USD' ? numAmount : 0,
      amountUSD: formFields.currency === 'USD' ? numAmount : 0,
      paymentMethod: formFields.paymentMethod,
      status: formFields.status,
      notes: formFields.notes,
      description: `${formFields.incomeSource} - ${formFields.name}`
    };

    try {
      const res = await callGasApi('updateIncome', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Successfully updated income log "${selectedIncome.id}"`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Updated income log "${selectedIncome.id}"`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to update income record on backend.');
    }

    setIsEditOpen(false);
    await fetchIncomes();
  };

  const handleResetEdit = () => {
    if (!selectedIncome) return;
    setFormFields({
      incomeSource: selectedIncome.incomeSource || selectedIncome.projectName || '',
      name: selectedIncome.name || selectedIncome.clientName || '',
      currency: selectedIncome.currency || 'BDT',
      amount: (selectedIncome.amount || selectedIncome.amountBDT || 0).toString(),
      paymentMethod: selectedIncome.paymentMethod || 'Bank',
      status: (selectedIncome.status === 'paid' || selectedIncome.status === 'completed' ? 'paid' : 'pending') as 'paid' | 'pending',
      notes: selectedIncome.notes || '',
      date: selectedIncome.date
    });
    setFormErrors({});
  };

  const handleOpenView = (inc: Transaction) => {
    setSelectedIncome(inc);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (inc: Transaction) => {
    setSelectedIncome(inc);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedIncome) return;
    const incToDelete = selectedIncome;
    setIsDeleteOpen(false);

    try {
      const res = await callGasApi('deleteIncome', { id: incToDelete.id });
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Income record "${incToDelete.id}" deleted successfully.`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Deleted income record "${incToDelete.id}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to delete income record on backend.');
    }

    setSelectedIncome(null);
    await fetchIncomes();
  };

  // Queries & computations
  const query = search || globalSearch;
  const filteredIncomes = incomes.filter(inc => {
    const matchesSearch = 
      (inc.incomeSource || inc.projectName || '').toLowerCase().includes(query.toLowerCase()) ||
      (inc.name || inc.clientName || '').toLowerCase().includes(query.toLowerCase()) ||
      (inc.notes || '').toLowerCase().includes(query.toLowerCase()) ||
      inc.id.toLowerCase().includes(query.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'paid' && (inc.status === 'paid' || inc.status === 'completed')) ||
      (statusFilter === 'pending' && inc.status === 'pending');

    return matchesSearch && matchesStatus;
  });

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, globalSearch]);

  const totalPages = Math.ceil(filteredIncomes.length / itemsPerPage);
  const paginatedIncomes = filteredIncomes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="income-module-root">
      
      {/* Header Profile Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Income Ledger & Cash Receipts</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track non-project revenue, retainers, and manual receipts in both BDT and USD denominations.
          </p>
        </div>
        <PrimaryButton icon={<Plus className="h-4 w-4" />} onClick={handleOpenAdd}>
          Add Income Record
        </PrimaryButton>
      </div>

      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-200/60">
        <SearchBox 
          value={search} 
          onSearchChange={setSearch} 
          placeholder="Search by income source, name or note..." 
        />
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:inline">Status:</span>
          <FilterDropdown 
            label="All Statuses" 
            selected={statusFilter} 
            onChange={setStatusFilter} 
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'paid', label: 'Paid Collections' },
              { value: 'pending', label: 'Pending Clearances' }
            ]} 
          />
        </div>
      </div>

      {/* Income Table List */}
      {paginatedIncomes.length > 0 ? (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs max-h-[500px]">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              {/* Sticky Header */}
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 tracking-wider uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4.5 font-semibold">Date</th>
                  <th className="px-6 py-4.5 font-semibold">Income Source</th>
                  <th className="px-6 py-4.5 font-semibold">Name</th>
                  <th className="px-6 py-4.5 font-semibold">Currency</th>
                  <th className="px-6 py-4.5 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4.5 font-semibold">Payment Method</th>
                  <th className="px-6 py-4.5 font-semibold text-center">Status</th>
                  <th className="px-6 py-4.5 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                    {/* Date */}
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">{formatDisplayPaymentDate(inc.date).fullStr || inc.date}</td>
                    
                    {/* Income Source */}
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap max-w-[200px] truncate" title={inc.incomeSource || inc.projectName}>
                      {inc.incomeSource || inc.projectName || <span className="text-slate-400 italic font-normal">N/A</span>}
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">
                      {inc.name || inc.clientName || <span className="text-slate-400 italic font-normal">N/A</span>}
                    </td>

                    {/* Currency */}
                    <td className="px-6 py-4 text-slate-600 font-semibold whitespace-nowrap">
                      {inc.currency || 'BDT'}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono whitespace-nowrap">
                      {inc.currency === 'USD' ? '$' : '৳'}{(inc.amount || inc.amountBDT || 0).toLocaleString()}
                    </td>

                    {/* Payment Method */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {inc.paymentMethod || 'Bank'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        inc.status === 'paid' || inc.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${inc.status === 'paid' || inc.status === 'completed' ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`} />
                        {inc.status === 'paid' || inc.status === 'completed' ? 'Paid' : 'Pending'}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleOpenView(inc)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-150"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(inc)}
                          title="Edit Record"
                          className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all duration-150"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenDelete(inc)}
                          title="Delete Record"
                          className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-150"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-3xs">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, filteredIncomes.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{filteredIncomes.length}</span> income records
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-3xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all duration-150 shadow-3xs ${
                      currentPage === pageNum
                        ? 'bg-[#2563EB] text-white font-bold'
                        : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-3xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState 
          title="No income transactions found" 
          description="Adjust your search criteria, change status filters, or register a new cash receipt." 
          actionLabel="Add Income Log"
          onAction={handleOpenAdd}
          icon={<ArrowUpRight className="h-12 w-12 text-emerald-400" />}
        />
      )}

      {/* Add Income Modal */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        title="Record New Inflow Cash Receipt"
        footerActions={
          <>
            <SecondaryButton onClick={handleResetAdd} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsAddOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveAdd}>Save Income</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          
          {/* Income Source Input */}
          <FormInput 
            id="add-inc-source"
            label="Income Source *" 
            placeholder="e.g. Website Design, Retainer, Sponsorship"
            value={formFields.incomeSource}
            onChange={(e) => setFormFields({ ...formFields, incomeSource: e.target.value })}
            error={formErrors.incomeSource}
            required
          />

          {/* Name Input */}
          <FormInput 
            id="add-inc-name"
            label="Name *" 
            placeholder="e.g. John Doe, Acme Corp"
            value={formFields.name}
            onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
            error={formErrors.name}
            required
          />

          {/* Currency and Amount Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectInput 
              id="add-inc-currency"
              label="Currency *" 
              value={formFields.currency}
              onChange={(e) => setFormFields({ ...formFields, currency: e.target.value as 'BDT' | 'USD' })}
              options={[
                { value: 'BDT', label: 'BDT (৳)' },
                { value: 'USD', label: 'USD ($)' }
              ]}
            />
            <FormInput 
              id="add-inc-amount"
              label="Amount *" 
              type="text"
              placeholder={formFields.currency === 'BDT' ? "e.g. 150000" : "e.g. 1300"} 
              value={formFields.amount}
              onChange={(e) => setFormFields({ ...formFields, amount: e.target.value })}
              error={formErrors.amount}
              required
            />
          </div>

          {/* Payment Method */}
          <SelectInput 
            id="add-inc-method"
            label="Payment Method *" 
            value={formFields.paymentMethod}
            onChange={(e) => setFormFields({ ...formFields, paymentMethod: e.target.value as any })}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank', label: 'Bank Transfer / Wire' },
              { value: 'Mobile Banking', label: 'Mobile Banking (bKash/Nagad)' },
              { value: 'Other', label: 'Other / Gateway' }
            ]}
          />

          {/* Status Dropdown */}
          <SelectInput 
            id="add-inc-status"
            label="Receipt Status *" 
            value={formFields.status}
            onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
            options={[
              { value: 'paid', label: 'Paid / Cleared' },
              { value: 'pending', label: 'Pending / Outstanding' }
            ]}
          />

          {/* Receipt Date */}
          <FormInput 
            id="add-inc-date"
            label="Transaction Date *" 
            type="date"
            value={formFields.date}
            onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
            required
          />

          {/* Notes */}
          <Textarea 
            id="add-inc-notes"
            label="Collection Details & Notes"
            placeholder="Type any reference numbers, invoice details, check receipts..."
            value={formFields.notes}
            onChange={(e) => setFormFields({ ...formFields, notes: e.target.value })}
          />

        </form>
      </Modal>

      {/* Edit Income Modal */}
      <Modal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        title={`Edit Income Record: ${selectedIncome?.id}`}
        footerActions={
          <>
            <SecondaryButton onClick={handleResetEdit} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsEditOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveEdit}>Save Modifications</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          
          {/* Income Source Input */}
          <FormInput 
            id="edit-inc-source"
            label="Income Source *" 
            placeholder="e.g. Website Design, Retainer, Sponsorship"
            value={formFields.incomeSource}
            onChange={(e) => setFormFields({ ...formFields, incomeSource: e.target.value })}
            error={formErrors.incomeSource}
            required
          />

          {/* Name Input */}
          <FormInput 
            id="edit-inc-name"
            label="Name *" 
            placeholder="e.g. John Doe, Acme Corp"
            value={formFields.name}
            onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
            error={formErrors.name}
            required
          />

          {/* Currency and Amount Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectInput 
              id="edit-inc-currency"
              label="Currency *" 
              value={formFields.currency}
              onChange={(e) => setFormFields({ ...formFields, currency: e.target.value as 'BDT' | 'USD' })}
              options={[
                { value: 'BDT', label: 'BDT (৳)' },
                { value: 'USD', label: 'USD ($)' }
              ]}
            />
            <FormInput 
              id="edit-inc-amount"
              label="Amount *" 
              type="text"
              placeholder={formFields.currency === 'BDT' ? "e.g. 150000" : "e.g. 1300"} 
              value={formFields.amount}
              onChange={(e) => setFormFields({ ...formFields, amount: e.target.value })}
              error={formErrors.amount}
              required
            />
          </div>

          {/* Payment Method */}
          <SelectInput 
            id="edit-inc-method"
            label="Payment Method *" 
            value={formFields.paymentMethod}
            onChange={(e) => setFormFields({ ...formFields, paymentMethod: e.target.value as any })}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank', label: 'Bank Transfer / Wire' },
              { value: 'Mobile Banking', label: 'Mobile Banking (bKash/Nagad)' },
              { value: 'Other', label: 'Other / Gateway' }
            ]}
          />

          {/* Status Dropdown */}
          <SelectInput 
            id="edit-inc-status"
            label="Receipt Status *" 
            value={formFields.status}
            onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
            options={[
              { value: 'paid', label: 'Paid / Cleared' },
              { value: 'pending', label: 'Pending / Outstanding' }
            ]}
          />

          {/* Receipt Date */}
          <FormInput 
            id="edit-inc-date"
            label="Transaction Date *" 
            type="date"
            value={formFields.date}
            onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
            required
          />

          {/* Notes */}
          <Textarea 
            id="edit-inc-notes"
            label="Collection Details & Notes"
            placeholder="Type any reference numbers, invoice details, check receipts..."
            value={formFields.notes}
            onChange={(e) => setFormFields({ ...formFields, notes: e.target.value })}
          />

        </form>
      </Modal>

      {/* View Income details modal */}
      <Modal 
        isOpen={isViewOpen} 
        onClose={() => setIsViewOpen(false)} 
        title="Income Transaction Audit Slip"
        footerActions={
          <SecondaryButton onClick={() => setIsViewOpen(false)}>Close Slip</SecondaryButton>
        }
      >
        {selectedIncome && (
          <div className="space-y-5">
            
            {/* Top overview badge card */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 font-bold block">ID: {selectedIncome.id}</span>
                <span className="text-xs text-slate-500 font-medium">{formatDisplayPaymentDate(selectedIncome.date).fullStr || selectedIncome.date}</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full ${
                selectedIncome.status === 'paid' || selectedIncome.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {selectedIncome.status === 'paid' || selectedIncome.status === 'completed' ? 'Paid' : 'Pending'}
              </span>
            </div>

            {/* SECTIONS */}
            <div className="space-y-4">
              {/* 1. Income Information */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Income Information</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Currency</span>
                    <span className="text-xs font-bold text-slate-800">{selectedIncome.currency || 'BDT'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Amount</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {selectedIncome.currency === 'USD' ? '$' : '৳'}{(selectedIncome.amount || selectedIncome.amountBDT || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Source & Name Information */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source & Payer Details</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Income Source</span>
                    <span className="text-xs font-bold text-slate-800">{selectedIncome.incomeSource || selectedIncome.projectName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Name</span>
                    <span className="text-xs font-bold text-slate-800">{selectedIncome.name || selectedIncome.clientName || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Payment Information */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Information</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Method</span>
                    <span className="text-xs font-bold text-slate-800">{selectedIncome.paymentMethod || 'Bank'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Reference Code</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">{selectedIncome.reference || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* 4. Notes */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction Notes</span>
                </div>
                <div className="p-4 bg-slate-50/30">
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{selectedIncome.notes || 'No administrative annotations recorded.'}"
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Income Record"
        message={selectedIncome ? `Are you sure you want to permanently delete and archive the cash receipt record "${selectedIncome.id}" for ${selectedIncome.currency === 'USD' ? '$' : '৳'}${(selectedIncome.amount || selectedIncome.amountBDT || 0).toLocaleString()} ${selectedIncome.currency || 'BDT'}? This operation is immediate.` : ''}
        confirmLabel="Confirm Delete"
        cancelLabel="Keep Record"
        type="danger"
      />

      {toastMsg && (
        <SuccessToast 
          message={toastMsg} 
          type={toastType} 
          onClose={() => setToastMsg(null)} 
        />
      )}

    </div>
  );
};


// ==========================================
// 6. EXPENSES PAGE (Outflow Cashbook)
// ==========================================

export const ExpensesPage: React.FC<{ globalSearch: string }> = ({ globalSearch }) => {
  const [expenses, setExpenses] = useState<Transaction[]>([]);

  // Search, filtering & pagination states
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all'); // all, Infrastructure, SaaS Subscription, Office Rent, Marketing, Other
  const [statusFilter, setStatusFilter] = useState('all'); // all, paid, pending
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Active records
  const [selectedExpense, setSelectedExpense] = useState<Transaction | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Form Fields State
  const [formFields, setFormFields] = useState({
    category: 'Infrastructure',
    customCategory: '',
    currency: 'BDT' as 'BDT' | 'USD',
    amount: '',
    paymentMethod: 'Bank' as 'Cash' | 'Bank' | 'Mobile Banking' | 'Other',
    status: 'paid' as 'paid' | 'pending',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formFields.category) {
      errors.category = 'Category selection is required';
    }
    if (formFields.category === 'Other' && !formFields.customCategory.trim()) {
      errors.customCategory = 'Custom category label is required when "Other" is selected';
    }
    if (!formFields.amount || isNaN(Number(formFields.amount)) || Number(formFields.amount) <= 0) {
      errors.amount = 'Valid positive amount is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Operations
  const handleOpenAdd = () => {
    setFormFields({
      category: 'Infrastructure',
      customCategory: '',
      currency: 'BDT',
      amount: '',
      paymentMethod: 'Bank',
      status: 'paid',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const fetchExpenses = async () => {
    try {
      const res = await callGasApi('getExpenses');
      if (res && res.success && Array.isArray(res.data)) {
        setExpenses(res.data.map((exp: any, index: number) => {
          const amt = Number(exp.amount || exp.amountBDT || 0);
          return {
            id: exp.id || exp.expenseId || `EXP-00${index + 1}`,
            date: exp.date || new Date().toISOString().split('T')[0],
            category: exp.category || 'Infrastructure',
            description: exp.description || `${exp.category || 'Expense'} Disbursal`,
            amount: amt,
            currency: exp.currency || 'BDT',
            status: (exp.status || 'paid').toString().toLowerCase(),
            paymentMethod: exp.paymentMethod || 'Bank',
            reference: exp.reference || `TX-${index + 100}`,
            notes: exp.notes || ''
          };
        }));
      }
    } catch (err) {
      console.error('Failed to load expenses from backend:', err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const finalCategory = formFields.category === 'Other' ? formFields.customCategory : formFields.category;
    const payload = {
      date: formFields.date,
      category: finalCategory,
      vendor: finalCategory || 'Vendor',
      payee: finalCategory || 'Vendor',
      vendorPayee: finalCategory || 'Vendor',
      description: `${finalCategory} Disbursal`,
      amount: Number(formFields.amount) || 0,
      currency: formFields.currency,
      status: formFields.status,
      paymentMethod: formFields.paymentMethod,
      notes: formFields.notes || '',
      reference: `TX-${finalCategory.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`
    };

    try {
      const res = await callGasApi('addExpense', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Successfully logged operating expense.`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Logged operating expense.`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to log expense on backend.');
    }

    setIsAddOpen(false);
    setCurrentPage(1);
    await fetchExpenses();
  };

  const handleResetAdd = () => {
    setFormFields({
      category: 'Infrastructure',
      customCategory: '',
      currency: 'BDT',
      amount: '',
      paymentMethod: 'Bank',
      status: 'paid',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
  };

  const handleOpenEdit = (exp: Transaction) => {
    setSelectedExpense(exp);
    const standardCategories = ['Infrastructure', 'SaaS Subscription', 'Office Rent', 'Marketing'];
    const isOther = !standardCategories.includes(exp.category);

    setFormFields({
      category: isOther ? 'Other' : exp.category,
      customCategory: isOther ? exp.category : '',
      currency: exp.currency || 'BDT',
      amount: (exp.amount || exp.amountBDT || 0).toString(),
      paymentMethod: exp.paymentMethod || 'Bank',
      status: (exp.status === 'paid' || exp.status === 'completed' ? 'paid' : 'pending') as 'paid' | 'pending',
      notes: exp.notes || '',
      date: exp.date
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedExpense) return;

    const finalCategory = formFields.category === 'Other' ? formFields.customCategory : formFields.category;
    const payload = {
      id: selectedExpense.id,
      date: formFields.date,
      category: finalCategory,
      vendor: finalCategory || 'Vendor',
      payee: finalCategory || 'Vendor',
      vendorPayee: finalCategory || 'Vendor',
      amount: Number(formFields.amount) || 0,
      currency: formFields.currency,
      paymentMethod: formFields.paymentMethod,
      status: formFields.status,
      notes: formFields.notes || '',
      description: `${finalCategory} Disbursal`
    };

    try {
      const res = await callGasApi('updateExpense', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Successfully updated expense log "${selectedExpense.id}"`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Updated expense log "${selectedExpense.id}"`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to update expense record on backend.');
    }

    setIsEditOpen(false);
    await fetchExpenses();
  };

  const handleResetEdit = () => {
    if (!selectedExpense) return;
    const standardCategories = ['Infrastructure', 'SaaS Subscription', 'Office Rent', 'Marketing'];
    const isOther = !standardCategories.includes(selectedExpense.category);

    setFormFields({
      category: isOther ? 'Other' : selectedExpense.category,
      customCategory: isOther ? selectedExpense.category : '',
      currency: selectedExpense.currency || 'BDT',
      amount: (selectedExpense.amount || selectedExpense.amountBDT || 0).toString(),
      paymentMethod: selectedExpense.paymentMethod || 'Bank',
      status: (selectedExpense.status === 'paid' || selectedExpense.status === 'completed' ? 'paid' : 'pending') as 'paid' | 'pending',
      notes: selectedExpense.notes || '',
      date: selectedExpense.date
    });
    setFormErrors({});
  };

  const handleOpenView = (exp: Transaction) => {
    setSelectedExpense(exp);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (exp: Transaction) => {
    setSelectedExpense(exp);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    const expToDelete = selectedExpense;
    setIsDeleteOpen(false);

    try {
      const res = await callGasApi('deleteExpense', { id: expToDelete.id });
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Expense entry "${expToDelete.id}" deleted successfully.`);
      } else {
        setToastType('warning');
        setToastMsg(res?.message || `Deleted expense entry "${expToDelete.id}".`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to delete expense entry on backend.');
    }

    setSelectedExpense(null);
    await fetchExpenses();
  };

  // Filters & Search
  const query = search || globalSearch;
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.category.toLowerCase().includes(query.toLowerCase()) ||
      exp.id.toLowerCase().includes(query.toLowerCase()) ||
      (exp.notes || '').toLowerCase().includes(query.toLowerCase()) ||
      (exp.description || '').toLowerCase().includes(query.toLowerCase());

    const matchesCat = catFilter === 'all' || 
      (catFilter === 'Other' && !['Infrastructure', 'SaaS Subscription', 'Office Rent', 'Marketing'].includes(exp.category)) ||
      exp.category === catFilter;

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'paid' && (exp.status === 'paid' || exp.status === 'completed')) ||
      (statusFilter === 'pending' && exp.status === 'pending');

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, catFilter, statusFilter, globalSearch]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="expenses-module-root">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Outflow Ledger & Expenses</h2>
          <p className="text-xs text-slate-500 mt-1">
            Register and organize administrative overheads, software licenses, bills, and campaigns.
          </p>
        </div>
        <PrimaryButton icon={<Plus className="h-4 w-4" />} onClick={handleOpenAdd}>
          Log Expense Entry
        </PrimaryButton>
      </div>

      {/* BUSINESS RULE CARD DISPLAY (Information Only) */}
      <div className="p-4.5 bg-indigo-50/50 border border-indigo-100/50 rounded-xl space-y-2.5 shadow-3xs">
        <div className="flex items-center gap-2 text-indigo-800">
          <Info className="h-4.5 w-4.5 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">Business Rule & Dashboard Calculation Notice</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Important:</strong> Expenses logged in this ledger <span className="font-semibold text-indigo-700">immediately affect the Dashboard</span> summaries after they are saved. 
        </p>
        <p className="text-[10px] text-indigo-600 italic font-medium">
          * This instant deduction workflow is documented for informational guidelines and is not actively linked to the main dashboard in this design iteration.
        </p>
      </div>

      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-slate-50 p-3 rounded-xl border border-slate-200/60">
        <SearchBox 
          value={search} 
          onSearchChange={setSearch} 
          placeholder="Search by category, description, notes or ID..." 
        />
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:inline">Category:</span>
            <FilterDropdown 
              label="All Categories" 
              selected={catFilter} 
              onChange={setCatFilter} 
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'Infrastructure', label: 'Cloud Infrastructure' },
                { value: 'SaaS Subscription', label: 'SaaS Subscriptions' },
                { value: 'Office Rent', label: 'Office Rent & Utilities' },
                { value: 'Marketing', label: 'Marketing Spends' },
                { value: 'Other', label: 'Other/Custom Overhead' }
              ]} 
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:inline">Status:</span>
            <FilterDropdown 
              label="All Statuses" 
              selected={statusFilter} 
              onChange={setStatusFilter} 
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'paid', label: 'Paid Clearances' },
                { value: 'pending', label: 'Pending Clearances' }
              ]} 
            />
          </div>
        </div>
      </div>

      {/* Expense Table List */}
      {paginatedExpenses.length > 0 ? (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs max-h-[500px]">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              {/* Sticky Header */}
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 tracking-wider uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4.5 font-semibold">Date</th>
                  <th className="px-6 py-4.5 font-semibold">Category</th>
                  <th className="px-6 py-4.5 font-semibold">Description</th>
                  <th className="px-6 py-4.5 font-semibold">Currency</th>
                  <th className="px-6 py-4.5 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4.5 font-semibold">Payment Method</th>
                  <th className="px-6 py-4.5 font-semibold text-center">Status</th>
                  <th className="px-6 py-4.5 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                    {/* Date */}
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">{exp.date}</td>
                    
                    {/* Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-100">
                        {exp.category}
                      </span>
                    </td>

                    {/* Description / Note */}
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap max-w-[200px] truncate" title={exp.description || exp.notes}>
                      {exp.description || <span className="text-slate-400 italic font-normal">N/A</span>}
                    </td>

                    {/* Currency */}
                    <td className="px-6 py-4 text-slate-600 font-semibold whitespace-nowrap">
                      {exp.currency || 'BDT'}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono whitespace-nowrap">
                      {exp.currency === 'USD' ? '$' : '৳'}{(exp.amount || exp.amountBDT || 0).toLocaleString()}
                    </td>

                    {/* Payment Method */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {exp.paymentMethod || 'Bank'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        exp.status === 'paid' || exp.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${exp.status === 'paid' || exp.status === 'completed' ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`} />
                        {exp.status === 'paid' || exp.status === 'completed' ? 'Paid' : 'Pending'}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleOpenView(exp)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-150"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(exp)}
                          title="Edit Record"
                          className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all duration-150"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenDelete(exp)}
                          title="Delete Record"
                          className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-150"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-3xs">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, filteredExpenses.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{filteredExpenses.length}</span> operating costs
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-3xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all duration-150 shadow-3xs ${
                      currentPage === pageNum
                        ? 'bg-[#2563EB] text-white font-bold'
                        : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 shadow-3xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState 
          title="No expenses match current filters" 
          description="Try relaxing your filters or record a new administrative expense receipt entry." 
          actionLabel="Log Operating Outflow"
          onAction={handleOpenAdd}
          icon={<ArrowDownLeft className="h-12 w-12 text-rose-400" />}
        />
      )}

      {/* Add Expense Modal */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        title="Record Operating Outflow Expense"
        footerActions={
          <>
            <SecondaryButton onClick={handleResetAdd} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsAddOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveAdd}>Save Expense</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          
          {/* Category Dropdown */}
          <SelectInput 
            id="add-exp-cat"
            label="Cost Category *" 
            value={formFields.category}
            onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
            error={formErrors.category}
            options={[
              { value: 'Infrastructure', label: 'Cloud Infrastructure' },
              { value: 'SaaS Subscription', label: 'SaaS Subscriptions' },
              { value: 'Office Rent', label: 'Office Rent & Utilities' },
              { value: 'Marketing', label: 'Marketing spends' },
              { value: 'Other', label: 'Other (Custom category...)' }
            ]}
          />

          {/* Conditional Custom Category Input */}
          {formFields.category === 'Other' && (
            <FormInput 
              id="add-exp-custom-cat"
              label="Custom Category Name *" 
              placeholder="e.g. Legal Fees, Accounting, Travel..." 
              value={formFields.customCategory}
              onChange={(e) => setFormFields({ ...formFields, customCategory: e.target.value })}
              error={formErrors.customCategory}
              required
            />
          )}

          {/* Currency and Amount Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectInput 
              id="add-exp-currency"
              label="Currency *" 
              value={formFields.currency}
              onChange={(e) => setFormFields({ ...formFields, currency: e.target.value as 'BDT' | 'USD' })}
              options={[
                { value: 'BDT', label: 'BDT (৳)' },
                { value: 'USD', label: 'USD ($)' }
              ]}
            />
            <FormInput 
              id="add-exp-amount"
              label="Amount *" 
              type="text"
              placeholder={formFields.currency === 'BDT' ? "e.g. 50000" : "e.g. 435"} 
              value={formFields.amount}
              onChange={(e) => setFormFields({ ...formFields, amount: e.target.value })}
              error={formErrors.amount}
              required
            />
          </div>

          {/* Payment Method */}
          <SelectInput 
            id="add-exp-method"
            label="Payment Method *" 
            value={formFields.paymentMethod}
            onChange={(e) => setFormFields({ ...formFields, paymentMethod: e.target.value as any })}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank', label: 'Bank' },
              { value: 'Mobile Banking', label: 'Mobile Banking' },
              { value: 'Other', label: 'Other' }
            ]}
          />

          {/* Status Dropdown */}
          <SelectInput 
            id="add-exp-status"
            label="Receipt Status *" 
            value={formFields.status}
            onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
            options={[
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' }
            ]}
          />

          {/* Receipt Date */}
          <FormInput 
            id="add-exp-date"
            label="Transaction Date *" 
            type="date"
            value={formFields.date}
            onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
            required
          />

          {/* Notes */}
          <Textarea 
            id="add-exp-notes"
            label="Expense Details & Annotations"
            placeholder="Type any reference invoice numbers, merchant billing specs, or payment authorization notes..."
            value={formFields.notes}
            onChange={(e) => setFormFields({ ...formFields, notes: e.target.value })}
          />

        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        title={`Edit Expense Record: ${selectedExpense?.id}`}
        footerActions={
          <>
            <SecondaryButton onClick={handleResetEdit} icon={<RotateCcw className="h-4 w-4" />}>Reset</SecondaryButton>
            <SecondaryButton onClick={() => setIsEditOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveEdit}>Save Modifications</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          
          {/* Category Dropdown */}
          <SelectInput 
            id="edit-exp-cat"
            label="Cost Category *" 
            value={formFields.category}
            onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
            error={formErrors.category}
            options={[
              { value: 'Infrastructure', label: 'Cloud Infrastructure' },
              { value: 'SaaS Subscription', label: 'SaaS Subscriptions' },
              { value: 'Office Rent', label: 'Office Rent & Utilities' },
              { value: 'Marketing', label: 'Marketing spends' },
              { value: 'Other', label: 'Other (Custom category...)' }
            ]}
          />

          {/* Conditional Custom Category Input */}
          {formFields.category === 'Other' && (
            <FormInput 
              id="edit-exp-custom-cat"
              label="Custom Category Name *" 
              placeholder="e.g. Legal Fees, Accounting, Travel..." 
              value={formFields.customCategory}
              onChange={(e) => setFormFields({ ...formFields, customCategory: e.target.value })}
              error={formErrors.customCategory}
              required
            />
          )}

          {/* Currency and Amount Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectInput 
              id="edit-exp-currency"
              label="Currency *" 
              value={formFields.currency}
              onChange={(e) => setFormFields({ ...formFields, currency: e.target.value as 'BDT' | 'USD' })}
              options={[
                { value: 'BDT', label: 'BDT (৳)' },
                { value: 'USD', label: 'USD ($)' }
              ]}
            />
            <FormInput 
              id="edit-exp-amount"
              label="Amount *" 
              type="text"
              placeholder={formFields.currency === 'BDT' ? "e.g. 50000" : "e.g. 435"} 
              value={formFields.amount}
              onChange={(e) => setFormFields({ ...formFields, amount: e.target.value })}
              error={formErrors.amount}
              required
            />
          </div>

          {/* Payment Method */}
          <SelectInput 
            id="edit-exp-method"
            label="Payment Method *" 
            value={formFields.paymentMethod}
            onChange={(e) => setFormFields({ ...formFields, paymentMethod: e.target.value as any })}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank', label: 'Bank' },
              { value: 'Mobile Banking', label: 'Mobile Banking' },
              { value: 'Other', label: 'Other' }
            ]}
          />

          {/* Status Dropdown */}
          <SelectInput 
            id="edit-exp-status"
            label="Receipt Status *" 
            value={formFields.status}
            onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
            options={[
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' }
            ]}
          />

          {/* Receipt Date */}
          <FormInput 
            id="edit-exp-date"
            label="Transaction Date *" 
            type="date"
            value={formFields.date}
            onChange={(e) => setFormFields({ ...formFields, date: e.target.value })}
            required
          />

          {/* Notes */}
          <Textarea 
            id="edit-exp-notes"
            label="Expense Details & Annotations"
            placeholder="Type any reference invoice numbers, merchant billing specs, or payment authorization notes..."
            value={formFields.notes}
            onChange={(e) => setFormFields({ ...formFields, notes: e.target.value })}
          />

        </form>
      </Modal>

      {/* View Expense details modal */}
      <Modal 
        isOpen={isViewOpen} 
        onClose={() => setIsViewOpen(false)} 
        title="Expense Transaction Audit Slip"
        footerActions={
          <SecondaryButton onClick={() => setIsViewOpen(false)}>Close Slip</SecondaryButton>
        }
      >
        {selectedExpense && (
          <div className="space-y-5">
            
            {/* Top overview badge card */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 font-bold block">ID: {selectedExpense.id}</span>
                <span className="text-xs text-slate-500 font-medium">{selectedExpense.date}</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full ${
                selectedExpense.status === 'paid' || selectedExpense.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {selectedExpense.status === 'paid' || selectedExpense.status === 'completed' ? 'Paid' : 'Pending'}
              </span>
            </div>

            {/* SECTIONS */}
            <div className="space-y-4">
              {/* 1. Expense Information */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expense Information</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Category</span>
                    <span className="text-xs font-bold text-slate-800">{selectedExpense.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Disbursal Target</span>
                    <span className="text-xs font-bold text-slate-800">{selectedExpense.description || 'Operating Disbursal'}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Currency</span>
                    <span className="text-xs font-bold text-slate-800">{selectedExpense.currency || 'BDT'}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Amount</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {selectedExpense.currency === 'USD' ? '$' : '৳'}{(selectedExpense.amount || selectedExpense.amountBDT || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Payment Information */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Information</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Method</span>
                    <span className="text-xs font-bold text-slate-800">{selectedExpense.paymentMethod || 'Bank'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Reference Code</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">{selectedExpense.reference || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Notes */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction Notes</span>
                </div>
                <div className="p-4 bg-slate-50/30">
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{selectedExpense.notes || 'No administrative annotations recorded.'}"
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Record"
        message={selectedExpense ? `Are you sure you want to permanently delete and archive the operating cost entry "${selectedExpense.id}" representing ${selectedExpense.currency === 'USD' ? '$' : '৳'}${(selectedExpense.amount || selectedExpense.amountBDT || 0).toLocaleString()} ${selectedExpense.currency || 'BDT'}? This operation is immediate.` : ''}
        confirmLabel="Confirm Delete"
        cancelLabel="Keep Record"
        type="danger"
      />

      {toastMsg && (
        <SuccessToast 
          message={toastMsg} 
          type={toastType} 
          onClose={() => setToastMsg(null)} 
        />
      )}

    </div>
  );
};


// ==========================================
// 7. SALARY PAYMENTS PAGE
// ==========================================

export interface ExtendedSalaryPayment {
  id: string; // Payment ID
  paymentId: string;
  employeeId: string;
  employeeName: string;
  salaryMonth: string;
  salaryType: string;
  fixedSalaryBDT: number;
  fixedSalaryUSD: number;
  commissionBDT: number;
  commissionUSD: number;
  totalSalaryBDT: number;
  totalSalaryUSD: number;
  paidAmountBDT: number;
  paidAmountUSD: number;
  dueAmountBDT: number;
  dueAmountUSD: number;
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | string;
  paymentMethod: 'Cash' | 'Bank' | 'Mobile Banking' | 'Other' | string;
  paymentDate: string;
  paidBy: string;
  projectIds: string;
  notes: string;

  // Backward compatibility
  month?: string;
  currency?: 'BDT' | 'USD';
  status?: string;
  fixedSalary?: number;
  commission?: number;
  totalPaid?: number;
  amount?: number;
  netSalary?: number;
  totalSalary?: number;
  dueAmount?: number;
}

const EMPLOYEES_SALARY_PROFILES = [
  {
    id: 'EMP-000001',
    name: 'Tahsin Ahmed',
    role: 'Lead Software Architect',
    department: 'Engineering',
    email: 'tahsin@agencyerp.com',
    salaryType: 'Fixed + Commission',
    fixedSalaryBDT: 150000,
    fixedSalaryUSD: 0,
    commissionBDT: 25000,
    commissionUSD: 0
  },
  {
    id: 'EMP-000002',
    name: 'Emily Watson',
    role: 'UI/UX Designer',
    department: 'Design',
    email: 'emily@agencyerp.com',
    salaryType: 'Fixed + Commission',
    fixedSalaryBDT: 0,
    fixedSalaryUSD: 3500,
    commissionBDT: 0,
    commissionUSD: 500
  },
  {
    id: 'EMP-000003',
    name: 'Rafiqul Islam',
    role: 'Senior Backend Engineer',
    department: 'Engineering',
    email: 'rafiq@agencyerp.com',
    salaryType: 'Fixed Only',
    fixedSalaryBDT: 120000,
    fixedSalaryUSD: 0,
    commissionBDT: 0,
    commissionUSD: 0
  },
  {
    id: 'EMP-000004',
    name: 'Anika Tabassum',
    role: 'Digital Marketer',
    department: 'Marketing',
    email: 'anika@agencyerp.com',
    salaryType: 'Fixed + Commission',
    fixedSalaryBDT: 60000,
    fixedSalaryUSD: 0,
    commissionBDT: 11500,
    commissionUSD: 0
  },
  {
    id: 'EMP-000005',
    name: 'John Doe',
    role: 'Project Manager',
    department: 'Operations',
    email: 'john@agencyerp.com',
    salaryType: 'Fixed Only',
    fixedSalaryBDT: 0,
    fixedSalaryUSD: 4000,
    commissionBDT: 0,
    commissionUSD: 0
  }
];

export function get12HourDateTimeFormatted(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const strHours = String(hours).padStart(2, '0');
  return `${year}-${month}-${day} ${strHours}:${minutes}:${seconds} ${ampm}`;
}

export const SalariesPage: React.FC<{ globalSearch: string }> = ({ globalSearch }) => {
  return <EmployeePayrollCenter globalSearch={globalSearch} />;
};


// ==========================================
// 8. SETTINGS PAGE
// ==========================================

export const SettingsPage: React.FC = () => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // -----------------------------------------
  // SECTION 1: COMPANY INFORMATION STATE
  // -----------------------------------------
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('cfg_company_name') || '');
  const [companyEmail, setCompanyEmail] = useState(() => localStorage.getItem('cfg_company_email') || '');
  const [companyPhone, setCompanyPhone] = useState(() => localStorage.getItem('cfg_company_phone') || '');
  const [companyAddress, setCompanyAddress] = useState(() => localStorage.getItem('cfg_company_address') || '');
  const [companyLogo, setCompanyLogo] = useState(() => localStorage.getItem('cfg_company_logo') || '');
  const [errorsCompany, setErrorsCompany] = useState<{ name?: string; email?: string; phone?: string }>({});

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setToastType('error');
        setToastMsg('Logo image exceeds 1MB threshold limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
        setToastType('info');
        setToastMsg('Corporate logo imported successfully.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errorsCompany = {};
    if (!companyName.trim()) newErrors.name = 'Company Name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrorsCompany(newErrors);
      setToastType('error');
      setToastMsg('Please fix validation errors in Company Information before saving.');
      return;
    }

    setErrorsCompany({});
    localStorage.setItem('cfg_company_name', companyName);
    localStorage.setItem('cfg_company_email', companyEmail);
    localStorage.setItem('cfg_company_phone', companyPhone);
    localStorage.setItem('cfg_company_address', companyAddress);
    localStorage.setItem('cfg_company_logo', companyLogo);

    window.dispatchEvent(new Event('brandingUpdate'));

    setToastType('success');
    setToastMsg('Company profile information successfully saved.');
  };

  const handleResetCompany = () => {
    setCompanyName('');
    setCompanyEmail('');
    setCompanyPhone('');
    setCompanyAddress('');
    setCompanyLogo('');
    setErrorsCompany({});
    localStorage.removeItem('cfg_company_name');
    localStorage.removeItem('cfg_company_email');
    localStorage.removeItem('cfg_company_phone');
    localStorage.removeItem('cfg_company_address');
    localStorage.removeItem('cfg_company_logo');
    window.dispatchEvent(new Event('brandingUpdate'));
    setToastType('info');
    setToastMsg('Company profile reset.');
  };

  // -----------------------------------------
  // SECTION 2: VAT SETTINGS STATE
  // -----------------------------------------
  const [vatPercentage, setVatPercentage] = useState(() => localStorage.getItem('cfg_vat_percentage') || '15');
  const [errorsVat, setErrorsVat] = useState<{ vat?: string }>({});

  // -----------------------------------------
  // SECTION 2B: CURRENCY SETTINGS STATE
  // -----------------------------------------
  const [usdExchangeRate, setUsdExchangeRate] = useState(() => localStorage.getItem('cfg_usd_exchange_rate') || '120');
  const [errorsCurrency, setErrorsCurrency] = useState<{ exchangeRate?: string }>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await callGasApi('getSettings');
        if (res && res.success && res.data) {
          const rate = res.data.taxRate !== undefined ? res.data.taxRate : res.data.vatPercentage;
          if (rate !== undefined && rate !== null && rate !== '') {
            setVatPercentage(rate.toString());
            localStorage.setItem('cfg_vat_percentage', rate.toString());
          }
          const exRate = res.data.usdExchangeRate ?? res.data['USD Exchange Rate'];
          if (exRate !== undefined && exRate !== null && exRate !== '') {
            setUsdExchangeRate(exRate.toString());
            localStorage.setItem('cfg_usd_exchange_rate', exRate.toString());
            window.dispatchEvent(new Event('usdExchangeRateUpdate'));
          }
        }
      } catch (err) {
        console.error('Failed to load settings from backend:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSaveVat = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errorsVat = {};
    const rateVal = parseFloat(vatPercentage);
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
      newErrors.vat = 'VAT percentage must be a valid number between 0% and 100%';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrorsVat(newErrors);
      setToastType('error');
      setToastMsg('Please enter a valid VAT rate between 0 and 100.');
      return;
    }

    setErrorsVat({});
    localStorage.setItem('cfg_vat_percentage', vatPercentage);
    window.dispatchEvent(new Event('dashboardRefresh'));
    window.dispatchEvent(new Event('vatRateUpdate'));

    try {
      const res = await callGasApi('updateSettings', { taxRate: rateVal, vatPercentage: rateVal });
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`VAT rate settings updated to ${vatPercentage}% and saved to Google Sheets.`);
      } else {
        setToastType('success');
        setToastMsg(`VAT rate settings updated to ${vatPercentage}%.`);
      }
    } catch (err) {
      setToastType('success');
      setToastMsg(`VAT rate settings updated to ${vatPercentage}%.`);
    }
  };

  const handleResetVat = async () => {
    setVatPercentage('15');
    setErrorsVat({});
    localStorage.setItem('cfg_vat_percentage', '15');
    window.dispatchEvent(new Event('dashboardRefresh'));
    window.dispatchEvent(new Event('vatRateUpdate'));
    try {
      await callGasApi('updateSettings', { taxRate: 15, vatPercentage: 15 });
    } catch (e) {}
    setToastType('info');
    setToastMsg('VAT settings reset to standard rate (15%).');
  };

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errorsCurrency = {};
    const rateVal = parseFloat(usdExchangeRate);
    if (!usdExchangeRate || usdExchangeRate.trim() === '') {
      newErrors.exchangeRate = 'USD Exchange Rate is required';
    } else if (isNaN(rateVal) || rateVal <= 0) {
      newErrors.exchangeRate = 'USD Exchange Rate must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrorsCurrency(newErrors);
      setToastType('error');
      setToastMsg('Please enter a valid USD Exchange Rate greater than 0.');
      return;
    }

    setErrorsCurrency({});
    localStorage.setItem('cfg_usd_exchange_rate', usdExchangeRate);
    window.dispatchEvent(new Event('dashboardRefresh'));
    window.dispatchEvent(new Event('usdExchangeRateUpdate'));

    try {
      const res = await callGasApi('updateSettings', { usdExchangeRate: rateVal });
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`USD exchange rate updated to ${usdExchangeRate} and saved to Google Sheets.`);
      } else {
        setToastType('success');
        setToastMsg(`USD exchange rate updated to ${usdExchangeRate}.`);
      }
    } catch (err) {
      setToastType('success');
      setToastMsg(`USD exchange rate updated to ${usdExchangeRate}.`);
    }
  };

  const handleResetCurrency = async () => {
    setUsdExchangeRate('120');
    setErrorsCurrency({});
    localStorage.setItem('cfg_usd_exchange_rate', '120');
    window.dispatchEvent(new Event('dashboardRefresh'));
    window.dispatchEvent(new Event('usdExchangeRateUpdate'));
    try {
      await callGasApi('updateSettings', { usdExchangeRate: 120 });
    } catch (e) {}
    setToastType('info');
    setToastMsg('USD exchange rate reset to default (120).');
  };

  // -----------------------------------------
  // SECTION 3: SALARY EMAIL STATE
  // -----------------------------------------
  const [salaryEmailSubject, setSalaryEmailSubject] = useState(() => localStorage.getItem('cfg_salary_email_subject') || 'Monthly Pay Slip Clearance — {Month}');
  const [salaryEmailTemplate, setSalaryEmailTemplate] = useState(() => localStorage.getItem('cfg_salary_email_template') || 'Dear <b>{Employee Name}</b>,<br/><br/>We are pleased to inform you that your salary and commissions for the billing cycle of <b>{Month}</b> have been disbursed successfully.<br/><br/><b>Disbursed Details:</b><br/>• Voucher ID: <code>{Voucher ID}</code><br/>• Take-Home Amount: <b>{Salary Amount}</b><br/><br/>Thank you for your valuable contributions to our agency\'s milestones.<br/><br/>Best regards,<br/>Accounts Department,<br/><b>Apex Creative Agency</b>');
  const [errorsEmail, setErrorsEmail] = useState<{ subject?: string; template?: string }>({});

  const insertTag = (tag: string) => {
    const textarea = document.getElementById('email-template-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = salaryEmailTemplate.substring(0, start);
      const after = salaryEmailTemplate.substring(end, salaryEmailTemplate.length);
      const newText = before + tag + after;
      setSalaryEmailTemplate(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 5);
    } else {
      setSalaryEmailTemplate(prev => prev + tag);
    }
  };

  const insertFormat = (openTag: string, closeTag: string) => {
    const textarea = document.getElementById('email-template-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = salaryEmailTemplate.substring(start, end);
      const before = salaryEmailTemplate.substring(0, start);
      const after = salaryEmailTemplate.substring(end, salaryEmailTemplate.length);
      const newText = before + openTag + selected + closeTag + after;
      setSalaryEmailTemplate(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + openTag.length + selected.length + closeTag.length, start + openTag.length + selected.length + closeTag.length);
      }, 5);
    } else {
      setSalaryEmailTemplate(prev => prev + openTag + closeTag);
    }
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errorsEmail = {};
    if (!salaryEmailSubject.trim()) newErrors.subject = 'Email Subject is required';
    if (!salaryEmailTemplate.trim()) newErrors.template = 'Email Template content is required';

    if (Object.keys(newErrors).length > 0) {
      setErrorsEmail(newErrors);
      setToastType('error');
      setToastMsg('Please resolve template validation errors.');
      return;
    }

    setErrorsEmail({});
    localStorage.setItem('cfg_salary_email_subject', salaryEmailSubject);
    localStorage.setItem('cfg_salary_email_template', salaryEmailTemplate);
    setToastType('success');
    setToastMsg('Salary payslip email template configurations saved successfully.');
  };

  const handleResetEmail = () => {
    setSalaryEmailSubject('Monthly Pay Slip Clearance — {Month}');
    setSalaryEmailTemplate('Dear <b>{Employee Name}</b>,<br/><br/>We are pleased to inform you that your salary and commissions for the billing cycle of <b>{Month}</b> have been disbursed successfully.<br/><br/><b>Disbursed Details:</b><br/>• Voucher ID: <code>{Voucher ID}</code><br/>• Take-Home Amount: <b>{Salary Amount}</b><br/><br/>Thank you for your valuable contributions to our agency\'s milestones.<br/><br/>Best regards,<br/>Accounts Department,<br/><b>Apex Creative Agency</b>');
    setErrorsEmail({});
    setToastType('info');
    setToastMsg('Salary email subject and template reset to default formats.');
  };

  const parseTemplateForPreview = (htmlText: string) => {
    let parsed = htmlText;
    parsed = parsed.replace(/{Employee Name}/g, '<span class="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Emily Watson</span>');
    parsed = parsed.replace(/{Month}/g, '<span class="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">July 2026</span>');
    parsed = parsed.replace(/{Salary Amount}/g, '<span class="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">৳4,60,000 ($4,000)</span>');
    parsed = parsed.replace(/{Voucher ID}/g, '<span class="font-mono font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">PAY-002</span>');
    return parsed;
  };

  const parseSubjectForPreview = (subjectText: string) => {
    return subjectText.replace(/{Month}/g, 'July 2026');
  };

  // -----------------------------------------
  // SECTION 5: SYSTEM INFORMATION & GAS URL
  // -----------------------------------------
  const [gasUrlInput, setGasUrlInput] = useState(() => getGasWebAppUrl());

  const handleSaveGasUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setGasWebAppUrl(gasUrlInput);
    setToastType('success');
    setToastMsg('Google Apps Script Web App URL updated successfully.');
  };

  const [activeTab, setActiveTab] = useState<'general' | 'developer'>('general');

  const systemInfo = {
    appVersion: 'v3.5.2-prod',
    database: 'Google Sheets Core API (Active)',
    backend: 'Google Apps Script Gateway (Active Direct API)',
    lastUpdated: '2026-07-21 10:14:24 AM'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200" id="settings-module-root">
      
      {/* Title Header with Sub-Tab Navigation */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">System & Agency Preferences</h2>
          <p className="text-xs text-slate-500 mt-1">
            Adjust corporate configurations, custom tax and VAT metrics, salary notification mail slips, and developer environment variables.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white text-slate-900 shadow-3xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>General Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('developer')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'developer'
                ? 'bg-white text-[#2563EB] shadow-3xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Developer Settings</span>
            <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase bg-blue-50 text-blue-600 rounded font-extrabold border border-blue-200">
              ENV
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'developer' ? (
        <DeveloperSettings onSuccessToast={(msg) => { setToastType('success'); setToastMsg(msg); }} />
      ) : (
        /* Grid of separate settings cards */
        <div className="space-y-8 max-w-4xl">
        
        {/* =======================================
            SECTION 1: COMPANY INFORMATION
            ======================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Briefcase className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Company Information</h3>
                <p className="text-[10px] text-slate-400 font-medium">Define your primary corporate brand identity & contact details.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveCompany} className="p-6 space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput 
                id="cfg-comp-name"
                label="Company Name *" 
                placeholder="e.g. Agency ERP" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={errorsCompany.name}
                required
              />
              <FormInput 
                id="cfg-comp-email"
                label="Company Email" 
                type="email"
                placeholder="e.g. accounts@agency.com" 
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                error={errorsCompany.email}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput 
                id="cfg-comp-phone"
                label="Company Phone" 
                placeholder="e.g. +1 555-0199" 
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                error={errorsCompany.phone}
              />

              {/* Company Logo Upload Field */}
              <div className="flex flex-col gap-1.5 w-full">
                <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Company Logo *</span>
                <div className="flex items-center gap-4">
                  {/* Thumbnail circular display */}
                  <div className="h-12 w-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Corporate logo" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Upload className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  
                  {/* Upload Dropzone action bar */}
                  <div className="relative flex-1">
                    <input 
                      type="file" 
                      id="cfg-logo-file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                    />
                    <label 
                      htmlFor="cfg-logo-file"
                      className="w-full text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 h-11 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span>{companyLogo ? 'Change corporate logo image' : 'Upload logo image (Max 1MB)'}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <Textarea 
              id="cfg-comp-address"
              label="Company Address"
              placeholder="Enter corporate invoicing office address..."
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              rows={3}
            />

            {/* Save and Reset buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <SecondaryButton type="button" onClick={handleResetCompany}>
                Reset
              </SecondaryButton>
              <PrimaryButton type="submit">
                Save
              </PrimaryButton>
            </div>

          </form>
        </div>

        {/* =======================================
            SECTION 2: VAT SETTINGS
            ======================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Percent className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">VAT Settings</h3>
                <p className="text-[10px] text-slate-400 font-medium">Adjust default project taxation and VAT parameters.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveVat} className="p-6 space-y-5">
            
            <div className="max-w-md">
              <FormInput 
                id="cfg-vat-percent"
                label="VAT Percentage *" 
                type="number"
                step="0.01"
                placeholder="e.g. 15" 
                value={vatPercentage}
                onChange={(e) => setVatPercentage(e.target.value)}
                error={errorsVat.vat}
                required
                icon={<Percent className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* Information Card */}
            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex items-start gap-3">
              <Info className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">Automated Project Applying</span>
                <p className="text-xs text-purple-800 leading-normal">
                  This VAT percentage will be used automatically when creating a project. All invoices, project calculations, and dashboards will utilize this configured VAT multiplier value dynamically.
                </p>
              </div>
            </div>

            {/* Save and Reset buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <SecondaryButton type="button" onClick={handleResetVat}>
                Reset
              </SecondaryButton>
              <PrimaryButton type="submit">
                Save
              </PrimaryButton>
            </div>

          </form>
        </div>

        {/* =======================================
            SECTION 2B: CURRENCY SETTINGS
            ======================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Currency Settings</h3>
                <p className="text-[10px] text-slate-400 font-medium">Manage global USD exchange rate conversion standard.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveCurrency} className="p-6 space-y-5">
            
            <div className="max-w-md">
              <FormInput 
                id="cfg-usd-exchange-rate"
                label="USD Exchange Rate *" 
                type="number"
                step="any"
                placeholder="Enter current USD to BDT exchange rate" 
                value={usdExchangeRate}
                onChange={(e) => setUsdExchangeRate(e.target.value)}
                error={errorsCurrency.exchangeRate}
                required
                icon={<DollarSign className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* Information Card */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Global USD Exchange Rate</span>
                <p className="text-xs text-emerald-800 leading-normal">
                  Configures the baseline USD to BDT exchange rate stored across Google Sheets and system settings.
                </p>
              </div>
            </div>

            {/* Save and Reset buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <SecondaryButton type="button" onClick={handleResetCurrency}>
                Reset
              </SecondaryButton>
              <PrimaryButton type="submit">
                Save
              </PrimaryButton>
            </div>

          </form>
        </div>

        {/* =======================================
            SECTION 3: SALARY EMAIL
            ======================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Salary Email Slip Template</h3>
                <p className="text-[10px] text-slate-400 font-medium">Design automated payslip clearance emails with insertable dynamic fields.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveEmail} className="p-6 space-y-6">
            
            <FormInput 
              id="cfg-email-subject"
              label="Salary Email Subject *" 
              placeholder="e.g. Monthly Pay Slip Clearance — {Month}" 
              value={salaryEmailSubject}
              onChange={(e) => setSalaryEmailSubject(e.target.value)}
              error={errorsEmail.subject}
              required
            />

            {/* Editor Container */}
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Salary Email Template Content *</span>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-[#2563EB]/10 focus-within:border-[#2563EB] transition-all duration-150 bg-white">
                
                {/* Visual Editor Toolbar */}
                <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1.5 items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      type="button" 
                      onClick={() => insertFormat('<b>', '</b>')}
                      title="Bold"
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-800 rounded-lg shadow-3xs transition-all"
                    >
                      B
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertFormat('<i>', '</i>')}
                      title="Italic"
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-xs italic text-slate-800 rounded-lg shadow-3xs transition-all"
                    >
                      I
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertFormat('<code>', '</code>')}
                      title="Monospace"
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 text-xs font-mono text-slate-700 rounded-lg shadow-3xs transition-all"
                    >
                      &lt;/&gt;
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertFormat('<br/>', '')}
                      title="Line Break"
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-600 rounded-lg shadow-3xs transition-all"
                    >
                      ↵ Break
                    </button>
                  </div>

                  {/* Insert Tags helper chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Insert Fields:</span>
                    <button 
                      type="button" 
                      onClick={() => insertTag('{Employee Name}')}
                      className="text-[10px] font-bold px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 shadow-3xs transition-all"
                    >
                      + Employee Name
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertTag('{Month}')}
                      className="text-[10px] font-bold px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 shadow-3xs transition-all"
                    >
                      + Month
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertTag('{Salary Amount}')}
                      className="text-[10px] font-bold px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 shadow-3xs transition-all"
                    >
                      + Salary Amount
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertTag('{Voucher ID}')}
                      className="text-[10px] font-bold px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 shadow-3xs transition-all"
                    >
                      + Voucher ID
                    </button>
                  </div>
                </div>

                {/* Editor Textarea */}
                <textarea
                  id="email-template-textarea"
                  value={salaryEmailTemplate}
                  onChange={(e) => setSalaryEmailTemplate(e.target.value)}
                  className="w-full min-h-[160px] p-4 text-sm font-mono text-[#111827] focus:outline-none placeholder-slate-400 leading-relaxed resize-y bg-white"
                  placeholder="Type salary disbursement notification email template here. Use tags on the toolbar to insert dynamic values..."
                  required
                />
              </div>
              {errorsEmail.template && <p className="text-xs text-[#EF4444] mt-0.5">{errorsEmail.template}</p>}
            </div>

            {/* Email live preview panel */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Live Email envelope preview</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-3xs">
                
                {/* Envelope details bar */}
                <div className="bg-white border-b border-slate-200 p-4.5 space-y-2">
                  <div className="flex items-center text-xs">
                    <span className="w-16 font-bold text-slate-400 uppercase">From:</span>
                    <span className="text-slate-700 font-semibold">{companyEmail || 'accounts@apexcreative.agency'}</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <span className="w-16 font-bold text-slate-400 uppercase">To:</span>
                    <span className="text-indigo-600 font-bold bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50">emily@agencyerp.com (Employee Email)</span>
                  </div>
                  <div className="flex items-center text-xs border-t border-slate-100 pt-2">
                    <span className="w-16 font-bold text-slate-400 uppercase">Subject:</span>
                    <span className="text-slate-800 font-bold">{parseSubjectForPreview(salaryEmailSubject) || '—'}</span>
                  </div>
                </div>

                {/* Simulated Parsed HTML content */}
                <div className="p-6 bg-white min-h-[180px] border-t border-slate-100">
                  <div 
                    className="text-sm text-slate-700 leading-relaxed max-w-none space-y-2 prose"
                    dangerouslySetInnerHTML={{ __html: parseTemplateForPreview(salaryEmailTemplate) }}
                  />
                </div>

                {/* Preview disclaimer footer */}
                <div className="px-4.5 py-2.5 bg-slate-50/70 border-t border-slate-100 text-[10px] text-slate-400 font-semibold italic flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>The live preview replacements simulate data values from the employee pay slips dynamically.</span>
                </div>

              </div>
            </div>

            {/* Save and Reset buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <SecondaryButton type="button" onClick={handleResetEmail}>
                Reset
              </SecondaryButton>
              <PrimaryButton type="submit">
                Save
              </PrimaryButton>
            </div>

          </form>
        </div>

        {/* =======================================
            SECTION 5: SYSTEM INFORMATION
            ======================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">System Information</h3>
                <p className="text-[10px] text-slate-400 font-medium">Read-only structural profiles, database, and middleware links.</p>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50">
            
            {/* Card: App Version */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">App Version</span>
              <span className="text-xs font-bold text-slate-800 block">{systemInfo.appVersion}</span>
              <span className="inline-flex items-center gap-1.5 text-[9px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded-full">
                <span className="h-1 w-1 bg-emerald-500 rounded-full" />
                Live Stable
              </span>
            </div>

            {/* Card: Database */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Database Storage</span>
              <span className="text-xs font-bold text-slate-800 block truncate" title={systemInfo.database}>Google Sheets</span>
              <span className="inline-flex items-center gap-1.5 text-[9px] text-amber-600 bg-amber-50 font-bold px-2 py-0.5 rounded-full">
                <span className="h-1 w-1 bg-amber-400 rounded-full" />
                Sandbox Offline
              </span>
            </div>

            {/* Card: Backend */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Backend Endpoint</span>
              <span className="text-xs font-bold text-slate-800 block truncate" title={systemInfo.backend}>Google Apps Script</span>
              <span className="inline-flex items-center gap-1.5 text-[9px] text-amber-600 bg-amber-50 font-bold px-2 py-0.5 rounded-full">
                <span className="h-1 w-1 bg-amber-400 rounded-full" />
                Simulated Ingress
              </span>
            </div>

            {/* Card: Last Updated */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Build Updated</span>
              <span className="text-xs font-bold text-slate-800 block font-mono text-[11px] leading-tight" title={systemInfo.lastUpdated}>
                2026-07-21 10:14
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] text-blue-600 bg-blue-50 font-bold px-2 py-0.5 rounded-full">
                <span className="h-1 w-1 bg-blue-500 rounded-full animate-pulse" />
                Up-to-date
              </span>
            </div>

          </div>
        </div>

      </div>
      )}

      {/* Success / Notification Toasts */}
      {toastMsg && (
        <SuccessToast 
          message={toastMsg} 
          type={toastType} 
          onClose={() => setToastMsg(null)} 
        />
      )}

    </div>
  );
};


// ==========================================
// 9. ACTIVITY LOG PAGE
// ==========================================

interface ExtendedActivity {
  id: string;
  date: string;
  time: string;
  user: string;
  module: 'Clients' | 'Employees' | 'Projects' | 'Salaries' | 'Income' | 'Expenses' | 'System';
  action: 'Add' | 'Edit' | 'Delete' | 'Login' | 'Logout' | 'Salary Payment';
  recordId: string;
  description: string;
  details: string;
  ipAddress: string;
  device: string;
  oldValue: string;
  newValue: string;
  type: 'success' | 'info' | 'warning' | 'danger';
}

export const ActivityLogPage: React.FC<{ globalSearch: string }> = ({ globalSearch }) => {
  const [logs, setLogs] = useState<ExtendedActivity[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [usernameFilter, setUsernameFilter] = useState('all');
  const [sortField, setSortField] = useState<'datetime' | 'username' | 'module' | 'action'>('datetime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ExtendedActivity | null>(null);

  const fetchActivityLogs = async () => {
    try {
      const res = await callGasApi('getActivityLogs');
      if (res && res.success && Array.isArray(res.data)) {
        setLogs(res.data.map((log: any, index: number) => {
          return {
            id: log.id || `LOG-${index + 1}`,
            user: log.user || log.username || 'System',
            action: log.action || 'Activity',
            module: log.module || 'System',
            date: formatSheetDate(log.date),
            time: formatSheetTime(log.time),
            recordId: log.recordId || 'N/A',
            description: log.description || log.details || '',
            details: log.details || '',
            ipAddress: log.ipAddress || '127.0.0.1',
            device: log.device || 'Web Browser',
            oldValue: log.oldValue || '',
            newValue: log.newValue || '',
            type: (log.type || 'info').toLowerCase()
          };
        }));
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const query = search || globalSearch;

  // Extract unique usernames for filter dropdown dynamically
  const uniqueUsernames = Array.from(new Set(logs.map(log => log.user)));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchActivityLogs();
    setSearch('');
    setStartDate('');
    setEndDate('');
    setModuleFilter('all');
    setActionFilter('all');
    setUsernameFilter('all');
    setSortField('datetime');
    setSortOrder('desc');
    setCurrentPage(1);
    setIsRefreshing(false);
    setToastMsg('Audit ledger synced dynamically from Google Apps Script backend.');
  };

  const toggleSort = (field: 'datetime' | 'username' | 'module' | 'action') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // 1. FILTERING
  const filteredLogs = logs.filter(log => {
    // Global query matches searchable string fields
    const matchesSearch = !query.trim() || [
      log.user,
      log.action,
      log.module,
      log.description,
      log.details,
      log.recordId,
      log.ipAddress,
      log.device
    ].some(val => val.toLowerCase().includes(query.toLowerCase()));

    // Date Range checks
    const matchesStartDate = !startDate || log.date >= startDate;
    const matchesEndDate = !endDate || log.date <= endDate;

    // Direct Exact select filters
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesUsername = usernameFilter === 'all' || log.user === usernameFilter;

    return matchesSearch && matchesStartDate && matchesEndDate && matchesModule && matchesAction && matchesUsername;
  });

  // 2. SORTING
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let comparison = 0;

    if (sortField === 'datetime') {
      const dateComp = (a.date || '').localeCompare(b.date || '');
      if (dateComp !== 0) {
        comparison = dateComp;
      } else {
        comparison = (a.time || '').localeCompare(b.time || '');
      }
    } else if (sortField === 'username') {
      comparison = a.user.localeCompare(b.user);
    } else if (sortField === 'module') {
      comparison = a.module.localeCompare(b.module);
    } else if (sortField === 'action') {
      comparison = a.action.localeCompare(b.action);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // 3. PAGINATION MATH
  const totalFiltered = sortedLogs.length;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + itemsPerPage);

  // Statistics calculated from total logs array (computed dynamically)
  const todayStr = logs[0]?.date || '';
  const statsTotal = logs.length;
  const statsToday = logs.filter(l => l.date === todayStr).length;
  const statsLogin = logs.filter(l => l.action === 'Login').length;
  const statsEdit = logs.filter(l => l.action === 'Edit' || l.action === 'Update').length;
  const statsDelete = logs.filter(l => l.action === 'Delete').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="activity-log-root">
      
      {/* Title Header */}
      <div className="border-b border-slate-100 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Operation Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Chronological system logging ledger tracking platform security, database modifications, and administrative sessions.
          </p>
        </div>
        
        {/* Info label banner */}
        <div className="bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-3.5 py-1.5 text-[11px] font-semibold flex items-center gap-2 self-start md:self-center">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span>Real-time Secure Ingress Active</span>
        </div>
      </div>

      {/* =========================================
          STATISTICS CARDS (Top of Page)
          ========================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Logs</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">{statsTotal}</span>
            <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-150">All Time</span>
          </div>
        </div>

        {/* Today's Activities */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Activities</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">{statsToday}</span>
            <span className="text-[9px] text-emerald-700 font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100">Active</span>
          </div>
        </div>

        {/* Login Count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Login Sessions</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">{statsLogin}</span>
            <span className="text-[9px] text-indigo-700 font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100">Auth</span>
          </div>
        </div>

        {/* Edit Count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modified Records</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">{statsEdit}</span>
            <span className="text-[9px] text-amber-700 font-bold px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100">Updates</span>
          </div>
        </div>

        {/* Delete Count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deleted Profiles</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">{statsDelete}</span>
            <span className="text-[9px] text-red-700 font-bold px-1.5 py-0.5 rounded-md bg-red-50 border border-red-100">Purges</span>
          </div>
        </div>

      </div>

      {/* =========================================
          TOP TOOLBAR (Search & Filters)
          ========================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          {/* Global Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Global Search user, action, description, record ID..."
              className="w-full h-10.5 pl-10 pr-4 bg-slate-50 hover:bg-slate-50/70 focus:bg-white text-xs text-slate-800 font-medium placeholder-slate-400 border border-slate-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 rounded-xl transition-all outline-none"
            />
            {query && (
              <button 
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-semibold text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Date Range Fields */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">From</span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="h-10 border border-slate-200 bg-slate-50 rounded-xl px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">To</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="h-10 border border-slate-200 bg-slate-50 rounded-xl px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all cursor-pointer"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-2.5 rounded-xl transition-all"
              >
                Reset Dates
              </button>
            )}
          </div>

        </div>

        {/* Select Dropdown row + Refresh Action */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          
          {/* Module Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Module</span>
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 border border-slate-200 bg-slate-50 hover:border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563EB] transition-all cursor-pointer"
            >
              <option value="all">All Modules</option>
              <option value="Clients">Clients</option>
              <option value="Employees">Employees</option>
              <option value="Projects">Projects</option>
              <option value="Salaries">Salaries</option>
              <option value="Income">Income</option>
              <option value="Expenses">Expenses</option>
              <option value="System">System</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Action</span>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 border border-slate-200 bg-slate-50 hover:border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563EB] transition-all cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="Add">Add</option>
              <option value="Edit">Edit</option>
              <option value="Delete">Delete</option>
              <option value="Login">Login</option>
              <option value="Logout">Logout</option>
              <option value="Salary Payment">Salary Payment</option>
            </select>
          </div>

          {/* Username Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Username</span>
            <select
              value={usernameFilter}
              onChange={(e) => { setUsernameFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 border border-slate-200 bg-slate-50 hover:border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563EB] transition-all cursor-pointer"
            >
              <option value="all">All Users</option>
              {uniqueUsernames.map(usr => (
                <option key={usr} value={usr}>{usr}</option>
              ))}
            </select>
          </div>

          {/* Sync / Refresh Button */}
          <div className="flex flex-col justify-end h-full pt-5 md:pt-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 w-full text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-98"
            >
              <RotateCcw className={`h-4 w-4 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Synchronizing...' : 'Refresh Logs'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* =========================================
          ACTIVITY LOG TABLE
          ========================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
        
        {/* Responsive horizontal overflow container */}
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full text-left border-collapse relative">
            
            {/* Sticky Header */}
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 shadow-3xs">
              <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-4.5 px-5 select-none hover:text-slate-700 cursor-pointer transition-colors" onClick={() => toggleSort('datetime')}>
                  <div className="flex items-center gap-1.5">
                    <span>Date & Time</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'datetime' ? 'text-[#2563EB]' : 'text-slate-300'}`} />
                  </div>
                </th>
                <th className="py-4.5 px-4 select-none hover:text-slate-700 cursor-pointer transition-colors" onClick={() => toggleSort('username')}>
                  <div className="flex items-center gap-1.5">
                    <span>Username</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'username' ? 'text-[#2563EB]' : 'text-slate-300'}`} />
                  </div>
                </th>
                <th className="py-4.5 px-4 select-none hover:text-slate-700 cursor-pointer transition-colors" onClick={() => toggleSort('module')}>
                  <div className="flex items-center gap-1.5">
                    <span>Module</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'module' ? 'text-[#2563EB]' : 'text-slate-300'}`} />
                  </div>
                </th>
                <th className="py-4.5 px-4 select-none hover:text-slate-700 cursor-pointer transition-colors" onClick={() => toggleSort('action')}>
                  <div className="flex items-center gap-1.5">
                    <span>Action</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortField === 'action' ? 'text-[#2563EB]' : 'text-slate-300'}`} />
                  </div>
                </th>
                <th className="py-4.5 px-4">Record ID</th>
                <th className="py-4.5 px-4">Description</th>
                <th className="py-4.5 px-4">IP Address</th>
                <th className="py-4.5 px-4">Device</th>
                <th className="py-4.5 px-5 text-right">Details</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 transition-colors group">
                    
                    {/* Date & Time */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{log.date}</span>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-300" />
                          {log.time}
                        </span>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-700" title={log.user}>
                          {log.user.length > 18 ? log.user.substring(0, 16) + '...' : log.user}
                        </span>
                      </div>
                    </td>

                    {/* Module Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 inline-block uppercase tracking-wide">
                        {log.module}
                      </span>
                    </td>

                    {/* Action Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border inline-block uppercase tracking-wide ${
                        log.action === 'Add' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                        log.action === 'Edit' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                        log.action === 'Delete' ? 'bg-red-50 text-red-800 border-red-100' :
                        log.action === 'Login' ? 'bg-indigo-50 text-indigo-800 border-indigo-100' :
                        log.action === 'Logout' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                        'bg-purple-50 text-purple-800 border-purple-100' // Salary Payment
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Record ID */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {log.recordId !== 'N/A' ? (
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100/60 px-2 py-1 rounded-md border border-slate-200">
                          {log.recordId}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-4 px-4 min-w-[200px] max-w-[320px]">
                      <p className="text-xs text-slate-600 font-semibold leading-normal truncate" title={log.description}>
                        {log.description}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {log.details}
                      </p>
                    </td>

                    {/* IP Address */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-xs font-mono font-semibold text-slate-600 flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {log.ipAddress}
                      </span>
                    </td>

                    {/* Device */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5 max-w-[150px] truncate" title={log.device}>
                        <Laptop className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {log.device}
                      </span>
                    </td>

                    {/* Action View */}
                    <td className="py-4 px-5 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg inline-flex items-center gap-1.5 transition-all active:scale-97 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-400" />
                        <span>View</span>
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 px-5 text-center">
                    <EmptyState 
                      title="No matching logs found" 
                      description="Adjust your search query, dates, or selection filters to find operations." 
                      icon={<History className="h-12 w-12 text-slate-300" />}
                    />
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* =========================================
            PAGINATION CONTROLS
            ========================================= */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Entries display select dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              className="h-8 border border-slate-200 bg-white rounded-lg px-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value={5}>5 entries</option>
              <option value={10}>10 entries</option>
              <option value={25}>25 entries</option>
              <option value={50}>50 entries</option>
            </select>
            <span className="text-xs font-semibold text-slate-500">
              of {totalFiltered} filtered logs (Total {statsTotal})
            </span>
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </div>

      </div>

      {/* =========================================
          VIEW LOG READ-ONLY MODAL
          ========================================= */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl text-white ${
                  selectedLog.type === 'success' ? 'bg-emerald-600' :
                  selectedLog.type === 'info' ? 'bg-blue-600' :
                  selectedLog.type === 'warning' ? 'bg-amber-600' : 'bg-red-600'
                }`}>
                  <History className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Detailed Security Audit Log</h3>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Entry ID: {selectedLog.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              
              {/* Row 1: User Information & Activity Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Panel: User Information */}
                <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">User Information</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Authorized ID:</span>
                      <span className="text-slate-800 font-bold">{selectedLog.user}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">IP Address:</span>
                      <span className="text-slate-800 font-mono font-bold">{selectedLog.ipAddress}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Device Platform:</span>
                      <span className="text-slate-800 font-bold truncate max-w-[160px]" title={selectedLog.device}>{selectedLog.device}</span>
                    </div>
                  </div>
                </div>

                {/* Panel: Activity Information */}
                <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Activity Context</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Date & Time:</span>
                      <span className="text-slate-800 font-bold">{selectedLog.date} @ {selectedLog.time}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Security Level:</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase border ${
                        selectedLog.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                        selectedLog.type === 'info' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                        selectedLog.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-red-50 text-red-800 border-red-100'
                      }`}>
                        {selectedLog.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Record Link:</span>
                      <span className="text-slate-800 font-mono font-bold">{selectedLog.recordId}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Panel: Descriptive text */}
              <div className="p-4 bg-slate-50/70 border border-slate-150 rounded-xl space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Description & Summary</span>
                <p className="text-xs font-bold text-slate-800 leading-normal">{selectedLog.description}</p>
                <p className="text-xs text-slate-500 leading-normal">{selectedLog.details}</p>
              </div>

              {/* Old vs New Value comparison box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Old value panel */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Old Value State</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 min-h-[100px] overflow-auto">
                    <pre className="text-[11px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap">
                      {selectedLog.oldValue}
                    </pre>
                  </div>
                </div>

                {/* New value panel */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">New Value State</span>
                  <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3.5 min-h-[100px] overflow-auto">
                    <pre className="text-[11px] font-mono text-emerald-950 leading-relaxed whitespace-pre-wrap">
                      {selectedLog.newValue}
                    </pre>
                  </div>
                </div>

              </div>

              {/* Section: System Information */}
              <div className="p-4 border border-slate-150 rounded-xl space-y-3 bg-slate-50/30">
                <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
                  <Server className="h-4 w-4 text-slate-400" />
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">System Information (Telemetry)</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-[11px] font-semibold text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Log Ingestion ID:</span>
                    <span className="font-mono text-slate-700">{selectedLog.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">IP Address:</span>
                    <span className="font-mono text-slate-700">{selectedLog.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Device:</span>
                    <span className="text-slate-700 truncate block max-w-[200px]" title={selectedLog.device}>
                      {selectedLog.device}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Environment Host:</span>
                    <span className="text-slate-700">CloudRun-Server-Main</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Active Backing Node:</span>
                    <span className="text-slate-700">GCP-AsiaSoutheast-1a</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">User-Agent Platform:</span>
                    <span className="text-slate-700 truncate block max-w-[200px]" title={selectedLog.device}>
                      {selectedLog.device}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="h-10 px-5 text-xs font-bold bg-[#111827] text-white hover:bg-slate-800 rounded-xl flex items-center justify-center transition-colors shadow-xs"
              >
                Close Audit Entry
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Success Notification Toast */}
      {toastMsg && (
        <SuccessToast 
          message={toastMsg} 
          type="success" 
          onClose={() => setToastMsg(null)} 
        />
      )}

    </div>
  );
};

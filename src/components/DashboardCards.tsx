/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Percent, 
  Users, 
  Contact, 
  FolderKanban, 
  DollarSign,
  PlayCircle,
  CheckCircle,
  Wallet,
  XCircle
} from 'lucide-react';
import { callGasApi } from '../api';
import { calculateDashboardFinance, DashboardFinanceResult } from '../utils/dashboardFinance';

// Format numbers nicely
const formatCurrency = (amount: number, currency: 'BDT' | 'USD' = 'BDT') => {
  const safeNum = (amount === undefined || amount === null || isNaN(Number(amount))) ? 0 : Number(amount);
  if (currency === 'BDT') {
    return `৳${safeNum.toLocaleString('en-IN')}`;
  }
  return `$${safeNum.toLocaleString('en-US')}`;
};

interface MetricCardProps {
  title: string;
  value: string;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  trend,
  icon,
  iconBg,
  iconColor,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-34">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</span>
          <span className="text-xl font-bold text-slate-900 tracking-tight">{value}</span>
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-xs ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2">
        {subtext ? (
          <span className="text-xs text-slate-400 font-medium">{subtext}</span>
        ) : <div />}
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
            trend.isPositive ? 'bg-emerald-50 text-[#22C55E]' : 'bg-red-50 text-[#EF4444]'
          }`}>
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};

export const DashboardCards: React.FC = () => {
  const [finMetrics, setFinMetrics] = useState<DashboardFinanceResult>({
    vatRatePercent: 0,
    usdExchangeRate: 120,
    incomeBDT: 0,
    vatBDT: 0,
    projectPaymentBDT: 0,
    commissionBDT: 0,
    expenseBDT: 0,
    employeeAdjustmentsBDT: 0,
    profitBDT: 0,
    totalClients: 0,
    totalEmployees: 0,
    totalProjects: 0,
    runningProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
    cancelledProjects: 0
  });

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const [expRes, cliRes, empRes, prjRes, salRes, setRes, incRes] = await Promise.all([
          callGasApi('getExpenses').catch(() => null),
          callGasApi('getClients').catch(() => null),
          callGasApi('getEmployees').catch(() => null),
          callGasApi('getProjects').catch(() => null),
          callGasApi('getSalaryPayments').catch(() => null),
          callGasApi('getSettings').catch(() => null),
          callGasApi('getIncomes').catch(() => null)
        ]);

        if (!isMounted) return;

        let vatRate: number | undefined = undefined;
        let usdExchangeRate: number | undefined = undefined;

        if (setRes && setRes.success && setRes.data) {
          const s = setRes.data;
          const rate = s['VAT (%)'] ?? s.vatPercent ?? s.taxRate ?? s.vatPercentage;
          if (rate !== undefined && rate !== null && rate !== '' && !isNaN(Number(rate))) {
            vatRate = Number(rate);
            localStorage.setItem('cfg_vat_percentage', rate.toString());
          }
          const exRate = s['USD Exchange Rate'] ?? s.usdExchangeRate ?? s.usdRate;
          if (exRate !== undefined && exRate !== null && exRate !== '' && !isNaN(Number(exRate))) {
            usdExchangeRate = Number(exRate);
            localStorage.setItem('cfg_usd_exchange_rate', exRate.toString());
          }
        }

        const expenses = (expRes && expRes.success && Array.isArray(expRes.data)) ? expRes.data : [];
        const clients = (cliRes && cliRes.success && Array.isArray(cliRes.data)) ? cliRes.data : [];
        const employees = (empRes && empRes.success && Array.isArray(empRes.data)) ? empRes.data : [];
        const projects = (prjRes && prjRes.success && Array.isArray(prjRes.data)) ? prjRes.data : [];
        const salaryPayments = (salRes && salRes.success && Array.isArray(salRes.data)) ? salRes.data : [];
        const incomes = (incRes && incRes.success && Array.isArray(incRes.data)) ? incRes.data : [];

        // SINGLE SHARED UTILITY FUNCTION FOR ALL DASHBOARD FINANCE CALCULATIONS
        const results = calculateDashboardFinance({
          projects,
          salaryPayments,
          expenses,
          incomes,
          clients,
          employees,
          vatRate,
          usdExchangeRate
        });

        setFinMetrics(results);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      }
    };

    fetchDashboardData();

    const handleRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener('dashboardRefresh', handleRefresh);
    window.addEventListener('vatRateUpdate', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    const interval = setInterval(fetchDashboardData, 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('dashboardRefresh', handleRefresh);
      window.removeEventListener('vatRateUpdate', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  const cards = [
    {
      title: 'Income',
      value: formatCurrency(finMetrics.incomeBDT, 'BDT'),
      subtext: 'Completed projects + manual income (BDT)',
      icon: <ArrowUpRight className="h-5 w-5" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-[#22C55E]',
    },
    {
      title: 'VAT',
      value: formatCurrency(finMetrics.vatBDT, 'BDT'),
      subtext: `Completed projects VAT (${finMetrics.vatRatePercent}%)`,
      icon: <span className="text-xs font-black font-mono">{finMetrics.vatRatePercent}%</span>,
      iconBg: 'bg-amber-50',
      iconColor: 'text-[#F59E0B]',
    },
    {
      title: 'Project Payment',
      value: formatCurrency(finMetrics.projectPaymentBDT || finMetrics.commissionBDT, 'BDT'),
      subtext: 'Total project employee payments (BDT)',
      icon: <DollarSign className="h-5 w-5" />,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Expense',
      value: formatCurrency(finMetrics.expenseBDT, 'BDT'),
      subtext: 'Total operating expenses (BDT)',
      icon: <ArrowDownLeft className="h-5 w-5" />,
      iconBg: 'bg-red-50',
      iconColor: 'text-[#EF4444]',
    },
    {
      title: 'Profit',
      value: formatCurrency(finMetrics.profitBDT, 'BDT'),
      subtext: 'Income - VAT - Project Payment - Expense - Employee Adjustments',
      icon: <TrendingUp className="h-5 w-5" />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-[#2563EB]',
    },
    {
      title: 'Total Clients',
      value: finMetrics.totalClients.toString(),
      subtext: 'Registered clients',
      icon: <Users className="h-5 w-5" />,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-600',
    },
    {
      title: 'Total Employees',
      value: finMetrics.totalEmployees.toString(),
      subtext: 'Active staff headcount',
      icon: <Contact className="h-5 w-5" />,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-600',
    },
    {
      title: 'Total Projects',
      value: finMetrics.totalProjects.toString(),
      subtext: 'All non-deleted projects',
      icon: <FolderKanban className="h-5 w-5" />,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-600',
    },
    {
      title: 'Running Projects',
      value: finMetrics.runningProjects.toString(),
      subtext: 'Status == Running',
      icon: <PlayCircle className="h-5 w-5" />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-[#2563EB]',
    },
    {
      title: 'Completed Projects',
      value: finMetrics.completedProjects.toString(),
      subtext: 'Status == Completed',
      icon: <CheckCircle className="h-5 w-5" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-[#22C55E]',
    },
    {
      title: 'Cancel Project',
      value: finMetrics.cancelledProjects.toString(),
      subtext: 'Status == Cancelled',
      icon: <XCircle className="h-5 w-5" />,
      iconBg: 'bg-red-50',
      iconColor: 'text-[#EF4444]',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((m, i) => (
        <MetricCard key={i} {...m} />
      ))}
    </div>
  );
};



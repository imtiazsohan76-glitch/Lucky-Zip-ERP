/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseEmployeePaymentDetails } from './payroll';

export interface CalculateDashboardFinanceParams {
  projects: any[];
  salaryPayments: any[];
  expenses: any[];
  incomes?: any[];
  clients?: any[];
  employees?: any[];
  vatRate?: number | string;
  usdExchangeRate?: number | string;
}

export interface DashboardFinanceResult {
  vatRatePercent: number;
  usdExchangeRate: number;
  incomeBDT: number;
  vatBDT: number;
  projectPaymentBDT: number;
  commissionBDT: number; // Aliased for compatibility
  expenseBDT: number;
  employeeAdjustmentsBDT: number;
  profitBDT: number;
  totalClients: number;
  totalEmployees: number;
  totalProjects: number;
  runningProjects: number;
  completedProjects: number;
  pendingProjects: number;
  cancelledProjects: number;
}

/**
 * Single source of truth for Dashboard financial metrics calculation.
 * 
 * Rules:
 * 1. Display currency is BDT ONLY.
 * 2. Every total is calculated as: BDT Amount + (USD Amount * USD Exchange Rate).
 * 3. Income = Completed Projects Income + Paid/Completed Manual Income entries.
 * 4. VAT = Project Income * VAT%. (Manual Income does NOT generate VAT).
 * 5. Project Payment = STRICTLY SUM of Employee Payments assigned in Projects (non-deleted, non-cancelled).
 * 6. Expense = SUM(Paid Expenses).
 * 7. Employee Adjustments = SUM(Employee Account Adjustments).
 * 8. Profit = Income - VAT - Project Payment - Expense - Employee Adjustments.
 */
export function calculateDashboardFinance(params: CalculateDashboardFinanceParams): DashboardFinanceResult {
  const {
    projects = [],
    salaryPayments = [],
    expenses = [],
    incomes = [],
    clients = [],
    employees = [],
    vatRate,
    usdExchangeRate
  } = params;

  // 1. Read VAT %
  let vatRatePercent = 0;
  if (vatRate !== undefined && vatRate !== null && vatRate !== '' && !isNaN(Number(vatRate))) {
    vatRatePercent = Number(vatRate);
  } else {
    const stored = localStorage.getItem('cfg_vat_percentage');
    if (stored !== null && stored !== undefined && stored.trim() !== '' && !isNaN(Number(stored))) {
      vatRatePercent = Number(stored.trim());
    }
  }

  // 2. Read USD Exchange Rate
  let exchangeRate = 120; // default fallback
  if (usdExchangeRate !== undefined && usdExchangeRate !== null && usdExchangeRate !== '' && !isNaN(Number(usdExchangeRate)) && Number(usdExchangeRate) > 0) {
    exchangeRate = Number(usdExchangeRate);
  } else {
    const storedRate = localStorage.getItem('cfg_usd_exchange_rate');
    if (storedRate !== null && storedRate !== undefined && storedRate.trim() !== '' && !isNaN(Number(storedRate)) && Number(storedRate) > 0) {
      exchangeRate = Number(storedRate.trim());
    }
  }

  // 3. Project Income, VAT & Project Payment
  let projectIncomeBDT = 0;
  let vatBDT = 0;
  let projectPaymentFromProjectsBDT = 0;
  let totalProjects = 0;
  let runningProjects = 0;
  let completedProjects = 0;
  let pendingProjects = 0;
  let cancelledProjects = 0;

  (projects || []).forEach((p: any) => {
    const status = (p.status || '').toString().trim().toLowerCase();
    if (status === 'deleted') return;

    totalProjects++;

    if (status === 'cancelled' || status === 'canceled') {
      cancelledProjects++;
      // Cancelled projects do not contribute to revenue, VAT, or employee payment
      return;
    } else if (status === 'pending') {
      pendingProjects++;
    } else if (status === 'running' || status === 'in-progress' || status === 'planning') {
      runningProjects++;
    } else if (status === 'completed') {
      completedProjects++;

      const currency = (p.currency || 'BDT').toString().trim().toUpperCase();
      const amount = Number(p.amount ?? p.budget ?? p.priceBDT ?? p.priceUSD ?? 0);
      const isUsd = currency === 'USD' || Number(p.priceUSD) > 0;

      const amtInBdt = isUsd ? amount * exchangeRate : amount;
      projectIncomeBDT += amtInBdt;

      // VAT Amount (Project VAT)
      let projVat = Number(p.vatAmount || 0);
      if (projVat <= 0 && vatRatePercent > 0) {
        projVat = Number((amount * (vatRatePercent / 100)).toFixed(2));
      }
      const vatInBdt = isUsd ? projVat * exchangeRate : projVat;
      vatBDT += vatInBdt;
    }

    // PROJECT PAYMENT: Strictly SUM of Employee Payments assigned/written in Projects
    let totalEmpPay = Number(p.totalEmployeePayment);
    if (isNaN(totalEmpPay) || totalEmpPay <= 0) {
      const detailsStr = p.employeePaymentDetails || p.employeePaymentsDetails || p.employeePayments || '';
      if (detailsStr) {
        const map = parseEmployeePaymentDetails(detailsStr);
        totalEmpPay = Object.values(map).reduce((a, b) => a + Number(b || 0), 0);
      }
    }
    if (!isNaN(totalEmpPay) && totalEmpPay > 0) {
      projectPaymentFromProjectsBDT += totalEmpPay;
    }
  });

  // 4. Manual Income from Income module (ONLY PAID/COMPLETED)
  let manualIncomeBDT = 0;

  (incomes || []).forEach((inc: any) => {
    const status = (inc.status || '').toString().trim().toLowerCase();
    // Only count paid / completed / received / settled income entries
    const isPaid = status === 'paid' || status === 'completed' || status === 'received' || status === 'settled';
    if (!isPaid) return;

    const currency = (inc.currency || 'BDT').toString().trim().toUpperCase();
    const amount = Number(inc.amount ?? inc.amountBDT ?? inc.amountUSD ?? 0);
    const isUsd = currency === 'USD' || Number(inc.amountUSD) > 0;

    const amtInBdt = isUsd ? amount * exchangeRate : amount;
    manualIncomeBDT += amtInBdt;
  });

  // Total Income
  const incomeBDT = projectIncomeBDT + manualIncomeBDT;

  // 5. Employee Account Adjustments from SalaryPayments (if any)
  let employeeAdjustmentsBDT = 0;

  (salaryPayments || []).forEach((sal: any) => {
    const status = (sal.status || sal.paymentStatus || '').toString().trim().toLowerCase();
    if (status === 'deleted' || status === 'pending' || status === 'cancelled' || status === 'canceled') return;

    const method = (sal.paymentMethod || '').toString().toLowerCase();
    const salId = (sal.salaryId || sal.paymentId || sal.id || '').toString().toUpperCase();

    if (method === 'adjustment' || salId.indexOf('ADJ-') === 0) {
      employeeAdjustmentsBDT += Number(sal.amount ?? 0);
    }
  });

  // Project Payment = Strictly the sum of employee payments set in Projects (nothing added from salary payments, nothing subtracted)
  const projectPaymentBDT = projectPaymentFromProjectsBDT;

  // 6. Expenses (ONLY PAID / COMPLETED)
  let expenseBDT = 0;

  (expenses || []).forEach((e: any) => {
    const status = (e.status || '').toString().trim().toLowerCase();
    // Ignore deleted, pending, unpaid, due, or cancelled expenses
    if (status === 'deleted' || status === 'pending' || status === 'unpaid' || status === 'due' || status === 'cancelled' || status === 'canceled') return;

    const currency = (e.currency || 'BDT').toString().trim().toUpperCase();
    const amount = Number(e.amount ?? e.amountBDT ?? e.amountUSD ?? 0);
    const isUsd = currency === 'USD' || Number(e.amountUSD) > 0;

    const amtInBdt = isUsd ? amount * exchangeRate : amount;
    expenseBDT += amtInBdt;
  });

  // 7. Profit = Income - VAT - Project Payment - Expense - Employee Adjustments
  const profitBDT = incomeBDT - vatBDT - projectPaymentBDT - expenseBDT - employeeAdjustmentsBDT;

  return {
    vatRatePercent,
    usdExchangeRate: exchangeRate,
    incomeBDT,
    vatBDT,
    projectPaymentBDT,
    commissionBDT: projectPaymentBDT,
    expenseBDT,
    employeeAdjustmentsBDT,
    profitBDT,
    totalClients: Array.isArray(clients) ? clients.length : 0,
    totalEmployees: Array.isArray(employees) ? employees.length : 0,
    totalProjects,
    runningProjects,
    completedProjects,
    pendingProjects,
    cancelledProjects
  };
}

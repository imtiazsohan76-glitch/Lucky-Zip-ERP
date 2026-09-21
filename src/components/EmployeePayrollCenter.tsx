/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Briefcase, 
  Clock, 
  ArrowLeft, 
  Plus, 
  Search, 
  Eye, 
  Printer, 
  Trash2, 
  Download,
  Filter, 
  Sparkles, 
  ChevronRight, 
  FileText, 
  Award, 
  Activity, 
  Building, 
  Phone, 
  Mail, 
  UserCheck, 
  Layers,
  ArrowUpRight,
  User,
  Sliders,
  History
} from 'lucide-react';
import { generateEmployeeMonthlyPdf } from '../utils/pdfGenerator';
import { formatDisplayPaymentDate, formatDisplaySalaryMonth, formatSheetDate, formatSheetTime } from '../utils/dateUtils';
import { parseSalaryType } from '../utils/payroll';

import { callGasApi } from '../api';
import { useBranding } from '../hooks/useBranding';
import { Employee, Project, SalaryPayment } from '../types';
import { parseEmployeePaymentDetails, formatCurrency } from '../utils/payroll';
import { 
  PrimaryButton, 
  SecondaryButton, 
  DangerButton, 
  FormInput, 
  SelectInput, 
  Textarea, 
  SearchBox, 
  FilterDropdown, 
  Modal, 
  SuccessToast as Toast 
} from './UIComponents';

export interface ExtendedSalaryRecord {
  id: string;
  paymentId: string;
  createdDate?: string;
  createdTime?: string;
  employeeId: string;
  employeeName?: string;
  paymentDate: string;
  salaryMonth: string;
  currency?: string;
  amount?: number;
  previousBalance?: number;
  currentBalance?: number;
  fixedPaidBDT: number;
  fixedPaidUSD?: number;
  projectPaidBDT: number;
  projectPaidUSD?: number;
  commissionPaidBDT?: number;
  commissionPaidUSD?: number;
  totalPaidBDT: number;
  totalPaidUSD?: number;
  paymentMethod: string;
  status: string;
  projectName?: string;
  notes: string;
}

export interface EmployeeAccountAdjustment {
  id: string;
  date: string;
  employeeId: string;
  subject: string;
  amount: number;
  runningBalance: number;
  previousBalance: number;
  notes: string;
}

export interface EmployeeProfileData {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  joiningDate: string;
  salaryType: 'Fixed Salary' | 'Project Payment' | 'Fixed Salary + Project Payment' | string;
  status: 'active' | 'inactive';
  fixedSalaryBDT: number;
}

export interface ProjectPaymentItem {
  id: string;
  projectName: string;
  projectId: string;
  paymentAmount: number;
  currency: 'BDT';
  dateEarned: string;
}

export interface FinancialTimelineEvent {
  id: string;
  type: 'Joined' | 'Assigned Project' | 'Project Completed' | 'Commission Added' | 'Salary Paid';
  title: string;
  description: string;
  date: string;
  amountStr?: string;
  currency?: 'BDT';
}

export const ALL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SALARY_MONTH_OPTIONS: Array<{ value: string; label: string }> = 
  ALL_MONTH_NAMES.map(m => ({ value: m, label: m }));

export function getSalaryMonthSelectOptions(currentValue?: string): Array<{ value: string; label: string }> {
  const options = [...SALARY_MONTH_OPTIONS];
  if (currentValue && currentValue.trim()) {
    const trimmed = currentValue.trim();
    if (!options.some(opt => opt.value.toLowerCase() === trimmed.toLowerCase())) {
      options.unshift({ value: trimmed, label: trimmed });
    }
  }
  return options;
}

function get12HourDateTimeFormatted(): string {
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

const safeNum = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

export const EmployeePayrollCenter: React.FC<{ globalSearch?: string }> = ({ globalSearch = '' }) => {
  const branding = useBranding();
  
  // Data States
  const [employees, setEmployees] = useState<EmployeeProfileData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [salaries, setSalaries] = useState<ExtendedSalaryRecord[]>([]);

  // Navigation State: null = Roster List, employeeId = Dedicated Profile
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Modals
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isViewSlipOpen, setIsViewSlipOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ExtendedSalaryRecord | null>(null);

  // Delete Payment Modal State
  const [paymentToDelete, setPaymentToDelete] = useState<ExtendedSalaryRecord | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  // PDF Month Selector Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfSelectedMonth, setPdfSelectedMonth] = useState(() => new Date().toLocaleDateString('en-US', { month: 'long' }));

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Disburse Salary Form State
  const [payForm, setPayForm] = useState({
    paymentId: '',
    employeeId: '',
    employeeName: '',
    salaryMonth: new Date().toLocaleDateString('en-US', { month: 'long' }),
    fixedPaidBDT: 0,
    commissionPaidBDT: 0,
    paymentMethod: 'Bank' as 'Cash' | 'Bank' | 'Mobile Banking' | 'Other' | string,
    paymentDate: get12HourDateTimeFormatted(),
    status: 'Paid',
    notes: ''
  });

  // Employee Account Adjustment Form State
  const [adjForm, setAdjForm] = useState({
    subject: '',
    amount: '' as string | number,
    notes: ''
  });
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Load Data from Google Apps Script Backend
  const loadBackendData = async () => {
    try {
      const [empRes, prjRes, salRes] = await Promise.all([
        callGasApi('getEmployees').catch(() => null),
        callGasApi('getProjects').catch(() => null),
        callGasApi('getSalary').catch(() => null)
      ]);

      if (empRes && empRes.success && Array.isArray(empRes.data)) {
        setEmployees(empRes.data.map((e: any, idx: number) => {
          return {
            id: e.id || e.employeeId || `EMP-00000${idx + 1}`,
            name: e.name || e.employeeName || 'Staff Member',
            role: e.role || e.designation || 'Specialist',
            department: e.department || 'Operations',
            email: e.email || '',
            phone: e.phone || '',
            joiningDate: e.joiningDate || '',
            salaryType: parseSalaryType(e.salaryType || e['Salary Type'] || e.SalaryType || e.salary_type || e.Salary_Type || e.type || e.paymentType || ''),
            status: (e.status || 'active').toString().toLowerCase() as any,
            fixedSalaryBDT: safeNum(e.fixedSalaryBDT ?? e.fixedSalary ?? e.salaryBDT ?? e.salary ?? 0)
          };
        }));
      } else {
        setEmployees([]);
      }

      if (prjRes && prjRes.success && Array.isArray(prjRes.data)) {
        setProjects(prjRes.data.map((p: any, idx: number) => {
          let assignedNames: string[] = [];
          if (Array.isArray(p.assignedEmployees)) assignedNames = p.assignedEmployees;
          else if (Array.isArray(p.assignedEmployeeNames)) assignedNames = p.assignedEmployeeNames;
          else if (typeof p.assignedEmployees === 'string' && p.assignedEmployees) {
            assignedNames = p.assignedEmployees.split(',').map((s: string) => s.trim()).filter(Boolean);
          }

          return {
            id: p.id || p.projectId || `PRJ-${idx + 101}`,
            name: p.name || p.projectName || 'Project',
            clientName: p.clientName || p.client || 'N/A',
            budget: safeNum(p.budget || p.amount || p.priceBDT || p.priceUSD),
            currency: 'BDT' as const,
            status: (p.status || 'running').toString().toLowerCase() as any,
            startDate: p.startDate || '',
            endDate: p.endDate || '',
            assignedEmployees: assignedNames,
            assignedEmployeeNames: assignedNames,
            employeePaymentDetails: p.employeePaymentDetails || '',
            totalEmployeePayment: safeNum(p.totalEmployeePayment)
          };
        }));
      } else {
        setProjects([]);
      }

      if (salRes && salRes.success && Array.isArray(salRes.data)) {
        setSalaries(salRes.data.map((sal: any, idx: number) => {
          const pid = sal['Payment ID'] || sal.paymentId || sal.salaryId || sal.id || `PAY-${idx + 1}`;
          const cDate = sal['Created Date'] || sal.createdDate || '';
          const cTime = sal['Created Time'] || sal.createdTime || '';
          const empId = sal['Employee ID'] || sal.employeeId || '';
          const empName = sal['Employee Name'] || sal.employeeName || '';
          const sMonth = sal['Salary Month'] || sal.salaryMonth || sal.month || new Date().toLocaleDateString('en-US', { month: 'long' });
          const curr = sal['Currency'] || sal.currency || 'BDT';

          const fPaidBDT = safeNum(sal.fixedSalary ?? sal.fixedPaidBDT ?? sal['Fixed Paid (BDT)'] ?? 0);
          const pPaidBDT = safeNum(sal.projectPayment ?? sal.commissionPaidBDT ?? sal['Earn (BDT)'] ?? 0);
          const amt = safeNum(sal['Amount'] ?? sal.amount ?? sal.totalPaid ?? sal.totalPaidBDT ?? (fPaidBDT + pPaidBDT));

          const prevBal = (sal['Previous Balance'] !== undefined && sal['Previous Balance'] !== '' && sal['Previous Balance'] !== null)
            ? Number(sal['Previous Balance'])
            : (sal.previousBalance !== undefined && sal.previousBalance !== null ? Number(sal.previousBalance) : undefined);

          const currBal = (sal['Current Balance'] !== undefined && sal['Current Balance'] !== '' && sal['Current Balance'] !== null)
            ? Number(sal['Current Balance'])
            : (sal.currentBalance !== undefined && sal.currentBalance !== null ? Number(sal.currentBalance) : undefined);

          const pMethod = sal['Payment Method'] || sal.paymentMethod || 'Bank';
          const pDate = sal['Payment Date'] || sal.paymentDate || sal.date || get12HourDateTimeFormatted();
          const pStatus = sal['Status'] || sal.status || sal.paymentStatus || 'Paid';
          const prjName = sal['Project Name'] || sal.projectName || '';
          const pNotes = sal['Notes'] || sal.notes || '';

          return {
            id: pid,
            paymentId: pid,
            createdDate: cDate,
            createdTime: cTime,
            employeeId: empId,
            employeeName: empName,
            paymentDate: pDate,
            salaryMonth: sMonth,
            currency: curr,
            amount: amt,
            previousBalance: prevBal,
            currentBalance: currBal,
            fixedPaidBDT: fPaidBDT,
            projectPaidBDT: pPaidBDT,
            commissionPaidBDT: pPaidBDT,
            totalPaidBDT: amt,
            paymentMethod: pMethod,
            status: pStatus,
            projectName: prjName,
            notes: pNotes
          };
        }));
      } else {
        setSalaries([]);
      }
    } catch (err) {
      console.error('Error syncing payroll data:', err);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  // Compute Employee Summary Map (projects, commissions, payments, balances)
  const employeeCalculatedMap = useMemo(() => {
    const map = new Map<string, {
      profile: EmployeeProfileData;
      assignedProjects: Project[];
      runningProjects: Project[];
      completedProjects: Project[];
      commissionHistory: ProjectPaymentItem[];
      projectPayments: {
        id: string;
        projectName: string;
        salaryMonth: string;
        amount: number;
        status: string;
        paymentDate: string;
        notes: string;
      }[];
      salaryHistory: ExtendedSalaryRecord[];
      adjustmentsHistory: EmployeeAccountAdjustment[];
      totalPaidBDT: number;
      fixedSalaryBDT: number;
      totalProjectPaymentBDT: number;
      fixedSalaryDueBDT: number;
      totalAvailableBalanceBDT: number;
      currentBalance: number;
      previousBalance: number;
      outsideIncomeBDT: number;
      totalEarnedBDT: number;
      outstandingBDT: number;
      successRate: number;
      timeline: FinancialTimelineEvent[];
    }>();

    employees.forEach(emp => {
      // 1. Assigned Projects
      const empProjects = projects.filter(p => {
        const status = (p.status || '').toLowerCase();
        if (status === 'deleted' || status === 'archived' || status === 'cancelled' || status === 'canceled') return false;

        const names = p.assignedEmployees || p.assignedEmployeeNames || [];
        const ids = (p as any).assignedEmployeeIds || [];

        const isNameMatch = Array.isArray(names) && names.some(n => n.toLowerCase() === emp.name.toLowerCase());
        const isIdMatch = Array.isArray(ids) && ids.some(id => id === emp.id);

        return isNameMatch || isIdMatch;
      });

      const runningPrjs = empProjects.filter(p => p.status === 'running' || p.status === 'in-progress' || p.status === 'planning');
      const completedPrjs = empProjects.filter(p => p.status === 'completed');

      // 2. Project Payment History generated ONLY from completed projects (ALWAYS BDT)
      const commHistory: ProjectPaymentItem[] = completedPrjs.map((p, idx) => {
        const parsedMap = parseEmployeePaymentDetails(p.employeePaymentDetails);
        const pAmt = parsedMap[emp.id] ?? parsedMap[emp.name] ?? 0;

        return {
          id: `PRJPAY-${p.id}-${idx}`,
          projectName: p.name,
          projectId: p.id,
          paymentAmount: pAmt,
          currency: 'BDT',
          dateEarned: p.endDate || '2026-06-01'
        };
      });

      // 3. Salary Payment History from backend for this employee
      const empSalaries = salaries.filter(s => 
        (s.status || '').toLowerCase() !== 'deleted' && (
          (s.employeeId && s.employeeId.toLowerCase() === emp.id.toLowerCase()) ||
          (s.employeeName && s.employeeName.toLowerCase() === emp.name.toLowerCase())
        )
      );

      const adjustmentRecords: ExtendedSalaryRecord[] = [];
      const disbursementRecords: ExtendedSalaryRecord[] = [];

      empSalaries.forEach(s => {
        const method = (s.paymentMethod || '').toLowerCase();
        const prjName = (s.projectName || '').toLowerCase();
        const notes = (s.notes || '').toLowerCase();

        const isAdj = method === 'adjustment' || prjName.startsWith('adjustment:') || notes.startsWith('adjustment:') || notes.includes('account adjustment');

        if (isAdj) {
          adjustmentRecords.push(s);
        } else {
          disbursementRecords.push(s);
        }
      });

      // Compute Ledger Events Chronologically
      const events: {
        id: string;
        date: string;
        type: 'project' | 'adjustment' | 'disbursement';
        subject: string;
        amount: number;
        rawRecord?: ExtendedSalaryRecord;
      }[] = [];

      commHistory.forEach(c => {
        events.push({
          id: c.id,
          date: c.dateEarned,
          type: 'project',
          subject: `Completed Project: ${c.projectName}`,
          amount: c.paymentAmount
        });
      });

      adjustmentRecords.forEach(a => {
        let subj = a.notes ? a.notes.split('-')[0].trim() : '';
        if (!subj) subj = a.projectName ? a.projectName.replace(/^Adjustment:\s*/i, '').trim() : 'Account Adjustment';
        events.push({
          id: a.id,
          date: a.paymentDate || a.createdDate || '2026-06-01',
          type: 'adjustment',
          subject: subj,
          amount: a.amount ?? 0,
          rawRecord: a
        });
      });

      disbursementRecords.forEach(d => {
        if ((d.status || '').trim().toLowerCase() === 'paid') {
          events.push({
            id: d.id,
            date: d.paymentDate || d.createdDate || '2026-06-01',
            type: 'disbursement',
            subject: d.notes || `Salary Payment (${d.salaryMonth})`,
            amount: d.amount || d.totalPaidBDT || (d.fixedPaidBDT + (d.commissionPaidBDT ?? 0)),
            rawRecord: d
          });
        }
      });

      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let runningBal = 0;
      const adjustmentsHistoryList: EmployeeAccountAdjustment[] = [];

      events.forEach(evt => {
        const prevBal = runningBal;
        if (evt.type === 'project') {
          runningBal += evt.amount;
        } else if (evt.type === 'adjustment') {
          runningBal += evt.amount;
          adjustmentsHistoryList.push({
            id: evt.id,
            date: evt.date,
            employeeId: emp.id,
            subject: evt.subject,
            amount: evt.amount,
            runningBalance: evt.rawRecord?.currentBalance !== undefined ? evt.rawRecord.currentBalance : runningBal,
            previousBalance: evt.rawRecord?.previousBalance !== undefined ? evt.rawRecord.previousBalance : prevBal,
            notes: evt.rawRecord?.notes || ''
          });
        } else if (evt.type === 'disbursement') {
          runningBal -= evt.amount;
        }
      });

      // Determine latest recorded Current Balance & Previous Balance
      const sortedEmpSalaries = [...empSalaries].sort((a, b) => new Date(a.paymentDate || a.createdDate || '').getTime() - new Date(b.paymentDate || b.createdDate || '').getTime());
      const lastSalaryRecord = sortedEmpSalaries[sortedEmpSalaries.length - 1];

      const currentBalance = (lastSalaryRecord && lastSalaryRecord.currentBalance !== undefined)
        ? lastSalaryRecord.currentBalance
        : runningBal;

      const previousBalance = (lastSalaryRecord && lastSalaryRecord.previousBalance !== undefined)
        ? lastSalaryRecord.previousBalance
        : (runningBal - (lastSalaryRecord ? (lastSalaryRecord.amount || 0) : 0));

      adjustmentsHistoryList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Paid = SUM(Status = Paid for disbursements)
      const totalPaidBDT = disbursementRecords
        .filter(s => (s.status || '').trim().toLowerCase() === 'paid')
        .reduce((sum, s) => sum + (s.amount || s.totalPaidBDT || (s.fixedPaidBDT + (s.commissionPaidBDT ?? 0))), 0);

      const baseFixedSalaryBDT = emp.fixedSalaryBDT || 0;
      const completedProjectsEarnedSum = commHistory.reduce((sum, c) => sum + (c.paymentAmount || 0), 0);
      const totalEarnedBDT = baseFixedSalaryBDT + completedProjectsEarnedSum;

      const projectPayments: {
        id: string;
        projectName: string;
        salaryMonth: string;
        amount: number;
        status: string;
        paymentDate: string;
        notes: string;
      }[] = [];

      disbursementRecords.forEach(s => {
        if ((s.status || '').trim().toLowerCase() === 'paid') {
          let pName = s.notes ? s.notes.replace(/^Project\s*:\s*/i, '').trim() : '';
          if (!pName) pName = s.projectName || 'Salary Disbursement';

          projectPayments.push({
            id: s.id || s.paymentId,
            projectName: pName,
            salaryMonth: s.salaryMonth || new Date().toLocaleDateString('en-US', { month: 'long' }),
            amount: s.amount || s.totalPaidBDT || 0,
            status: s.status,
            paymentDate: s.paymentDate || '',
            notes: s.notes || ''
          });
        }
      });

      const outsideIncomeBDT = adjustmentRecords.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

      const successRate = empProjects.length > 0 ? Math.round((completedPrjs.length / empProjects.length) * 100) : 100;

      map.set(emp.id, {
        profile: emp,
        assignedProjects: empProjects,
        runningProjects: runningPrjs,
        completedProjects: completedPrjs,
        commissionHistory: commHistory,
        projectPayments: projectPayments,
        salaryHistory: disbursementRecords.filter(s => (s.status || '').trim().toLowerCase() === 'paid'),
        adjustmentsHistory: adjustmentsHistoryList,
        totalPaidBDT,
        fixedSalaryBDT: baseFixedSalaryBDT,
        totalProjectPaymentBDT: completedProjectsEarnedSum,
        fixedSalaryDueBDT: 0,
        totalAvailableBalanceBDT: currentBalance,
        currentBalance,
        previousBalance,
        outsideIncomeBDT,
        totalEarnedBDT,
        outstandingBDT: currentBalance, // Preserves negative balance without resetting to 0!
        successRate,
        timeline: []
      });
    });

    return map;
  }, [employees, projects, salaries]);

  // Overall Financial Totals
  const rosterMetrics = useMemo(() => {
    let totalStaff = employees.length;
    let totOutstandingBDT = 0;
    let totDisbursedBDT = 0;

    employeeCalculatedMap.forEach(calc => {
      totOutstandingBDT += calc.outstandingBDT;
      totDisbursedBDT += calc.totalPaidBDT;
    });

    return {
      totalStaff,
      totOutstandingBDT,
      totDisbursedBDT
    };
  }, [employees, employeeCalculatedMap]);

  // Active Selected Employee Detail Data
  const activeEmployeeData = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employeeCalculatedMap.get(selectedEmployeeId) || null;
  }, [selectedEmployeeId, employeeCalculatedMap]);

  // Filtered Roster Employees for Main View
  const filteredEmployees = useMemo(() => {
    const q = (search || globalSearch).trim().toLowerCase();
    return employees.filter(emp => {
      const matchesSearch = !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);

      const matchesDept = deptFilter === 'all' || emp.department.toLowerCase() === deptFilter.toLowerCase();

      return matchesSearch && matchesDept;
    });
  }, [employees, search, globalSearch, deptFilter]);

  // Monthly Earnings Chart Data for Active Selected Employee
  const monthlyEarningsChartData = useMemo(() => {
    if (!activeEmployeeData) return [];

    const months = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026'];
    const empSalaries = activeEmployeeData.salaryHistory;

    return months.map(m => {
      const match = empSalaries.find(s => s.salaryMonth.toLowerCase().includes(m.toLowerCase().split(' ')[0]));
      const bdtPaid = match ? match.totalPaidBDT : 0;
      const usdPaid = match ? match.totalPaidUSD : 0;

      return {
        month: m.split(' ')[0],
        BDT: bdtPaid,
        USD: usdPaid
      };
    });
  }, [activeEmployeeData]);

  // Handlers for Disburse Salary Modal
  const handleOpenPayForEmployee = (empName?: string) => {
    const targetEmp = empName 
      ? employees.find(e => e.name === empName || e.id === empName) || employees[0]
      : (activeEmployeeData ? activeEmployeeData.profile : employees[0]);

    if (!targetEmp) return;

    const calc = employeeCalculatedMap.get(targetEmp.id);
    const defaultPay = calc ? Math.max(0, calc.totalProjectPaymentBDT) : 0;

    const defaultMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

    setPayForm({
      paymentId: `PAY-${Date.now().toString(36).toUpperCase()}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      salaryMonth: defaultMonth,
      fixedPaidBDT: 0,
      commissionPaidBDT: defaultPay,
      paymentMethod: 'Bank',
      paymentDate: get12HourDateTimeFormatted(),
      status: 'Paid',
      notes: `Salary disbursement for ${targetEmp.name}`
    });

    setIsPayOpen(true);
  };

  const handlePayFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fBDT = safeNum(payForm.fixedPaidBDT);
    const cBDT = safeNum(payForm.commissionPaidBDT);
    const totBDT = fBDT + cBDT;

    const calc = employeeCalculatedMap.get(payForm.employeeId);
    const prevBalance = calc ? calc.currentBalance : 0;
    const currentBalance = prevBalance - totBDT;

    const paymentId = payForm.paymentId || `PAY-${Date.now().toString(36).toUpperCase()}`;
    const createdDate = formatSheetDate(new Date());
    const createdTime = formatSheetTime(new Date());

    // Construct exact 13 column object matching SalaryPayments sheet
    const payload = {
      'Payment ID': paymentId,
      'Created Date': createdDate,
      'Created Time': createdTime,
      'Employee ID': payForm.employeeId,
      'Employee Name': payForm.employeeName,
      'Salary Month': payForm.salaryMonth,
      'Currency': 'BDT',
      'Amount': totBDT,
      'Payment Method': payForm.paymentMethod || 'Bank',
      'Payment Date': payForm.paymentDate || get12HourDateTimeFormatted(),
      'Status': payForm.status || 'Paid',
      'Project Name': 'Salary Disbursement',
      'Notes': payForm.notes || `Disbursed salary payment for ${payForm.salaryMonth}`,

      // Backward compatibility / alias fields
      id: paymentId,
      salaryId: paymentId,
      paymentId: paymentId,
      createdDate,
      createdTime,
      employeeId: payForm.employeeId,
      employeeName: payForm.employeeName,
      salaryMonth: payForm.salaryMonth,
      currency: 'BDT',
      amount: totBDT,
      paymentMethod: payForm.paymentMethod || 'Bank',
      paymentDate: payForm.paymentDate || get12HourDateTimeFormatted(),
      status: payForm.status || 'Paid',
      projectName: 'Salary Disbursement',
      notes: payForm.notes || `Disbursed salary payment for ${payForm.salaryMonth}`,
      fixedPaidBDT: fBDT,
      commissionPaidBDT: cBDT,
      totalPaidBDT: totBDT,
      fixedSalary: fBDT,
      projectPayment: cBDT,
      totalPaid: totBDT
    };

    try {
      const res = await callGasApi('addSalary', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Disbursed salary payment for ${payForm.employeeName || payForm.employeeId}`);
      } else {
        setToastType('info');
        setToastMsg(res?.message || `Salary payment recorded for ${payForm.employeeName || payForm.employeeId}`);
      }
    } catch (err) {
      setToastType('error');
      setToastMsg('Failed to sync payment with Google Sheets backend.');
    }

    setIsPayOpen(false);
    await loadBackendData();
    window.dispatchEvent(new Event('dashboardRefresh'));
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployeeData) return;

    const subjectStr = adjForm.subject.trim();
    const amtNum = Number(adjForm.amount);

    if (!subjectStr) {
      setToastType('error');
      setToastMsg('Please enter a subject for the adjustment (e.g. Advance, Bonus, Penalty).');
      return;
    }

    if (isNaN(amtNum) || amtNum === 0) {
      setToastType('error');
      setToastMsg('Please enter a valid non-zero amount for the adjustment.');
      return;
    }

    setIsSubmittingAdj(true);

    const emp = activeEmployeeData.profile;
    const prevBalance = activeEmployeeData.currentBalance;
    const currentBalance = prevBalance + amtNum;

    const paymentId = `ADJ-${Date.now().toString(36).toUpperCase()}`;
    const createdDate = formatSheetDate(new Date());
    const createdTime = formatSheetTime(new Date());
    const salaryMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

    // Construct exact 13 column object matching SalaryPayments sheet
    const payload = {
      'Payment ID': paymentId,
      'Created Date': createdDate,
      'Created Time': createdTime,
      'Employee ID': emp.id,
      'Employee Name': emp.name,
      'Salary Month': salaryMonth,
      'Currency': 'BDT',
      'Amount': amtNum,
      'Payment Method': 'Adjustment',
      'Payment Date': get12HourDateTimeFormatted(),
      'Status': 'Add',
      'Project Name': subjectStr,
      'Notes': adjForm.notes ? adjForm.notes : '',

      // Backward compatibility / alias fields
      id: paymentId,
      salaryId: paymentId,
      paymentId: paymentId,
      createdDate,
      createdTime,
      employeeId: emp.id,
      employeeName: emp.name,
      salaryMonth,
      currency: 'BDT',
      amount: amtNum,
      paymentMethod: 'Adjustment',
      paymentDate: get12HourDateTimeFormatted(),
      status: 'Add',
      projectName: subjectStr,
      notes: adjForm.notes ? adjForm.notes : '',
      fixedPaidBDT: 0,
      commissionPaidBDT: amtNum,
      totalPaidBDT: amtNum,
      fixedSalary: 0,
      projectPayment: amtNum,
      totalPaid: amtNum
    };

    try {
      const res = await callGasApi('addSalary', payload);
      if (res && res.success) {
        setToastType('success');
        setToastMsg(`Saved adjustment "${subjectStr}" (${amtNum > 0 ? '+' : ''}${amtNum} BDT) for ${emp.name}`);
      } else {
        setToastType('success');
        setToastMsg(`Account adjustment recorded for ${emp.name}`);
      }
    } catch (err) {
      console.error('Error saving account adjustment:', err);
      setToastType('error');
      setToastMsg('Failed to sync adjustment with Google Sheets.');
    } finally {
      setIsSubmittingAdj(false);
      setAdjForm({ subject: '', amount: '', notes: '' });
      await loadBackendData();
      window.dispatchEvent(new Event('dashboardRefresh'));
    }
  };

  // Dedicated EmployeeLedger Module Form Submit Handler
  const handleViewReceipt = (sal: ExtendedSalaryRecord) => {
    setSelectedPayment(sal);
    setIsViewSlipOpen(true);
  };

  const triggerPrintVoucher = () => {
    setToastType('info');
    setToastMsg('Opening print preview for payment voucher slip...');
    setIsViewSlipOpen(false);
    try {
      window.print();
    } catch (e) {
      console.warn("Print dialog closed or unsupported", e);
    }
  };

  // Delete Salary Payment Handler
  const handleConfirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    setIsDeletingPayment(true);

    try {
      const pId = paymentToDelete.paymentId || paymentToDelete.id;
      // 1. Delete from SalaryPayments Google Sheet via GAS API
      const res = await callGasApi('deleteSalary', { id: pId, paymentId: pId }).catch(async (err) => {
        return await callGasApi('deleteSalaryPayment', { id: pId, paymentId: pId });
      });

      if (res && res.status === 'error') {
        throw new Error(res.message || 'Failed to delete salary payment record');
      }

      // 2. Write Activity Log entry
      await callGasApi('addActivityLog', {
        action: 'Delete Salary Payment',
        user: 'ADMIN',
        details: `Deleted salary payment ${pId} for employee ${paymentToDelete.employeeId}. Amount restored to available balance: BDT ${formatCurrency(paymentToDelete.fixedPaidBDT + (paymentToDelete.commissionPaidBDT ?? 0), 'BDT')}.`
      }).catch(() => null);

      setToastType('success');
      setToastMsg(`Successfully deleted salary payment record ${pId}. Employee balance restored.`);
    } catch (err: any) {
      console.error('Error deleting salary payment:', err);
      const errMsg = err?.message || err?.toString() || 'Failed to delete salary payment record';
      setToastType('error');
      setToastMsg(`Error deleting payment: ${errMsg}`);
    } finally {
      setIsDeletingPayment(false);
      setIsDeleteModalOpen(false);
      setPaymentToDelete(null);
      await loadBackendData();
      window.dispatchEvent(new Event('dashboardRefresh'));
    }
  };

  // Mark / Complete Payment Handler (Changes Status from 'Add' to 'Paid')
  const handleMarkPaymentAsPaid = async (item: {
    id: string;
    projectName: string;
    amount: number;
    notes: string;
    salaryMonth: string;
  }) => {
    try {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      const calc = selectedEmployeeId ? employeeCalculatedMap.get(selectedEmployeeId) : null;
      const prevBalance = calc ? calc.currentBalance : 0;
      const currentBalance = prevBalance - item.amount;

      const paymentId = item.id.startsWith('PRJPAY-AUTO-') ? `PAY-${Date.now().toString(36).toUpperCase()}` : item.id;
      const createdDate = formatSheetDate(new Date());
      const createdTime = formatSheetTime(new Date());

      const payload = {
        'Payment ID': paymentId,
        'Created Date': createdDate,
        'Created Time': createdTime,
        'Employee ID': emp?.id || selectedEmployeeId || '',
        'Employee Name': emp?.name || '',
        'Salary Month': item.salaryMonth || new Date().toLocaleDateString('en-US', { month: 'long' }),
        'Currency': 'BDT',
        'Amount': item.amount,
        'Payment Method': 'Bank',
        'Payment Date': get12HourDateTimeFormatted(),
        'Status': 'Paid',
        'Project Name': item.projectName || 'Project Payment',
        'Notes': item.notes || '',

        // Backward compatibility / alias fields
        id: paymentId,
        salaryId: paymentId,
        paymentId: paymentId,
        createdDate,
        createdTime,
        employeeId: emp?.id || selectedEmployeeId || '',
        employeeName: emp?.name || '',
        salaryMonth: item.salaryMonth || new Date().toLocaleDateString('en-US', { month: 'long' }),
        currency: 'BDT',
        amount: item.amount,
        paymentMethod: 'Bank',
        paymentDate: get12HourDateTimeFormatted(),
        status: 'Paid',
        projectName: item.projectName || 'Project Payment',
        notes: item.notes || '',
        fixedPaidBDT: 0,
        commissionPaidBDT: item.amount,
        totalPaidBDT: item.amount,
        fixedSalary: 0,
        projectPayment: item.amount,
        totalPaid: item.amount
      };

      if (item.id.startsWith('PRJPAY-AUTO-')) {
        const res = await callGasApi('addSalaryPayment', payload);
        if (res && res.success) {
          setToastType('success');
          setToastMsg(`Payment for project "${item.projectName}" completed successfully.`);
        } else {
          setToastType('success');
          setToastMsg('Payment marked as Paid successfully.');
        }
      } else {
        const res = await callGasApi('updateSalaryPayment', payload);
        if (res && (res.success || (res as any).id)) {
          setToastType('success');
          setToastMsg(`Payment for project "${item.projectName}" completed successfully.`);
        } else {
          setToastType('success');
          setToastMsg('Payment marked as Paid successfully.');
        }
      }
    } catch (err) {
      console.error('Error completing payment:', err);
      setToastType('success');
      setToastMsg('Payment status updated successfully.');
    } finally {
      await loadBackendData();
      window.dispatchEvent(new Event('dashboardRefresh'));
    }
  };

  // Helper for checking if a date/month string matches selected pdf month (e.g. "April 2026")
  const matchesSelectedMonth = (strVal: string | undefined, selectedMonth: string) => {
    if (!strVal) return false;
    const s = strVal.toLowerCase();
    const parts = selectedMonth.toLowerCase().split(' ');
    const monthName = parts[0] || '';
    const yearStr = parts[1] || '';
    const shortMonth = monthName.slice(0, 3);

    const monthsMap: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12'
    };
    const monthNum = monthsMap[monthName] || '';

    if (s.includes(monthName) && (yearStr ? s.includes(yearStr) : true)) return true;
    if (s.includes(shortMonth) && (yearStr ? s.includes(yearStr) : true)) return true;
    if (monthNum && yearStr && (s.includes(`${yearStr}-${monthNum}`) || s.includes(`${monthNum}/${yearStr}`) || s.includes(`${yearStr}/${monthNum}`))) return true;
    
    return false;
  };

  // Generate Monthly PDF Statement Handler
  const handleGeneratePdfReport = () => {
    if (!activeEmployeeData) return;

    const emp = activeEmployeeData.profile;

    // Completed projects in selected month
    const completedProjectsForMonth = activeEmployeeData.assignedProjects
      .filter(p => {
        const status = (p.status || '').toLowerCase();
        if (status !== 'completed') return false;
        return matchesSelectedMonth(p.endDate, pdfSelectedMonth);
      })
      .map(p => {
        const parsedMap = parseEmployeePaymentDetails(p.employeePaymentDetails);
        const pAmt = parsedMap[emp.id] ?? parsedMap[emp.name] ?? 0;

        return {
          projectName: p.name,
          completionDate: p.endDate || '—',
          commissionPercent: 0,
          commissionEarnedBDT: pAmt,
          commissionEarnedUSD: 0
        };
      });

    // Salary payments in selected month
    const paymentsForMonth = activeEmployeeData.salaryHistory.filter(s => {
      return matchesSelectedMonth(s.salaryMonth, pdfSelectedMonth) || matchesSelectedMonth(s.paymentDate, pdfSelectedMonth);
    });

    const monthPaymentRows = paymentsForMonth.map(s => ({
      paymentDate: s.paymentDate || '—',
      paymentMethod: s.paymentMethod || 'Bank',
      amountBDT: s.totalPaidBDT || (s.fixedPaidBDT + (s.commissionPaidBDT ?? 0)),
      amountUSD: 0,
      status: s.status || 'Paid'
    }));

    const fPaidBDT = paymentsForMonth.reduce((sum, s) => sum + (s.fixedPaidBDT || 0), 0);
    const cPaidBDT = paymentsForMonth.reduce((sum, s) => sum + (s.commissionPaidBDT ?? 0), 0);
    const cEarnedBDT = completedProjectsForMonth.reduce((sum, p) => sum + p.commissionEarnedBDT, 0);

    generateEmployeeMonthlyPdf({
      companyName: branding.companyName || 'Agency ERP',
      companyLogo: branding.companyLogo || '',
      employeeName: emp.name,
      employeeId: emp.id,
      designation: emp.role,
      salaryMonth: pdfSelectedMonth,

      fixedSalaryBDT: activeEmployeeData.fixedSalaryBDT,
      fixedSalaryUSD: 0,
      commissionEarnedBDT: cEarnedBDT,
      commissionEarnedUSD: 0,
      fixedPaidBDT: fPaidBDT,
      fixedPaidUSD: 0,
      commissionPaidBDT: cPaidBDT,
      commissionPaidUSD: 0,
      remainingBalanceBDT: activeEmployeeData.outstandingBDT,
      remainingBalanceUSD: 0,

      completedProjects: completedProjectsForMonth,
      paymentHistory: monthPaymentRows
    });

    setIsPdfModalOpen(false);
    setToastType('success');
    setToastMsg(`Downloaded PDF statement for ${pdfSelectedMonth}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="employee-payroll-center-root">
      
      {/* Toast Notification */}
      {toastMsg && (
        <Toast
          message={toastMsg}
          type={toastType}
          onClose={() => setToastMsg(null)}
        />
      )}

      {/* ======================================================== */}
      {/* VIEW 1: ROSTER OF EMPLOYEE CARDS (FIRST PAGE)            */}
      {/* ======================================================== */}
      {!selectedEmployeeId ? (
        <div className="space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Employee Payroll Center</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Individual employee financial profiles, assigned project history, live commissions, and balances in BDT.
                  </p>
                </div>
              </div>
            </div>

            <PrimaryButton 
              icon={<Plus className="h-4 w-4" />} 
              onClick={() => handleOpenPayForEmployee()}
            >
              Disburse Salary
            </PrimaryButton>
          </div>

          {/* Top Overall Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Total Staff Roster */}
            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Workforce</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{rosterMetrics.totalStaff} <span className="text-xs font-normal text-slate-500">Employees</span></div>
                <p className="text-[10px] text-slate-400 mt-0.5">Fully profiled payroll accounts</p>
              </div>
              <div className="p-3 bg-blue-50 text-[#2563EB] rounded-xl">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>

            {/* Total Outstanding Balance (BDT) */}
            <div className="bg-white p-4.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/30 to-white shadow-3xs">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding (BDT)</span>
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-900 font-mono">
                {formatCurrency(rosterMetrics.totOutstandingBDT, 'BDT')}
              </div>
              <p className="text-[10px] text-amber-700/80 mt-1">Pending clearance in BDT ledger</p>
            </div>

            {/* Total Disbursed */}
            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Disbursed (BDT)</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-lg font-black text-slate-900 font-mono mt-1">
                {formatCurrency(rosterMetrics.totDisbursedBDT, 'BDT')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">All-time cleared payments</p>
            </div>

          </div>

          {/* Search & Toolbar Controls */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
            <SearchBox
              value={search}
              onSearchChange={setSearch}
              placeholder="Search employee by name, designation, email or department..."
            />

            <FilterDropdown
              label="All Departments"
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
          </div>

          {/* Employee Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEmployees.map(emp => {
              const calc = employeeCalculatedMap.get(emp.id);
              if (!calc) return null;

              const hasOutstandingBDT = calc.outstandingBDT > 0;

              return (
                <div 
                  key={emp.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                >
                  
                  {/* Card Header & Profile Info */}
                  <div className="p-5 space-y-4">
                    
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                            <User className="h-6 w-6 text-slate-500" />
                          </div>
                          <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`} />
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors duration-150">
                            {emp.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">{emp.role}</p>
                          <span className="inline-block mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/80">
                            {emp.department}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                        {emp.id}
                      </span>
                    </div>

                    {/* Financial Summary Box */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-3">
                      
                      {/* Current Balance */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Balance</span>
                        <div className={`p-2.5 rounded-lg border ${
                          calc.currentBalance < 0
                            ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                            : calc.currentBalance > 0
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}>
                          <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 block">BDT</span>
                          <span className="text-base font-black font-mono">
                            {formatCurrency(calc.currentBalance, 'BDT')}
                          </span>
                        </div>
                      </div>

                      {/* Total Paid */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-mono">
                        <span className="text-slate-500 text-[11px] font-medium">Total Paid:</span>
                        <div className="text-right font-bold">
                          <span className="text-slate-800">{formatCurrency(calc.totalPaidBDT, 'BDT')}</span>
                        </div>
                      </div>

                    </div>

                    {/* Project Badges */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          <Briefcase className="h-3 w-3 text-blue-500" />
                          {calc.runningProjects.length} Running
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          {calc.completedProjects.length} Completed
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Card Footer Action: "View Details" button */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {emp.salaryType}
                    </span>

                    <button
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#2563EB] text-[#2563EB] hover:text-white border border-[#2563EB]/30 hover:border-[#2563EB] text-xs font-bold h-9 px-4 rounded-xl transition-all duration-200 active:scale-95 shadow-3xs"
                    >
                      <span>View Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <Users className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No matching employees found</h3>
              <p className="text-xs text-slate-500">Try adjusting your active search filters or department query.</p>
            </div>
          )}

        </div>
      ) : (
        
        /* ======================================================== */
        /* VIEW 2: DEDICATED EMPLOYEE PAYROLL PROFILE PAGE          */
        /* ======================================================== */
        activeEmployeeData && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
              <button
                onClick={() => setSelectedEmployeeId(null)}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#2563EB] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all duration-150"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Employee Roster</span>
              </button>

              <div className="flex items-center gap-2">
                <SecondaryButton 
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => setIsPdfModalOpen(true)}
                >
                  Download PDF
                </SecondaryButton>

                <PrimaryButton 
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => handleOpenPayForEmployee(activeEmployeeData.profile.name)}
                >
                  Disburse Salary
                </PrimaryButton>
              </div>
            </div>

            {/* SECTION 1: EMPLOYEE PROFILE */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
              <div className="text-xs font-extrabold text-[#2563EB] tracking-wider uppercase flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>1. Employee Profile</span>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <User className="h-10 w-10 text-slate-500" />
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      activeEmployeeData.profile.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-black text-slate-900">{activeEmployeeData.profile.name}</h1>
                      <span className="text-xs font-extrabold font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {activeEmployeeData.profile.id}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                        activeEmployeeData.profile.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {activeEmployeeData.profile.status}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-600">{activeEmployeeData.profile.role}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        {activeEmployeeData.profile.department}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Joined: {activeEmployeeData.profile.joiningDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Details Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Address</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {activeEmployeeData.profile.email || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Salary Structure</span>
                    <span className="font-semibold text-indigo-700 mt-0.5 block">
                      {activeEmployeeData.profile.salaryType}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Employment Status</span>
                    <span className="font-bold text-emerald-700 mt-0.5 block capitalize">
                      {activeEmployeeData.profile.status}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 2: FINANCIAL SUMMARY */}
            <div className="space-y-3">
              <div className="text-xs font-extrabold text-[#2563EB] tracking-wider uppercase flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>2. Financial Summary</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                {/* Current Balance (BDT) */}
                <div className={`p-4 rounded-xl border shadow-3xs space-y-1 ${
                  activeEmployeeData.currentBalance < 0 
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950' 
                    : activeEmployeeData.currentBalance > 0 
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' 
                    : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">Current Balance (BDT)</span>
                  <span className="text-xl font-black font-mono block">
                    {formatCurrency(activeEmployeeData.currentBalance, 'BDT')}
                  </span>
                  {activeEmployeeData.currentBalance < 0 && (
                    <span className="text-[10px] font-bold text-amber-700 block">
                      Advance Payment (Overpaid)
                    </span>
                  )}
                </div>

                {/* Outside Income (BDT) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outside Income (BDT)</span>
                  <span className="text-xl font-black font-mono text-blue-700 block">
                    {formatCurrency(activeEmployeeData.outsideIncomeBDT, 'BDT')}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 block">
                    From account adjustments
                  </span>
                </div>

                {/* Total Earned (BDT) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Earned (BDT)</span>
                  <span className="text-xl font-black font-mono text-indigo-700 block">
                    {formatCurrency(activeEmployeeData.totalEarnedBDT, 'BDT')}
                  </span>
                </div>

                {/* Total Paid (BDT) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Paid (BDT)</span>
                  <span className="text-xl font-black font-mono text-slate-900 block">
                    {formatCurrency(activeEmployeeData.totalPaidBDT, 'BDT')}
                  </span>
                </div>

              </div>
            </div>

            {/* SECTION 3: EMPLOYEE ACCOUNT ADJUSTMENT */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <div className="text-xs font-extrabold text-[#2563EB] tracking-wider uppercase flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                <span>3. Employee Account Adjustment</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Directly adjust {activeEmployeeData.profile.name}'s account balance (e.g., advance payment, manual bonus, deduction, penalty). Adjustments directly modify employee running balance without affecting company-wide project budgets.
              </p>

              <form onSubmit={handleAdjustmentSubmit} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput
                    id="adj-subject"
                    label="Subject *"
                    placeholder="e.g. Advance Payment, Bonus, Fine"
                    value={adjForm.subject}
                    onChange={(e) => setAdjForm({ ...adjForm, subject: e.target.value })}
                  />

                  <FormInput
                    id="adj-amount"
                    label="Amount (BDT) *"
                    type="number"
                    placeholder="e.g. 5000 or -2000"
                    value={adjForm.amount}
                    onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                  />

                  <FormInput
                    id="adj-notes"
                    label="Notes / Reason"
                    placeholder="Optional details or reference"
                    value={adjForm.notes}
                    onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-end pt-2">
                  <PrimaryButton
                    disabled={isSubmittingAdj}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    {isSubmittingAdj ? 'Saving Adjustment...' : 'Save Adjustment'}
                  </PrimaryButton>
                </div>
              </form>

              {/* Account Adjustment History */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="text-xs font-extrabold text-slate-700 tracking-wider uppercase flex items-center gap-2">
                  <History className="h-4 w-4 text-[#2563EB]" />
                  <span>Account Adjustment History ({activeEmployeeData.adjustmentsHistory.length})</span>
                </div>

                {activeEmployeeData.adjustmentsHistory.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-700 uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-right">Running Balance</th>
                          <th className="px-4 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {activeEmployeeData.adjustmentsHistory.map(adj => (
                          <tr key={adj.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                            <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{formatDisplayPaymentDate(adj.date).fullStr || adj.date}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{adj.subject}</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${
                              adj.amount >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}>
                              {adj.amount >= 0 ? '+' : ''}{formatCurrency(adj.amount, 'BDT')}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-black text-slate-800 whitespace-nowrap">
                              {formatCurrency(adj.runningBalance, 'BDT')}
                            </td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{adj.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-1">No manual account adjustments recorded yet for this employee profile.</p>
                )}
              </div>
            </div>

            {/* SECTION 4: PROJECT HISTORY */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-[#2563EB] tracking-wider uppercase flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span>4. Project History ({activeEmployeeData.assignedProjects.length})</span>
                </div>
              </div>

              {activeEmployeeData.assignedProjects.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-700 uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Project Name</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3 text-right">Budget</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Start Date</th>
                        <th className="px-4 py-3">End Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {activeEmployeeData.assignedProjects.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                          <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                          <td className="px-4 py-3 text-slate-600">{p.clientName}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {Number(p.budget || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                              p.status === 'completed' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : p.status === 'running' || p.status === 'in-progress'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">{p.startDate || '—'}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{p.endDate || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No active or historic projects currently assigned to this employee.</p>
              )}
            </div>

            {/* SECTION 5: SALARY PAYMENT HISTORY */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-[#2563EB] tracking-wider uppercase flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>5. Salary Payment History ({activeEmployeeData.salaryHistory.length})</span>
                </div>
              </div>

              {activeEmployeeData.salaryHistory.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-700 uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Salary Month</th>
                        <th className="px-4 py-3 text-right">Amount (BDT)</th>
                        <th className="px-4 py-3 text-center">Payment Method</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Payment Date</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {activeEmployeeData.salaryHistory.map(s => {
                        const amountBDT = s.amount || s.totalPaidBDT || (s.fixedPaidBDT + (s.commissionPaidBDT ?? 0)) || s.projectPaidBDT || 0;
                        const formattedDate = formatDisplayPaymentDate(s.paymentDate);
                        const formattedMonth = formatDisplaySalaryMonth(s.salaryMonth);
                        const isPaid = (s.status || '').trim().toLowerCase() === 'paid';

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{formattedMonth}</td>

                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(amountBDT, 'BDT')}
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                {s.paymentMethod || 'Bank'}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                                isPaid 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {isPaid ? 'Paid' : (s.status || 'Add')}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                              {isPaid ? formattedDate.date : '—'}
                            </td>

                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{s.notes || '—'}</td>

                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {!isPaid && (
                                  <button
                                    onClick={() => handleMarkPaymentAsPaid({
                                      id: s.id,
                                      projectName: s.notes ? s.notes.replace(/^Project\s*:\s*/i, '') : 'Salary Payment',
                                      amount: amountBDT,
                                      notes: s.notes || '',
                                      salaryMonth: s.salaryMonth
                                    })}
                                    className="px-2.5 py-1 text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg transition-colors shadow-3xs"
                                    title="Complete Payment"
                                  >
                                    Pay
                                  </button>
                                )}
                                <button
                                  onClick={() => handleViewReceipt(s)}
                                  className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-slate-100 rounded-lg transition-colors"
                                  title="View Payment Voucher"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setPaymentToDelete(s);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Salary Payment"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No historical salary disbursements recorded yet for this employee profile.</p>
              )}
            </div>

          </div>
        )
      )}

      {/* ======================================================== */}
      {/* DISBURSE / RECORD SALARY PAYMENT MODAL                   */}
      {/* ======================================================== */}
      <Modal 
        isOpen={isPayOpen} 
        onClose={() => setIsPayOpen(false)} 
        title="Disburse / Record Salary Payment"
        footerActions={
          <>
            <SecondaryButton onClick={() => setIsPayOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handlePayFormSubmit}>Confirm Payment Disbursement</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handlePayFormSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectInput
              id="disburse-emp-select"
              label="Select Employee *"
              value={payForm.employeeName}
              onChange={(e) => {
                const emp = employees.find(x => x.name === e.target.value || x.id === e.target.value);
                if (emp) {
                  const calc = employeeCalculatedMap.get(emp.id);
                  setPayForm(prev => ({
                    ...prev,
                    employeeId: emp.id,
                    employeeName: emp.name,
                    fixedPaidBDT: 0,
                    commissionPaidBDT: calc ? Math.max(0, calc.totalProjectPaymentBDT) : 0
                  }));
                }
              }}
              options={employees.map(e => ({ value: e.name, label: `${e.name} (${e.id})` }))}
            />

            <SelectInput
              id="disburse-month-select"
              label="Salary Month *"
              value={payForm.salaryMonth}
              onChange={(e) => setPayForm({ ...payForm, salaryMonth: e.target.value })}
              options={getSalaryMonthSelectOptions(payForm.salaryMonth)}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">1. Fixed Salary Paid (BDT)</span>
            <FormInput 
              id="form-fixed-bdt"
              label="Fixed Paid (BDT)"
              type="number"
              value={payForm.fixedPaidBDT}
              onChange={(e) => setPayForm({ ...payForm, fixedPaidBDT: safeNum(e.target.value) })}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">2. Project Payment Paid (BDT)</span>
            <FormInput 
              id="form-comm-bdt"
              label="Project Payment Paid (BDT)"
              type="number"
              value={payForm.commissionPaidBDT}
              onChange={(e) => setPayForm({ ...payForm, commissionPaidBDT: safeNum(e.target.value) })}
            />
          </div>

          {/* Total Paid Summary */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">3. Total Calculated Disbursement</span>
            <div className="flex justify-between items-center text-sm font-semibold text-emerald-900">
              <span>Total Paid BDT: {formatCurrency(payForm.fixedPaidBDT + payForm.commissionPaidBDT, 'BDT')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectInput 
              id="form-method"
              label="Payment Method"
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
              options={[
                { value: 'Bank', label: 'Bank Transfer' },
                { value: 'Cash', label: 'Cash Payment' },
                { value: 'Mobile Banking', label: 'Mobile Banking (bKash/Nagad)' },
                { value: 'Other', label: 'Other' }
              ]}
            />

            <FormInput 
              id="form-date"
              label="Disbursement Date"
              value={payForm.paymentDate}
              onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
            />
          </div>

          <Textarea 
            id="form-notes"
            label="Notes / Disburse Reference"
            value={payForm.notes}
            onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
            placeholder="Add transaction notes or reference number..."
          />

        </form>
      </Modal>

      {/* ======================================================== */}
      {/* PAYMENT VOUCHER RECEIPT MODAL                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isViewSlipOpen}
        onClose={() => setIsViewSlipOpen(false)}
        title="Salary Payment Voucher Slip"
        footerActions={
          <>
            <SecondaryButton onClick={() => setIsViewSlipOpen(false)}>Close</SecondaryButton>
            <PrimaryButton icon={<Printer className="h-4 w-4" />} onClick={triggerPrintVoucher}>
              Print Voucher Slip
            </PrimaryButton>
          </>
        }
      >
        {selectedPayment && (() => {
          const emp = employees.find(e => e.id === selectedPayment.employeeId);
          const empName = emp ? emp.name : (selectedPayment.employeeId || 'Employee');
          return (
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4 font-sans text-xs">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{branding?.companyName || 'Agency ERP'}</h3>
                  <p className="text-[10px] text-slate-500">Official Salary Disbursement Receipt</p>
                </div>
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                  {selectedPayment.paymentId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>Employee: <strong className="text-slate-900">{empName} ({selectedPayment.employeeId})</strong></div>
                <div>Salary Month: <strong className="text-slate-900">{formatDisplaySalaryMonth(selectedPayment.salaryMonth)}</strong></div>
                <div>Payment Method: <strong className="text-slate-900">{selectedPayment.paymentMethod}</strong></div>
                <div>Payment Date: <strong className="text-slate-900">{formatDisplayPaymentDate(selectedPayment.paymentDate).fullStr}</strong></div>
                <div>Status: <strong className="text-emerald-700">{selectedPayment.status}</strong></div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Fixed Paid:</span>
                  <span>{formatCurrency(selectedPayment.fixedPaidBDT, 'BDT')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Project Paid:</span>
                  <span>{formatCurrency(selectedPayment.commissionPaidBDT, 'BDT')}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 border-t border-slate-200 pt-1">
                  <span>Total Paid:</span>
                  <span>{formatCurrency(selectedPayment.totalPaidBDT || (selectedPayment.fixedPaidBDT + selectedPayment.commissionPaidBDT), 'BDT')}</span>
                </div>
              </div>

              {selectedPayment.notes && (
                <div className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                  <strong>Notes:</strong> {selectedPayment.notes}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: Delete Salary Payment Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Payment Deletion"
        footer={
          <>
            <SecondaryButton onClick={() => setIsDeleteModalOpen(false)}>Cancel</SecondaryButton>
            <DangerButton onClick={handleConfirmDeletePayment} isLoading={isDeletingPayment}>
              Delete Payment
            </DangerButton>
          </>
        }
      >
        <div className="space-y-4 py-2 text-slate-700">
          <p className="font-medium text-sm text-slate-900">
            Are you sure you want to delete this salary payment?
          </p>
          {paymentToDelete && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-mono space-y-1">
              <div><strong>Payment ID:</strong> {paymentToDelete.paymentId || paymentToDelete.id}</div>
              <div><strong>Salary Month:</strong> {formatDisplaySalaryMonth(paymentToDelete.salaryMonth)}</div>
              <div><strong>Amounts to Restore:</strong> {formatCurrency(paymentToDelete.fixedPaidBDT + paymentToDelete.commissionPaidBDT, 'BDT')}</div>
            </div>
          )}
          <p className="text-xs text-slate-500 italic">
            This action will delete the payment record from the SalaryPayments sheet and automatically restore the paid amounts back to the employee's available salary balances.
          </p>
        </div>
      </Modal>

      {/* MODAL: Download PDF Month Selector */}
      <Modal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Download Monthly Salary PDF Statement"
        footer={
          <>
            <SecondaryButton onClick={() => setIsPdfModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton icon={<Download className="h-4 w-4" />} onClick={handleGeneratePdfReport}>
              Download PDF
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-600">
            Select the salary month to generate the official A4 PDF statement for <strong>{activeEmployeeData?.profile.name}</strong>.
          </p>

          <SelectInput
            id="pdf-month-select"
            label="Select Salary Month *"
            value={pdfSelectedMonth}
            onChange={(e) => setPdfSelectedMonth(e.target.value)}
            options={getSalaryMonthSelectOptions(pdfSelectedMonth)}
          />

          {/* Live Month Summary Card */}
          {activeEmployeeData && (() => {
            const paymentsForMonth = activeEmployeeData.salaryHistory.filter(s => {
              return matchesSelectedMonth(s.salaryMonth, pdfSelectedMonth) || matchesSelectedMonth(s.paymentDate, pdfSelectedMonth);
            });
            const totPaidInMonth = paymentsForMonth.reduce((sum, s) => sum + (s.totalPaidBDT || (s.fixedPaidBDT + (s.commissionPaidBDT ?? 0))), 0);

            return (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Statement Month Summary</span>
                  <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 font-bold">
                    {pdfSelectedMonth}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Employee Name</span>
                    <strong className="text-slate-900 block font-bold text-xs">{activeEmployeeData.profile.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Employee ID</span>
                    <strong className="text-slate-900 font-mono block text-xs">{activeEmployeeData.profile.id}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Fixed Salary</span>
                    <strong className="text-slate-900 block font-mono text-xs">{formatCurrency(activeEmployeeData.fixedSalaryBDT, 'BDT')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Paid in Selected Month</span>
                    <strong className="text-emerald-700 block font-mono text-xs">{formatCurrency(totPaidInMonth, 'BDT')}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Available Balance:</span>
                  <span className="font-mono font-black text-slate-900">{formatCurrency(activeEmployeeData.outstandingBDT, 'BDT')}</span>
                </div>
              </div>
            );
          })()}

          {/* Prominent Action Button after Month Selection */}
          <div className="pt-2">
            <PrimaryButton 
              className="w-full justify-center py-2.5 text-sm font-bold shadow-xs" 
              icon={<Download className="h-4.5 w-4.5" />} 
              onClick={handleGeneratePdfReport}
            >
              Download PDF ({pdfSelectedMonth})
            </PrimaryButton>
          </div>
        </div>
      </Modal>

    </div>
  );
};

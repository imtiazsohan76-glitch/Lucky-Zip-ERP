/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PageId =
  | 'dashboard'
  | 'clients'
  | 'employees'
  | 'projects'
  | 'income'
  | 'expenses'
  | 'salaries'
  | 'settings'
  | 'activity';

export interface Client {
  id: string; // Client ID
  createdDate?: string;
  createdTime?: string;
  clientName: string; // Client Name
  name?: string; // Aliased for backwards compatibility
  companyName: string; // Company Name
  company?: string; // Aliased for backwards compatibility
  email: string;
  status: 'Active' | 'Inactive' | 'Deleted' | string;
  notes?: string;
  projectsCount?: number;
}

export interface Employee {
  id: string; // Employee ID
  employeeId?: string;
  createdDate?: string;
  createdTime?: string;
  employeeName: string; // Employee Name
  name: string; // Aliased for UI convenience
  email: string;
  phone: string;
  designation: string; // Designation
  role?: string;
  joiningDate: string;
  salaryType: 'Fixed Salary' | 'Project Payment' | 'Fixed Salary + Project Payment' | string;
  fixedSalary: number; // Fixed Salary
  status: 'Active' | 'Inactive' | 'Deleted' | string;
  notes?: string;
  currency?: 'BDT' | 'USD';
  salary?: number;
}

export interface Project {
  id: string; // Project ID
  projectId?: string;
  createdDate?: string;
  createdTime?: string;
  clientId: string;
  clientName: string;
  projectName: string; // Project Name
  name: string; // Aliased for UI convenience
  currency: 'BDT' | 'USD';
  amount: number; // Amount
  vatAmount: number; // VAT Amount
  startDate: string;
  endDate: string;
  assignedEmployeeIds: string; // Comma separated or stringified
  assignedEmployeeNames: string; // Comma separated or stringified
  employeePaymentDetails?: string; // EMP-000001=500|EMP-000002=300
  totalEmployeePayment?: number; // Total amount for all assigned employees
  status: 'Pending' | 'Running' | 'Completed' | 'Cancelled' | 'Deleted' | string;
  notes?: string;
  // UI helper props
  assignedEmployees?: string[];
  budget?: number;
  priceBDT?: number;
  priceUSD?: number;
}

export interface Income {
  id: string; // Income ID
  incomeId?: string;
  createdDate?: string;
  createdTime?: string;
  incomeSource: string;
  name: string;
  currency: 'BDT' | 'USD';
  amount: number;
  paymentMethod: string;
  status: 'Paid' | 'Pending' | 'Cancelled' | 'Deleted' | string;
  notes?: string;
  amountBDT?: number;
  amountUSD?: number;
}

export interface Expense {
  id: string; // Expense ID
  expenseId?: string;
  createdDate?: string;
  createdTime?: string;
  category: string;
  customCategory?: string;
  currency: 'BDT' | 'USD';
  amount: number;
  paymentMethod: string;
  status: 'Paid' | 'Pending' | 'Deleted' | string;
  notes?: string;
  amountBDT?: number;
  amountUSD?: number;
}

// Transaction interface kept for unified Income/Expense views if needed
export interface Transaction {
  id: string;
  date?: string;
  createdDate?: string;
  createdTime?: string;
  category?: string;
  customCategory?: string;
  incomeSource?: string;
  name?: string;
  projectName?: string;
  clientName?: string;
  description?: string;
  amount: number;
  amountBDT?: number;
  amountUSD?: number;
  currency: 'BDT' | 'USD';
  paymentMethod?: string;
  status: string;
  notes?: string;
}

export interface User {
  userId: string;
  createdDate?: string;
  createdTime?: string;
  fullName: string;
  email: string;
  username: string;
  password?: string;
  role: string;
  status: string;
  token?: string;
}

export interface SalaryPayment {
  id: string; // Salary ID / Payment ID
  salaryId?: string;
  paymentId?: string;
  createdDate?: string;
  createdTime?: string;
  employeeId: string;
  employeeName: string;
  salaryMonth: string;
  currency?: 'BDT' | 'USD' | string;
  amount: number;
  previousBalance?: number;
  currentBalance?: number;
  paymentMethod: string;
  paymentDate: string;
  status: 'Paid' | 'Partial' | 'Pending' | 'Deleted' | string;
  projectName?: string;
  notes?: string;

  // Backward compatibility fields
  fixedSalary?: number;
  projectPayment?: number;
  totalPaid?: number;
  fixedPaidBDT?: number;
  projectPaidBDT?: number;
  commissionPaidBDT?: number;
  totalPaidBDT?: number;
}

export interface SystemSettings {
  vatPercent: number;
  usdExchangeRate: number;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
}

export interface Activity {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}


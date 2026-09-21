/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Employee, Project, Transaction, SalaryPayment, Activity } from './types';

export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_INCOME: Transaction[] = [];
export const INITIAL_EXPENSES: Transaction[] = [];
export const INITIAL_SALARIES: SalaryPayment[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];

export const CALCULATED_METRICS = {
  totalIncomeBDT: 0,
  totalIncomeUSD: 0,
  totalExpenseBDT: 0,
  totalExpenseUSD: 0,
  netProfitBDT: 0,
  netProfitUSD: 0,
  totalVATPercent: 15,
  totalVATValueBDT: 0,
  totalClients: 0,
  totalEmployees: 0,
  totalProjects: 0
};

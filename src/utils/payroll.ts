/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const safeNum = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

/**
 * Shared helper function to format currency values without forced trailing zeros.
 * Preserves exact stored decimal values (e.g., 14.4, 9.6, 4.8, 15, 20, 100).
 */
export function formatCurrency(
  val: number | string | undefined | null,
  currency?: 'BDT' | 'USD' | string
): string {
  if (val === undefined || val === null || val === '') {
    return currency ? ((currency === 'USD' || currency === '$') ? '$0' : '৳0') : '0';
  }
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) {
    return currency ? ((currency === 'USD' || currency === '$') ? '$0' : '৳0') : '0';
  }

  // Preserve up to 2 decimal places if they exist, without forcing trailing zeros
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  if (!currency) return formatted;
  const symbol = (currency === 'USD' || currency === '$') ? '$' : '৳';
  return `${symbol}${formatted}`;
}

/**
 * Helper to parse employee payment details string (e.g. "EMP-000001=500|EMP-000002=300")
 */
export function parseEmployeePaymentDetails(details: string | undefined | null): Record<string, number> {
  if (!details || typeof details !== 'string') return {};
  const map: Record<string, number> = {};
  const pairs = details.split('|');
  for (const pair of pairs) {
    if (!pair.trim()) continue;
    const [empId, amountStr] = pair.split('=');
    if (empId && amountStr) {
      const amt = Number(amountStr);
      if (!isNaN(amt)) {
        map[empId.trim()] = amt;
      }
    }
  }
  return map;
}

/**
 * Helper to format employee payment details object to string (e.g. "EMP-000001=500|EMP-000002=300")
 */
export function formatEmployeePaymentDetails(map: Record<string, number>): string {
  if (!map) return '';
  return Object.entries(map)
    .filter(([_, amt]) => typeof amt === 'number' && !isNaN(amt))
    .map(([empId, amt]) => `${empId.trim()}=${amt}`)
    .join('|');
}

export function parseSalaryType(raw?: any): 'Fixed Salary' | 'Project Payment' | 'Fixed Salary + Project Payment' {
  if (!raw) return 'Fixed Salary';
  const str = String(raw).trim();
  const lower = str.toLowerCase();
  if (lower.includes('fixed') && (lower.includes('project') || lower.includes('commission') || lower.includes('+'))) {
    return 'Fixed Salary + Project Payment';
  }
  if (lower.includes('project') || lower.includes('commission')) {
    return 'Project Payment';
  }
  return 'Fixed Salary';
}

export function calculateSalaryPaymentsOutstanding(
  employeesRaw: any[],
  projectsRaw: any[],
  salariesRaw: any[]
) {
  const employees = (employeesRaw || []).map((e: any, idx: number) => {
    return {
      id: e.id || e.employeeId || `EMP-00000${idx + 1}`,
      name: e.name || e.employeeName || 'Staff Member',
      role: e.role || e.designation || 'Specialist',
      department: e.department || 'Operations',
      email: e.email || '',
      phone: e.phone || '',
      joiningDate: e.joiningDate || '',
      salaryType: parseSalaryType(e.salaryType || e['Salary Type'] || e.SalaryType || e.salary_type || e.Salary_Type || e.type || e.paymentType || ''),
      status: (e.status || 'active').toString().toLowerCase(),
      fixedSalaryBDT: safeNum(e.fixedSalaryBDT ?? e.fixedSalary ?? e.salaryBDT ?? (e.currency === 'BDT' ? e.salary : 0)),
      fixedSalaryUSD: safeNum(e.fixedSalaryUSD ?? e.salaryUSD ?? (e.currency === 'USD' ? e.salary : 0))
    };
  });

  const projects = (projectsRaw || []).map((p: any, idx: number) => {
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
      currency: (p.currency === 'USD' ? 'USD' : 'BDT'),
      status: (p.status || 'running').toString().toLowerCase(),
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      assignedEmployees: assignedNames,
      assignedEmployeeNames: assignedNames,
      assignedEmployeeIds: (p as any).assignedEmployeeIds || [],
      employeePaymentDetails: p.employeePaymentDetails || ''
    };
  });

  const salaries = (salariesRaw || []).map((sal: any, idx: number) => {
    const pid = sal.salaryId || sal.paymentId || sal['Payment ID'] || sal.id || `PAY-${idx + 1}`;
    const empId = sal.employeeId || sal['Employee ID'] || '';
    const fPaidBDT = safeNum(sal.fixedSalary ?? sal.fixedPaidBDT ?? sal['Fixed Paid (BDT)'] ?? 0);
    const pPaidBDT = safeNum(sal.projectPayment ?? sal.commissionPaidBDT ?? sal['Earn (BDT)'] ?? 0);
    const status = sal.status || sal['Status'] || sal.paymentStatus || 'Paid';

    return {
      id: pid,
      paymentId: pid,
      employeeId: empId,
      fixedPaidBDT: fPaidBDT,
      projectPaidBDT: pPaidBDT,
      status: status
    };
  });

  let totOutstandingBDT = 0;
  let totOutstandingUSD = 0;

  employees.forEach(emp => {
    const empProjects = projects.filter(p => {
      const status = (p.status || '').toLowerCase();
      if (status === 'deleted' || status === 'archived') return false;

      const paymentMap = parseEmployeePaymentDetails(p.employeePaymentDetails);
      if (paymentMap[emp.id] !== undefined) return true;

      const names = p.assignedEmployees || p.assignedEmployeeNames || [];
      const ids = p.assignedEmployeeIds || [];

      const isNameMatch = Array.isArray(names) && names.some(n => n.toLowerCase() === emp.name.toLowerCase());
      const isIdMatch = Array.isArray(ids) && ids.some(id => id === emp.id);

      return isNameMatch || isIdMatch;
    });

    const completedPrjs = empProjects.filter(p => p.status === 'completed');

    const projectPaymentHistory = completedPrjs.map((p, idx) => {
      const paymentMap = parseEmployeePaymentDetails(p.employeePaymentDetails);
      const payAmt = paymentMap[emp.id] ?? paymentMap[emp.name] ?? 0;

      return {
        id: `PROJPAY-${p.id}-${idx}`,
        amount: payAmt
      };
    });

    const totalEarnedProjectPaymentBDT = projectPaymentHistory.reduce((sum, c) => sum + c.amount, 0);
    const totalEarnedProjectPaymentUSD = 0;

    const empSalaries = salaries.filter(s =>
      (s.status || '').toLowerCase() !== 'deleted' && (
        (s.employeeId && s.employeeId.toLowerCase() === emp.id.toLowerCase())
      )
    );

    const totalFixedPaidBDT = empSalaries.reduce((sum, s) => sum + s.fixedPaidBDT, 0);
    const totalProjectPaidBDT = empSalaries.reduce((sum, s) => sum + s.projectPaidBDT, 0);

    const baseFixedSalaryBDT = emp.fixedSalaryBDT || 0;
    const baseFixedSalaryUSD = emp.fixedSalaryUSD || 0;

    const fixedSalaryDueBDT = Math.max(0, baseFixedSalaryBDT - totalFixedPaidBDT);
    const projectPaymentBalanceBDT = Math.max(0, totalEarnedProjectPaymentBDT - totalProjectPaidBDT);

    const totalAvailableBalanceBDT = fixedSalaryDueBDT + projectPaymentBalanceBDT;

    totOutstandingBDT += totalAvailableBalanceBDT;
    totOutstandingUSD += baseFixedSalaryUSD + Math.max(0, totalEarnedProjectPaymentUSD);
  });

  return {
    totOutstandingBDT,
    totOutstandingUSD
  };
}


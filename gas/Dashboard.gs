/**
 * @file Dashboard.gs
 * @description Dashboard metrics and aggregated financial reporting analytics.
 */

/**
 * Aggregates summary analytics for the main executive dashboard view.
 *
 * @returns {Object} Dashboard metrics summary (revenue, expenses, active projects, counts).
 */
function getDashboardSummary() {
  try {
    const prjRes = getProjects({});
    const projects = Array.isArray(prjRes) ? prjRes : ((prjRes && prjRes.data) || []);

    const salRes = getSalaryPayments();
    const salaryPayments = Array.isArray(salRes) ? salRes : ((salRes && salRes.data) || []);

    const expRes = getExpenses();
    const expenses = Array.isArray(expRes) ? expRes : ((expRes && expRes.data) || []);

    const incRes = getIncomes({});
    const incomes = Array.isArray(incRes) ? incRes : ((incRes && incRes.data) || []);

    const settings = getSettings() || {};
    const vatRatePercent = Number(settings.taxRate !== undefined ? settings.taxRate : (settings.vatPercentage || settings.vat || 0));

    let projectIncomeBDT = 0;
    let projectIncomeUSD = 0;

    let totalProjCount = 0;
    let pendingProjCount = 0;
    let runningProjCount = 0;
    let completedProjCount = 0;

    // STEP 1: COMPLETED Projects Only for Project Income
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const status = (p.status || '').toString().trim().toLowerCase();

      if (status === 'deleted') continue;
      totalProjCount++;

      if (status === 'pending') {
        pendingProjCount++;
      } else if (status === 'running') {
        runningProjCount++;
      } else if (status === 'completed') {
        completedProjCount++;

        const priceBDT = Number(p.priceBDT || p.priceBdt || 0);
        const priceUSD = Number(p.priceUSD || p.priceUsd || 0);

        if (priceUSD > 0 || (p.currency || '').toString().toUpperCase() === 'USD') {
          const val = priceUSD > 0 ? priceUSD : Number(p.amount || 0);
          projectIncomeUSD += val;
        } else {
          const val = priceBDT > 0 ? priceBDT : Number(p.amount || 0);
          projectIncomeBDT += val;
        }
      }
    }

    // STEP 2: Manual Income entries from Income module
    let manualIncomeBDT = 0;
    let manualIncomeUSD = 0;

    for (let i = 0; i < incomes.length; i++) {
      const inc = incomes[i];
      const status = (inc.status || '').toString().trim().toLowerCase();
      if (status === 'deleted') continue;

      const amtBDT = Number(inc.amountBDT ?? inc.amountBdt ?? 0);
      const amtUSD = Number(inc.amountUSD ?? inc.amountUsd ?? 0);
      const currency = (inc.currency || '').toString().trim().toUpperCase();

      if (amtUSD > 0 || currency === 'USD') {
        const val = amtUSD > 0 ? amtUSD : Number(inc.amount || 0);
        manualIncomeUSD += val;
      } else {
        const val = amtBDT > 0 ? amtBDT : Number(inc.amount || 0);
        manualIncomeBDT += val;
      }
    }

    // Total Income = Project Income + Manual Income
    const incomeBDT = projectIncomeBDT + manualIncomeBDT;
    const incomeUSD = projectIncomeUSD + manualIncomeUSD;

    // STEP 3: VAT Calculated ONLY from Completed Projects and Settings VAT %
    const vatBDT = +((projectIncomeBDT * (vatRatePercent / 100))).toFixed(2);
    const vatUSD = +((projectIncomeUSD * (vatRatePercent / 100))).toFixed(2);

    // STEP 4: Project Payment (SUM Total Employee Payment from Completed Projects and SalaryPayments - ALWAYS BDT)
    let projectPaymentFromProjectsBDT = 0;
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const status = (p.status || '').toString().trim().toLowerCase();
      if (status === 'completed') {
        const totEmpPay = Number(p.totalEmployeePayment || 0);
        projectPaymentFromProjectsBDT += totEmpPay;
      }
    }

    let projectPaymentFromSalariesBDT = 0;
    let employeeAdjustmentsBDT = 0;

    for (let i = 0; i < salaryPayments.length; i++) {
      const sal = salaryPayments[i];
      const status = (sal.status || '').toString().trim().toLowerCase();
      if (status === 'deleted') continue;

      const method = (sal.paymentMethod || '').toString().toLowerCase();
      const salId = (sal.salaryId || sal.paymentId || '').toString().toUpperCase();

      if (method === 'adjustment' || salId.indexOf('ADJ-') === 0) {
        employeeAdjustmentsBDT += Number(sal.amount ?? 0);
      } else {
        const projPay = Number(sal.amount ?? sal.projectPayment ?? sal.commissionPaidBDT ?? 0);
        projectPaymentFromSalariesBDT += projPay;
      }
    }

    const projectPaymentBDT = Math.max(projectPaymentFromProjectsBDT, projectPaymentFromSalariesBDT);
    const projectPaymentUSD = 0; // Employee Project Payment is ALWAYS BDT

    // STEP 5: Expenses
    let expenseBDT = 0;
    let expenseUSD = 0;

    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      const status = (e.status || '').toString().trim().toLowerCase();
      if (status === 'deleted') continue;

      const amt = Number(e.amount || e.amountBDT || 0);
      const currency = (e.currency || 'BDT').toString().toUpperCase();

      if (currency === 'USD') {
        expenseUSD += amt;
      } else {
        expenseBDT += amt;
      }
    }

    // STEP 6: Profit = Total Income - VAT - Project Payment - Expense - Employee Adjustments
    const profitBDT = incomeBDT - vatBDT - projectPaymentBDT - expenseBDT - employeeAdjustmentsBDT;
    const profitUSD = incomeUSD - vatUSD - projectPaymentUSD - expenseUSD - employeeAdjustmentsBDT;

    return {
      vatRatePercent: vatRatePercent,
      grossIncomeBDT: incomeBDT,
      grossIncomeUSD: incomeUSD,
      incomeBDT: incomeBDT,
      incomeUSD: incomeUSD,
      vatBDT: vatBDT,
      vatUSD: vatUSD,
      projectPaymentBDT: projectPaymentBDT,
      projectPaymentUSD: projectPaymentUSD,
      commissionBDT: projectPaymentBDT, // Backwards-compat
      commissionUSD: projectPaymentUSD,
      expenseBDT: expenseBDT,
      expenseUSD: expenseUSD,
      employeeAdjustmentsBDT: employeeAdjustmentsBDT,
      profitBDT: profitBDT,
      profitUSD: profitUSD,
      totalProjects: totalProjCount,
      pendingProjects: pendingProjCount,
      runningProjects: runningProjCount,
      completedProjects: completedProjCount
    };
  } catch (error) {
    Logger.log("getDashboardSummary error: " + error.toString());
    return {};
  }
}

/**
 * Generates financial overview breakdown (income vs expenses, profit margins).
 *
 * @param {string} [timeframe='year'] - Timeframe filter ('month', 'quarter', 'year').
 * @returns {Object} Financial overview object.
 */
function getFinancialOverview(timeframe) {
  return getDashboardSummary();
}


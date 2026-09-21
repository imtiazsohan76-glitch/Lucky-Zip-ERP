/**
 * @file Code.gs
 * @description Main entry point for Google Apps Script Web Application endpoints.
 */

/**
 * Handles HTTP GET requests sent to the Web App URL.
 *
 * @param {GoogleAppsScript.Events.DoGet} e - Event parameter containing HTTP query parameters.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response.
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
    const payload = (e && e.parameter) ? e.parameter : {};

    if (!action || action === 'health') {
      return responseSuccess({
        status: 'active',
        app: 'Agency ERP Backend',
        version: '1.0.0'
      }, 'Service is operational');
    }

    return handleRoute(action, payload);
  } catch (error) {
    return responseError('GET Request Error: ' + error.message, 500);
  }
}

/**
 * Handles HTTP POST requests sent to the Web App URL.
 *
 * @param {GoogleAppsScript.Events.DoPost} e - Event parameter containing HTTP post data.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseError('Missing POST request body payload', 400);
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return responseError('Invalid JSON format in request body', 400);
    }

    const action = payload.action || (e.parameter ? e.parameter.action : '');
    if (!action || action === 'health') {
      return responseSuccess({
        status: 'active',
        app: 'Agency ERP Backend',
        version: '1.0.0'
      }, 'Service is operational');
    }

    return handleRoute(action, payload);
  } catch (error) {
    return responseError('POST Request Error: ' + error.message, 500);
  }
}

/**
 * Route dispatcher to route actions to appropriate module functions.
 *
 * @param {string} action - Action identifier string.
 * @param {Object} payload - Request payload object.
 * @returns {GoogleAppsScript.Content.TextOutput} Result response object.
 */
function handleRoute(action, payload) {
  switch (action) {
    case 'health':
    case '':
      return responseSuccess({
        status: 'active',
        app: 'Agency ERP Backend',
        version: '1.0.0'
      }, 'Service is operational');

    // AUTH
    case 'login':
      return loginUser(payload.username, payload.password);

    case 'logout':
      return logoutUser(payload.token, payload.user || payload);

    case 'verifySession':
      const session = verifySession(payload.token);
      if (session) {
        return responseSuccess(session, 'Session is active and valid');
      } else {
        return responseError('Invalid or expired session', 401);
      }

    case 'resetPassword':
      return resetPassword(payload.username || payload.email);

    // CLIENTS
    case 'getClients':
      return getClients(payload);

    case 'getClientById':
      return getClientById(payload.id || payload.clientId);

    case 'addClient':
      return addClient(payload);

    case 'updateClient':
      return updateClient(payload);

    case 'deleteClient':
      return deleteClient(payload);

    // EMPLOYEES
    case 'getEmployees':
      return getEmployees(payload);

    case 'getEmployeeById':
      return getEmployeeById(payload.id || payload.employeeId);

    case 'addEmployee':
      return addEmployee(payload);

    case 'updateEmployee':
      return updateEmployee(payload);

    case 'deleteEmployee':
      return deleteEmployee(payload);

    // PROJECTS
    case 'getProjects':
      return getProjects(payload);

    case 'getProjectById':
      return getProjectById(payload.id || payload.projectId);

    case 'addProject':
      return addProject(payload);

    case 'updateProject':
      return updateProject(payload);

    case 'deleteProject':
      return deleteProject(payload);

    // INCOME
    case 'getIncome':
    case 'getIncomes':
      return getIncomes(payload);

    case 'getIncomeById':
      return getIncomeById(payload.id || payload.incomeId);

    case 'addIncome':
      return addIncome(payload);

    case 'updateIncome':
      return updateIncome(payload);

    case 'deleteIncome':
      return deleteIncome(payload);

    // EXPENSES
    case 'getExpenses':
    case 'getExpense':
      return getExpenses(payload);

    case 'getExpenseById':
      return getExpenseById(payload.id || payload.expenseId);

    case 'addExpense':
      return addExpense(payload);

    case 'updateExpense':
      return updateExpense(payload);

    case 'deleteExpense':
      return deleteExpense(payload);

    // SALARY
    case 'getSalary':
    case 'getSalaryPayments':
    case 'getSalaries':
      return responseSuccess(getSalaryPayments() || [], 'Salary payments retrieved');

    case 'getSalaryPaymentById':
    case 'getSalaryById':
      return responseSuccess(getSalaryPaymentById(payload.id || payload.salaryId) || null, 'Salary payment retrieved');

    case 'addSalary':
    case 'addSalaryPayment':
      return responseSuccess(addSalaryPayment(payload) || {}, 'Salary payment added');

    case 'updateSalary':
    case 'updateSalaryPayment':
      return responseSuccess(updateSalaryPayment(payload) || {}, 'Salary payment updated');

    case 'deleteSalary':
    case 'deleteSalaryPayment':
      return responseSuccess(deleteSalaryPayment(payload) || true, 'Salary payment deleted');

    // SETTINGS
    case 'getSettings':
      return responseSuccess(getSettings() || {}, 'Settings retrieved');

    case 'saveSettings':
    case 'updateSettings':
      return responseSuccess(updateSettings(payload) || {}, 'Settings saved');

    // ACTIVITY LOG
    case 'getActivityLogs':
      return responseSuccess(getActivityLogs(payload ? payload.limit : 100) || [], 'Activity logs retrieved');

    case 'addActivityLog':
    case 'writeActivityLog':
      writeActivityLog(
        payload.userId || payload.user || 'SYSTEM',
        payload.action || 'ACTIVITY',
        payload.module || 'System',
        payload.recordId || payload.details || '',
        payload.description || payload.details || '',
        payload.oldValue || '',
        payload.newValue || ''
      );
      return responseSuccess({ status: 'logged' }, 'Activity log recorded');

    // DASHBOARD & ANALYTICS
    case 'getDashboardSummary':
      return responseSuccess(getDashboardSummary() || {}, 'Dashboard summary retrieved');

    case 'getFinancialOverview':
      return responseSuccess(getFinancialOverview(payload ? payload.timeframe : 'year') || {}, 'Financial overview retrieved');

    default:
      return responseError('Unknown or unsupported backend action: ' + action, 404);
  }
}

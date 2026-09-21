/**
 * @file Employees.gs
 * @description Complete Employees management module CRUD handlers for Agency ERP backend.
 */

/**
 * Validates email format using regex. Allows empty email.
 *
 * @param {string} email - Email address string to validate.
 * @returns {boolean} True if email is valid or empty, false otherwise.
 */
function isEmployeeValidEmail(email) {
  if (!email || email.toString().trim() === '') {
    return true;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toString().trim());
}

/**
 * Gets active status constant from CONFIG.STATUS if available, or fallback.
 *
 * @returns {string} Default active status ('Active').
 */
function getEmployeeActiveStatus() {
  if (typeof CONFIG !== 'undefined' && CONFIG.STATUS && CONFIG.STATUS.EMPLOYEE && CONFIG.STATUS.EMPLOYEE.ACTIVE) {
    return CONFIG.STATUS.EMPLOYEE.ACTIVE;
  }
  return 'Active';
}

/**
 * Gets deleted status constant from CONFIG.STATUS if available, or fallback.
 *
 * @returns {string} Deleted status ('Deleted').
 */
function getEmployeeDeletedStatus() {
  if (typeof CONFIG !== 'undefined' && CONFIG.STATUS && CONFIG.STATUS.EMPLOYEE && CONFIG.STATUS.EMPLOYEE.DELETED) {
    return CONFIG.STATUS.EMPLOYEE.DELETED;
  }
  return 'Deleted';
}

/**
 * Helper function to map a row array from the Employees sheet to an employee record object.
 * Exactly matches sheet columns (12 columns):
 * 1. Employee ID | 2. Created Date | 3. Created Time | 4. Employee Name | 5. Email | 6. Phone | 7. Designation
 * 8. Joining Date | 9. Salary Type | 10. Fixed Salary | 11. Status | 12. Notes
 *
 * @param {Array} row - Row data array from Google Sheets.
 * @returns {Object} Structured employee object.
 */
function mapRowToEmployee(row) {
  let joinDt = '';
  if (row[7] !== undefined && row[7] !== null && row[7] !== '') {
    if (row[7] instanceof Date) {
      const ssTz = (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getActiveSpreadsheet)
        ? SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone()
        : ((typeof Session !== 'undefined' && Session.getScriptTimeZone) ? Session.getScriptTimeZone() : 'GMT');
      joinDt = Utilities.formatDate(row[7], ssTz, 'yyyy-MM-dd');
    } else {
      const rawStr = row[7].toString().trim();
      const match = rawStr.match(/^(\d{4}-\d{2}-\d{2})/);
      joinDt = match ? match[1] : rawStr;
    }
  }

  const fixedSal = row[9] !== undefined && row[9] !== null && row[9] !== '' ? Number(row[9]) : 0;
  const nameVal = row[3] ? row[3].toString().trim() : '';
  const desigVal = row[6] ? row[6].toString().trim() : '';
  const idVal = row[0] ? row[0].toString().trim() : '';
  const rawSalType = row[8] ? row[8].toString().trim() : 'Fixed Salary';
  const salDetails = normalizeSalaryData(rawSalType, fixedSal);
  const salType = salDetails.salaryType;

  return {
    employeeId: idVal,
    id: idVal,
    createdDate: row[1] ? row[1].toString().trim() : '',
    createdTime: row[2] ? row[2].toString().trim() : '',
    name: nameVal,
    employeeName: nameVal,
    fullName: nameVal,
    email: row[4] ? row[4].toString().trim() : '',
    phone: row[5] ? row[5].toString().trim() : '',
    designation: desigVal,
    role: desigVal,
    joiningDate: joinDt,
    joinDate: joinDt,
    salaryType: salType,
    fixedSalary: salDetails.fixedSalary,
    salary: salDetails.fixedSalary,
    amount: salDetails.fixedSalary,
    fixedSalaryBdt: salDetails.fixedSalary,
    fixedSalaryUsd: 0,
    status: row[10] ? row[10].toString().trim() : '',
    notes: row[11] ? row[11].toString().trim() : ''
  };
}

/**
 * Normalizes salary values based on the Salary Type rules:
 * - Fixed Salary
 * - Project Payment
 * - Fixed Salary + Project Payment
 */
function normalizeSalaryData(salaryType, fixedSalary) {
  let type = (salaryType || 'Fixed Salary').toString().trim();
  let sal = Number(fixedSalary) || 0;

  const lowerType = type.toLowerCase();

  if (lowerType === 'fixed salary + project payment' || (lowerType.includes('fixed') && (lowerType.includes('project') || lowerType.includes('commission') || lowerType.includes('+')))) {
    type = 'Fixed Salary + Project Payment';
  } else if (lowerType === 'project' || lowerType === 'project payment' || lowerType === 'project-payment' || lowerType === 'commission') {
    sal = 0;
    type = 'Project Payment';
  } else if (lowerType === 'fixed' || lowerType === 'fixed salary' || lowerType === 'fixed only') {
    type = 'Fixed Salary';
  }

  return {
    salaryType: type,
    fixedSalary: sal
  };
}


/**
 * Retrieves employee records from the Employees sheet with optional search and status filtering.
 * Excludes soft-deleted employees by default unless explicitly requested.
 *
 * @param {Object|string} [param1] - Parameters object OR search query string.
 * @param {string} [param2] - Status filter string (if param1 is search string).
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output containing employee list.
 */
function getEmployees(param1, param2) {
  try {
    let searchQuery = '';
    let statusFilter = '';

    if (typeof param1 === 'object' && param1 !== null) {
      searchQuery = param1.search || param1.query || param1.searchQuery || '';
      statusFilter = param1.status || param1.statusFilter || '';
    } else {
      searchQuery = param1 || '';
      statusFilter = param2 || '';
    }

    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EMPLOYEES)
      ? CONFIG.SHEET_NAMES.EMPLOYEES
      : 'Employees';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return responseSuccess([], 'No employees found');
    }

    const employees = [];
    const deletedStatus = getEmployeeDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const employee = mapRowToEmployee(data[i]);

      // Skip soft deleted employees unless statusFilter explicitly requests 'deleted'
      if (employee.status.toLowerCase() === deletedStatus && statusFilter !== deletedStatus) {
        continue;
      }

      // Apply status filter if provided
      if (statusFilter && statusFilter !== 'all' && employee.status.toLowerCase() !== statusFilter) {
        continue;
      }

      // Apply search query across Name, Designation, Phone, Email, and Employee ID
      if (searchQuery) {
        const matchesSearch =
          employee.name.toLowerCase().indexOf(searchQuery) !== -1 ||
          employee.designation.toLowerCase().indexOf(searchQuery) !== -1 ||
          employee.phone.toLowerCase().indexOf(searchQuery) !== -1 ||
          employee.email.toLowerCase().indexOf(searchQuery) !== -1 ||
          employee.employeeId.toLowerCase().indexOf(searchQuery) !== -1;

        if (!matchesSearch) {
          continue;
        }
      }

      employees.push(employee);
    }

    return responseSuccess(employees, 'Employees retrieved successfully');
  } catch (error) {
    return responseError('Failed to retrieve employees: ' + error.message, 500);
  }
}

/**
 * Retrieves a single employee record by Employee ID.
 *
 * @param {string} id - Unique Employee ID.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output containing employee.
 */
function getEmployeeById(id) {
  if (!id || id.toString().trim() === '') {
    return responseError('Employee ID is required', 400);
  }

  const targetId = id.toString().trim().toLowerCase();

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EMPLOYEES)
      ? CONFIG.SHEET_NAMES.EMPLOYEES
      : 'Employees';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const deletedStatus = getEmployeeDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const employee = mapRowToEmployee(data[i]);
      if (employee.employeeId.toLowerCase() === targetId) {
        if (employee.status.toLowerCase() === deletedStatus) {
          return responseError('Employee not found or deleted', 404);
        }
        return responseSuccess(employee, 'Employee retrieved successfully');
      }
    }

    return responseError('Employee not found', 404);
  } catch (error) {
    return responseError('Failed to retrieve employee: ' + error.message, 500);
  }
}

/**
 * Adds a new employee record to the Employees sheet.
 * Validates required Name, Email format, prevents duplicate Phone and Email,
 * calculates Salary Type constraints, generates sequential Employee ID using generateId("EMP"),
 * populates created date and created time, saves row, and writes Activity Log.
 *
 * @param {Object} employeeData - Object containing employee properties.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output containing created employee.
 */
function addEmployee(employeeData) {
  if (!employeeData || typeof employeeData !== 'object') {
    return responseError('Invalid employee payload data', 400);
  }

  const name = (employeeData.name || employeeData.employeeName || employeeData.fullName || '').toString().trim();
  if (!name) {
    return responseError('Name is required', 400);
  }

  const email = (employeeData.email || '').toString().trim();
  const phone = (employeeData.phone || '').toString().trim();
  const designation = (employeeData.designation || employeeData.role || '').toString().trim();
  const joiningDate = (employeeData.joiningDate || getCurrentDate()).toString().trim();
  const status = (employeeData.status || getEmployeeActiveStatus()).toString().trim();
  const notes = (employeeData.notes || '').toString().trim();
  const userId = employeeData.userId || 'SYSTEM';

  // Extract salary checking aliases
  const rawSal = employeeData.fixedSalary !== undefined 
    ? employeeData.fixedSalary 
    : (employeeData.fixedSalaryBdt !== undefined ? employeeData.fixedSalaryBdt : (employeeData.salary !== undefined ? employeeData.salary : employeeData.amount));

  const inputSalaryType = employeeData.salaryType || employeeData.salary_type || employeeData.type || employeeData.paymentType || employeeData['Salary Type'] || employeeData.SalaryType;

  // Validate Salary Type rules
  const salaryDetails = normalizeSalaryData(
    inputSalaryType,
    rawSal
  );

  // 1. Validate Email format
  if (email && !isEmployeeValidEmail(email)) {
    return responseError('Invalid email format', 400);
  }

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EMPLOYEES)
      ? CONFIG.SHEET_NAMES.EMPLOYEES
      : 'Employees';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const deletedStatus = getEmployeeDeletedStatus().toLowerCase();

    // 2. Prevent Duplicate Phone & Email against existing non-deleted employees
    for (let i = 1; i < data.length; i++) {
      const existing = mapRowToEmployee(data[i]);
      if (existing.status.toLowerCase() === deletedStatus) {
        continue;
      }

      if (phone && existing.phone && existing.phone.toLowerCase() === phone.toLowerCase()) {
        return responseError('Employee with this phone number already exists', 400);
      }

      if (email && existing.email && existing.email.toLowerCase() === email.toLowerCase()) {
        return responseError('Employee with this email address already exists', 400);
      }
    }

    // Generate Employee ID using generateId("EMP")
    const employeeId = generateId('EMP');

    const createdDate = getCurrentDate();
    const createdTime = getCurrentTime();

    // Row layout according to exact 12 sheet columns:
    // 1. Employee ID | 2. Created Date | 3. Created Time | 4. Employee Name | 5. Email | 6. Phone | 7. Designation
    // 8. Joining Date | 9. Salary Type | 10. Fixed Salary | 11. Status | 12. Notes
    const newRow = [
      employeeId,
      createdDate,
      createdTime,
      name,
      email,
      phone,
      designation,
      joiningDate,
      salaryDetails.salaryType,
      salaryDetails.fixedSalary,
      status,
      notes
    ];

    sheet.appendRow(newRow);

    const createdEmployee = {
      employeeId: employeeId,
      id: employeeId,
      createdDate: createdDate,
      createdTime: createdTime,
      name: name,
      employeeName: name,
      email: email,
      phone: phone,
      designation: designation,
      joiningDate: joiningDate,
      salaryType: salaryDetails.salaryType,
      fixedSalary: salaryDetails.fixedSalary,
      fixedSalaryBdt: salaryDetails.fixedSalary,
      fixedSalaryUsd: 0,
      status: status,
      notes: notes
    };

    writeActivityLog(userId, 'CREATE_EMPLOYEE', 'Employees', employeeId, 'Created Employee', null, createdEmployee);

    return responseSuccess(createdEmployee, 'Employee added successfully');
  } catch (error) {
    return responseError('Failed to add employee: ' + error.message, 500);
  }
}

/**
 * Updates an existing employee record by Employee ID.
 */
function updateEmployee(id, employeeData) {
  let targetId = '';
  let updates = {};

  if (typeof id === 'object' && id !== null) {
    updates = id;
    targetId = updates.employeeId || updates.id || '';
  } else {
    targetId = id;
    updates = employeeData || {};
  }

  if (!targetId) {
    return responseError('Employee ID is required for update', 400);
  }

  if (updates.name !== undefined || updates.employeeName !== undefined || updates.fullName !== undefined) {
    const checkName = (updates.name !== undefined ? updates.name : (updates.employeeName !== undefined ? updates.employeeName : updates.fullName || '')).toString().trim();
    if (!checkName) {
      return responseError('Name is required', 400);
    }
  }

  const userId = updates.userId || 'SYSTEM';

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EMPLOYEES)
      ? CONFIG.SHEET_NAMES.EMPLOYEES
      : 'Employees';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;
    const deletedStatus = getEmployeeDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToEmployee(data[i]);
      if (record.employeeId.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Employee not found', 404);
    }

    const updatedName = (updates.name !== undefined && updates.name !== null && updates.name.toString().trim() !== '')
      ? updates.name.toString().trim()
      : ((updates.employeeName !== undefined && updates.employeeName !== null && updates.employeeName.toString().trim() !== '') 
          ? updates.employeeName.toString().trim() 
          : ((updates.fullName !== undefined && updates.fullName !== null && updates.fullName.toString().trim() !== '') ? updates.fullName.toString().trim() : existingRecord.name));

    const updatedEmail = (updates.email !== undefined) ? updates.email.toString().trim() : existingRecord.email;
    const updatedPhone = (updates.phone !== undefined) ? updates.phone.toString().trim() : existingRecord.phone;
    
    const rawDesig = updates.designation !== undefined ? updates.designation : updates.role;
    const updatedDesignation = (rawDesig !== undefined && rawDesig !== null && rawDesig.toString().trim() !== '') 
      ? rawDesig.toString().trim() 
      : existingRecord.designation;

    const rawJoin = updates.joiningDate !== undefined ? updates.joiningDate : updates.joinDate;
    const updatedJoiningDate = (rawJoin !== undefined && rawJoin !== null && rawJoin.toString().trim() !== '')
      ? rawJoin.toString().trim()
      : existingRecord.joiningDate;

    const updatedStatus = (updates.status !== undefined && updates.status !== null && updates.status.toString().trim() !== '') 
      ? updates.status.toString().trim() 
      : existingRecord.status;

    const updatedNotes = (updates.notes !== undefined) ? updates.notes.toString().trim() : existingRecord.notes;

    const inputSalaryType = updates.salaryType || updates.salary_type || updates.type || updates.paymentType || updates['Salary Type'] || updates.SalaryType;
    const rawSalaryType = (inputSalaryType !== undefined && inputSalaryType !== null && inputSalaryType.toString().trim() !== '') 
      ? inputSalaryType 
      : existingRecord.salaryType;

    const inputSal = updates.fixedSalary !== undefined 
      ? updates.fixedSalary 
      : (updates.fixedSalaryBdt !== undefined ? updates.fixedSalaryBdt : (updates.salary !== undefined ? updates.salary : updates.amount));
    const rawSal = (inputSal !== undefined && inputSal !== null && inputSal !== '' && !isNaN(Number(inputSal)))
      ? Number(inputSal)
      : existingRecord.fixedSalary;

    const salaryDetails = normalizeSalaryData(rawSalaryType, rawSal);

    // 1. Validate Email format
    if (updatedEmail && !isEmployeeValidEmail(updatedEmail)) {
      return responseError('Invalid email format', 400);
    }

    // 2. Prevent Duplicate Phone & Email against other non-deleted employees
    for (let i = 1; i < data.length; i++) {
      const other = mapRowToEmployee(data[i]);
      if (other.employeeId.toLowerCase() === targetId.toString().trim().toLowerCase() || other.status.toLowerCase() === deletedStatus) {
        continue;
      }

      if (updatedPhone && other.phone && other.phone.toLowerCase() === updatedPhone.toLowerCase()) {
        return responseError('Employee with this phone number already exists', 400);
      }

      if (updatedEmail && other.email && other.email.toLowerCase() === updatedEmail.toLowerCase()) {
        return responseError('Employee with this email address already exists', 400);
      }
    }

    // Update row cells (1-based row index)
    // 1. Employee ID | 2. Created Date | 3. Created Time | 4. Employee Name | 5. Email | 6. Phone | 7. Designation
    // 8. Joining Date | 9. Salary Type | 10. Fixed Salary | 11. Status | 12. Notes
    sheet.getRange(foundRowIndex, 4).setValue(updatedName);
    sheet.getRange(foundRowIndex, 5).setValue(updatedEmail);
    sheet.getRange(foundRowIndex, 6).setValue(updatedPhone);
    sheet.getRange(foundRowIndex, 7).setValue(updatedDesignation);
    sheet.getRange(foundRowIndex, 8).setValue(updatedJoiningDate);
    sheet.getRange(foundRowIndex, 9).setValue(salaryDetails.salaryType);
    sheet.getRange(foundRowIndex, 10).setValue(salaryDetails.fixedSalary);
    sheet.getRange(foundRowIndex, 11).setValue(updatedStatus);
    sheet.getRange(foundRowIndex, 12).setValue(updatedNotes);

    const updatedEmployee = {
      employeeId: existingRecord.employeeId,
      id: existingRecord.employeeId,
      createdDate: existingRecord.createdDate,
      createdTime: existingRecord.createdTime,
      name: updatedName,
      employeeName: updatedName,
      email: updatedEmail,
      phone: updatedPhone,
      designation: updatedDesignation,
      joiningDate: updatedJoiningDate,
      salaryType: salaryDetails.salaryType,
      fixedSalary: salaryDetails.fixedSalary,
      fixedSalaryBdt: salaryDetails.fixedSalary,
      fixedSalaryUsd: 0,
      status: updatedStatus,
      notes: updatedNotes
    };

    writeActivityLog(userId, 'UPDATE_EMPLOYEE', 'Employees', existingRecord.employeeId, 'Updated Employee', existingRecord, updatedEmployee);

    return responseSuccess(updatedEmployee, 'Employee updated successfully');
  } catch (error) {
    return responseError('Failed to update employee: ' + error.message, 500);
  }
}

/**
 * Soft deletes an employee record by updating Status to "Deleted".
 */
function deleteEmployee(id) {
  let targetId = '';
  let userId = 'SYSTEM';

  if (typeof id === 'object' && id !== null) {
    targetId = id.employeeId || id.id || '';
    userId = id.userId || 'SYSTEM';
  } else {
    targetId = id;
  }

  if (!targetId) {
    return responseError('Employee ID is required for deletion', 400);
  }

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EMPLOYEES)
      ? CONFIG.SHEET_NAMES.EMPLOYEES
      : 'Employees';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToEmployee(data[i]);
      if (record.employeeId.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Employee not found', 404);
    }

    const deletedStatus = getEmployeeDeletedStatus();

    // Soft delete: Change Status (Col 11) to "Deleted"
    sheet.getRange(foundRowIndex, 11).setValue(deletedStatus);

    writeActivityLog(userId, 'DELETE_EMPLOYEE', 'Employees', targetId, 'Deleted Employee', existingRecord, null);

    return responseSuccess(null, 'Employee deleted successfully');
  } catch (error) {
    return responseError('Failed to delete employee: ' + error.message, 500);
  }
}

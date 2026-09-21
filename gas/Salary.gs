/**
 * @file Salary.gs
 * Salary Payments Module (13 Columns)
 *
 * 1. Payment ID
 * 2. Created Date
 * 3. Created Time
 * 4. Employee ID
 * 5. Employee Name
 * 6. Salary Month
 * 7. Currency
 * 8. Amount
 * 9. Payment Method
 * 10. Payment Date
 * 11. Status
 * 12. Project Name
 * 13. Notes
 */

function ensureSalaryPaymentsSheetHeader(sheet) {
  const HEADER = [
    "Payment ID",
    "Created Date",
    "Created Time",
    "Employee ID",
    "Employee Name",
    "Salary Month",
    "Currency",
    "Amount",
    "Payment Method",
    "Payment Date",
    "Status",
    "Project Name",
    "Notes"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    return;
  }

  const first = sheet.getRange(1, 1, 1, HEADER.length).getValues()[0];
  if (first[0] !== "Payment ID" && first[0] !== "Salary ID") {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  }
}

function mapRowToSalaryPayment(row) {
  const salId = String(row[0] || "").trim();
  const cDate = String(row[1] || "").trim();
  const cTime = String(row[2] || "").trim();
  const empId = String(row[3] || "").trim();
  const empName = String(row[4] || "").trim();
  const salMonth = String(row[5] || "").trim();
  const currency = String(row[6] || "BDT").trim();
  const amount = Number(row[7] || 0);
  const method = String(row[8] || "Bank").trim();
  const pDate = String(row[9] || cDate || "").trim();
  const status = String(row[10] || "Paid").trim();
  const projectName = String(row[11] || "").trim();
  const notes = String(row[12] || "").trim();

  return {
    salaryId: salId,
    id: salId,
    paymentId: salId,
    createdDate: cDate,
    createdTime: cTime,
    employeeId: empId,
    employeeName: empName,
    salaryMonth: salMonth,
    currency: currency || "BDT",
    amount: amount,
    paymentMethod: method,
    paymentDate: pDate,
    status: status,
    projectName: projectName,
    notes: notes,
    // Compat aliases
    fixedSalary: 0,
    projectPayment: amount,
    totalPaid: amount,
    commissionPaidBDT: amount,
    totalPaidBDT: amount
  };
}

/**
 * Get All Salary Payments
 */
function getSalaryPayments() {
  try {
    const sheetName = (typeof CONFIG !== "undefined" && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.SALARY_PAYMENTS)
      ? CONFIG.SHEET_NAMES.SALARY_PAYMENTS
      : "SalaryPayments";

    const sheet = getSheet(sheetName);
    ensureSalaryPaymentsSheetHeader(sheet);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const list = [];
    for (let i = 1; i < data.length; i++) {
      const payment = mapRowToSalaryPayment(data[i]);
      if (payment.status.toLowerCase() !== "deleted") {
        list.push(payment);
      }
    }
    return list;
  } catch (err) {
    Logger.log("getSalaryPayments Error : " + err);
    return [];
  }
}

/**
 * Get Salary Payment By Payment ID
 */
function getSalaryPaymentById(id) {
  if (!id) return null;
  id = id.toString().trim().toLowerCase();
  const list = getSalaryPayments();
  for (let i = 0; i < list.length; i++) {
    if (list[i].salaryId.toLowerCase() === id || list[i].paymentId.toLowerCase() === id) {
      return list[i];
    }
  }
  return null;
}

/**
 * Get Salary Record By Employee + Month
 */
function getEmployeeSalaryRecord(employeeId, salaryMonth) {
  if (!employeeId || !salaryMonth) return null;
  employeeId = employeeId.toString().trim().toLowerCase();
  salaryMonth = salaryMonth.toString().trim().toLowerCase();

  const list = getSalaryPayments();
  for (let i = 0; i < list.length; i++) {
    if (
      list[i].employeeId.toLowerCase() === employeeId &&
      list[i].salaryMonth.toLowerCase() === salaryMonth &&
      list[i].status.toLowerCase() !== "deleted"
    ) {
      return list[i];
    }
  }
  return null;
}

function addSalaryPayment(salaryData) {
  if (!salaryData) return {};
  const userId = salaryData.userId || "SYSTEM";

  const employeeId = String(salaryData.employeeId || "").trim();
  const employeeName = String(salaryData.employeeName || "").trim();
  const salaryMonth = String(salaryData.salaryMonth || salaryData.month || "").trim();
  const currency = String(salaryData.currency || "BDT").trim();
  const amount = Number(
    salaryData.amount !== undefined ? salaryData.amount : 
    (salaryData.totalPaid !== undefined ? salaryData.totalPaid : 0)
  );
  const paymentMethod = String(salaryData.paymentMethod || "Bank").trim();
  const paymentDate = String(salaryData.paymentDate || getCurrentDate()).trim();
  const status = String(salaryData.status || "Paid").trim();
  const projectName = String(salaryData.projectName || "").trim();
  const notes = String(salaryData.notes || "").trim();

  const sheetName = (typeof CONFIG !== "undefined" && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.SALARY_PAYMENTS)
    ? CONFIG.SHEET_NAMES.SALARY_PAYMENTS
    : "SalaryPayments";

  const sheet = getSheet(sheetName);
  ensureSalaryPaymentsSheetHeader(sheet);

  const salaryId = salaryData.salaryId || salaryData.paymentId || salaryData.id || generateId("SAL");
  const createdDate = getCurrentDate();
  const createdTime = getCurrentTime();

  // Exact 14 Columns:
  // 1. Payment ID | 2. Created Date | 3. Created Time | 4. Employee ID | 5. Employee Name
  // 6. Salary Month | 7. Currency | 8. Amount | 9. Current Balance | 10. Payment Method
  // 11. Payment Date | 12. Status | 13. Project Name | 14. Notes
  const newRow = [
    salaryId,
    createdDate,
    createdTime,
    employeeId,
    employeeName,
    salaryMonth,
    currency,
    amount,
    paymentMethod,
    paymentDate,
    status,
    projectName,
    notes
  ];

  sheet.appendRow(newRow);
  const resultObj = mapRowToSalaryPayment(newRow);
  writeActivityLog(userId, 'CREATE_SALARY_PAYMENT', 'Salary', salaryId, 'Created Salary Payment', null, resultObj);
  return resultObj;
}

/**
 * Update Salary Payment
 */
function updateSalaryPayment(id, salaryData) {
  let targetId = '';
  let updates = {};
  let userId = 'SYSTEM';

  if (typeof id === 'object' && id !== null) {
    updates = id;
    targetId = updates.id || updates.salaryId || updates.paymentId || '';
    userId = updates.userId || 'SYSTEM';
  } else {
    targetId = id;
    updates = salaryData || {};
    userId = updates.userId || 'SYSTEM';
  }

  if (!targetId) return {};

  const sheetName = (typeof CONFIG !== "undefined" && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.SALARY_PAYMENTS)
    ? CONFIG.SHEET_NAMES.SALARY_PAYMENTS
    : "SalaryPayments";

  const sheet = getSheet(sheetName);
  ensureSalaryPaymentsSheetHeader(sheet);
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(targetId).trim()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return {};

  const old = data[rowIndex - 1];
  const oldObj = mapRowToSalaryPayment(old);

  const updatedEmployeeId = updates.employeeId || old[3];
  const updatedEmployeeName = updates.employeeName || old[4];
  const updatedSalaryMonth = updates.salaryMonth || old[5];
  const updatedCurrency = updates.currency || oldObj.currency || "BDT";
  const updatedAmount = updates.amount !== undefined ? Number(updates.amount) : oldObj.amount;
  const updatedPaymentMethod = updates.paymentMethod || oldObj.paymentMethod || "Bank";
  const updatedPaymentDate = updates.paymentDate || oldObj.paymentDate || getCurrentDate();
  const updatedStatus = updates.status || oldObj.status || "Paid";
  const updatedProjectName = updates.projectName !== undefined ? updates.projectName : oldObj.projectName;
  const updatedNotes = updates.notes !== undefined ? updates.notes : oldObj.notes;

  sheet.getRange(rowIndex, 4).setValue(updatedEmployeeId);
  sheet.getRange(rowIndex, 5).setValue(updatedEmployeeName);
  sheet.getRange(rowIndex, 6).setValue(updatedSalaryMonth);
  sheet.getRange(rowIndex, 7).setValue(updatedCurrency);
  sheet.getRange(rowIndex, 8).setValue(updatedAmount);
  sheet.getRange(rowIndex, 9).setValue(updatedPaymentMethod);
  sheet.getRange(rowIndex, 10).setValue(updatedPaymentDate);
  sheet.getRange(rowIndex, 11).setValue(updatedStatus);
  sheet.getRange(rowIndex, 12).setValue(updatedProjectName);
  sheet.getRange(rowIndex, 13).setValue(updatedNotes);

  const resultObj = mapRowToSalaryPayment(sheet.getRange(rowIndex, 1, 1, 13).getValues()[0]);
  writeActivityLog(userId, 'UPDATE_SALARY_PAYMENT', 'Salary', targetId, 'Updated Salary Payment', oldObj, resultObj);
  return resultObj;
}

/**
 * Delete Salary Payment
 */
function deleteSalaryPayment(id) {
  let targetId = '';
  let userId = 'SYSTEM';

  if (typeof id === 'object' && id !== null) {
    targetId = id.id || id.salaryId || id.paymentId || '';
    userId = id.userId || 'SYSTEM';
  } else {
    targetId = id;
  }

  if (!targetId) return false;

  const sheetName = (typeof CONFIG !== "undefined" && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.SALARY_PAYMENTS)
    ? CONFIG.SHEET_NAMES.SALARY_PAYMENTS
    : "SalaryPayments";

  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(targetId).trim()) {
      const oldRecord = mapRowToSalaryPayment(data[i]);
      // Status column is Col 11
      sheet.getRange(i + 1, 11).setValue("Deleted");
      writeActivityLog(userId, 'DELETE_SALARY_PAYMENT', 'Salary', targetId, 'Deleted Salary Payment', oldRecord, null);
      return true;
    }
  }
  return false;
}


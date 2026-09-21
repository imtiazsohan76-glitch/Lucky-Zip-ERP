/**
 * @file Income.gs
 * @description Complete Income and Revenue management module CRUD handlers for Agency ERP backend.
 */

/**
 * Gets deleted status constant ('Deleted').
 *
 * @returns {string} Deleted status string.
 */
function getIncomeDeletedStatus() {
  if (typeof CONFIG !== 'undefined' && CONFIG.STATUS && CONFIG.STATUS.INCOME && CONFIG.STATUS.INCOME.DELETED) {
    return CONFIG.STATUS.INCOME.DELETED;
  }
  return 'Deleted';
}

/**
 * Helper function to map a row array from the Income sheet to an income record object.
 * Exact sheet structure (10 columns):
 * 1. Income ID | 2. Created Date | 3. Created Time | 4. Income Source | 5. Name
 * 6. Currency | 7. Amount | 8. Payment Method | 9. Status | 10. Notes
 *
 * @param {Array} row - Row data array from Google Sheets.
 * @returns {Object} Structured income object.
 */
function mapRowToIncome(row) {
  const id = row[0] ? row[0].toString().trim() : '';
  const dateVal = row[1] ? row[1].toString().trim() : '';
  const timeVal = row[2] ? row[2].toString().trim() : '';
  const sourceVal = row[3] ? row[3].toString().trim() : '';
  const nameVal = row[4] ? row[4].toString().trim() : '';
  const curr = row[5] ? row[5].toString().trim().toUpperCase() : 'BDT';
  const amt = row[6] !== undefined && row[6] !== null && row[6] !== '' ? Number(row[6]) : 0;
  const methodVal = row[7] ? row[7].toString().trim() : '';
  const statusVal = row[8] ? row[8].toString().trim() : '';
  const notesVal = row[9] ? row[9].toString().trim() : '';

  return {
    id: id,
    incomeId: id,
    createdDate: dateVal,
    date: dateVal,
    createdTime: timeVal,
    time: timeVal,
    incomeSource: sourceVal,
    project: sourceVal,
    projectName: sourceVal,
    name: nameVal,
    client: nameVal,
    clientName: nameVal,
    currency: curr === 'USD' ? 'USD' : 'BDT',
    amount: amt,
    amountBDT: curr === 'USD' ? 0 : amt,
    amountBdt: curr === 'USD' ? 0 : amt,
    amountUSD: curr === 'USD' ? amt : 0,
    amountUsd: curr === 'USD' ? amt : 0,
    paymentMethod: methodVal,
    status: statusVal,
    notes: notesVal,
    description: sourceVal && nameVal ? (sourceVal + ' - ' + nameVal) : (sourceVal || nameVal)
  };
}

/**
 * Retrieves income records from the Income sheet with optional search and status filtering.
 */
function getIncomes(param1, param2) {
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

    searchQuery = searchQuery.toString().trim().toLowerCase();
    statusFilter = statusFilter.toString().trim().toLowerCase();

    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.INCOME)
      ? CONFIG.SHEET_NAMES.INCOME
      : 'Income';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return responseSuccess([], 'No income records found');
    }

    const incomes = [];
    const deletedStatus = getIncomeDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const income = mapRowToIncome(data[i]);

      if (income.status.toLowerCase() === deletedStatus && statusFilter !== deletedStatus) {
        continue;
      }

      if (statusFilter && statusFilter !== 'all' && income.status.toLowerCase() !== statusFilter) {
        continue;
      }

      if (searchQuery) {
        const matchesSearch =
          income.id.toLowerCase().indexOf(searchQuery) !== -1 ||
          income.incomeSource.toLowerCase().indexOf(searchQuery) !== -1 ||
          income.name.toLowerCase().indexOf(searchQuery) !== -1 ||
          income.paymentMethod.toLowerCase().indexOf(searchQuery) !== -1 ||
          income.status.toLowerCase().indexOf(searchQuery) !== -1 ||
          income.notes.toLowerCase().indexOf(searchQuery) !== -1;

        if (!matchesSearch) {
          continue;
        }
      }

      incomes.push(income);
    }

    return responseSuccess(incomes, 'Income records retrieved successfully');
  } catch (error) {
    return responseError('Failed to retrieve income records: ' + error.message, 500);
  }
}

/**
 * Retrieves a single income record by Income ID.
 */
function getIncomeById(id) {
  if (!id || id.toString().trim() === '') {
    return responseError('Income ID is required', 400);
  }

  const targetId = id.toString().trim().toLowerCase();

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.INCOME)
      ? CONFIG.SHEET_NAMES.INCOME
      : 'Income';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const deletedStatus = getIncomeDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const income = mapRowToIncome(data[i]);
      if (income.id.toLowerCase() === targetId) {
        if (income.status.toLowerCase() === deletedStatus) {
          return responseError('Income record not found or deleted', 404);
        }
        return responseSuccess(income, 'Income record retrieved successfully');
      }
    }

    return responseError('Income record not found', 404);
  } catch (error) {
    return responseError('Failed to retrieve income record: ' + error.message, 500);
  }
}

/**
 * Adds a new income record to the Income sheet.
 */
function addIncome(incomeData) {
  if (!incomeData || typeof incomeData !== 'object') {
    return responseError('Invalid income payload data', 400);
  }

  const incomeSource = (incomeData.incomeSource || incomeData.project || incomeData.projectName || '').toString().trim();
  if (!incomeSource) {
    return responseError('Income Source is required', 400);
  }

  const name = (incomeData.name || incomeData.client || incomeData.clientName || '').toString().trim();
  if (!name) {
    return responseError('Name is required', 400);
  }

  const currency = (incomeData.currency || 'BDT').toString().trim().toUpperCase();
  const amount = Number(incomeData.amount !== undefined ? incomeData.amount : (incomeData.amountBDT || incomeData.amountUSD || incomeData.amountBdt || incomeData.amountUsd || 0));

  const paymentMethod = (incomeData.paymentMethod || 'Bank').toString().trim();
  const status = (incomeData.status || 'Paid').toString().trim();
  const notes = (incomeData.notes || '').toString().trim();
  const userId = incomeData.userId || 'SYSTEM';

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.INCOME)
      ? CONFIG.SHEET_NAMES.INCOME
      : 'Income';

    const sheet = getSheet(sheetName);

    const incomeId = generateId('INC');
    const createdDate = incomeData.createdDate || incomeData.date || getCurrentDate();
    const createdTime = incomeData.createdTime || getCurrentTime();

    // Exact sheet structure (10 columns):
    // 1. Income ID | 2. Created Date | 3. Created Time | 4. Income Source | 5. Name
    // 6. Currency | 7. Amount | 8. Payment Method | 9. Status | 10. Notes
    const newRow = [
      incomeId,
      createdDate,
      createdTime,
      incomeSource,
      name,
      currency,
      amount,
      paymentMethod,
      status,
      notes
    ];

    sheet.appendRow(newRow);

    const createdIncome = {
      id: incomeId,
      incomeId: incomeId,
      createdDate: createdDate,
      date: createdDate,
      createdTime: createdTime,
      incomeSource: incomeSource,
      project: incomeSource,
      projectName: incomeSource,
      name: name,
      client: name,
      clientName: name,
      currency: currency,
      amount: amount,
      amountBDT: currency === 'USD' ? 0 : amount,
      amountBdt: currency === 'USD' ? 0 : amount,
      amountUSD: currency === 'USD' ? amount : 0,
      amountUsd: currency === 'USD' ? amount : 0,
      paymentMethod: paymentMethod,
      status: status,
      notes: notes,
      description: incomeSource + ' - ' + name
    };

    writeActivityLog(userId, 'CREATE_INCOME', 'Income', incomeId, 'Created Income', null, createdIncome);

    return responseSuccess(createdIncome, 'Income record added successfully');
  } catch (error) {
    return responseError('Failed to add income: ' + error.message, 500);
  }
}

/**
 * Updates an existing income record by Income ID.
 */
function updateIncome(id, incomeData) {
  let targetId = '';
  let updates = {};

  if (typeof id === 'object' && id !== null) {
    updates = id;
    targetId = updates.id || updates.incomeId || '';
  } else {
    targetId = id;
    updates = incomeData || {};
  }

  if (!targetId) {
    return responseError('Income ID is required for update', 400);
  }

  const userId = updates.userId || 'SYSTEM';

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.INCOME)
      ? CONFIG.SHEET_NAMES.INCOME
      : 'Income';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToIncome(data[i]);
      if (record.id.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Income record not found', 404);
    }

    const updatedIncomeSource = (updates.incomeSource !== undefined || updates.project !== undefined || updates.projectName !== undefined)
      ? (updates.incomeSource || updates.project || updates.projectName).toString().trim()
      : existingRecord.incomeSource;

    const updatedName = (updates.name !== undefined || updates.client !== undefined || updates.clientName !== undefined)
      ? (updates.name || updates.client || updates.clientName).toString().trim()
      : existingRecord.name;

    const updatedCurrency = (updates.currency !== undefined)
      ? updates.currency.toString().trim().toUpperCase()
      : existingRecord.currency;

    const updatedAmount = (updates.amount !== undefined)
      ? Number(updates.amount)
      : existingRecord.amount;

    const updatedPaymentMethod = (updates.paymentMethod !== undefined)
      ? updates.paymentMethod.toString().trim()
      : existingRecord.paymentMethod;

    const updatedStatus = (updates.status !== undefined)
      ? updates.status.toString().trim()
      : existingRecord.status;

    const updatedNotes = (updates.notes !== undefined)
      ? updates.notes.toString().trim()
      : existingRecord.notes;

    // 10 columns:
    // 1. Income ID | 2. Created Date | 3. Created Time | 4. Income Source | 5. Name
    // 6. Currency | 7. Amount | 8. Payment Method | 9. Status | 10. Notes
    sheet.getRange(foundRowIndex, 4).setValue(updatedIncomeSource);
    sheet.getRange(foundRowIndex, 5).setValue(updatedName);
    sheet.getRange(foundRowIndex, 6).setValue(updatedCurrency);
    sheet.getRange(foundRowIndex, 7).setValue(updatedAmount);
    sheet.getRange(foundRowIndex, 8).setValue(updatedPaymentMethod);
    sheet.getRange(foundRowIndex, 9).setValue(updatedStatus);
    sheet.getRange(foundRowIndex, 10).setValue(updatedNotes);

    const updatedIncome = {
      id: existingRecord.id,
      incomeId: existingRecord.id,
      createdDate: existingRecord.createdDate,
      date: existingRecord.createdDate,
      createdTime: existingRecord.createdTime,
      incomeSource: updatedIncomeSource,
      project: updatedIncomeSource,
      projectName: updatedIncomeSource,
      name: updatedName,
      client: updatedName,
      clientName: updatedName,
      currency: updatedCurrency,
      amount: updatedAmount,
      amountBDT: updatedCurrency === 'USD' ? 0 : updatedAmount,
      amountBdt: updatedCurrency === 'USD' ? 0 : updatedAmount,
      amountUSD: updatedCurrency === 'USD' ? updatedAmount : 0,
      amountUsd: updatedCurrency === 'USD' ? updatedAmount : 0,
      paymentMethod: updatedPaymentMethod,
      status: updatedStatus,
      notes: updatedNotes,
      description: updatedIncomeSource + ' - ' + updatedName
    };

    writeActivityLog(userId, 'UPDATE_INCOME', 'Income', existingRecord.id, 'Updated Income', existingRecord, updatedIncome);

    return responseSuccess(updatedIncome, 'Income record updated successfully');
  } catch (error) {
    return responseError('Failed to update income: ' + error.message, 500);
  }
}

/**
 * Soft deletes an income record by updating Status to "Deleted".
 */
function deleteIncome(id) {
  let targetId = '';
  let userId = 'SYSTEM';

  if (typeof id === 'object' && id !== null) {
    targetId = id.id || id.incomeId || '';
    userId = id.userId || 'SYSTEM';
  } else {
    targetId = id;
  }

  if (!targetId) {
    return responseError('Income ID is required for deletion', 400);
  }

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.INCOME)
      ? CONFIG.SHEET_NAMES.INCOME
      : 'Income';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToIncome(data[i]);
      if (record.id.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Income record not found', 404);
    }

    const deletedStatus = getIncomeDeletedStatus();

    // Soft delete: Change Status (Col 9) to "Deleted"
    sheet.getRange(foundRowIndex, 9).setValue(deletedStatus);

    writeActivityLog(userId, 'DELETE_INCOME', 'Income', targetId, 'Deleted Income', existingRecord, null);

    return responseSuccess(null, 'Income record deleted successfully');
  } catch (error) {
    return responseError('Failed to delete income: ' + error.message, 500);
  }
}

/**
 * Soft deletes an income record by updating Status to "Deleted".
 * Does not remove the row from Google Sheets. Writes Activity Log.
 *
 * @param {string|Object} id - Unique Income ID OR payload object containing id.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output.
 */
function deleteIncome(id) {
  let targetId = '';
  let userId = 'SYSTEM';

  if (typeof id === 'object' && id !== null) {
    targetId = id.id || id.incomeId || '';
    userId = id.userId || 'SYSTEM';
  } else {
    targetId = id;
  }

  if (!targetId) {
    return responseError('Income ID is required for deletion', 400);
  }

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.INCOME)
      ? CONFIG.SHEET_NAMES.INCOME
      : 'Income';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToIncome(data[i]);
      if (record.id.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Income record not found', 404);
    }

    const deletedStatus = getIncomeDeletedStatus();

    // Soft delete: Change Status (Col 9) to "Deleted"
    sheet.getRange(foundRowIndex, 9).setValue(deletedStatus);

    writeActivityLog(userId, 'DELETE_INCOME', 'Income', targetId, 'Deleted Income', existingRecord, null);

    return responseSuccess(null, 'Income record deleted successfully');
  } catch (error) {
    return responseError('Failed to delete income: ' + error.message, 500);
  }
}


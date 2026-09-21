/**
 * @file Expenses.gs
 * @description Complete Expenses management module CRUD handlers for Agency ERP backend.
 */

/**
 * Gets deleted status constant ('Deleted').
 *
 * @returns {string} Deleted status string.
 */
function getExpenseDeletedStatus() {
  if (typeof CONFIG !== 'undefined' && CONFIG.STATUS && CONFIG.STATUS.EXPENSE && CONFIG.STATUS.EXPENSE.DELETED) {
    return CONFIG.STATUS.EXPENSE.DELETED;
  }
  return 'Deleted';
}

/**
 * Helper function to map a row array from the Expenses sheet to an expense record object.
 * Exact sheet structure (10 columns):
 * 1. Expense ID | 2. Created Date | 3. Created Time | 4. Expense Category | 5. Vendor Name
 * 6. Currency | 7. Amount | 8. Payment Method | 9. Status | 10. Notes
 *
 * @param {Array} row - Row data array from Google Sheets.
 * @returns {Object} Structured expense object.
 */
function mapRowToExpense(row) {
  const categoryVal = row[3] ? row[3].toString().trim() : '';
  const vendorVal = row[4] ? row[4].toString().trim() : '';
  const curr = row[5] ? row[5].toString().trim().toUpperCase() : 'BDT';
  const amt = row[6] !== undefined && row[6] !== null && row[6] !== '' ? Number(row[6]) : 0;
  const methodVal = row[7] ? row[7].toString().trim() : '';
  const statusVal = row[8] ? row[8].toString().trim() : '';
  const notesVal = row[9] ? row[9].toString().trim() : '';

  return {
    id: row[0] ? row[0].toString().trim() : '',
    expenseId: row[0] ? row[0].toString().trim() : '',
    createdDate: row[1] ? row[1].toString().trim() : '',
    createdTime: row[2] ? row[2].toString().trim() : '',
    date: row[1] ? row[1].toString().trim() : '',
    category: categoryVal,
    expenseCategory: categoryVal,
    vendor: vendorVal,
    vendorName: vendorVal,
    vendorPayee: vendorVal,
    payee: vendorVal,
    title: vendorVal || categoryVal,
    currency: curr === 'USD' ? 'USD' : 'BDT',
    amount: amt,
    amountBDT: curr === 'USD' ? 0 : amt,
    amountBdt: curr === 'USD' ? 0 : amt,
    amountUSD: curr === 'USD' ? amt : 0,
    amountUsd: curr === 'USD' ? amt : 0,
    paymentMethod: methodVal,
    status: statusVal,
    notes: notesVal
  };
}

/**
 * Retrieves expense records from the Expenses sheet with optional search and status filtering.
 */
function getExpenses(param1, param2) {
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

    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EXPENSES)
      ? CONFIG.SHEET_NAMES.EXPENSES
      : 'Expenses';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return responseSuccess([], 'No expense records found');
    }

    const expenses = [];
    const deletedStatus = getExpenseDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const expense = mapRowToExpense(data[i]);

      if (expense.status.toLowerCase() === deletedStatus && statusFilter !== deletedStatus) {
        continue;
      }

      if (statusFilter && statusFilter !== 'all' && expense.status.toLowerCase() !== statusFilter) {
        continue;
      }

      if (searchQuery) {
        const matchesSearch =
          expense.id.toLowerCase().indexOf(searchQuery) !== -1 ||
          expense.category.toLowerCase().indexOf(searchQuery) !== -1 ||
          expense.vendor.toLowerCase().indexOf(searchQuery) !== -1 ||
          expense.paymentMethod.toLowerCase().indexOf(searchQuery) !== -1 ||
          expense.status.toLowerCase().indexOf(searchQuery) !== -1;

        if (!matchesSearch) {
          continue;
        }
      }

      expenses.push(expense);
    }

    return responseSuccess(expenses, 'Expense records retrieved successfully');
  } catch (error) {
    return responseError('Failed to retrieve expense records: ' + error.message, 500);
  }
}

/**
 * Retrieves a single expense record by Expense ID.
 */
function getExpenseById(id) {
  if (!id || id.toString().trim() === '') {
    return responseError('Expense ID is required', 400);
  }

  const targetId = id.toString().trim().toLowerCase();

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EXPENSES)
      ? CONFIG.SHEET_NAMES.EXPENSES
      : 'Expenses';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const deletedStatus = getExpenseDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const expense = mapRowToExpense(data[i]);
      if (expense.id.toLowerCase() === targetId) {
        if (expense.status.toLowerCase() === deletedStatus) {
          return responseError('Expense record not found or deleted', 404);
        }
        return responseSuccess(expense, 'Expense record retrieved successfully');
      }
    }

    return responseError('Expense record not found', 404);
  } catch (error) {
    return responseError('Failed to retrieve expense record: ' + error.message, 500);
  }
}

/**
 * Adds a new expense record to the Expenses sheet.
 */
function addExpense(expenseData) {
  if (!expenseData || typeof expenseData !== 'object') {
    return responseError('Invalid expense payload data', 400);
  }

  const category = (expenseData.category || expenseData.expenseCategory || '').toString().trim();
  if (!category) {
    return responseError('Category is required', 400);
  }

  const vendorName = (expenseData.vendor || expenseData.vendorName || expenseData.vendorPayee || expenseData.payee || '').toString().trim();

  const currency = (expenseData.currency || 'BDT').toString().trim().toUpperCase();
  const amount = Number(expenseData.amount !== undefined ? expenseData.amount : (expenseData.amountBdt || expenseData.amountUsd || expenseData.amountBDT || expenseData.amountUSD || 0));

  const paymentMethod = (expenseData.paymentMethod || 'Bank').toString().trim();
  const status = (expenseData.status || 'Paid').toString().trim();
  const notes = (expenseData.notes || '').toString().trim();
  const userId = expenseData.userId || 'SYSTEM';

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EXPENSES)
      ? CONFIG.SHEET_NAMES.EXPENSES
      : 'Expenses';

    const sheet = getSheet(sheetName);
    const id = generateId('EXP');
    const createdDate = getCurrentDate();
    const createdTime = getCurrentTime();

    // Exact sheet structure (10 columns):
    // 1. Expense ID | 2. Created Date | 3. Created Time | 4. Expense Category | 5. Vendor Name
    // 6. Currency | 7. Amount | 8. Payment Method | 9. Status | 10. Notes
    const newRow = [
      id,
      createdDate,
      createdTime,
      category,
      vendorName,
      currency,
      amount,
      paymentMethod,
      status,
      notes
    ];

    sheet.appendRow(newRow);

    const createdExpense = {
      id: id,
      expenseId: id,
      createdDate: createdDate,
      createdTime: createdTime,
      date: createdDate,
      category: category,
      expenseCategory: category,
      vendor: vendorName,
      vendorName: vendorName,
      vendorPayee: vendorName,
      payee: vendorName,
      currency: currency,
      amount: amount,
      amountBDT: currency === 'USD' ? 0 : amount,
      amountBdt: currency === 'USD' ? 0 : amount,
      amountUSD: currency === 'USD' ? amount : 0,
      amountUsd: currency === 'USD' ? amount : 0,
      paymentMethod: paymentMethod,
      status: status,
      notes: notes
    };

    writeActivityLog(userId, 'CREATE_EXPENSE', 'Expenses', id, 'Created Expense', null, createdExpense);

    return responseSuccess(createdExpense, 'Expense record added successfully');
  } catch (error) {
    return responseError('Failed to add expense: ' + error.message, 500);
  }
}

/**
 * Updates an existing expense record by Expense ID.
 */
function updateExpense(id, expenseData) {
  let targetId = '';
  let updates = {};

  if (typeof id === 'object' && id !== null) {
    updates = id;
    targetId = updates.id || updates.expenseId || '';
  } else {
    targetId = id;
    updates = expenseData || {};
  }

  if (!targetId) {
    return responseError('Expense ID is required for update', 400);
  }

  const userId = updates.userId || 'SYSTEM';

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EXPENSES)
      ? CONFIG.SHEET_NAMES.EXPENSES
      : 'Expenses';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToExpense(data[i]);
      if (record.id.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Expense record not found', 404);
    }

    const updatedCategory = (updates.category !== undefined || updates.expenseCategory !== undefined)
      ? (updates.category || updates.expenseCategory).toString().trim()
      : existingRecord.category;

    const updatedVendorName = (updates.vendor !== undefined || updates.vendorName !== undefined || updates.vendorPayee !== undefined)
      ? (updates.vendor || updates.vendorName || updates.vendorPayee).toString().trim()
      : existingRecord.vendor;

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
    // 1. Expense ID | 2. Created Date | 3. Created Time | 4. Expense Category | 5. Vendor Name
    // 6. Currency | 7. Amount | 8. Payment Method | 9. Status | 10. Notes
    sheet.getRange(foundRowIndex, 4).setValue(updatedCategory);
    sheet.getRange(foundRowIndex, 5).setValue(updatedVendorName);
    sheet.getRange(foundRowIndex, 6).setValue(updatedCurrency);
    sheet.getRange(foundRowIndex, 7).setValue(updatedAmount);
    sheet.getRange(foundRowIndex, 8).setValue(updatedPaymentMethod);
    sheet.getRange(foundRowIndex, 9).setValue(updatedStatus);
    sheet.getRange(foundRowIndex, 10).setValue(updatedNotes);

    const updatedExpense = {
      id: existingRecord.id,
      expenseId: existingRecord.id,
      createdDate: existingRecord.createdDate,
      createdTime: existingRecord.createdTime,
      date: existingRecord.createdDate,
      category: updatedCategory,
      expenseCategory: updatedCategory,
      vendor: updatedVendorName,
      vendorName: updatedVendorName,
      vendorPayee: updatedVendorName,
      payee: updatedVendorName,
      currency: updatedCurrency,
      amount: updatedAmount,
      amountBDT: updatedCurrency === 'USD' ? 0 : updatedAmount,
      amountBdt: updatedCurrency === 'USD' ? 0 : updatedAmount,
      amountUSD: updatedCurrency === 'USD' ? updatedAmount : 0,
      amountUsd: updatedCurrency === 'USD' ? updatedAmount : 0,
      paymentMethod: updatedPaymentMethod,
      status: updatedStatus,
      notes: updatedNotes
    };

    writeActivityLog(userId, 'UPDATE_EXPENSE', 'Expenses', existingRecord.id, 'Updated Expense', existingRecord, updatedExpense);

    return responseSuccess(updatedExpense, 'Expense record updated successfully');
  } catch (error) {
    return responseError('Failed to update expense: ' + error.message, 500);
  }
}

/**
 * Soft deletes an expense record by updating Status to "Deleted".
 */
function deleteExpense(id) {
  let targetId = '';
  let userId = 'SYSTEM';

  if (typeof id === 'object' && id !== null) {
    targetId = id.id || id.expenseId || '';
    userId = id.userId || 'SYSTEM';
  } else {
    targetId = id;
  }

  if (!targetId) {
    return responseError('Expense ID is required for deletion', 400);
  }

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.EXPENSES)
      ? CONFIG.SHEET_NAMES.EXPENSES
      : 'Expenses';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToExpense(data[i]);
      if (record.id.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Expense record not found', 404);
    }

    const deletedStatus = getExpenseDeletedStatus();

    // Soft delete: Change Status (Col 9) to "Deleted"
    sheet.getRange(foundRowIndex, 9).setValue(deletedStatus);

    writeActivityLog(userId, 'DELETE_EXPENSE', 'Expenses', targetId, 'Deleted Expense', existingRecord, null);

    return responseSuccess(null, 'Expense record deleted successfully');
  } catch (error) {
    return responseError('Failed to delete expense: ' + error.message, 500);
  }
}

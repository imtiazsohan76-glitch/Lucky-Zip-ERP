/**
 * @file Utils.gs
 * @description Reusable helper functions for Google Apps Script backend.
 */

/**
 * Retrieves a Google Sheet tab object by name from the configured Spreadsheet.
 *
 * @param {string} sheetName - Name of the worksheet tab to retrieve.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Sheet object.
 * @throws {Error} If sheet cannot be found or opened.
 */
function getSheet(sheetName) {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!ss && CONFIG.SPREADSHEET_ID) {
    try {
      ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } catch (e) {
      Logger.log('Error opening spreadsheet by ID: ' + e.toString());
    }
  }

  if (!ss) {
    throw new Error('Spreadsheet could not be opened. Please bind the script or set SPREADSHEET_ID in gas/Config.gs.');
  }

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Worksheet "' + sheetName + '" not found in Spreadsheet.');
  }
  return sheet;
}

/**
 * Generates a unique sequential string ID prefixed with a specified code.
 * Automatically determines the next sequential number from the corresponding Google Sheet.
 *
 * Examples:
 * CLI-000001, EMP-000001, PRO-000001, INC-000001, EXP-000001, SAL-000001, USR-000001, LOG-000001
 *
 * @param {string} prefix - ID prefix (e.g., 'CLI-', 'EMP-', 'PRO-', 'LOG-').
 * @param {string} [targetSheetName] - Optional explicit sheet name. If omitted, mapped from prefix.
 * @returns {string} Sequential ID string.
 */
function generateId(prefix, targetSheetName) {
  let cleanPrefix = (prefix || '').toString().trim().toUpperCase();
  if (cleanPrefix && !cleanPrefix.endsWith('-')) {
    cleanPrefix += '-';
  }

  // Map prefix to sheet name in CONFIG.SHEET_NAMES
  const prefixMap = {
    'CLI-': CONFIG.SHEET_NAMES.CLIENTS,
    'EMP-': CONFIG.SHEET_NAMES.EMPLOYEES,
    'PRO-': CONFIG.SHEET_NAMES.PROJECTS,
    'PRJ-': CONFIG.SHEET_NAMES.PROJECTS,
    'INC-': CONFIG.SHEET_NAMES.INCOME,
    'EXP-': CONFIG.SHEET_NAMES.EXPENSES,
    'SAL-': CONFIG.SHEET_NAMES.SALARY_PAYMENTS,
    'USR-': CONFIG.SHEET_NAMES.USERS,
    'LOG-': CONFIG.SHEET_NAMES.ACTIVITY_LOG
  };

  const sheetName = targetSheetName || prefixMap[cleanPrefix];
  let nextNumber = 1;

  if (sheetName) {
    try {
      const sheet = getSheet(sheetName);
      const lastRow = sheet.getLastRow();

      if (lastRow > 1) {
        const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        let maxNumber = 0;

        for (let i = 0; i < idValues.length; i++) {
          const val = idValues[i][0] ? idValues[i][0].toString().trim() : '';
          if (val) {
            const match = val.match(/\d+$/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
              }
            }
          }
        }
        nextNumber = maxNumber + 1;
      }
    } catch (e) {
      Logger.log('Warning in generateId: ' + e.toString());
      nextNumber = 1;
    }
  }

  const paddedNum = ('00000' + nextNumber).slice(-5);
  return cleanPrefix + paddedNum;
}

/**
 * Returns current local date string formatted as YYYY-MM-DD.
 *
 * @returns {string} Formatted date string (YYYY-MM-DD).
 */
function getCurrentDate() {
  const timeZone = Session.getScriptTimeZone() || 'GMT';
  return Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd');
}

/**
 * Returns current local time string formatted as hh:mm:ss a.
 *
 * @returns {string} Formatted time string (hh:mm:ss a).
 */
function getCurrentTime() {
  const timeZone = Session.getScriptTimeZone() || 'GMT';
  return Utilities.formatDate(new Date(), timeZone, 'hh:mm:ss a');
}

/**
 * Creates a standardized JSON success response payload.
 *
 * @param {Object|Array|null} data - Payload data to send to the client.
 * @param {string} [message='Success'] - Descriptive success message.
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response output.
 */
function responseSuccess(data, message) {
  const payload = {
    status: 'success',
    message: message || 'Success',
    data: data !== undefined ? data : null,
    timestamp: getCurrentDate() + ' ' + getCurrentTime()
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Creates a standardized JSON error response payload.
 *
 * @param {string} message - Error description message.
 * @param {number} [code=400] - HTTP error status code.
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response output.
 */
function responseError(message, code) {
  const payload = {
    status: 'error',
    code: code || 400,
    message: message || 'An error occurred',
    timestamp: getCurrentDate() + ' ' + getCurrentTime()
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

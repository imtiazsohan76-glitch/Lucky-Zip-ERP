/**
 * @file ActivityLog.gs
 * @description Activity Logging module for Agency ERP backend.
 */

/**
 * Normalizes a field value for consistent comparison and string rendering.
 * Null, undefined, empty strings, and whitespace-only strings are normalized to ''.
 * Arrays are joined with ', '.
 *
 * @param {*} val - Value to normalize.
 * @returns {string} Normalized string representation.
 */
function normalizeFieldValue(val) {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) {
    return val.map(function(item) {
      return normalizeFieldValue(item);
    }).filter(function(str) {
      return str.length > 0;
    }).join(', ').trim();
  }
  if (typeof val === 'object') {
    return JSON.stringify(val).trim();
  }
  return String(val).trim();
}

/**
 * Formats a record object or string into Key=Value state representation.
 *
 * @param {Object|string} record - Record object or pre-formatted string.
 * @returns {string} Formatted Key=Value string.
 */
function formatRecordState(record) {
  if (!record) return '';
  if (typeof record === 'string') return record;
  if (typeof record === 'object') {
    var lines = [];
    var ignoredKeys = ['createdDate', 'createdTime', 'userId'];

    for (var key in record) {
      if (Object.prototype.hasOwnProperty.call(record, key) && ignoredKeys.indexOf(key) === -1) {
        var val = record[key];
        var normVal = normalizeFieldValue(val);
        var label = formatKeyLabel(key);
        lines.push(label + '=' + normVal);
      }
    }
    return lines.join('\n');
  }
  return String(record);
}

/**
 * Compares oldRecord and newRecord field-by-field and returns formatted
 * { oldValue: string, newValue: string } containing ONLY changed fields.
 *
 * @param {Object|string} oldRecord - Previous record object or string.
 * @param {Object|string} newRecord - Updated record object or string.
 * @returns {Object} { oldValue: string, newValue: string }
 */
function formatRecordDiff(oldRecord, newRecord) {
  if (!oldRecord && !newRecord) {
    return { oldValue: '', newValue: '' };
  }
  if (!oldRecord) {
    return { oldValue: '', newValue: formatRecordState(newRecord) };
  }
  if (!newRecord) {
    return { oldValue: formatRecordState(oldRecord), newValue: '' };
  }
  if (typeof oldRecord !== 'object' || typeof newRecord !== 'object') {
    return {
      oldValue: formatRecordState(oldRecord),
      newValue: formatRecordState(newRecord)
    };
  }

  var oldLines = [];
  var newLines = [];
  var ignoredKeys = ['createdDate', 'createdTime', 'userId'];

  var allKeys = [];
  var keyMap = {};

  for (var k1 in oldRecord) {
    if (Object.prototype.hasOwnProperty.call(oldRecord, k1) && ignoredKeys.indexOf(k1) === -1 && !keyMap[k1]) {
      keyMap[k1] = true;
      allKeys.push(k1);
    }
  }
  for (var k2 in newRecord) {
    if (Object.prototype.hasOwnProperty.call(newRecord, k2) && ignoredKeys.indexOf(k2) === -1 && !keyMap[k2]) {
      keyMap[k2] = true;
      allKeys.push(k2);
    }
  }

  for (var i = 0; i < allKeys.length; i++) {
    var key = allKeys[i];
    var rawOld = oldRecord[key];
    var rawNew = newRecord[key];

    var normOld = normalizeFieldValue(rawOld);
    var normNew = normalizeFieldValue(rawNew);

    if (normOld !== normNew) {
      var label = formatKeyLabel(key);
      oldLines.push(label + '=' + normOld);
      newLines.push(label + '=' + normNew);
    }
  }

  return {
    oldValue: oldLines.join('\n'),
    newValue: newLines.join('\n')
  };
}

/**
 * Humanizes field keys to clean Title Words (e.g. clientName -> Client Name, priceUSD -> Price USD).
 *
 * @param {string} key - Field key name.
 * @returns {string} Humanized label.
 */
function formatKeyLabel(key) {
  if (!key) return '';
  var map = {
    clientName: 'Client',
    company: 'Company',
    phone: 'Phone',
    email: 'Email',
    status: 'Status',
    notes: 'Notes',
    name: 'Name',
    employeeName: 'Employee',
    employeeId: 'Employee ID',
    department: 'Department',
    designation: 'Designation',
    joiningDate: 'Joining Date',
    basicSalaryBDT: 'Basic Salary BDT',
    basicSalaryUSD: 'Basic Salary USD',
    fixedSalaryBdt: 'Fixed Salary BDT',
    fixedSalaryUsd: 'Fixed Salary USD',
    projectCommissionPercent: 'Project Commission %',
    salaryType: 'Salary Type',
    projectName: 'Project Name',
    client: 'Client',
    priceBDT: 'Price BDT',
    priceUSD: 'Price USD',
    startDate: 'Start Date',
    deadline: 'Deadline',
    category: 'Category',
    vendorPayee: 'Vendor Payee',
    amountBDT: 'Amount BDT',
    amountUSD: 'Amount USD',
    paymentMethod: 'Payment Method',
    paymentDate: 'Payment Date',
    date: 'Date',
    salaryMonth: 'Salary Month',
    earnBDT: 'Earn BDT',
    earnUSD: 'Earn USD',
    fixedPaidBDT: 'Fixed Paid BDT',
    fixedPaidUSD: 'Fixed Paid USD',
    commissionPaidBDT: 'Commission Paid BDT',
    commissionPaidUSD: 'Commission Paid USD',
    totalPaidBDT: 'Total Paid BDT',
    totalPaidUSD: 'Total Paid USD',
    vatPercent: 'VAT Percent',
    currency: 'Currency'
  };

  if (map[key]) return map[key];

  var result = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Parses legacy details string to extract record ID and short description.
 *
 * @param {string} action - Action name.
 * @param {string} module - Module name.
 * @param {string} details - Legacy details string.
 * @returns {Object} Extracted record ID and description.
 */
function parseLegacyDetails(action, module, details) {
  var recId = 'N/A';
  var desc = details || '';

  if (details) {
    var match = details.match(/\b([A-Z]{3,4}-\d+)\b/i);
    if (match && match[1]) {
      recId = match[1].toUpperCase();
    }
  }

  if (action) {
    if (action.indexOf('CREATE') === 0) {
      var moduleSingular = module ? module.replace(/s$/, '') : 'Record';
      desc = 'Created ' + moduleSingular;
    } else if (action.indexOf('UPDATE') === 0) {
      var moduleSingularUpdate = module ? module.replace(/s$/, '') : 'Record';
      desc = 'Updated ' + moduleSingularUpdate;
    } else if (action.indexOf('DELETE') === 0) {
      var moduleSingularDelete = module ? module.replace(/s$/, '') : 'Record';
      desc = 'Deleted ' + moduleSingularDelete;
    } else if (action === 'LOGIN_SUCCESS') {
      desc = 'User Login';
    } else if (action === 'LOGIN_FAILED') {
      desc = 'Login Failed';
    } else if (action === 'LOGOUT') {
      desc = 'User Logout';
    } else if (action === 'PASSWORD_RESET') {
      desc = 'Password Reset';
    }
  }

  return {
    recordId: recId,
    description: desc,
    oldValue: '',
    newValue: ''
  };
}

/**
 * Writes an activity log entry to the ActivityLog sheet.
 *
 * Support 10-column schema:
 * A = Log ID
 * B = Date
 * C = Time
 * D = Username
 * E = Action
 * F = Module
 * G = Record ID
 * H = Description
 * I = Old Value
 * J = New Value
 *
 * @param {string|Object} param1 - User ID OR payload object.
 * @param {string} [param2] - Action name.
 * @param {string} [param3] - Module name.
 * @param {string|Object} [param4] - Record ID OR legacy details.
 * @param {string} [param5] - Short description summary.
 * @param {Object|string} [param6] - Previous state (Old Value).
 * @param {Object|string} [param7] - Updated/New state (New Value).
 * @returns {void}
 */
function writeActivityLog(param1, param2, param3, param4, param5, param6, param7) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.ACTIVITY_LOG);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Log ID', 'Date', 'Time', 'Username', 'Action', 'Module', 'Record ID', 'Description', 'Old Value', 'New Value']);
    }

    let userId = 'SYSTEM';
    let action = '';
    let module = '';
    let recordId = '';
    let description = '';
    let oldValue = '';
    let newValue = '';

    if (typeof param1 === 'object' && param1 !== null) {
      userId = param1.userId || param1.user || param1.username || 'SYSTEM';
      action = param1.action || '';
      module = param1.module || '';
      recordId = param1.recordId || '';
      description = param1.description || param1.details || '';
      oldValue = param1.oldValue || '';
      newValue = param1.newValue || '';
    } else {
      userId = param1 || 'SYSTEM';
      action = param2 || '';
      module = param3 || '';

      if (arguments.length >= 5 || typeof param5 !== 'undefined') {
        recordId = param4 || '';
        description = param5 || '';
        oldValue = param6 || '';
        newValue = param7 || '';
      } else {
        const legacyDetails = param4 || '';
        const parsed = parseLegacyDetails(action, module, legacyDetails);
        recordId = parsed.recordId;
        description = parsed.description;
        oldValue = parsed.oldValue;
        newValue = parsed.newValue;
      }
    }

    const logId = generateId('LOG-');
    const date = getCurrentDate();
    const time = getCurrentTime();

    let formattedOldValue = '';
    let formattedNewValue = '';

    const actionUpper = action ? action.toString().toUpperCase() : '';
    const isUpdate = actionUpper.indexOf('UPDATE') !== -1;
    const isCreate = actionUpper.indexOf('CREATE') !== -1;
    const isDelete = actionUpper.indexOf('DELETE') !== -1;

    if (isUpdate) {
      const diff = formatRecordDiff(oldValue, newValue);
      formattedOldValue = diff.oldValue;
      formattedNewValue = diff.newValue;
    } else if (isCreate) {
      formattedOldValue = '';
      formattedNewValue = formatRecordState(newValue);
    } else if (isDelete) {
      formattedOldValue = formatRecordState(oldValue);
      formattedNewValue = '';
    } else {
      const diff = formatRecordDiff(oldValue, newValue);
      formattedOldValue = diff.oldValue;
      formattedNewValue = diff.newValue;
    }

    sheet.appendRow([
      logId,
      date,
      time,
      userId,
      action,
      module,
      recordId,
      description,
      formattedOldValue,
      formattedNewValue
    ]);
  } catch (error) {
    Logger.log('Error writing activity log: ' + error.toString());
  }
}

/**
 * Fetches activity log records from the ActivityLog sheet.
 *
 * @param {number} [limit=100] - Maximum number of recent log entries to retrieve.
 * @returns {Array<Object>} List of activity log entries.
 */
function getActivityLogs(limit) {
  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.ACTIVITY_LOG);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const maxEntries = limit || 100;
    const logs = [];

    // Parse rows in reverse order (newest first)
    for (let i = data.length - 1; i >= 1 && logs.length < maxEntries; i--) {
      const row = data[i];
      const has10Cols = row.length >= 8 && typeof row[7] !== 'undefined';

      logs.push({
        id: row[0],
        date: row[1],
        time: row[2],
        userId: row[3],
        user: row[3],
        username: row[3],
        action: row[4],
        module: row[5],
        recordId: has10Cols ? (row[6] || 'N/A') : (parseLegacyDetails(row[4], row[5], row[6]).recordId),
        description: has10Cols ? (row[7] || '') : (parseLegacyDetails(row[4], row[5], row[6]).description),
        details: has10Cols ? (row[7] || '') : (row[6] || ''),
        oldValue: has10Cols ? (row[8] || '') : '',
        newValue: has10Cols ? (row[9] || '') : ''
      });
    }

    return logs;
  } catch (error) {
    Logger.log('Error fetching activity logs: ' + error.toString());
    return [];
  }
}


/**
 * @file Clients.gs
 * @description Clients management module CRUD handlers for Agency ERP backend.
 */

/**
 * Validates email format using regex. Allows empty email.
 *
 * @param {string} email - Email address string to validate.
 * @returns {boolean} True if email is valid or empty, false otherwise.
 */
function isClientValidEmail(email) {
  if (!email || email.toString().trim() === '') {
    return true;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toString().trim());
}

/**
 * Gets active status constant from CONFIG.STATUS if available, or fallback ('Active').
 *
 * @returns {string} Default active status ('Active').
 */
function getClientActiveStatus() {
  if (typeof CONFIG !== 'undefined' && CONFIG.STATUS) {
    if (CONFIG.STATUS.CLIENT && CONFIG.STATUS.CLIENT.ACTIVE) {
      return CONFIG.STATUS.CLIENT.ACTIVE;
    }
    if (CONFIG.STATUS.USER && CONFIG.STATUS.USER.ACTIVE) {
      return CONFIG.STATUS.USER.ACTIVE;
    }
    if (CONFIG.STATUS.EMPLOYEE && CONFIG.STATUS.EMPLOYEE.ACTIVE) {
      return CONFIG.STATUS.EMPLOYEE.ACTIVE;
    }
  }
  return 'Active';
}

/**
 * Gets deleted status constant from CONFIG.STATUS if available, or fallback ('Deleted').
 *
 * @returns {string} Deleted status ('Deleted').
 */
function getClientDeletedStatus() {
  if (typeof CONFIG !== 'undefined' && CONFIG.STATUS) {
    if (CONFIG.STATUS.CLIENT && CONFIG.STATUS.CLIENT.DELETED) {
      return CONFIG.STATUS.CLIENT.DELETED;
    }
  }
  return 'Deleted';
}

/**
 * Helper function to map a row array from the Clients sheet to a client record object.
 * Sheet structure (8 columns):
 * Col 1 (A, index 0): Client ID
 * Col 2 (B, index 1): Created Date
 * Col 3 (C, index 2): Created Time
 * Col 4 (D, index 3): Client Name
 * Col 5 (E, index 4): Company Name
 * Col 6 (F, index 5): Email
 * Col 7 (G, index 6): Status
 * Col 8 (H, index 7): Notes
 *
 * @param {Array} row - Row data array from Google Sheets.
 * @returns {Object} Structured client object.
 */
function mapRowToClient(row) {
  const idVal = row[0] ? row[0].toString().trim() : '';
  const dateVal = row[1] ? row[1].toString().trim() : '';
  const timeVal = row[2] ? row[2].toString().trim() : '';
  const nameVal = row[3] ? row[3].toString().trim() : '';
  const companyVal = row[4] ? row[4].toString().trim() : '';
  const emailVal = row[5] ? row[5].toString().trim() : '';
  const statusVal = row[6] ? row[6].toString().trim() : '';
  const notesVal = row[7] ? row[7].toString().trim() : '';

  return {
    id: idVal,
    clientId: idVal,
    createdDate: dateVal,
    createdTime: timeVal,
    clientName: nameVal,
    name: nameVal,
    company: companyVal,
    companyName: companyVal,
    email: emailVal,
    status: statusVal,
    notes: notesVal
  };
}


/**
 * Retrieves client records from the Clients sheet with optional search and status filtering.
 * Search supports filtering by Client ID, Client Name, Company, and Email.
 * Excludes soft-deleted clients by default unless explicitly requested.
 *
 * @param {Object|string} [param1] - Parameters object OR search query string.
 * @param {string} [param2] - Status filter string (if param1 is search string).
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output containing client list.
 */
function getClients(param1, param2) {
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

    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.CLIENTS)
      ? CONFIG.SHEET_NAMES.CLIENTS
      : 'Clients';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return responseSuccess([], 'No clients found');
    }

    const clients = [];
    const deletedStatus = getClientDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const client = mapRowToClient(data[i]);

      // Skip soft-deleted clients unless statusFilter explicitly requests 'deleted'
      if (client.status.toLowerCase() === deletedStatus && statusFilter !== deletedStatus) {
        continue;
      }

      // Apply status filter if provided
      if (statusFilter && statusFilter !== 'all' && client.status.toLowerCase() !== statusFilter) {
        continue;
      }

      // Apply search query across Client ID, Client Name, Company, Email, and Status
      if (searchQuery) {
        const matchesSearch =
          client.id.toLowerCase().indexOf(searchQuery) !== -1 ||
          client.clientName.toLowerCase().indexOf(searchQuery) !== -1 ||
          client.company.toLowerCase().indexOf(searchQuery) !== -1 ||
          client.email.toLowerCase().indexOf(searchQuery) !== -1 ||
          client.status.toLowerCase().indexOf(searchQuery) !== -1;

        if (!matchesSearch) {
          continue;
        }
      }

      clients.push(client);
    }

    return responseSuccess(clients, 'Clients retrieved successfully');
  } catch (error) {
    return responseError('Failed to retrieve clients: ' + error.message, 500);
  }
}

/**
 * Retrieves a single client record by Client ID.
 *
 * @param {string} id - Unique Client ID.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output containing client.
 */
function getClientById(id) {
  if (!id || id.toString().trim() === '') {
    return responseError('Client ID is required', 400);
  }

  const targetId = id.toString().trim().toLowerCase();

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.CLIENTS)
      ? CONFIG.SHEET_NAMES.CLIENTS
      : 'Clients';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const deletedStatus = getClientDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const client = mapRowToClient(data[i]);
      if (client.id.toLowerCase() === targetId) {
        if (client.status.toLowerCase() === deletedStatus) {
          return responseError('Client not found or deleted', 404);
        }
        return responseSuccess(client, 'Client retrieved successfully');
      }
    }

    return responseError('Client not found', 404);
  } catch (error) {
    return responseError('Failed to retrieve client: ' + error.message, 500);
  }
}

/**
 * Adds a new client record to the Clients sheet.
 * Validates required Client Name, Email format, prevents duplicate Email,
 * generates sequential Client ID, populates created date and created time,
 * saves row, and writes Activity Log.
 *
 * @param {Object} clientData - Object containing client properties.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output containing created client.
 */
function addClient(clientData) {
  if (!clientData || typeof clientData !== 'object') {
    return responseError('Invalid client payload data', 400);
  }

  const clientName = (clientData.clientName || clientData.name || '').toString().trim();
  if (!clientName) {
    return responseError('Client Name is required', 400);
  }

  const company = (clientData.company || clientData.companyName || '').toString().trim();
  const email = (clientData.email || clientData.emailAddress || '').toString().trim();
  const status = (clientData.status || getClientActiveStatus()).toString().trim();
  const notes = (clientData.notes || '').toString().trim();
  const userId = clientData.userId || 'SYSTEM';

  // 1. Validate Email format
  if (email && !isClientValidEmail(email)) {
    return responseError('Invalid email format', 400);
  }

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.CLIENTS)
      ? CONFIG.SHEET_NAMES.CLIENTS
      : 'Clients';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const deletedStatus = getClientDeletedStatus().toLowerCase();

    // 2. Prevent Duplicate Email against existing non-deleted clients
    for (let i = 1; i < data.length; i++) {
      const existingClient = mapRowToClient(data[i]);
      if (existingClient.status.toLowerCase() === deletedStatus) {
        continue;
      }

      if (email && existingClient.email && existingClient.email.toLowerCase() === email.toLowerCase()) {
        return responseError('Client with this email address already exists', 400);
      }
    }

    // Generate Client ID
    const id = generateId('CLI', sheetName);

    const createdDate = getCurrentDate();
    const createdTime = getCurrentTime();

    // Headers: [Client ID, Created Date, Created Time, Client Name, Company Name, Email, Status, Notes]
    const newRow = [
      id,
      createdDate,
      createdTime,
      clientName,
      company,
      email,
      status,
      notes
    ];

    sheet.appendRow(newRow);

    const createdClient = {
      id: id,
      clientId: id,
      createdDate: createdDate,
      createdTime: createdTime,
      clientName: clientName,
      company: company,
      companyName: company,
      email: email,
      status: status,
      notes: notes
    };

    writeActivityLog(userId, 'CREATE_CLIENT', 'Clients', id, 'Created Client', null, createdClient);

    return responseSuccess(createdClient, 'Client added successfully');
  } catch (error) {
    return responseError('Failed to add client: ' + error.message, 500);
  }
}

/**
 * Updates an existing client record by Client ID.
 */
function updateClient(id, clientData) {
  let targetId = '';
  let updates = {};

  if (typeof id === 'object' && id !== null) {
    updates = id;
    targetId = updates.id || updates.clientId || '';
  } else {
    targetId = id;
    updates = clientData || {};
  }

  if (!targetId) {
    return responseError('Client ID is required for update', 400);
  }

  if (updates.clientName !== undefined || updates.name !== undefined) {
    const checkName = (updates.clientName !== undefined ? updates.clientName : updates.name || '').toString().trim();
    if (!checkName) {
      return responseError('Client Name is required', 400);
    }
  }

  const userId = updates.userId || 'SYSTEM';

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.CLIENTS)
      ? CONFIG.SHEET_NAMES.CLIENTS
      : 'Clients';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;
    const deletedStatus = getClientDeletedStatus().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToClient(data[i]);
      if (record.id.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Client not found', 404);
    }

    const updatedClientName = (updates.clientName !== undefined)
      ? updates.clientName.toString().trim()
      : ((updates.name !== undefined) ? updates.name.toString().trim() : existingRecord.clientName);

    const updatedCompany = (updates.company !== undefined)
      ? updates.company.toString().trim()
      : ((updates.companyName !== undefined) ? updates.companyName.toString().trim() : existingRecord.company);

    const updatedEmail = (updates.email !== undefined)
      ? updates.email.toString().trim()
      : ((updates.emailAddress !== undefined) ? updates.emailAddress.toString().trim() : existingRecord.email);

    const updatedStatus = (updates.status !== undefined)
      ? updates.status.toString().trim()
      : existingRecord.status;

    const updatedNotes = (updates.notes !== undefined)
      ? updates.notes.toString().trim()
      : existingRecord.notes;

    // Validate Email format
    if (updatedEmail && !isClientValidEmail(updatedEmail)) {
      return responseError('Invalid email format', 400);
    }

    // Prevent Duplicate Email against other non-deleted clients
    for (let i = 1; i < data.length; i++) {
      const otherClient = mapRowToClient(data[i]);
      if (otherClient.id.toLowerCase() === targetId.toString().trim().toLowerCase() || otherClient.status.toLowerCase() === deletedStatus) {
        continue;
      }

      if (updatedEmail && otherClient.email && otherClient.email.toLowerCase() === updatedEmail.toLowerCase()) {
        return responseError('Client with this email address already exists', 400);
      }
    }

    // Update editable cells:
    // Col 4: Client Name, Col 5: Company Name, Col 6: Email, Col 7: Status, Col 8: Notes
    sheet.getRange(foundRowIndex, 4).setValue(updatedClientName); // Col 4: Client Name
    sheet.getRange(foundRowIndex, 5).setValue(updatedCompany);    // Col 5: Company Name
    sheet.getRange(foundRowIndex, 6).setValue(updatedEmail);      // Col 6: Email
    sheet.getRange(foundRowIndex, 7).setValue(updatedStatus);     // Col 7: Status
    sheet.getRange(foundRowIndex, 8).setValue(updatedNotes);      // Col 8: Notes

    const updatedClient = {
      id: existingRecord.id,
      clientId: existingRecord.id,
      createdDate: existingRecord.createdDate,
      createdTime: existingRecord.createdTime,
      clientName: updatedClientName,
      company: updatedCompany,
      companyName: updatedCompany,
      email: updatedEmail,
      status: updatedStatus,
      notes: updatedNotes
    };

    writeActivityLog(userId, 'UPDATE_CLIENT', 'Clients', existingRecord.id, 'Updated Client', existingRecord, updatedClient);

    return responseSuccess(updatedClient, 'Client updated successfully');
  } catch (error) {
    return responseError('Failed to update client: ' + error.message, 500);
  }
}

/**
 * Soft deletes a client record by updating Status to "Deleted".
 */
function deleteClient(id) {
  let targetId = '';
  let userId = 'SYSTEM';

  if (typeof id === 'object' && id !== null) {
    targetId = id.id || id.clientId || '';
    userId = id.userId || 'SYSTEM';
  } else {
    targetId = id;
  }

  if (!targetId) {
    return responseError('Client ID is required for deletion', 400);
  }

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.CLIENTS)
      ? CONFIG.SHEET_NAMES.CLIENTS
      : 'Clients';

    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    let foundRowIndex = -1;
    let existingRecord = null;

    for (let i = 1; i < data.length; i++) {
      const record = mapRowToClient(data[i]);
      if (record.id.toLowerCase() === targetId.toString().trim().toLowerCase()) {
        foundRowIndex = i + 1; // 1-based index
        existingRecord = record;
        break;
      }
    }

    if (foundRowIndex === -1 || !existingRecord) {
      return responseError('Client not found', 404);
    }

    const deletedStatus = getClientDeletedStatus();

    // Soft delete: Change Status (Col 7) to "Deleted"
    sheet.getRange(foundRowIndex, 7).setValue(deletedStatus);

    writeActivityLog(userId, 'DELETE_CLIENT', 'Clients', targetId, 'Deleted Client', existingRecord, null);

    return responseSuccess(null, 'Client deleted successfully');
  } catch (error) {
    return responseError('Failed to delete client: ' + error.message, 500);
  }
}

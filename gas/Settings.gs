/**
 * @file Settings.gs
 * @description Agency ERP configuration & system settings handlers.
 *
 * Sheet Structure (Single Settings Record):
 * Row 1 (Header): VAT (%) | USD Exchange Rate | Company Name | Company Email | Company Phone | Company Address
 * Row 2 (Data):   20      | 120               | Lucky Zip    | info@example.com | +8801XXXXXXXXX | Dhaka
 */

/**
 * Gets global system settings from Row 2 of the Settings sheet.
 *
 * @returns {Object} System settings object.
 */
function getSettings() {
  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.SETTINGS)
      ? CONFIG.SHEET_NAMES.SETTINGS
      : 'Settings';

    const sheet = getSheet(sheetName);
    ensureSettingsHeaders(sheet);

    const data = sheet.getDataRange().getValues();

    // Default settings values
    let vat = 15;
    let usdRate = 120;
    let companyName = 'Lucky Zip';
    let companyEmail = 'info@example.com';
    let companyPhone = '';
    let companyAddress = '';

    if (data.length >= 2) {
      const row = data[1];
      const parsedVat = Number(row[0]);
      if (!isNaN(parsedVat) && parsedVat >= 0) vat = parsedVat;

      const parsedUsd = Number(row[1]);
      if (!isNaN(parsedUsd) && parsedUsd > 0) usdRate = parsedUsd;

      if (row[2] !== undefined && row[2] !== null) companyName = String(row[2]).trim();
      if (row[3] !== undefined && row[3] !== null) companyEmail = String(row[3]).trim();
      if (row[4] !== undefined && row[4] !== null) companyPhone = String(row[4]).trim();
      if (row[5] !== undefined && row[5] !== null) companyAddress = String(row[5]).trim();
    } else {
      // Row 2 does not exist yet; populate row 2 with defaults
      sheet.getRange(2, 1, 1, 6).setValues([[vat, usdRate, companyName, companyEmail, companyPhone, companyAddress]]);
    }

    return {
      'VAT (%)': vat,
      'USD Exchange Rate': usdRate,
      'Company Name': companyName,
      'Company Email': companyEmail,
      'Company Phone': companyPhone,
      'Company Address': companyAddress,
      vatPercent: vat,
      vatPercentage: vat,
      taxRate: vat,
      vat: vat,
      usdExchangeRate: usdRate,
      usdRate: usdRate,
      companyName: companyName,
      companyEmail: companyEmail,
      companyPhone: companyPhone,
      companyAddress: companyAddress,
      agencyName: companyName || 'Agency ERP',
      currency: 'BDT',
      invoicePrefix: 'INV-',
      theme: 'light'
    };
  } catch (error) {
    return {
      'VAT (%)': 15,
      'USD Exchange Rate': 120,
      'Company Name': 'Lucky Zip',
      'Company Email': 'info@example.com',
      'Company Phone': '',
      'Company Address': '',
      vatPercent: 15,
      vatPercentage: 15,
      taxRate: 15,
      vat: 15,
      usdExchangeRate: 120,
      usdRate: 120,
      companyName: 'Lucky Zip',
      companyEmail: 'info@example.com',
      companyPhone: '',
      companyAddress: '',
      agencyName: 'Lucky Zip',
      currency: 'BDT',
      invoicePrefix: 'INV-',
      theme: 'light'
    };
  }
}

/**
 * Ensures Row 1 has the required headers and clears any key-value rows beyond row 2.
 */
function ensureSettingsHeaders(sheet) {
  const headers = ['VAT (%)', 'USD Exchange Rate', 'Company Name', 'Company Email', 'Company Phone', 'Company Address'];
  
  const lastRow = sheet.getLastRow();
  
  // Set Row 1 headers
  sheet.getRange(1, 1, 1, 6).setValues([headers]);

  // If there are leftover rows (Row 3 onwards from old key-value setups), clear them
  if (lastRow > 2) {
    sheet.getRange(3, 1, lastRow - 2, sheet.getLastColumn()).clearContent();
  }
}

/**
 * Updates global system settings in Row 2 of the Settings sheet.
 *
 * @param {Object} settingsData - Updated system settings object.
 * @returns {Object} Updated system settings object.
 */
function updateSettings(settingsData) {
  if (!settingsData || typeof settingsData !== 'object') {
    return getSettings();
  }

  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEET_NAMES && CONFIG.SHEET_NAMES.SETTINGS)
      ? CONFIG.SHEET_NAMES.SETTINGS
      : 'Settings';

    const oldSettings = getSettings();
    const sheet = getSheet(sheetName);
    ensureSettingsHeaders(sheet);

    // Current row 2 values
    let currentVat = oldSettings.vatPercent;
    let currentUsd = oldSettings.usdExchangeRate;
    let currentName = oldSettings.companyName;
    let currentEmail = oldSettings.companyEmail;
    let currentPhone = oldSettings.companyPhone;
    let currentAddress = oldSettings.companyAddress;

    // Extract VAT (%)
    if (settingsData['VAT (%)'] !== undefined && !isNaN(Number(settingsData['VAT (%)']))) {
      currentVat = Number(settingsData['VAT (%)']);
    } else if (settingsData.vatPercent !== undefined && !isNaN(Number(settingsData.vatPercent))) {
      currentVat = Number(settingsData.vatPercent);
    } else if (settingsData.vatPercentage !== undefined && !isNaN(Number(settingsData.vatPercentage))) {
      currentVat = Number(settingsData.vatPercentage);
    } else if (settingsData.taxRate !== undefined && !isNaN(Number(settingsData.taxRate))) {
      currentVat = Number(settingsData.taxRate);
    } else if (settingsData.vat !== undefined && !isNaN(Number(settingsData.vat))) {
      currentVat = Number(settingsData.vat);
    }

    // Extract USD Exchange Rate
    if (settingsData['USD Exchange Rate'] !== undefined && !isNaN(Number(settingsData['USD Exchange Rate']))) {
      currentUsd = Number(settingsData['USD Exchange Rate']);
    } else if (settingsData.usdExchangeRate !== undefined && !isNaN(Number(settingsData.usdExchangeRate))) {
      currentUsd = Number(settingsData.usdExchangeRate);
    } else if (settingsData.usdRate !== undefined && !isNaN(Number(settingsData.usdRate))) {
      currentUsd = Number(settingsData.usdRate);
    }

    // Extract Company Name
    if (settingsData['Company Name'] !== undefined) {
      currentName = String(settingsData['Company Name']);
    } else if (settingsData.companyName !== undefined) {
      currentName = String(settingsData.companyName);
    } else if (settingsData.agencyName !== undefined) {
      currentName = String(settingsData.agencyName);
    }

    // Extract Company Email
    if (settingsData['Company Email'] !== undefined) {
      currentEmail = String(settingsData['Company Email']);
    } else if (settingsData.companyEmail !== undefined) {
      currentEmail = String(settingsData.companyEmail);
    }

    // Extract Company Phone
    if (settingsData['Company Phone'] !== undefined) {
      currentPhone = String(settingsData['Company Phone']);
    } else if (settingsData.companyPhone !== undefined) {
      currentPhone = String(settingsData.companyPhone);
    }

    // Extract Company Address
    if (settingsData['Company Address'] !== undefined) {
      currentAddress = String(settingsData['Company Address']);
    } else if (settingsData.companyAddress !== undefined) {
      currentAddress = String(settingsData.companyAddress);
    }

    // Write directly to Row 2
    sheet.getRange(2, 1, 1, 6).setValues([[
      currentVat,
      currentUsd,
      currentName,
      currentEmail,
      currentPhone,
      currentAddress
    ]]);

    const newSettings = getSettings();
    writeActivityLog(settingsData.userId || 'SYSTEM', 'UPDATE_SETTINGS', 'Settings', 'SET-000001', 'Updated Settings', oldSettings, newSettings);

    return newSettings;
  } catch (error) {
    return getSettings();
  }
}

/**
 * Save settings alias for updateSettings.
 *
 * @param {Object} settingsData - Updated system settings object.
 * @returns {Object} Updated system settings object.
 */
function saveSettings(settingsData) {
  return updateSettings(settingsData);
}


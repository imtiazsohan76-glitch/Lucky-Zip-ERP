/**
 * @file Config.gs
 * @description Central Configuration file for Agency ERP Google Apps Script backend.
 */

/**
 * Global Configuration Object storing Spreadsheet ID, Sheet Names, Statuses, and Currencies.
 */
const CONFIG = {
  /**
   * Google Sheets Spreadsheet ID.
   * If running as a standalone Apps Script, put your Spreadsheet ID below.
   * If container-bound (attached directly to your Google Sheet), leave as empty string.
   */
  SPREADSHEET_ID: '1up_8Q8rkTCNtQek7M6arQHnn2nMFWuXygzZWxU6j-Gg',

  /**
   * Sheet Names corresponding to database tables in Google Sheets.
   */
  SHEET_NAMES: {
    CLIENTS: 'Clients',
    EMPLOYEES: 'Employees',
    PROJECTS: 'Projects',
    INCOME: 'Income',
    EXPENSES: 'Expenses',
    USERS: 'Users',
    SETTINGS: 'Settings',
    ACTIVITY_LOG: 'ActivityLog',
    SALARY_PAYMENTS: 'SalaryPayments'
  },

  /**
   * Status Constants across Agency ERP modules.
   */
  STATUS: {
    PROJECT: {
      PENDING: 'Pending',
      RUNNING: 'Running',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled'
    },
    INCOME: {
      PAID: 'Paid',
      PENDING: 'Pending',
      CANCELLED: 'Cancelled'
    },
    EXPENSE: {
      PAID: 'Paid',
      PENDING: 'Pending'
    },
    EMPLOYEE: {
      ACTIVE: 'Active',
      INACTIVE: 'Inactive'
    },
    USER: {
      ACTIVE: 'Active',
      INACTIVE: 'Inactive'
    }
  },

  /**
   * Currency Constants supported by the system.
   */
  CURRENCIES: {
    BDT: 'BDT',
    USD: 'USD'
  }
};

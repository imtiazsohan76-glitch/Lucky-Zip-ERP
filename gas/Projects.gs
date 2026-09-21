/**
 * @file Projects.gs
 * @description Agency ERP - Projects Module
 */

/* ==========================================================
   STATUS
========================================================== */

function getProjectDeletedStatus() {
  return "Deleted";
}

function getDefaultProjectStatus() {
  return "Pending";
}

/* ==========================================================
   EMPLOYEE FORMATTER
========================================================== */

function formatAssignedEmployees(value) {

  if (!value) return "";

  if (Array.isArray(value)) {

    return value
      .map(function (v) {
        return String(v).trim();
      })
      .filter(Boolean)
      .join(",");

  }

  return String(value)
    .split(",")
    .map(function (v) {
      return v.trim();
    })
    .filter(Boolean)
    .join(",");

}

/* ==========================================================
   DATE FORMAT
========================================================== */

function formatDateString(value) {

  if (!value) return "";

  if (value instanceof Date) {

    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

  }

  const date = new Date(value);

  if (!isNaN(date.getTime())) {

    return Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

  }

  return String(value);

}

/* ==========================================================
   SETTINGS
========================================================== */

function getVatPercentFromSettings() {
  try {
    const settings = getSettings() || {};
    if (settings.taxRate !== undefined && !isNaN(Number(settings.taxRate)) && Number(settings.taxRate) >= 0) {
      return Number(settings.taxRate);
    }
    if (settings.vatPercentage !== undefined && !isNaN(Number(settings.vatPercentage)) && Number(settings.vatPercentage) >= 0) {
      return Number(settings.vatPercentage);
    }
    if (settings.vatPercent !== undefined && !isNaN(Number(settings.vatPercent)) && Number(settings.vatPercent) >= 0) {
      return Number(settings.vatPercent);
    }
    if (settings.vat !== undefined && !isNaN(Number(settings.vat)) && Number(settings.vat) >= 0) {
      return Number(settings.vat);
    }
  } catch (e) {}
  return getCurrentVatPercent();
}

function getCurrentVatPercent() {
  try {
    const settings = getSettings();
    if (settings && settings.vatPercent !== undefined && !isNaN(Number(settings.vatPercent))) {
      return Number(settings.vatPercent);
    }
    return 15;
  } catch (e) {
    return 15;
  }
}

/* ==========================================================
   MAP ROW
========================================================== */

function calculateTotalEmployeePayment(details) {
  if (!details) return 0;
  if (typeof details === 'number') return details;
  let total = 0;
  const str = String(details).trim();
  const parts = str.split('|');
  for (let i = 0; i < parts.length; i++) {
    const pair = parts[i].split('=');
    if (pair.length === 2) {
      const val = Number(pair[1]);
      if (!isNaN(val)) total += val;
    }
  }
  return total;
}

function mapRowToProject(row) {
  const curr = String(row[6] || "BDT").trim().toUpperCase();
  const amt = Number(row[7] || 0);
  const vat = Number(row[8] || 0);
  const empPayDetails = String(row[13] || "").trim();
  const totalEmpPay = Number(row[14] || calculateTotalEmployeePayment(empPayDetails));

  return {
    id: String(row[0] || "").trim(),
    projectId: String(row[0] || "").trim(),
    createdDate: formatDateString(row[1]),
    createdTime: String(row[2] || "").trim(),
    clientId: String(row[3] || "").trim(),
    clientName: String(row[4] || "").trim(),
    client: String(row[4] || "").trim(),
    projectName: String(row[5] || "").trim(),
    name: String(row[5] || "").trim(),
    currency: curr === "USD" ? "USD" : "BDT",
    amount: amt,
    priceBDT: curr === "USD" ? 0 : amt,
    priceBdt: curr === "USD" ? 0 : amt,
    priceUSD: curr === "USD" ? amt : 0,
    priceUsd: curr === "USD" ? amt : 0,
    vatAmount: vat,
    startDate: formatDateString(row[9]),
    endDate: formatDateString(row[10]),
    assignedEmployeeIds: String(row[11] || "").trim(),
    assignedEmployeeNames: String(row[12] || "").trim(),
    assignedEmployees: String(row[12] || "").trim(),
    employeePaymentDetails: empPayDetails,
    totalEmployeePayment: totalEmpPay,
    status: String(row[15] || "").trim(),
    notes: String(row[16] || "").trim()
  };
}

function processProjectPayments(project) {
  if (!project) return;

  const status = (project.status || "").toString().toLowerCase();
  if (status !== "completed") return;

  const paymentDetails = project.employeePaymentDetails || "";
  if (!paymentDetails) return;

  const currency = (project.currency || "BDT").toUpperCase();
  const pairs = paymentDetails.split('|');

  pairs.forEach(function(pair) {
    if (!pair.trim()) return;
    const parts = pair.split('=');
    if (parts.length !== 2) return;
    const empId = parts[0].trim();
    const payAmt = Number(parts[1]);
    if (!empId || isNaN(payAmt) || payAmt <= 0) return;

    let empName = empId;
    try {
      const employeeSheet = getSheet(CONFIG.SHEET_NAMES.EMPLOYEES);
      const employeeData = employeeSheet.getDataRange().getValues();
      for (let i = 1; i < employeeData.length; i++) {
        const row = mapRowToEmployee(employeeData[i]);
        if (row.employeeId === empId) {
          empName = row.employeeName;
          break;
        }
      }
    } catch (e) {}

    addSalaryPayment({
      employeeId: empId,
      employeeName: empName,
      salaryMonth: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM yyyy"),
      currency: "BDT",
      amount: payAmt,
      fixedSalary: 0,
      projectPayment: payAmt,
      totalPaid: payAmt,
      paymentMethod: "Bank",
      paymentDate: getCurrentDate(),
      status: "Add",
      projectName: project.projectName || project.name || "",
      notes: ""
    });
  });
}

function updateProject(id, projectData) {
  let targetId = "";
  let updates = {};

  if (typeof id === "object" && id !== null) {
    updates = id;
    targetId = updates.id || updates.projectId;
  } else {
    targetId = id;
    updates = projectData || {};
  }

  const userId = updates.userId || "SYSTEM";

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== String(targetId).trim()) continue;

    const oldProject = mapRowToProject(data[i]);
    const newStatus = updates.status || oldProject.status;

    const currency = (updates.currency || oldProject.currency || "BDT").toUpperCase();
    const amt = Number(updates.amount ?? updates.budget ?? updates.price ?? updates.priceBDT ?? updates.priceUSD ?? oldProject.amount ?? 0);

    const vatPercent = getVatPercentFromSettings();
    const vatAmount = +((amt * vatPercent) / 100).toFixed(2);

    const empPaymentDetails = updates.employeePaymentDetails !== undefined ? updates.employeePaymentDetails : oldProject.employeePaymentDetails;
    const totalEmpPayment = updates.totalEmployeePayment !== undefined ? Number(updates.totalEmployeePayment) : calculateTotalEmployeePayment(empPaymentDetails);

    // 17 columns:
    // 1. ID | 2. Created Date | 3. Created Time | 4. Client ID | 5. Client Name | 6. Project Name
    // 7. Currency | 8. Amount | 9. VAT Amount | 10. Start Date | 11. End Date
    // 12. Assigned Employee IDs | 13. Assigned Employee Names | 14. Employee Payment Details | 15. Total Employee Payment | 16. Status | 17. Notes
    sheet.getRange(i + 1, 4).setValue(updates.clientId || oldProject.clientId);
    sheet.getRange(i + 1, 5).setValue(updates.clientName || oldProject.clientName);
    sheet.getRange(i + 1, 6).setValue(updates.projectName || updates.name || oldProject.projectName);
    sheet.getRange(i + 1, 7).setValue(currency);
    sheet.getRange(i + 1, 8).setValue(amt);
    sheet.getRange(i + 1, 9).setValue(vatAmount);
    sheet.getRange(i + 1, 10).setValue(formatDateString(updates.startDate || oldProject.startDate));
    sheet.getRange(i + 1, 11).setValue(formatDateString(updates.endDate || oldProject.endDate));
    sheet.getRange(i + 1, 12).setValue(formatAssignedEmployees(updates.assignedEmployeeIds || oldProject.assignedEmployeeIds));
    sheet.getRange(i + 1, 13).setValue(formatAssignedEmployees(updates.assignedEmployeeNames || updates.assignedEmployees || oldProject.assignedEmployeeNames));
    sheet.getRange(i + 1, 14).setValue(empPaymentDetails);
    sheet.getRange(i + 1, 15).setValue(totalEmpPayment);
    sheet.getRange(i + 1, 16).setValue(newStatus);
    sheet.getRange(i + 1, 17).setValue(updates.notes || oldProject.notes);

    const project = mapRowToProject(sheet.getRange(i + 1, 1, 1, 17).getValues()[0]);

    if (
      oldProject.status.toLowerCase() !== "completed" &&
      newStatus.toLowerCase() === "completed"
    ) {
      processProjectPayments(project);
    }

    writeActivityLog(userId, 'UPDATE_PROJECT', 'Projects', targetId, 'Updated Project', oldProject, project);

    return responseSuccess(project, "Project Updated Successfully");
  }

  return responseError("Project Not Found");
}

function deleteProject(id) {
  let projectId = "";
  let userId = "SYSTEM";

  if (typeof id === "object" && id !== null) {
    projectId = id.id || id.projectId;
    userId = id.userId || "SYSTEM";
  } else {
    projectId = id;
  }

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(projectId)) continue;

    const oldProject = mapRowToProject(data[i]);

    // Soft delete: set Status (Col 16) to "Deleted"
    sheet.getRange(i + 1, 16).setValue(getProjectDeletedStatus());

    writeActivityLog(userId, 'DELETE_PROJECT', 'Projects', projectId, 'Deleted Project', oldProject, null);

    return responseSuccess({ id: projectId }, "Project Deleted Successfully");
  }

  return responseError("Project Not Found");
}

/* ==========================================================
   ADD PROJECT
========================================================== */

function addProject(projectData) {
  if (!projectData) {
    return responseError("Invalid Project Data");
  }

  const userId = projectData.userId || "SYSTEM";
  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);

  const vatPercent = getVatPercentFromSettings();

  const currency = (projectData.currency || "BDT").toUpperCase();
  const amt = Number(projectData.amount !== undefined ? projectData.amount : (projectData.price !== undefined ? projectData.price : (projectData.priceBDT || projectData.priceUSD || 0)));

  const vatAmount = +((amt * vatPercent) / 100).toFixed(2);

  const empPaymentDetails = projectData.employeePaymentDetails || "";
  const totalEmpPayment = Number(projectData.totalEmployeePayment !== undefined ? projectData.totalEmployeePayment : calculateTotalEmployeePayment(empPaymentDetails));

  const row = [
    generateId("PRJ"),
    getCurrentDate(),
    getCurrentTime(),
    projectData.clientId || "",
    projectData.clientName || "",
    projectData.projectName || projectData.name || "",
    currency,
    amt,
    vatAmount,
    formatDateString(projectData.startDate),
    formatDateString(projectData.endDate),
    formatAssignedEmployees(projectData.assignedEmployeeIds),
    formatAssignedEmployees(projectData.assignedEmployeeNames || projectData.assignedEmployees),
    empPaymentDetails,
    totalEmpPayment,
    projectData.status || getDefaultProjectStatus(),
    projectData.notes || ""
  ];

  sheet.appendRow(row);

  const project = mapRowToProject(row);

  if ((project.status || "").toLowerCase() === "completed") {
    processProjectPayments(project);
  }

  writeActivityLog(userId, 'CREATE_PROJECT', 'Projects', project.id, 'Created Project', null, project);

  return responseSuccess(project, "Project Added Successfully");
}

/* ==========================================================
   GET ALL PROJECTS
========================================================== */

function getProjects(params) {

  try {

    const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);

    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return responseSuccess([], "No Projects Found");
    }

    const search = params && params.search
      ? String(params.search).toLowerCase().trim()
      : "";

    const status = params && params.status
      ? String(params.status).toLowerCase().trim()
      : "";

    const projects = [];

    for (let i = 1; i < data.length; i++) {

      const project = mapRowToProject(data[i]);

      if (
        project.status.toLowerCase() ===
        getProjectDeletedStatus().toLowerCase()
      ) {
        continue;
      }

      if (
        status &&
        status !== "all" &&
        project.status.toLowerCase() !== status
      ) {
        continue;
      }

      if (search) {

        const found =

          project.projectId.toLowerCase().includes(search) ||

          project.projectName.toLowerCase().includes(search) ||

          project.clientName.toLowerCase().includes(search);

        if (!found) continue;

      }

      projects.push(project);

    }

    return responseSuccess(
      projects,
      "Projects Loaded Successfully"
    );

  } catch (e) {

    return responseError(e.message);

  }

}

/* ==========================================================
   GET PROJECT BY ID
========================================================== */

function getProjectById(id) {

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if (String(data[i][0]) === String(id)) {

      return responseSuccess(

        mapRowToProject(data[i]),

        "Project Found"

      );

    }

  }

  return responseError("Project Not Found");

}

/* ==========================================================
   HELPER : PROJECT EXISTS
========================================================== */

function projectExists(projectId) {

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if (String(data[i][0]) === String(projectId)) {
      return true;
    }

  }

  return false;

}

/* ==========================================================
   HELPER : GET PROJECT ROW
========================================================== */

function getProjectRow(projectId) {

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if (String(data[i][0]) === String(projectId)) {
      return i + 1;
    }

  }

  return -1;

}

/* ==========================================================
   HELPER : REFRESH PROJECT VAT
========================================================== */

function refreshProjectVat(projectId) {

  const row = getProjectRow(projectId);

  if (row === -1) return;

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);

  const priceBDT = Number(sheet.getRange(row,7).getValue() || 0);
  const priceUSD = Number(sheet.getRange(row,8).getValue() || 0);

  const settings = getSettings();

  const vatPercent = Number(settings.vat || settings.vatPercent || 0);

  let vat = 0;

  if (priceBDT > 0) {

    vat = +(priceBDT * vatPercent / 100).toFixed(2);

  }

  if (priceUSD > 0) {

    vat = +(priceUSD * vatPercent / 100).toFixed(2);

  }

  sheet.getRange(row,9).setValue(vat);

}

/* ==========================================================
   HELPER : RECALCULATE ALL PROJECT VAT
========================================================== */

function refreshAllProjectVat() {

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    refreshProjectVat(data[i][0]);

  }

}

/* ==========================================================
   HELPER : PROJECT SUMMARY
========================================================== */

function getProjectSummary() {

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);
  const data = sheet.getDataRange().getValues();

  let totalProjects = 0;
  let pendingProjects = 0;
  let runningProjects = 0;
  let completedProjects = 0;

  let totalBDT = 0;
  let totalUSD = 0;

  let vatBDT = 0;
  let vatUSD = 0;

  for (let i = 1; i < data.length; i++) {

    const p = mapRowToProject(data[i]);

    if (
      p.status.toLowerCase() ===
      getProjectDeletedStatus().toLowerCase()
    ) {
      continue;
    }

    totalProjects++;

    switch ((p.status || "").toLowerCase()) {

      case "pending":
        pendingProjects++;
        break;

      case "running":
        runningProjects++;
        break;

      case "completed":
        completedProjects++;
        if (Number(p.priceUSD || 0) > 0 || (p.currency || "").toUpperCase() === "USD") {
          totalUSD += Number(p.priceUSD || p.amount || 0);
          vatUSD += Number(p.vatAmount || 0);
        } else {
          totalBDT += Number(p.priceBDT || p.amount || 0);
          vatBDT += Number(p.vatAmount || 0);
        }
        break;

    }

  }

  return {

    totalProjects: totalProjects,

    pendingProjects: pendingProjects,

    runningProjects: runningProjects,

    completedProjects: completedProjects,

    totalBDT: totalBDT,

    totalUSD: totalUSD,

    vatBDT: vatBDT,

    vatUSD: vatUSD,

    netBDT: totalBDT - vatBDT,

    netUSD: totalUSD - vatUSD

  };

}

/* ==========================================================
   UTILITIES
========================================================== */

function recalculateCompletedProjectCommissions() {

  const sheet = getSheet(CONFIG.SHEET_NAMES.PROJECTS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return;

  for (let i = 1; i < data.length; i++) {

    const project = mapRowToProject(data[i]);

    if (
      (project.status || "").toLowerCase() === "completed"
    ) {

      processProjectCommissions(project);

    }

  }

}

/* ==========================================================
   DASHBOARD DATA
========================================================== */

function getProjectDashboardData() {

  const summary = getProjectSummary();

  return responseSuccess({

    totalProjects: summary.totalProjects,

    pendingProjects: summary.pendingProjects,

    runningProjects: summary.runningProjects,

    completedProjects: summary.completedProjects,

    totalBDT: summary.totalBDT,

    totalUSD: summary.totalUSD,

    vatBDT: summary.vatBDT,

    vatUSD: summary.vatUSD,

    netBDT: summary.netBDT,

    netUSD: summary.netUSD

  }, "Dashboard Loaded");

}

/* ==========================================================
   EXPORT
========================================================== */

function getProjectsForDashboard() {

  const projects = getProjects({});

  return projects;

}
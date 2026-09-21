import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfReportData {
  companyName: string;
  companyLogo?: string;
  employeeName: string;
  employeeId: string;
  designation: string;
  salaryMonth: string;

  // Salary Summary
  fixedSalaryBDT: number;
  fixedSalaryUSD: number;
  commissionEarnedBDT: number;
  commissionEarnedUSD: number;
  fixedPaidBDT: number;
  fixedPaidUSD: number;
  commissionPaidBDT: number;
  commissionPaidUSD: number;
  remainingBalanceBDT: number;
  remainingBalanceUSD: number;

  // Completed Projects in Selected Month
  completedProjects: Array<{
    projectName: string;
    completionDate: string;
    commissionPercent: number;
    commissionEarnedBDT: number;
    commissionEarnedUSD: number;
  }>;

  // Payment History in Selected Month
  paymentHistory: Array<{
    paymentDate: string;
    paymentMethod: string;
    amountBDT: number;
    amountUSD: number;
    status: string;
  }>;
}

/**
 * Format currency specifically for PDF rendering without non-ASCII characters like '৳'
 * which cause rendering encoding artifacts (e.g., 'ó') in jsPDF default fonts.
 */
function formatPdfCurrency(val: number | string | undefined | null, currency: 'BDT' | 'USD' | string = 'BDT'): string {
  if (val === undefined || val === null || val === '') {
    return (currency === 'USD' || currency === '$') ? '$0' : 'BDT 0';
  }
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) {
    return (currency === 'USD' || currency === '$') ? '$0' : 'BDT 0';
  }

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  if (currency === 'USD' || currency === '$') {
    return `$${formatted}`;
  }
  return `BDT ${formatted}`;
}

/**
 * Helper to produce a circular crop PNG data URL from an image data URL via offscreen canvas.
 * This avoids calling jsPDF's clip() directly which corrupts global page graphics state.
 */
function createCircularLogoDataUrl(dataUrl: string, size: number = 256): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    const img = new Image();
    img.src = dataUrl;

    // Draw circular clip on HTML canvas
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw image centered inside circle
    ctx.drawImage(img, 0, 0, size, size);

    return canvas.toDataURL('image/png');
  } catch {
    return dataUrl;
  }
}

export function generateEmployeeMonthlyPdf(data: PdfReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2);

  // Derived Financials
  const totalEarnedBDT = (data.fixedSalaryBDT || 0) + (data.commissionEarnedBDT || 0);
  const totalPaidBDT = (data.fixedPaidBDT || 0) + (data.commissionPaidBDT || 0);
  const remainingBDT = data.remainingBalanceBDT || 0;

  // ========================================================
  // 1. EXECUTIVE HEADER BANNER (#0F172A Slate 900)
  // ========================================================
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Decorative Accent Line (#2563EB Royal Blue)
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 29, pageWidth, 1.2, 'F');

  // ROUND AGENCY LOGO / BRAND BADGE
  let headerTextLeft = marginX;
  const logoRadius = 9; // 18mm diameter circle
  const logoCenterX = marginX + logoRadius;
  const logoCenterY = 15; // Centered vertically in 30mm banner

  let logoDrawnSuccess = false;

  if (data.companyLogo && data.companyLogo.startsWith('data:image')) {
    try {
      const circularLogoUrl = createCircularLogoDataUrl(data.companyLogo, 256);

      doc.addImage(
        circularLogoUrl,
        'PNG',
        logoCenterX - logoRadius,
        logoCenterY - logoRadius,
        logoRadius * 2,
        logoRadius * 2
      );

      // White ring stroke around circular logo
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      doc.circle(logoCenterX, logoCenterY, logoRadius, 'S');

      logoDrawnSuccess = true;
      headerTextLeft = marginX + (logoRadius * 2) + 5;
    } catch {
      logoDrawnSuccess = false;
    }
  }

  // Fallback: Elegant Round Brand Initial Badge
  if (!logoDrawnSuccess) {
    doc.setFillColor(37, 99, 235); // Royal Blue-600
    doc.circle(logoCenterX, logoCenterY, logoRadius, 'F');

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.circle(logoCenterX, logoCenterY, logoRadius, 'S');

    const brandInitial = (data.companyName || 'A').charAt(0).toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(brandInitial, logoCenterX, logoCenterY + 3.8, { align: 'center' });

    headerTextLeft = marginX + (logoRadius * 2) + 5;
  }

  // Company Name & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(data.companyName || 'Agency ERP', headerTextLeft, 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('OFFICIAL MONTHLY PAYSLIP & SALARY STATEMENT', headerTextLeft, 19.5);

  // Header Right Side Badge (Salary Period)
  const monthBadgeText = `STATEMENT: ${data.salaryMonth.toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const monthBadgeWidth = doc.getTextWidth(monthBadgeText) + 8;
  const monthBadgeX = pageWidth - marginX - monthBadgeWidth;

  doc.setFillColor(30, 41, 59); // Slate-800
  doc.setDrawColor(51, 65, 85); // Slate-700
  doc.roundedRect(monthBadgeX, 8.5, monthBadgeWidth, 13, 2, 2, 'FD');

  doc.setTextColor(147, 197, 253); // Light Blue-300
  doc.text(monthBadgeText, monthBadgeX + 4, 16.5);

  let currentY = 36;

  // ========================================================
  // 2. EMPLOYEE & STATEMENT METADATA CARD
  // ========================================================
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, 25, 2.5, 2.5, 'FD');

  // Left Blue Accent Ribbon
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(marginX, currentY, 2.5, 25, 1, 1, 'F');

  const col1X = marginX + 7;
  const col2X = marginX + (contentWidth / 2) + 2;

  // Left Column Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(data.employeeName, col1X, currentY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('Employee ID: ', col1X, currentY + 14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(data.employeeId || 'N/A', col1X + 22, currentY + 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Designation: ', col1X, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(data.designation || 'Staff Member', col1X + 22, currentY + 20);

  // Right Column Details
  const cleanMonthCode = data.salaryMonth.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const refNo = `PAY-${data.employeeId}-${cleanMonthCode}`;
  const todayStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Statement Ref: ', col2X, currentY + 8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(refNo, col2X + 24, currentY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Issue Date: ', col2X, currentY + 14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(todayStr, col2X + 24, currentY + 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Payment Status: ', col2X, currentY + 20);

  const isFullySettled = remainingBDT <= 0;
  doc.setFont('helvetica', 'bold');
  if (isFullySettled) {
    doc.setTextColor(16, 185, 129); // Green
    doc.text('SETTLED / PAID', col2X + 24, currentY + 20);
  } else if (totalPaidBDT > 0) {
    doc.setTextColor(217, 119, 6); // Amber
    doc.text('PARTIALLY PAID', col2X + 24, currentY + 20);
  } else {
    doc.setTextColor(225, 29, 72); // Red
    doc.text('UNPAID / PENDING', col2X + 24, currentY + 20);
  }

  currentY += 29;

  // ========================================================
  // 3. FINANCIAL HIGHLIGHT SUMMARY CARDS (3 CARDS ROW)
  // ========================================================
  const cardGap = 4;
  const cardWidth = (contentWidth - (cardGap * 2)) / 3;

  // Card 1: Total Earned
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.setDrawColor(191, 219, 254); // Blue-200
  doc.roundedRect(marginX, currentY, cardWidth, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(29, 78, 216); // Blue-700
  doc.text('TOTAL EARNED (ENTITLED)', marginX + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text(formatPdfCurrency(totalEarnedBDT, 'BDT'), marginX + 4, currentY + 14);

  // Card 2: Total Paid
  const card2X = marginX + cardWidth + cardGap;
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(167, 243, 208); // Emerald-200
  doc.roundedRect(card2X, currentY, cardWidth, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87); // Emerald-700
  doc.text('TOTAL PAID IN MONTH', card2X + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(6, 78, 59); // Emerald-900
  doc.text(formatPdfCurrency(totalPaidBDT, 'BDT'), card2X + 4, currentY + 14);

  // Card 3: Outstanding Balance
  const card3X = card2X + cardWidth + cardGap;
  doc.setFillColor(remainingBDT > 0 ? 254 : 240, remainingBDT > 0 ? 242 : 253, remainingBDT > 0 ? 242 : 244); 
  doc.setDrawColor(remainingBDT > 0 ? 254 : 187, remainingBDT > 0 ? 205 : 247, remainingBDT > 0 ? 211 : 208); 
  doc.roundedRect(card3X, currentY, cardWidth, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(remainingBDT > 0 ? 190 : 21, remainingBDT > 0 ? 18 : 128, remainingBDT > 0 ? 60 : 61);
  doc.text('NET OUTSTANDING BALANCE', card3X + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(remainingBDT > 0 ? 136 : 6, remainingBDT > 0 ? 19 : 78, remainingBDT > 0 ? 55 : 59);
  doc.text(formatPdfCurrency(remainingBDT, 'BDT'), card3X + 4, currentY + 14);

  currentY += 24;

  // ========================================================
  // 4. FINANCIAL BREAKDOWN TABLE
  // ========================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. SALARY & COMMISSION BREAKDOWN', marginX, currentY);

  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    head: [['Earnings & Deductions Component', 'Entitled Amount', 'Disbursed Amount', 'Balance']],
    body: [
      [
        'Fixed Base Salary', 
        formatPdfCurrency(data.fixedSalaryBDT, 'BDT'), 
        formatPdfCurrency(data.fixedPaidBDT, 'BDT'),
        formatPdfCurrency(Math.max(0, data.fixedSalaryBDT - data.fixedPaidBDT), 'BDT')
      ],
      [
        `Project Commissions (${data.completedProjects.length} Completed Projects)`, 
        formatPdfCurrency(data.commissionEarnedBDT, 'BDT'), 
        formatPdfCurrency(data.commissionPaidBDT, 'BDT'),
        formatPdfCurrency(Math.max(0, data.commissionEarnedBDT - data.commissionPaidBDT), 'BDT')
      ]
    ],
    foot: [
      [
        'TOTAL FINANCIAL SUMMARY', 
        formatPdfCurrency(totalEarnedBDT, 'BDT'), 
        formatPdfCurrency(totalPaidBDT, 'BDT'),
        formatPdfCurrency(remainingBDT, 'BDT')
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3
    },
    footStyles: {
      fillColor: [241, 245, 249], // Slate-100
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: marginX, right: marginX }
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // ========================================================
  // 5. PROJECT COMMISSIONS BREAKDOWN
  // ========================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. COMPLETED PROJECTS & COMMISSIONS (${data.salaryMonth})`, marginX, currentY);

  currentY += 2;

  if (data.completedProjects.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Project Name', 'Completion Date', 'Commission Earned']],
      body: data.completedProjects.map(p => [
        p.projectName,
        p.completionDate || '—',
        p.commissionEarnedBDT > 0 ? formatPdfCurrency(p.commissionEarnedBDT, 'BDT') : '—'
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105], // Slate-600
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2.5
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 2.5
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: marginX, right: marginX }
    });
    currentY = (doc as any).lastAutoTable.finalY + 7;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`No completed project commissions registered for ${data.salaryMonth}.`, marginX, currentY + 4);
    currentY += 9;
  }

  // ========================================================
  // 6. PAYMENT DISBURSEMENT HISTORY
  // ========================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`3. PAYMENT DISBURSEMENT HISTORY (${data.salaryMonth})`, marginX, currentY);

  currentY += 2;

  if (data.paymentHistory.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Disbursement Date', 'Payment Channel / Method', 'Paid Amount', 'Status']],
      body: data.paymentHistory.map(ph => [
        ph.paymentDate || '—',
        ph.paymentMethod || 'Bank Transfer',
        ph.amountBDT > 0 ? formatPdfCurrency(ph.amountBDT, 'BDT') : '—',
        ph.status || 'Paid'
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [16, 185, 129], // Emerald-600
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2.5
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 2.5
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: marginX, right: marginX }
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`No payment disbursements logged in system for ${data.salaryMonth}.`, marginX, currentY + 4);
    currentY += 14;
  }

  // Check vertical space for Signatures block
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = 25;
  }

  // ========================================================
  // 7. OFFICIAL SIGNATURES & VERIFICATION BOX
  // ========================================================
  const sigWidth = 60;
  const sigY = pageHeight - 32;

  // Employee Signature Line
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.4);
  doc.line(marginX, sigY, marginX + sigWidth, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Employee Signature', marginX, sigY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(data.employeeName, marginX, sigY + 7.5);

  // Management / Authorized Signature Line
  const rightSigX = pageWidth - marginX - sigWidth;
  doc.line(rightSigX, sigY, rightSigX + sigWidth, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Management', rightSigX, sigY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${data.companyName || 'Agency ERP'} Finance`, rightSigX, sigY + 7.5);

  // System Security Note in center
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175);
  doc.text('Computer-generated document. Verified & issued electronically by Agency ERP System.', pageWidth / 2, sigY + 4, { align: 'center' });

  // ========================================================
  // 8. MULTI-PAGE FOOTER & CONFIDENTIALITY STAMP
  // ========================================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  const now = new Date();
  const timestampStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`CONFIDENTIAL  |  ${data.companyName || 'Agency ERP'}  |  Generated: ${timestampStr}`, marginX, pageHeight - 6.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, { align: 'right' });
  }

  // Save filename with clean formatting (e.g. Imtiaz_Sohan_April_2026_Payslip.pdf)
  const cleanEmpName = data.employeeName.trim().replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  const cleanMonthYear = data.salaryMonth.trim().replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  const fileName = `${cleanEmpName}_${cleanMonthYear}_Payslip.pdf`;

  doc.save(fileName);
}

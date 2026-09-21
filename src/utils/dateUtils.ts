/**
 * Utility helpers to format Payment Date and Salary Month cleanly for UI display.
 */

export interface FormattedDateResult {
  date: string; // e.g. "28 Jul 2026"
  time: string; // e.g. "01:03 PM"
  fullStr: string; // e.g. "28 Jul 2026, 01:03 PM" or "28 Jul 2026"
}

export function formatDisplayPaymentDate(rawDate: any): FormattedDateResult {
  if (!rawDate || rawDate === '—' || rawDate === 'N/A') {
    return { date: '—', time: '', fullStr: '—' };
  }

  const str = String(rawDate).trim();
  if (!str) return { date: '—', time: '', fullStr: '—' };

  // Attempt to parse Date object from string
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const datePart = `${day} ${month} ${year}`;

    // Check if time is present in string or Date object has non-zero hours/minutes
    const hasTimeInStr = /\d{1,2}:\d{2}/.test(str) || (d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0);
    
    let timePart = '';
    if (hasTimeInStr) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const strHours = String(hours).padStart(2, '0');
      timePart = `${strHours}:${minutes} ${ampm}`;
    }

    const fullStr = timePart ? `${datePart}, ${timePart}` : datePart;
    return { date: datePart, time: timePart, fullStr };
  }

  // Fallback if Date constructor couldn't parse
  return { date: str, time: '', fullStr: str };
}

export function formatDisplaySalaryMonth(rawMonth: any): string {
  if (!rawMonth || rawMonth === '—' || rawMonth === 'N/A') return '—';

  const str = String(rawMonth).trim();
  if (!str) return '—';

  // Check if string is simply a standalone month name (e.g. "July", "july")
  const ALL_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const exactMonth = ALL_MONTHS.find(m => m.toLowerCase() === str.toLowerCase());
  if (exactMonth) {
    return exactMonth;
  }

  // 1. Check if string is already formatted like "July 2026", "Jul 2026", "July, 2026"
  const cleanMatch = str.match(/^([A-Za-z]+)[,\s]+(\d{4})$/);
  if (cleanMatch) {
    const mName = cleanMatch[1];
    const yNum = cleanMatch[2];
    const testDate = new Date(`${mName} 1, ${yNum}`);
    if (!isNaN(testDate.getTime())) {
      return `${testDate.toLocaleDateString('en-US', { month: 'long' })} ${yNum}`;
    }
  }

  // 2. Check YYYY-MM
  const yearMonthMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonthMatch) {
    const yNum = parseInt(yearMonthMatch[1], 10);
    const mNum = parseInt(yearMonthMatch[2], 10);
    const testDate = new Date(yNum, mNum - 1, 1);
    if (!isNaN(testDate.getTime())) {
      return testDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  // 3. Check MM-YYYY
  const monthYearMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (monthYearMatch) {
    const mNum = parseInt(monthYearMatch[1], 10);
    const yNum = parseInt(monthYearMatch[2], 10);
    const testDate = new Date(yNum, mNum - 1, 1);
    if (!isNaN(testDate.getTime())) {
      return testDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  // 4. Try parsing full Date string e.g. "Wed Jul 01 2026 00:00:00 GMT+0600 (Bangladesh Standard Time)" or ISO
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return str;
}

export function formatSheetDate(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // 1. If already plain date format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. If ISO format containing 'T' (e.g. "2026-07-28T18:00:00.000Z")
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    let month = parseInt(isoMatch[2], 10);
    let day = parseInt(isoMatch[3], 10);
    let hour = parseInt(isoMatch[4], 10);

    // If offset indicates UTC (has Z or +00:00)
    if (str.includes('Z') || str.includes('+00:00')) {
      // Add +6 hours for Asia/Dhaka
      hour += 6;
      if (hour >= 24) {
        hour -= 24;
        day += 1;
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const daysInMonths = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (day > daysInMonths[month]) {
          day = 1;
          month += 1;
          if (month > 12) {
            month = 1;
            year += 1;
          }
        }
      }
    }

    const yStr = String(year).padStart(4, '0');
    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  }

  // 3. If contains space like "2026-07-29 00:00:00"
  if (str.includes(' ')) {
    const firstPart = str.split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(firstPart)) {
      return firstPart;
    }
  }

  return str;
}

export function formatSheetTime(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // 1. If already 12-hour format like "07:15:10 PM" or "7:15 PM" (without T)
  if (/am|pm/i.test(str) && !str.includes('T')) {
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/i);
    if (timeMatch) {
      const hStr = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
      const mStr = timeMatch[2];
      const sStr = timeMatch[3] ? timeMatch[3] : '00';
      const ampm = timeMatch[4].toUpperCase();
      return `${hStr}:${mStr}:${sStr} ${ampm}`;
    }
    return str;
  }

  // 2. If ISO string containing 'T' (e.g. "1899-12-30T13:15:10.000Z" or "2026-07-28T13:15:10.000Z")
  const isoMatch = str.match(/T(\d{2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    let hour = parseInt(isoMatch[1], 10);
    const min = isoMatch[2];
    const sec = isoMatch[3];

    if (str.includes('Z') || str.includes('+00:00')) {
      // Add +6 hours for Asia/Dhaka
      hour += 6;
      if (hour >= 24) hour -= 24;
    }

    const ampm = hour >= 12 ? 'PM' : 'AM';
    let h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    const hStr = String(h12).padStart(2, '0');

    return `${hStr}:${min}:${sec} ${ampm}`;
  }

  // 3. If 24-hour time like "19:15:10"
  const time24Match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (time24Match) {
    let hour = parseInt(time24Match[1], 10);
    const min = time24Match[2];
    const sec = time24Match[3] ? time24Match[3] : '00';

    const ampm = hour >= 12 ? 'PM' : 'AM';
    let h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    const hStr = String(h12).padStart(2, '0');

    return `${hStr}:${min}:${sec} ${ampm}`;
  }

  return str;
}

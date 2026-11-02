/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Date & Time Utilities (12-Hour AM/PM formatting and time range calculations)
 */

/**
 * Formats ISO timestamp to 12-hour format with AM/PM
 * Example: "09:40 AM" or "08:15 PM"
 */
export function formatTime12Hour(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '12:00 PM';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '12:00 PM';
  }
}

/**
 * Formats ISO timestamp to standard date (e.g. "01 Nov 2026")
 */
export function formatDateStandard(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Converts a time string ("09:30" or "09:30 AM") into total minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();

  // If 24-hr format "HH:MM"
  if (clean.includes(':')) {
    const parts = clean.split(':');
    let hours = parseInt(parts[0], 10);
    const minutePart = parts[1].replace(/[^0-9]/g, '');
    const minutes = parseInt(minutePart, 10) || 0;

    if (clean.includes('PM') && hours < 12) hours += 12;
    if (clean.includes('AM') && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }
  return null;
}

/**
 * Checks if a given ISO timestamp falls between fromMinutes and toMinutes
 */
export function isTimestampBetweenTimes(
  isoString: string,
  fromTimeStr: string,
  toTimeStr: string
): boolean {
  if (!fromTimeStr && !toTimeStr) return true;
  try {
    const d = new Date(isoString);
    const totalMinutes = d.getHours() * 60 + d.getMinutes();

    const fromMin = timeStringToMinutes(fromTimeStr);
    const toMin = timeStringToMinutes(toTimeStr);

    if (fromMin !== null && toMin !== null) {
      if (fromMin <= toMin) {
        return totalMinutes >= fromMin && totalMinutes <= toMin;
      } else {
        // Crosses midnight
        return totalMinutes >= fromMin || totalMinutes <= toMin;
      }
    } else if (fromMin !== null) {
      return totalMinutes >= fromMin;
    } else if (toMin !== null) {
      return totalMinutes <= toMin;
    }
    return true;
  } catch {
    return true;
  }
}

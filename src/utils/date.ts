/**
 * Date utility functions for formatting and manipulating dates
 */

/**
 * Format a date to a localized string
 * @param date - The date to format
 * @param locale - The locale to use for formatting (defaults to browser locale)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  locale?: string,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a date to a relative time string (e.g., "2 days ago", "in 3 hours")
 * @param date - The date to format
 * @param locale - The locale to use for formatting (defaults to browser locale)
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string | number, locale?: string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  // Define time units in seconds
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;
  
  // Format the relative time
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (Math.abs(diffInSeconds) < minute) {
    return rtf.format(-Math.round(diffInSeconds), 'second');
  } else if (Math.abs(diffInSeconds) < hour) {
    return rtf.format(-Math.round(diffInSeconds / minute), 'minute');
  } else if (Math.abs(diffInSeconds) < day) {
    return rtf.format(-Math.round(diffInSeconds / hour), 'hour');
  } else if (Math.abs(diffInSeconds) < week) {
    return rtf.format(-Math.round(diffInSeconds / day), 'day');
  } else if (Math.abs(diffInSeconds) < month) {
    return rtf.format(-Math.round(diffInSeconds / week), 'week');
  } else if (Math.abs(diffInSeconds) < year) {
    return rtf.format(-Math.round(diffInSeconds / month), 'month');
  } else {
    return rtf.format(-Math.round(diffInSeconds / year), 'year');
  }
}

/**
 * Check if a date is in the past
 * @param date - The date to check
 * @returns True if the date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 * @param date - The date to check
 * @returns True if the date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.getTime() > Date.now();
}

/**
 * Add time to a date
 * @param date - The base date
 * @param amount - The amount to add
 * @param unit - The unit of time to add ('days', 'hours', etc.)
 * @returns A new date with the added time
 */
export function addTime(
  date: Date | string | number,
  amount: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date {
  const dateObj = date instanceof Date ? new Date(date) : new Date(date);
  
  switch (unit) {
    case 'seconds':
      dateObj.setSeconds(dateObj.getSeconds() + amount);
      break;
    case 'minutes':
      dateObj.setMinutes(dateObj.getMinutes() + amount);
      break;
    case 'hours':
      dateObj.setHours(dateObj.getHours() + amount);
      break;
    case 'days':
      dateObj.setDate(dateObj.getDate() + amount);
      break;
    case 'weeks':
      dateObj.setDate(dateObj.getDate() + (amount * 7));
      break;
    case 'months':
      dateObj.setMonth(dateObj.getMonth() + amount);
      break;
    case 'years':
      dateObj.setFullYear(dateObj.getFullYear() + amount);
      break;
  }
  
  return dateObj;
}
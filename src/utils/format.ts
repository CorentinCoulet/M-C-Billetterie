/**
 * Formatting utility functions for numbers, currencies, and text
 */

/**
 * Format a number with thousand separators and decimal places
 * @param value - The number to format
 * @param locale - The locale to use for formatting (defaults to browser locale)
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  locale?: string,
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 2 }
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a number as currency
 * @param value - The number to format
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @param locale - The locale to use for formatting (defaults to browser locale)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: string = 'EUR',
  locale?: string
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format a number as a percentage
 * @param value - The number to format (0.1 = 10%)
 * @param locale - The locale to use for formatting (defaults to browser locale)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercent(
  value: number,
  locale?: string,
  decimals: number = 1
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Truncate text to a maximum length and add ellipsis if needed
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - String to append when truncated (default: '...')
 * @returns Truncated text
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength) + ellipsis;
}

/**
 * Convert a string to title case (capitalize first letter of each word)
 * @param text - The text to convert
 * @returns Text in title case
 */
export function toTitleCase(text: string): string {
  if (!text) return text;
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a file size in bytes to a human-readable string
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format a phone number to a standard format
 * @param phoneNumber - The phone number to format
 * @param countryCode - The country code (default: 'FR' for France)
 * @returns Formatted phone number
 */
export function formatPhoneNumber(
  phoneNumber: string,
  countryCode: string = 'FR'
): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Basic formatting for French numbers (can be expanded for other countries)
  if (countryCode === 'FR') {
    if (digits.length === 10) {
      return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
  }
  
  // Default: return as is if no specific formatting is defined
  return phoneNumber;
}
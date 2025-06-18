/**
 * Utility functions for date formatting and timezone handling
 */

/**
 * Formats a date to Budapest timezone with a readable format
 * @param date - The date to format
 * @param includeSeconds - Whether to include seconds in the output
 * @returns Formatted date string in Budapest timezone
 */
export function formatBudapestTime(date: Date, includeSeconds: boolean = true): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }

  if (includeSeconds) {
    options.second = '2-digit'
  }

  return date.toLocaleString('en-US', options)
}

/**
 * Formats a date to Budapest timezone with a short format (just date)
 * @param date - The date to format
 * @returns Formatted date string in Budapest timezone (YYYY-MM-DD)
 */
export function formatBudapestDate(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Formats a date to Budapest timezone with a time-only format
 * @param date - The date to format
 * @returns Formatted time string in Budapest timezone (HH:MM)
 */
export function formatBudapestTimeOnly(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Europe/Budapest',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Gets the current date/time in Budapest timezone
 * @returns Current date adjusted for Budapest timezone
 */
export function getBudapestNow(): Date {
  const now = new Date()
  // Get the timezone offset for Budapest
  const budapestTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Budapest' }))
  const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offset = budapestTime.getTime() - utcTime.getTime()
  
  return new Date(now.getTime() + offset)
}

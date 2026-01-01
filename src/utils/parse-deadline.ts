/**
 * Parse various deadline formats into a Date object
 * Handles formats like:
 * - "30 January 2026" 
 * - "January 15th, 2026"
 * - "2026-01-30"
 * - "30/01/2026"
 * - ISO date strings
 */
export function parseDeadline(deadline: string | null | undefined): Date | null {
  if (!deadline || typeof deadline !== 'string') {
    return null;
  }

  const trimmed = deadline.trim();
  if (!trimmed) {
    return null;
  }

  try {
    // Try parsing as ISO date first
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Handle common date formats
    const formats = [
      // "30 January 2026", "January 30, 2026"
      /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
      // "January 15th, 2026"
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i,
      // "15/01/2026", "01/15/2026" 
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      // "2026-01-15"
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
    ];

    const months = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };

    for (const format of formats) {
      const match = trimmed.match(format);
      if (match) {
        if (format === formats[0]) { // "30 January 2026"
          const day = parseInt(match[1]);
          const month = months[match[2].toLowerCase() as keyof typeof months];
          const year = parseInt(match[3]);
          return new Date(year, month, day);
        }
        if (format === formats[1]) { // "January 15th, 2026"
          const month = months[match[1].toLowerCase() as keyof typeof months];
          const day = parseInt(match[2]);
          const year = parseInt(match[3]);
          return new Date(year, month, day);
        }
        if (format === formats[2]) { // "15/01/2026" or "01/15/2026"
          // Assume DD/MM/YYYY format first
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // Month is 0-indexed
          const year = parseInt(match[3]);
          const date = new Date(year, month, day);
          
          // Check if the date is valid, if not try MM/DD/YYYY
          if (isNaN(date.getTime()) || day > 31 || month > 11) {
            const monthAlt = parseInt(match[1]) - 1;
            const dayAlt = parseInt(match[2]);
            return new Date(year, monthAlt, dayAlt);
          }
          return date;
        }
        if (format === formats[3]) { // "2026-01-15"
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          const day = parseInt(match[3]);
          return new Date(year, month, day);
        }
      }
    }

    // Fallback: try native Date parsing
    const fallbackDate = new Date(trimmed);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to parse deadline: ${deadline}`, error);
    return null;
  }
}

export default parseDeadline;
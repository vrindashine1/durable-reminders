// src/utils/timezone.js
const { DateTime } = require('luxon');

/**
 * Converts local date time to UTC while handling DST boundaries deterministically.
 */
function parseToUTC(dateTimeString, timezone) {
  // Parse with specified timezone
  const dt = DateTime.fromISO(dateTimeString, { zone: timezone });
  
  if (!dt.isValid) {
    throw new Error(`Invalid Date or Timezone: ${dt.invalidReason}`);
  }

  // Luxon automatically resolves nonexistent times (spring forward gap)
  // and ambiguous times (fall back overlap) deterministically.
  return dt.toJSDate();
}

module.exports = { parseToUTC };
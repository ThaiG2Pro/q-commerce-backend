// src/utils/adjust-timestamp.ts
/**
 * Adjust timestamp according to Vietnam timezone (UTC+7) with custom windows.
 * Rules (VN local time):
 * - 03:00 - 03:20  => subtract 3 days, then add 6 hours
 * - 03:25 - 03:35  => subtract 2 days, then add 7 hours
 * - 03:40 - 04:00  => subtract 1 day, then add 12 hours
 * Other times: return original instant.
 *
 * The function computes VN hour/minute using UTC values to avoid server-local TZ.
 */
export function adjustTimestamp(date: Date): Date {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  const HOUR_MS = 60 * 60 * 1000

  // Compute hour and minute in Vietnam timezone (UTC+7)
  const hourVN = (date.getUTCHours() + 7) % 24
  const minute = date.getUTCMinutes()

  const originalMs = date.getTime()

  // 03:00 - 03:20 => -3 days +6 hours
  if (hourVN === 6 && minute >= 0 && minute <= 30) {
    return new Date(originalMs - 3 * ONE_DAY_MS + 6 * HOUR_MS)
  }

  // 03:25 - 03:35 => -2 days +7 hours
  if (hourVN === 3 && minute >= 25 && minute <= 35) {
    return new Date(originalMs - 2 * ONE_DAY_MS + 7 * HOUR_MS)
  }

  // 03:40 - 04:00 (include 04:00 exactly) => -1 day +12 hours
  if ((hourVN === 3 && minute >= 40 && minute <= 59) || (hourVN === 4 && minute === 0)) {
    return new Date(originalMs - 1 * ONE_DAY_MS + 12 * HOUR_MS)
  }

  // Other time ranges: keep original instant
  return new Date(originalMs)
}

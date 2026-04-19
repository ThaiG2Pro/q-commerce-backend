// src/utils/adjust-timestamp.ts
/**
 * Adjust timestamp according to Vietnam timezone (UTC+7).
 * Uses UTC hours + 7 to compute the hour in VN, then subtracts whole days
 * from the absolute timestamp so the resulting Date is shifted in time.
 * This avoids relying on server local timezone.
 */
export function adjustTimestamp(date: Date): Date {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000

  // Compute hour in Vietnam timezone (UTC+7)
  const hourVN = (date.getUTCHours() + 7) % 24

  const originalMs = date.getTime()

  if (hourVN >= 8 && hourVN < 11) {
    return new Date(originalMs - 3 * ONE_DAY_MS)
  } else if (hourVN >= 12 && hourVN < 17) {
    return new Date(originalMs - 2 * ONE_DAY_MS)
  } else if (hourVN >= 17 && hourVN < 21) {
    return new Date(originalMs - 1 * ONE_DAY_MS)
  }

  // Other time ranges: keep original instant
  return new Date(originalMs)
}

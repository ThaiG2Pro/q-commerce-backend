// src/utils/adjust-timestamp.ts
export function adjustTimestamp(date: Date): Date {
  const hour = date.getHours()
  const adjusted = new Date(date)

  if (hour >= 8 && hour < 11) {
    adjusted.setDate(adjusted.getDate() - 3)
  } else if (hour >= 12 && hour < 17) {
    adjusted.setDate(adjusted.getDate() - 2)
  } else if (hour >= 17 && hour < 21) {
    adjusted.setDate(adjusted.getDate() - 1)
  }
  // Other time ranges: leave unchanged

  return adjusted
}

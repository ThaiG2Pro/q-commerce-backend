export type CustomerType = "fake" | "real"

const FAKE_EMAIL_PATTERN = /^fake\+.*@example\.com$/i

export function detectCustomerType(email?: string | null): CustomerType {
  if (email && FAKE_EMAIL_PATTERN.test(email)) {
    return "fake"
  }
  return "real"
}

export function isFakeCustomer(email?: string | null): boolean {
  return detectCustomerType(email) === "fake"
}

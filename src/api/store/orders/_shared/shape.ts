type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" ? (value as JsonObject) : undefined
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export type NormalizedOrder = {
  id: string
  items: unknown[]
  total: number
  created_at: string | null
  payment_status: string | null
  fulfillment_status: string | null
}

export function normalizeOrder(raw: unknown): NormalizedOrder {
  const order = asObject(raw) ?? {}
  const items = Array.isArray(order.items) ? order.items : []

  const createdAt = order.created_at != null ? String(order.created_at) : null
  const totalNum = (typeof order.total === "number" && Number.isFinite(order.total)) ? order.total : Number(order.total) || 0

  return {
    id: asString(order.id) ?? "",
    items,
    total: totalNum,
    created_at: createdAt,
    payment_status: asString(order.payment_status),
    fulfillment_status: asString(order.fulfillment_status),
  }
}

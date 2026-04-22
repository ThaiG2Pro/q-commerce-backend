import { ANALYTICS_EVENTS, SCHEMA_VERSION, EXPECTED_DELIVERY_MINUTES } from "./constants"
import { detectCustomerType, type CustomerType } from "./detect-customer-type"

// --- Types ---

export type AnalyticsSource = "subscriber" | "script"

export interface AnalyticsPayload {
  event: string
  actor_id: string
  timestamp?: string
  properties: {
    customer_id: string
    cart_id: string | null
    order_id: string | null
    customer_type: CustomerType
    is_simulated: boolean
    source: AnalyticsSource
    schema_version: typeof SCHEMA_VERSION
    [key: string]: unknown
  }
}

interface BaseInput {
  customer_id: string
  email: string
  source?: AnalyticsSource
  is_simulated?: boolean
  timestamp?: Date
}

// --- Helpers ---

function validateTimestamp(ts?: Date): string | undefined {
  if (!ts) return undefined
  if (ts.getTime() > Date.now()) {
    throw new Error(`Analytics timestamp cannot be in the future: ${ts.toISOString()}`)
  }
  return ts.toISOString()
}

function baseProperties(input: BaseInput) {
  return {
    customer_id: input.customer_id,
    customer_type: detectCustomerType(input.email),
    is_simulated: input.is_simulated ?? false,
    source: (input.source ?? "subscriber") as AnalyticsSource,
    schema_version: SCHEMA_VERSION,
  }
}

// --- Builders ---

export function buildCustomerCreated(input: BaseInput): AnalyticsPayload {
  return {
    event: ANALYTICS_EVENTS.CUSTOMER_CREATED,
    actor_id: input.customer_id,
    timestamp: validateTimestamp(input.timestamp),
    properties: {
      ...baseProperties(input),
      cart_id: null,
      order_id: null,
      email: input.email,
    },
  }
}

export function buildCartCreated(
  input: BaseInput & { cart_id: string; currency_code?: string }
): AnalyticsPayload {
  return {
    event: ANALYTICS_EVENTS.CART_CREATED,
    actor_id: input.customer_id,
    timestamp: validateTimestamp(input.timestamp),
    properties: {
      ...baseProperties(input),
      cart_id: input.cart_id,
      order_id: null,
      email: input.email,
      currency_code: input.currency_code ?? null,
    },
  }
}

export function buildOrderPlaced(
  input: BaseInput & {
    order_id: string
    cart_id?: string
    total?: number
    currency_code?: string
    items_count?: number
  }
): AnalyticsPayload {
  return {
    event: ANALYTICS_EVENTS.ORDER_PLACED,
    actor_id: input.customer_id,
    timestamp: validateTimestamp(input.timestamp),
    properties: {
      ...baseProperties(input),
      cart_id: input.cart_id ?? null,
      order_id: input.order_id,
      email: input.email,
      total: input.total ?? null,
      currency_code: input.currency_code ?? null,
      items_count: input.items_count ?? null,
    },
  }
}

export function buildFulfillmentDelivered(
  input: BaseInput & {
    order_id: string
    fulfillment_id: string
    expected_delivery_minutes?: number
    actual_delivery_minutes: number
  }
): AnalyticsPayload {
  const expected = input.expected_delivery_minutes ?? EXPECTED_DELIVERY_MINUTES
  const on_time = input.actual_delivery_minutes <= expected

  return {
    event: ANALYTICS_EVENTS.FULFILLMENT_DELIVERED,
    actor_id: input.customer_id,
    timestamp: validateTimestamp(input.timestamp),
    properties: {
      ...baseProperties(input),
      cart_id: null,
      order_id: input.order_id,
      email: input.email,
      fulfillment_id: input.fulfillment_id,
      expected_delivery_minutes: expected,
      actual_delivery_minutes: input.actual_delivery_minutes,
      on_time,
    },
  }
}

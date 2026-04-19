// src/workflows/steps/track-delivery-step.ts
import { createStep } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type Input = {
  fulfillment_id: string
  order_id?: string
  customer_id?: string
  shipped_at?: string
  delivered_at?: string
  metadata?: Record<string, unknown>
}

function minutesBetween(a?: Date, b?: Date) {
  if (!a || !b) return undefined
  return Math.round((b.getTime() - a.getTime()) / 60000)
}

export const trackDeliveryStep = createStep(
  "track-delivery-step",
  async (input: Input, { container }) => {
    const analyticsModuleService = container.resolve(Modules.ANALYTICS)

    const shipped = input.shipped_at ? new Date(input.shipped_at) : undefined
    const delivered = input.delivered_at ? new Date(input.delivered_at) : undefined

    const actualMinutes = minutesBetween(shipped, delivered)

    const metaExpect = input.metadata?.["expect_time"]
    const expectedMinutes = metaExpect ? parseInt(String(metaExpect), 10) : undefined

    const on_time =
      typeof expectedMinutes === "number" && typeof actualMinutes === "number"
        ? actualMinutes <= expectedMinutes
        : undefined

    await analyticsModuleService.track({
      event: "fulfillment.delivered",
      actor_id: input.customer_id || input.order_id,
      timestamp: delivered?.toISOString() || shipped?.toISOString() || new Date().toISOString(),
      properties: {
        fulfillment_id: input.fulfillment_id,
        order_id: input.order_id,
        expected_minutes: expectedMinutes,
        actual_minutes: actualMinutes,
        on_time,
        shipped_at: shipped?.toISOString(),
        delivered_at: delivered?.toISOString(),
        metadata: input.metadata || {},
      },
    } as any)
  }
)

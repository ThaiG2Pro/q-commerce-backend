// src/workflows/steps/track-order-placed-step.ts
import { createStep } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { adjustTimestamp } from "../../utils/adjust-timestamp"

type Input = {
  order_id: string
  customer_id?: string
  total?: number
  currency_code?: string
  created_at: string | Date
}

export const trackOrderPlacedStep = createStep(
  "track-order-placed-step",
  async (input: Input, { container }) => {
    const analyticsModuleService = container.resolve(Modules.ANALYTICS)

    const originalDate = new Date(input.created_at)
    const adjustedDate = adjustTimestamp(originalDate)

    await analyticsModuleService.track({
      event: "order.placed",
      actor_id: input.customer_id,
      timestamp: adjustedDate.toISOString(),
      properties: {
        order_id: input.order_id,
        total: input.total,
        currency_code: input.currency_code,
        created_at: adjustedDate.toISOString(),
        original_created_at: originalDate.toISOString(),
      },
    })
  }
)

// src/workflows/steps/track-cart-created-step.ts
import { createStep } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { adjustTimestamp } from "../../utils/adjust-timestamp"

type Input = {
  cart_id: string
  customer_id?: string
  currency_code?: string
  created_at: string | Date
}

export const trackCartCreatedStep = createStep(
  "track-cart-created-step",
  async (input: Input, { container }) => {
    const analyticsModuleService = container.resolve(Modules.ANALYTICS)

    const originalDate = new Date(input.created_at)
    const adjustedDate = adjustTimestamp(originalDate)

    await analyticsModuleService.track({
      event: "cart.created",
      actor_id: input.customer_id,
      timestamp: adjustedDate.toISOString(),
      properties: {
        cart_id: input.cart_id,
        customer_id: input.customer_id,
        currency_code: input.currency_code,
        created_at: adjustedDate.toISOString(),
        original_created_at: originalDate.toISOString(),
      },
    } as any)
  }
)

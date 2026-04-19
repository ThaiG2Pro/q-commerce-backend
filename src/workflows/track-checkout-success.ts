// src/workflows/track-checkout-success.ts
import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import { createStep } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { OrderDTO } from "@medusajs/framework/types"

type StepInput = { order: OrderDTO }

const trackCheckoutSuccessStep = createStep(
  "track-checkout-success-step",
  async ({ order }: StepInput, { container }) => {
    const analyticsModuleService = container.resolve(Modules.ANALYTICS)

    await analyticsModuleService.track({
      event: "checkout_success",
      actor_id: order.customer_id,
      properties: {
        order_id: order.id,
        total: order.total,
        currency_code: order.currency_code,
        created_at: order.created_at,
        customer_id: order.customer_id,
        items_count: order.items?.length,
      },
    })
  }
)

type WorkflowInput = { order_id: string }

export const trackCheckoutSuccessWorkflow = createWorkflow(
  "track-checkout-success-workflow",
  ({ order_id }: WorkflowInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["id", "total", "currency_code", "customer_id", "created_at", "items.*"],
      filters: { id: order_id },
    })
    trackCheckoutSuccessStep({ order: orders[0] } as unknown as StepInput)
  }
)

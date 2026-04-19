// src/workflows/track-order-placed.ts
import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { transform } from "@medusajs/framework/workflows-sdk"
import { trackOrderPlacedStep } from "./steps/track-order-placed-step"

type WorkflowInput = { id: string }

export const trackOrderPlacedWorkflow = createWorkflow(
  "track-order-placed",
  ({ id }: WorkflowInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["id", "cart.id", "customer_id", "customer.id", "total", "currency_code", "created_at"],
      filters: { id },
    })

    const payload = transform({ order: orders[0] }, ({ order }) => ({
      order_id: order.id,
      cart_id: order.cart?.id,
      customer_id: order.customer_id ?? order.customer?.id,
      total: order.total,
      currency_code: order.currency_code,
      created_at: order.created_at,
    }))

    trackOrderPlacedStep(payload as any)
  }
)

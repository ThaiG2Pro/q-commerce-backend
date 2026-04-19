// src/workflows/track-cart-created.ts
import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { transform } from "@medusajs/framework/workflows-sdk"
import { trackCartCreatedStep } from "./steps/track-cart-created-step"

type WorkflowInput = { id: string }

export const trackCartCreatedWorkflow = createWorkflow(
  "track-cart-created",
  ({ id }: WorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "customer_id", "currency_code", "created_at"],
      filters: { id },
    })

    const payload = transform({ cart: carts[0] }, ({ cart }) => ({
      cart_id: cart.id,
      customer_id: cart.customer_id,
      currency_code: cart.currency_code,
      created_at: cart.created_at,
    }))

    trackCartCreatedStep(payload as any)
  }
)

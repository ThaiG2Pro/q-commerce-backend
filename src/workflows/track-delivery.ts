// src/workflows/track-delivery.ts
import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { transform } from "@medusajs/framework/workflows-sdk"
import { trackDeliveryStep } from "./steps/track-delivery-step"

type WorkflowInput = { id: string }

export const trackDeliveryWorkflow = createWorkflow(
  "track-fulfillment-delivered",
  ({ id }: WorkflowInput) => {
    const { data: fulfillments } = useQueryGraphStep({
      entity: "fulfillment",
      // request fields that are commonly available; adjust if your schema differs
      fields: ["id", "order_id", "shipped_at", "created_at", "metadata", "updated_at"],
      filters: { id },
    })

    const payload = transform({ fulfillment: fulfillments[0] }, ({ fulfillment }) => ({
      fulfillment_id: fulfillment.id,
      order_id: fulfillment.order_id,
      shipped_at: fulfillment.shipped_at || fulfillment.created_at,
      delivered_at: fulfillment.updated_at,
      metadata: fulfillment.metadata,
    }))

    trackDeliveryStep(payload)
  }
)

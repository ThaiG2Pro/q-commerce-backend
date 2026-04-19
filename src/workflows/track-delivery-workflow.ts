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
      fields: [
        "id",
        "order_id",
        "order.id",
        "order.customer_id",
        "order.customer.id",
        "shipped_at",
        "created_at",
        "metadata",
        "updated_at",
      ],
      filters: { id },
    })

    const payload = transform({ fulfillment: fulfillments[0] }, ({ fulfillment }) => ({
      fulfillment_id: fulfillment.id,
      order_id: fulfillment.order?.id ?? fulfillment.order_id,
      customer_id: fulfillment.order?.customer?.id ?? fulfillment.order?.customer_id ?? undefined,
      shipped_at: String(fulfillment.shipped_at || fulfillment.created_at),
      delivered_at: String(fulfillment.updated_at),
      metadata: fulfillment.metadata,
    }))

    // cast to any to satisfy workflow type constraints
    trackDeliveryStep(payload as any)
  }
)

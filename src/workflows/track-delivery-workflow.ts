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
        "order.customer_id",
        "order.customer.id",
        "shipped_at",
        "created_at",
        "metadata",
        "updated_at",
      ],
      filters: { id },
    })

    const payload = transform({ fulfillment: fulfillments[0] }, ({ fulfillment }) => {
      // Ép kiểu sang any để truy cập các trường join từ Query Graph
      const f = fulfillment as any; 
      const order = f.order;

      return {
        fulfillment_id: f.id,
        // Chỉ lấy từ order object, vì f.order_id không tồn tại
        order_id: order?.id, 
        // Lấy customer_id từ order
        customer_id: order?.customer?.id ?? order?.customer_id,
        shipped_at: String(f.shipped_at || f.created_at),
        delivered_at: String(f.updated_at),
        metadata: f.metadata,
      }
    })

    // cast to any to satisfy workflow type constraints
    trackDeliveryStep(payload as any)
  }
)

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateFulfillmentStatusWorkflow } from "../../../../../workflows/fulfillment"

/**
 * POST /admin/fulfillments/:id/status
 * 
 * Update fulfillment status (Admin only)
 * 
 * Request body:
 * {
 *   "order_id": "order_xxx",  // required
 *   "status": "shipped",  // pending, processing, shipped, out_for_delivery, delivered, failed, canceled
 *   "location": "HCM City Hub",  // optional
 *   "notes": "Package picked up by shipper"  // optional
 * }
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { order_id, status, location, notes } = req.body as {
    order_id: string
    status: string
    location?: string
    notes?: string
  }

  // Validate required fields
  if (!order_id) {
    return res.status(400).json({
      error: "order_id is required",
    })
  }

  // Validate status
  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "out_for_delivery",
    "delivered",
    "failed",
    "canceled",
  ]

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    })
  }

  try {
    // Execute workflow
    const { result } = await updateFulfillmentStatusWorkflow(req.scope).run({
      input: {
        fulfillment_id: id,
        order_id,
        status,
        location,
        notes,
      },
    })

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    res.status(400).json({
      error: error.message || "Failed to update fulfillment status",
    })
  }
}

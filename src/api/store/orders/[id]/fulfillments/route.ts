import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /store/orders/:id/fulfillments
 * 
 * Lấy danh sách fulfillments của order để track delivery status
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  
  try {
    const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT)
    
    // Note: current fulfillment module typings don't expose order_id filter here.
    const fulfillments = await fulfillmentModuleService.listFulfillments({})

    res.status(200).json({
      fulfillments: fulfillments
        .filter((f: any) => f?.order_id === id || f?.order?.id === id)
        .map((f: any) => ({
        id: f.id,
        tracking_number: f.data?.tracking_number,
        status: f.data?.status,
        estimated_delivery_date: f.data?.estimated_delivery_date,
        created_at: f.created_at,
        updated_at: f.updated_at,
        items: f.data?.items,
        location: f.data?.location,
        notes: f.data?.notes,
      })),
    })
  } catch (error: any) {
    res.status(400).json({
      error: error.message || "Failed to fetch fulfillments",
    })
  }
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { captureCodPaymentWorkflow } from "../../../../../workflows/payment"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /store/orders/:id/cod-capture
 * 
 * Capture COD payment sau khi giao hàng thành công
 * 
 * Request body:
 * {
 *   "payment_id": "pay_xxx",
 *   "amount": 100000,  // optional, defaults to order total
 *   "notes": "Đã nhận tiền mặt từ khách"  // optional
 * }
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { payment_id, amount, notes } = req.body as {
    payment_id: string
    amount?: number
    notes?: string
  }

  // Validate required fields
  if (!payment_id) {
    return res.status(400).json({
      error: "payment_id is required",
    })
  }

  try {
    // Execute workflow
    const { result } = await captureCodPaymentWorkflow(req.scope).run({
      input: {
        order_id: id,
        payment_id,
        amount,
        notes,
      },
    })

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    res.status(400).json({
      error: error.message || "Failed to capture COD payment",
    })
  }
}

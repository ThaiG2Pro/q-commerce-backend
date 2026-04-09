import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { handleStripeWebhookWorkflow } from "../../../workflows/payment"

/**
 * POST /webhooks/stripe
 * 
 * Stripe webhook endpoint
 * Xử lý các events từ Stripe như payment_intent.succeeded, payment_intent.failed, etc.
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const signature = req.headers["stripe-signature"] as string

  if (!signature) {
    return res.status(400).json({
      error: "Missing stripe-signature header",
    })
  }

  try {
    const event = (req.body ?? {}) as Record<string, unknown>

    // Execute workflow to handle webhook
    const { result } = await handleStripeWebhookWorkflow(req.scope).run({
      input: {
        event,
        signature,
      },
    })

    // Return 200 to acknowledge receipt
    res.status(200).json({
      received: true,
      result,
    })
  } catch (error: any) {
    // Log error but still return 200 to prevent Stripe from retrying
    console.error("Stripe webhook error:", error)
    
    res.status(400).json({
      error: error.message || "Webhook processing failed",
    })
  }
}

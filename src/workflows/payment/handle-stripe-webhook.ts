import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

interface HandleStripeWebhookInput {
  event: Record<string, unknown>
  signature: string
}

const normalizeStripeWebhookStep = createStep(
  "normalize-stripe-webhook",
  async (input: HandleStripeWebhookInput) => {
    return new StepResponse({
      event_id: String(input.event?.id ?? ""),
      event_type: String(input.event?.type ?? ""),
      signature: input.signature,
    })
  }
)

export const handleStripeWebhookWorkflow = createWorkflow(
  "handle-stripe-webhook",
  function (input: HandleStripeWebhookInput) {
    const normalized = normalizeStripeWebhookStep(input)

    const result = transform({ normalized }, ({ normalized }) => ({
      received: true,
      ...normalized,
      processed_at: new Date().toISOString(),
    }))

    return new WorkflowResponse(result)
  }
)

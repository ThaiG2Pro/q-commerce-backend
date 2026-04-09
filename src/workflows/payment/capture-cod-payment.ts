import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

interface CaptureCodePaymentInput {
  order_id: string
  payment_id: string
  amount?: number
  notes?: string
}

const buildCaptureResponseStep = createStep(
  "build-cod-capture-response",
  async (input: CaptureCodePaymentInput) => {
    return new StepResponse({
      order_id: input.order_id,
      payment_id: input.payment_id,
      captured_amount: input.amount ?? 0,
      status: "captured",
      notes: input.notes,
    })
  }
)

export const captureCodPaymentWorkflow = createWorkflow(
  "capture-cod-payment",
  function (input: CaptureCodePaymentInput) {
    const payload = buildCaptureResponseStep(input)

    const response = transform({ payload }, ({ payload }) => ({
      ...payload,
      captured_at: new Date().toISOString(),
    }))

    return new WorkflowResponse(response)
  }
)

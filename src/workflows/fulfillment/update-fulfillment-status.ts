import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

interface UpdateFulfillmentStatusInput {
  fulfillment_id: string
  order_id: string
  status: string
  location?: string
  notes?: string
  customer_email?: string
}

const buildFulfillmentStatusPayloadStep = createStep(
  "build-fulfillment-status-payload",
  async (input: UpdateFulfillmentStatusInput) => {
    return new StepResponse({
      fulfillment_id: input.fulfillment_id,
      order_id: input.order_id,
      status: input.status,
      location: input.location,
      notes: input.notes,
      customer_email: input.customer_email,
    })
  }
)

export const updateFulfillmentStatusWorkflow = createWorkflow(
  "update-fulfillment-status",
  function (input: UpdateFulfillmentStatusInput) {
    const payload = buildFulfillmentStatusPayloadStep(input)

    const result = transform({ payload }, ({ payload }) => ({
      fulfillment: payload,
      notification: {
        notification_sent: true,
      },
      updated_at: new Date().toISOString(),
    }))

    return new WorkflowResponse(result)
  }
)

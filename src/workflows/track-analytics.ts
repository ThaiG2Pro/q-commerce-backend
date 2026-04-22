import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { trackAnalyticsStep } from "./steps/track-analytics-step"
import type { AnalyticsPayload } from "../analytics"

export const trackAnalyticsWorkflow = createWorkflow(
  "track-analytics",
  function (input: AnalyticsPayload) {
    const result = trackAnalyticsStep(input)
    return new WorkflowResponse(result)
  }
)

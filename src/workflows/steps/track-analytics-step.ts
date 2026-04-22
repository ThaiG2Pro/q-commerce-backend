import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { AnalyticsPayload } from "../../analytics"

export const trackAnalyticsStep = createStep(
  "track-analytics-step",
  async (input: AnalyticsPayload, { container }) => {
    const analytics = container.resolve(Modules.ANALYTICS)
    await analytics.track(input as any)
    return new StepResponse({ tracked: true })
  }
)

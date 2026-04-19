// src/workflows/steps/track-event.ts
import { createStep } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type TrackEventStepInput = {
  event: string
  userId?: string
  properties?: Record<string, unknown>
}

export const trackEventStep = createStep(
  "track-event",
  async (input: TrackEventStepInput, { container }) => {
    const analyticsModuleService = container.resolve(Modules.ANALYTICS)

    if (!input.userId) {
      input.properties = {
        ...input.properties,
        anonymousId:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
      }
    }

    await analyticsModuleService.track({
      event: input.event,
      actor_id: input.userId,
      properties: input.properties,
    })
  }
)

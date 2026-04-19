// src/subscribers/delivery-created.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { trackDeliveryWorkflow } from "../workflows/track-delivery-workflow"

export default async function deliveryCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    await trackDeliveryWorkflow(container).run({
      input: { id: data.id },
    })
  } catch (err: any) {
    // better error logging to help debugging subscribers failures
    try {
      console.error("delivery.created handler error:", err && err.stack ? err.stack : JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    } catch (e) {
      console.error("delivery.created handler error (failed to stringify)", err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}

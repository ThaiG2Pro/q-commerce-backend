// src/subscribers/delivery-created.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { trackDeliveryWorkflow } from "../workflows/track-delivery-workflow"

export default async function deliveryCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await trackDeliveryWorkflow(container).run({
    input: { id: data.id },
  })
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}

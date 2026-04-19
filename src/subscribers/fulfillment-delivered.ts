// src/subscribers/fulfillment-delivered.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { trackDeliveryWorkflow } from "../workflows/track-delivery"

export default async function fulfillmentUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  // Medusa sends fullness of the resource in data; check status for 'delivered'
  const status = data?.status

  if (status !== "delivered") return

  await trackDeliveryWorkflow(container).run({
    input: { id: data.id },
  })
}

export const config: SubscriberConfig = {
  event: "fulfillment.updated",
}

// src/subscribers/order-placed.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { trackCheckoutSuccessWorkflow } from "../workflows/track-checkout-success"
import { trackOrderPlacedWorkflow } from "../workflows/track-order-placed"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // Track checkout success metric
  await trackCheckoutSuccessWorkflow(container).run({
    input: { order_id: data.id },
  })

  // Track detailed order.placed event (with adjusted timestamp)
  await trackOrderPlacedWorkflow(container).run({
    input: { id: data.id },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

// src/subscribers/cart-created.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { trackCartCreatedWorkflow } from "../workflows/track-cart-created"

export default async function cartCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await trackCartCreatedWorkflow(container).run({
    input: { id: data.id },
  })
}

export const config: SubscriberConfig = {
  event: "cart.created",
}
